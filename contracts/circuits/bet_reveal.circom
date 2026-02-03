pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

/**
 * Bet Reveal Circuit
 *
 * Combined circuit for revealing a bet with ZK proof.
 * Proves that the revealed direction matches the original commitment
 * without revealing the salt on-chain.
 *
 * This is the main circuit used for VoidMarket ZK bets.
 *
 * Inputs:
 *   - direction (private): The bet direction (0 or 1)
 *   - salt (private): The random salt used in commitment
 *   - commitment (public): The original commitment hash (stored on-chain)
 *   - marketId (public): The market ID for nullifier
 *
 * Outputs:
 *   - nullifier: Prevents double-reveal
 *   - revealedDirection: The direction being revealed (for contract logic)
 */
template BetReveal() {
    // Private inputs
    signal input direction;        // 0 = NO, 1 = YES
    signal input salt;             // Random value used in commitment

    // Public inputs
    signal input commitment;       // Original commitment (from on-chain)
    signal input marketId;         // Market ID for nullifier context

    // Public outputs
    signal output nullifier;       // Prevents double-reveal
    signal output revealedDirection; // Direction being revealed

    // Constraint: direction must be binary
    direction * (direction - 1) === 0;

    // Verify commitment matches
    component commitHasher = Poseidon(2);
    commitHasher.inputs[0] <== direction;
    commitHasher.inputs[1] <== salt;

    // The computed commitment must equal the public commitment
    commitment === commitHasher.out;

    // Generate nullifier
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== salt;  // Use salt as secret
    nullifierHasher.inputs[1] <== marketId;

    nullifier <== nullifierHasher.out;

    // Output the revealed direction
    revealedDirection <== direction;
}

// commitment and marketId are public
component main {public [commitment, marketId]} = BetReveal();
