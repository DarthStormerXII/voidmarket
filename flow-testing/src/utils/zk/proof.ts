/**
 * ZK Proof Generation Utilities
 *
 * Client-side proof generation for VoidMarket hidden bets
 * Uses Poseidon hash and Groth16 proving system when available,
 * falls back to keccak256 for testing when ZK deps not installed.
 *
 * Pattern adapted from zk-arsenal/01-circom
 */

import { randomBytes } from 'crypto';
import { keccak256, encodePacked } from 'viem';
import path from 'path';

// Try to import ZK dependencies
let buildPoseidon: any = null;
let groth16: any = null;
let zkAvailable = false;

try {
  // Dynamic imports for optional ZK dependencies
  const circomlibjs = await import('circomlibjs');
  const snarkjs = await import('snarkjs');
  buildPoseidon = circomlibjs.buildPoseidon;
  groth16 = snarkjs.groth16;
  zkAvailable = true;
} catch {
  // ZK dependencies not available, use fallback
  zkAvailable = false;
}

// Circuit paths (relative to project root)
const CIRCUITS_PATH = path.join(process.cwd(), '..', 'contracts', 'circuits', 'build');

// Poseidon instance (lazily initialized)
let poseidonInstance: any = null;

/**
 * Check if ZK proofs are available
 */
export function isZkAvailable(): boolean {
  return zkAvailable;
}

/**
 * Initialize Poseidon hasher
 */
async function getPoseidon(): Promise<any> {
  if (!zkAvailable) {
    throw new Error('Poseidon not available - circomlibjs not installed');
  }
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

/**
 * Generate a random salt for commitment
 *
 * @returns Random 256-bit value as bigint
 */
export function generateSalt(): bigint {
  const bytes = randomBytes(32);
  return BigInt('0x' + bytes.toString('hex'));
}

/**
 * Generate a bet commitment hash using Poseidon (ZK-friendly)
 *
 * commitment = Poseidon(direction, salt)
 *
 * @param direction - Bet direction (true = YES, false = NO)
 * @param salt - Random salt value
 * @returns Commitment hash as bigint
 */
export async function generateBetCommitment(
  direction: boolean,
  salt: bigint
): Promise<bigint> {
  if (zkAvailable) {
    const poseidon = await getPoseidon();
    const directionValue = direction ? 1n : 0n;
    const hash = poseidon([directionValue, salt]);
    return poseidon.F.toObject(hash);
  }

  // Fallback: Use keccak256 (not ZK-friendly but works for testing)
  const hash = keccak256(
    encodePacked(['bool', 'uint256'], [direction, salt])
  );
  return BigInt(hash);
}

/**
 * Generate commitment hash as hex string (for contract)
 */
export async function generateBetCommitmentHex(
  direction: boolean,
  salt: bigint
): Promise<string> {
  const commitment = await generateBetCommitment(direction, salt);
  return '0x' + commitment.toString(16).padStart(64, '0');
}

/**
 * Generate a nullifier for a bet reveal
 *
 * nullifier = Poseidon(salt, marketId)
 *
 * @param salt - The salt used in commitment (acts as secret)
 * @param marketId - The market ID
 * @returns Nullifier as bigint
 */
export async function generateNullifier(
  salt: bigint,
  marketId: bigint
): Promise<bigint> {
  if (zkAvailable) {
    const poseidon = await getPoseidon();
    const hash = poseidon([salt, marketId]);
    return poseidon.F.toObject(hash);
  }

  // Fallback: Use keccak256
  const hash = keccak256(
    encodePacked(['uint256', 'uint256'], [salt, marketId])
  );
  return BigInt(hash);
}

/**
 * Bet reveal proof inputs
 */
export interface BetRevealInputs {
  // Private
  direction: boolean;
  salt: bigint;
  // Public
  commitment: bigint;
  marketId: bigint;
}

/**
 * Groth16 proof structure
 */
export interface Groth16Proof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: string;
  curve: string;
}

/**
 * Proof result with formatted data for contract call
 */
export interface ProofResult {
  proof: Groth16Proof;
  publicSignals: string[];
  formatted: {
    pA: [bigint, bigint];
    pB: [[bigint, bigint], [bigint, bigint]];
    pC: [bigint, bigint];
    publicInputs: bigint[];
  };
}

/**
 * Generate a ZK proof for bet reveal
 *
 * @param inputs - Bet reveal inputs
 * @returns Proof and public signals
 */
export async function generateBetRevealProof(
  inputs: BetRevealInputs
): Promise<ProofResult> {
  if (!zkAvailable) {
    throw new Error('ZK proofs not available - snarkjs/circomlibjs not installed');
  }

  const circuitWasm = path.join(CIRCUITS_PATH, 'bet_reveal_js', 'bet_reveal.wasm');
  const zkeyFile = path.join(CIRCUITS_PATH, 'bet_reveal.zkey');

  const input = {
    direction: inputs.direction ? '1' : '0',
    salt: inputs.salt.toString(),
    commitment: inputs.commitment.toString(),
    marketId: inputs.marketId.toString(),
  };

  const { proof, publicSignals } = await groth16.fullProve(input, circuitWasm, zkeyFile);

  return {
    proof: proof as Groth16Proof,
    publicSignals,
    formatted: formatProofForContract(proof as Groth16Proof, publicSignals),
  };
}

/**
 * Generate a ZK proof for bet commitment verification
 */
export async function generateBetCommitmentProof(
  direction: boolean,
  salt: bigint
): Promise<ProofResult> {
  if (!zkAvailable) {
    throw new Error('ZK proofs not available - snarkjs/circomlibjs not installed');
  }

  const circuitWasm = path.join(CIRCUITS_PATH, 'bet_commitment_js', 'bet_commitment.wasm');
  const zkeyFile = path.join(CIRCUITS_PATH, 'bet_commitment.zkey');

  const input = {
    direction: direction ? '1' : '0',
    salt: salt.toString(),
  };

  const { proof, publicSignals } = await groth16.fullProve(input, circuitWasm, zkeyFile);

  return {
    proof: proof as Groth16Proof,
    publicSignals,
    formatted: formatProofForContract(proof as Groth16Proof, publicSignals),
  };
}

/**
 * Format proof for Solidity contract call
 *
 * Converts snarkjs proof format to format expected by Solidity verifier
 */
export function formatProofForContract(
  proof: Groth16Proof,
  publicSignals: string[]
): {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  publicInputs: bigint[];
} {
  return {
    // pA: [x, y] - note: snarkjs outputs [x, y, 1]
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],

    // pB: [[x1, x2], [y1, y2]] - note: coordinates are reversed for Solidity
    pB: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],

    // pC: [x, y]
    pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],

    // Public inputs
    publicInputs: publicSignals.map((s) => BigInt(s)),
  };
}

/**
 * Verify a proof locally (for testing)
 */
export async function verifyProofLocally(
  proof: Groth16Proof,
  publicSignals: string[],
  verificationKeyPath: string
): Promise<boolean> {
  if (!zkAvailable) {
    throw new Error('ZK proofs not available - snarkjs not installed');
  }
  const vk = await import(verificationKeyPath);
  return groth16.verify(vk.default || vk, publicSignals, proof);
}

/**
 * Export calldata for Solidity verifier
 */
export async function exportCalldata(
  proof: Groth16Proof,
  publicSignals: string[]
): Promise<string> {
  if (!zkAvailable) {
    throw new Error('ZK proofs not available - snarkjs not installed');
  }
  return groth16.exportSolidityCallData(proof, publicSignals);
}

/**
 * Utility: Create bet commitment with all data needed for reveal
 */
export interface BetCommitmentData {
  direction: boolean;
  salt: bigint;
  commitment: bigint;
  commitmentHex: string;
}

export async function createBetCommitment(direction: boolean): Promise<BetCommitmentData> {
  const salt = generateSalt();
  const commitment = await generateBetCommitment(direction, salt);
  const commitmentHex = '0x' + commitment.toString(16).padStart(64, '0');

  return {
    direction,
    salt,
    commitment,
    commitmentHex,
  };
}

/**
 * Utility: Prepare full reveal data
 */
export interface BetRevealData extends BetCommitmentData {
  marketId: bigint;
  nullifier: bigint;
  nullifierHex: string;
  proof?: ProofResult;
}

export async function prepareBetReveal(
  commitmentData: BetCommitmentData,
  marketId: bigint,
  generateProof = false
): Promise<BetRevealData> {
  const nullifier = await generateNullifier(commitmentData.salt, marketId);
  const nullifierHex = '0x' + nullifier.toString(16).padStart(64, '0');

  const revealData: BetRevealData = {
    ...commitmentData,
    marketId,
    nullifier,
    nullifierHex,
  };

  if (generateProof) {
    if (!zkAvailable) {
      throw new Error('ZK proofs not available - snarkjs/circomlibjs not installed');
    }
    revealData.proof = await generateBetRevealProof({
      direction: commitmentData.direction,
      salt: commitmentData.salt,
      commitment: commitmentData.commitment,
      marketId,
    });
  }

  return revealData;
}
