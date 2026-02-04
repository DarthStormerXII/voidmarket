/**
 * ZK Utilities Module
 *
 * Zero-knowledge proof utilities for VoidMarket hidden bets
 */

export {
  // Salt generation
  generateSalt,

  // Commitment
  generateBetCommitment,
  generateBetCommitmentHex,
  createBetCommitment,

  // Nullifier
  generateNullifier,

  // Proof generation
  generateBetRevealProof,
  generateBetCommitmentProof,

  // Proof formatting
  formatProofForContract,
  exportCalldata,

  // Verification
  verifyProofLocally,

  // Full workflow utilities
  prepareBetReveal,

  // Types
  type BetRevealInputs,
  type Groth16Proof,
  type ProofResult,
  type BetCommitmentData,
  type BetRevealData,
} from './proof.js';
