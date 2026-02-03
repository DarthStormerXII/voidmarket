/**
 * Market Contract Service
 *
 * Interacts with VoidMarketCore contract for markets and betting
 */

import { publicClients } from '../../config/chains.js';
import { CONTRACT_ADDRESSES, VOID_MARKET_CORE_ABI } from '../../config/contracts.js';
import { executeAndWait, type ContractCallParams } from '../circle/transaction.js';
import type { Hex } from 'viem';

// Use human-readable ABI directly
const abi = VOID_MARKET_CORE_ABI as any;

export interface MarketData {
  id: bigint;
  question: string;
  creator: string;
  deadline: bigint;
  resolutionDeadline: bigint;
  status: number; // 0: Open, 1: BettingClosed, 2: Resolved, 3: Cancelled
  outcome: boolean;
  totalYesAmount: bigint;
  totalNoAmount: bigint;
  totalPool: bigint;
  isForked: boolean;
  parentMarketId: bigint;
  revealDeadline: bigint;
}

export interface BetData {
  bettor: string;
  marketId: bigint;
  amount: bigint;
  commitmentHash: Hex;
  revealed: boolean;
  direction: boolean;
  timestamp: bigint;
  claimed: boolean;
}

/**
 * Create a new prediction market
 */
export async function createMarket(
  walletId: string,
  question: string,
  deadline: bigint,
  resolutionDeadline: bigint
): Promise<{ txResult: Awaited<ReturnType<typeof executeAndWait>>; marketId?: bigint }> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.VOID_MARKET_CORE,
    abi,
    functionName: 'createMarket',
    args: [question, deadline, resolutionDeadline],
  };

  const txResult = await executeAndWait(params);

  // TODO: Parse market ID from event logs
  return { txResult };
}

/**
 * Create a forked (private) market from a parent market
 */
export async function createForkedMarket(
  walletId: string,
  parentMarketId: bigint,
  customQuestion: string,
  deadline: bigint,
  resolutionDeadline: bigint
): Promise<{ txResult: Awaited<ReturnType<typeof executeAndWait>>; marketId?: bigint }> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.VOID_MARKET_CORE,
    abi,
    functionName: 'createForkedMarket',
    args: [parentMarketId, customQuestion, deadline, resolutionDeadline],
  };

  const txResult = await executeAndWait(params);
  return { txResult };
}

/**
 * Place a bet on a market (commit phase)
 */
export async function placeBet(
  walletId: string,
  marketId: bigint,
  commitmentHash: Hex,
  amount: bigint
): Promise<{ txResult: Awaited<ReturnType<typeof executeAndWait>>; betId?: bigint }> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.VOID_MARKET_CORE,
    abi,
    functionName: 'placeBet',
    args: [marketId, commitmentHash],
    value: amount,
  };

  const txResult = await executeAndWait(params);
  return { txResult };
}

/**
 * Reveal a bet after market closes
 */
export async function revealBet(
  walletId: string,
  betId: bigint,
  direction: boolean,
  salt: Hex
): Promise<Awaited<ReturnType<typeof executeAndWait>>> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.VOID_MARKET_CORE,
    abi,
    functionName: 'revealBet',
    args: [betId, direction, salt],
  };

  return executeAndWait(params);
}

/**
 * Claim winnings after market resolution
 */
export async function claimWinnings(
  walletId: string,
  betId: bigint
): Promise<Awaited<ReturnType<typeof executeAndWait>>> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.VOID_MARKET_CORE,
    abi,
    functionName: 'claimWinnings',
    args: [betId],
  };

  return executeAndWait(params);
}

/**
 * Resolve a market (admin only)
 */
export async function resolveMarket(
  walletId: string,
  marketId: bigint,
  outcome: boolean
): Promise<Awaited<ReturnType<typeof executeAndWait>>> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.VOID_MARKET_CORE,
    abi,
    functionName: 'resolveMarket',
    args: [marketId, outcome],
  };

  return executeAndWait(params);
}

/**
 * Cancel a market (admin or creator)
 */
export async function cancelMarket(
  walletId: string,
  marketId: bigint
): Promise<Awaited<ReturnType<typeof executeAndWait>>> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.VOID_MARKET_CORE,
    abi,
    functionName: 'cancelMarket',
    args: [marketId],
  };

  return executeAndWait(params);
}

// ============================================================================
// Read Functions (no transaction needed)
// ============================================================================

/**
 * Get market data from chain
 */
export async function getMarket(marketId: bigint): Promise<MarketData> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.VOID_MARKET_CORE as `0x${string}`,
    abi,
    functionName: 'getMarket',
    args: [marketId],
  });

  // Type cast the result
  const market = result as unknown as MarketData;
  return market;
}

/**
 * Get bet data from chain
 */
export async function getBet(betId: bigint): Promise<BetData> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.VOID_MARKET_CORE as `0x${string}`,
    abi,
    functionName: 'getBet',
    args: [betId],
  });

  return result as unknown as BetData;
}

/**
 * Get user's bet IDs for a market
 */
export async function getUserBets(marketId: bigint, userAddress: string): Promise<bigint[]> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.VOID_MARKET_CORE as `0x${string}`,
    abi,
    functionName: 'getUserBets',
    args: [marketId, userAddress],
  });

  return result as bigint[];
}

/**
 * Generate commitment hash on-chain (for verification)
 */
export async function generateCommitmentOnChain(
  direction: boolean,
  salt: Hex
): Promise<Hex> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.VOID_MARKET_CORE as `0x${string}`,
    abi,
    functionName: 'generateCommitment',
    args: [direction, salt],
  });

  return result as Hex;
}
