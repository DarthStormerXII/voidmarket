/**
 * Commitment Scheme for Hidden Bets
 *
 * Bets are hidden using a commit-reveal scheme:
 * 1. User generates a random salt
 * 2. commitmentHash = keccak256(abi.encodePacked(direction, salt))
 * 3. User submits commitmentHash with their bet (direction is hidden)
 * 4. After market resolves, user reveals direction + salt to claim winnings
 *
 * Salts are stored in browser localStorage for later reveal.
 */

import { keccak256, encodePacked, type Hex } from 'viem';

export interface StoredCommitment {
  marketId: string;
  betId: string;
  direction: boolean; // true = YES, false = NO
  salt: Hex;
  commitmentHash: Hex;
  timestamp: number;
}

const STORAGE_KEY = 'voidmarket_commitments';

/**
 * Generate a random 32-byte salt
 */
export function generateSalt(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as Hex;
}

/**
 * Generate a commitment hash from direction and salt
 * Must match the contract's generateCommitment(bool, bytes32) function
 */
export function generateCommitment(direction: boolean, salt: Hex): Hex {
  return keccak256(encodePacked(['bool', 'bytes32'], [direction, salt]));
}

/**
 * Store a bet commitment in localStorage
 */
export function storeBetCommitment(
  marketId: string,
  betId: string,
  direction: boolean,
  salt: Hex
): void {
  const commitments = getAllCommitments();
  const commitmentHash = generateCommitment(direction, salt);

  commitments.push({
    marketId,
    betId,
    direction,
    salt,
    commitmentHash,
    timestamp: Date.now(),
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commitments));
  }
}

/**
 * Get a stored commitment by bet ID
 */
export function getBetCommitment(betId: string): StoredCommitment | null {
  const commitments = getAllCommitments();
  return commitments.find(c => c.betId === betId) || null;
}

/**
 * Get all commitments for a specific market
 */
export function getMarketCommitments(marketId: string): StoredCommitment[] {
  const commitments = getAllCommitments();
  return commitments.filter(c => c.marketId === marketId);
}

/**
 * Get all stored commitments
 */
export function getAllCommitments(): StoredCommitment[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a commitment after successful reveal
 */
export function removeCommitment(betId: string): void {
  const commitments = getAllCommitments().filter(c => c.betId !== betId);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commitments));
  }
}
