/**
 * Cluster Contract Service
 *
 * Interacts with ClusterManager contract for team management
 */

import { publicClients } from '../../config/chains.js';
import { CONTRACT_ADDRESSES, CLUSTER_MANAGER_ABI } from '../../config/contracts.js';
import { executeAndWait, type ContractCallParams } from '../circle/transaction.js';
import type { Hex } from 'viem';

// Use human-readable ABI directly
const abi = CLUSTER_MANAGER_ABI as any;

export interface ClusterData {
  id: bigint;
  name: string;
  leader: string;
  energy: bigint;
  novasWon: bigint;
  totalNovas: bigint;
  isPrivate: boolean;
  memberCount: bigint;
  maxMembers: bigint;
  createdAt: bigint;
}

export interface MemberData {
  memberAddress: string;
  clusterId: bigint;
  photons: bigint;
  joinedAt: bigint;
  isActive: boolean;
}

/**
 * Create a new cluster
 */
export async function createCluster(
  walletId: string,
  name: string,
  isPrivate: boolean
): Promise<{ txResult: Awaited<ReturnType<typeof executeAndWait>>; clusterId?: bigint }> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.CLUSTER_MANAGER,
    abi,
    functionName: 'createCluster',
    args: [name, isPrivate],
  };

  const txResult = await executeAndWait(params);
  return { txResult };
}

/**
 * Generate an invite code for a cluster
 */
export async function inviteToCluster(
  walletId: string,
  clusterId: bigint,
  inviteeAddress: string
): Promise<{ txResult: Awaited<ReturnType<typeof executeAndWait>>; inviteCode?: Hex }> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.CLUSTER_MANAGER,
    abi,
    functionName: 'inviteToCluster',
    args: [clusterId, inviteeAddress],
  };

  const txResult = await executeAndWait(params);
  return { txResult };
}

/**
 * Join a cluster using an invite code
 */
export async function joinCluster(
  walletId: string,
  clusterId: bigint,
  inviteCode: Hex
): Promise<Awaited<ReturnType<typeof executeAndWait>>> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.CLUSTER_MANAGER,
    abi,
    functionName: 'joinCluster',
    args: [clusterId, inviteCode],
  };

  return executeAndWait(params);
}

/**
 * Leave current cluster
 */
export async function leaveCluster(
  walletId: string
): Promise<Awaited<ReturnType<typeof executeAndWait>>> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.CLUSTER_MANAGER,
    abi,
    functionName: 'leaveCluster',
    args: [],
  };

  return executeAndWait(params);
}

/**
 * Transfer cluster leadership
 */
export async function transferLeadership(
  walletId: string,
  clusterId: bigint,
  newLeader: string
): Promise<Awaited<ReturnType<typeof executeAndWait>>> {
  const params: ContractCallParams = {
    walletId,
    contractAddress: CONTRACT_ADDRESSES.CLUSTER_MANAGER,
    abi,
    functionName: 'transferLeadership',
    args: [clusterId, newLeader],
  };

  return executeAndWait(params);
}

// ============================================================================
// Read Functions
// ============================================================================

/**
 * Get cluster data from chain
 */
export async function getCluster(clusterId: bigint): Promise<ClusterData> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.CLUSTER_MANAGER as `0x${string}`,
    abi,
    functionName: 'getCluster',
    args: [clusterId],
  });

  return result as unknown as ClusterData;
}

/**
 * Get member data from chain
 */
export async function getMember(memberAddress: string): Promise<MemberData> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.CLUSTER_MANAGER as `0x${string}`,
    abi,
    functionName: 'getMember',
    args: [memberAddress],
  });

  return result as unknown as MemberData;
}

/**
 * Get all members of a cluster
 */
export async function getClusterMembers(clusterId: bigint): Promise<string[]> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.CLUSTER_MANAGER as `0x${string}`,
    abi,
    functionName: 'getClusterMembers',
    args: [clusterId],
  });

  return result as string[];
}

/**
 * Check if address is member of cluster
 */
export async function isMemberOf(
  memberAddress: string,
  clusterId: bigint
): Promise<boolean> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.CLUSTER_MANAGER as `0x${string}`,
    abi,
    functionName: 'isMemberOf',
    args: [memberAddress, clusterId],
  });

  return result as boolean;
}

/**
 * Get total photons for a cluster
 */
export async function getClusterTotalPhotons(clusterId: bigint): Promise<bigint> {
  const result = await publicClients.arcTestnet.readContract({
    address: CONTRACT_ADDRESSES.CLUSTER_MANAGER as `0x${string}`,
    abi,
    functionName: 'getClusterTotalPhotons',
    args: [clusterId],
  });

  return result as bigint;
}
