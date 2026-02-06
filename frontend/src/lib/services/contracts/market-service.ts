/**
 * Market Service — On-chain reads for VoidMarketCore
 */

import { formatUnits } from 'viem';
import { publicClient, VOIDMARKET_CORE_ADDRESS } from './client';
import { voidMarketCoreAbi } from './abis';

// Status enum mapping from contract
const STATUS_MAP: Record<number, 'active' | 'resolved' | 'cancelled'> = {
  0: 'active',
  1: 'resolved',
  2: 'cancelled',
};

export interface OnChainMarket {
  id: number;
  question: string;
  creator: string;
  deadline: number;
  resolutionDeadline: number;
  status: 'active' | 'resolved' | 'cancelled';
  outcome: boolean;
  totalYesAmount: string;
  totalNoAmount: string;
  totalPool: string;
  isForked: boolean;
  parentMarketId: number;
  revealDeadline: number;
}

export interface OnChainBet {
  id: number;
  bettor: string;
  marketId: number;
  amount: string;
  commitmentHash: string;
  revealed: boolean;
  direction: boolean;
  timestamp: number;
  claimed: boolean;
}

/**
 * Get the total number of markets
 */
export async function getMarketCount(): Promise<number> {
  const count = await publicClient.readContract({
    address: VOIDMARKET_CORE_ADDRESS,
    abi: voidMarketCoreAbi,
    functionName: 'marketCount',
  });
  return Number(count);
}

/**
 * Get a single market by ID
 */
export async function getMarketById(marketId: number): Promise<OnChainMarket> {
  const result = await publicClient.readContract({
    address: VOIDMARKET_CORE_ADDRESS,
    abi: voidMarketCoreAbi,
    functionName: 'getMarket',
    args: [BigInt(marketId)],
  });

  return mapMarket(result);
}

/**
 * Get all markets via multicall
 */
export async function getAllMarkets(): Promise<OnChainMarket[]> {
  const count = await getMarketCount();
  if (count === 0) return [];

  const calls = Array.from({ length: count }, (_, i) => ({
    address: VOIDMARKET_CORE_ADDRESS,
    abi: voidMarketCoreAbi,
    functionName: 'getMarket' as const,
    args: [BigInt(i + 1)],
  }));

  const results = await publicClient.multicall({ contracts: calls });

  return results
    .filter((r) => r.status === 'success')
    .map((r) => mapMarket(r.result as any));
}

/**
 * Get bet IDs for a market
 */
export async function getMarketBetIds(marketId: number): Promise<number[]> {
  const ids = await publicClient.readContract({
    address: VOIDMARKET_CORE_ADDRESS,
    abi: voidMarketCoreAbi,
    functionName: 'getMarketBets',
    args: [BigInt(marketId)],
  });
  return (ids as bigint[]).map(Number);
}

/**
 * Get a single bet by ID
 */
export async function getBetById(betId: number): Promise<OnChainBet> {
  const result = await publicClient.readContract({
    address: VOIDMARKET_CORE_ADDRESS,
    abi: voidMarketCoreAbi,
    functionName: 'getBet',
    args: [BigInt(betId)],
  });

  return mapBet(betId, result);
}

/**
 * Get all bets for a market
 */
export async function getMarketBets(marketId: number): Promise<OnChainBet[]> {
  const betIds = await getMarketBetIds(marketId);
  if (betIds.length === 0) return [];

  const calls = betIds.map((id) => ({
    address: VOIDMARKET_CORE_ADDRESS,
    abi: voidMarketCoreAbi,
    functionName: 'getBet' as const,
    args: [BigInt(id)],
  }));

  const results = await publicClient.multicall({ contracts: calls });

  return results
    .filter((r) => r.status === 'success')
    .map((r, i) => mapBet(betIds[i], r.result as any));
}

/**
 * Get user's bet IDs for a specific market
 */
export async function getUserBetsForMarket(
  marketId: number,
  userAddress: string
): Promise<number[]> {
  const ids = await publicClient.readContract({
    address: VOIDMARKET_CORE_ADDRESS,
    abi: voidMarketCoreAbi,
    functionName: 'getUserBets',
    args: [BigInt(marketId), userAddress as `0x${string}`],
  });
  return (ids as bigint[]).map(Number);
}

/**
 * Get total bet count
 */
export async function getBetCount(): Promise<number> {
  const count = await publicClient.readContract({
    address: VOIDMARKET_CORE_ADDRESS,
    abi: voidMarketCoreAbi,
    functionName: 'betCount',
  });
  return Number(count);
}

/**
 * Get forked market IDs
 */
export async function getForkedMarkets(parentMarketId: number): Promise<number[]> {
  const ids = await publicClient.readContract({
    address: VOIDMARKET_CORE_ADDRESS,
    abi: voidMarketCoreAbi,
    functionName: 'getForkedMarkets',
    args: [BigInt(parentMarketId)],
  });
  return (ids as bigint[]).map(Number);
}

// ─── Helpers ────────────────────────────────────────────────

function mapMarket(raw: any): OnChainMarket {
  return {
    id: Number(raw.id),
    question: raw.question,
    creator: raw.creator,
    deadline: Number(raw.deadline),
    resolutionDeadline: Number(raw.resolutionDeadline),
    status: STATUS_MAP[Number(raw.status)] || 'active',
    outcome: raw.outcome,
    totalYesAmount: formatUnits(raw.totalYesAmount, 18),
    totalNoAmount: formatUnits(raw.totalNoAmount, 18),
    totalPool: formatUnits(raw.totalPool, 18),
    isForked: raw.isForked,
    parentMarketId: Number(raw.parentMarketId),
    revealDeadline: Number(raw.revealDeadline),
  };
}

function mapBet(betId: number, raw: any): OnChainBet {
  return {
    id: betId,
    bettor: raw.bettor,
    marketId: Number(raw.marketId),
    amount: formatUnits(raw.amount, 18),
    commitmentHash: raw.commitmentHash,
    revealed: raw.revealed,
    direction: raw.direction,
    timestamp: Number(raw.timestamp),
    claimed: raw.claimed,
  };
}
