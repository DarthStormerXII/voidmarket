import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import { signResponse, getSignerAddress } from "../services/signer.js";

// The expected address for hardhat account #0
const EXPECTED_SIGNER_ADDRESS =
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("getSignerAddress", () => {
  it("returns the correct signer address from env private key", () => {
    const address = getSignerAddress();
    expect(address).toBe(EXPECTED_SIGNER_ADDRESS);
  });

  it("returns a valid Ethereum address", () => {
    const address = getSignerAddress();
    expect(ethers.isAddress(address)).toBe(true);
  });
});

describe("signResponse", () => {
  it("returns ABI-encoded (result, expires, signature)", async () => {
    const result = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address"],
      ["0x1234567890123456789012345678901234567890"]
    );
    const expires = Math.floor(Date.now() / 1000) + 300;
    const extraData = ethers.getBytes("0xdeadbeef");

    const signed = await signResponse(result, expires, extraData);

    // Decode the signed response
    const [decodedResult, decodedExpires, signature] =
      ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        signed
      );

    expect(decodedResult).toBe(result);
    expect(Number(decodedExpires)).toBe(expires);
    expect(signature).toBeTruthy();
    expect(ethers.getBytes(signature).length).toBe(65); // 65-byte ECDSA sig
  });

  it("signature is verifiable with EIP-191 recovery", async () => {
    const result = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
      ["blue-supergiant"]
    );
    const expires = Math.floor(Date.now() / 1000) + 300;
    const extraData = ethers.getBytes("0xabcdef");

    const signed = await signResponse(result, expires, extraData);

    // Decode
    const [decodedResult, decodedExpires, signature] =
      ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        signed
      );

    // Reconstruct message hash (same as gateway logic)
    const messageHash = ethers.solidityPackedKeccak256(
      ["bytes", "uint64", "bytes"],
      [decodedResult, decodedExpires, extraData]
    );

    // Recover signer address from EIP-191 personal sign
    const recoveredAddress = ethers.verifyMessage(
      ethers.getBytes(messageHash),
      signature
    );

    expect(recoveredAddress).toBe(EXPECTED_SIGNER_ADDRESS);
  });

  it("matches on-chain verification logic (toEthSignedMessageHash)", async () => {
    const result = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address"],
      ["0xdead000000000000000000000000000000000000"]
    );
    const expires = Math.floor(Date.now() / 1000) + 300;
    const extraData = ethers.getBytes("0x1234");

    const signed = await signResponse(result, expires, extraData);

    const [decodedResult, decodedExpires, signature] =
      ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        signed
      );

    // Simulate contract verification:
    // 1. keccak256(abi.encodePacked(result, expires, extraData))
    const messageHash = ethers.solidityPackedKeccak256(
      ["bytes", "uint64", "bytes"],
      [decodedResult, decodedExpires, extraData]
    );

    // 2. .toEthSignedMessageHash() — adds EIP-191 prefix
    const ethSignedHash = ethers.hashMessage(ethers.getBytes(messageHash));

    // 3. ECDSA.recover(ethSignedHash, signature)
    const recoveredAddress = ethers.recoverAddress(ethSignedHash, signature);

    // 4. Compare against trustedSigner
    expect(recoveredAddress).toBe(EXPECTED_SIGNER_ADDRESS);
  });

  it("produces different signatures for different results", async () => {
    const expires = Math.floor(Date.now() / 1000) + 300;
    const extraData = ethers.getBytes("0x00");

    const result1 = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
      ["alpha"]
    );
    const result2 = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
      ["beta"]
    );

    const signed1 = await signResponse(result1, expires, extraData);
    const signed2 = await signResponse(result2, expires, extraData);

    expect(signed1).not.toBe(signed2);
  });

  it("produces different signatures for different expiry times", async () => {
    const result = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
      ["test"]
    );
    const extraData = ethers.getBytes("0x00");

    const now = Math.floor(Date.now() / 1000);
    const signed1 = await signResponse(result, now + 300, extraData);
    const signed2 = await signResponse(result, now + 600, extraData);

    expect(signed1).not.toBe(signed2);
  });

  it("correctly encodes 5-minute expiry window", async () => {
    const result = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
      ["test"]
    );
    const now = Math.floor(Date.now() / 1000);
    const expires = now + 300; // 5 minutes
    const extraData = ethers.getBytes("0x00");

    const signed = await signResponse(result, expires, extraData);

    const [, decodedExpires] = ethers.AbiCoder.defaultAbiCoder().decode(
      ["bytes", "uint64", "bytes"],
      signed
    );

    // Expiry should be ~5 minutes from now
    const expiryDiff = Number(decodedExpires) - now;
    expect(expiryDiff).toBe(300);
  });
});
