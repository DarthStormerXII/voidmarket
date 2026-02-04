/**
 * ENS CCIP-Read Gateway Server
 *
 * Off-chain resolver for voidmarket.eth subdomains
 * Implements EIP-3668 OffchainLookup pattern
 */

import express from 'express';
import cors from 'cors';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, encodePacked, encodeAbiParameters, parseAbiParameters, type Hex } from 'viem';
import { db, schema } from '../db/client.js';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// Gateway signer for response authentication
const signerPrivateKey = process.env.ENS_SIGNER_PRIVATE_KEY;
if (!signerPrivateKey) {
  console.warn('ENS_SIGNER_PRIVATE_KEY not set, gateway will not sign responses');
}
const signer = signerPrivateKey ? privateKeyToAccount(signerPrivateKey as Hex) : null;

// VoidMarket ENS domain
const VOIDMARKET_DOMAIN = process.env.VOIDMARKET_ENS_DOMAIN || 'voidmarket.eth';

/**
 * Parse subdomain from full name
 * e.g., "alice.voidmarket.eth" -> "alice"
 */
function parseSubdomain(name: string): string | null {
  const suffix = `.${VOIDMARKET_DOMAIN}`;
  if (!name.endsWith(suffix)) {
    return null;
  }
  return name.slice(0, -suffix.length).toLowerCase();
}

/**
 * Lookup address for a subdomain
 */
async function lookupAddress(subdomain: string): Promise<string | null> {
  // Check ENS records table
  const record = await db.query.ensRecords.findFirst({
    where: eq(schema.ensRecords.subdomain, subdomain),
  });

  if (record) {
    return record.address;
  }

  // Fallback: check profiles
  const profile = await db.query.profiles.findFirst({
    where: eq(schema.profiles.ensSubdomain, `${subdomain}.${VOIDMARKET_DOMAIN}`),
  });

  if (profile) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, profile.userId),
    });
    return user?.walletAddress || null;
  }

  return null;
}

/**
 * Lookup text records for a subdomain
 */
async function lookupText(subdomain: string, key: string): Promise<string | null> {
  const record = await db.query.ensRecords.findFirst({
    where: eq(schema.ensRecords.subdomain, subdomain),
  });

  if (record?.records && typeof record.records === 'object') {
    const records = record.records as Record<string, string>;
    return records[key] || null;
  }

  // Fallback: for avatar, description, etc. from profile
  const profile = await db.query.profiles.findFirst({
    where: eq(schema.profiles.ensSubdomain, `${subdomain}.${VOIDMARKET_DOMAIN}`),
  });

  if (profile) {
    switch (key) {
      case 'avatar':
        return profile.avatarUrl;
      case 'description':
        return profile.bio;
      case 'display':
        return profile.displayName;
      case 'com.telegram':
        // Could store Telegram username here
        return null;
      default:
        return null;
    }
  }

  return null;
}

/**
 * Sign a response for CCIP-Read verification
 */
async function signResponse(
  request: Hex,
  result: Hex,
  expires: bigint
): Promise<Hex | null> {
  if (!signer) return null;

  const messageHash = keccak256(
    encodePacked(
      ['bytes', 'address', 'uint64', 'bytes32', 'bytes'],
      [
        '0x1900', // EIP-191 prefix
        signer.address,
        expires,
        keccak256(request),
        result,
      ]
    )
  );

  const signature = await signer.signMessage({
    message: { raw: messageHash },
  });

  return signature;
}

/**
 * Encode response with signature for CCIP-Read
 */
function encodeResponse(result: Hex, expires: bigint, signature: Hex): Hex {
  return encodeAbiParameters(
    parseAbiParameters('bytes result, uint64 expires, bytes signature'),
    [result, expires, signature]
  );
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * CCIP-Read endpoint
 * POST /ccip-read/:sender/:data
 *
 * Called by the on-chain resolver when it needs off-chain data
 */
app.post('/ccip-read/:sender/:data', async (req, res) => {
  try {
    const { sender, data } = req.params;

    // Parse the callback data to determine what's being requested
    // For now, we'll handle basic addr() lookups

    // The data format depends on what the resolver is asking for
    // This is a simplified implementation

    console.log(`CCIP-Read request from ${sender}`);
    console.log(`Data: ${data}`);

    // TODO: Properly decode the request based on function selector
    // For now, return a placeholder response

    res.json({
      data: '0x',
    });
  } catch (error) {
    console.error('CCIP-Read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Direct lookup endpoint for testing
 * GET /lookup/:name
 */
app.get('/lookup/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const subdomain = parseSubdomain(name);

    if (!subdomain) {
      return res.status(400).json({ error: 'Invalid subdomain' });
    }

    const address = await lookupAddress(subdomain);

    if (!address) {
      return res.status(404).json({ error: 'Name not found' });
    }

    res.json({
      name,
      subdomain,
      address,
    });
  } catch (error) {
    console.error('Lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Text record lookup
 * GET /text/:name/:key
 */
app.get('/text/:name/:key', async (req, res) => {
  try {
    const { name, key } = req.params;
    const subdomain = parseSubdomain(name);

    if (!subdomain) {
      return res.status(400).json({ error: 'Invalid subdomain' });
    }

    const value = await lookupText(subdomain, key);

    if (value === null) {
      return res.status(404).json({ error: 'Record not found' });
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
 * Register/update a subdomain (admin only)
 * POST /register
 */
app.post('/register', async (req, res) => {
  try {
    const { subdomain, address, records } = req.body;

    if (!subdomain || !address) {
      return res.status(400).json({ error: 'Missing subdomain or address' });
    }

    // Check if subdomain already exists
    const existing = await db.query.ensRecords.findFirst({
      where: eq(schema.ensRecords.subdomain, subdomain.toLowerCase()),
    });

    if (existing) {
      // Update existing
      await db
        .update(schema.ensRecords)
        .set({
          address,
          records: records || existing.records,
          updatedAt: new Date(),
        })
        .where(eq(schema.ensRecords.subdomain, subdomain.toLowerCase()));
    } else {
      // Create new
      await db.insert(schema.ensRecords).values({
        subdomain: subdomain.toLowerCase(),
        fullName: `${subdomain.toLowerCase()}.${VOIDMARKET_DOMAIN}`,
        address,
        records: records || {},
      });
    }

    res.json({
      success: true,
      subdomain: subdomain.toLowerCase(),
      fullName: `${subdomain.toLowerCase()}.${VOIDMARKET_DOMAIN}`,
      address,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', domain: VOIDMARKET_DOMAIN });
});

// ============================================================================
// Server Start
// ============================================================================

const PORT = process.env.ENS_GATEWAY_PORT || 3001;

export function startGateway() {
  app.listen(PORT, () => {
    console.log(`ENS Gateway running on port ${PORT}`);
    console.log(`Domain: ${VOIDMARKET_DOMAIN}`);
  });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startGateway();
}

export { app };
