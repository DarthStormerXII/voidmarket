import { ethers } from "ethers";

const SIGNER_PRIVATE_KEY = process.env.ENS_GATEWAY_SIGNER_KEY;
if (!SIGNER_PRIVATE_KEY) {
  throw new Error("ENS_GATEWAY_SIGNER_KEY environment variable is required");
}

const signer = new ethers.Wallet(SIGNER_PRIVATE_KEY);

/**
 * Sign a gateway response for CCIP-Read on-chain verification
 *
 * The contract's resolveWithProof callback will:
 * 1. Decode (result, expires, signature) from the response
 * 2. Verify the signature against the trusted signer
 * 3. Check that the response hasn't expired
 */
export async function signResponse(
  result: string,
  expires: number,
  extraData: Uint8Array
): Promise<string> {
  // Create message hash — must match contract's verification logic
  const messageHash = ethers.solidityPackedKeccak256(
    ["bytes", "uint64", "bytes"],
    [result, expires, extraData]
  );

  // Sign with EIP-191 personal sign (matches contract's toEthSignedMessageHash)
  const signature = await signer.signMessage(ethers.getBytes(messageHash));

  // ABI-encode the full response for the contract callback
  const response = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes", "uint64", "bytes"],
    [result, expires, signature]
  );

  return response;
}

/**
 * Get the signer's public address (for setting as trustedSigner on contract)
 */
export function getSignerAddress(): string {
  return signer.address;
}
