/**
 * CCIP-Read ENS Gateway API Route
 *
 * GET /api/ens/resolve/:sender/:calldata
 *
 * Called automatically by viem/ethers when VoidMarketResolver
 * reverts with OffchainLookup. Decodes the DNS name, looks up
 * the entity in Supabase, encodes + signs the response.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  encodeAbiParameters,
  decodeAbiParameters,
  hexToBytes,
  bytesToHex,
  keccak256,
  encodePacked,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  getStarByNameForENS,
  getMarketByNameForENS,
  getClusterByNameForENS,
  type ResolvedEntity,
} from '@/lib/services/db';

// ─── Signer ──────────────────────────────────────────────────

const SIGNER_KEY = process.env.ENS_GATEWAY_SIGNER_KEY as Hex;
const signer = privateKeyToAccount(SIGNER_KEY);

// ─── Resolver Selectors ──────────────────────────────────────

const SELECTORS = {
  addr: '0x3b3b57de',           // addr(bytes32)
  addrMultichain: '0xf1cb7e06', // addr(bytes32,uint256)
  text: '0x59d1d43c',           // text(bytes32,string)
  contenthash: '0xbc1c58d1',    // contenthash(bytes32)
} as const;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ─── CORS Headers ────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// ─── OPTIONS (CORS preflight) ────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

// ─── GET handler ─────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sender: string; calldata: string }> }
) {
  try {
    const { calldata } = await params;

    // Strip trailing .json if present (CCIP-Read convention)
    const cleanCalldata = calldata.replace(/\.json$/, '') as Hex;

    // Decode outer envelope: resolve(bytes name, bytes data)
    const calldataBytes = hexToBytes(cleanCalldata);
    const [nameBytes, dataBytes] = decodeAbiParameters(
      [{ type: 'bytes' }, { type: 'bytes' }],
      bytesToHex(calldataBytes)
    );

    // Decode DNS-encoded name
    const fullName = decodeDnsName(hexToBytes(nameBytes as Hex));
    const parts = fullName.split('.');
    const subdomain = parts[0];
    const parentDomain = parts.length > 3 ? parts[1] : null;

    // Look up entity
    const entity = await resolveEntity(subdomain, parentDomain);
    if (!entity) {
      return NextResponse.json({ error: 'Name not found' }, { status: 404, headers: corsHeaders });
    }

    // Decode which resolver method was called
    const dataBytesArray = hexToBytes(dataBytes as Hex);
    const selector = bytesToHex(dataBytesArray.slice(0, 4));
    const selectorData = bytesToHex(dataBytesArray.slice(4));

    let result: Hex;

    switch (selector) {
      case SELECTORS.addr:
      case SELECTORS.addrMultichain:
        result = encodeAbiParameters(
          [{ type: 'address' }],
          [(entity.walletAddress || ZERO_ADDRESS) as Hex]
        ) as Hex;
        break;

      case SELECTORS.text: {
        const [, key] = decodeAbiParameters(
          [{ type: 'bytes32' }, { type: 'string' }],
          (`0x${selectorData.slice(2)}`) as Hex
        );
        const textValue = entity.textRecords[key as string] || '';
        result = encodeAbiParameters([{ type: 'string' }], [textValue]) as Hex;
        break;
      }

      case SELECTORS.contenthash:
        result = encodeAbiParameters(
          [{ type: 'bytes' }],
          [(entity.contenthash || '0x') as Hex]
        ) as Hex;
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported resolver method' },
          { status: 400, headers: corsHeaders }
        );
    }

    // Sign response (5 minute expiry)
    const expires = BigInt(Math.floor(Date.now() / 1000) + 300);
    const signedResponse = await signResponse(result, expires, bytesToHex(calldataBytes));

    return NextResponse.json({ data: signedResponse }, { headers: corsHeaders });
  } catch (error) {
    console.error('CCIP-Read resolution error:', error);
    return NextResponse.json(
      { error: 'Resolution failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ─── DNS Name Decoder ────────────────────────────────────────

function decodeDnsName(dnsEncoded: Uint8Array): string {
  const parts: string[] = [];
  let offset = 0;

  while (offset < dnsEncoded.length) {
    const length = dnsEncoded[offset];
    if (length === 0) break;
    const label = new TextDecoder().decode(
      dnsEncoded.slice(offset + 1, offset + 1 + length)
    );
    parts.push(label);
    offset += length + 1;
  }

  return parts.join('.');
}

// ─── Entity Resolution ──────────────────────────────────────

async function resolveEntity(
  subdomain: string,
  parentDomain: string | null
): Promise<ResolvedEntity | null> {
  if (parentDomain) {
    return await getMarketByNameForENS(subdomain, parentDomain);
  }

  const star = await getStarByNameForENS(subdomain);
  if (star) return star;

  const market = await getMarketByNameForENS(subdomain);
  if (market) return market;

  const cluster = await getClusterByNameForENS(subdomain);
  if (cluster) return cluster;

  return null;
}

// ─── Response Signing ────────────────────────────────────────

async function signResponse(
  result: Hex,
  expires: bigint,
  extraData: Hex
): Promise<Hex> {
  // Hash: keccak256(result || expires || extraData)
  const messageHash = keccak256(
    encodePacked(
      ['bytes', 'uint64', 'bytes'],
      [result, expires, extraData]
    )
  );

  // EIP-191 personal sign (matches contract's toEthSignedMessageHash)
  const signature = await signer.signMessage({
    message: { raw: hexToBytes(messageHash) },
  });

  // ABI-encode the full response for the contract callback
  const response = encodeAbiParameters(
    [{ type: 'bytes' }, { type: 'uint64' }, { type: 'bytes' }],
    [result, expires, signature]
  );

  return response as Hex;
}
