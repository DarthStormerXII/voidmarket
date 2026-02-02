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

