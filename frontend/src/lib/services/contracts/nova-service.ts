/**
 * Nova Service — On-chain reads for NovaManager
 */

import { formatUnits } from 'viem';
import { publicClient, NOVA_MANAGER_ADDRESS } from './client';
import { novaManagerAbi } from './abis';

// Status enum mapping
const NOVA_STATUS_MAP: Record<number, string> = {
  0: 'pending',
  1: 'active',
  2: 'completed',
  3: 'cancelled',
};

const MATCH_STATUS_MAP: Record<number, string> = {
  0: 'pending',
  1: 'betting',
  2: 'resolved',
  3: 'cancelled',
};

export interface OnChainNova {
  id: number;
  cluster1Id: number;
  cluster2Id: number;
  totalRounds: number;
  currentRound: number;
  status: string;
  prizePool: string;
  winningClusterId: number;
  cluster1TotalPhotons: number;
  cluster2TotalPhotons: number;
  startedAt: number;
  bettingDuration: number;
  matchesPerRound: number;
}

export interface OnChainMatch {
  id: number;
  novaId: number;
  round: number;
  star1: string;
  star2: string;
  marketId: number;
  status: string;
  winner: string;
  star1Photons: number;
  star2Photons: number;
  bettingDeadline: number;
}

/**
 * Get total nova count
 */
export async function getNovaCount(): Promise<number> {
  const count = await publicClient.readContract({
    address: NOVA_MANAGER_ADDRESS,
    abi: novaManagerAbi,
    functionName: 'novaCount',
  });
  return Number(count);
}

/**
 * Get a single nova by ID
 */
export async function getNovaById(novaId: number): Promise<OnChainNova> {
  const result = await publicClient.readContract({
    address: NOVA_MANAGER_ADDRESS,
    abi: novaManagerAbi,
    functionName: 'getNova',
    args: [BigInt(novaId)],
  });

  return mapNova(result);
}

/**
 * Get match IDs for a nova
 */
export async function getNovaMatchIds(novaId: number): Promise<number[]> {
  const ids = await publicClient.readContract({
    address: NOVA_MANAGER_ADDRESS,
    abi: novaManagerAbi,
    functionName: 'getNovaMatches',
    args: [BigInt(novaId)],
  });
  return (ids as bigint[]).map(Number);
}

/**
 * Get a single match by ID
 */
export async function getMatchById(matchId: number): Promise<OnChainMatch> {
  const result = await publicClient.readContract({
    address: NOVA_MANAGER_ADDRESS,
    abi: novaManagerAbi,
    functionName: 'getMatch',
    args: [BigInt(matchId)],
  });

  return mapMatch(result);
}

/**
 * Get all matches for a nova
 */
export async function getNovaMatches(novaId: number): Promise<OnChainMatch[]> {
  const matchIds = await getNovaMatchIds(novaId);
  if (matchIds.length === 0) return [];

  const calls = matchIds.map((id) => ({
    address: NOVA_MANAGER_ADDRESS,
    abi: novaManagerAbi,
    functionName: 'getMatch' as const,
    args: [BigInt(id)],
  }));

  const results = await publicClient.multicall({ contracts: calls });

  return results
    .filter((r) => r.status === 'success')
    .map((r) => mapMatch(r.result as any));
}

/**
 * Get matches for a specific round
 */
export async function getRoundMatches(novaId: number, round: number): Promise<number[]> {
  const ids = await publicClient.readContract({
    address: NOVA_MANAGER_ADDRESS,
    abi: novaManagerAbi,
    functionName: 'getRoundMatches',
    args: [BigInt(novaId), BigInt(round)],
  });
  return (ids as bigint[]).map(Number);
}

// ─── Helpers ────────────────────────────────────────────────

function mapNova(raw: any): OnChainNova {
  return {
    id: Number(raw.id),
    cluster1Id: Number(raw.cluster1Id),
    cluster2Id: Number(raw.cluster2Id),
    totalRounds: Number(raw.totalRounds),
    currentRound: Number(raw.currentRound),
    status: NOVA_STATUS_MAP[Number(raw.status)] || 'pending',
    prizePool: formatUnits(raw.prizePool, 18),
    winningClusterId: Number(raw.winningClusterId),
    cluster1TotalPhotons: Number(raw.cluster1TotalPhotons),
    cluster2TotalPhotons: Number(raw.cluster2TotalPhotons),
    startedAt: Number(raw.startedAt),
    bettingDuration: Number(raw.bettingDuration),
    matchesPerRound: Number(raw.matchesPerRound),
  };
}

function mapMatch(raw: any): OnChainMatch {
  return {
    id: Number(raw.id),
    novaId: Number(raw.novaId),
    round: Number(raw.round),
    star1: raw.star1,
    star2: raw.star2,
    marketId: Number(raw.marketId),
    status: MATCH_STATUS_MAP[Number(raw.status)] || 'pending',
    winner: raw.winner,
    star1Photons: Number(raw.star1Photons),
    star2Photons: Number(raw.star2Photons),
    bettingDeadline: Number(raw.bettingDeadline),
  };
}
