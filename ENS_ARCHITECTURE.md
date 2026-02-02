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

