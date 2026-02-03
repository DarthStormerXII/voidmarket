/**
 * PostgreSQL Database Schema
 *
 * Drizzle ORM schema for VoidMarket off-chain data storage
 */

import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  varchar,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================================================
// Users & Wallets
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    telegramId: varchar('telegram_id', { length: 64 }).notNull().unique(),
    username: varchar('username', { length: 64 }),
    walletId: varchar('wallet_id', { length: 128 }).notNull(),
    walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
    refId: varchar('ref_id', { length: 128 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    telegramIdIdx: uniqueIndex('users_telegram_id_idx').on(table.telegramId),
    walletAddressIdx: index('users_wallet_address_idx').on(table.walletAddress),
  })
);

// ============================================================================
// Profiles (Stars)
// ============================================================================

export const profiles = pgTable(
  'profiles',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull()
      .unique(),
    displayName: varchar('display_name', { length: 64 }).notNull(),
    starType: varchar('star_type', { length: 32 }).notNull(), // 'MAIN_SEQUENCE', 'RED_GIANT', etc.
    ensSubdomain: varchar('ens_subdomain', { length: 128 }), // e.g., 'alice.voidmarket.eth'
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    totalBets: integer('total_bets').default(0).notNull(),
    totalWins: integer('total_wins').default(0).notNull(),
    totalEarnings: bigint('total_earnings', { mode: 'bigint' }).default(0n).notNull(),
    photons: integer('photons').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: uniqueIndex('profiles_user_id_idx').on(table.userId),
    ensSubdomainIdx: uniqueIndex('profiles_ens_subdomain_idx').on(table.ensSubdomain),
  })
);

// ============================================================================
// Markets
// ============================================================================

export const markets: ReturnType<typeof pgTable> = pgTable(
  'markets',
  {
    id: serial('id').primaryKey(),
    onChainId: bigint('on_chain_id', { mode: 'bigint' }).notNull().unique(),
    question: text('question').notNull(),
    creatorId: integer('creator_id')
      .references(() => users.id)
      .notNull(),
    deadline: timestamp('deadline').notNull(),
    resolutionDeadline: timestamp('resolution_deadline').notNull(),
    status: varchar('status', { length: 32 }).default('OPEN').notNull(), // OPEN, BETTING_CLOSED, RESOLVED, CANCELLED
    outcome: boolean('outcome'), // null until resolved
    totalYesAmount: bigint('total_yes_amount', { mode: 'bigint' }).default(0n).notNull(),
    totalNoAmount: bigint('total_no_amount', { mode: 'bigint' }).default(0n).notNull(),
    totalPool: bigint('total_pool', { mode: 'bigint' }).default(0n).notNull(),
    isForked: boolean('is_forked').default(false).notNull(),
    parentMarketId: integer('parent_market_id'),
    category: varchar('category', { length: 64 }),
    tags: jsonb('tags').$type<string[]>().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    onChainIdIdx: uniqueIndex('markets_on_chain_id_idx').on(table.onChainId),
    creatorIdIdx: index('markets_creator_id_idx').on(table.creatorId),
    statusIdx: index('markets_status_idx').on(table.status),
    deadlineIdx: index('markets_deadline_idx').on(table.deadline),
  })
);

// ============================================================================
// Bets
// ============================================================================

export const bets = pgTable(
  'bets',
  {
    id: serial('id').primaryKey(),
    onChainId: bigint('on_chain_id', { mode: 'bigint' }).notNull().unique(),
    marketId: integer('market_id')
      .references(() => markets.id)
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    commitmentHash: varchar('commitment_hash', { length: 66 }).notNull(),
    direction: boolean('direction'), // null until revealed
    salt: varchar('salt', { length: 66 }), // stored after reveal or for user convenience
    revealed: boolean('revealed').default(false).notNull(),
    claimed: boolean('claimed').default(false).notNull(),
    winnings: bigint('winnings', { mode: 'bigint' }),
    txHash: varchar('tx_hash', { length: 66 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    onChainIdIdx: uniqueIndex('bets_on_chain_id_idx').on(table.onChainId),
    marketIdIdx: index('bets_market_id_idx').on(table.marketId),
    userIdIdx: index('bets_user_id_idx').on(table.userId),
    commitmentIdx: index('bets_commitment_hash_idx').on(table.commitmentHash),
  })
);

// ============================================================================
// Clusters (Teams)
// ============================================================================

export const clusters = pgTable(
  'clusters',
  {
    id: serial('id').primaryKey(),
    onChainId: bigint('on_chain_id', { mode: 'bigint' }).notNull().unique(),
    name: varchar('name', { length: 64 }).notNull(),
    leaderId: integer('leader_id')
      .references(() => users.id)
      .notNull(),
    isPrivate: boolean('is_private').default(false).notNull(),
    energy: bigint('energy', { mode: 'bigint' }).default(0n).notNull(),
    novasWon: integer('novas_won').default(0).notNull(),
    totalNovas: integer('total_novas').default(0).notNull(),
    memberCount: integer('member_count').default(1).notNull(),
    maxMembers: integer('max_members').default(50).notNull(),
    avatarUrl: text('avatar_url'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    onChainIdIdx: uniqueIndex('clusters_on_chain_id_idx').on(table.onChainId),
    leaderIdIdx: index('clusters_leader_id_idx').on(table.leaderId),
    nameIdx: index('clusters_name_idx').on(table.name),
  })
);

// ============================================================================
// Cluster Members
// ============================================================================

export const clusterMembers = pgTable(
  'cluster_members',
  {
    id: serial('id').primaryKey(),
    clusterId: integer('cluster_id')
      .references(() => clusters.id)
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    photons: integer('photons').default(0).notNull(),
    role: varchar('role', { length: 32 }).default('MEMBER').notNull(), // LEADER, OFFICER, MEMBER
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => ({
    clusterUserIdx: uniqueIndex('cluster_members_cluster_user_idx').on(
      table.clusterId,
      table.userId
    ),
    clusterIdIdx: index('cluster_members_cluster_id_idx').on(table.clusterId),
    userIdIdx: index('cluster_members_user_id_idx').on(table.userId),
  })
);

// ============================================================================
// Cluster Invites
// ============================================================================

export const clusterInvites = pgTable(
  'cluster_invites',
  {
    id: serial('id').primaryKey(),
    clusterId: integer('cluster_id')
      .references(() => clusters.id)
      .notNull(),
    inviteCode: varchar('invite_code', { length: 66 }).notNull().unique(),
    inviteeAddress: varchar('invitee_address', { length: 42 }),
    invitedById: integer('invited_by_id')
      .references(() => users.id)
      .notNull(),
    usedById: integer('used_by_id').references(() => users.id),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    inviteCodeIdx: uniqueIndex('cluster_invites_code_idx').on(table.inviteCode),
    clusterIdIdx: index('cluster_invites_cluster_id_idx').on(table.clusterId),
  })
);

// ============================================================================
// Novas (Cluster Battles)
// ============================================================================

export const novas = pgTable(
  'novas',
  {
    id: serial('id').primaryKey(),
    onChainId: bigint('on_chain_id', { mode: 'bigint' }).notNull().unique(),
    cluster1Id: integer('cluster1_id')
      .references(() => clusters.id)
      .notNull(),
    cluster2Id: integer('cluster2_id')
      .references(() => clusters.id)
      .notNull(),
    totalRounds: integer('total_rounds').notNull(),
    currentRound: integer('current_round').default(0).notNull(),
    status: varchar('status', { length: 32 }).default('PENDING').notNull(), // PENDING, ACTIVE, COMPLETED, CANCELLED
    prizePool: bigint('prize_pool', { mode: 'bigint' }).notNull(),
    winningClusterId: integer('winning_cluster_id').references(() => clusters.id),
    cluster1TotalPhotons: bigint('cluster1_total_photons', { mode: 'bigint' }).default(0n).notNull(),
    cluster2TotalPhotons: bigint('cluster2_total_photons', { mode: 'bigint' }).default(0n).notNull(),
    bettingDuration: integer('betting_duration').notNull(), // seconds
    matchesPerRound: integer('matches_per_round').notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    onChainIdIdx: uniqueIndex('novas_on_chain_id_idx').on(table.onChainId),
    statusIdx: index('novas_status_idx').on(table.status),
    cluster1Idx: index('novas_cluster1_id_idx').on(table.cluster1Id),
    cluster2Idx: index('novas_cluster2_id_idx').on(table.cluster2Id),
  })
);

// ============================================================================
// Nova Matches (1v1 battles within a Nova)
// ============================================================================

export const novaMatches = pgTable(
  'nova_matches',
  {
    id: serial('id').primaryKey(),
    onChainId: bigint('on_chain_id', { mode: 'bigint' }).notNull().unique(),
    novaId: integer('nova_id')
      .references(() => novas.id)
      .notNull(),
    round: integer('round').notNull(),
    star1Id: integer('star1_id')
      .references(() => users.id)
      .notNull(),
    star2Id: integer('star2_id')
      .references(() => users.id)
      .notNull(),
    marketId: integer('market_id').references(() => markets.id),
    status: varchar('status', { length: 32 }).default('PENDING').notNull(), // PENDING, BETTING, RESOLVED
    winnerId: integer('winner_id').references(() => users.id),
    star1Photons: integer('star1_photons').default(0).notNull(),
    star2Photons: integer('star2_photons').default(0).notNull(),
    bettingDeadline: timestamp('betting_deadline'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    onChainIdIdx: uniqueIndex('nova_matches_on_chain_id_idx').on(table.onChainId),
    novaIdIdx: index('nova_matches_nova_id_idx').on(table.novaId),
    star1Idx: index('nova_matches_star1_id_idx').on(table.star1Id),
    star2Idx: index('nova_matches_star2_id_idx').on(table.star2Id),
  })
);

// ============================================================================
// Nova Rewards
// ============================================================================

export const novaRewards = pgTable(
  'nova_rewards',
  {
    id: serial('id').primaryKey(),
    novaId: integer('nova_id')
      .references(() => novas.id)
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    photonsEarned: integer('photons_earned').notNull(),
    usdcReward: bigint('usdc_reward', { mode: 'bigint' }).notNull(),
    claimed: boolean('claimed').default(false).notNull(),
    claimedAt: timestamp('claimed_at'),
    txHash: varchar('tx_hash', { length: 66 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    novaUserIdx: uniqueIndex('nova_rewards_nova_user_idx').on(table.novaId, table.userId),
    novaIdIdx: index('nova_rewards_nova_id_idx').on(table.novaId),
    userIdIdx: index('nova_rewards_user_id_idx').on(table.userId),
  })
);

// ============================================================================
// Transactions (for tracking on-chain activity)
// ============================================================================

export const transactions = pgTable(
  'transactions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    type: varchar('type', { length: 32 }).notNull(), // BET, REVEAL, CLAIM, CREATE_MARKET, etc.
    txHash: varchar('tx_hash', { length: 66 }).notNull(),
    circleTransactionId: varchar('circle_transaction_id', { length: 128 }),
    status: varchar('status', { length: 32 }).default('PENDING').notNull(), // PENDING, CONFIRMED, FAILED
    chainId: integer('chain_id').notNull(),
    amount: bigint('amount', { mode: 'bigint' }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    txHashIdx: uniqueIndex('transactions_tx_hash_idx').on(table.txHash),
    userIdIdx: index('transactions_user_id_idx').on(table.userId),
    typeIdx: index('transactions_type_idx').on(table.type),
    statusIdx: index('transactions_status_idx').on(table.status),
  })
);

// ============================================================================
// ENS Records (cached off-chain data)
// ============================================================================

export const ensRecords = pgTable(
  'ens_records',
  {
    id: serial('id').primaryKey(),
    subdomain: varchar('subdomain', { length: 128 }).notNull().unique(), // e.g., 'alice'
    fullName: varchar('full_name', { length: 256 }).notNull(), // e.g., 'alice.voidmarket.eth'
    address: varchar('address', { length: 42 }).notNull(),
    userId: integer('user_id').references(() => users.id),
    records: jsonb('records').$type<Record<string, string>>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    subdomainIdx: uniqueIndex('ens_records_subdomain_idx').on(table.subdomain),
    addressIdx: index('ens_records_address_idx').on(table.address),
  })
);

// ============================================================================
// Type Exports
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;

export type Bet = typeof bets.$inferSelect;
export type NewBet = typeof bets.$inferInsert;

export type Cluster = typeof clusters.$inferSelect;
export type NewCluster = typeof clusters.$inferInsert;

export type ClusterMember = typeof clusterMembers.$inferSelect;
export type NewClusterMember = typeof clusterMembers.$inferInsert;

export type ClusterInvite = typeof clusterInvites.$inferSelect;
export type NewClusterInvite = typeof clusterInvites.$inferInsert;

export type Nova = typeof novas.$inferSelect;
export type NewNova = typeof novas.$inferInsert;

export type NovaMatch = typeof novaMatches.$inferSelect;
export type NewNovaMatch = typeof novaMatches.$inferInsert;

export type NovaReward = typeof novaRewards.$inferSelect;
export type NewNovaReward = typeof novaRewards.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type ENSRecord = typeof ensRecords.$inferSelect;
export type NewENSRecord = typeof ensRecords.$inferInsert;
