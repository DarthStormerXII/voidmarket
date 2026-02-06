import { PrismaClient } from "../../src/generated/prisma/client.js";
import type { ResolvedEntity } from "../types/index.js";

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

  return {
    type: "cluster",
    textRecords,
  };
}

export { prisma };
