# VoidMarket Flow Testing Implementation Plan

## Overview

This plan outlines the comprehensive testing architecture for VoidMarket's core functionality on Arc Testnet. We will create an isolated `flow-testing/` directory with end-to-end tests for all 13 core features using real integrations (Circle, ENS, CCTP) - no mocks.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VOIDMARKET ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        EXTERNAL CHAINS                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Sepolia   │  │ Base Sepolia│  │Arbitrum Sep │  │  Other EVM  │  │  │
│  │  │   (CCTP)    │  │   (CCTP)    │  │   (CCTP)    │  │   (LiFi)    │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │  │
│  │         │                │                │                │         │  │
│  │         └────────────────┼────────────────┼────────────────┘         │  │
│  │                          │                │                          │  │
│  │                    ┌─────┴────────────────┴─────┐                    │  │
│  │                    │     DEPOSIT ROUTER         │                    │  │
│  │                    │  • Circle CCTP (preferred) │                    │  │
│  │                    │  • LiFi (fallback chains)  │                    │  │
│  │                    └─────────────┬──────────────┘                    │  │
│  └──────────────────────────────────┼───────────────────────────────────┘  │
│                                     │                                      │
│                                     ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      ARC TESTNET (Liquidity Hub)                      │  │
│  │                         Chain ID: 5042002                             │  │
│  │                    Native Currency: USDC (18 decimals)                │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                     SMART CONTRACTS                              │ │  │
│  │  │                                                                  │ │  │
│  │  │  ┌───────────────────┐    ┌───────────────────┐                 │ │  │
│  │  │  │  VoidMarketCore   │    │ VoidMarketResolver│                 │ │  │
│  │  │  │  ---------------  │    │ -----------------  │                 │ │  │
│  │  │  │  • createMarket() │    │  • CCIP-Read ENS  │                 │ │  │
│  │  │  │  • placeBet()     │    │  • resolve()      │                 │ │  │
│  │  │  │  • revealBet()    │    │  • supportsINTF() │                 │ │  │
│  │  │  │  • resolveMarket()│    └───────────────────┘                 │ │  │
│  │  │  │  • claimWinnings()│                                          │ │  │
│  │  │  └───────────────────┘    ┌───────────────────┐                 │ │  │
│  │  │                           │   ClusterManager  │                 │ │  │
│  │  │  ┌───────────────────┐    │   -------------   │                 │ │  │
│  │  │  │   NovaManager     │    │  • createCluster()│                 │ │  │
│  │  │  │   -----------     │    │  • inviteMember() │                 │ │  │
│  │  │  │  • startNova()    │    │  • joinCluster()  │                 │ │  │
│  │  │  │  • submitBet()    │    │  • updatePhotons()│                 │ │  │
│  │  │  │  • resolveNova()  │    └───────────────────┘                 │ │  │
│  │  │  │  • claimRewards() │                                          │ │  │
│  │  │  └───────────────────┘                                          │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                    CIRCLE DEVELOPER WALLETS                      │ │  │
│  │  │  • RefID-based deterministic addresses                           │ │  │
│  │  │  • Gasless UX (server signs on behalf of users)                  │ │  │
│  │  │  • Same address across all chains                                │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         ENS IDENTITY LAYER                            │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │  │
│  │  │ star.void.eth   │  │ market.void.eth │  │ cluster.void.eth    │   │  │
│  │  │ (User Profiles) │  │ (Market Data)   │  │ (Team Data)         │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │  │
│  │                                                                       │  │
│  │  Gateway Server → CCIP-Read → Off-chain Resolution                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
voidmarket/
├── contracts/                          # Solidity smart contracts
│   ├── src/
│   │   ├── VoidMarketCore.sol         # Main market logic
│   │   ├── ClusterManager.sol         # Cluster/team management
│   │   ├── NovaManager.sol            # Nova (1v1 battles) logic
│   │   ├── VoidMarketResolver.sol     # ENS CCIP-Read resolver
│   │   └── interfaces/
│   │       ├── IVoidMarketCore.sol
│   │       ├── IClusterManager.sol
│   │       ├── INovaManager.sol
│   │       └── IStorkOracle.sol       # Stork price feed interface
│   ├── test/                          # Foundry tests
│   ├── script/                        # Deployment scripts
│   └── foundry.toml
│
├── flow-testing/                       # Integration testing suite
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   │
│   ├── src/
│   │   ├── config/
│   │   │   ├── chains.ts              # Chain configurations (Arc testnet)
│   │   │   ├── contracts.ts           # Contract addresses after deployment
│   │   │   └── circle.ts              # Circle SDK configuration
│   │   │
│   │   ├── services/
│   │   │   ├── circle/
│   │   │   │   ├── wallet.ts          # Wallet creation & management
│   │   │   │   ├── cctp.ts            # Cross-chain transfers
│   │   │   │   └── transactions.ts    # TX execution via Circle
│   │   │   │
│   │   │   ├── ens/
│   │   │   │   ├── resolver.ts        # ENS resolution
│   │   │   │   └── gateway.ts         # CCIP-Read gateway server
│   │   │   │
│   │   │   ├── lifi/
│   │   │   │   ├── quotes.ts          # Quote fetching
│   │   │   │   └── bridge.ts          # Fallback bridging
│   │   │   │
│   │   │   ├── telegram/
│   │   │   │   ├── bot.ts             # Telegram bot instance
│   │   │   │   ├── commands.ts        # Command handlers
│   │   │   │   └── notifications.ts   # DM notifications
│   │   │   │
│   │   │   ├── db/
│   │   │   │   ├── schema.ts          # PostgreSQL schema (Drizzle)
│   │   │   │   ├── queries.ts         # Database queries
│   │   │   │   └── migrations/        # DB migrations
│   │   │   │
│   │   │   └── contracts/
│   │   │       ├── market.ts          # Market contract interactions
│   │   │       ├── cluster.ts         # Cluster contract interactions
│   │   │       └── nova.ts            # Nova contract interactions
│   │   │
│   │   ├── flows/                     # Complete user flow implementations
│   │   │   ├── 01-user-registration.ts
│   │   │   ├── 02-create-profile.ts
│   │   │   ├── 03-create-regular-market.ts
│   │   │   ├── 04-bet-regular-market.ts
│   │   │   ├── 05-create-forked-market.ts
│   │   │   ├── 06-bet-forked-market.ts
│   │   │   ├── 07-resolve-market.ts
│   │   │   ├── 08-create-cluster.ts
│   │   │   ├── 09-invite-to-cluster.ts
│   │   │   ├── 10-join-cluster.ts
│   │   │   ├── 11-start-nova.ts
│   │   │   ├── 12-nova-rounds.ts
│   │   │   └── 13-nova-resolution.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── commitment.ts          # ZK commitment generation
│   │   │   ├── crypto.ts              # Hashing utilities
│   │   │   └── helpers.ts             # General helpers
│   │   │
│   │   └── types/
│   │       └── index.ts               # Type definitions
│   │
│   └── tests/
│       ├── unit/                      # Unit tests for services
│       ├── integration/               # Integration tests per flow
│       └── e2e/                       # Full end-to-end scenarios
│
└── frontend/                          # Existing Next.js app
```

---

## Smart Contracts Design

### 1. VoidMarketCore.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title VoidMarketCore
 * @notice Main contract for prediction markets with hidden bet directions
 *
 * Key Features:
 * - Markets are created with questions and deadlines
 * - Users place bets via commitment hashes (direction hidden)
 * - Users reveal bets after market resolution
 * - Winnings distributed based on reveals
 */
contract VoidMarketCore {

    // Market states
    enum MarketStatus { ACTIVE, RESOLVED, CANCELLED }

    // Bet structure (direction hidden until reveal)
    struct Bet {
        address bettor;
        uint256 amount;
        bytes32 commitmentHash;  // keccak256(direction, salt)
        bool revealed;
        bool direction;          // true = YES, false = NO
        uint256 timestamp;
    }

    // Market structure
    struct Market {
        uint256 id;
        string question;
        address creator;
        uint256 deadline;
        uint256 resolutionDeadline;
        MarketStatus status;
        bool outcome;            // true = YES won, false = NO won
        uint256 totalYesAmount;
        uint256 totalNoAmount;
        uint256 totalPool;
        bool isForked;           // true if this is a private forked market
        uint256 parentMarketId;  // 0 if original, parent ID if forked
    }

    // Functions
    function createMarket(
        string calldata question,
        uint256 deadline,
        uint256 resolutionDeadline
    ) external returns (uint256 marketId);

    function createForkedMarket(
        uint256 parentMarketId,
        string calldata customQuestion,
        uint256 deadline,
        uint256 resolutionDeadline
    ) external returns (uint256 marketId);

    function placeBet(
        uint256 marketId,
        bytes32 commitmentHash,
        uint256 amount
    ) external;

    function revealBet(
        uint256 marketId,
        bool direction,
        bytes32 salt
    ) external;

    function resolveMarket(
        uint256 marketId,
        bool outcome
    ) external; // Only callable by oracle/admin

    function claimWinnings(uint256 marketId) external;
}
```

### 2. ClusterManager.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ClusterManager
 * @notice Manages clusters (teams) and their members
 *
 * Key Features:
 * - Users create or join clusters
 * - Tracks photons (individual performance) and energy (team score)
 * - Invite system for private clusters
 */
contract ClusterManager {

    struct Cluster {
        uint256 id;
        string name;
        address leader;
        uint256 energy;          // Team score
        uint256 novasWon;
        uint256 totalNovas;
        bool isPrivate;
        uint256 memberCount;
    }

    struct Member {
        address memberAddress;
        uint256 photons;         // Individual performance score
        uint256 joinedAt;
        bool isActive;
    }

    struct Invite {
        uint256 clusterId;
        address invitee;
        address inviter;
        uint256 expiresAt;
        bool used;
    }

    function createCluster(
        string calldata name,
        bool isPrivate
    ) external returns (uint256 clusterId);

    function inviteToCluster(
        uint256 clusterId,
        address invitee
    ) external returns (bytes32 inviteCode);

    function joinCluster(
        uint256 clusterId,
        bytes32 inviteCode  // Required for private clusters
    ) external;

    function leaveCluster(uint256 clusterId) external;

    function updatePhotons(
        uint256 clusterId,
        address member,
        int256 photonDelta
    ) external; // Only callable by NovaManager

    function updateEnergy(
        uint256 clusterId,
        int256 energyDelta
    ) external; // Only callable by NovaManager
}
```

### 3. NovaManager.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title NovaManager
 * @notice Manages Nova battles (cluster vs cluster competitions)
 *
 * Key Features:
 * - 1v1 matches between cluster members
 * - Multi-round format
 * - Winner determination by photon count
 * - USDC rewards distribution
 */
contract NovaManager {

    enum NovaStatus { PENDING, ACTIVE, COMPLETED, CANCELLED }
    enum MatchStatus { PENDING, ACTIVE, RESOLVED }

    struct Nova {
        uint256 id;
        uint256 cluster1Id;
        uint256 cluster2Id;
        uint256 totalRounds;
        uint256 currentRound;
        NovaStatus status;
        uint256 prizePool;
        uint256 winningClusterId;
        uint256 startedAt;
    }

    struct Match {
        uint256 novaId;
        uint256 round;
        address star1;           // From cluster 1
        address star2;           // From cluster 2
        uint256 marketId;        // Linked prediction market
        MatchStatus status;
        address winner;
        uint256 star1Photons;    // Photons earned
        uint256 star2Photons;
    }

    function startNova(
        uint256 cluster1Id,
        uint256 cluster2Id,
        uint256 totalRounds,
        uint256 prizePool
    ) external returns (uint256 novaId);

    function submitMatchBet(
        uint256 novaId,
        uint256 round,
        bytes32 commitmentHash,
        uint256 amount
    ) external;

    function resolveMatch(
        uint256 novaId,
        uint256 round
    ) external;

    function advanceRound(uint256 novaId) external;

    function resolveNova(uint256 novaId) external;

    function claimNovaRewards(uint256 novaId) external;
}
```

---

## PostgreSQL Database Schema

```sql
-- Users/Stars
CREATE TABLE stars (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    circle_wallet_id VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE,
    star_type VARCHAR(20) NOT NULL, -- red-giant, blue-supergiant, etc.
    bio TEXT,
    cluster_id INTEGER REFERENCES clusters(id),
    photons INTEGER DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    bets_won INTEGER DEFAULT 0,
    ens_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Clusters
CREATE TABLE clusters (
    id SERIAL PRIMARY KEY,
    on_chain_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(50) UNIQUE NOT NULL,
    leader_id INTEGER REFERENCES stars(id),
    energy INTEGER DEFAULT 0,
    novas_won INTEGER DEFAULT 0,
    total_novas INTEGER DEFAULT 0,
    is_private BOOLEAN DEFAULT false,
    member_count INTEGER DEFAULT 0,
    ens_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cluster Invites
CREATE TABLE cluster_invites (
    id SERIAL PRIMARY KEY,
    cluster_id INTEGER REFERENCES clusters(id),
    invite_code VARCHAR(64) UNIQUE NOT NULL,
    inviter_id INTEGER REFERENCES stars(id),
    invitee_address VARCHAR(42),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    used_by INTEGER REFERENCES stars(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Markets
CREATE TABLE markets (
    id SERIAL PRIMARY KEY,
    on_chain_id INTEGER UNIQUE NOT NULL,
    question TEXT NOT NULL,
    category VARCHAR(20) NOT NULL, -- crypto, sports, politics, culture, custom
    creator_id INTEGER REFERENCES stars(id),
    deadline TIMESTAMP NOT NULL,
    resolution_deadline TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, RESOLVED, CANCELLED
    outcome BOOLEAN, -- null until resolved
    total_pool DECIMAL(20, 6) DEFAULT 0,
    total_yes_amount DECIMAL(20, 6) DEFAULT 0,
    total_no_amount DECIMAL(20, 6) DEFAULT 0,
    is_forked BOOLEAN DEFAULT false,
    parent_market_id INTEGER REFERENCES markets(id),
    ens_name VARCHAR(255),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bets (commitment stored, direction hidden until reveal)
CREATE TABLE bets (
    id SERIAL PRIMARY KEY,
    market_id INTEGER REFERENCES markets(id),
    bettor_id INTEGER REFERENCES stars(id),
    amount DECIMAL(20, 6) NOT NULL,
    commitment_hash VARCHAR(66) NOT NULL,
    revealed BOOLEAN DEFAULT false,
    direction BOOLEAN, -- null until revealed
    salt VARCHAR(66), -- stored after reveal for verification
    is_winner BOOLEAN,
    payout DECIMAL(20, 6),
    claimed BOOLEAN DEFAULT false,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW(),
    revealed_at TIMESTAMP,
    claimed_at TIMESTAMP
);

-- Novas (Cluster vs Cluster)
CREATE TABLE novas (
    id SERIAL PRIMARY KEY,
    on_chain_id INTEGER UNIQUE NOT NULL,
    cluster1_id INTEGER REFERENCES clusters(id),
    cluster2_id INTEGER REFERENCES clusters(id),
    total_rounds INTEGER NOT NULL,
    current_round INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ACTIVE, COMPLETED, CANCELLED
    prize_pool DECIMAL(20, 6) NOT NULL,
    winning_cluster_id INTEGER REFERENCES clusters(id),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
