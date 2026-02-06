/**
 * Circle SDK Client Configuration
 *
 * Initializes the Circle Developer-Controlled Wallets SDK
 * for creating and managing user wallets on Arc Testnet
 *
 * Adapted for Next.js API routes (server-side only)
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

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

// Circle configuration
export const CIRCLE_CONFIG = {
  // Blockchain identifiers in Circle
  ARC_TESTNET_BLOCKCHAIN: 'ARC-TESTNET',
  ETH_SEPOLIA_BLOCKCHAIN: 'ETH-SEPOLIA',
  BASE_SEPOLIA_BLOCKCHAIN: 'BASE-SEPOLIA',

  // Primary chain for VoidMarket operations
  PRIMARY_BLOCKCHAIN: 'ARC-TESTNET',

  // Wallet set ID (from env)
  WALLET_SET_ID: process.env.CIRCLE_WALLET_SET_ID || '',

  // USDC decimals per chain
  USDC_DECIMALS: {
    'ARC-TESTNET': 18, // Native USDC has 18 decimals
    'ETH-SEPOLIA': 6,
    'BASE-SEPOLIA': 6,
  } as const,

  // RPC URLs
  RPC_URLS: {
    'ARC-TESTNET': process.env.ARC_RPC_URL || 'https://rpc-testnet.arc.circle.com',
  } as const,

  // Block explorers
  EXPLORERS: {
    'ARC-TESTNET': 'https://testnet.arcscan.app',
    'ETH-SEPOLIA': 'https://sepolia.etherscan.io',
    'BASE-SEPOLIA': 'https://sepolia.basescan.org',
  } as const,
} as const;

// Type for supported blockchains
export type SupportedBlockchain = 'ARC-TESTNET' | 'ETH-SEPOLIA' | 'BASE-SEPOLIA';

// Export type for the client
export type CircleClient = ReturnType<typeof getCircleClient>;
