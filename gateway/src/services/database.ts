import { PrismaClient } from "../../src/generated/prisma/client.js";
import type { ResolvedEntity } from "../types/index.js";
import {
  getMarketFromChain,
  getClusterFromChain,
  getStarFromChain,
} from "./chain-reader.js";

const prisma = new PrismaClient();

/**
 * Look up a star (user) by ENS subdomain name
 */
export async function getStarByName(
  name: string
): Promise<ResolvedEntity | null> {
  const star = await prisma.star.findUnique({ where: { name } });
  if (!star) return null;

  const textRecords: Record<string, string> = {
    "voidmarket.star-type": star.starType,
    "voidmarket.total-photons": String(star.totalPhotons),
    "voidmarket.bets-won": String(star.betsWon),
    "voidmarket.bets-lost": String(star.betsLost),
    "voidmarket.created-at": star.createdAt.toISOString(),
  };

  if (star.description) {
    textRecords["description"] = star.description;
  }

  // Look up cluster name if the star is in a cluster
  if (star.clusterId) {
    const cluster = await prisma.clusterMetadata.findUnique({
      where: { id: star.clusterId },
    });
    if (cluster) {
      textRecords["voidmarket.cluster"] = cluster.name;
    }
  }

  // Enrich with on-chain data
  const chainData = await getStarFromChain(star.walletAddress);
  if (chainData) {
    textRecords["voidmarket.on-chain-photons"] = chainData.photons;
    textRecords["voidmarket.on-chain-cluster-id"] = String(chainData.clusterId);
    textRecords["voidmarket.on-chain-active"] = String(chainData.isActive);
  }

  return {
    type: "star",
    walletAddress: star.walletAddress,
    textRecords,
  };
}

/**
 * Look up a market by ENS subdomain name
 */
export async function getMarketByName(
  name: string,
  _parentDomain?: string | null
): Promise<ResolvedEntity | null> {
  const market = await prisma.marketMetadata.findUnique({ where: { name } });
  if (!market) return null;

  const textRecords: Record<string, string> = {
    "voidmarket.category": market.category,
    "voidmarket.oracle": market.oracleType,
    "voidmarket.on-chain-id": String(market.onChainId),
  };

  if (market.oracleSource) {
    textRecords["voidmarket.oracle-source"] = market.oracleSource;
  }

  if (market.creatorName) {
    textRecords["voidmarket.creator"] = market.creatorName;
  }

  // Enrich with on-chain data
  const chainData = await getMarketFromChain(market.onChainId);
  if (chainData) {
    textRecords["voidmarket.pool-size"] = chainData.totalPool;
    textRecords["voidmarket.status"] = chainData.status;
    textRecords["voidmarket.total-bets"] = String(chainData.totalBets);
    textRecords["voidmarket.deadline"] = String(chainData.deadline);
    textRecords["voidmarket.yes-amount"] = chainData.totalYesAmount;
    textRecords["voidmarket.no-amount"] = chainData.totalNoAmount;
    textRecords["voidmarket.question"] = chainData.question;
    if (chainData.status === "resolved") {
      textRecords["voidmarket.outcome"] = chainData.outcome ? "YES" : "NO";
    }
  }

  return {
    type: "market",
    textRecords,
  };
}

/**
 * Look up a cluster by ENS subdomain name
 */
export async function getClusterByName(
  name: string
): Promise<ResolvedEntity | null> {
  const cluster = await prisma.clusterMetadata.findUnique({ where: { name } });
  if (!cluster) return null;

  const textRecords: Record<string, string> = {
    "voidmarket.on-chain-id": String(cluster.onChainId),
    "voidmarket.created-at": cluster.createdAt.toISOString(),
  };

  if (cluster.description) {
    textRecords["description"] = cluster.description;
  }

  if (cluster.avatarUrl) {
    textRecords["avatar"] = cluster.avatarUrl;
  }

  // Enrich with on-chain data
  const chainData = await getClusterFromChain(cluster.onChainId);
  if (chainData) {
    textRecords["voidmarket.energy"] = String(chainData.energy);
    textRecords["voidmarket.novas-won"] = String(chainData.novasWon);
    textRecords["voidmarket.total-novas"] = String(chainData.totalNovas);
    textRecords["voidmarket.member-count"] = String(chainData.memberCount);
    textRecords["voidmarket.total-photons"] = chainData.totalPhotons;
    textRecords["voidmarket.leader"] = chainData.leader;
  }

  return {
    type: "cluster",
    textRecords,
  };
}

export { prisma };
