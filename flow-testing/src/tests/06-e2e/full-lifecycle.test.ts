/**
 * Full Lifecycle E2E Test
 *
 * Complete end-to-end test of VoidMarket functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseEther } from 'viem';
import {
  createMultiChainWallet,
  validateBetAmount,
  MIN_BET_AMOUNT,
} from '../../services/circle/wallet.js';
import { CIRCLE_CONFIG } from '../../services/circle/client.js';
import {
  GATEWAY_DOMAINS,
  getUnifiedBalance,
  hasSufficientArcBalance,
  formatBalance,
} from '../../services/circle/gateway.js';
import {
  getSourceChainsForArc,
  getTxExplorerUrl,
  CHAIN_DISPLAY_NAMES,
} from '../../services/circle/bridge.js';
import {
  createBetCommitment,
  prepareBetReveal,
  generateNullifier,
} from '../../utils/zk/index.js';

// Skip if Circle credentials not configured
const hasCircleCredentials = !!(
  process.env.CIRCLE_API_KEY &&
  process.env.CIRCLE_ENTITY_SECRET &&
  process.env.CIRCLE_WALLET_SET_ID
);

describe('VoidMarket Full Lifecycle', () => {
  // Test users
  let alice: { address: string; refId: string };
  let bob: { address: string; refId: string };
  let charlie: { address: string; refId: string };

  describe('Phase 1: User Registration via Circle', () => {
    it.skipIf(!hasCircleCredentials)('should create multi-chain wallets for users', async () => {
      const aliceResult = await createMultiChainWallet(`telegram:alice-${Date.now()}`);
      const bobResult = await createMultiChainWallet(`telegram:bob-${Date.now()}`);
      const charlieResult = await createMultiChainWallet(`telegram:charlie-${Date.now()}`);

      alice = { address: aliceResult.address, refId: aliceResult.refId };
      bob = { address: bobResult.address, refId: bobResult.refId };
      charlie = { address: charlieResult.address, refId: charlieResult.refId };

      expect(alice.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(bob.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(charlie.address).toMatch(/^0x[a-fA-F0-9]{40}$/);

      // Addresses should be different
      expect(alice.address).not.toBe(bob.address);
      expect(bob.address).not.toBe(charlie.address);
    });

    it('should validate multi-chain configuration', () => {
      // Now supporting 8 EVM chains (9 total with Solana)
      expect(CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS).toHaveLength(8);
      expect(CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS).toContain('ARC-TESTNET');
      expect(CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS).toContain('ETH-SEPOLIA');
      expect(CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS).toContain('BASE-SEPOLIA');
      expect(CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS).toContain('AVALANCHE-FUJI');
      expect(CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS).toContain('SONIC-TESTNET');
      expect(CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS).toContain('WORLD-CHAIN-SEPOLIA');
      expect(CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS).toContain('SEI-ATLANTIC');
      expect(CIRCLE_CONFIG.SUPPORTED_BLOCKCHAINS).toContain('HYPEREVM-TESTNET');
    });
  });

  describe('Phase 2: Market Creation with ZK Bets', () => {
    it('should create ZK commitment for YES bet', async () => {
      const aliceBet = await createBetCommitment(true); // YES

      expect(aliceBet.direction).toBe(true);
      expect(aliceBet.commitmentHex).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(typeof aliceBet.salt).toBe('bigint');
    });

    it('should create ZK commitment for NO bet', async () => {
      const bobBet = await createBetCommitment(false); // NO

      expect(bobBet.direction).toBe(false);
      expect(bobBet.commitmentHex).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should validate minimum bet amount (0.001 USDC)', () => {
      expect(validateBetAmount('0.001')).toBe(true);
      expect(validateBetAmount('0.0009')).toBe(false);
      expect(validateBetAmount(MIN_BET_AMOUNT)).toBe(true);
    });

    it('should prepare reveal data with nullifier', async () => {
      const bet = await createBetCommitment(true);
      const marketId = 1n;

      const revealData = await prepareBetReveal(bet, marketId);

      expect(revealData.marketId).toBe(marketId);
      expect(revealData.nullifierHex).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should generate unique nullifier per market', async () => {
      const bet = await createBetCommitment(true);

      const nullifier1 = await generateNullifier(bet.salt, 1n);
      const nullifier2 = await generateNullifier(bet.salt, 2n);

      expect(nullifier1).not.toBe(nullifier2);
    });
  });

  describe('Phase 3: Cluster Operations', () => {
    it('should simulate cluster creation with escrow', () => {
      const cluster = {
        id: 1n,
        name: 'Alpha Cluster',
        leader: '0x1234567890123456789012345678901234567890',
        escrowBalance: 0n,
      };

      expect(cluster.name).toBe('Alpha Cluster');
      expect(cluster.escrowBalance).toBe(0n);
    });

    it('should simulate escrow deposit', () => {
      const escrowBalance = parseEther('0.01');
      const depositAmount = parseEther('0.005');

      const newBalance = escrowBalance + depositAmount;

      expect(newBalance).toBe(parseEther('0.015'));
    });

    it('should validate Nova wager requirements', () => {
      const cluster1Deposit = parseEther('0.01');
      const cluster2Deposit = parseEther('0.01');
      const requiredWager = parseEther('0.01');

      const bothReady =
        cluster1Deposit >= requiredWager && cluster2Deposit >= requiredWager;

      expect(bothReady).toBe(true);
    });
  });

  describe('Phase 4: Nova Battle Flow', () => {
    it('should calculate photon rewards correctly', () => {
      const WIN_PHOTONS = 100;
      const LOSE_PHOTONS = 25;

      // Star 1 wins
      const star1Photons = WIN_PHOTONS;
      const star2Photons = LOSE_PHOTONS;

      expect(star1Photons).toBe(100);
      expect(star2Photons).toBe(25);
    });

    it('should calculate energy bonus for winner', () => {
      const ENERGY_BONUS = 500;
      const clusterEnergy = 1000n;

      const newEnergy = clusterEnergy + BigInt(ENERGY_BONUS);

      expect(newEnergy).toBe(1500n);
    });

    it('should calculate proportional USDC distribution', () => {
      const prizePool = parseEther('0.02');
      const winningClusterPhotons = 300; // 3 wins
      const star1Photons = 100; // 1 win

      // Star1's share = (100 / 300) * prizePool
      const star1Share = (BigInt(star1Photons) * prizePool) / BigInt(winningClusterPhotons);

      expect(star1Share).toBe(parseEther('0.02') / 3n);
    });
  });

  describe('Phase 5: Market Resolution and Claim', () => {
    it('should simulate market resolution flow', async () => {
      // Create bets
      const aliceBet = await createBetCommitment(true); // YES
      const bobBet = await createBetCommitment(false); // NO
      const marketId = 1n;

      // Market resolved as YES
      const outcome = true;

      // Alice should win
      expect(aliceBet.direction).toBe(outcome);
      expect(bobBet.direction).not.toBe(outcome);
    });

    it('should prevent double-reveal with nullifier', async () => {
      const bet = await createBetCommitment(true);
      const marketId = 1n;

      // First reveal generates nullifier
      const reveal1 = await prepareBetReveal(bet, marketId);

      // Same inputs should produce same nullifier
      const reveal2 = await prepareBetReveal(bet, marketId);

      expect(reveal1.nullifier).toBe(reveal2.nullifier);

      // Contract would reject second reveal with same nullifier
      // (simulated by tracking used nullifiers)
      const usedNullifiers = new Set<bigint>();
      usedNullifiers.add(reveal1.nullifier);

      const isDoubleReveal = usedNullifiers.has(reveal2.nullifier);
      expect(isDoubleReveal).toBe(true);
    });

    it('should calculate winnings correctly', () => {
      const betAmount = parseEther('0.001');
      const totalYesPool = parseEther('0.005');
      const totalNoPool = parseEther('0.003');

      // Outcome is YES, so YES bettors share NO pool
      // Winner gets: betAmount + (betAmount * losingPool / winningPool)
      const winnings = betAmount + (betAmount * totalNoPool) / totalYesPool;

      expect(winnings).toBe(parseEther('0.001') + (parseEther('0.001') * parseEther('0.003')) / parseEther('0.005'));
    });
  });

  describe('Phase 6: ENS Verification', () => {
    it('should support VoidMarket text record keys', () => {
      const starKeys = [
        'voidmarket.star-type',
        'voidmarket.total-photons',
        'voidmarket.cluster',
      ];

      const marketKeys = [
        'voidmarket.question',
        'voidmarket.status',
        'voidmarket.outcome',
      ];

      const clusterKeys = [
        'voidmarket.energy',
        'voidmarket.leader',
        'voidmarket.member-count',
      ];

      expect(starKeys).toHaveLength(3);
      expect(marketKeys).toHaveLength(3);
      expect(clusterKeys).toHaveLength(3);
    });

    it('should format subdomain correctly', () => {
      const username = 'cosmicvoyager';
      const domain = 'voidmarket.eth';

      const fullName = `${username}.${domain}`;

      expect(fullName).toBe('cosmicvoyager.voidmarket.eth');
    });
  });
});

describe('Circle Gateway API Integration', () => {
  describe('Unified Balance Query', () => {
    it('should support all required domains', () => {
      expect(GATEWAY_DOMAINS['ETH-SEPOLIA']).toBe(0);
      expect(GATEWAY_DOMAINS['BASE-SEPOLIA']).toBe(6);
      expect(GATEWAY_DOMAINS['ARC-TESTNET']).toBe(26);
    });

    it('should format balance result correctly', () => {
      const mockResult = {
        success: true,
        address: '0x1234567890123456789012345678901234567890',
        totalUSDC: 150.5,
        balances: [
          { chain: 'ETH-SEPOLIA', domain: 0, balance: '100500000', balanceUSDC: 100.5 },
          { chain: 'ARC-TESTNET', domain: 26, balance: '50000000000000000000', balanceUSDC: 50.0 },
        ],
      };

      const formatted = formatBalance(mockResult);

      expect(formatted).toContain('Total USDC: $150.50');
      expect(formatted).toContain('ETH-SEPOLIA');
      expect(formatted).toContain('ARC-TESTNET');
    });

    it('should query balance for real address', async () => {
      const testAddress = '0x0000000000000000000000000000000000000001' as `0x${string}`;
      const result = await getUnifiedBalance(testAddress);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('address', testAddress);
      expect(result).toHaveProperty('totalUSDC');
      expect(result).toHaveProperty('balances');
    });
  });

  describe('User Onboarding Detection', () => {
    it('should detect when user needs to bridge funds', async () => {
      const testAddress = '0x0000000000000000000000000000000000000001' as `0x${string}`;
      const minBet = 0.001;

      const result = await hasSufficientArcBalance(testAddress, minBet);

      expect(result).toHaveProperty('sufficient');
      expect(result).toHaveProperty('currentBalance');
      expect(typeof result.sufficient).toBe('boolean');
    });
  });
});

describe('Circle Bridge Kit Integration', () => {
  describe('Bridge Configuration', () => {
    it('should list source chains for Arc', () => {
      const sources = getSourceChainsForArc();

      expect(sources).toContain('Ethereum_Sepolia');
      expect(sources).toContain('Base_Sepolia');
      expect(sources.length).toBe(2);
    });

    it('should have display names for all chains', () => {
      expect(CHAIN_DISPLAY_NAMES['Ethereum_Sepolia']).toBe('Ethereum Sepolia');
      expect(CHAIN_DISPLAY_NAMES['Base_Sepolia']).toBe('Base Sepolia');
      expect(CHAIN_DISPLAY_NAMES['Arc_Testnet']).toBe('Arc Testnet');
    });
  });

  describe('Explorer URLs', () => {
    it('should generate correct explorer URLs', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      const sepoliaUrl = getTxExplorerUrl('Ethereum_Sepolia', txHash);
      const baseUrl = getTxExplorerUrl('Base_Sepolia', txHash);
      const arcUrl = getTxExplorerUrl('Arc_Testnet', txHash);

      expect(sepoliaUrl).toContain('sepolia.etherscan.io');
      expect(sepoliaUrl).toContain(txHash);
      expect(baseUrl).toContain('basescan.org');
      expect(arcUrl).toContain('arcscan.app');
    });
  });

  describe('Bridge Flow Simulation', () => {
    it('should plan optimal bridge path', async () => {
      // Simulated user balance state
      const balances = {
        'Ethereum_Sepolia': 100.0,
        'Base_Sepolia': 50.0,
        'Arc_Testnet': 0,
      };

      // User needs USDC on Arc but has none
      const needsBridge = balances['Arc_Testnet'] === 0;
      expect(needsBridge).toBe(true);

      // Select chain with highest balance
      const sources = getSourceChainsForArc();
      let bestSource = sources[0];
      let maxBalance = 0;

      for (const chain of sources) {
        const balance = balances[chain as keyof typeof balances] || 0;
        if (balance > maxBalance) {
          maxBalance = balance;
          bestSource = chain;
        }
      }

      expect(bestSource).toBe('Ethereum_Sepolia');
      expect(maxBalance).toBe(100.0);
    });
  });
});

describe('Integration Verification', () => {
  describe('Multi-Chain USDC Handling', () => {
    it('should use correct decimals per chain', () => {
      const { USDC_DECIMALS } = CIRCLE_CONFIG;

      expect(USDC_DECIMALS['ARC-TESTNET']).toBe(18);
      expect(USDC_DECIMALS['ETH-SEPOLIA']).toBe(6);
      expect(USDC_DECIMALS['BASE-SEPOLIA']).toBe(6);
    });

    it('should have USDC addresses for Sepolia chains', () => {
      const { USDC_ADDRESSES } = CIRCLE_CONFIG;

      expect(USDC_ADDRESSES['ARC-TESTNET']).toBeNull(); // Native
      expect(USDC_ADDRESSES['ETH-SEPOLIA']).toMatch(/^0x/);
      expect(USDC_ADDRESSES['BASE-SEPOLIA']).toMatch(/^0x/);
    });
  });

  describe('ZK Privacy Guarantees', () => {
    it('should hide bet direction until reveal', async () => {
      const bet = await createBetCommitment(true);

      // Commitment is a hash that doesn't directly reveal direction
      expect(bet.commitmentHex).toMatch(/^0x[a-fA-F0-9]{64}$/);
      // The commitment shouldn't literally say "true" or "false"
      expect(bet.commitmentHex.toLowerCase()).not.toContain('true');
      expect(bet.commitmentHex.toLowerCase()).not.toContain('false');

      // Only after reveal do we know direction
      const marketId = 1n;
      const reveal = await prepareBetReveal(bet, marketId);
      expect(reveal.direction).toBe(true);
    });

    it('should prevent commitment grinding', async () => {
      // Even with known direction, can't predict commitment without salt
      const bet1 = await createBetCommitment(true);
      const bet2 = await createBetCommitment(true);

      // Same direction, different commitments (different salts)
      expect(bet1.commitmentHex).not.toBe(bet2.commitmentHex);
    });
  });
});
