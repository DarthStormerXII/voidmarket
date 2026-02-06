/**
 * Cluster Service — On-chain reads for ClusterManager
 */

import { publicClient, CLUSTER_MANAGER_ADDRESS } from './client';
import { clusterManagerAbi } from './abis';

export interface OnChainCluster {
  id: number;
  name: string;
  leader: string;
  energy: number;
  novasWon: number;
  totalNovas: number;
  isPrivate: boolean;
  memberCount: number;
  maxMembers: number;
  createdAt: number;
}

export interface OnChainMember {
  memberAddress: string;
  clusterId: number;
  photons: number;
  joinedAt: number;
  isActive: boolean;
}

/**
 * Get total cluster count
 */
export async function getClusterCount(): Promise<number> {
  const count = await publicClient.readContract({
    address: CLUSTER_MANAGER_ADDRESS,
    abi: clusterManagerAbi,
    functionName: 'clusterCount',
  });
  return Number(count);
}

/**
 * Get a single cluster by ID
 */
export async function getClusterById(clusterId: number): Promise<OnChainCluster> {
  const result = await publicClient.readContract({
    address: CLUSTER_MANAGER_ADDRESS,
    abi: clusterManagerAbi,
    functionName: 'getCluster',
    args: [BigInt(clusterId)],
  });

  return mapCluster(result);
}

/**
 * Get all clusters via multicall
 */
export async function getAllClusters(): Promise<OnChainCluster[]> {
  const count = await getClusterCount();
  if (count === 0) return [];

  const calls = Array.from({ length: count }, (_, i) => ({
    address: CLUSTER_MANAGER_ADDRESS,
    abi: clusterManagerAbi,
    functionName: 'getCluster' as const,
    args: [BigInt(i + 1)],
  }));

  const results = await publicClient.multicall({ contracts: calls });

  return results
    .filter((r) => r.status === 'success')
    .map((r) => mapCluster(r.result as any));
}

/**
 * Get member details for a specific address
 */
export async function getMemberByAddress(address: string): Promise<OnChainMember> {
  const result = await publicClient.readContract({
    address: CLUSTER_MANAGER_ADDRESS,
    abi: clusterManagerAbi,
    functionName: 'getMember',
    args: [address as `0x${string}`],
  });

  return mapMember(result);
}

/**
 * Get all member addresses for a cluster
 */
export async function getClusterMemberAddresses(clusterId: number): Promise<string[]> {
  const addresses = await publicClient.readContract({
    address: CLUSTER_MANAGER_ADDRESS,
    abi: clusterManagerAbi,
    functionName: 'getClusterMembers',
    args: [BigInt(clusterId)],
  });
  return addresses as string[];
}

/**
 * Get detailed member info for all members of a cluster
 */
export async function getClusterMemberDetails(clusterId: number): Promise<OnChainMember[]> {
  const result = await publicClient.readContract({
    address: CLUSTER_MANAGER_ADDRESS,
    abi: clusterManagerAbi,
    functionName: 'getClusterMemberDetails',
    args: [BigInt(clusterId)],
  });

  return (result as any[]).map(mapMember);
}

/**
 * Get total photons for a cluster
 */
export async function getClusterTotalPhotons(clusterId: number): Promise<number> {
  const total = await publicClient.readContract({
    address: CLUSTER_MANAGER_ADDRESS,
    abi: clusterManagerAbi,
    functionName: 'getClusterTotalPhotons',
    args: [BigInt(clusterId)],
  });
  return Number(total);
}

// ─── Helpers ────────────────────────────────────────────────

function mapCluster(raw: any): OnChainCluster {
  return {
    id: Number(raw.id),
    name: raw.name,
    leader: raw.leader,
    energy: Number(raw.energy),
    novasWon: Number(raw.novasWon),
    totalNovas: Number(raw.totalNovas),
    isPrivate: raw.isPrivate,
    memberCount: Number(raw.memberCount),
    maxMembers: Number(raw.maxMembers),
    createdAt: Number(raw.createdAt),
  };
}

function mapMember(raw: any): OnChainMember {
  return {
    memberAddress: raw.memberAddress,
    clusterId: Number(raw.clusterId),
    photons: Number(raw.photons),
    joinedAt: Number(raw.joinedAt),
    isActive: raw.isActive,
  };
}
