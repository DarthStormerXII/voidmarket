/**
 * Circle SDK Client Configuration
 *
 * Initializes the Circle Developer-Controlled Wallets SDK
 * for creating and managing user wallets on Arc Testnet
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import 'dotenv/config';

// Check if Circle credentials are configured
export const hasCircleCredentials = !!(
  process.env.CIRCLE_API_KEY &&
  process.env.CIRCLE_ENTITY_SECRET
);

// Initialize Circle SDK client (lazy - only when credentials available)
let _circleClient: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;

export function getCircleClient() {
  if (!_circleClient) {
    if (!hasCircleCredentials) {
      throw new Error('Circle credentials not configured. Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET.');
    }
    _circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    });
  }
  return _circleClient;
}

// Legacy export for backward compatibility (throws if not configured)
export const circleClient = hasCircleCredentials
  ? initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    })
  : (null as any);

// Circle configuration with all 9 supported testnet chains
export const CIRCLE_CONFIG = {
  // Blockchain identifiers in Circle
  ARC_TESTNET_BLOCKCHAIN: 'ARC-TESTNET',
  ETH_SEPOLIA_BLOCKCHAIN: 'ETH-SEPOLIA',
  BASE_SEPOLIA_BLOCKCHAIN: 'BASE-SEPOLIA',
  AVALANCHE_FUJI_BLOCKCHAIN: 'AVALANCHE-FUJI',
  SONIC_TESTNET_BLOCKCHAIN: 'SONIC-TESTNET',
  WORLD_CHAIN_SEPOLIA_BLOCKCHAIN: 'WORLD-CHAIN-SEPOLIA',
  SEI_ATLANTIC_BLOCKCHAIN: 'SEI-ATLANTIC',
  HYPEREVM_TESTNET_BLOCKCHAIN: 'HYPEREVM-TESTNET',
  SOLANA_DEVNET_BLOCKCHAIN: 'SOLANA-DEVNET',

  // All supported chains for multi-chain wallets (EVM only for Circle wallets)
  SUPPORTED_BLOCKCHAINS: [
    'ARC-TESTNET',
    'ETH-SEPOLIA',
    'BASE-SEPOLIA',
    'AVALANCHE-FUJI',
    'SONIC-TESTNET',
    'WORLD-CHAIN-SEPOLIA',
    'SEI-ATLANTIC',
    'HYPEREVM-TESTNET',
  ] as const,

  // All Gateway-supported chains (includes Solana)
  ALL_GATEWAY_CHAINS: [
    'ARC-TESTNET',
    'ETH-SEPOLIA',
    'BASE-SEPOLIA',
    'AVALANCHE-FUJI',
    'SONIC-TESTNET',
    'WORLD-CHAIN-SEPOLIA',
    'SEI-ATLANTIC',
    'HYPEREVM-TESTNET',
    'SOLANA-DEVNET',
  ] as const,

  // Primary chain for VoidMarket operations
  PRIMARY_BLOCKCHAIN: 'ARC-TESTNET',

  // Wallet set ID (created via Circle Console or API)
  WALLET_SET_ID: process.env.CIRCLE_WALLET_SET_ID || '',

  // Client configuration for frontend SDK
  CLIENT_URL: process.env.CIRCLE_CLIENT_URL || 'https://modular-sdk.circle.com/v1/rpc/w3s/buidl',
  CLIENT_KEY: process.env.CIRCLE_CLIENT_KEY || '',

  // USDC token addresses per chain (null for native USDC)
  USDC_ADDRESSES: {
    'ARC-TESTNET': null, // Native USDC on Arc
    'ETH-SEPOLIA': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    'BASE-SEPOLIA': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    'AVALANCHE-FUJI': '0x5425890298aed601595a70AB815c96711a31Bc65',
    'SONIC-TESTNET': '0xe46C1D4a287Be44f9f0E47c8B40E5D4b0d7a2a8a',
    'WORLD-CHAIN-SEPOLIA': '0x5E9F03be2cA6d4ed569e1c06a7e5b900B8Ae5a84',
    'SEI-ATLANTIC': '0x057e1f4E1D56F96a87c4a4a8C24b54FdF0b49E34',
    'HYPEREVM-TESTNET': '0x8BDb2a69c3B5d2c5E0f9C3c5A8D5F6F5e5D5C5B5',
    'SOLANA-DEVNET': null, // Handled differently for Solana
  } as const,

  // USDC decimals per chain
  USDC_DECIMALS: {
    'ARC-TESTNET': 18, // Native USDC has 18 decimals
    'ETH-SEPOLIA': 6,
    'BASE-SEPOLIA': 6,
    'AVALANCHE-FUJI': 6,
    'SONIC-TESTNET': 6,
    'WORLD-CHAIN-SEPOLIA': 6,
    'SEI-ATLANTIC': 6,
    'HYPEREVM-TESTNET': 6,
    'SOLANA-DEVNET': 6,
  } as const,

  // Chain IDs (EVM chains only)
  CHAIN_IDS: {
    'ARC-TESTNET': 1687190085,
    'ETH-SEPOLIA': 11155111,
    'BASE-SEPOLIA': 84532,
    'AVALANCHE-FUJI': 43113,
    'SONIC-TESTNET': 64165,
    'WORLD-CHAIN-SEPOLIA': 4801,
    'SEI-ATLANTIC': 1328,
    'HYPEREVM-TESTNET': 998,
    'SOLANA-DEVNET': 0, // Solana doesn't use EVM chain ID
  } as const,

  // RPC URLs for all chains
  RPC_URLS: {
    'ARC-TESTNET': 'https://rpc-testnet.arc.circle.com',
    'ETH-SEPOLIA': 'https://ethereum-sepolia-rpc.publicnode.com',
    'BASE-SEPOLIA': 'https://sepolia.base.org',
    'AVALANCHE-FUJI': 'https://api.avax-test.network/ext/bc/C/rpc',
    'SONIC-TESTNET': 'https://rpc.sonic.testnet.soniclabs.com',
    'WORLD-CHAIN-SEPOLIA': 'https://worldchain-sepolia.g.alchemy.com/public',
    'SEI-ATLANTIC': 'https://evm-rpc-testnet.sei-apis.com',
    'HYPEREVM-TESTNET': 'https://rpc.hyperliquid-testnet.xyz/evm',
    'SOLANA-DEVNET': 'https://api.devnet.solana.com',
  } as const,

  // Gateway domain IDs
  GATEWAY_DOMAINS: {
    'ETH-SEPOLIA': 0,
    'AVALANCHE-FUJI': 1,
    'SOLANA-DEVNET': 5,
    'BASE-SEPOLIA': 6,
    'SONIC-TESTNET': 13,
    'WORLD-CHAIN-SEPOLIA': 14,
    'SEI-ATLANTIC': 16,
    'HYPEREVM-TESTNET': 19,
    'ARC-TESTNET': 26,
  } as const,

  // Block explorers
  EXPLORERS: {
    'ARC-TESTNET': 'https://testnet.arcscan.app',
    'ETH-SEPOLIA': 'https://sepolia.etherscan.io',
    'BASE-SEPOLIA': 'https://sepolia.basescan.org',
    'AVALANCHE-FUJI': 'https://testnet.snowtrace.io',
    'SONIC-TESTNET': 'https://testnet.sonicscan.org',
    'WORLD-CHAIN-SEPOLIA': 'https://sepolia.worldscan.org',
    'SEI-ATLANTIC': 'https://atlantic.seistream.app',
    'HYPEREVM-TESTNET': 'https://testnet.hyperevm.xyz',
    'SOLANA-DEVNET': 'https://explorer.solana.com',
  } as const,
} as const;

// Type for supported blockchains
export type SupportedBlockchain = typeof CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS[number];

// Export type for the client
export type CircleClient = typeof circleClient;
