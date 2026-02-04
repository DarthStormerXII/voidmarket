/**
 * ENS Gateway Database Queries
 *
 * Queries stars, markets, and clusters for ENS resolution
 */

import { db } from '../../db/client.js';
import { eq, ilike } from 'drizzle-orm';
import * as schema from '../../db/schema.js';
import type { TextRecordKey } from './types.js';

// ============================================================================
// Star (User Profile) Lookups
// ============================================================================

export interface StarData {
  walletAddress: string;
  displayName: string;
  starType: string;
  photons: number;
  ensSubdomain: string | null;
  totalBets: number;
  totalWins: number;
  bio: string | null;
  avatarUrl: string | null;
  clusterId?: number;
  clusterName?: string;
}

/**
 * Lookup a star (user profile) by subdomain
 */
export async function lookupStar(subdomain: string): Promise<StarData | null> {
  // Try by ENS subdomain first
  const profile = await db.query.profiles.findFirst({
    where: ilike(schema.profiles.ensSubdomain, `%${subdomain}%`),
    with: {
      user: true,
    },
  });

  if (profile) {
    // Get cluster membership if any
    const membership = await db.query.clusterMembers.findFirst({
      where: eq(schema.clusterMembers.userId, profile.userId),
      with: {
        cluster: true,
      },
    });

    return {
      walletAddress: (profile as any).user?.walletAddress || '',
      displayName: profile.displayName,
      starType: profile.starType,
      photons: profile.photons,
      ensSubdomain: profile.ensSubdomain,
      totalBets: profile.totalBets,
      totalWins: profile.totalWins,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      clusterId: membership?.clusterId,
      clusterName: (membership as any)?.cluster?.name,
    };
  }

  // Try by display name
  const byName = await db.query.profiles.findFirst({
    where: ilike(schema.profiles.displayName, subdomain),
    with: {
      user: true,
    },
  });

  if (byName) {
    return {
      walletAddress: (byName as any).user?.walletAddress || '',
      displayName: byName.displayName,
      starType: byName.starType,
      photons: byName.photons,
      ensSubdomain: byName.ensSubdomain,
      totalBets: byName.totalBets,
      totalWins: byName.totalWins,
      bio: byName.bio,
      avatarUrl: byName.avatarUrl,
    };
  }

  // Try by ENS records table
  const ensRecord = await db.query.ensRecords.findFirst({
    where: eq(schema.ensRecords.subdomain, subdomain.toLowerCase()),
  });

  if (ensRecord && ensRecord.userId) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, ensRecord.userId),
    });

    const userProfile = await db.query.profiles.findFirst({
      where: eq(schema.profiles.userId, ensRecord.userId),
    });

    if (userProfile) {
      return {
        walletAddress: user?.walletAddress || ensRecord.address,
        displayName: userProfile.displayName,
        starType: userProfile.starType,
        photons: userProfile.photons,
        ensSubdomain: userProfile.ensSubdomain,
        totalBets: userProfile.totalBets,
        totalWins: userProfile.totalWins,
        bio: userProfile.bio,
        avatarUrl: userProfile.avatarUrl,
      };
    }
  }

  return null;
}

// ============================================================================
// Market Lookups
// ============================================================================

export interface MarketData {
  id: number;
  onChainId: bigint;
  question: string;
  status: string;
  outcome: boolean | null;
  deadline: Date;
  resolutionDeadline: Date;
  totalYesAmount: bigint;
  totalNoAmount: bigint;
  totalPool: bigint;
  isForked: boolean;
  parentMarketId: number | null;
  creatorAddress?: string;
}

/**
 * Lookup a market by slug (derived from question)
 */
export async function lookupMarket(slug: string): Promise<MarketData | null> {
  // Convert slug to search term (e.g., "eth-5k" -> "eth" "5k")
  const searchTerms = slug.split('-').join(' ');

  // Search markets by question containing the terms
  const market = await db.query.markets.findFirst({
    where: ilike(schema.markets.question, `%${searchTerms}%`),
    with: {
      creator: true,
    },
  });

  if (!market) return null;

  return {
    id: market.id,
    onChainId: market.onChainId,
    question: market.question,
    status: market.status,
    outcome: market.outcome,
    deadline: market.deadline,
    resolutionDeadline: market.resolutionDeadline,
    totalYesAmount: market.totalYesAmount,
    totalNoAmount: market.totalNoAmount,
    totalPool: market.totalPool,
    isForked: market.isForked,
    parentMarketId: market.parentMarketId,
    creatorAddress: (market as any).creator?.walletAddress,
  };
}

// ============================================================================
// Cluster Lookups
// ============================================================================

export interface ClusterData {
  id: number;
  onChainId: bigint;
  name: string;
  leaderAddress: string;
  leaderName?: string;
  energy: bigint;
  novasWon: number;
  totalNovas: number;
  memberCount: number;
  maxMembers: number;
  isPrivate: boolean;
  description: string | null;
}

/**
 * Lookup a cluster by name
 */
export async function lookupCluster(name: string): Promise<ClusterData | null> {
  const cluster = await db.query.clusters.findFirst({
    where: ilike(schema.clusters.name, name),
    with: {
      leader: {
        with: {
          profile: true,
        },
      },
    },
  });

  if (!cluster) return null;

  return {
    id: cluster.id,
    onChainId: cluster.onChainId,
    name: cluster.name,
    leaderAddress: (cluster as any).leader?.walletAddress || '',
    leaderName: (cluster as any).leader?.profile?.displayName,
    energy: cluster.energy,
    novasWon: cluster.novasWon,
    totalNovas: cluster.totalNovas,
    memberCount: cluster.memberCount,
    maxMembers: cluster.maxMembers,
    isPrivate: cluster.isPrivate,
    description: cluster.description,
  };
}

// ============================================================================
// Text Record Lookups
// ============================================================================

/**
 * Lookup a text record for a subdomain
 *
 * VoidMarket-specific keys:
 * - voidmarket.star-type: The star's type (e.g., "blue-supergiant")
 * - voidmarket.total-photons: Total photons earned
 * - voidmarket.cluster: Cluster name the star belongs to
 * - voidmarket.question: Market question
 * - voidmarket.status: Market status (open/closed/resolved)
 * - voidmarket.energy: Cluster energy
 * - voidmarket.leader: Cluster leader name
 */
export async function lookupTextRecord(
  subdomain: string,
  key: TextRecordKey
): Promise<string | null> {
  // First check ENS records table for explicit records
  const ensRecord = await db.query.ensRecords.findFirst({
    where: eq(schema.ensRecords.subdomain, subdomain.toLowerCase()),
  });

  if (ensRecord?.records && typeof ensRecord.records === 'object') {
    const records = ensRecord.records as Record<string, string>;
    if (records[key]) {
      return records[key];
    }
  }

  // Try to resolve based on entity type
  // First try as star
  const star = await lookupStar(subdomain);
  if (star) {
    return resolveStarTextRecord(star, key);
  }

  // Try as market
  const market = await lookupMarket(subdomain);
  if (market) {
    return resolveMarketTextRecord(market, key);
  }

  // Try as cluster
  const cluster = await lookupCluster(subdomain);
  if (cluster) {
    return resolveClusterTextRecord(cluster, key);
  }

  return null;
}

function resolveStarTextRecord(star: StarData, key: TextRecordKey): string | null {
  switch (key) {
    // Standard ENS text records
    case 'avatar':
      return star.avatarUrl;
    case 'description':
      return star.bio;
    case 'display':
      return star.displayName;
    case 'name':
      return star.displayName;

    // VoidMarket-specific records
    case 'voidmarket.star-type':
      return star.starType;
    case 'voidmarket.total-photons':
      return star.photons.toString();
    case 'voidmarket.cluster':
      return star.clusterName || null;
    case 'voidmarket.total-bets':
      return star.totalBets.toString();
    case 'voidmarket.total-wins':
      return star.totalWins.toString();

    default:
      return null;
  }
}

function resolveMarketTextRecord(market: MarketData, key: TextRecordKey): string | null {
  switch (key) {
    case 'voidmarket.question':
      return market.question;
    case 'voidmarket.status':
      return market.status.toLowerCase();
    case 'voidmarket.deadline':
      return market.deadline.toISOString();
    case 'voidmarket.outcome':
      return market.outcome === null ? null : (market.outcome ? 'yes' : 'no');
    case 'voidmarket.total-pool':
      return market.totalPool.toString();
    case 'voidmarket.yes-amount':
      return market.totalYesAmount.toString();
    case 'voidmarket.no-amount':
      return market.totalNoAmount.toString();
    case 'voidmarket.is-forked':
      return market.isForked ? 'true' : 'false';
    case 'description':
      return market.question;

    default:
      return null;
  }
}

function resolveClusterTextRecord(cluster: ClusterData, key: TextRecordKey): string | null {
  switch (key) {
    case 'voidmarket.energy':
      return cluster.energy.toString();
    case 'voidmarket.leader':
      return cluster.leaderName || cluster.leaderAddress;
    case 'voidmarket.member-count':
      return cluster.memberCount.toString();
    case 'voidmarket.novas-won':
      return cluster.novasWon.toString();
    case 'voidmarket.total-novas':
      return cluster.totalNovas.toString();
    case 'voidmarket.is-private':
      return cluster.isPrivate ? 'true' : 'false';
    case 'description':
      return cluster.description;
    case 'name':
      return cluster.name;

    default:
      return null;
  }
}
