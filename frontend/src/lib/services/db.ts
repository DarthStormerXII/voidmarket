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
