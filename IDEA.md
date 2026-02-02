# Voidmarket — ZK Private Wagering Bot

> Create wagers in Telegram. Hidden bets until resolution. Your position goes into the void.

---

## Problem

Making a bet with friends online is either:

- **Informal and unenforceable** — "bet you $10 ETH hits 4k" in a group chat, nobody pays up
- **On-chain and unusable** — prediction markets require wallet setup, gas fees per bet, clunky UX
- **Public and gameable** — everyone sees bet distribution, causing herding and manipulation

There's no way to create an instant, enforceable, **private** wager in the middle of a conversation.

---

## Solution

A wagering bot for Telegram where:

1. **Anyone can fork public markets** to create private markets with friends
2. **Bets are private** — nobody (not even the server) knows your position until resolution
3. **Deposit from anywhere** — Bitcoin, Solana, Sui, or any EVM chain via LI.FI
4. **Resolution is automatic** via Stork oracle
5. **Payouts settle on Arc** in USDC

---

## Galaxy Theme & Social Features

### New Terminology

| Term | Meaning |
|------|---------|
| **Star** | User profile/account (users are "stars" in the void) |
| **Cluster** | Clan/team of stars that battle together |
| **Energy** | Overall cluster score (like trophies in Clash of Clans) |
| **Photons** | In-nova points collected from winning 1v1 matches |
| **Nova** | Competition between two clusters |
| **Forked Market** | Private market created from a public market |

### Clusters & Novas

```
CLUSTER NOVA SYSTEM:

Cluster A: VOID SEEKERS (4 members)
     vs
Cluster B: COSMIC RAIDERS (3 members)

Nova Format:
├── 3 simultaneous 1v1 matches
├── Each match: same market, opposing bets
├── Winners earn Photons for their cluster
└── Cluster with most Photons wins Energy

Example Match:
  COSMIC VOYAGER (Cluster A) vs GALACTIC KING (Cluster B)
  Market: "Will ETH hit $5k by Q1 2025?"
  Both bet $10 USDC (fake money for novas)
  Winner: Gets 100 Photons for their cluster
```

---

## Protocol Integrations

| Protocol | Role | How We Use It |
|----------|------|---------------|
| **LI.FI** | Cross-chain deposits | Deposit from any chain (BTC, SOL, SUI, EVM) with any asset into the betting pool |
| **Arc** | Settlement + Wallets | Circle embedded wallets (developer wallets for gasless UX), USDC settlement, Stork oracle for price resolution |
| **ENS** | Identity layer | Custom CCIP-Read resolver for zero-gas subdomains. Stars, markets, and clusters all get `*.voidmarket.eth` names |

---

## Key Innovation: Private Betting

### The Problem with Public Bets

```
TYPICAL PREDICTION MARKET (Polymarket, etc.):

"Will ETH hit $5k by Friday?"

YES: $45,000 (73%)
NO:  $17,000 (27%)

Problems:
├── Everyone sees sentiment → herding behavior
├── Whales see small bets → counter-position
├── Late bettors have information advantage
└── Market manipulation via fake volume
```

### Voidmarket Solution: Into the Void Until Resolution

```
VOIDMARKET PRIVATE MARKET:

"Will ETH hit $5k by Friday?"

Total Pool: $62,000
Positions: IN THE VOID
Your Bet: HIDDEN (only you know)

At resolution:
├── Oracle confirms result
├── Users reveal their bets
├── ZK proofs verify commitments
└── Payouts distributed
```

---

## How Privacy Works

### Betting Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. USER PLACES BET                                             │
│                                                                 │
│  Client (Telegram Mini App):                                    │
│  ├── User selects: YES, $100                                   │
│  ├── Generates random secret locally                           │
│  ├── Creates commitment = hash(market, YES, $100, secret)      │
│  ├── Stores secret in Telegram Cloud Storage API               │
│  └── Sends to server: commitment_hash + amount (NOT direction) │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  2. CROSS-CHAIN DEPOSIT (via LI.FI)                            │
│                                                                 │
│  User can deposit from:                                         │
│  ├── Bitcoin (BTC)                                             │
│  ├── Solana (SOL, USDC)                                        │
│  ├── Sui (SUI)                                                 │
│  ├── Any EVM chain (ETH, ARB, OP, BASE, POLYGON, etc.)        │
│  └── Any token → auto-converted to USDC on Arc                 │
│                                                                 │
│  LI.FI handles:                                                 │
│  ├── Cross-chain bridging                                      │
│  ├── Token swaps                                               │
│  └── Single transaction UX                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  3. SERVER PROCESSES                                            │
│                                                                 │
│  Voidmarket App Server:                                         │
│  ├── Receives: commitment_hash, amount, signature              │
│  ├── Verifies: user has funds, signature valid                 │
│  ├── Locks funds in betting pool                               │
│  ├── Stores: commitment_hash                                   │
│  └── DOES NOT KNOW: bet direction (YES/NO)                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  4. RESOLUTION                                                  │
│                                                                 │
│  ├── Stork oracle: ETH = $5,127 → YES wins                     │
│  ├── Server broadcasts: "Reveal your bets!"                    │
│  ├── Users retrieve secrets from Telegram Cloud Storage        │
│  ├── Users send reveal: direction + amount + secret            │
│  ├── Server verifies: hash(reveal) == commitment               │
│  └── Payouts calculated and settled on Arc                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### What's Hidden?

| Data | Server Sees? | Other Users See? |
|------|--------------|------------------|
| Bet amount | Yes (needed to lock funds) | No |
| Bet direction | **No** | No |
| User identity | Yes (for payouts) | No (only commitment hash) |

---

## Cross-Chain Deposits (LI.FI)

### Deposit From Anywhere

```
┌─────────────────────────────────────────┐
│  DEPOSIT TO VOIDMARKET                  │
│                                         │
│  From Chain:                            │
│  [Bitcoin] [Solana] [Sui] [Ethereum]   │
│  [Arbitrum] [Base] [Polygon] [+more]   │
│                                         │
│  From Token:                            │
│  [BTC] [SOL] [ETH] [USDC] [Any Token]  │
│                                         │
│  Amount: [0.01 BTC]                     │
│  You'll receive: ~$650 USDC on Arc      │
│                                         │
│  [Deposit via LI.FI]                    │
│                                         │
│  Powered by LI.FI - best routes across │
│  DEXs and bridges automatically         │
└─────────────────────────────────────────┘
```

### Why LI.FI?

- **Universal Access**: Users don't need USDC on Arc to start betting
- **Any Asset**: Convert BTC, SOL, ETH, or any token to USDC in one tx
- **Best Routes**: LI.FI finds optimal path across DEXs and bridges
- **Single UX**: One click deposit, no manual bridging

---

## ENS Market Identity

> **Full architecture documented in [ENS_ARCHITECTURE.md](./ENS_ARCHITECTURE.md)**

### CCIP-Read Off-Chain Resolver (Zero Gas)

We use a custom off-chain resolver with CCIP-Read (EIP-3668) + wildcard resolution (ENSIP-10):
- **Zero gas** for creating subdomains (users, markets, clusters)
- **Zero gas** for updating records (stats, profiles, metadata)
- **Full ENS compatibility** (works with wagmi, viem, wallets)

### ENS Subdomain Structure

```
voidmarket.eth (our domain)
├── cosmicvoyager.voidmarket.eth     → Star (user) profile
├── eth-5k.voidmarket.eth            → Public market
├── void-seekers.voidmarket.eth      → Cluster
└── eth-5k.cosmicvoyager.voidmarket.eth → Forked private market
```

### Hybrid Data Layer

| Data Source | What's Stored |
|-------------|---------------|
| **Arc Chain** | Wallets, bets, balances, payouts (via developer wallets = gasless UX) |
| **PostgreSQL** | Profiles, stats, metadata (free updates, fast queries) |

### ENS Text Records (Resolved via Gateway)

```
cosmicvoyager.voidmarket.eth:
  addr(60)                    → 0x7A3B...F92D (wallet from Arc)
  voidmarket.star-type        → "blue-supergiant"
  voidmarket.total-photons    → "1250"
  voidmarket.cluster          → "void-seekers"

eth-5k.voidmarket.eth:
  voidmarket.question         → "Will ETH hit $5,000 by Q1 2025?"
  voidmarket.pool-size        → "12500"
  voidmarket.status           → "open"
```

---

## Platform Interface

### Telegram Bot + Mini App

```
User: /bet eth-10k.gabrielaxy.eth YES $100 --private

Bot: Opening secure betting interface...
     [Place Private Bet] ← opens Mini App

Mini App:
┌─────────────────────────────────────────┐
│  eth-10k.gabrielaxy.eth                │
│  "Will ETH hit $10,000 by June?"       │
│                                         │
│  Your Position:                         │
│  [YES]  [NO]                           │
│                                         │
│  Amount: [$100]                         │
│                                         │
│  [Send to the Void]                    │
└─────────────────────────────────────────┘

→ Secret stored in Telegram Cloud Storage
→ Only commitment sent to server

Bot: Bet entered the void!
     Market: eth-10k.gabrielaxy.eth
     Amount: $100 locked
     Position: HIDDEN
```

### Public Markets

```
User: /bet eth-10k.voidmarket.eth YES $50

Bot: Bet placed!
     Market: eth-10k.voidmarket.eth
     Position: YES
     Amount: $50 USDC

     Current Pool: $12,450
     YES: 62% | NO: 38%
```

---

## Wallet Integration (Circle Embedded)

### First-Time User (Onboarding Flow)

```
User opens Mini App for first time
      │
      ▼
WELCOME TO THE VOID
[BEGIN YOUR JOURNEY]
      │
      ▼
Story screens (2-3 slides of galaxy lore)
      │
      ▼
CHOOSE YOUR STAR
[6 star type options: Red Giant, Blue Supergiant, White Dwarf, Yellow Sun, Neutron Star, Binary Star]
      │
      ▼
NAME YOUR STAR
[Name input] [Bio optional]
      │
      ▼
FUEL YOUR STAR
Circle auth (email/Google/Apple)
Wallet created and linked to Telegram ID
      │
      ▼
[Deposit via LI.FI] or [Skip for now]
      │
      ▼
YOU ARE READY
[ENTER THE VOID] → Home page
```

---

## Architecture

```
┌─────────────────┐
│  Telegram Bot   │
│  + Mini App     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Voidmarket App Server                  │
│                                         │
│  ├── Market management                  │
│  ├── Bet processing (commitments)       │
│  ├── ZK proof verification              │
│  ├── Oracle integration (Stork)         │
│  ├── Payout calculation                 │
│  ├── Cluster & Nova management          │
│  └── ENS Gateway (CCIP-Read)            │
└────────────────────┬────────────────────┘
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
┌────────────┐ ┌────────────┐ ┌─────────────────┐
│   LI.FI    │ │    Arc     │ │      ENS        │
│            │ │            │ │                 │
│ (cross-    │ │ • Wallets  │ │ • Mainnet       │
│  chain     │ │ • Balances │ │   Resolver      │
│  deposits) │ │ • Bets     │ │ • CCIP-Read     │
│            │ │ • Payouts  │ │ • Wildcard      │
└────────────┘ │ • Stork    │ │   Subdomains    │
      │        └────────────┘ └─────────────────┘
      │              │                 │
      ▼              ▼                 ▼
┌─────────────────────────────────────────────┐
│  Hybrid Data Layer                          │
│                                             │
│  Arc Chain:     Wallets, bets, USDC, payouts│
│  PostgreSQL:    Stats, profiles, metadata   │
└─────────────────────────────────────────────┘
```

---

## Resolution & Payouts

### Timeout Mechanism

```
Resolution timeline:
├── T+0: Oracle result published (Stork)
├── T+0 to T+1h: Reveal window
├── T+1h: Non-revealed bets forfeit
└── T+1h: Payouts distributed on Arc
```

### Reveal Flow

```
Bot DM: Market resolved!
        eth-10k.gabrielaxy.eth → YES wins!

        Reveal your bet to claim winnings:
        [Reveal & Claim] ← button

Telegram: Auto-retrieves from Cloud Storage

→ Server verifies: hash(reveal) == commitment
→ Payout sent via Arc (USDC)
```

---

## Database Schema

```sql
-- Users (Stars)
stars:
  id                TEXT PRIMARY KEY
  wallet_address    ADDRESS
  telegram_id       TEXT
  circle_wallet_id  TEXT
  name              TEXT
  star_type         TEXT (red-giant, blue-supergiant, white-dwarf, yellow-sun, neutron, binary)
  bio               TEXT
  cluster_id        TEXT REFERENCES clusters
  total_photons     INTEGER DEFAULT 0
  created_at        TIMESTAMP

-- Clusters
clusters:
  id                TEXT PRIMARY KEY
  name              TEXT
  description       TEXT
  leader_id         TEXT REFERENCES stars
  energy            INTEGER DEFAULT 0
  total_novas       INTEGER DEFAULT 0
  novas_won         INTEGER DEFAULT 0
  current_nova_id   TEXT REFERENCES novas
  created_at        TIMESTAMP

-- Cluster Members
cluster_members:
  cluster_id        TEXT REFERENCES clusters
  star_id           TEXT REFERENCES stars
  photons           INTEGER DEFAULT 0
  novas_played      INTEGER DEFAULT 0
  novas_won         INTEGER DEFAULT 0
  joined_at         TIMESTAMP
  PRIMARY KEY (cluster_id, star_id)

-- Novas
novas:
  id                TEXT PRIMARY KEY
  cluster1_id       TEXT REFERENCES clusters
  cluster2_id       TEXT REFERENCES clusters
  status            ENUM (pending, active, completed)
  wager_amount      DECIMAL
  winner_id         TEXT REFERENCES clusters
  started_at        TIMESTAMP
  ended_at          TIMESTAMP

-- Nova Matches (1v1)
nova_matches:
  id                TEXT PRIMARY KEY
  nova_id           TEXT REFERENCES novas
  star1_id          TEXT REFERENCES stars
  star2_id          TEXT REFERENCES stars
  market_id         TEXT REFERENCES markets
  star1_bet_outcome TEXT
  star1_bet_amount  DECIMAL
  star2_bet_outcome TEXT
  star2_bet_amount  DECIMAL
  winner_id         TEXT REFERENCES stars
  photons_awarded   INTEGER
  status            ENUM (pending, active, completed)

-- Markets
markets:
  id                TEXT PRIMARY KEY
  ens_name          TEXT UNIQUE
  question          TEXT
  deadline          TIMESTAMP
  oracle_source     TEXT
  target_value      DECIMAL
  status            ENUM (open, closed, resolved)
  result            TEXT
  creator_address   ADDRESS
  is_forked         BOOLEAN DEFAULT false
  original_market_id TEXT REFERENCES markets
  is_private        BOOLEAN DEFAULT false
  share_code        TEXT
  created_at        TIMESTAMP

-- Bets
bets:
  id                TEXT PRIMARY KEY
  market_id         TEXT REFERENCES markets
  user_address      ADDRESS
  commitment_hash   TEXT
  amount            DECIMAL
  direction         TEXT (null until revealed)
  secret            TEXT (null until revealed)
  revealed          BOOLEAN DEFAULT false
  payout            DECIMAL
  created_at        TIMESTAMP

-- Deposits
deposits:
  id                TEXT PRIMARY KEY
  user_address      ADDRESS
  source_chain      TEXT
  source_token      TEXT
  source_amount     DECIMAL
  dest_amount       DECIMAL (USDC on Arc)
  lifi_tx_hash      TEXT
  status            ENUM (pending, completed, failed)
  created_at        TIMESTAMP
```

---

## Prize Track Alignment

| Prize | How We Qualify |
|-------|----------------|
| **LI.FI** ($6k) | Cross-chain deposits from BTC, SOL, SUI, and 50+ EVM chains into betting pool |
| **Arc** ($10k) | Circle developer wallets + Stork oracle + USDC settlement (gasless UX) |
| **ENS** ($5k) | Custom CCIP-Read resolver with wildcard resolution. Users, markets, clusters as ENS subdomains. Text records for DeFi data (pool sizes, oracle configs, betting stats). See [ENS_ARCHITECTURE.md](./ENS_ARCHITECTURE.md) |

---

## Hackathon Scope

### Must Have
- [ ] Telegram bot with betting commands
- [ ] Telegram Mini App for private bets
- [ ] Circle embedded wallet integration (developer wallets)
- [ ] LI.FI cross-chain deposit flow
- [ ] ENS custom resolver (CCIP-Read + wildcard)
- [ ] ENS gateway server for off-chain resolution
- [ ] Star/Market/Cluster subdomains via ENS
- [ ] Commitment/reveal flow working
- [ ] Basic oracle resolution (Stork)
- [ ] Onboarding flow with star selection
- [ ] Fork market functionality

### Nice to Have
- [ ] Cluster creation & management
- [ ] Nova system (1v1 matches)
- [ ] Multiple oracles (sports, events)
- [ ] Market discovery/trending
- [ ] Leaderboards (top clusters)
- [ ] Referral system
