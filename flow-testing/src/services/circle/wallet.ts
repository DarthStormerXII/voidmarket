/**
 * Circle Wallet Service
 *
 * Creates and manages developer-controlled wallets using RefID
 * for deterministic wallet addresses based on user identifiers
 *
 * Multi-chain support: ARC-TESTNET, ETH-SEPOLIA, BASE-SEPOLIA
 */

import { circleClient, CIRCLE_CONFIG, type SupportedBlockchain } from './client.js';
import { parseEther, parseUnits } from 'viem';

// Wallet type from Circle SDK
interface Wallet {
  id: string;
  address: string;
  blockchain: string;
  refId?: string;
  state?: string;
  walletSetId?: string;
}

export interface CreateWalletResult {
  walletId: string;
  address: string;
  blockchain: string;
  refId: string;
}

export interface MultiChainWalletResult {
  wallets: CreateWalletResult[];
  address: string; // Same address across all chains (EOA)
  refId: string;
}

// Minimum bet amount: 0.001 USDC
export const MIN_BET_AMOUNT = '0.001';
export const MIN_BET_AMOUNT_WEI = parseEther(MIN_BET_AMOUNT); // For Arc Testnet (18 decimals)
export const MIN_BET_AMOUNT_USDC = parseUnits(MIN_BET_AMOUNT, 6); // For Sepolia chains (6 decimals)

export interface WalletBalance {
  native: string;
  tokens: Array<{
    symbol: string;
    amount: string;
    decimals: number;
  }>;
}

/**
 * Create a new wallet with a RefID for deterministic addressing (single chain)
 *
 * @param refId - Unique reference ID (e.g., Telegram user ID)
 * @param blockchain - Target blockchain (default: ARC-TESTNET)
 * @returns Wallet details including address
 */
export async function createWallet(
  refId: string,
  blockchain: SupportedBlockchain = CIRCLE_CONFIG.PRIMARY_BLOCKCHAIN
): Promise<CreateWalletResult> {
  const response = await (circleClient as any).createWallets({
    accountType: 'EOA',
    blockchains: [blockchain],
    count: 1,
    walletSetId: CIRCLE_CONFIG.WALLET_SET_ID,
    refId,
  });

  const wallet = response.data?.wallets?.[0];
  if (!wallet) {
    throw new Error('Failed to create wallet: No wallet returned');
  }

  return {
    walletId: wallet.id,
    address: wallet.address,
    blockchain: wallet.blockchain,
    refId: wallet.refId || refId,
  };
}

/**
 * Create wallets on all supported chains with a single RefID
 *
 * This creates wallets with the same address across all chains (EOA property)
 *
 * @param refId - Unique reference ID (e.g., Telegram user ID)
 * @returns Multi-chain wallet details
 */
export async function createMultiChainWallet(refId: string): Promise<MultiChainWalletResult> {
  const response = await (circleClient as any).createWallets({
    accountType: 'EOA',
    blockchains: [...CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS],
    count: 1,
    walletSetId: CIRCLE_CONFIG.WALLET_SET_ID,
    refId,
  });

  const wallets = response.data?.wallets;
  if (!wallets || wallets.length === 0) {
    throw new Error('Failed to create multi-chain wallet: No wallets returned');
  }

  // All wallets should have the same address (EOA)
  const address = wallets[0].address;

  return {
    wallets: wallets.map((w: Wallet) => ({
      walletId: w.id,
      address: w.address,
      blockchain: w.blockchain,
      refId: w.refId || refId,
    })),
    address,
    refId,
  };
}

/**
 * Get wallet by RefID
 *
 * @param refId - Reference ID to look up
 * @returns Wallet if found, null otherwise
 */
export async function getWalletByRefId(refId: string): Promise<Wallet | null> {
  const response = await circleClient.listWallets({
    refId,
  });

  const wallets = response.data?.wallets;
  if (!wallets || wallets.length === 0) {
    return null;
  }

  // Return the Arc Testnet wallet
  return (
    wallets.find((w: Wallet) => w.blockchain === CIRCLE_CONFIG.ARC_TESTNET_BLOCKCHAIN) ||
    wallets[0]
  ) as Wallet;
}

/**
 * Get or create wallet for a user (single chain)
 *
 * @param refId - User's reference ID
 * @param blockchain - Target blockchain (default: ARC-TESTNET)
 * @returns Existing or newly created wallet
 */
export async function getOrCreateWallet(
  refId: string,
  blockchain: SupportedBlockchain = CIRCLE_CONFIG.PRIMARY_BLOCKCHAIN
): Promise<CreateWalletResult> {
  const existing = await getWalletByRefId(refId);

  if (existing) {
    return {
      walletId: existing.id,
      address: existing.address,
      blockchain: existing.blockchain,
      refId: existing.refId || refId,
    };
  }

  return createWallet(refId, blockchain);
}

/**
 * Get or create multi-chain wallet for a user
 *
 * @param refId - User's reference ID
 * @returns Existing or newly created multi-chain wallet
 */
export async function getOrCreateMultiChainWallet(refId: string): Promise<MultiChainWalletResult> {
  const response = await circleClient.listWallets({ refId });
  const existingWallets = response.data?.wallets || [];

  if (existingWallets.length > 0) {
    // Map existing wallets
    const wallets = existingWallets.map((w: Wallet) => ({
      walletId: w.id,
      address: w.address,
      blockchain: w.blockchain,
      refId: w.refId || refId,
    }));

    return {
      wallets,
      address: existingWallets[0].address,
      refId,
    };
  }

  return createMultiChainWallet(refId);
}

/**
 * Get wallet for a specific chain
 *
 * @param refId - User's reference ID
 * @param blockchain - Target blockchain
 * @returns Wallet for the specified chain or null
 */
export async function getWalletForChain(
  refId: string,
  blockchain: SupportedBlockchain
): Promise<CreateWalletResult | null> {
  const response = await circleClient.listWallets({ refId });
  const wallets = response.data?.wallets || [];

  const wallet = wallets.find((w: Wallet) => w.blockchain === blockchain);
  if (!wallet) return null;

  return {
    walletId: wallet.id,
    address: wallet.address,
    blockchain: wallet.blockchain,
    refId: wallet.refId || refId,
  };
}

/**
 * Get wallet balance on Arc Testnet
 *
 * @param walletId - Circle wallet ID
 * @returns Balance details
 */
export async function getWalletBalance(walletId: string): Promise<WalletBalance> {
  const response = await circleClient.getWalletTokenBalance({
    id: walletId,
  });

  const balances = response.data?.tokenBalances || [];

  // On Arc Testnet, native USDC has 18 decimals
  const nativeBalance = balances.find((b) => b.token.isNative);
  const tokenBalances = balances
    .filter((b: any) => !b.token.isNative)
    .map((b: any) => ({
      symbol: b.token.symbol || '',
      amount: b.amount,
      decimals: b.token.decimals || 18,
    }));

  return {
    native: nativeBalance?.amount || '0',
    tokens: tokenBalances,
  };
}

/**
 * Get wallet by ID
 *
 * @param walletId - Circle wallet ID
 * @returns Wallet details
 */
export async function getWallet(walletId: string): Promise<Wallet | null> {
  const response = await circleClient.getWallet({
    id: walletId,
  });

  return response.data?.wallet || null;
}

/**
 * List all wallets in the wallet set
 *
 * @param pageSize - Number of wallets per page
 * @param pageBefore - Cursor for pagination
 * @returns List of wallets
 */
export async function listWallets(
  pageSize = 50,
  pageBefore?: string
): Promise<Wallet[]> {
  const response = await circleClient.listWallets({
    walletSetId: CIRCLE_CONFIG.WALLET_SET_ID,
    pageSize,
    pageBefore,
  });

  return response.data?.wallets || [];
}

/**
 * List wallets for a specific blockchain
 *
 * @param blockchain - Target blockchain
 * @param pageSize - Number of wallets per page
 * @returns List of wallets on the specified chain
 */
export async function listWalletsForChain(
  blockchain: SupportedBlockchain,
  pageSize = 50
): Promise<Wallet[]> {
  const allWallets = await listWallets(pageSize);
  return allWallets.filter((w) => w.blockchain === blockchain);
}

/**
 * Parse USDC amount based on chain decimals
 *
 * @param amount - Amount in decimal string (e.g., "0.001")
 * @param blockchain - Target blockchain
 * @returns Amount in smallest unit (wei/smallest denomination)
 */
export function parseUSDCAmount(
  amount: string,
  blockchain: SupportedBlockchain
): bigint {
  const decimals = CIRCLE_CONFIG.USDC_DECIMALS[blockchain];
  return parseUnits(amount, decimals);
}

/**
 * Validate bet amount meets minimum threshold
 *
 * @param amount - Amount in decimal string
 * @returns True if amount meets minimum
 */
export function validateBetAmount(amount: string): boolean {
  const amountNum = parseFloat(amount);
  const minNum = parseFloat(MIN_BET_AMOUNT);
  return amountNum >= minNum;
}
