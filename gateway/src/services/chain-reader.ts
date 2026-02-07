/**
 * Chain Reader Service
 *
 * Typed on-chain read functions for enriching ENS resolution with live data.
 * Each function returns null on error for graceful degradation.
 */

import { formatUnits } from "viem";
import {
  publicClient,
  VOIDMARKET_CORE_ADDRESS,
  CLUSTER_MANAGER_ADDRESS,
} from "./arc-client.js";
import { voidMarketCoreAbi, clusterManagerAbi } from "./abis.js";

const STATUS_MAP: Record<number, string> = {
  0: "active",
  1: "resolved",
  2: "cancelled",
};

export interface MarketChainData {
  question: string;
  creator: string;
  status: string;
  outcome: boolean;
  totalPool: string;
  totalYesAmount: string;
  totalNoAmount: string;
  totalBets: number;
  deadline: number;
  resolutionDeadline: number;
}

export interface ClusterChainData {
  name: string;
  leader: string;
  energy: number;
  novasWon: number;
  totalNovas: number;
  memberCount: number;
  totalPhotons: string;
}

export interface StarChainData {
  clusterId: number;
  photons: string;
  isActive: boolean;
}

/**
 * Get market data from on-chain
 */
export async function getMarketFromChain(
  marketId: number
): Promise<MarketChainData | null> {
  try {
    const [marketResult, betsResult] = await Promise.all([
      publicClient.readContract({
        address: VOIDMARKET_CORE_ADDRESS,
        abi: voidMarketCoreAbi,
        functionName: "getMarket",
        args: [BigInt(marketId)],
      }),
      publicClient.readContract({
        address: VOIDMARKET_CORE_ADDRESS,
        abi: voidMarketCoreAbi,
        functionName: "getMarketBets",
        args: [BigInt(marketId)],
      }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = marketResult as any;
    const betIds = betsResult as bigint[];

    return {
      question: m.question,
      creator: m.creator,
      status: STATUS_MAP[Number(m.status)] || "active",
      outcome: m.outcome,
      totalPool: formatUnits(m.totalPool, 18),
      totalYesAmount: formatUnits(m.totalYesAmount, 18),
      totalNoAmount: formatUnits(m.totalNoAmount, 18),
      totalBets: betIds.length,
      deadline: Number(m.deadline),
      resolutionDeadline: Number(m.resolutionDeadline),
    };
  } catch (err) {
    console.error(
      `[chain-reader] getMarketFromChain(${marketId}) failed:`,
      err
    );
    return null;
  }
}

/**
 * Get cluster data from on-chain
 */
export async function getClusterFromChain(
  clusterId: number
): Promise<ClusterChainData | null> {
  try {
    const [clusterResult, photonsResult] = await Promise.all([
      publicClient.readContract({
        address: CLUSTER_MANAGER_ADDRESS,
        abi: clusterManagerAbi,
        functionName: "getCluster",
        args: [BigInt(clusterId)],
      }),
      publicClient.readContract({
        address: CLUSTER_MANAGER_ADDRESS,
        abi: clusterManagerAbi,
        functionName: "getClusterTotalPhotons",
        args: [BigInt(clusterId)],
      }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = clusterResult as any;

    return {
      name: c.name,
      leader: c.leader,
      energy: Number(c.energy),
      novasWon: Number(c.novasWon),
      totalNovas: Number(c.totalNovas),
      memberCount: Number(c.memberCount),
      totalPhotons: formatUnits(photonsResult as bigint, 0),
    };
  } catch (err) {
    console.error(
      `[chain-reader] getClusterFromChain(${clusterId}) failed:`,
      err
    );
    return null;
  }
}

/**
 * Get star (member) data from on-chain by address
 */
export async function getStarFromChain(
  address: string
): Promise<StarChainData | null> {
  try {
    const result = await publicClient.readContract({
      address: CLUSTER_MANAGER_ADDRESS,
      abi: clusterManagerAbi,
      functionName: "getMember",
      args: [address as `0x${string}`],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = result as any;

    return {
      clusterId: Number(m.clusterId),
      photons: formatUnits(m.photons, 0),
      isActive: m.isActive,
    };
  } catch (err) {
    console.error(`[chain-reader] getStarFromChain(${address}) failed:`, err);
    return null;
  }
}
