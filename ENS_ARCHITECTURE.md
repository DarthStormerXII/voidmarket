# VoidMarket ENS Architecture

> Zero-gas ENS subdomains for users, markets, and clusters using CCIP-Read

---

## Overview

VoidMarket uses ENS as its **identity layer** - every user (Star), market, and cluster gets an ENS subdomain. Instead of expensive on-chain transactions for every subdomain and record update, we use **CCIP-Read (EIP-3668)** to resolve data from our off-chain gateway while maintaining ENS compatibility.

### Key Benefits

| Feature | Benefit |
|---------|---------|
| **Zero gas for subdomains** | Users get `username.voidmarket.eth` for free |
| **Zero gas for updates** | Change profiles, bet history, photons - no tx needed |
| **Full ENS compatibility** | Works with wagmi, viem, ethers, wallets, ENS apps |
| **Decentralized discovery** | Query `*.voidmarket.eth` to find all markets |
| **Portable identity** | Betting reputation travels with your ENS name |

---

## Problem: On-Chain ENS is Expensive

Traditional ENS approach:
```
Create subdomain  → Gas fee (~$5-20)
Update text record → Gas fee (~$3-10)
Update another record → Gas fee (~$3-10)

For 1000 users with 5 records each = $40,000+ in gas fees
```

**This kills UX for a Telegram Mini App where users expect instant, free interactions.**

---

## Solution: CCIP-Read Off-Chain Resolver

With CCIP-Read (EIP-3668) + Wildcard Resolution (ENSIP-10):
```
Create subdomain  → FREE (stored in database)
Update text record → FREE (database update)
Resolve name      → FREE (read-only, signed response)

Only cost: One-time resolver deployment (~$50-100)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ETHEREUM MAINNET (One-time deployment)                                 │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  VoidMarketResolver.sol                                          │   │
│  │                                                                   │   │
│  │  • Registered as resolver for voidmarket.eth                     │   │
│  │  • Implements IExtendedResolver (ENSIP-10 wildcard)              │   │
│  │  • Reverts with OffchainLookup → points to gateway               │   │
│  │  • Callback verifies signatures from trusted signer              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ OffchainLookup error
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  GATEWAY SERVER (gateway.voidmarket.xyz)                                │
│                                                                         │
│  Handles queries for:                                                   │
│  ├── cosmicvoyager.voidmarket.eth     → Star profile                   │
│  ├── eth-5k.voidmarket.eth            → Market data                    │
│  ├── void-seekers.voidmarket.eth      → Cluster data                   │
│  └── eth-5k.cosmicvoyager.voidmarket.eth → User's forked market        │
│                                                                         │
│  Returns signed responses (verified on-chain in callback)               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Reads from
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  DATA LAYER (Hybrid Architecture)                                       │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ARC CHAIN (Critical/Financial Data)                              │ │
│  │                                                                    │ │
│  │  • Wallet addresses (Circle developer wallets)                    │ │
│  │  • Bet commitments & reveals                                      │ │
│  │  • USDC balances & payouts                                        │ │
│  │  • Market resolution results                                      │ │
│  │                                                                    │ │
│  │  → Uses developer wallets = appears gasless to users              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  POSTGRESQL (Metadata/Stats)                                      │ │
│  │                                                                    │ │
│  │  • User profiles (star type, bio, avatar)                         │ │
│  │  • Cluster stats (energy, novas won, members)                     │ │
│  │  • Market metadata (question, category, deadline)                 │ │
│  │  • Leaderboards & analytics                                       │ │
│  │                                                                    │ │
│  │  → Free updates, fast queries, no gas                             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Resolution Flow (Zero Gas for Users)

```
User/App queries: cosmicvoyager.voidmarket.eth
         │
         ▼
┌─────────────────────────────────────────┐
│ 1. Client calls VoidMarketResolver      │
│    resolver.resolve("cosmicvoyager...") │
│                                         │
│    This is a READ operation (no gas)    │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 2. Contract reverts with OffchainLookup │
│                                         │
│    error OffchainLookup(                │
│      sender: resolver address,          │
│      urls: ["https://gateway.../{data}"]│
│      callData: encoded query,           │
│      callbackFunction: selector,        │
│      extraData: for verification        │
│    )                                    │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 3. Client auto-fetches from gateway     │
│    (viem/wagmi/ethers handle this)      │
│                                         │
│    GET gateway.voidmarket.xyz/resolve/  │
│        {sender}/{calldata}              │
│                                         │
│    Gateway returns:                     │
│    {                                    │
│      data: ABI-encoded response,        │
│      signature: signed by trusted key   │
│    }                                    │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 4. Client calls callback on resolver    │
│    (still a READ operation - no gas)    │
│                                         │
│    Resolver verifies:                   │
│    • Signature from trusted signer      │
│    • Response not expired               │
│                                         │
│    Returns resolved data to client      │
└─────────────────────────────────────────┘
```

---

## Smart Contract: VoidMarketResolver.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@ensdomains/ens-contracts/contracts/resolvers/profiles/IExtendedResolver.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VoidMarketResolver
 * @notice Off-chain ENS resolver for voidmarket.eth using CCIP-Read (EIP-3668)
 * @dev Implements wildcard resolution (ENSIP-10) for all subdomains
 */
contract VoidMarketResolver is IExtendedResolver, Ownable {
    using ECDSA for bytes32;

    // Gateway URL template - {sender} and {data} are replaced by client
    string public gatewayUrl;

    // Trusted signer for gateway responses
    address public trustedSigner;

    // Response validity period (default 5 minutes)
    uint64 public responseValidityPeriod = 300;

    // EIP-3668 OffchainLookup error
    error OffchainLookup(
        address sender,
        string[] urls,
        bytes callData,
        bytes4 callbackFunction,
        bytes extraData
    );

    // Custom errors
    error ResponseExpired();
    error InvalidSignature();

    // Events
    event GatewayUrlUpdated(string newUrl);
    event TrustedSignerUpdated(address newSigner);

    constructor(
        string memory _gatewayUrl,
        address _trustedSigner
    ) Ownable(msg.sender) {
        gatewayUrl = _gatewayUrl;
        trustedSigner = _trustedSigner;
    }

    /**
     * @notice Resolve any subdomain of voidmarket.eth
     * @dev Implements ENSIP-10 wildcard resolution
     * @param name DNS-encoded name (e.g., "\x0ccosmicvoyager\x0avoidmarket\x03eth\x00")
     * @param data ABI-encoded resolver call (e.g., addr(bytes32), text(bytes32,string))
     * @return Result of the resolution (reverts with OffchainLookup)
     */
    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view override returns (bytes memory) {
        // Construct gateway URL with placeholders
        string[] memory urls = new string[](1);
        urls[0] = string(abi.encodePacked(
            gatewayUrl,
            "/resolve/{sender}/{data}"
        ));

        // Encode the original query for verification in callback
        bytes memory callData = abi.encode(name, data);

        // Revert with OffchainLookup to trigger CCIP-Read
        revert OffchainLookup(
            address(this),
            urls,
            callData,
            VoidMarketResolver.resolveWithProof.selector,
            callData // extraData for callback verification
        );
    }

    /**
     * @notice Callback function to verify and return gateway response
     * @dev Called by client after receiving gateway response
     * @param response ABI-encoded (result, expires, signature) from gateway
     * @param extraData Original query data for verification
     * @return The verified resolution result
     */
    function resolveWithProof(
        bytes calldata response,
        bytes calldata extraData
    ) external view returns (bytes memory) {
        // Decode gateway response
        (bytes memory result, uint64 expires, bytes memory signature) =
            abi.decode(response, (bytes, uint64, bytes));

        // Verify response hasn't expired
        if (expires <= block.timestamp) {
            revert ResponseExpired();
        }

        // Construct message hash (same as gateway)
        bytes32 messageHash = keccak256(
            abi.encodePacked(result, expires, extraData)
        ).toEthSignedMessageHash();

        // Verify signature from trusted signer
        if (!SignatureChecker.isValidSignatureNow(trustedSigner, messageHash, signature)) {
            revert InvalidSignature();
        }

        return result;
    }

    /**
     * @notice Check if this resolver supports a given interface
     * @param interfaceID The interface identifier
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return
            interfaceID == type(IExtendedResolver).interfaceId ||
            interfaceID == 0x01ffc9a7; // ERC-165
    }

    // ============ Admin Functions ============

    function setGatewayUrl(string calldata _gatewayUrl) external onlyOwner {
        gatewayUrl = _gatewayUrl;
        emit GatewayUrlUpdated(_gatewayUrl);
    }

    function setTrustedSigner(address _trustedSigner) external onlyOwner {
        trustedSigner = _trustedSigner;
        emit TrustedSignerUpdated(_trustedSigner);
    }

    function setResponseValidityPeriod(uint64 _period) external onlyOwner {
        responseValidityPeriod = _period;
    }
}
```

---

## Gateway Server Implementation

### Directory Structure

```
gateway/
├── src/
│   ├── index.ts           # Express server entry
│   ├── routes/
│   │   └── resolve.ts     # CCIP-Read endpoint
│   ├── services/
│   │   ├── database.ts    # Database queries
│   │   ├── signer.ts      # Response signing
│   │   └── decoder.ts     # DNS/ABI decoding
│   └── types/
│       └── index.ts       # TypeScript types
├── package.json
└── .env
```

### Main Server (src/index.ts)

```typescript
import express from 'express';
import cors from 'cors';
import { resolveRouter } from './routes/resolve';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS for cross-origin CCIP-Read requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'voidmarket-ens-gateway' });
});

// CCIP-Read resolve endpoint
app.use('/resolve', resolveRouter);

app.listen(PORT, () => {
  console.log(`VoidMarket ENS Gateway running on port ${PORT}`);
});
```

### Resolve Route (src/routes/resolve.ts)

```typescript
import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { decodeDnsName, decodeResolverCall } from '../services/decoder';
import { signResponse } from '../services/signer';
import {
  getStarByName,
  getMarketByName,
  getClusterByName
} from '../services/database';

export const resolveRouter = Router();

// Standard resolver interface selectors
const SELECTORS = {
  addr: '0x3b3b57de',           // addr(bytes32)
  addrMultichain: '0xf1cb7e06', // addr(bytes32,uint256)
  text: '0x59d1d43c',           // text(bytes32,string)
  contenthash: '0xbc1c58d1',    // contenthash(bytes32)
};

/**
 * CCIP-Read endpoint
 * GET /resolve/:sender/:calldata
 */
resolveRouter.get('/:sender/:calldata', async (req: Request, res: Response) => {
  try {
    const { sender, calldata } = req.params;

    // Decode the calldata (contains DNS-encoded name and resolver call)
    const calldataBytes = Buffer.from(calldata.slice(2), 'hex');
    const [nameBytes, dataBytes] = ethers.AbiCoder.defaultAbiCoder().decode(
      ['bytes', 'bytes'],
      calldataBytes
    );

    // Decode DNS-encoded name
    const fullName = decodeDnsName(nameBytes); // e.g., "cosmicvoyager.voidmarket.eth"
    const parts = fullName.split('.');

    // Parse subdomain structure
    // Could be: subdomain.voidmarket.eth
    // Or nested: market.user.voidmarket.eth
    const subdomain = parts[0];
    const parentDomain = parts.length > 3 ? parts[1] : null;

    // Detect entity type and fetch data
    const entity = await resolveEntity(subdomain, parentDomain);

    if (!entity) {
      return res.status(404).json({ error: 'Name not found' });
    }

    // Decode what resolver method was called
    const { selector, params } = decodeResolverCall(dataBytes);

    // Resolve based on method
    let result: string;

    switch (selector) {
      case SELECTORS.addr:
        result = ethers.AbiCoder.defaultAbiCoder().encode(
          ['address'],
          [entity.walletAddress || ethers.ZeroAddress]
        );
        break;

      case SELECTORS.text:
        const key = params.key as string;
        const textValue = entity.textRecords?.[key] || '';
        result = ethers.AbiCoder.defaultAbiCoder().encode(['string'], [textValue]);
        break;

      case SELECTORS.contenthash:
        const contenthash = entity.contenthash || '0x';
        result = ethers.AbiCoder.defaultAbiCoder().encode(['bytes'], [contenthash]);
        break;

      default:
        return res.status(400).json({ error: 'Unsupported resolver method' });
    }

    // Sign the response
    const expires = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    const signedResponse = await signResponse(result, expires, calldataBytes);

    // Return CCIP-Read format
    res.json({ data: signedResponse });

  } catch (error) {
    console.error('Resolution error:', error);
    res.status(500).json({ error: 'Resolution failed' });
  }
});

/**
 * Resolve entity from database based on subdomain
 */
async function resolveEntity(subdomain: string, parentDomain: string | null) {
  // Check if it's a nested subdomain (forked market)
  if (parentDomain) {
    // e.g., eth-5k.cosmicvoyager.voidmarket.eth
    // This is a forked market owned by cosmicvoyager
    return await getMarketByName(subdomain, parentDomain);
  }

  // Try to resolve as different entity types
  // Priority: Star > Market > Cluster

  // Check if it's a star (user)
  const star = await getStarByName(subdomain);
  if (star) return { ...star, type: 'star' };

  // Check if it's a market
  const market = await getMarketByName(subdomain);
  if (market) return { ...market, type: 'market' };

  // Check if it's a cluster
  const cluster = await getClusterByName(subdomain);
  if (cluster) return { ...cluster, type: 'cluster' };

  return null;
}
```

### Signer Service (src/services/signer.ts)

```typescript
import { ethers } from 'ethers';

const SIGNER_PRIVATE_KEY = process.env.ENS_GATEWAY_SIGNER_KEY!;
const signer = new ethers.Wallet(SIGNER_PRIVATE_KEY);

/**
 * Sign a gateway response for CCIP-Read verification
 */
export async function signResponse(
  result: string,
  expires: number,
  extraData: Uint8Array
): Promise<string> {
  // Create message hash (must match contract's verification)
  const messageHash = ethers.solidityPackedKeccak256(
    ['bytes', 'uint64', 'bytes'],
    [result, expires, extraData]
  );

  // Sign the message
  const signature = await signer.signMessage(ethers.getBytes(messageHash));

  // Encode response for contract callback
  const response = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes', 'uint64', 'bytes'],
    [result, expires, signature]
  );

  return response;
}

export function getSignerAddress(): string {
  return signer.address;
}
```

### DNS Decoder (src/services/decoder.ts)

```typescript
import { ethers } from 'ethers';

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

  return parts.join('.');
}

/**
 * Decode resolver call to extract method and parameters
 */
export function decodeResolverCall(data: Uint8Array): {
  selector: string;
  params: Record<string, any>
} {
  const selector = ethers.hexlify(data.slice(0, 4));
  const params: Record<string, any> = {};

  // Decode based on selector
  switch (selector) {
    case '0x3b3b57de': // addr(bytes32)
      const [node] = ethers.AbiCoder.defaultAbiCoder().decode(
        ['bytes32'],
        data.slice(4)
      );
      params.node = node;
      break;

    case '0x59d1d43c': // text(bytes32,string)
      const [textNode, key] = ethers.AbiCoder.defaultAbiCoder().decode(
        ['bytes32', 'string'],
        data.slice(4)
      );
      params.node = textNode;
      params.key = key;
      break;
  }

  return { selector, params };
}
```

---

## ENS Text Records Schema

### Stars (Users)

| Key | Example Value | Description |
|-----|---------------|-------------|
| `addr(60)` | `0x7A3B...F92D` | Ethereum wallet address |
| `avatar` | `ipfs://Qm.../avatar.png` | Profile picture |
| `description` | `"Seeking truth in the void"` | User bio |
| `voidmarket.star-type` | `"blue-supergiant"` | Star avatar type |
| `voidmarket.cluster` | `"void-seekers"` | Current cluster name |
| `voidmarket.total-photons` | `"1250"` | Total photons earned |
| `voidmarket.bets-won` | `"47"` | Number of winning bets |
| `voidmarket.bets-lost` | `"23"` | Number of losing bets |
| `voidmarket.bets-active` | `"5"` | Current active bets |
| `voidmarket.created-at` | `"2025-02-01T00:00:00Z"` | Account creation date |

### Markets

| Key | Example Value | Description |
|-----|---------------|-------------|
| `voidmarket.question` | `"Will ETH hit $5,000 by Q1 2025?"` | Market question |
| `voidmarket.deadline` | `"2025-03-31T23:59:59Z"` | Resolution deadline |
| `voidmarket.oracle` | `"stork:eth-usd"` | Oracle source |
| `voidmarket.target-value` | `"5000"` | Target value for resolution |
| `voidmarket.pool-size` | `"12500"` | Total USDC in pool |
| `voidmarket.total-bets` | `"847"` | Number of bets placed |
| `voidmarket.status` | `"open"` | open/closed/resolved |
| `voidmarket.result` | `"yes"` | Resolution result (empty until resolved) |
| `voidmarket.creator` | `"cosmicvoyager"` | Creator's star name |
| `voidmarket.is-private` | `"true"` | Private (forked) market |
| `voidmarket.share-code` | `"VOID-AB3XK9"` | Invite code for private markets |
| `voidmarket.category` | `"crypto"` | Market category |

### Clusters

| Key | Example Value | Description |
|-----|---------------|-------------|
| `avatar` | `ipfs://Qm.../cluster.png` | Cluster logo |
| `description` | `"We seek truth in darkness"` | Cluster description |
| `voidmarket.energy` | `"3450"` | Total cluster energy |
| `voidmarket.leader` | `"cosmicvoyager"` | Leader's star name |
| `voidmarket.members` | `"4"` | Member count |
| `voidmarket.novas-total` | `"15"` | Total novas played |
| `voidmarket.novas-won` | `"10"` | Novas won |
| `voidmarket.created-at` | `"2025-01-15T00:00:00Z"` | Creation date |

---

## Frontend Integration

### Using wagmi/viem

```typescript
import { useEnsAddress, useEnsText } from 'wagmi';
import { normalize } from 'viem/ens';

// Resolve star's wallet address
export function useStarAddress(starName: string) {
  return useEnsAddress({
    name: normalize(`${starName}.voidmarket.eth`),
    chainId: 1, // Always resolve from mainnet
  });
}

// Resolve star's profile
export function useStarProfile(starName: string) {
  const { data: address } = useEnsAddress({
    name: normalize(`${starName}.voidmarket.eth`),
    chainId: 1,
  });

  const { data: starType } = useEnsText({
    name: normalize(`${starName}.voidmarket.eth`),
    key: 'voidmarket.star-type',
    chainId: 1,
  });

  const { data: photons } = useEnsText({
    name: normalize(`${starName}.voidmarket.eth`),
    key: 'voidmarket.total-photons',
    chainId: 1,
  });

  const { data: cluster } = useEnsText({
    name: normalize(`${starName}.voidmarket.eth`),
    key: 'voidmarket.cluster',
    chainId: 1,
  });

  return {
    address,
    starType,
    photons: photons ? parseInt(photons) : 0,
    cluster,
  };
}

// Resolve market details
export function useMarketDetails(marketName: string) {
  const name = normalize(`${marketName}.voidmarket.eth`);

  const { data: question } = useEnsText({ name, key: 'voidmarket.question', chainId: 1 });
  const { data: deadline } = useEnsText({ name, key: 'voidmarket.deadline', chainId: 1 });
  const { data: poolSize } = useEnsText({ name, key: 'voidmarket.pool-size', chainId: 1 });
  const { data: status } = useEnsText({ name, key: 'voidmarket.status', chainId: 1 });
  const { data: totalBets } = useEnsText({ name, key: 'voidmarket.total-bets', chainId: 1 });

  return {
    question,
    deadline: deadline ? new Date(deadline) : null,
    poolSize: poolSize ? parseFloat(poolSize) : 0,
    status,
    totalBets: totalBets ? parseInt(totalBets) : 0,
  };
}
```

### Batch Resolution with viem

```typescript
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// Batch resolve multiple text records
export async function getFullStarProfile(starName: string) {
  const name = normalize(`${starName}.voidmarket.eth`);

  const [address, starType, photons, cluster, betsWon, betsLost] = await Promise.all([
    client.getEnsAddress({ name }),
    client.getEnsText({ name, key: 'voidmarket.star-type' }),
    client.getEnsText({ name, key: 'voidmarket.total-photons' }),
    client.getEnsText({ name, key: 'voidmarket.cluster' }),
    client.getEnsText({ name, key: 'voidmarket.bets-won' }),
    client.getEnsText({ name, key: 'voidmarket.bets-lost' }),
  ]);

  return {
    address,
    starType,
    photons: parseInt(photons || '0'),
    cluster,
    record: {
      won: parseInt(betsWon || '0'),
      lost: parseInt(betsLost || '0'),
    },
  };
}
```

---

## Database Schema (PostgreSQL)

```sql
-- Stars (Users) - corresponds to *.voidmarket.eth
CREATE TABLE stars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,  -- ENS subdomain (e.g., "cosmicvoyager")
    wallet_address VARCHAR(42) NOT NULL,
    telegram_id VARCHAR(255),
    circle_wallet_id VARCHAR(255),
    star_type VARCHAR(50) NOT NULL,     -- red-giant, blue-supergiant, etc.
    description TEXT,
    cluster_id UUID REFERENCES clusters(id),
    total_photons INTEGER DEFAULT 0,
    bets_won INTEGER DEFAULT 0,
    bets_lost INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Markets - corresponds to *.voidmarket.eth
CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,  -- ENS subdomain (e.g., "eth-5k")
    question TEXT NOT NULL,
    deadline TIMESTAMP NOT NULL,
    oracle_source VARCHAR(255) NOT NULL,
    target_value DECIMAL,
    pool_size DECIMAL DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open',  -- open, closed, resolved
    result VARCHAR(10),                  -- yes, no, null
    creator_id UUID REFERENCES stars(id),
    is_private BOOLEAN DEFAULT FALSE,
    share_code VARCHAR(20),
    original_market_id UUID REFERENCES markets(id),  -- For forked markets
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Clusters - corresponds to *.voidmarket.eth
CREATE TABLE clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,  -- ENS subdomain (e.g., "void-seekers")
    description TEXT,
    leader_id UUID REFERENCES stars(id),
    energy INTEGER DEFAULT 0,
    novas_total INTEGER DEFAULT 0,
    novas_won INTEGER DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast ENS lookups
CREATE INDEX idx_stars_name ON stars(name);
CREATE INDEX idx_markets_name ON markets(name);
CREATE INDEX idx_clusters_name ON clusters(name);
```

---

## Deployment Steps

### 1. Register voidmarket.eth

- Register `voidmarket.eth` on ENS (mainnet)
- Cost: ~0.003 ETH/year for 5+ letter names

### 2. Deploy VoidMarketResolver

```bash
# Using Foundry
forge create --rpc-url $ETH_RPC_URL \
  --private-key $DEPLOYER_KEY \
  src/VoidMarketResolver.sol:VoidMarketResolver \
  --constructor-args "https://gateway.voidmarket.xyz" $TRUSTED_SIGNER_ADDRESS
```

### 3. Set Resolver for voidmarket.eth

```typescript
import { createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const client = createWalletClient({
  chain: mainnet,
  transport: http(),
  account: privateKeyToAccount(OWNER_PRIVATE_KEY),
});

// Set resolver on ENS registry
await client.writeContract({
  address: ENS_REGISTRY_ADDRESS,
  abi: ensRegistryAbi,
  functionName: 'setResolver',
  args: [namehash('voidmarket.eth'), VOIDMARKET_RESOLVER_ADDRESS],
});
```

### 4. Deploy Gateway Server

- Deploy to any cloud provider (Vercel, Railway, AWS, etc.)
- Ensure high availability (this is critical for resolution)
- Set up monitoring and alerting

### 5. Configure Environment

```env
# Gateway Server
ENS_GATEWAY_SIGNER_KEY=0x...  # Private key for signing responses
DATABASE_URL=postgresql://...
PORT=3000

# Frontend
NEXT_PUBLIC_ENS_GATEWAY_URL=https://gateway.voidmarket.xyz
```

---

## Security Considerations

### Trusted Signer

- The signer private key should be stored securely (HSM recommended for production)
- Rotate keys periodically
- Consider multi-sig for critical updates

### Response Expiry

- Responses expire after 5 minutes by default
- Prevents replay attacks
- Adjustable via `responseValidityPeriod`

### Gateway Availability

- If gateway is down, names won't resolve
- Implement redundancy (multiple gateway URLs supported)
- Monitor uptime

### Data Integrity

- All data signed by trusted signer
- On-chain verification in callback
- Consider adding additional validation (e.g., Merkle proofs for critical data)

---

## Why This Wins "Most Creative ENS for DeFi" Prize

| ENS Bounty Criteria | VoidMarket Implementation |
|---------------------|---------------------------|
| **Beyond name→address mapping** | Full user profiles, market registries, clan systems |
| **Text records for DeFi** | Betting preferences, oracle configs, pool sizes, commitments |
| **Not an afterthought** | ENS IS the mandatory identity layer |
| **Creative application** | Decentralized discovery of prediction markets |
| **Technical depth** | Custom CCIP-Read resolver with wildcard resolution |
| **Portable identity** | Betting reputation travels with your ENS subdomain |

### Unique Innovations

1. **Prediction Markets as ENS Names**: First prediction market where markets ARE ENS subdomains
2. **User Reputation on ENS**: Win/loss records, photons, cluster membership - all resolvable via ENS
3. **Nested Subdomains for Forked Markets**: `eth-5k.alice.voidmarket.eth` for private markets
4. **Zero-Gas User Onboarding**: Get a .eth subdomain without any transaction

---

## Hybrid Data Layer: What Goes Where

### Arc Chain (On-Chain via Developer Wallets)

| Data Type | Description | Why On-Chain |
|-----------|-------------|--------------|
| `wallet_address` | User's Circle wallet | Identity verification |
| `bet_commitment` | Hash of bet direction | Tamper-proof betting |
| `bet_reveal` | Direction + secret | Verifiable resolution |
| `usdc_balance` | User's betting balance | Financial integrity |
| `payout_tx` | Settlement transactions | Audit trail |
| `market_result` | Final YES/NO outcome | Immutable record |

### PostgreSQL (Off-Chain Database)

| Data Type | Description | Why Off-Chain |
|-----------|-------------|---------------|
| `star_type` | User avatar (blue-supergiant, etc.) | Cosmetic, fast updates |
| `description` | User/cluster bio | Editable profile data |
| `total_photons` | User's earned points | Frequently updated stat |
| `energy` | Cluster score | Aggregate stat |
| `novas_won/lost` | Battle history | Analytics data |
| `category` | Market category | Filtering/search |
| `pool_size` | Current pool size | Computed aggregate |
| `total_bets` | Bet count | Computed aggregate |

### Gateway Resolution Logic

```typescript
async function resolveEntity(subdomain: string, key: string) {
  // Critical data → read from Arc Chain
  if (key === 'addr' || key.startsWith('voidmarket.bet.')) {
    return await readFromArc(subdomain, key);
  }

  // Metadata → read from PostgreSQL
  return await readFromDatabase(subdomain, key);
}
```

---

## References

- [EIP-3668: CCIP Read](https://eips.ethereum.org/EIPS/eip-3668)
- [ENSIP-10: Wildcard Resolution](https://docs.ens.domains/ensip/10)
- [ENS Off-chain Resolver](https://github.com/ensdomains/offchain-resolver)
- [ENS Documentation](https://docs.ens.domains)
- [Base ENS Implementation](https://ens.domains/ecosystem/base)
