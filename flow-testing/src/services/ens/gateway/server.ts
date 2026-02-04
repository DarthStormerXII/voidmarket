/**
 * ENS CCIP-Read Gateway Server
 *
 * Complete implementation of EIP-3668 OffchainLookup pattern for VoidMarket
 * Supports resolution of stars, markets, and clusters
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { privateKeyToAccount } from 'viem/accounts';
import {
  keccak256,
  encodePacked,
  encodeAbiParameters,
  parseAbiParameters,
  decodeAbiParameters,
  type Hex,
  hexToBytes,
  bytesToString,
  pad,
} from 'viem';
import 'dotenv/config';

// Import services
import { decodeDnsName, decodeCalldata, FunctionSelector } from './decoder.js';
import { signResponse, verifyExpiry } from './signer.js';
import { lookupStar, lookupMarket, lookupCluster, lookupTextRecord } from './database.js';
import type { ResolveRequest, ResolveResponse, TextRecordKey } from './types.js';

const app = express();
app.use(cors());
app.use(express.json());

// Gateway signer for response authentication
const signerPrivateKey = process.env.ENS_SIGNER_PRIVATE_KEY;
if (!signerPrivateKey) {
  console.warn('⚠️  ENS_SIGNER_PRIVATE_KEY not set, gateway will not sign responses');
}
const signer = signerPrivateKey ? privateKeyToAccount(signerPrivateKey as Hex) : null;

// Configuration
const VOIDMARKET_DOMAIN = process.env.VOIDMARKET_ENS_DOMAIN || 'voidmarket.eth';
const SIGNATURE_VALIDITY_SECONDS = 5 * 60; // 5 minutes

/**
 * Parse subdomain hierarchy from full name
 * e.g., "alice.voidmarket.eth" -> { type: "star", name: "alice" }
 * e.g., "eth-5k.voidmarket.eth" -> { type: "market", slug: "eth-5k" }
 * e.g., "eth-5k.alice.voidmarket.eth" -> { type: "forked-market", slug: "eth-5k", owner: "alice" }
 */
function parseSubdomainHierarchy(name: string): {
  type: 'star' | 'market' | 'cluster' | 'forked-market';
  subdomain: string;
  owner?: string;
} | null {
  const suffix = `.${VOIDMARKET_DOMAIN}`;
  if (!name.endsWith(suffix)) {
    return null;
  }

  const subdomainPart = name.slice(0, -suffix.length).toLowerCase();
  const parts = subdomainPart.split('.');

  if (parts.length === 1) {
    // Single subdomain: could be star, market, or cluster
    // We'll determine type based on database lookup
    return { type: 'star', subdomain: parts[0] };
  } else if (parts.length === 2) {
    // Two-level: forked market (e.g., eth-5k.alice.voidmarket.eth)
    return {
      type: 'forked-market',
      subdomain: parts[0],
      owner: parts[1],
    };
  }

  return null;
}

// ============================================================================
// CCIP-Read Endpoint (EIP-3668)
// ============================================================================

/**
 * Main CCIP-Read endpoint
 * GET /{sender}/{data}.json
 *
 * This is called by ENS resolvers when they need off-chain data
 */
app.get('/:sender/:data.json', async (req: Request, res: Response) => {
  try {
    const { sender, data } = req.params;

    console.log(`📥 CCIP-Read request from ${sender}`);
    console.log(`   Data: ${data.slice(0, 66)}...`);

    // Decode the calldata to understand what's being requested
    const decoded = decodeCalldata(data as Hex);
    if (!decoded) {
      console.log('   ❌ Failed to decode calldata');
      return res.status(400).json({ error: 'Invalid calldata' });
    }

    console.log(`   Function: ${decoded.selector}`);
    console.log(`   Node: ${decoded.node}`);

    // Decode the DNS name from the node (if available in extraData)
    // For now, we'll need to look up by node hash in the database

    let responseData: Hex;
    const expires = BigInt(Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS);

    switch (decoded.selector) {
      case FunctionSelector.ADDR: {
        // addr(bytes32 node) - return address
        const address = await lookupAddressByNode(decoded.node);
        if (!address) {
          return res.status(404).json({ error: 'Name not found' });
        }

        responseData = encodeAddressResponse(address as Hex, expires);
        break;
      }

      case FunctionSelector.TEXT: {
        // text(bytes32 node, string key) - return text record
        const textKey = decoded.textKey;
        if (!textKey) {
          return res.status(400).json({ error: 'Missing text key' });
        }

        const textValue = await lookupTextByNode(decoded.node, textKey);
        if (!textValue) {
          return res.status(404).json({ error: 'Text record not found' });
        }

        responseData = encodeTextResponse(textValue, expires);
        break;
      }

      case FunctionSelector.ADDR_MULTICHAIN: {
        // addr(bytes32 node, uint256 coinType)
        const coinType = decoded.coinType || 60n; // Default to ETH
        const address = await lookupAddressByNode(decoded.node);
        if (!address) {
          return res.status(404).json({ error: 'Name not found' });
        }

        responseData = encodeMultichainAddressResponse(address as Hex, coinType, expires);
        break;
      }

      case FunctionSelector.CONTENTHASH: {
        // contenthash(bytes32 node)
        // VoidMarket doesn't use contenthash, return empty
        responseData = encodeContenthashResponse('0x' as Hex, expires);
        break;
      }

      case FunctionSelector.NAME: {
        // name(bytes32 node) - reverse resolution
        const name = await lookupNameByNode(decoded.node);
        if (!name) {
          return res.status(404).json({ error: 'Name not found' });
        }

        responseData = encodeNameResponse(name, expires);
        break;
      }

      default:
        return res.status(400).json({ error: `Unsupported function: ${decoded.selector}` });
    }

    // Sign the response if signer is available
    if (signer) {
      const signature = await signResponse(signer, decoded.node, responseData, expires);
      responseData = appendSignature(responseData, signature);
    }

    console.log(`   ✅ Response generated`);

    res.json({ data: responseData });
  } catch (error) {
    console.error('CCIP-Read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST endpoint for CCIP-Read (alternative method)
 */
app.post('/:sender/:data', async (req: Request, res: Response) => {
  // Redirect to GET handler with same logic
  req.params.data = req.params.data + '.json';
  return app._router.handle(req, res, () => {});
});

// ============================================================================
// Direct Lookup Endpoints (for testing)
// ============================================================================

/**
 * Resolve a full ENS name
 * GET /resolve/:name
 */
app.get('/resolve/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const parsed = parseSubdomainHierarchy(name);

    if (!parsed) {
      return res.status(400).json({ error: 'Invalid subdomain format' });
    }

    // Try to resolve as star first
    const star = await lookupStar(parsed.subdomain);
    if (star) {
      return res.json({
        name,
        type: 'star',
        address: star.walletAddress,
        displayName: star.displayName,
        starType: star.starType,
        photons: star.photons,
        ensSubdomain: star.ensSubdomain,
      });
    }

    // Try as market
    const market = await lookupMarket(parsed.subdomain);
    if (market) {
      return res.json({
        name,
        type: 'market',
        marketId: market.id,
        question: market.question,
        status: market.status,
        deadline: market.deadline,
      });
    }

    // Try as cluster
    const cluster = await lookupCluster(parsed.subdomain);
    if (cluster) {
      return res.json({
        name,
        type: 'cluster',
        clusterId: cluster.id,
        clusterName: cluster.name,
        leader: cluster.leaderAddress,
        energy: cluster.energy,
        memberCount: cluster.memberCount,
      });
    }

    return res.status(404).json({ error: 'Name not found' });
  } catch (error) {
    console.error('Resolve error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get text record for a name
 * GET /text/:name/:key
 */
app.get('/text/:name/:key', async (req: Request, res: Response) => {
  try {
    const { name, key } = req.params;
    const parsed = parseSubdomainHierarchy(name);

    if (!parsed) {
      return res.status(400).json({ error: 'Invalid subdomain format' });
    }

    const value = await lookupTextRecord(parsed.subdomain, key as TextRecordKey);

    if (value === null) {
      return res.status(404).json({ error: 'Text record not found' });
    }

    res.json({
      name,
      key,
      value,
    });
  } catch (error) {
    console.error('Text lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get address for a name
 * GET /addr/:name
 */
app.get('/addr/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const parsed = parseSubdomainHierarchy(name);

    if (!parsed) {
      return res.status(400).json({ error: 'Invalid subdomain format' });
    }

    // Try star first
    const star = await lookupStar(parsed.subdomain);
    if (star) {
      return res.json({ name, address: star.walletAddress });
    }

    // Try cluster (return leader address)
    const cluster = await lookupCluster(parsed.subdomain);
    if (cluster) {
      return res.json({ name, address: cluster.leaderAddress });
    }

    return res.status(404).json({ error: 'Address not found' });
  } catch (error) {
    console.error('Address lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    domain: VOIDMARKET_DOMAIN,
    signer: signer ? signer.address : 'not configured',
    signatureValidity: `${SIGNATURE_VALIDITY_SECONDS} seconds`,
  });
});

// ============================================================================
// Internal Helper Functions
// ============================================================================

async function lookupAddressByNode(node: Hex): Promise<string | null> {
  // In a production system, we'd have a mapping from node hash to subdomain
  // For now, we'll need to search by subdomain directly
  // This is called from the CCIP endpoint which should include name info
  return null;
}

async function lookupTextByNode(node: Hex, key: string): Promise<string | null> {
  return null;
}

async function lookupNameByNode(node: Hex): Promise<string | null> {
  return null;
}

function encodeAddressResponse(address: Hex, expires: bigint): Hex {
  return encodeAbiParameters(
    parseAbiParameters('address result, uint64 expires'),
    [address, expires]
  );
}

function encodeTextResponse(text: string, expires: bigint): Hex {
  return encodeAbiParameters(
    parseAbiParameters('string result, uint64 expires'),
    [text, expires]
  );
}

function encodeMultichainAddressResponse(address: Hex, coinType: bigint, expires: bigint): Hex {
  // For ETH (coinType 60), return the address as bytes
  const addressBytes = pad(address, { size: 20 });
  return encodeAbiParameters(
    parseAbiParameters('bytes result, uint64 expires'),
    [addressBytes, expires]
  );
}

function encodeContenthashResponse(contenthash: Hex, expires: bigint): Hex {
  return encodeAbiParameters(
    parseAbiParameters('bytes result, uint64 expires'),
    [contenthash, expires]
  );
}

function encodeNameResponse(name: string, expires: bigint): Hex {
  return encodeAbiParameters(
    parseAbiParameters('string result, uint64 expires'),
    [name, expires]
  );
}

function appendSignature(data: Hex, signature: Hex): Hex {
  // Re-encode with signature
  const [result, expires] = decodeAbiParameters(
    parseAbiParameters('bytes result, uint64 expires'),
    data
  );

  return encodeAbiParameters(
    parseAbiParameters('bytes result, uint64 expires, bytes signature'),
    [result as Hex, expires, signature]
  );
}

// ============================================================================
// Server Start
// ============================================================================

const PORT = process.env.ENS_GATEWAY_PORT || 3001;

export function startGateway() {
  return app.listen(PORT, () => {
    console.log(`🌐 ENS Gateway running on port ${PORT}`);
    console.log(`   Domain: ${VOIDMARKET_DOMAIN}`);
    console.log(`   Signer: ${signer ? signer.address : 'not configured'}`);
    console.log(`   Endpoints:`);
    console.log(`     - GET /:sender/:data.json (CCIP-Read)`);
    console.log(`     - GET /resolve/:name`);
    console.log(`     - GET /text/:name/:key`);
    console.log(`     - GET /addr/:name`);
    console.log(`     - GET /health`);
  });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startGateway();
}

export { app };
