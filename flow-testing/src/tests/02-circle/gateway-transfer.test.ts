/**
 * Gateway Cross-Chain Transfer Tests
 *
 * Tests for USDC transfers via Circle Gateway API across all 8 EVM chains.
 * Uses EIP-712 burn intents for chain-abstracted transfers.
 *
 * Note: Solana is excluded as it requires different handling.
 */

import { describe, it, expect } from 'vitest';
import {
  GATEWAY_DOMAINS,
  DOMAIN_TO_CHAIN,
  CHAIN_CONFIG,
  GATEWAY_CONTRACTS,
  addressToBytes32,
  generateSalt,
  formatAmountForChain,
  parseAmountForChain,
  getExplorerTxUrl,
  validateMinimumAmount,
  getChainByDomain,
  getEVMChains,
  getChainsToArc,
  getChainsFromArc,
  type GatewayChainId,
  type EVMGatewayChainId,
} from '../../services/circle/gateway-transfer.js';

describe('Gateway Transfer Configuration', () => {
  describe('Domain IDs', () => {
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

    it('should support exactly 9 chains', () => {
      const chains = Object.keys(GATEWAY_DOMAINS);
      expect(chains).toHaveLength(9);
    });

    it('should have reverse lookup for all domains', () => {
      for (const [chain, domain] of Object.entries(GATEWAY_DOMAINS)) {
        expect(DOMAIN_TO_CHAIN[domain]).toBe(chain);
      }
    });
  });

  describe('Chain Configuration', () => {
    it('should have config for all 8 EVM chains', () => {
      const chains = Object.keys(CHAIN_CONFIG);
      expect(chains).toHaveLength(8); // Excludes Solana
    });

    it('should have correct decimals for each EVM chain', () => {
      // All EVM chains use 6 decimals (including Arc ERC-20 interface)
      for (const chain of Object.keys(CHAIN_CONFIG)) {
        expect(CHAIN_CONFIG[chain as EVMGatewayChainId].decimals).toBe(6);
      }
    });

    it('should have valid chain IDs for EVM chains', () => {
      expect(CHAIN_CONFIG['ETH-SEPOLIA'].chainId).toBe(11155111);
      expect(CHAIN_CONFIG['BASE-SEPOLIA'].chainId).toBe(84532);
      expect(CHAIN_CONFIG['ARC-TESTNET'].chainId).toBe(5042002);
      expect(CHAIN_CONFIG['AVALANCHE-FUJI'].chainId).toBe(43113);
      expect(CHAIN_CONFIG['SONIC-TESTNET'].chainId).toBe(64165);
      expect(CHAIN_CONFIG['WORLD-CHAIN-SEPOLIA'].chainId).toBe(4801);
      expect(CHAIN_CONFIG['SEI-ATLANTIC'].chainId).toBe(1328);
      expect(CHAIN_CONFIG['HYPEREVM-TESTNET'].chainId).toBe(998);
    });

    it('should have USDC addresses for all EVM chains', () => {
      for (const chain of Object.keys(CHAIN_CONFIG)) {
        const config = CHAIN_CONFIG[chain as EVMGatewayChainId];
        expect(config.usdc).toBeDefined();
        expect(config.usdc).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    });

    it('should have correct Arc USDC address', () => {
      expect(CHAIN_CONFIG['ARC-TESTNET'].usdc).toBe(
        '0x3600000000000000000000000000000000000000'
      );
    });

    it('should have RPC URLs for all chains', () => {
      for (const chain of Object.keys(CHAIN_CONFIG)) {
        const config = CHAIN_CONFIG[chain as EVMGatewayChainId];
        expect(config.rpc).toBeDefined();
        expect(config.rpc).toMatch(/^https?:\/\//);
      }
    });

    it('should have explorer URLs for all chains', () => {
      for (const chain of Object.keys(CHAIN_CONFIG)) {
        const config = CHAIN_CONFIG[chain as EVMGatewayChainId];
        expect(config.explorerUrl).toBeDefined();
        expect(config.explorerUrl).toMatch(/^https?:\/\//);
      }
    });
  });

  describe('Gateway Contracts', () => {
    it('should have correct wallet contract address', () => {
      expect(GATEWAY_CONTRACTS.WALLET).toBe(
        '0x0077777d7EBA4688BDeF3E311b846F25870A19B9'
      );
    });

    it('should have correct minter contract address', () => {
      expect(GATEWAY_CONTRACTS.MINTER).toBe(
        '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B'
      );
    });
  });
});

describe('Utility Functions', () => {
  describe('addressToBytes32', () => {
    it('should pad address to 32 bytes', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const result = addressToBytes32(address as `0x${string}`);
      expect(result).toHaveLength(66); // 0x + 64 hex chars
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('should lowercase the address', () => {
      const address = '0xABCD1234567890123456789012345678901234AB';
      const result = addressToBytes32(address as `0x${string}`);
      expect(result.toLowerCase()).toBe(result);
    });
  });

  describe('generateSalt', () => {
    it('should generate unique salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toBe(salt2);
    });

    it('should generate valid hex salt', () => {
      const salt = generateSalt();
      expect(salt).toHaveLength(66); // 0x + 64 hex chars
      expect(salt).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });
});

describe('Amount Formatting', () => {
  describe('formatAmountForChain', () => {
    it('should format 6-decimal amounts correctly', () => {
      expect(formatAmountForChain(10500000n, 'ETH-SEPOLIA')).toBe('10.5');
      expect(formatAmountForChain(1000000n, 'BASE-SEPOLIA')).toBe('1');
      expect(formatAmountForChain(1000n, 'AVALANCHE-FUJI')).toBe('0.001');
    });

    it('should format Arc amounts correctly (6 decimals)', () => {
      expect(formatAmountForChain(10500000n, 'ARC-TESTNET')).toBe('10.5');
    });

    it('should handle zero amount', () => {
      expect(formatAmountForChain(0n, 'ETH-SEPOLIA')).toBe('0');
    });

    it('should handle minimum bet amount', () => {
      // 0.001 USDC = 1000 with 6 decimals
      expect(formatAmountForChain(1000n, 'ETH-SEPOLIA')).toBe('0.001');
    });
  });

  describe('parseAmountForChain', () => {
    it('should parse 6-decimal amounts correctly', () => {
      expect(parseAmountForChain('10.5', 'ETH-SEPOLIA')).toBe(10500000n);
      expect(parseAmountForChain('1', 'BASE-SEPOLIA')).toBe(1000000n);
    });

    it('should parse Arc amounts correctly (6 decimals)', () => {
      expect(parseAmountForChain('10.5', 'ARC-TESTNET')).toBe(10500000n);
    });

    it('should handle minimum bet amount', () => {
      expect(parseAmountForChain('0.001', 'ETH-SEPOLIA')).toBe(1000n);
    });
  });
});

describe('Transfer Validation', () => {
  describe('validateMinimumAmount', () => {
    it('should accept amounts >= 0.001', () => {
      expect(validateMinimumAmount('0.001')).toBe(true);
      expect(validateMinimumAmount('0.01')).toBe(true);
      expect(validateMinimumAmount('1')).toBe(true);
      expect(validateMinimumAmount('100')).toBe(true);
    });

    it('should reject amounts < 0.001', () => {
      expect(validateMinimumAmount('0.0009')).toBe(false);
      expect(validateMinimumAmount('0.0001')).toBe(false);
      expect(validateMinimumAmount('0')).toBe(false);
    });

    it('should reject invalid amounts', () => {
      expect(validateMinimumAmount('')).toBe(false);
      expect(validateMinimumAmount('abc')).toBe(false);
      expect(validateMinimumAmount('-1')).toBe(false);
    });
  });
});

describe('Chain Helpers', () => {
  describe('getEVMChains', () => {
    it('should return 8 EVM chains (excludes Solana)', () => {
      const chains = getEVMChains();
      expect(chains).toHaveLength(8);
      expect(chains).not.toContain('SOLANA-DEVNET');
    });

    it('should include all EVM chains', () => {
      const chains = getEVMChains();
      expect(chains).toContain('ETH-SEPOLIA');
      expect(chains).toContain('BASE-SEPOLIA');
      expect(chains).toContain('ARC-TESTNET');
      expect(chains).toContain('AVALANCHE-FUJI');
      expect(chains).toContain('SONIC-TESTNET');
      expect(chains).toContain('WORLD-CHAIN-SEPOLIA');
      expect(chains).toContain('SEI-ATLANTIC');
      expect(chains).toContain('HYPEREVM-TESTNET');
    });
  });

  describe('getChainsToArc', () => {
    it('should return 7 chains that can transfer to Arc', () => {
      const chains = getChainsToArc();
      expect(chains).toHaveLength(7);
      expect(chains).not.toContain('ARC-TESTNET');
    });
  });

  describe('getChainsFromArc', () => {
    it('should return 7 chains that can receive from Arc', () => {
      const chains = getChainsFromArc();
      expect(chains).toHaveLength(7);
      expect(chains).not.toContain('ARC-TESTNET');
    });
  });

  describe('getChainByDomain', () => {
    it('should return correct config for valid EVM domains', () => {
      const ethConfig = getChainByDomain(0);
      expect(ethConfig).toBeDefined();
      expect(ethConfig!.chainId).toBe(11155111);

      const arcConfig = getChainByDomain(26);
      expect(arcConfig).toBeDefined();
      expect(arcConfig!.chainId).toBe(5042002);
    });

    it('should return undefined for invalid domains', () => {
      expect(getChainByDomain(999)).toBeUndefined();
    });

    it('should return undefined for Solana domain', () => {
      expect(getChainByDomain(5)).toBeUndefined();
    });
  });
});

describe('Explorer URLs', () => {
  it('should generate correct explorer URLs', () => {
    const txHash = '0x1234567890abcdef';

    expect(getExplorerTxUrl('ETH-SEPOLIA', txHash)).toBe(
      `https://sepolia.etherscan.io/tx/${txHash}`
    );

    expect(getExplorerTxUrl('BASE-SEPOLIA', txHash)).toBe(
      `https://sepolia.basescan.org/tx/${txHash}`
    );

    expect(getExplorerTxUrl('ARC-TESTNET', txHash)).toBe(
      `https://testnet.arcscan.app/tx/${txHash}`
    );
  });
});

describe('Cross-Chain Transfer Scenarios', () => {
  describe('Transfers TO Arc', () => {
    const chainsToArc = getChainsToArc();

    for (const sourceChain of chainsToArc) {
      it(`should support ${sourceChain} → ARC-TESTNET`, () => {
        const sourceConfig = CHAIN_CONFIG[sourceChain];
        const destConfig = CHAIN_CONFIG['ARC-TESTNET'];

        // Verify both configs exist
        expect(sourceConfig).toBeDefined();
        expect(destConfig).toBeDefined();

        // Verify domains are different
        expect(GATEWAY_DOMAINS[sourceChain]).not.toBe(
          GATEWAY_DOMAINS['ARC-TESTNET']
        );
      });
    }
  });

  describe('Transfers FROM Arc', () => {
    const chainsFromArc = getChainsFromArc();

    for (const destChain of chainsFromArc) {
      it(`should support ARC-TESTNET → ${destChain}`, () => {
        const sourceConfig = CHAIN_CONFIG['ARC-TESTNET'];
        const destConfig = CHAIN_CONFIG[destChain];

        // Verify both configs exist
        expect(sourceConfig).toBeDefined();
        expect(destConfig).toBeDefined();

        // Verify domains are different
        expect(GATEWAY_DOMAINS['ARC-TESTNET']).not.toBe(
          GATEWAY_DOMAINS[destChain]
        );
      });
    }
  });
});
