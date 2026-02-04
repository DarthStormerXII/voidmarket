/**
 * Direct Cluster Contract Service (Testing Only)
 *
 * Interacts with ClusterManager contract using viem directly
 */

import { publicClients } from '../../config/chains.js';
import { CONTRACT_ADDRESSES } from '../../config/contracts.js';
import { CLUSTER_MANAGER_ABI } from '../../config/abis.js';
import {
  executeDirectAndWait,
  type DirectContractCallParams,
  type DirectTransactionResult,
} from './transaction.js';
import type { Address, Account, Hex } from 'viem';

const abi = CLUSTER_MANAGER_ABI;
const contractAddress = CONTRACT_ADDRESSES.CLUSTER_MANAGER as Address;

export interface ClusterData {
  id: bigint;
  name: string;
  leader: Address;
  energy: bigint;
  novasWon: bigint;
  totalNovas: bigint;
  isPrivate: boolean;
  memberCount: bigint;
  maxMembers: bigint;
  createdAt: bigint;
}

export interface MemberData {
  memberAddress: Address;
  clusterId: bigint;
  photons: bigint;
  joinedAt: bigint;
  isActive: boolean;
}

/**
 * Create a new cluster
 */
export async function createClusterDirect(
  name: string,
  isPrivate: boolean,
  account?: Account
): Promise<{ txResult: DirectTransactionResult; clusterId?: bigint }> {
  console.log(`\n  Creating cluster: "${name}" (${isPrivate ? 'private' : 'public'})`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'createCluster',
    args: [name, isPrivate],
    account,
  };

  const txResult = await executeDirectAndWait(params);
  return { txResult };
}

/**
 * Invite a user to a cluster
 */
export async function inviteToClusterDirect(
  clusterId: bigint,
  inviteeAddress: Address,
  account?: Account
): Promise<{ txResult: DirectTransactionResult; inviteCode?: Hex }> {
  console.log(`\n  Inviting ${inviteeAddress} to cluster ${clusterId}`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'inviteToCluster',
    args: [clusterId, inviteeAddress],
    account,
  };

  const txResult = await executeDirectAndWait(params);
  return { txResult };
}

/**
 * Join a cluster with invite code
 */
export async function joinClusterDirect(
  clusterId: bigint,
  inviteCode: Hex,
  account?: Account
): Promise<DirectTransactionResult> {
  console.log(`\n  Joining cluster ${clusterId}`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'joinCluster',
    args: [clusterId, inviteCode],
    account,
  };

  return executeDirectAndWait(params);
}

/**
 * Leave current cluster
 */
export async function leaveClusterDirect(account?: Account): Promise<DirectTransactionResult> {
  console.log(`\n  Leaving cluster`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'leaveCluster',
    args: [],
    account,
  };

  return executeDirectAndWait(params);
}

/**
 * Transfer cluster leadership
 */
export async function transferLeadershipDirect(
  clusterId: bigint,
  newLeader: Address,
  account?: Account
): Promise<DirectTransactionResult> {
  console.log(`\n  Transferring leadership of cluster ${clusterId} to ${newLeader}`);

  const params: DirectContractCallParams = {
    contractAddress,
    abi,
    functionName: 'transferLeadership',
    args: [clusterId, newLeader],
    account,
  };

  return executeDirectAndWait(params);
}

// ============================================================================
// Read Functions
// ============================================================================

/**
 * Get cluster data
 */
export async function getClusterDirect(clusterId: bigint): Promise<ClusterData> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'clusters',
    args: [clusterId],
  });

  // Result is an array of values, map to object
  const arr = result as unknown as any[];
  return {
    id: arr[0] as bigint,
    name: arr[1] as string,
    leader: arr[2] as Address,
    energy: arr[3] as bigint,
    novasWon: arr[4] as bigint,
    totalNovas: arr[5] as bigint,
    isPrivate: arr[6] as boolean,
    memberCount: arr[7] as bigint,
    maxMembers: arr[8] as bigint,
    createdAt: arr[9] as bigint,
  };
}

/**
 * Get member data
 */
export async function getMemberDirect(memberAddress: Address): Promise<MemberData> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'members',
    args: [memberAddress],
  });

  // Result is an array of values, map to object
  const arr = result as unknown as any[];
  return {
    memberAddress: arr[0] as Address,
    clusterId: arr[1] as bigint,
    photons: arr[2] as bigint,
    joinedAt: arr[3] as bigint,
    isActive: arr[4] as boolean,
  };
}

/**
 * Get cluster members
 */
export async function getClusterMembersDirect(clusterId: bigint): Promise<Address[]> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'getClusterMembers',
    args: [clusterId],
  });

  return result as Address[];
}

/**
 * Check if address is member of cluster
 */
export async function isMemberOfDirect(memberAddress: Address, clusterId: bigint): Promise<boolean> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'isMemberOf',
    args: [memberAddress, clusterId],
  });

  return result as boolean;
}

/**
 * Get cluster total photons
 */
export async function getClusterTotalPhotonsDirect(clusterId: bigint): Promise<bigint> {
  const result = await publicClients.arcTestnet.readContract({
    address: contractAddress,
    abi,
    functionName: 'getClusterTotalPhotons',
    args: [clusterId],
  });

  return result as bigint;
}
