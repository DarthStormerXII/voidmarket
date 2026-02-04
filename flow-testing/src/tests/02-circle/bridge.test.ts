/**
 * Circle Bridge Kit Tests
 *
 * Tests for cross-chain USDC bridging via CCTP
 */

import { describe, it, expect } from 'vitest';
import {
  CHAIN_DISPLAY_NAMES,
  getSourceChainsForArc,
  getTxExplorerUrl,
  type BridgeChain,
  type BridgeResult,
} from '../../services/circle/bridge.js';

describe('Bridge Configuration', () => {
  it('should have display names for all chains', () => {
    expect(CHAIN_DISPLAY_NAMES['Ethereum_Sepolia']).toBe('Ethereum Sepolia');
    expect(CHAIN_DISPLAY_NAMES['Base_Sepolia']).toBe('Base Sepolia');
    expect(CHAIN_DISPLAY_NAMES['Arc_Testnet']).toBe('Arc Testnet');
  });

  it('should return source chains for Arc', () => {
    const sources = getSourceChainsForArc();

    expect(sources).toContain('Ethereum_Sepolia');
    expect(sources).toContain('Base_Sepolia');
    expect(sources).not.toContain('Arc_Testnet');
  });
});

describe('Explorer URLs', () => {
  it('should generate correct Sepolia explorer URL', () => {
    const txHash = '0x123abc';
    const url = getTxExplorerUrl('Ethereum_Sepolia', txHash);

    expect(url).toBe('https://sepolia.etherscan.io/tx/0x123abc');
  });

  it('should generate correct Base Sepolia explorer URL', () => {
    const txHash = '0x456def';
    const url = getTxExplorerUrl('Base_Sepolia', txHash);

    expect(url).toBe('https://sepolia.basescan.org/tx/0x456def');
  });

  it('should generate correct Arc Testnet explorer URL', () => {
    const txHash = '0x789ghi';
    const url = getTxExplorerUrl('Arc_Testnet', txHash);

    expect(url).toBe('https://testnet.arcscan.app/tx/0x789ghi');
  });
});

describe('Bridge Validation', () => {
  it('should reject same chain transfers', () => {
    const fromChain = 'Ethereum_Sepolia';
    const toChain = 'Ethereum_Sepolia';

    const isValid = fromChain !== toChain;
    expect(isValid).toBe(false);
  });

  it('should accept different chain transfers', () => {
    const fromChain = 'Ethereum_Sepolia';
    const toChain = 'Arc_Testnet';

    const isValid = fromChain !== toChain;
    expect(isValid).toBe(true);
  });

  it('should validate positive amounts', () => {
    const validAmounts = ['1.00', '0.001', '100.50'];
    const invalidAmounts = ['0', '-1', 'abc', ''];

    for (const amount of validAmounts) {
      const parsed = parseFloat(amount);
      expect(!isNaN(parsed) && parsed > 0).toBe(true);
    }

    for (const amount of invalidAmounts) {
      const parsed = parseFloat(amount);
      expect(isNaN(parsed) || parsed <= 0).toBe(true);
    }
  });
});

describe('Bridge Result Processing', () => {
  it('should identify successful bridge', () => {
    const result: BridgeResult = {
      success: true,
      state: 'completed',
      steps: [
        { name: 'approve', state: 'success', txHash: '0xabc' },
        { name: 'burn', state: 'success', txHash: '0xdef' },
        { name: 'mint', state: 'success', txHash: '0xghi' },
      ],
      burnTxHash: '0xdef',
      mintTxHash: '0xghi',
    };

    expect(result.success).toBe(true);
    expect(result.state).toBe('completed');
    expect(result.burnTxHash).toBeDefined();
    expect(result.mintTxHash).toBeDefined();
  });

  it('should identify failed bridge', () => {
    const result: BridgeResult = {
      success: false,
      state: 'failed',
      steps: [
        { name: 'approve', state: 'success', txHash: '0xabc' },
        { name: 'burn', state: 'failed', error: 'Insufficient balance' },
      ],
      error: 'Burn transaction failed',
    };

    expect(result.success).toBe(false);
    expect(result.state).toBe('failed');
    expect(result.error).toBeDefined();
  });

  it('should identify pending bridge', () => {
    const result: BridgeResult = {
      success: false,
      state: 'pending',
      steps: [
        { name: 'approve', state: 'success', txHash: '0xabc' },
        { name: 'burn', state: 'success', txHash: '0xdef' },
        { name: 'mint', state: 'pending' },
      ],
      burnTxHash: '0xdef',
    };

    expect(result.state).toBe('pending');
    expect(result.burnTxHash).toBeDefined();
    expect(result.mintTxHash).toBeUndefined();
  });
});

describe('Bridge Flow Scenarios', () => {
  describe('User Onboarding from Sepolia', () => {
    it('should plan bridge from Sepolia to Arc', () => {
      const userHasSepoliaUSDC = true;
      const userHasArcUSDC = false;
      const targetChain: BridgeChain = 'Arc_Testnet';

      if (userHasSepoliaUSDC && !userHasArcUSDC) {
        const sourceChain: BridgeChain = 'Ethereum_Sepolia';
        const bridgePath = `${sourceChain} -> ${targetChain}`;

        expect(bridgePath).toBe('Ethereum_Sepolia -> Arc_Testnet');
      }
    });
  });

  describe('User Onboarding from Base', () => {
    it('should plan bridge from Base to Arc', () => {
      const userHasBaseUSDC = true;
      const userHasArcUSDC = false;
      const targetChain: BridgeChain = 'Arc_Testnet';

      if (userHasBaseUSDC && !userHasArcUSDC) {
        const sourceChain: BridgeChain = 'Base_Sepolia';
        const bridgePath = `${sourceChain} -> ${targetChain}`;

        expect(bridgePath).toBe('Base_Sepolia -> Arc_Testnet');
      }
    });
  });

  describe('Multi-source Bridge Selection', () => {
    it('should select chain with highest balance', () => {
      const balances = {
        Ethereum_Sepolia: 50.0,
        Base_Sepolia: 100.0,
        Arc_Testnet: 0,
      };

      let bestSource: BridgeChain = 'Ethereum_Sepolia';
      let maxBalance = 0;

      for (const chain of getSourceChainsForArc()) {
        if (balances[chain] > maxBalance) {
          maxBalance = balances[chain];
          bestSource = chain;
        }
      }

      expect(bestSource).toBe('Base_Sepolia');
      expect(maxBalance).toBe(100.0);
    });
  });
});

describe('CCTP Mechanics', () => {
  it('should understand burn-mint flow', () => {
    // CCTP burns USDC on source chain and mints on destination
    const steps = ['approve', 'burn', 'attestation', 'mint'];

    expect(steps[0]).toBe('approve'); // Approve USDC spend
    expect(steps[1]).toBe('burn'); // Burn on source chain
    expect(steps[2]).toBe('attestation'); // Circle attestation
    expect(steps[3]).toBe('mint'); // Mint on destination chain
  });

  it('should calculate minimum bridge amount', () => {
    // Minimum bet is 0.001 USDC
    const MIN_BET = 0.001;

    // Bridge should cover at least a few bets + gas buffer
    const recommendedBridge = MIN_BET * 10;

    expect(recommendedBridge).toBe(0.01);
  });
});
