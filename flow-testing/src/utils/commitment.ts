/**
 * Commitment Hash Utilities
 *
 * ZK-like commitment scheme for hidden bet directions
 * Users commit to keccak256(direction, salt) then reveal after market closes
 */

import { keccak256, encodePacked, type Hex } from 'viem';
import { randomBytes } from 'crypto';

export interface BetCommitment {
  direction: boolean; // true = YES, false = NO
  salt: Hex;
  commitmentHash: Hex;
}

/**
 * Generate a random 32-byte salt
 */
export function generateSalt(): Hex {
  return `0x${randomBytes(32).toString('hex')}` as Hex;
}

/**
 * Generate a commitment hash for a bet direction
 *
 * @param direction - Bet direction (true = YES, false = NO)
 * @param salt - Random 32-byte salt
 * @returns Commitment hash
 */
export function generateCommitment(direction: boolean, salt: Hex): Hex {
  // Matches Solidity: keccak256(abi.encodePacked(direction, salt))
  return keccak256(encodePacked(['bool', 'bytes32'], [direction, salt]));
}

/**
 * Create a new bet commitment with random salt
 *
 * @param direction - Bet direction (true = YES, false = NO)
 * @returns Complete commitment data (save the salt for reveal!)
 */
export function createBetCommitment(direction: boolean): BetCommitment {
  const salt = generateSalt();
  const commitmentHash = generateCommitment(direction, salt);

  return {
    direction,
    salt,
    commitmentHash,
  };
}

/**
 * Verify a commitment matches the expected values
 *
 * @param commitmentHash - The stored commitment hash
 * @param direction - The revealed direction
 * @param salt - The revealed salt
 * @returns True if commitment is valid
 */
export function verifyCommitment(
  commitmentHash: Hex,
  direction: boolean,
  salt: Hex
): boolean {
  const expectedHash = generateCommitment(direction, salt);
  return commitmentHash.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Serialize commitment data for storage
 */
export function serializeCommitment(commitment: BetCommitment): string {
  return JSON.stringify({
    direction: commitment.direction,
    salt: commitment.salt,
    commitmentHash: commitment.commitmentHash,
  });
}

/**
 * Deserialize commitment data from storage
 */
export function deserializeCommitment(data: string): BetCommitment {
  const parsed = JSON.parse(data);
  return {
    direction: parsed.direction,
    salt: parsed.salt as Hex,
    commitmentHash: parsed.commitmentHash as Hex,
  };
}

/**
 * Encode commitment data for secure storage (e.g., encrypted in DB)
 * The salt MUST be kept secret until reveal time
 */
export function encodeCommitmentSecret(direction: boolean, salt: Hex): string {
  return Buffer.from(
    JSON.stringify({ d: direction, s: salt })
  ).toString('base64');
}

/**
 * Decode commitment secret from storage
 */
export function decodeCommitmentSecret(encoded: string): { direction: boolean; salt: Hex } {
  const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  return {
    direction: decoded.d,
    salt: decoded.s as Hex,
  };
}
