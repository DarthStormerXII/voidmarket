/**
 * Direct Nova Contract Service (Testing Only)
 *
 * Interacts with NovaManager contract using viem directly
 */

import { publicClients } from '../../config/chains.js';
import { CONTRACT_ADDRESSES } from '../../config/contracts.js';
import { NOVA_MANAGER_ABI } from '../../config/abis.js';
import {
  executeDirectAndWait,
  type DirectContractCallParams,
  type DirectTransactionResult,
} from './transaction.js';
import type { Address, Account } from 'viem';

const abi = NOVA_MANAGER_ABI;
const contractAddress = CONTRACT_ADDRESSES.NOVA_MANAGER as Address;

export interface NovaData {
  id: bigint;
  cluster1Id: bigint;
  cluster2Id: bigint;
  totalRounds: bigint;
  currentRound: bigint;
  status: number; // 0: Pending, 1: Active, 2: Completed, 3: Cancelled
  prizePool: bigint;
  winningClusterId: bigint;
  cluster1TotalPhotons: bigint;
  cluster2TotalPhotons: bigint;
  startedAt: bigint;
  bettingDuration: bigint;
  matchesPerRound: bigint;
}

export interface MatchData {
  id: bigint;
  novaId: bigint;
  round: bigint;
  star1: Address;
  star2: Address;
  marketId: bigint;
  status: number; // 0: Pending, 1: Active, 2: Resolved
  winner: Address;
  star1Photons: bigint;
  star2Photons: bigint;
  bettingDeadline: bigint;
}

export interface RewardData {
  starAddress: Address;
  photonsEarned: bigint;
  usdcReward: bigint;
  claimed: boolean;
}

/**
 * Start a new Nova battle
 */
export async function startNovaDirect(
  cluster1Id: bigint,
  cluster2Id: bigint,
  totalRounds: bigint,
  prizePool: bigint,
  bettingDuration: bigint,
  matchesPerRound: bigint,
  account?: Account
): Promise<{ txResult: DirectTransactionResult; novaId?: bigint }> {
  console.log(`\n  Starting Nova: Cluster ${cluster1Id} vs Cluster ${cluster2Id}`);
  console.log(`    Rounds: ${totalRounds}, Prize Pool: ${prizePool} wei`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'startNova',
    args: [cluster1Id, cluster2Id, totalRounds],
    value: prizePool,
    account,
  };

  const txResult = await executeDirectAndWait(params);
  return { txResult };
}

/**
 * Create a match in a Nova round
 */
export async function createMatchDirect(
  novaId: bigint,
  star1: Address,
  star2: Address,
  account?: Account
): Promise<{ txResult: DirectTransactionResult; matchId?: bigint }> {
  console.log(`\n  Creating match: ${star1} vs ${star2} in Nova ${novaId}`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'createMatch',
    args: [novaId, star1, star2],
    account,
  };

  const txResult = await executeDirectAndWait(params);
  return { txResult };
}

/**
 * Resolve a match
 */
export async function resolveMatchDirect(
  matchId: bigint,
  outcome: boolean, // true = star1 wins, false = star2 wins
  account?: Account
): Promise<DirectTransactionResult> {
  console.log(`\n  Resolving match ${matchId}: ${outcome ? 'star1 wins' : 'star2 wins'}`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'resolveMatch',
    args: [matchId, outcome],
    account,
  };

  return executeDirectAndWait(params);
}

/**
 * Advance to next round
 */
export async function advanceRoundDirect(
  novaId: bigint,
  account?: Account
): Promise<DirectTransactionResult> {
  console.log(`\n  Advancing Nova ${novaId} to next round`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'advanceRound',
    args: [novaId],
    account,
  };

  return executeDirectAndWait(params);
}

/**
 * Claim Nova reward
 */
export async function claimNovaRewardDirect(
  novaId: bigint,
  account?: Account
): Promise<DirectTransactionResult> {
  console.log(`\n  Claiming reward for Nova ${novaId}`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'claimReward',
    args: [novaId],
    account,
  };

  return executeDirectAndWait(params);
}

/**
 * Cancel a Nova
 */
export async function cancelNovaDirect(
  novaId: bigint,
  account?: Account
): Promise<DirectTransactionResult> {
  console.log(`\n  Cancelling Nova ${novaId}`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'cancelNova',
    args: [novaId],
    account,
  };

  return executeDirectAndWait(params);
}

// ============================================================================
// Read Functions
// ============================================================================

/**
 * Get Nova data
 */
export async function getNovaDirect(novaId: bigint): Promise<NovaData> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'novas',
    args: [novaId],
  });

  // Result is an array of values, map to object
  const arr = result as unknown as any[];
  return {
    id: arr[0] as bigint,
    cluster1Id: arr[1] as bigint,
    cluster2Id: arr[2] as bigint,
    totalRounds: arr[3] as bigint,
    currentRound: arr[4] as bigint,
    status: arr[5] as number,
    prizePool: arr[6] as bigint,
    winningClusterId: arr[7] as bigint,
    cluster1TotalPhotons: arr[8] as bigint,
    cluster2TotalPhotons: arr[9] as bigint,
    startedAt: arr[10] as bigint,
    bettingDuration: 0n, // Not in contract storage
    matchesPerRound: 0n, // Not in contract storage
  };
}

/**
 * Get match data
 */
export async function getMatchDirect(matchId: bigint): Promise<MatchData> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'matches',
    args: [matchId],
  });

  // Result is an array of values, map to object
  const arr = result as unknown as any[];
  return {
    id: arr[0] as bigint,
    novaId: arr[1] as bigint,
    round: arr[2] as bigint,
    star1: arr[3] as Address,
    star2: arr[4] as Address,
    marketId: arr[5] as bigint,
    status: arr[6] as number,
    winner: arr[7] as Address,
    star1Photons: arr[8] as bigint,
    star2Photons: arr[9] as bigint,
    bettingDeadline: arr[10] as bigint,
  };
}

/**
 * Get Nova matches
 */
export async function getNovaMatchesDirect(novaId: bigint): Promise<bigint[]> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'getNovaMatches',
    args: [novaId],
  });

  return result as bigint[];
}

/**
 * Get reward info for a star
 */
export async function getRewardDirect(novaId: bigint, starAddress: Address): Promise<RewardData> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'getReward',
    args: [novaId, starAddress],
  });

  return result as unknown as RewardData;
}
