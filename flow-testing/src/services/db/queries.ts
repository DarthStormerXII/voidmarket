/**
 * Database Query Helpers
 *
 * Common query patterns for VoidMarket data
 */

import { eq, and, desc, sql, gte, lte, isNull } from 'drizzle-orm';
import { db, schema } from './client.js';
import type {
  User,
  NewUser,
  Profile,
  NewProfile,
  Market,
  NewMarket,
  Bet,
  NewBet,
  Cluster,
  NewCluster,
  ClusterMember,
  NewClusterMember,
  ClusterInvite,
  NewClusterInvite,
  Nova,
  NewNova,
  NovaMatch,
  NewNovaMatch,
  NovaReward,
  NewNovaReward,
  Transaction,
  NewTransaction,
  ENSRecord,
  NewENSRecord,
} from './schema.js';

// ============================================================================
// Users
// ============================================================================

export async function createUser(data: NewUser): Promise<User> {
  const [user] = await db.insert(schema.users).values(data).returning();
  return user;
}

export async function getUserByTelegramId(telegramId: string): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(schema.users.telegramId, telegramId),
  });
}

export async function getUserByWalletAddress(address: string): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(schema.users.walletAddress, address.toLowerCase()),
  });
}

export async function getUserById(id: number): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(schema.users.id, id),
  });
}

// ============================================================================
// Profiles
// ============================================================================

export async function createProfile(data: NewProfile): Promise<Profile> {
  const [profile] = await db.insert(schema.profiles).values(data).returning();
  return profile;
}

export async function getProfileByUserId(userId: number): Promise<Profile | undefined> {
  return db.query.profiles.findFirst({
    where: eq(schema.profiles.userId, userId),
  });
}

export async function getProfileByENS(subdomain: string): Promise<Profile | undefined> {
  return db.query.profiles.findFirst({
    where: eq(schema.profiles.ensSubdomain, subdomain),
  });
}

export async function updateProfile(
  userId: number,
  data: Partial<Omit<Profile, 'id' | 'userId' | 'createdAt'>>
): Promise<Profile | undefined> {
  const [profile] = await db
    .update(schema.profiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.profiles.userId, userId))
    .returning();
  return profile;
}

// ============================================================================
// Markets
// ============================================================================

export async function createMarket(data: NewMarket): Promise<Market> {
  const [market] = await db.insert(schema.markets).values(data).returning();
  return market;
}

export async function getMarketByOnChainId(onChainId: bigint): Promise<Market | undefined> {
  return db.query.markets.findFirst({
    where: eq(schema.markets.onChainId, onChainId),
  });
}

export async function getOpenMarkets(limit = 50): Promise<Market[]> {
  return db.query.markets.findMany({
    where: eq(schema.markets.status, 'OPEN'),
    orderBy: desc(schema.markets.createdAt),
    limit,
  });
}

export async function getMarketsByCreator(creatorId: number): Promise<Market[]> {
  return db.query.markets.findMany({
    where: eq(schema.markets.creatorId, creatorId),
    orderBy: desc(schema.markets.createdAt),
  });
}

export async function updateMarketStatus(
  onChainId: bigint,
  status: string,
  outcome?: boolean
): Promise<Market | undefined> {
  const [market] = await db
    .update(schema.markets)
    .set({ status, outcome, updatedAt: new Date() })
    .where(eq(schema.markets.onChainId, onChainId))
    .returning();
  return market;
}

// ============================================================================
// Bets
// ============================================================================

export async function createBet(data: NewBet): Promise<Bet> {
  const [bet] = await db.insert(schema.bets).values(data).returning();
  return bet;
}

export async function getBetByOnChainId(onChainId: bigint): Promise<Bet | undefined> {
  return db.query.bets.findFirst({
    where: eq(schema.bets.onChainId, onChainId),
  });
}

export async function getUserBetsForMarket(userId: number, marketId: number): Promise<Bet[]> {
  return db.query.bets.findMany({
    where: and(eq(schema.bets.userId, userId), eq(schema.bets.marketId, marketId)),
  });
}

export async function getUnrevealedBetsForMarket(marketId: number): Promise<Bet[]> {
  return db.query.bets.findMany({
    where: and(eq(schema.bets.marketId, marketId), eq(schema.bets.revealed, false)),
  });
}

export async function updateBetRevealed(
  onChainId: bigint,
  direction: boolean,
  salt?: string
): Promise<Bet | undefined> {
  const [bet] = await db
    .update(schema.bets)
    .set({ revealed: true, direction, salt, updatedAt: new Date() })
    .where(eq(schema.bets.onChainId, onChainId))
    .returning();
  return bet;
}

export async function updateBetClaimed(
  onChainId: bigint,
  winnings: bigint
): Promise<Bet | undefined> {
  const [bet] = await db
    .update(schema.bets)
    .set({ claimed: true, winnings, updatedAt: new Date() })
    .where(eq(schema.bets.onChainId, onChainId))
    .returning();
  return bet;
}

// ============================================================================
// Clusters
// ============================================================================

export async function createCluster(data: NewCluster): Promise<Cluster> {
  const [cluster] = await db.insert(schema.clusters).values(data).returning();
  return cluster;
}

export async function getClusterByOnChainId(onChainId: bigint): Promise<Cluster | undefined> {
  return db.query.clusters.findFirst({
    where: eq(schema.clusters.onChainId, onChainId),
  });
}

export async function getClustersByLeader(leaderId: number): Promise<Cluster[]> {
  return db.query.clusters.findMany({
    where: eq(schema.clusters.leaderId, leaderId),
  });
}

export async function getPublicClusters(limit = 50): Promise<Cluster[]> {
  return db.query.clusters.findMany({
    where: eq(schema.clusters.isPrivate, false),
    orderBy: desc(schema.clusters.energy),
    limit,
  });
}

// ============================================================================
// Cluster Members
// ============================================================================

export async function addClusterMember(data: NewClusterMember): Promise<ClusterMember> {
  const [member] = await db.insert(schema.clusterMembers).values(data).returning();
  return member;
}

export async function getClusterMember(
  clusterId: number,
  userId: number
): Promise<ClusterMember | undefined> {
  return db.query.clusterMembers.findFirst({
    where: and(
      eq(schema.clusterMembers.clusterId, clusterId),
      eq(schema.clusterMembers.userId, userId)
    ),
  });
}

export async function getUserCluster(userId: number): Promise<ClusterMember | undefined> {
  return db.query.clusterMembers.findFirst({
    where: and(eq(schema.clusterMembers.userId, userId), eq(schema.clusterMembers.isActive, true)),
  });
}

export async function getClusterMembers(clusterId: number): Promise<ClusterMember[]> {
  return db.query.clusterMembers.findMany({
    where: and(
      eq(schema.clusterMembers.clusterId, clusterId),
      eq(schema.clusterMembers.isActive, true)
    ),
  });
}

// ============================================================================
// Cluster Invites
// ============================================================================

export async function createClusterInvite(data: NewClusterInvite): Promise<ClusterInvite> {
  const [invite] = await db.insert(schema.clusterInvites).values(data).returning();
  return invite;
}

export async function getInviteByCode(code: string): Promise<ClusterInvite | undefined> {
  return db.query.clusterInvites.findFirst({
    where: and(
      eq(schema.clusterInvites.inviteCode, code),
      isNull(schema.clusterInvites.usedAt),
      gte(schema.clusterInvites.expiresAt, new Date())
    ),
  });
}

export async function markInviteUsed(
  code: string,
  usedById: number
): Promise<ClusterInvite | undefined> {
  const [invite] = await db
    .update(schema.clusterInvites)
    .set({ usedById, usedAt: new Date() })
    .where(eq(schema.clusterInvites.inviteCode, code))
    .returning();
  return invite;
}

// ============================================================================
// Novas
// ============================================================================

export async function createNova(data: NewNova): Promise<Nova> {
  const [nova] = await db.insert(schema.novas).values(data).returning();
  return nova;
}

export async function getNovaByOnChainId(onChainId: bigint): Promise<Nova | undefined> {
  return db.query.novas.findFirst({
    where: eq(schema.novas.onChainId, onChainId),
  });
}

export async function getActiveNovas(): Promise<Nova[]> {
  return db.query.novas.findMany({
    where: eq(schema.novas.status, 'ACTIVE'),
    orderBy: desc(schema.novas.startedAt),
  });
}

export async function updateNovaStatus(
  onChainId: bigint,
  status: string,
  winningClusterId?: number
): Promise<Nova | undefined> {
  const updateData: Partial<Nova> = { status, updatedAt: new Date() };
  if (winningClusterId) updateData.winningClusterId = winningClusterId;
  if (status === 'COMPLETED') updateData.completedAt = new Date();

  const [nova] = await db
    .update(schema.novas)
    .set(updateData)
    .where(eq(schema.novas.onChainId, onChainId))
    .returning();
  return nova;
}

// ============================================================================
// Nova Matches
// ============================================================================

export async function createNovaMatch(data: NewNovaMatch): Promise<NovaMatch> {
  const [match] = await db.insert(schema.novaMatches).values(data).returning();
  return match;
}

export async function getMatchByOnChainId(onChainId: bigint): Promise<NovaMatch | undefined> {
  return db.query.novaMatches.findFirst({
    where: eq(schema.novaMatches.onChainId, onChainId),
  });
}

export async function getNovaMatches(novaId: number): Promise<NovaMatch[]> {
  return db.query.novaMatches.findMany({
    where: eq(schema.novaMatches.novaId, novaId),
    orderBy: [schema.novaMatches.round, schema.novaMatches.id],
  });
}

// ============================================================================
// Nova Rewards
// ============================================================================

export async function createNovaReward(data: NewNovaReward): Promise<NovaReward> {
  const [reward] = await db.insert(schema.novaRewards).values(data).returning();
  return reward;
}

export async function getUserNovaReward(
  novaId: number,
  userId: number
): Promise<NovaReward | undefined> {
  return db.query.novaRewards.findFirst({
    where: and(eq(schema.novaRewards.novaId, novaId), eq(schema.novaRewards.userId, userId)),
  });
}

export async function getUnclaimedRewards(userId: number): Promise<NovaReward[]> {
  return db.query.novaRewards.findMany({
    where: and(eq(schema.novaRewards.userId, userId), eq(schema.novaRewards.claimed, false)),
  });
}

// ============================================================================
// Transactions
// ============================================================================

export async function createTransaction(data: NewTransaction): Promise<Transaction> {
  const [tx] = await db.insert(schema.transactions).values(data).returning();
  return tx;
}

export async function updateTransactionStatus(
  txHash: string,
  status: string
): Promise<Transaction | undefined> {
  const [tx] = await db
    .update(schema.transactions)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.transactions.txHash, txHash))
    .returning();
  return tx;
}

// ============================================================================
// ENS Records
// ============================================================================

export async function createENSRecord(data: NewENSRecord): Promise<ENSRecord> {
  const [record] = await db.insert(schema.ensRecords).values(data).returning();
  return record;
}

export async function getENSRecord(subdomain: string): Promise<ENSRecord | undefined> {
  return db.query.ensRecords.findFirst({
    where: eq(schema.ensRecords.subdomain, subdomain.toLowerCase()),
  });
}

export async function updateENSRecords(
  subdomain: string,
  records: Record<string, string>
): Promise<ENSRecord | undefined> {
  const [record] = await db
    .update(schema.ensRecords)
    .set({ records, updatedAt: new Date() })
    .where(eq(schema.ensRecords.subdomain, subdomain.toLowerCase()))
    .returning();
  return record;
}
