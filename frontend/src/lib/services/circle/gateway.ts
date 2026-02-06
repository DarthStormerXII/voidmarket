/**
 * Circle Gateway API Integration
 *
 * Provides unified USDC balance abstraction across multiple chains.
 * This allows users to see their total USDC across Arc and other chains.
 */

import type { Address } from 'viem';

// Gateway API Base URL
const GATEWAY_API_TESTNET = 'https://gateway-api-testnet.circle.com';

// Domain IDs for supported EVM chains
export const GATEWAY_DOMAINS = {
  'ETH-SEPOLIA': 0,
  'BASE-SEPOLIA': 6,
  'ARC-TESTNET': 26,
} as const;

// Reverse lookup
const DOMAIN_TO_CHAIN: Record<number, string> = {
  0: 'ETH-SEPOLIA',
  6: 'BASE-SEPOLIA',
  26: 'ARC-TESTNET',
};

// Chain decimals for proper balance formatting
const CHAIN_DECIMALS: Record<string, number> = {
  'ETH-SEPOLIA': 6,
  'BASE-SEPOLIA': 6,
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

/**
 * Get unified USDC balance across all supported EVM chains
 *
 * @param address - User's wallet address (same across all chains with Circle)
 * @returns Unified balance result with breakdown per chain
 */
export async function getUnifiedBalance(address: Address): Promise<UnifiedBalanceResult> {
  try {
    const domains = Object.values(GATEWAY_DOMAINS);

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
