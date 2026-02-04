/**
 * ENS Gateway Signer
 *
 * Handles ECDSA signature generation for CCIP-Read responses
 */

import {
  keccak256,
  encodePacked,
  type Hex,
  type PrivateKeyAccount,
  concat,
} from 'viem';

/**
 * Sign a gateway response for CCIP-Read verification
 *
 * The signature format must match what the on-chain resolver expects:
 * messageHash = keccak256(abi.encodePacked(
 *   "\x19Ethereum Signed Message:\n32",
 *   keccak256(abi.encodePacked(node, result, expires))
 * ))
 *
 * @param signer - The private key account to sign with
 * @param node - The ENS namehash (bytes32)
 * @param result - The encoded result data
 * @param expires - The expiry timestamp
 * @returns The signature
 */
export async function signResponse(
  signer: PrivateKeyAccount,
  node: Hex,
  result: Hex,
  expires: bigint
): Promise<Hex> {
  // Create the message hash matching the contract's verification
  const innerHash = keccak256(
    encodePacked(
      ['bytes32', 'bytes', 'uint64'],
      [node, result, expires]
    )
  );

  // Sign with EIP-191 prefix
  const signature = await signer.signMessage({
    message: { raw: innerHash },
  });

  return signature;
}

/**
 * Sign a text response
 */
export async function signTextResponse(
  signer: PrivateKeyAccount,
  node: Hex,
  key: string,
  result: string,
  expires: bigint
): Promise<Hex> {
  const innerHash = keccak256(
    encodePacked(
      ['bytes32', 'string', 'string', 'uint64'],
      [node, key, result, expires]
    )
  );

  const signature = await signer.signMessage({
    message: { raw: innerHash },
  });

  return signature;
}

/**
 * Sign an address response
 */
export async function signAddressResponse(
  signer: PrivateKeyAccount,
  node: Hex,
  address: Hex,
  expires: bigint
): Promise<Hex> {
  const innerHash = keccak256(
    encodePacked(
      ['bytes32', 'address', 'uint64'],
      [node, address, expires]
    )
  );

  const signature = await signer.signMessage({
    message: { raw: innerHash },
  });

  return signature;
}

/**
 * Sign a multichain address response
 */
export async function signMultichainAddressResponse(
  signer: PrivateKeyAccount,
  node: Hex,
  coinType: bigint,
  result: Hex,
  expires: bigint
): Promise<Hex> {
  const innerHash = keccak256(
    encodePacked(
      ['bytes32', 'uint256', 'bytes', 'uint64'],
      [node, coinType, result, expires]
    )
  );

  const signature = await signer.signMessage({
    message: { raw: innerHash },
  });

  return signature;
}

/**
 * Verify that a timestamp is not expired
 *
 * @param expires - The expiry timestamp (seconds)
 * @returns True if still valid
 */
export function verifyExpiry(expires: bigint): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return now <= expires;
}

/**
 * Generate expiry timestamp
 *
 * @param validitySeconds - How long the response should be valid (default 5 minutes)
 * @returns The expiry timestamp
 */
export function generateExpiry(validitySeconds = 300): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + validitySeconds);
}
