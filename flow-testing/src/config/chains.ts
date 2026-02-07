/**
 * Chain Configurations for VoidMarket
 *
 * Arc Testnet is the primary settlement layer where:
 * - USDC is the native gas token (18 decimals native, 6 decimals ERC20 interface)
 * - All contracts are deployed
 * - Users deposit from other chains via Circle CCTP
 */

import { defineChain, http, createPublicClient, type Chain } from 'viem';
import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import 'dotenv/config';

// Arc Testnet chain definition
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18, // Native balance decimals
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});

// Arc Testnet constants
export const ARC_CONSTANTS = {
  CHAIN_ID: 5042002,
  MIN_GAS_PRICE: 160_000_000_000n, // 160 Gwei (~$0.01 per tx)
  NATIVE_DECIMALS: 18, // Balance decimals
  ERC20_DECIMALS: 6, // Standard USDC interface
  FAUCET_URL: 'https://faucet.testnet.arc.network',
  // Common contracts
  CREATE2_FACTORY: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
  MULTICALL3: '0xcA11bde05977b3631167028862bE2a173976CA11',
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
} as const;

// Check if chain is Arc
export function isArcChain(chainId: number): boolean {
  return chainId === ARC_CONSTANTS.CHAIN_ID;
}

// Chain configurations
export const chains = {
  arcTestnet,
  sepolia,
  baseSepolia,
  arbitrumSepolia,
} as const;

// Export Arc Testnet chain for wallet client creation
export const ARC_TESTNET_CHAIN = arcTestnet;

// Chain IDs
export const CHAIN_IDS = {
  ARC_TESTNET: 5042002,
  SEPOLIA: 11155111,
  BASE_SEPOLIA: 84532,
  ARBITRUM_SEPOLIA: 421614,
} as const;

// RPC URLs from environment
export const rpcUrls = {
  arcTestnet: process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network',
  sepolia: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.public.blastapi.io',
  baseSepolia: process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia.public.blastapi.io',
  arbitrumSepolia: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
};

// Public client type
type PublicClient = ReturnType<typeof createPublicClient<any, any>>;

// Public clients for reading from chains
const arcClient = createPublicClient({
  chain: arcTestnet,
  transport: http(rpcUrls.arcTestnet),
});

const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrls.sepolia),
});

const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(rpcUrls.baseSepolia),
});

const arbSepoliaClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(rpcUrls.arbitrumSepolia),
});

export const publicClients: { [key: string]: PublicClient } = {
  arcTestnet: arcClient,
  sepolia: sepoliaClient,
  baseSepolia: baseSepoliaClient,
  arbitrumSepolia: arbSepoliaClient,
};

// CCTP supported chains (Circle Cross-Chain Transfer Protocol)
export const CCTP_CHAINS = {
  sepolia: {
    domainId: 0,
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  },
  baseSepolia: {
    domainId: 6,
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  },
  arcTestnet: {
    domainId: 26,
    usdc: null, // Native USDC - no special address
    tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  },
} as const;

// Check if chain supports CCTP
export function isCCTPSupported(chainId: number): boolean {
  const supportedChainIds: number[] = [
    CHAIN_IDS.SEPOLIA,
    CHAIN_IDS.BASE_SEPOLIA,
    CHAIN_IDS.ARC_TESTNET,
  ];
  return supportedChainIds.includes(chainId);
}

// Get chain name from chain ID
export function getChainName(chainId: number): string {
  switch (chainId) {
    case CHAIN_IDS.ARC_TESTNET:
      return 'Arc Testnet';
    case CHAIN_IDS.SEPOLIA:
      return 'Sepolia';
    case CHAIN_IDS.BASE_SEPOLIA:
      return 'Base Sepolia';
    case CHAIN_IDS.ARBITRUM_SEPOLIA:
      return 'Arbitrum Sepolia';
    default:
      return 'Unknown Chain';
  }
}

// Get explorer URL for transaction
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  switch (chainId) {
    case CHAIN_IDS.ARC_TESTNET:
      return `https://testnet.arcscan.app/tx/${txHash}`;
    case CHAIN_IDS.SEPOLIA:
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    case CHAIN_IDS.BASE_SEPOLIA:
      return `https://sepolia.basescan.org/tx/${txHash}`;
    case CHAIN_IDS.ARBITRUM_SEPOLIA:
      return `https://sepolia.arbiscan.io/tx/${txHash}`;
    default:
      return `Unknown chain: ${txHash}`;
  }
}

// Get explorer URL for address
export function getExplorerAddressUrl(chainId: number, address: string): string {
  switch (chainId) {
    case CHAIN_IDS.ARC_TESTNET:
      return `https://testnet.arcscan.app/address/${address}`;
    case CHAIN_IDS.SEPOLIA:
      return `https://sepolia.etherscan.io/address/${address}`;
    case CHAIN_IDS.BASE_SEPOLIA:
      return `https://sepolia.basescan.org/address/${address}`;
    case CHAIN_IDS.ARBITRUM_SEPOLIA:
      return `https://sepolia.arbiscan.io/address/${address}`;
    default:
      return `Unknown chain: ${address}`;
  }
}
