/**
 * ZK Bet Tests
 *
 * Tests for zero-knowledge bet commitment and reveal
 */

import { describe, it, expect } from 'vitest';
import {
  generateSalt,
  generateBetCommitment,
  generateBetCommitmentHex,
  generateNullifier,
  createBetCommitment,
  prepareBetReveal,
  formatProofForContract,
} from '../../utils/zk/index.js';

describe('ZK Salt Generation', () => {
  it('should generate a 256-bit random salt', () => {
    const salt = generateSalt();

    expect(typeof salt).toBe('bigint');
    expect(salt).toBeGreaterThan(0n);
    // Should be less than 2^256
    expect(salt).toBeLessThan(2n ** 256n);
  });

  it('should generate unique salts', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const salt3 = generateSalt();

    expect(salt1).not.toBe(salt2);
    expect(salt2).not.toBe(salt3);
    expect(salt1).not.toBe(salt3);
  });
});

describe('ZK Bet Commitment', () => {
  it('should generate commitment for YES bet', async () => {
    const salt = generateSalt();
    const commitment = await generateBetCommitment(true, salt);

    expect(typeof commitment).toBe('bigint');
    expect(commitment).toBeGreaterThan(0n);
  });

  it('should generate commitment for NO bet', async () => {
    const salt = generateSalt();
    const commitment = await generateBetCommitment(false, salt);

    expect(typeof commitment).toBe('bigint');
    expect(commitment).toBeGreaterThan(0n);
  });

  it('should generate different commitments for same direction with different salts', async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    const commitment1 = await generateBetCommitment(true, salt1);
    const commitment2 = await generateBetCommitment(true, salt2);

    expect(commitment1).not.toBe(commitment2);
  });

  it('should generate different commitments for different directions with same salt', async () => {
    const salt = generateSalt();

    const commitmentYes = await generateBetCommitment(true, salt);
    const commitmentNo = await generateBetCommitment(false, salt);

    expect(commitmentYes).not.toBe(commitmentNo);
  });

  it('should generate consistent commitment for same inputs', async () => {
    const salt = 12345678901234567890n;

    const commitment1 = await generateBetCommitment(true, salt);
    const commitment2 = await generateBetCommitment(true, salt);

    expect(commitment1).toBe(commitment2);
  });
});

describe('ZK Commitment Hex Format', () => {
  it('should generate valid hex commitment', async () => {
    const salt = generateSalt();
    const commitmentHex = await generateBetCommitmentHex(true, salt);

    expect(commitmentHex).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('should pad short hashes to 64 characters', async () => {
    const salt = 1n; // Small salt that might produce short hash
    const commitmentHex = await generateBetCommitmentHex(true, salt);

    // Should always be 0x + 64 hex chars
    expect(commitmentHex.length).toBe(66);
  });
});

describe('ZK Nullifier Generation', () => {
  it('should generate nullifier for a bet', async () => {
    const salt = generateSalt();
    const marketId = 1n;

    const nullifier = await generateNullifier(salt, marketId);

    expect(typeof nullifier).toBe('bigint');
    expect(nullifier).toBeGreaterThan(0n);
  });

  it('should generate different nullifiers for different markets', async () => {
    const salt = generateSalt();

    const nullifier1 = await generateNullifier(salt, 1n);
    const nullifier2 = await generateNullifier(salt, 2n);

    expect(nullifier1).not.toBe(nullifier2);
  });

  it('should generate different nullifiers for different salts', async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const marketId = 1n;

    const nullifier1 = await generateNullifier(salt1, marketId);
    const nullifier2 = await generateNullifier(salt2, marketId);

    expect(nullifier1).not.toBe(nullifier2);
  });

  it('should generate consistent nullifier for same inputs', async () => {
    const salt = 12345678901234567890n;
    const marketId = 42n;

    const nullifier1 = await generateNullifier(salt, marketId);
    const nullifier2 = await generateNullifier(salt, marketId);

    expect(nullifier1).toBe(nullifier2);
  });
});

describe('Bet Commitment Workflow', () => {
  it('should create full bet commitment data', async () => {
    const data = await createBetCommitment(true);

    expect(data.direction).toBe(true);
    expect(typeof data.salt).toBe('bigint');
    expect(typeof data.commitment).toBe('bigint');
    expect(data.commitmentHex).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('should prepare bet reveal data', async () => {
    const commitmentData = await createBetCommitment(false);
    const marketId = 123n;

    const revealData = await prepareBetReveal(commitmentData, marketId, false);

    expect(revealData.direction).toBe(false);
    expect(revealData.marketId).toBe(marketId);
    expect(typeof revealData.nullifier).toBe('bigint');
    expect(revealData.nullifierHex).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });
});

describe('Proof Formatting', () => {
  it('should format mock proof for contract', () => {
    const mockProof = {
      pi_a: ['1', '2', '1'],
      pi_b: [['3', '4'], ['5', '6'], ['1', '1']],
      pi_c: ['7', '8', '1'],
      protocol: 'groth16',
      curve: 'bn128',
    };
    const mockSignals = ['100', '200'];

    const formatted = formatProofForContract(mockProof as any, mockSignals);

    // Check pA format
    expect(formatted.pA).toHaveLength(2);
    expect(formatted.pA[0]).toBe(1n);
    expect(formatted.pA[1]).toBe(2n);

    // Check pB format (coordinates reversed)
    expect(formatted.pB).toHaveLength(2);
    expect(formatted.pB[0]).toEqual([4n, 3n]);
    expect(formatted.pB[1]).toEqual([6n, 5n]);

    // Check pC format
    expect(formatted.pC).toHaveLength(2);
    expect(formatted.pC[0]).toBe(7n);
    expect(formatted.pC[1]).toBe(8n);

    // Check public inputs
    expect(formatted.publicInputs).toEqual([100n, 200n]);
  });
});
