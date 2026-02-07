/**
 * Database Service
 *
 * Supabase JS client + CRUD helpers for metadata.
 * Financial data lives on-chain; this handles only metadata
 * (categories, oracle config, star profiles, cluster descriptions).
 *
 * Tables use `voidmarket_` prefix (shared Supabase project).
 * Column names are snake_case; functions map to/from camelCase
 * so all callers (API routes) see the same shape as before.
 */

import { createClient } from '@supabase/supabase-js';
import { getMarketById } from './contracts/market-service';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// ─── Type helpers (match original Prisma shapes) ─────────────

interface Star {
  id: string;
  name: string;
  walletAddress: string;
  telegramId: string | null;
  circleWalletId: string | null;
  starType: string;
  description: string | null;
  clusterId: string | null;
  totalPhotons: number;
  betsWon: number;
  betsLost: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MarketMetadata {
  id: string;
  onChainId: number;
  name: string;
  category: string;
  oracleType: string;
  oracleSource: string | null;
  creatorName: string | null;
  createdAt: Date;
}

interface ClusterMetadata {
  id: string;
  onChainId: number;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

// ─── Row mappers (snake_case DB → camelCase app) ─────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStar(row: any): Star {
  return {
    id: row.id,
    name: row.name,
    walletAddress: row.wallet_address,
    telegramId: row.telegram_id,
    circleWalletId: row.circle_wallet_id,
    starType: row.star_type,
    description: row.description,
    clusterId: row.cluster_id,
    totalPhotons: row.total_photons,
    betsWon: row.bets_won,
    betsLost: row.bets_lost,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMarket(row: any): MarketMetadata {
  return {
    id: row.id,
    onChainId: row.on_chain_id,
    name: row.name,
    category: row.category,
    oracleType: row.oracle_type,
    oracleSource: row.oracle_source,
    creatorName: row.creator_name,
    createdAt: new Date(row.created_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCluster(row: any): ClusterMetadata {
  return {
    id: row.id,
    onChainId: row.on_chain_id,
    name: row.name,
    description: row.description,
    avatarUrl: row.avatar_url,
    createdAt: new Date(row.created_at),
  };
}

// ─── Star CRUD ──────────────────────────────────────────────

export async function upsertStar(data: {
  name: string;
  walletAddress: string;
  telegramId?: string;
  circleWalletId?: string;
  starType: string;
  description?: string;
}): Promise<Star> {
  const { data: row, error } = await supabase
    .from('voidmarket_stars')
    .upsert(
      {
        name: data.name,
        wallet_address: data.walletAddress,
        telegram_id: data.telegramId ?? null,
        circle_wallet_id: data.circleWalletId ?? null,
        star_type: data.starType,
        description: data.description ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'name' }
    )
    .select()
    .single();

  if (error) throw error;
  return mapStar(row);
}

export async function getStarByTelegramId(telegramId: string): Promise<Star | null> {
  const { data: row, error } = await supabase
    .from('voidmarket_stars')
    .select()
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (error) throw error;
  return row ? mapStar(row) : null;
}

export async function getStarByAddress(walletAddress: string): Promise<Star | null> {
  const { data: row, error } = await supabase
    .from('voidmarket_stars')
    .select()
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (error) throw error;
  return row ? mapStar(row) : null;
}

export async function getStarByName(name: string): Promise<Star | null> {
  const { data: row, error } = await supabase
    .from('voidmarket_stars')
    .select()
    .eq('name', name)
    .maybeSingle();

  if (error) throw error;
  return row ? mapStar(row) : null;
}

export async function updateStarStats(
  name: string,
  stats: { totalPhotons?: number; betsWon?: number; betsLost?: number; clusterId?: string }
): Promise<Star> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = { updated_at: new Date().toISOString() };
  if (stats.totalPhotons !== undefined) update.total_photons = stats.totalPhotons;
  if (stats.betsWon !== undefined) update.bets_won = stats.betsWon;
  if (stats.betsLost !== undefined) update.bets_lost = stats.betsLost;
  if (stats.clusterId !== undefined) update.cluster_id = stats.clusterId;

  const { data: row, error } = await supabase
    .from('voidmarket_stars')
    .update(update)
    .eq('name', name)
    .select()
    .single();

  if (error) throw error;
  return mapStar(row);
}

// ─── MarketMetadata CRUD ────────────────────────────────────

export async function upsertMarketMetadata(data: {
  onChainId: number;
  name: string;
  category?: string;
  oracleType?: string;
  oracleSource?: string;
  creatorName?: string;
}): Promise<MarketMetadata> {
  const { data: row, error } = await supabase
    .from('voidmarket_market_metadata')
    .upsert(
      {
        on_chain_id: data.onChainId,
        name: data.name,
        category: data.category || 'custom',
        oracle_type: data.oracleType || 'manual',
        oracle_source: data.oracleSource ?? null,
        creator_name: data.creatorName ?? null,
      },
      { onConflict: 'on_chain_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return mapMarket(row);
}

export async function getMarketMetadata(onChainId: number): Promise<MarketMetadata | null> {
  const { data: row, error } = await supabase
    .from('voidmarket_market_metadata')
    .select()
    .eq('on_chain_id', onChainId)
    .maybeSingle();

  if (error) throw error;
  return row ? mapMarket(row) : null;
}

export async function getMarketMetadataByName(name: string): Promise<MarketMetadata | null> {
  const { data: row, error } = await supabase
    .from('voidmarket_market_metadata')
    .select()
    .eq('name', name)
    .maybeSingle();

  if (error) throw error;
  return row ? mapMarket(row) : null;
}

export async function getAllMarketMetadata(): Promise<MarketMetadata[]> {
  const { data: rows, error } = await supabase
    .from('voidmarket_market_metadata')
    .select()
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (rows || []).map(mapMarket);
}

export async function getMarketMetadataByCategory(category: string): Promise<MarketMetadata[]> {
  const { data: rows, error } = await supabase
    .from('voidmarket_market_metadata')
    .select()
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (rows || []).map(mapMarket);
}

// ─── ClusterMetadata CRUD ───────────────────────────────────

export async function upsertClusterMetadata(data: {
  onChainId: number;
  name: string;
  description?: string;
  avatarUrl?: string;
}): Promise<ClusterMetadata> {
  const { data: row, error } = await supabase
    .from('voidmarket_cluster_metadata')
    .upsert(
      {
        on_chain_id: data.onChainId,
        name: data.name,
        description: data.description ?? null,
        avatar_url: data.avatarUrl ?? null,
      },
      { onConflict: 'on_chain_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return mapCluster(row);
}

export async function getClusterMetadata(onChainId: number): Promise<ClusterMetadata | null> {
  const { data: row, error } = await supabase
    .from('voidmarket_cluster_metadata')
    .select()
    .eq('on_chain_id', onChainId)
    .maybeSingle();

  if (error) throw error;
  return row ? mapCluster(row) : null;
}

export async function getClusterMetadataByName(name: string): Promise<ClusterMetadata | null> {
  const { data: row, error } = await supabase
    .from('voidmarket_cluster_metadata')
    .select()
    .eq('name', name)
    .maybeSingle();

  if (error) throw error;
  return row ? mapCluster(row) : null;
}

export async function getAllClusterMetadata(): Promise<ClusterMetadata[]> {
  const { data: rows, error } = await supabase
    .from('voidmarket_cluster_metadata')
    .select()
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (rows || []).map(mapCluster);
}

// ─── ENS Resolution Helpers ─────────────────────────────────

export interface ResolvedEntity {
  type: 'star' | 'market' | 'cluster';
  walletAddress?: string;
  textRecords: Record<string, string>;
  contenthash?: string;
}

export async function getStarByNameForENS(name: string): Promise<ResolvedEntity | null> {
  const star = await getStarByName(name);
  if (!star) return null;

  const textRecords: Record<string, string> = {
    'voidmarket.star-type': star.starType,
    'voidmarket.total-photons': String(star.totalPhotons),
    'voidmarket.bets-won': String(star.betsWon),
    'voidmarket.bets-lost': String(star.betsLost),
    'voidmarket.created-at': star.createdAt.toISOString(),
  };

  if (star.description) {
    textRecords['description'] = star.description;
  }

  if (star.clusterId) {
    const cluster = await getClusterMetadata(parseInt(star.clusterId) || 0);
    if (cluster) {
      textRecords['voidmarket.cluster'] = cluster.name;
    }
  }

  return {
    type: 'star',
    walletAddress: star.walletAddress,
    textRecords,
  };
}

export async function getMarketByNameForENS(
  name: string,
  _parentDomain?: string | null
): Promise<ResolvedEntity | null> {
  const market = await getMarketMetadataByName(name);
  if (!market) return null;

  const textRecords: Record<string, string> = {
    'voidmarket.category': market.category,
    'voidmarket.oracle': market.oracleType,
    'voidmarket.on-chain-id': String(market.onChainId),
  };

  if (market.oracleSource) {
    textRecords['voidmarket.oracle-source'] = market.oracleSource;
  }

  if (market.creatorName) {
    textRecords['voidmarket.creator'] = market.creatorName;
  }

  // Enrich with on-chain data
  try {
    const chain = await getMarketById(market.onChainId);
    if (chain) {
      textRecords['voidmarket.pool-size'] = chain.totalPool;
      textRecords['voidmarket.status'] = chain.status;
      textRecords['voidmarket.question'] = chain.question;
      textRecords['voidmarket.yes-amount'] = chain.totalYesAmount;
      textRecords['voidmarket.no-amount'] = chain.totalNoAmount;
      if (chain.status === 'resolved') {
        textRecords['voidmarket.outcome'] = chain.outcome ? 'YES' : 'NO';
      }
    }
  } catch {
    // Graceful degradation — chain data optional
  }

  return { type: 'market', textRecords };
}

export async function getClusterByNameForENS(name: string): Promise<ResolvedEntity | null> {
  const cluster = await getClusterMetadataByName(name);
  if (!cluster) return null;

  const textRecords: Record<string, string> = {
    'voidmarket.on-chain-id': String(cluster.onChainId),
    'voidmarket.created-at': cluster.createdAt.toISOString(),
  };

  if (cluster.description) {
    textRecords['description'] = cluster.description;
  }

  if (cluster.avatarUrl) {
    textRecords['avatar'] = cluster.avatarUrl;
  }

  return { type: 'cluster', textRecords };
}

// ─── Bet CRUD ───────────────────────────────────────────────

export async function insertBet(data: {
  betId: number;
  marketId: number;
  bettorAddress: string;
  telegramUserId?: string;
  commitmentHash: string;
  amount: number;
  txHash?: string;
}): Promise<void> {
  const { error } = await supabase.from('voidmarket_bets').insert({
    bet_id: data.betId,
    market_id: data.marketId,
    bettor_address: data.bettorAddress,
    telegram_user_id: data.telegramUserId ?? null,
    commitment_hash: data.commitmentHash,
    amount: data.amount,
    status: 'placed',
    tx_hash: data.txHash ?? null,
  });
  if (error) throw error;
}

export async function getBetByOnChainId(betId: number) {
  const { data: row, error } = await supabase
    .from('voidmarket_bets')
    .select()
    .eq('bet_id', betId)
    .maybeSingle();
  if (error) throw error;
  return row;
}

export async function getBetsByMarketId(marketId: number) {
  const { data: rows, error } = await supabase
    .from('voidmarket_bets')
    .select()
    .eq('market_id', marketId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return rows || [];
}

export async function getBetsByTelegramUser(telegramUserId: string) {
  const { data: rows, error } = await supabase
    .from('voidmarket_bets')
    .select()
    .eq('telegram_user_id', telegramUserId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return rows || [];
}

export async function updateBetStatus(betId: number, status: string, direction?: boolean) {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (direction !== undefined) update.direction = direction;

  const { error } = await supabase
    .from('voidmarket_bets')
    .update(update)
    .eq('bet_id', betId);
  if (error) throw error;
}

// ─── Transaction CRUD ───────────────────────────────────────

export async function insertTransaction(data: {
  telegramUserId: string;
  type: string;
  amount: number;
  chain?: string;
  txHash?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from('voidmarket_transactions').insert({
    telegram_user_id: data.telegramUserId,
    type: data.type,
    amount: data.amount,
    chain: data.chain ?? null,
    tx_hash: data.txHash ?? null,
    status: data.status || 'pending',
    metadata: data.metadata || {},
  });
  if (error) throw error;
}

export async function getTransactionsByUser(telegramUserId: string) {
  const { data: rows, error } = await supabase
    .from('voidmarket_transactions')
    .select()
    .eq('telegram_user_id', telegramUserId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return rows || [];
}

export async function updateTransactionStatus(txHash: string, status: string) {
  const { error } = await supabase
    .from('voidmarket_transactions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('tx_hash', txHash);
  if (error) throw error;
}

// ─── Cluster Member CRUD ────────────────────────────────────

export async function upsertClusterMember(data: {
  clusterId: number;
  memberAddress: string;
  role?: string;
  isActive?: boolean;
}): Promise<void> {
  const { error } = await supabase.from('voidmarket_cluster_members').upsert(
    {
      cluster_id: data.clusterId,
      member_address: data.memberAddress,
      role: data.role || 'member',
      is_active: data.isActive ?? true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'cluster_id,member_address' }
  );
  if (error) throw error;
}

export async function getClusterMembers(clusterId: number) {
  const { data: rows, error } = await supabase
    .from('voidmarket_cluster_members')
    .select()
    .eq('cluster_id', clusterId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return rows || [];
}

export async function deactivateClusterMember(clusterId: number, memberAddress: string) {
  const { error } = await supabase
    .from('voidmarket_cluster_members')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('cluster_id', clusterId)
    .eq('member_address', memberAddress);
  if (error) throw error;
}

// ─── Nova CRUD ──────────────────────────────────────────────

export async function insertNova(data: {
  novaId: number;
  challengerClusterId: number;
  defenderClusterId: number;
  prizePool: number;
  status?: string;
}): Promise<void> {
  const { error } = await supabase.from('voidmarket_novas').insert({
    nova_id: data.novaId,
    challenger_cluster_id: data.challengerClusterId,
    defender_cluster_id: data.defenderClusterId,
    prize_pool: data.prizePool,
    status: data.status || 'pending',
  });
  if (error) throw error;
}

export async function getNovaById(novaId: number) {
  const { data: row, error } = await supabase
    .from('voidmarket_novas')
    .select()
    .eq('nova_id', novaId)
    .maybeSingle();
  if (error) throw error;
  return row;
}

export async function updateNovaStatus(novaId: number, status: string, winnerClusterId?: number) {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (winnerClusterId !== undefined) update.winner_cluster_id = winnerClusterId;

  const { error } = await supabase
    .from('voidmarket_novas')
    .update(update)
    .eq('nova_id', novaId);
  if (error) throw error;
}

// ─── Nova Match CRUD ────────────────────────────────────────

export async function insertNovaMatch(data: {
  matchId: number;
  novaId: number;
  round: number;
  challengerAddress: string;
  defenderAddress: string;
  marketId?: number;
}): Promise<void> {
  const { error } = await supabase.from('voidmarket_nova_matches').insert({
    match_id: data.matchId,
    nova_id: data.novaId,
    round: data.round,
    challenger_address: data.challengerAddress,
    defender_address: data.defenderAddress,
    market_id: data.marketId ?? null,
  });
  if (error) throw error;
}

export async function getNovaMatchesByNovaId(novaId: number) {
  const { data: rows, error } = await supabase
    .from('voidmarket_nova_matches')
    .select()
    .eq('nova_id', novaId)
    .order('round', { ascending: true });
  if (error) throw error;
  return rows || [];
}

export async function updateMatchResult(matchId: number, winnerAddress: string) {
  const { error } = await supabase
    .from('voidmarket_nova_matches')
    .update({ winner_address: winnerAddress, updated_at: new Date().toISOString() })
    .eq('match_id', matchId);
  if (error) throw error;
}

// ─── Leaderboard Queries ────────────────────────────────────

export async function getTopStarsByPhotons(limit = 20) {
  const { data: rows, error } = await supabase
    .from('voidmarket_stars')
    .select()
    .order('total_photons', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (rows || []).map(mapStar);
}

export async function getTopStarsByActivity(limit = 20) {
  const { data: rows, error } = await supabase
    .from('voidmarket_stars')
    .select()
    .order('bets_won', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (rows || []).map(mapStar);
}
