/**
 * Formatting Utilities
 *
 * Helper functions for formatting values, dates, and strings
 */

import { ARC_CONSTANTS } from '../config/chains.js';

/**
 * Format USDC amount from wei (18 decimals) to human-readable
 *
 * @param amount - Amount in wei (18 decimals for native Arc USDC)
 * @param decimals - Display decimals (default 2)
 * @returns Formatted string (e.g., "1.50 USDC")
 */
export function formatUSDC(amount: bigint, decimals = 2): string {
  const divisor = 10n ** BigInt(ARC_CONSTANTS.NATIVE_DECIMALS);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  const fractionStr = fraction.toString().padStart(ARC_CONSTANTS.NATIVE_DECIMALS, '0');
  const displayFraction = fractionStr.slice(0, decimals);

  return `${whole}.${displayFraction} USDC`;
}

/**
 * Parse USDC amount from human-readable to wei
 *
 * @param amount - Amount in human-readable format (e.g., "1.5")
 * @returns Amount in wei (18 decimals)
 */
export function parseUSDC(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(ARC_CONSTANTS.NATIVE_DECIMALS, '0');
  const combined = whole + paddedFraction;
  return BigInt(combined);
}

/**
 * Format a timestamp to human-readable date
 */
export function formatDate(timestamp: number | Date): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : timestamp;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format time remaining until a deadline
 */
export function formatTimeRemaining(deadline: number | Date): string {
  const now = Date.now();
  const target = typeof deadline === 'number' ? deadline * 1000 : deadline.getTime();
  const diff = target - now;

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Truncate an Ethereum address for display
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a large number with abbreviations (K, M, B)
 */
export function formatNumber(num: number | bigint): string {
  const n = typeof num === 'bigint' ? Number(num) : num;

  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)}B`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toString();
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Calculate and format odds for a market
 */
export function formatOdds(yesAmount: bigint, noAmount: bigint): { yes: string; no: string } {
  const total = yesAmount + noAmount;
  if (total === 0n) {
    return { yes: '50.0%', no: '50.0%' };
  }

  const yesPercent = (Number(yesAmount) / Number(total)) * 100;
  const noPercent = (Number(noAmount) / Number(total)) * 100;

  return {
    yes: `${yesPercent.toFixed(1)}%`,
    no: `${noPercent.toFixed(1)}%`,
  };
}
