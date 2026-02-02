pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

/**
 * Bet Commitment Circuit
 *
 * Creates a zero-knowledge commitment for a prediction market bet.
 * The commitment hides both the direction (YES/NO) and allows verification
 * that the reveal matches the original commitment.
 *
 * Pattern adapted from poseidon_commit.circom in zk-arsenal
 *
 * Usage:
 *   - Bettor generates: commitment = Poseidon(direction, salt)
 *   - Places bet with commitment hash (direction hidden)
 *   - After market resolution, reveals direction and salt
 *   - Contract verifies: Poseidon(direction, salt) == commitment
 */
template BetCommitment() {
    // Private inputs (known only to bettor)
    signal input direction;    // 0 = NO, 1 = YES
    signal input salt;         // Random 256-bit value

    // Public output
    signal output commitment;

    // Constraint: direction must be binary (0 or 1)
    // direction * (direction - 1) === 0 means direction ∈ {0, 1}
    direction * (direction - 1) === 0;

    // Compute commitment using Poseidon hash
    // Poseidon is more SNARK-friendly than Keccak256
    component hasher = Poseidon(2);
    hasher.inputs[0] <== direction;
    hasher.inputs[1] <== salt;

    commitment <== hasher.out;
}

component main = BetCommitment();
