import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import { decodeDnsName, decodeResolverCall } from "../services/decoder.js";

describe("decodeDnsName", () => {
  it("decodes simple subdomain: cosmicvoyager.voidmarket.eth", () => {
    // DNS encoding: \x0dcosmicvoyager\x0avoidmarket\x03eth\x00
    const encoded = new Uint8Array([
      13, // length of "cosmicvoyager"
      ...new TextEncoder().encode("cosmicvoyager"),
      10, // length of "voidmarket"
      ...new TextEncoder().encode("voidmarket"),
      3, // length of "eth"
      ...new TextEncoder().encode("eth"),
      0, // terminator
    ]);

    const result = decodeDnsName(encoded);
    expect(result).toBe("cosmicvoyager.voidmarket.eth");
  });

  it("decodes nested subdomain: eth-5k.cosmicvoyager.voidmarket.eth", () => {
    const encoded = new Uint8Array([
      6,
      ...new TextEncoder().encode("eth-5k"),
      13, // length of "cosmicvoyager"
      ...new TextEncoder().encode("cosmicvoyager"),
      10,
      ...new TextEncoder().encode("voidmarket"),
      3,
      ...new TextEncoder().encode("eth"),
      0,
    ]);

    const result = decodeDnsName(encoded);
    expect(result).toBe("eth-5k.cosmicvoyager.voidmarket.eth");
  });

  it("decodes market subdomain: eth-5k.voidmarket.eth", () => {
    const encoded = new Uint8Array([
      6,
      ...new TextEncoder().encode("eth-5k"),
      10,
      ...new TextEncoder().encode("voidmarket"),
      3,
      ...new TextEncoder().encode("eth"),
      0,
    ]);

    const result = decodeDnsName(encoded);
    expect(result).toBe("eth-5k.voidmarket.eth");
  });

  it("decodes cluster subdomain: void-seekers.voidmarket.eth", () => {
    const encoded = new Uint8Array([
      12,
      ...new TextEncoder().encode("void-seekers"),
      10,
      ...new TextEncoder().encode("voidmarket"),
      3,
      ...new TextEncoder().encode("eth"),
      0,
    ]);

    const result = decodeDnsName(encoded);
    expect(result).toBe("void-seekers.voidmarket.eth");
  });

  it("handles single label", () => {
    const encoded = new Uint8Array([
      3,
      ...new TextEncoder().encode("eth"),
      0,
    ]);

    const result = decodeDnsName(encoded);
    expect(result).toBe("eth");
  });

  it("handles empty name (just terminator)", () => {
    const encoded = new Uint8Array([0]);
    const result = decodeDnsName(encoded);
    expect(result).toBe("");
  });

  it("handles special characters in subdomain names", () => {
    const encoded = new Uint8Array([
      5,
      ...new TextEncoder().encode("a-b-c"),
      10,
      ...new TextEncoder().encode("voidmarket"),
      3,
      ...new TextEncoder().encode("eth"),
      0,
    ]);

    const result = decodeDnsName(encoded);
    expect(result).toBe("a-b-c.voidmarket.eth");
  });
});

describe("decodeResolverCall", () => {
  it("decodes addr(bytes32) selector 0x3b3b57de", () => {
    const node = ethers.namehash("cosmicvoyager.voidmarket.eth");
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32"],
      [node]
    );
    const data = new Uint8Array([
      ...ethers.getBytes("0x3b3b57de"),
      ...ethers.getBytes(encoded),
    ]);

    const result = decodeResolverCall(data);
    expect(result.selector).toBe("0x3b3b57de");
    expect(result.params.node).toBe(node);
  });

  it("decodes addr(bytes32,uint256) selector 0xf1cb7e06", () => {
    const node = ethers.namehash("cosmicvoyager.voidmarket.eth");
    const coinType = 60n; // ETH
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256"],
      [node, coinType]
    );
    const data = new Uint8Array([
      ...ethers.getBytes("0xf1cb7e06"),
      ...ethers.getBytes(encoded),
    ]);

    const result = decodeResolverCall(data);
    expect(result.selector).toBe("0xf1cb7e06");
    expect(result.params.node).toBe(node);
    expect(result.params.coinType).toBe(coinType);
  });

  it("decodes text(bytes32,string) selector 0x59d1d43c", () => {
    const node = ethers.namehash("cosmicvoyager.voidmarket.eth");
    const key = "voidmarket.star-type";
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "string"],
      [node, key]
    );
    const data = new Uint8Array([
      ...ethers.getBytes("0x59d1d43c"),
      ...ethers.getBytes(encoded),
    ]);

    const result = decodeResolverCall(data);
    expect(result.selector).toBe("0x59d1d43c");
    expect(result.params.node).toBe(node);
    expect(result.params.key).toBe("voidmarket.star-type");
  });

  it("decodes text record key: voidmarket.total-photons", () => {
    const node = ethers.namehash("cosmicvoyager.voidmarket.eth");
    const key = "voidmarket.total-photons";
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "string"],
      [node, key]
    );
    const data = new Uint8Array([
      ...ethers.getBytes("0x59d1d43c"),
      ...ethers.getBytes(encoded),
    ]);

    const result = decodeResolverCall(data);
    expect(result.params.key).toBe("voidmarket.total-photons");
  });

  it("decodes contenthash(bytes32) selector 0xbc1c58d1", () => {
    const node = ethers.namehash("cosmicvoyager.voidmarket.eth");
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32"],
      [node]
    );
    const data = new Uint8Array([
      ...ethers.getBytes("0xbc1c58d1"),
      ...ethers.getBytes(encoded),
    ]);

    const result = decodeResolverCall(data);
    expect(result.selector).toBe("0xbc1c58d1");
    expect(result.params.node).toBe(node);
  });

  it("returns empty params for unknown selector", () => {
    const unknownSelector = "0xdeadbeef";
    const data = new Uint8Array([
      ...ethers.getBytes(unknownSelector),
      ...new Uint8Array(32), // padding
    ]);

    const result = decodeResolverCall(data);
    expect(result.selector).toBe("0xdeadbeef");
    expect(Object.keys(result.params)).toHaveLength(0);
  });
});
