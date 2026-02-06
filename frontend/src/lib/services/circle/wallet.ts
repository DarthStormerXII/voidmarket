/**
 * Circle Wallet Service
 *
 * Creates and manages developer-controlled wallets using RefID
 * for deterministic wallet addresses based on user identifiers
 */

import { getCircleClient, CIRCLE_CONFIG, type SupportedBlockchain } from './client';
import { parseUnits } from 'viem';

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
  isNew: boolean;
}

export interface WalletBalance {
  native: string;
  tokens: Array<{
    symbol: string;
    amount: string;
    decimals: number;
  }>;
}

// Minimum bet amount: 0.001 USDC
export const MIN_BET_AMOUNT = '0.001';

// Cache for wallet set ID (auto-created if not configured)
let _cachedWalletSetId: string | null = null;

/**
 * Get or create wallet set
 * If CIRCLE_WALLET_SET_ID is set, uses that. Otherwise creates one automatically.
 */
async function getOrCreateWalletSetId(): Promise<string> {
  // Use configured wallet set ID if available
  if (CIRCLE_CONFIG.WALLET_SET_ID) {
    return CIRCLE_CONFIG.WALLET_SET_ID;
  }

  // Return cached ID if we already created one
  if (_cachedWalletSetId) {
    return _cachedWalletSetId;
  }

  // Create a new wallet set
  const client = getCircleClient();
  const response = await (client as any).createWalletSet({
    name: 'VoidMarket Users',
  });

  const walletSetId = response.data?.walletSet?.id;
  if (!walletSetId) {
    throw new Error('Failed to create wallet set');
  }

  console.log('[Circle] Auto-created wallet set:', walletSetId);
  _cachedWalletSetId = walletSetId;
  return walletSetId;
}

/**
 * Get wallet by RefID
 *
 * @param refId - Reference ID to look up
 * @returns Wallet if found, null otherwise
 */
export async function getWalletByRefId(refId: string): Promise<Wallet | null> {
  const client = getCircleClient();
  const response = await client.listWallets({
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
 * Create a new wallet with a RefID for deterministic addressing
 *
 * @param refId - Unique reference ID (e.g., Telegram user ID)
 * @param blockchain - Target blockchain (default: ARC-TESTNET)
 * @returns Wallet details including address
 */
export async function createWallet(
  refId: string,
  blockchain: SupportedBlockchain = CIRCLE_CONFIG.PRIMARY_BLOCKCHAIN
): Promise<CreateWalletResult> {
  const client = getCircleClient();
  const walletSetId = await getOrCreateWalletSetId();

  const response = await (client as any).createWallets({
    accountType: 'EOA',
    blockchains: [blockchain],
    count: 1,
    walletSetId,
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
    isNew: true,
  };
}

/**
 * Get or create wallet for a user
 *
 * @param refId - User's reference ID (e.g., tg_123456)
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
      isNew: false,
    };
  }

  return createWallet(refId, blockchain);
}

/**
 * Get wallet balance on Arc Testnet
 *
 * @param walletId - Circle wallet ID
 * @returns Balance details
 */
export async function getWalletBalance(walletId: string): Promise<WalletBalance> {
  const client = getCircleClient();
  const response = await client.getWalletTokenBalance({
    id: walletId,
  });

  const balances = response.data?.tokenBalances || [];

  // On Arc Testnet, native USDC has 18 decimals
  const nativeBalance = balances.find((b: any) => b.token.isNative);
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
  const client = getCircleClient();
  const response = await client.getWallet({
    id: walletId,
  });

  return response.data?.wallet || null;
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
  blockchain: SupportedBlockchain = 'ARC-TESTNET'
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
