/**
 * Direct Market Contract Service (Testing Only)
 *
 * Interacts with VoidMarketCore contract using viem directly
 */

import { publicClients } from '../../config/chains.js';
import { CONTRACT_ADDRESSES } from '../../config/contracts.js';
import { VOID_MARKET_CORE_ABI } from '../../config/abis.js';
import {
  executeDirectAndWait,
  getTestAccountAddress,
  type DirectContractCallParams,
  type DirectTransactionResult,
} from './transaction.js';
import type { Hex, Address, Account } from 'viem';

const abi = VOID_MARKET_CORE_ABI;
const contractAddress = CONTRACT_ADDRESSES.VOID_MARKET_CORE as Address;

export interface MarketData {
  id: bigint;
  question: string;
  creator: string;
  deadline: bigint;
  resolutionDeadline: bigint;
  status: number;
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
export async function createMarketDirect(
  question: string,
  deadline: bigint,
  resolutionDeadline: bigint,
  account?: Account
): Promise<{ txResult: DirectTransactionResult; marketId?: bigint }> {
  console.log(`\n  Creating market: "${question.substring(0, 50)}..."`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'createMarket',
    args: [question, deadline, resolutionDeadline],
    account,
  };

  const txResult = await executeDirectAndWait(params);
  return { txResult };
}

/**
 * Create a forked market
 */
export async function createForkedMarketDirect(
  parentMarketId: bigint,
  customQuestion: string,
  deadline: bigint,
  resolutionDeadline: bigint,
  account?: Account
): Promise<{ txResult: DirectTransactionResult; marketId?: bigint }> {
  console.log(`\n  Creating forked market from parent ${parentMarketId}`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'createForkedMarket',
    args: [parentMarketId, customQuestion, deadline, resolutionDeadline],
    account,
  };

  const txResult = await executeDirectAndWait(params);
  return { txResult };
}

/**
 * Place a bet on a market
 */
export async function placeBetDirect(
  marketId: bigint,
  commitmentHash: Hex,
  amount: bigint,
  account?: Account
): Promise<{ txResult: DirectTransactionResult; betId?: bigint }> {
  console.log(`\n  Placing bet on market ${marketId} with ${amount} wei`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'placeBet',
    args: [marketId, commitmentHash],
    value: amount,
    account,
  };

  const txResult = await executeDirectAndWait(params);
  return { txResult };
}

/**
 * Reveal a bet
 */
export async function revealBetDirect(
  betId: bigint,
  direction: boolean,
  salt: Hex,
  account?: Account
): Promise<DirectTransactionResult> {
  console.log(`\n  Revealing bet ${betId}, direction: ${direction ? 'YES' : 'NO'}`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'revealBet',
    args: [betId, direction, salt],
    account,
  };

  return executeDirectAndWait(params);
}

/**
 * Claim winnings
 */
export async function claimWinningsDirect(
  betId: bigint,
  account?: Account
): Promise<DirectTransactionResult> {
  console.log(`\n  Claiming winnings for bet ${betId}`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'claimWinnings',
    args: [betId],
    account,
  };

  return executeDirectAndWait(params);
}

/**
 * Resolve a market (admin only)
 */
export async function resolveMarketDirect(
  marketId: bigint,
  outcome: boolean,
  account?: Account
): Promise<DirectTransactionResult> {
  console.log(`\n  Resolving market ${marketId} with outcome: ${outcome ? 'YES' : 'NO'}`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'resolveMarket',
    args: [marketId, outcome],
    account,
  };

  return executeDirectAndWait(params);
}

/**
 * Cancel a market
 */
export async function cancelMarketDirect(
  marketId: bigint,
  account?: Account
): Promise<DirectTransactionResult> {
  console.log(`\n  Cancelling market ${marketId}`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'cancelMarket',
    args: [marketId],
    account,
  };

  return executeDirectAndWait(params);
}

// ============================================================================
// Read Functions
// ============================================================================

/**
 * Get market data
 */
export async function getMarketDirect(marketId: bigint): Promise<MarketData> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'markets',
    args: [marketId],
  });

  // Result is an array of values, map to object
  const arr = result as unknown as any[];
  return {
    id: arr[0] as bigint,
    question: arr[1] as string,
    creator: arr[2] as string,
    deadline: arr[3] as bigint,
    resolutionDeadline: arr[4] as bigint,
    status: arr[5] as number,
    outcome: arr[6] as boolean,
    totalYesAmount: arr[7] as bigint,
    totalNoAmount: arr[8] as bigint,
    totalPool: arr[9] as bigint,
    isForked: arr[10] as boolean,
    parentMarketId: arr[11] as bigint,
    revealDeadline: arr[12] as bigint,
  };
}

/**
 * Get bet data
 */
export async function getBetDirect(betId: bigint): Promise<BetData> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'bets',
    args: [betId],
  });

  // Result is an array of values, map to object
  const arr = result as unknown as any[];
  return {
    bettor: arr[0] as string,
    marketId: arr[1] as bigint,
    amount: arr[2] as bigint,
    commitmentHash: arr[3] as Hex,
    revealed: arr[4] as boolean,
    direction: arr[5] as boolean,
    timestamp: arr[6] as bigint,
    claimed: arr[7] as boolean,
  };
}

/**
 * Get user bets for a market
 */
export async function getUserBetsDirect(marketId: bigint, userAddress: Address): Promise<bigint[]> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'getUserBets',
    args: [marketId, userAddress],
  });

  return result as bigint[];
}

/**
 * Generate commitment hash on-chain
 */
export async function generateCommitmentOnChainDirect(direction: boolean, salt: Hex): Promise<Hex> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'generateCommitment',
    args: [direction, salt],
  });

  return result as Hex;
}

/**
 * Get total market count (estimate by reading market 0)
 */
export async function getMarketCount(): Promise<bigint> {
  // Try to read markets starting from 1 until we get an error
  let count = 0n;
  try {
    for (let i = 1n; i <= 100n; i++) {
      await getMarketDirect(i);
      count = i;
    }
  } catch {
    // Market doesn't exist, we've found the count
  }
  return count;
}
