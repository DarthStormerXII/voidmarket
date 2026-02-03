/**
 * Nova Contract Service
 *
 * Interacts with NovaManager contract for cluster battles
 */

import { publicClients } from '../../config/chains.js';
import { CONTRACT_ADDRESSES, NOVA_MANAGER_ABI } from '../../config/contracts.js';
import { executeAndWait, type ContractCallParams } from '../circle/transaction.js';

// Use human-readable ABI directly
const abi = NOVA_MANAGER_ABI as any;

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
  star1: string;
  star2: string;
  marketId: bigint;
  status: number; // 0: Pending, 1: Betting, 2: Resolved
  winner: string;
  star1Photons: bigint;
  star2Photons: bigint;
  bettingDeadline: bigint;
}

export interface RewardData {
  starAddress: string;
  photonsEarned: bigint;
  usdcReward: bigint;
  claimed: boolean;
}

/**
 * Start a new Nova battle between two clusters
 */
export async function startNova(
  walletId: string,
  cluster1Id: bigint,
  cluster2Id: bigint,
  totalRounds: bigint,
  prizePool: bigint
): Promise<{ txResult: Awaited<ReturnType<typeof executeAndWait>>; novaId?: bigint }> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.NOVA_MANAGER,
    abi,
    functionName: 'startNova',
    args: [cluster1Id, cluster2Id, totalRounds],
    value: prizePool,
  };

  const txResult = await executeAndWait(params);
  return { txResult };
}

/**
 * Create a match within a Nova
 */
export async function createMatch(
  walletId: string,
  novaId: bigint,
  star1: string,
  star2: string
): Promise<{ txResult: Awaited<ReturnType<typeof executeAndWait>>; matchId?: bigint }> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.NOVA_MANAGER,
    abi,
    functionName: 'createMatch',
    args: [novaId, star1, star2],
  };

  const txResult = await executeAndWait(params);
  return { txResult };
}

/**
 * Resolve a match and determine winner
 */
export async function resolveMatch(
  walletId: string,
  matchId: bigint,
  outcome: boolean // true = star1 wins, false = star2 wins
): Promise<Awaited<ReturnType<typeof executeAndWait>>> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.NOVA_MANAGER,
    abi,
    functionName: 'resolveMatch',
    args: [matchId, outcome],
  };

  return executeAndWait(params);
}

/**
 * Advance Nova to next round after all matches in current round are resolved
 */
export async function advanceRound(
  walletId: string,
  novaId: bigint
): Promise<Awaited<ReturnType<typeof executeAndWait>>> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.NOVA_MANAGER,
    abi,
    functionName: 'advanceRound',
    args: [novaId],
  };

  return executeAndWait(params);
}

/**
 * Claim reward after Nova completion
 */
export async function claimReward(
  walletId: string,
  novaId: bigint
): Promise<Awaited<ReturnType<typeof executeAndWait>>> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.NOVA_MANAGER,
    abi,
    functionName: 'claimReward',
    args: [novaId],
  };

  return executeAndWait(params);
}

/**
 * Cancel a Nova (before it starts or if issues arise)
 */
export async function cancelNova(
  walletId: string,
  novaId: bigint
): Promise<Awaited<ReturnType<typeof executeAndWait>>> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.NOVA_MANAGER,
    abi,
    functionName: 'cancelNova',
    args: [novaId],
  };

  return executeAndWait(params);
}

// ============================================================================
// Read Functions
// ============================================================================

/**
 * Get Nova data from chain
 */
export async function getNova(novaId: bigint): Promise<NovaData> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.NOVA_MANAGER as `0x${string}`,
    abi,
    functionName: 'getNova',
    args: [novaId],
  });

  return result as unknown as NovaData;
}

/**
 * Get match data from chain
 */
export async function getMatch(matchId: bigint): Promise<MatchData> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.NOVA_MANAGER as `0x${string}`,
    abi,
    functionName: 'getMatch',
    args: [matchId],
  });

  return result as unknown as MatchData;
}

/**
 * Get all match IDs for a Nova
 */
export async function getNovaMatches(novaId: bigint): Promise<bigint[]> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.NOVA_MANAGER as `0x${string}`,
    abi,
    functionName: 'getNovaMatches',
    args: [novaId],
  });

  return result as bigint[];
}

/**
 * Get reward data for a star in a Nova
 */
export async function getReward(novaId: bigint, starAddress: string): Promise<RewardData> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.NOVA_MANAGER as `0x${string}`,
    abi,
    functionName: 'getReward',
    args: [novaId, starAddress],
  });

  return result as unknown as RewardData;
}
