/**
 * Viem Public Client for Arc Testnet
 *
 * Arc Chain uses native USDC (18 decimals) as gas token.
 */

import { createPublicClient, http, defineChain } from 'viem';

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.ARC_RPC_URL || 'https://rpc-testnet.arc.circle.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://explorer-testnet.arc.circle.com',
    },
  },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(process.env.ARC_RPC_URL || 'https://rpc-testnet.arc.circle.com'),
});

// Contract addresses from environment
export const VOIDMARKET_CORE_ADDRESS = (process.env.VOIDMARKET_CORE_ADDRESS || '0x0') as `0x${string}`;
export const CLUSTER_MANAGER_ADDRESS = (process.env.CLUSTER_MANAGER_ADDRESS || '0x0') as `0x${string}`;
export const NOVA_MANAGER_ADDRESS = (process.env.NOVA_MANAGER_ADDRESS || '0x0') as `0x${string}`;
