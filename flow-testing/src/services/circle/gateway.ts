/**
 * Circle Gateway API Integration
 *
 * Provides unified USDC balance abstraction across multiple chains.
 * This allows users to see their total USDC across Arc, ETH Sepolia, and Base Sepolia.
 *
 * Value: Single API call to show user's total cross-chain USDC balance
 */

import type { Address } from 'viem';

// Gateway API Base URL
const GATEWAY_API_TESTNET = 'https://gateway-api-testnet.circle.com';

// Domain IDs for all 9 supported testnet chains
export const GATEWAY_DOMAINS = {
  'ETH-SEPOLIA': 0,
  'AVALANCHE-FUJI': 1,
  'SOLANA-DEVNET': 5,
  'BASE-SEPOLIA': 6,
  'SONIC-TESTNET': 13,
  'WORLD-CHAIN-SEPOLIA': 14,
  'SEI-ATLANTIC': 16,
  'HYPEREVM-TESTNET': 19,
  'ARC-TESTNET': 26,
} as const;

// Reverse lookup
const DOMAIN_TO_CHAIN: Record<number, string> = {
  0: 'ETH-SEPOLIA',
  1: 'AVALANCHE-FUJI',
  5: 'SOLANA-DEVNET',
  6: 'BASE-SEPOLIA',
  13: 'SONIC-TESTNET',
  14: 'WORLD-CHAIN-SEPOLIA',
  16: 'SEI-ATLANTIC',
  19: 'HYPEREVM-TESTNET',
  26: 'ARC-TESTNET',
};

// Chain decimals for proper balance formatting
const CHAIN_DECIMALS: Record<string, number> = {
  'ETH-SEPOLIA': 6,
  'AVALANCHE-FUJI': 6,
  'SOLANA-DEVNET': 6,
  'BASE-SEPOLIA': 6,
  'SONIC-TESTNET': 6,
  'WORLD-CHAIN-SEPOLIA': 6,
  'SEI-ATLANTIC': 6,
  'HYPEREVM-TESTNET': 6,
  'ARC-TESTNET': 18,
};

export interface ChainBalance {
  chain: string;
  domain: number;
  balance: string;
  balanceUSDC: number;
}

export interface UnifiedBalanceResult {
  success: boolean;
  address: string;
  totalUSDC: number;
  balances: ChainBalance[];
  error?: string;
}

// EVM-only domains (excludes Solana which requires different address format)
export const EVM_GATEWAY_DOMAINS = {
  'ETH-SEPOLIA': 0,
  'AVALANCHE-FUJI': 1,
  'BASE-SEPOLIA': 6,
  'SONIC-TESTNET': 13,
  'WORLD-CHAIN-SEPOLIA': 14,
  'SEI-ATLANTIC': 16,
  'HYPEREVM-TESTNET': 19,
  'ARC-TESTNET': 26,
} as const;

/**
 * Get unified USDC balance across all supported EVM chains
 *
 * @param address - User's wallet address (same across all chains with Circle)
 * @param evmOnly - If true, only query EVM chains (default: true for EVM addresses)
 * @returns Unified balance result with breakdown per chain
 */
export async function getUnifiedBalance(address: Address, evmOnly: boolean = true): Promise<UnifiedBalanceResult> {
  try {
    // Query EVM chains only by default (Solana requires different address format)
    const domainsToQuery = evmOnly ? EVM_GATEWAY_DOMAINS : GATEWAY_DOMAINS;
    const domains = Object.values(domainsToQuery);

    const sources = domains.map((domain) => ({
      domain,
      depositor: address,
    }));

    const response = await fetch(`${GATEWAY_API_TESTNET}/v1/balances`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: 'USDC',
        sources,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        address,
        totalUSDC: 0,
        balances: [],
        error: `Gateway API error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json() as
      | { domain: number; balance: string }[]
      | { balances: { domain: number; balance: string }[] };

    // Parse balances - Gateway returns array directly or { balances: [] }
    const rawBalances = Array.isArray(data) ? data : data.balances || [];

    // Convert to ChainBalance format with proper decimal handling
    const balances: ChainBalance[] = rawBalances.map(
      (b: { domain: number; balance: string; depositor?: string }) => {
        const chain = DOMAIN_TO_CHAIN[b.domain] || `Unknown (${b.domain})`;
        // Gateway API returns balance as formatted decimal string (e.g., "0.010000")
        // NOT as smallest unit, so parse directly
        const balanceUSDC = parseFloat(b.balance);

        return {
          chain,
          domain: b.domain,
          balance: b.balance,
          balanceUSDC,
        };
      }
    );

    // Calculate total
    const totalUSDC = balances.reduce((sum, b) => sum + b.balanceUSDC, 0);

    return {
      success: true,
      address,
      totalUSDC,
      balances,
    };
  } catch (error) {
    return {
      success: false,
      address,
      totalUSDC: 0,
      balances: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format balance for display
 */
export function formatBalance(balance: UnifiedBalanceResult): string {
  if (!balance.success) {
    return `Error: ${balance.error}`;
  }

  const lines = [`Total USDC: $${balance.totalUSDC.toFixed(2)}`, ''];

  for (const b of balance.balances) {
    lines.push(`  ${b.chain}: $${b.balanceUSDC.toFixed(2)}`);
  }

  return lines.join('\n');
}

/**
 * Check if user has sufficient balance on Arc for betting
 */
export async function hasSufficientArcBalance(
  address: Address,
  requiredAmount: number
): Promise<{ sufficient: boolean; currentBalance: number; error?: string }> {
  const result = await getUnifiedBalance(address);

  if (!result.success) {
    return { sufficient: false, currentBalance: 0, error: result.error };
  }

  const arcBalance = result.balances.find((b) => b.chain === 'ARC-TESTNET');
  const currentBalance = arcBalance?.balanceUSDC || 0;

  return {
    sufficient: currentBalance >= requiredAmount,
    currentBalance,
  };
}
