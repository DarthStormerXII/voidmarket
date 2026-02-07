/**
 * Database Service
 *
 * Singleton Prisma client + CRUD helpers for PostgreSQL metadata.
 * Financial data lives on-chain; this handles only metadata
 * (categories, oracle config, star profiles, cluster descriptions).
 */

import { PrismaClient } from '@/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

// Singleton Prisma client with Prisma 7 pg adapter
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ─── Star CRUD ──────────────────────────────────────────────

export async function upsertStar(data: {
  name: string;
  walletAddress: string;
  telegramId?: string;
  circleWalletId?: string;
  starType: string;
  description?: string;
}) {
  return prisma.star.upsert({
    where: { name: data.name },
    update: {
      walletAddress: data.walletAddress,
      telegramId: data.telegramId,
      circleWalletId: data.circleWalletId,
      starType: data.starType,
      description: data.description,
    },
    create: data,
  });
}

export async function getStarByTelegramId(telegramId: string) {
  return prisma.star.findFirst({
    where: { telegramId },
  });
}

export async function getStarByAddress(walletAddress: string) {
  return prisma.star.findFirst({
    where: { walletAddress },
  });
}

export async function getStarByName(name: string) {
  return prisma.star.findUnique({
    where: { name },
  });
}

export async function updateStarStats(
  name: string,
  stats: { totalPhotons?: number; betsWon?: number; betsLost?: number; clusterId?: string }
) {
  return prisma.star.update({
    where: { name },
    data: stats,
  });
}

// ─── MarketMetadata CRUD ────────────────────────────────────

export async function upsertMarketMetadata(data: {
  onChainId: number;
  name: string;
  category?: string;
  oracleType?: string;
  oracleSource?: string;
  creatorName?: string;
}) {
  return prisma.marketMetadata.upsert({
    where: { onChainId: data.onChainId },
    update: {
      category: data.category,
      oracleType: data.oracleType,
      oracleSource: data.oracleSource,
      creatorName: data.creatorName,
    },
    create: {
      onChainId: data.onChainId,
      name: data.name,
      category: data.category || 'custom',
      oracleType: data.oracleType || 'manual',
      oracleSource: data.oracleSource,
      creatorName: data.creatorName,
    },
  });
}

export async function getMarketMetadata(onChainId: number) {
  return prisma.marketMetadata.findUnique({
    where: { onChainId },
  });
}

export async function getMarketMetadataByName(name: string) {
  return prisma.marketMetadata.findUnique({
    where: { name },
  });
}

export async function getAllMarketMetadata() {
  return prisma.marketMetadata.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMarketMetadataByCategory(category: string) {
  return prisma.marketMetadata.findMany({
    where: { category },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── ClusterMetadata CRUD ───────────────────────────────────

export async function upsertClusterMetadata(data: {
  onChainId: number;
  name: string;
  description?: string;
  avatarUrl?: string;
}) {
  return prisma.clusterMetadata.upsert({
    where: { onChainId: data.onChainId },
    update: {
      description: data.description,
      avatarUrl: data.avatarUrl,
    },
    create: data,
  });
}

export async function getClusterMetadata(onChainId: number) {
  return prisma.clusterMetadata.findUnique({
    where: { onChainId },
  });
}

export async function getClusterMetadataByName(name: string) {
  return prisma.clusterMetadata.findUnique({
    where: { name },
  });
}

export async function getAllClusterMetadata() {
  return prisma.clusterMetadata.findMany({
    orderBy: { createdAt: 'desc' },
  });
}
