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
    created_at TIMESTAMP DEFAULT NOW()
);

-- Nova Matches
CREATE TABLE nova_matches (
    id SERIAL PRIMARY KEY,
    nova_id INTEGER REFERENCES novas(id),
    round INTEGER NOT NULL,
    star1_id INTEGER REFERENCES stars(id),
    star2_id INTEGER REFERENCES stars(id),
    market_id INTEGER REFERENCES markets(id),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ACTIVE, RESOLVED
    winner_id INTEGER REFERENCES stars(id),
    star1_photons INTEGER DEFAULT 0,
    star2_photons INTEGER DEFAULT 0,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions (for wallet history)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    star_id INTEGER REFERENCES stars(id),
    type VARCHAR(20) NOT NULL, -- DEPOSIT, WITHDRAW, BET, WINNINGS, NOVA_REWARD
    amount DECIMAL(20, 6) NOT NULL,
    source_chain VARCHAR(50),
    destination_chain VARCHAR(50) DEFAULT 'ARC_TESTNET',
    tx_hash VARCHAR(66),
    cctp_message_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, CONFIRMED, FAILED
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_stars_telegram ON stars(telegram_id);
CREATE INDEX idx_stars_wallet ON stars(wallet_address);
CREATE INDEX idx_bets_market ON bets(market_id);
CREATE INDEX idx_bets_bettor ON bets(bettor_id);
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_novas_status ON novas(status);
CREATE INDEX idx_transactions_star ON transactions(star_id);
```

---

## Telegram Bot Commands

```typescript
// Bot command handlers

// /start - Begin registration
bot.command('start', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const existingUser = await db.getStarByTelegramId(telegramId);

  if (existingUser) {
    return ctx.reply(`Welcome back, ${existingUser.username}! Use /help to see commands.`);
  }

  // Create Circle wallet
  const wallet = await createDeveloperWallet(telegramId, 'ARC-TESTNET');

  // Store in DB
  await db.createStar({
    telegramId,
    walletAddress: wallet.address,
    circleWalletId: wallet.id,
  });

  // Send Mini App link for profile setup
  return ctx.reply(
    'Welcome to VoidMarket! Your wallet has been created.\n' +
    'Complete your profile to start betting:',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '⭐ Create Profile', web_app: { url: MINI_APP_URL + '/onboarding' } }
        ]]
      }
    }
  );
});

// /balance - Check USDC balance
bot.command('balance', async (ctx) => {
  const star = await db.getStarByTelegramId(ctx.from.id.toString());
  if (!star) return ctx.reply('Please /start first to create your wallet.');

  const balance = await getArcBalances(star.walletAddress);
  return ctx.reply(
    `💰 Your Balance:\n` +
    `${balance.erc20Formatted} USDC\n\n` +
    `Wallet: ${star.walletAddress.slice(0,6)}...${star.walletAddress.slice(-4)}`
  );
});

// /bet <market_id> - Open bet drawer for market
bot.command('bet', async (ctx) => {
  const marketId = ctx.match;
  if (!marketId) return ctx.reply('Usage: /bet <market_id>');

  const market = await db.getMarketById(parseInt(marketId));
  if (!market) return ctx.reply('Market not found.');

  return ctx.reply(
    `📊 ${market.question}\n` +
    `Pool: ${market.totalPool} USDC\n` +
    `Deadline: ${market.deadline.toLocaleDateString()}`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '🎲 Place Bet', web_app: { url: MINI_APP_URL + `/markets/${marketId}` } }
        ]]
      }
    }
  );
});

// /reveal <market_id> - Reveal bet after resolution
bot.command('reveal', async (ctx) => {
  const marketId = ctx.match;
  const star = await db.getStarByTelegramId(ctx.from.id.toString());

  const bet = await db.getBetByMarketAndBettor(parseInt(marketId), star.id);
  if (!bet || bet.revealed) return ctx.reply('No unrevealed bet found for this market.');

  // Retrieve stored salt (this should be stored client-side, simplified for demo)
  // In production, user needs to provide their salt
  return ctx.reply(
    'Your bet needs to be revealed!\n' +
    'Open the app to reveal your bet direction:',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '🔓 Reveal Bet', web_app: { url: MINI_APP_URL + `/mybets?reveal=${marketId}` } }
        ]]
      }
    }
  );
});

// /claim - Claim all pending winnings
bot.command('claim', async (ctx) => {
  const star = await db.getStarByTelegramId(ctx.from.id.toString());
  const claimableBets = await db.getClaimableBets(star.id);

  if (claimableBets.length === 0) {
    return ctx.reply('No pending winnings to claim.');
  }

  const totalClaimable = claimableBets.reduce((sum, bet) => sum + bet.payout, 0);
  return ctx.reply(
    `🎉 You have ${claimableBets.length} winning bets to claim!\n` +
    `Total: ${totalClaimable} USDC\n\n` +
    `Claim now:`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '💸 Claim All', web_app: { url: MINI_APP_URL + `/mybets?claim=all` } }
        ]]
      }
    }
  );
});

// /profile - View star profile
bot.command('profile', async (ctx) => {
  const star = await db.getStarByTelegramId(ctx.from.id.toString());

  return ctx.reply(
    `⭐ ${star.username}\n` +
    `Type: ${star.starType}\n` +
    `Photons: ${star.photons}\n` +
    `Bets: ${star.betsWon}/${star.totalBets} won\n` +
    `Cluster: ${star.cluster?.name || 'None'}\n` +
    `ENS: ${star.ensName || 'Not set'}`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '✏️ Edit Profile', web_app: { url: MINI_APP_URL + '/star' } }
        ]]
      }
    }
  );
});

// /cluster - Cluster management
bot.command('cluster', async (ctx) => {
  const star = await db.getStarByTelegramId(ctx.from.id.toString());

  if (star.clusterId) {
    const cluster = await db.getClusterById(star.clusterId);
    return ctx.reply(
      `🌌 ${cluster.name}\n` +
      `Energy: ${cluster.energy}\n` +
      `Members: ${cluster.memberCount}\n` +
      `Novas: ${cluster.novasWon}/${cluster.totalNovas} won`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '👥 View Cluster', web_app: { url: MINI_APP_URL + '/clusters' } }
          ]]
        }
      }
    );
  }

  return ctx.reply(
    'You are not in a cluster yet.\n' +
    'Create or join one:',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '🆕 Create Cluster', web_app: { url: MINI_APP_URL + '/clusters/create' } },
          { text: '🔍 Browse Clusters', web_app: { url: MINI_APP_URL + '/clusters' } }
        ]]
      }
    }
  );
});

// Notification helpers
async function notifyMarketResolved(marketId: number) {
  const bets = await db.getBetsByMarket(marketId);
  const market = await db.getMarketById(marketId);

  for (const bet of bets) {
    const star = await db.getStarById(bet.bettorId);
    await bot.api.sendMessage(
      star.telegramId,
      `🔔 Market Resolved!\n\n` +
      `"${market.question}"\n` +
      `Outcome: ${market.outcome ? 'YES' : 'NO'}\n\n` +
      `Reveal your bet to see if you won!`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🔓 Reveal Bet', web_app: { url: MINI_APP_URL + `/mybets?reveal=${marketId}` } }
          ]]
        }
      }
    );
  }
}
```

---

## Flow Testing Implementation Details

### Flow 1: User Registration & Setup

**File**: `flow-testing/src/flows/01-user-registration.ts`

```typescript
/**
 * User Registration Flow
 *
 * Steps:
 * 1. User connects via Telegram (simulated with telegramId)
 * 2. Create Circle developer wallet with RefID = telegramId
 * 3. Wallet gets same address on Arc Testnet
 * 4. Store mapping: telegramId → walletAddress
 *
 * Integrations:
 * - Circle SDK (from playground-circle)
 */

export async function registerUser(telegramId: string): Promise<{
  walletAddress: string;
  walletId: string;
  refId: string;
}> {
  // Use Circle SDK to create wallet
  // RefID ensures deterministic address
}
```

### Flow 2: Create Profile

**File**: `flow-testing/src/flows/02-create-profile.ts`

```typescript
/**
 * Profile Creation Flow
 *
 * Steps:
 * 1. User selects star type (6 options)
 * 2. User sets username
 * 3. Profile stored off-chain (DB) + ENS subdomain registered
 * 4. ENS: username.voidmarket.eth → profile data
 *
 * Integrations:
 * - ENS CCIP-Read resolver
 * - Database (PostgreSQL)
 */

export async function createProfile(params: {
  walletAddress: string;
  username: string;
  starType: StarType;
  bio?: string;
}): Promise<{
  profileId: string;
  ensName: string;
}> {
  // Store in DB
  // Register ENS subdomain via resolver
}
```

### Flow 3: Create Regular Market

**File**: `flow-testing/src/flows/03-create-regular-market.ts`

```typescript
/**
 * Regular Market Creation Flow
 *
 * Steps:
 * 1. User defines question, category, deadline
 * 2. Call VoidMarketCore.createMarket()
 * 3. Market registered on-chain
 * 4. ENS: market-slug.voidmarket.eth → market data
 *
 * Integrations:
 * - Circle SDK (sign tx)
 * - VoidMarketCore contract
 * - ENS resolver
 */

export async function createRegularMarket(params: {
  creator: string;
  question: string;
  category: MarketCategory;
  deadline: Date;
  resolutionDeadline: Date;
}): Promise<{
  marketId: number;
  txHash: string;
  ensName: string;
}> {
  // Execute contract call via Circle
}
```

### Flow 4: Bet on Regular Market

**File**: `flow-testing/src/flows/04-bet-regular-market.ts`

```typescript
/**
 * Betting Flow (Hidden Direction)
 *
 * Steps:
 * 1. User selects YES or NO
 * 2. Generate commitment: keccak256(direction, salt)
 * 3. Store salt locally (user's device)
 * 4. Call VoidMarketCore.placeBet(marketId, commitment, amount)
 * 5. USDC transferred to contract
 *
 * Key: Server NEVER sees direction, only commitment hash
 *
 * Integrations:
 * - Circle SDK (sign tx, transfer USDC)
 * - VoidMarketCore contract
 */

export async function placeBet(params: {
  bettor: string;
  marketId: number;
  direction: boolean;  // true = YES, false = NO
  amount: bigint;
}): Promise<{
  commitment: string;
  salt: string;        // Must be stored client-side
  txHash: string;
}> {
  // Generate commitment
  // Execute contract call via Circle
}
```

### Flow 5: Create Forked Market

**File**: `flow-testing/src/flows/05-create-forked-market.ts`

```typescript
/**
 * Forked Market Creation Flow
 *
 * A forked market is a private market derived from a public one
 *
 * Steps:
 * 1. Select existing public market as parent
 * 2. Customize question/deadline if needed
 * 3. Call VoidMarketCore.createForkedMarket()
 * 4. Link to parent market for resolution
 *
 * Integrations:
 * - Circle SDK
 * - VoidMarketCore contract
 */

export async function createForkedMarket(params: {
  creator: string;
  parentMarketId: number;
  customQuestion?: string;
  deadline?: Date;
}): Promise<{
  forkedMarketId: number;
  txHash: string;
}> {
  // Create forked market linked to parent
}
```

### Flow 6: Bet on Forked Market

**File**: `flow-testing/src/flows/06-bet-forked-market.ts`

```typescript
/**
 * Forked Market Betting Flow
 *
 * Same as regular betting but:
 * - Market is private (only invited users)
 * - Resolution follows parent market
 *
 * Integrations:
 * - Circle SDK
 * - VoidMarketCore contract
 */
```

### Flow 7: Resolve Market

**File**: `flow-testing/src/flows/07-resolve-market.ts`

```typescript
/**
 * Market Resolution Flow
 *
 * Steps:
 * 1. Oracle/Admin determines outcome (YES/NO)
 * 2. Call VoidMarketCore.resolveMarket(marketId, outcome)
 * 3. Users can now reveal their bets
 * 4. Users call revealBet() with direction + salt
 * 5. Contract verifies commitment matches
 * 6. Winners claim via claimWinnings()
 *
 * For forked markets:
 * - Resolution follows parent market outcome
 * - Auto-triggers when parent resolves
 *
 * Integrations:
 * - Stork Oracle (price feeds)
 * - Circle SDK
 * - VoidMarketCore contract
 */

export async function resolveMarket(params: {
  marketId: number;
  outcome: boolean;
  resolver: string;  // Oracle/admin address
}): Promise<{
  txHash: string;
  totalWinners: number;
  totalPayout: bigint;
}> {
  // Resolve market
  // Handle forked markets cascade
}

export async function revealBet(params: {
  marketId: number;
  bettor: string;
  direction: boolean;
  salt: string;
}): Promise<{
  txHash: string;
  isWinner: boolean;
  payout: bigint;
}> {
  // Reveal and verify commitment
}

export async function claimWinnings(params: {
  marketId: number;
  claimer: string;
}): Promise<{
  txHash: string;
  amount: bigint;
}> {
  // Claim winnings
}
```

### Flow 8: Create Cluster

**File**: `flow-testing/src/flows/08-create-cluster.ts`

```typescript
/**
 * Cluster Creation Flow
 *
 * Steps:
 * 1. User defines cluster name
 * 2. Choose public or private
 * 3. Call ClusterManager.createCluster()
 * 4. Creator becomes leader with initial photons
 * 5. ENS: cluster-name.voidmarket.eth → cluster data
 *
 * Integrations:
 * - Circle SDK
 * - ClusterManager contract
 * - ENS resolver
 */

export async function createCluster(params: {
  leader: string;
  name: string;
  isPrivate: boolean;
}): Promise<{
  clusterId: number;
  txHash: string;
  ensName: string;
}> {
  // Create cluster on-chain
}
```

### Flow 9: Invite to Cluster

**File**: `flow-testing/src/flows/09-invite-to-cluster.ts`

```typescript
/**
 * Cluster Invitation Flow
 *
 * Steps:
 * 1. Leader generates invite for specific address
 * 2. Call ClusterManager.inviteToCluster()
 * 3. Returns invite code (valid for X time)
 * 4. Invite sent to user via Telegram DM
 *
 * Integrations:
 * - Circle SDK
 * - ClusterManager contract
 * - Telegram Bot API
 */

export async function inviteToCluster(params: {
  clusterId: number;
  inviter: string;
  invitee: string;
}): Promise<{
  inviteCode: string;
  expiresAt: Date;
  txHash: string;
}> {
  // Generate and store invite
}
```

### Flow 10: Join Cluster

**File**: `flow-testing/src/flows/10-join-cluster.ts`

```typescript
/**
 * Join Cluster Flow
 *
 * Steps:
 * 1. User has invite code (for private) or cluster ID (for public)
 * 2. Call ClusterManager.joinCluster()
 * 3. User added as member with 0 photons
 * 4. Cluster energy updated
 *
 * Integrations:
 * - Circle SDK
 * - ClusterManager contract
 */

export async function joinCluster(params: {
  clusterId: number;
  member: string;
  inviteCode?: string;  // Required for private clusters
}): Promise<{
  txHash: string;
  memberCount: number;
}> {
  // Join cluster
}
```

### Flow 11: Start Nova

**File**: `flow-testing/src/flows/11-start-nova.ts`

```typescript
/**
 * Nova Start Flow
 *
 * Steps:
 * 1. Two clusters agree to battle
 * 2. Define number of rounds, prize pool
 * 3. Call NovaManager.startNova()
 * 4. Each round: matched 1v1 between members
 * 5. Each match linked to a prediction market
 *
 * Integrations:
 * - Circle SDK
 * - NovaManager contract
 * - VoidMarketCore (creates linked markets)
 */

export async function startNova(params: {
  cluster1Id: number;
  cluster2Id: number;
  totalRounds: number;
  prizePool: bigint;
  initiator: string;
}): Promise<{
  novaId: number;
  matches: Array<{
    round: number;
    star1: string;
    star2: string;
    marketId: number;
  }>;
  txHash: string;
}> {
  // Start nova, create matches
}
```

### Flow 12: Nova Rounds

**File**: `flow-testing/src/flows/12-nova-rounds.ts`

```typescript
/**
 * Nova Round Execution Flow
 *
 * Each round:
 * 1. Both stars in match place bets on linked market
 * 2. Market resolves (oracle)
 * 3. Winner gets photons based on bet performance
 * 4. Match result recorded
 * 5. Advance to next round
 *
 * Integrations:
 * - Circle SDK
 * - NovaManager contract
 * - VoidMarketCore contract
 */

export async function executeNovaRound(params: {
  novaId: number;
  round: number;
}): Promise<{
  matches: Array<{
    star1Photons: number;
    star2Photons: number;
    winner: string;
  }>;
  roundWinner: number;  // Cluster ID
}> {
  // Execute all matches in round
}
```

### Flow 13: Nova Resolution

**File**: `flow-testing/src/flows/13-nova-resolution.ts`

```typescript
/**
 * Nova Resolution & Rewards Flow
 *
 * Steps:
 * 1. All rounds completed
 * 2. Tally photons per cluster
 * 3. Winning cluster gets energy boost
 * 4. Individual rewards based on photon contribution
 * 5. USDC distributed to winners
 *
 * Integrations:
 * - Circle SDK
 * - NovaManager contract
 * - ClusterManager contract
 */

export async function resolveNova(params: {
  novaId: number;
}): Promise<{
  winningClusterId: number;
  rewards: Array<{
    address: string;
    photonsEarned: number;
    usdcReward: bigint;
  }>;
  clusterEnergyDelta: number;
  txHash: string;
}> {
  // Resolve nova, distribute rewards
}
```

---

## Integration Patterns from Playgrounds

### Circle SDK (from playground-circle)

```typescript
// Wallet creation with RefID
import { createDeveloperWallet, createUnifiedWallets } from './services/circle/wallet';

// CCTP bridging
import { executeCCTPBridge, waitForAttestation } from './services/circle/cctp';

// Transaction execution
import { executeContractCall, transferUSDC } from './services/circle/transactions';

// Arc testnet utilities
import {
  getArcBalances,
  nativeToERC20,
  erc20ToNative,
  isArcChain
} from './services/circle/arc-helpers';
```

### LiFi SDK (from playground-lifi)

```typescript
// For chains not supported by Circle CCTP
import { getComposerQuote, executeComposerRoute } from './services/lifi/quotes';

// Use only as fallback when CCTP unavailable
const shouldUseLifi = !isCCTPSupported(sourceChain);
```

### Deposit Router Logic

```typescript
/**
 * Deposit Router
 *
 * Priority:
 * 1. Circle CCTP - Sepolia, Base Sepolia, Arbitrum Sepolia, Arc Testnet
 * 2. LiFi - All other chains (mainnet only, so may need testnet alternative)
 */

export async function depositToArc(params: {
  sourceChain: number;
  amount: bigint;
  userAddress: string;
}): Promise<DepositResult> {
  if (isCCTPSupported(params.sourceChain)) {
    return executeCCTPBridge({
      fromChain: params.sourceChain,
      toChain: ARC_TESTNET_CHAIN_ID,
      amount: params.amount,
      recipient: params.userAddress,
    });
  } else {
    // LiFi fallback (mainnet only)
    return executeLiFiBridge({
      fromChain: params.sourceChain,
      toChain: ARC_TESTNET_CHAIN_ID,
      amount: params.amount,
      recipient: params.userAddress,
    });
  }
}
```

---

## Testing Strategy

### Test Categories

1. **Unit Tests** - Individual service functions
2. **Integration Tests** - Each flow in isolation
3. **E2E Tests** - Complete user journeys

### E2E Scenarios

```typescript
// Scenario 1: Complete betting journey
test('User registers, creates market, places bet, wins', async () => {
  // 1. Register user
  const user = await registerUser('telegram_123');

  // 2. Create profile
  await createProfile({ walletAddress: user.walletAddress, username: 'star_alpha', starType: 'neutron' });

  // 3. Deposit USDC (simulated or via faucet)
  await fundWallet(user.walletAddress, parseUnits('100', 6));

  // 4. Create market
  const market = await createRegularMarket({
    creator: user.walletAddress,
    question: 'Will ETH hit $5000 by end of month?',
    category: 'crypto',
    deadline: addDays(new Date(), 7),
    resolutionDeadline: addDays(new Date(), 8),
  });

  // 5. Place bet
  const bet = await placeBet({
    bettor: user.walletAddress,
    marketId: market.marketId,
    direction: true, // YES
    amount: parseUnits('10', 6),
  });

  // 6. Resolve market (simulated oracle)
  await resolveMarket({
    marketId: market.marketId,
    outcome: true, // YES won
    resolver: ORACLE_ADDRESS,
  });

  // 7. Reveal bet
  const reveal = await revealBet({
    marketId: market.marketId,
    bettor: user.walletAddress,
    direction: true,
    salt: bet.salt,
  });

  // 8. Claim winnings
  const claim = await claimWinnings({
    marketId: market.marketId,
    claimer: user.walletAddress,
  });

  expect(claim.amount).toBeGreaterThan(parseUnits('10', 6));
});

// Scenario 2: Nova battle between clusters
test('Two clusters complete a Nova battle', async () => {
  // Setup: Create 2 clusters with 3 members each
  // Start Nova with 3 rounds
  // Execute each round
  // Verify winner gets energy + rewards
});

// Scenario 3: Cross-chain deposit
test('User deposits USDC from Sepolia to Arc via CCTP', async () => {
  // 1. User has USDC on Sepolia
  // 2. Initiate CCTP bridge
  // 3. Wait for attestation
  // 4. Complete on Arc
  // 5. Verify balance on Arc
});
```

---

## Environment Variables

```env
# Circle SDK
CIRCLE_API_KEY=TEST_API_KEY:...
CIRCLE_ENTITY_SECRET=...
CIRCLE_CLIENT_URL=https://modular-sdk.circle.com/v1/rpc/w3s/buidl
CIRCLE_CLIENT_KEY=TEST_CLIENT_KEY:...

# Arc Testnet
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002

# Other Testnets
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/...

# ENS (Sepolia)
ENS_GATEWAY_URL=http://localhost:3001
ENS_REGISTRY_ADDRESS=0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
VOIDMARKET_ENS_DOMAIN=voidmarket.eth

# LiFi (mainnet fallback - for chains CCTP doesn't support)
LIFI_API_KEY=...
LIFI_INTEGRATOR=voidmarket

# PostgreSQL Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/voidmarket
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=voidmarket
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# Telegram Bot
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook

# Admin wallet (for market resolution)
ADMIN_PRIVATE_KEY=...

# Contracts (populated after deployment)
VOIDMARKET_CORE_ADDRESS=
CLUSTER_MANAGER_ADDRESS=
NOVA_MANAGER_ADDRESS=
VOIDMARKET_RESOLVER_ADDRESS=
```

---

## Implementation Phases

### Phase 1: Foundation (Contracts + Infrastructure)
1. Create contracts/ directory with Foundry project
2. Write and test smart contracts locally
3. Deploy contracts to Arc Testnet
4. Set up PostgreSQL database with Drizzle ORM
5. Set up Circle wallet service (from playground)
6. Set up Arc testnet helpers (from playground)

### Phase 2: Core Services
1. Circle wallet creation & management
2. Circle transaction execution
3. Circle CCTP bridging
4. Database queries and migrations
5. ENS gateway server (CCIP-Read)
6. Telegram bot setup

### Phase 3: User Flows (1-7)
1. User registration flow
2. Profile creation + ENS subdomain
3. Market creation (regular)
4. Betting with commitments
5. Forked market creation
6. Market resolution (admin) + reveals
7. Winnings claims

### Phase 4: Cluster & Nova (8-13)
1. Cluster creation + management
2. Invite system
3. Join cluster flow
4. Nova battle start
5. Nova round execution
6. Nova resolution + rewards

### Phase 5: Cross-Chain Deposits
1. Circle CCTP integration (Sepolia, Base Sepolia → Arc)
2. LiFi fallback integration (other chains)
3. Deposit router with chain detection

### Phase 6: Telegram Bot Commands
1. /start - Registration flow
2. /balance - Check USDC balance
3. /bet <market> <amount> - Place bet (opens Mini App)
4. /reveal <market> - Reveal bet after resolution
5. /claim - Claim winnings
6. /profile - View star profile
7. /cluster - Cluster management
8. Notification system for market resolution

### Phase 7: E2E Testing & Validation
1. Unit tests for all services
2. Integration tests per flow
3. Full E2E scenarios (multi-user)
4. Edge cases and error handling
5. Performance testing

---

## Dependencies

```json
{
  "dependencies": {
    "@circle-fin/developer-controlled-wallets": "^4.0.0",
    "@lifi/sdk": "^3.0.0",
    "viem": "^2.0.0",
    "ethers": "^6.0.0",
    "@ensdomains/ensjs": "^4.0.0",
    "zod": "^3.22.0",
    "dotenv": "^16.0.0",
    "grammy": "^1.21.0",
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0",
    "express": "^4.18.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "drizzle-kit": "^0.20.0",
    "tsx": "^4.0.0"
  }
}
```

---

## Design Decisions

Based on requirements:

1. **Market Resolution**: **Admin-controlled** - Simpler for testing, admin manually resolves markets. Can add Stork oracle integration later for production.

2. **ENS Resolver**: **ENS on Sepolia** - Deploy CCIP-Read resolver to real ENS testnet for realistic testing. Requires ENS name ownership (voidmarket.eth or subdomain).

3. **Database**: **PostgreSQL** - Production-ready setup for off-chain data (profiles, clusters, bets, transactions).

4. **Telegram Bot**: **Included** - Full flow testing including /bet, /balance, /create commands via Telegram Bot API.

---

## Success Criteria

Each flow test should:
- ✅ Execute without mocks (real Circle SDK, real contracts)
- ✅ Verify state changes on-chain
- ✅ Handle errors gracefully
- ✅ Be repeatable (proper cleanup/reset)
- ✅ Log detailed execution traces

When all 13 flows pass E2E tests, we can confidently integrate into the frontend.
