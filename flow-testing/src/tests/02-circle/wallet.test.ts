/**
 * Circle Wallet Tests
 *
 * Tests for multi-chain wallet creation and management
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  createWallet,
  createMultiChainWallet,
  getOrCreateWallet,
  getOrCreateMultiChainWallet,
  getWalletForChain,
  parseUSDCAmount,
  validateBetAmount,
  MIN_BET_AMOUNT,
  MIN_BET_AMOUNT_WEI,
  MIN_BET_AMOUNT_USDC,
} from '../../services/circle/wallet.js';
import { CIRCLE_CONFIG } from '../../services/circle/client.js';

// Skip these tests if Circle credentials are not configured
const hasCircleCredentials = !!(
  process.env.CIRCLE_API_KEY &&
  process.env.CIRCLE_ENTITY_SECRET &&
  process.env.CIRCLE_WALLET_SET_ID
);

describe('Circle Configuration', () => {
  it('should have multi-chain blockchain identifiers', () => {
    expect(CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS).toContain('ARC-TESTNET');
    expect(CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS).toContain('ETH-SEPOLIA');
    expect(CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS).toContain('BASE-SEPOLIA');
  });

  it('should have USDC addresses for all chains', () => {
    expect(CIRCLE_CONFIG.USDC_ADDRESSES['ARC-TESTNET']).toBeNull(); // Native USDC
    expect(CIRCLE_CONFIG.USDC_ADDRESSES['ETH-SEPOLIA']).toMatch(/^0x/);
    expect(CIRCLE_CONFIG.USDC_ADDRESSES['BASE-SEPOLIA']).toMatch(/^0x/);
  });

  it('should have correct USDC decimals', () => {
    expect(CIRCLE_CONFIG.USDC_DECIMALS['ARC-TESTNET']).toBe(18);
    expect(CIRCLE_CONFIG.USDC_DECIMALS['ETH-SEPOLIA']).toBe(6);
    expect(CIRCLE_CONFIG.USDC_DECIMALS['BASE-SEPOLIA']).toBe(6);
  });

  it('should have chain IDs configured', () => {
    expect(CIRCLE_CONFIG.CHAIN_IDS['ARC-TESTNET']).toBe(1687190085);
    expect(CIRCLE_CONFIG.CHAIN_IDS['ETH-SEPOLIA']).toBe(11155111);
    expect(CIRCLE_CONFIG.CHAIN_IDS['BASE-SEPOLIA']).toBe(84532);
  });
});

describe('Minimum Bet Amount', () => {
  it('should have minimum bet amount of 0.001', () => {
    expect(MIN_BET_AMOUNT).toBe('0.001');
  });

  it('should have correct wei amount for Arc Testnet (18 decimals)', () => {
    // 0.001 * 10^18 = 1000000000000000
    expect(MIN_BET_AMOUNT_WEI).toBe(1000000000000000n);
  });

  it('should have correct amount for Sepolia chains (6 decimals)', () => {
    // 0.001 * 10^6 = 1000
    expect(MIN_BET_AMOUNT_USDC).toBe(1000n);
  });
});

describe('USDC Amount Parsing', () => {
  it('should parse amount for Arc Testnet (18 decimals)', () => {
    const amount = parseUSDCAmount('1.0', 'ARC-TESTNET');
    expect(amount).toBe(1000000000000000000n);
  });

  it('should parse amount for ETH Sepolia (6 decimals)', () => {
    const amount = parseUSDCAmount('1.0', 'ETH-SEPOLIA');
    expect(amount).toBe(1000000n);
  });

  it('should parse minimum bet amount correctly', () => {
    const arcAmount = parseUSDCAmount(MIN_BET_AMOUNT, 'ARC-TESTNET');
    const sepoliaAmount = parseUSDCAmount(MIN_BET_AMOUNT, 'ETH-SEPOLIA');

    expect(arcAmount).toBe(MIN_BET_AMOUNT_WEI);
    expect(sepoliaAmount).toBe(MIN_BET_AMOUNT_USDC);
  });
});

describe('Bet Amount Validation', () => {
  it('should accept amounts >= 0.001', () => {
    expect(validateBetAmount('0.001')).toBe(true);
    expect(validateBetAmount('0.01')).toBe(true);
    expect(validateBetAmount('1.0')).toBe(true);
    expect(validateBetAmount('100')).toBe(true);
  });

  it('should reject amounts < 0.001', () => {
    expect(validateBetAmount('0.0001')).toBe(false);
    expect(validateBetAmount('0.0009')).toBe(false);
    expect(validateBetAmount('0')).toBe(false);
  });
});

describe.skipIf(!hasCircleCredentials)('Circle Wallet Operations', () => {
  const testRefId = `test-${Date.now()}`;

  it('should create a single-chain wallet', async () => {
    const wallet = await createWallet(testRefId);

    expect(wallet.walletId).toBeDefined();
    expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(wallet.blockchain).toBe('ARC-TESTNET');
    expect(wallet.refId).toBe(testRefId);
  });

  it('should create a multi-chain wallet', async () => {
    const multiRefId = `multi-${Date.now()}`;
    const result = await createMultiChainWallet(multiRefId);

    expect(result.wallets.length).toBe(3);
    expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(result.refId).toBe(multiRefId);

    // All wallets should have the same address (EOA property)
    const addresses = result.wallets.map((w) => w.address);
    expect(new Set(addresses).size).toBe(1);

    // Should have wallet for each supported chain
    const blockchains = result.wallets.map((w) => w.blockchain);
    expect(blockchains).toContain('ARC-TESTNET');
    expect(blockchains).toContain('ETH-SEPOLIA');
    expect(blockchains).toContain('BASE-SEPOLIA');
  });

  it('should get existing wallet by refId', async () => {
    const existing = await getOrCreateWallet(testRefId);

    expect(existing.refId).toBe(testRefId);
    expect(existing.address).toMatch(/^0x/);
  });

  it('should get wallet for specific chain', async () => {
    const wallet = await getWalletForChain(testRefId, 'ARC-TESTNET');

    expect(wallet).not.toBeNull();
    expect(wallet?.blockchain).toBe('ARC-TESTNET');
  });
});
