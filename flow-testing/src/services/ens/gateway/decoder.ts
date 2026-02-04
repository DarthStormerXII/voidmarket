/**
 * ENS Gateway Decoder
 *
 * Decodes DNS names and calldata from ENS resolver requests
 */

import {
  decodeAbiParameters,
  parseAbiParameters,
  type Hex,
  slice,
  hexToBytes,
  bytesToString,
} from 'viem';

export enum FunctionSelector {
  ADDR = '0x3b3b57de',           // addr(bytes32)
  ADDR_MULTICHAIN = '0xf1cb7e06', // addr(bytes32,uint256)
  TEXT = '0x59d1d43c',           // text(bytes32,string)
  CONTENTHASH = '0xbc1c58d1',    // contenthash(bytes32)
  NAME = '0x691f3431',           // name(bytes32)
}

export interface DecodedCalldata {
  selector: FunctionSelector;
  node: Hex;
  textKey?: string;
  coinType?: bigint;
}

/**
 * Decode DNS name from wire format
 *
 * DNS wire format: length-prefixed labels
 * e.g., "\x05alice\x0avoidmarket\x03eth\x00"
 *
 * @param dnsName - The DNS name in wire format (hex)
 * @returns The decoded domain name
 */
export function decodeDnsName(dnsName: Hex | Uint8Array): string {
  const bytes = typeof dnsName === 'string' ? hexToBytes(dnsName) : dnsName;
  const labels: string[] = [];

  let offset = 0;
  while (offset < bytes.length) {
    const length = bytes[offset];
    if (length === 0) break;

    offset += 1;
    const label = bytesToString(bytes.slice(offset, offset + length));
    labels.push(label);
    offset += length;
  }

  return labels.join('.');
}

/**
 * Encode a domain name to DNS wire format
 *
 * @param name - The domain name (e.g., "alice.voidmarket.eth")
 * @returns The DNS wire format as hex
 */
export function encodeDnsName(name: string): Hex {
  const labels = name.split('.');
  const parts: number[] = [];

  for (const label of labels) {
    const encoded = new TextEncoder().encode(label);
    parts.push(encoded.length, ...encoded);
  }
  parts.push(0); // Null terminator

  const bytes = new Uint8Array(parts);
  return ('0x' + Buffer.from(bytes).toString('hex')) as Hex;
}

/**
 * Decode ENS resolver calldata
 *
 * @param data - The calldata (hex)
 * @returns Decoded parameters or null if unrecognized
 */
export function decodeCalldata(data: Hex): DecodedCalldata | null {
  if (data.length < 10) return null;

  const selector = slice(data, 0, 4) as FunctionSelector;
  const params = slice(data, 4) as Hex;

  try {
    switch (selector) {
      case FunctionSelector.ADDR: {
        // addr(bytes32 node)
        const [node] = decodeAbiParameters(
          parseAbiParameters('bytes32 node'),
          params
        );
        return { selector, node: node as Hex };
      }

      case FunctionSelector.ADDR_MULTICHAIN: {
        // addr(bytes32 node, uint256 coinType)
        const [node, coinType] = decodeAbiParameters(
          parseAbiParameters('bytes32 node, uint256 coinType'),
          params
        );
        return { selector, node: node as Hex, coinType };
      }

      case FunctionSelector.TEXT: {
        // text(bytes32 node, string key)
        const [node, textKey] = decodeAbiParameters(
          parseAbiParameters('bytes32 node, string key'),
          params
        );
        return { selector, node: node as Hex, textKey };
      }

      case FunctionSelector.CONTENTHASH: {
        // contenthash(bytes32 node)
        const [node] = decodeAbiParameters(
          parseAbiParameters('bytes32 node'),
          params
        );
        return { selector, node: node as Hex };
      }

      case FunctionSelector.NAME: {
        // name(bytes32 node)
        const [node] = decodeAbiParameters(
          parseAbiParameters('bytes32 node'),
          params
        );
        return { selector, node: node as Hex };
      }

      default:
        console.log(`Unknown function selector: ${selector}`);
        return null;
    }
  } catch (error) {
    console.error('Failed to decode calldata:', error);
    return null;
  }
}

/**
 * Compute namehash for a domain name (EIP-137)
 *
 * @param name - The domain name
 * @returns The namehash (bytes32)
 */
export function namehash(name: string): Hex {
  if (!name) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;
  }

  const labels = name.split('.');
  let node = new Uint8Array(32);

  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256Hash(new TextEncoder().encode(labels[i]));
    const combined = new Uint8Array(64);
    combined.set(node, 0);
    combined.set(labelHash, 32);
    node = keccak256Hash(combined);
  }

  return ('0x' + Buffer.from(node).toString('hex')) as Hex;
}

// Simple keccak256 implementation for namehash
function keccak256Hash(data: Uint8Array): Uint8Array {
  // In production, use viem's keccak256
  // This is a placeholder - actual implementation would use crypto library
  const { keccak256 } = require('viem');
  const result = keccak256(data);
  return hexToBytes(result);
}
