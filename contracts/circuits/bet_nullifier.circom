pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

/**
 * Bet Nullifier Circuit
 *
 * Generates a unique nullifier to prevent double-reveal attacks.
 * Each bet can only be revealed once per market.
 *
 * Pattern adapted from nullifier.circom in zk-arsenal
 *
 * Usage:
 *   - When revealing, generate: nullifier = Poseidon(secret, marketId)
 *   - Contract stores used nullifiers
 *   - Attempting to reveal again with same secret will produce same nullifier
 *   - Contract rejects if nullifier already used
 */
template BetNullifier() {
    // Private input
    signal input secret;           // User's secret (derived from salt or separate)

    // Public inputs
    signal input marketId;         // The market context

    // Public output
    signal output nullifier;       // Unique per (secret, marketId) pair

    // Compute nullifier using Poseidon hash
    component hasher = Poseidon(2);
    hasher.inputs[0] <== secret;
    hasher.inputs[1] <== marketId;

    nullifier <== hasher.out;
}

// marketId is public, secret is private
component main {public [marketId]} = BetNullifier();
