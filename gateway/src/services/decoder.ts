import { ethers } from "ethers";

/**
 * Decode DNS-encoded name to human-readable format
 * e.g., "\x0ccosmicvoyager\x0avoidmarket\x03eth\x00" → "cosmicvoyager.voidmarket.eth"
 */
export function decodeDnsName(dnsEncodedName: Uint8Array): string {
  const parts: string[] = [];
  let offset = 0;

  while (offset < dnsEncodedName.length) {
    const length = dnsEncodedName[offset];
    if (length === 0) break;

    const label = new TextDecoder().decode(
      dnsEncodedName.slice(offset + 1, offset + 1 + length)
    );
    parts.push(label);
    offset += length + 1;
  }

  return parts.join(".");
}

/**
 * Decode resolver call to extract method selector and parameters
 */
export function decodeResolverCall(data: Uint8Array): {
  selector: string;
  params: Record<string, unknown>;
} {
  const selector = ethers.hexlify(data.slice(0, 4));
  const params: Record<string, unknown> = {};

  switch (selector) {
    case "0x3b3b57de": {
      // addr(bytes32)
      const [node] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32"],
        data.slice(4)
      );
      params.node = node;
      break;
    }

    case "0xf1cb7e06": {
      // addr(bytes32,uint256)
      const [node, coinType] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32", "uint256"],
        data.slice(4)
      );
      params.node = node;
      params.coinType = coinType;
      break;
    }

    case "0x59d1d43c": {
      // text(bytes32,string)
      const [textNode, key] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32", "string"],
        data.slice(4)
      );
      params.node = textNode;
      params.key = key;
      break;
    }

    case "0xbc1c58d1": {
      // contenthash(bytes32)
      const [chNode] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes32"],
        data.slice(4)
      );
      params.node = chNode;
      break;
    }
  }

  return { selector, params };
}
