/**
 * Circle Gateway API Tests
 *
 * Tests for unified cross-chain balance queries
 */

import { describe, it, expect } from 'vitest';
import {
  GATEWAY_DOMAINS,
  getUnifiedBalance,
  formatBalance,
  hasSufficientArcBalance,
} from '../../services/circle/gateway.js';

describe('Gateway API Configuration', () => {
  it('should have correct domain IDs for all 9 chains', () => {
    expect(GATEWAY_DOMAINS['ETH-SEPOLIA']).toBe(0);
    expect(GATEWAY_DOMAINS['AVALANCHE-FUJI']).toBe(1);
    expect(GATEWAY_DOMAINS['SOLANA-DEVNET']).toBe(5);
    expect(GATEWAY_DOMAINS['BASE-SEPOLIA']).toBe(6);
    expect(GATEWAY_DOMAINS['SONIC-TESTNET']).toBe(13);
    expect(GATEWAY_DOMAINS['WORLD-CHAIN-SEPOLIA']).toBe(14);
    expect(GATEWAY_DOMAINS['SEI-ATLANTIC']).toBe(16);
    expect(GATEWAY_DOMAINS['HYPEREVM-TESTNET']).toBe(19);
    expect(GATEWAY_DOMAINS['ARC-TESTNET']).toBe(26);
  });

  it('should support all nine chains', () => {
    const chains = Object.keys(GATEWAY_DOMAINS);
    expect(chains).toHaveLength(9);
    expect(chains).toContain('ETH-SEPOLIA');
    expect(chains).toContain('AVALANCHE-FUJI');
    expect(chains).toContain('SOLANA-DEVNET');
    expect(chains).toContain('BASE-SEPOLIA');
    expect(chains).toContain('SONIC-TESTNET');
    expect(chains).toContain('WORLD-CHAIN-SEPOLIA');
    expect(chains).toContain('SEI-ATLANTIC');
    expect(chains).toContain('HYPEREVM-TESTNET');
    expect(chains).toContain('ARC-TESTNET');
  });
});

describe('Unified Balance Query', () => {
  it('should handle valid address query', async () => {
    // Use a test address
    const testAddress = '0x0000000000000000000000000000000000000001';
    const result = await getUnifiedBalance(testAddress as `0x${string}`);

    // Should return a result object regardless of balance
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('address', testAddress);
    expect(result).toHaveProperty('totalUSDC');
    expect(result).toHaveProperty('balances');
    expect(Array.isArray(result.balances)).toBe(true);
  });

  it('should format balance correctly', () => {
    const mockResult = {
      success: true,
      address: '0x123',
      totalUSDC: 150.5,
      balances: [
        { chain: 'ETH-SEPOLIA', domain: 0, balance: '100500000', balanceUSDC: 100.5 },
        { chain: 'ARC-TESTNET', domain: 26, balance: '50000000000000000000', balanceUSDC: 50.0 },
      ],
    };

    const formatted = formatBalance(mockResult);

    expect(formatted).toContain('Total USDC: $150.50');
    expect(formatted).toContain('ETH-SEPOLIA: $100.50');
    expect(formatted).toContain('ARC-TESTNET: $50.00');
  });

  it('should format error correctly', () => {
    const errorResult = {
      success: false,
      address: '0x123',
      totalUSDC: 0,
      balances: [],
      error: 'Network error',
    };

    const formatted = formatBalance(errorResult);
    expect(formatted).toContain('Error: Network error');
  });
});

describe('Sufficient Balance Check', () => {
  it('should check Arc balance against required amount', async () => {
    const testAddress = '0x0000000000000000000000000000000000000001';
    const result = await hasSufficientArcBalance(testAddress as `0x${string}`, 0.001);

    // Should return result with sufficient flag
    expect(result).toHaveProperty('sufficient');
    expect(result).toHaveProperty('currentBalance');
    expect(typeof result.sufficient).toBe('boolean');
    expect(typeof result.currentBalance).toBe('number');
  });
});

describe('Gateway Integration Scenarios', () => {
  describe('User Onboarding Flow', () => {
    it('should detect user needs to bridge funds', async () => {
      // Simulated scenario: User has USDC on Sepolia but not Arc
      const mockBalances = {
        success: true,
        address: '0x123',
        totalUSDC: 100.0,
        balances: [
          { chain: 'ETH-SEPOLIA', domain: 0, balance: '100000000', balanceUSDC: 100.0 },
          { chain: 'ARC-TESTNET', domain: 26, balance: '0', balanceUSDC: 0 },
        ],
      };

      const arcBalance = mockBalances.balances.find((b) => b.chain === 'ARC-TESTNET');
      const sepoliaBalance = mockBalances.balances.find((b) => b.chain === 'ETH-SEPOLIA');

      expect(arcBalance?.balanceUSDC).toBe(0);
      expect(sepoliaBalance?.balanceUSDC).toBe(100.0);

      // User needs to bridge from Sepolia to Arc
      const needsBridge = arcBalance!.balanceUSDC === 0 && sepoliaBalance!.balanceUSDC > 0;
      expect(needsBridge).toBe(true);
    });
  });

  describe('Balance Aggregation', () => {
    it('should correctly sum balances across chains', () => {
      const mockBalances = [
        { chain: 'ETH-SEPOLIA', balanceUSDC: 50.0 },
        { chain: 'BASE-SEPOLIA', balanceUSDC: 30.0 },
        { chain: 'ARC-TESTNET', balanceUSDC: 20.0 },
      ];

      const total = mockBalances.reduce((sum, b) => sum + b.balanceUSDC, 0);
      expect(total).toBe(100.0);
    });

    it('should handle different decimal formats', () => {
      // ETH-SEPOLIA and BASE-SEPOLIA use 6 decimals
      const sepoliaRaw = '100000000'; // 100 USDC with 6 decimals
      const sepoliaUSDC = parseFloat(sepoliaRaw) / Math.pow(10, 6);
      expect(sepoliaUSDC).toBe(100.0);

      // ARC-TESTNET uses 18 decimals
      const arcRaw = '100000000000000000000'; // 100 USDC with 18 decimals
      const arcUSDC = parseFloat(arcRaw) / Math.pow(10, 18);
      expect(arcUSDC).toBe(100.0);
    });
  });
});
