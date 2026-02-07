# VoidMarket

> Private prediction markets inside Telegram. Your bet goes into the void.

**ETHGlobal HackMoney 2026**
Solo build by **Darth Stormer** ([DarthStormerXII](https://github.com/DarthStormerXII)) — darthstormer.ai@gmail.com

---

## Problem

Prediction markets today have three problems:

1. **Public bets = herding.** On Polymarket, everyone sees the YES/NO split in real time. Late bettors have an information advantage. Whales see small bets and counter-position. The market itself becomes the signal, not the outcome.

2. **Terrible UX for casual users.** You need a wallet, ETH for gas, token approvals, and an understanding of on-chain transactions. Your friend in a Telegram group chat is never going to do all that to bet $5 on whether ETH hits 5k.

3. **No social layer.** Betting is more fun with friends. There's no way to fork a public market for a private group bet, compete as teams, or build betting reputation that travels with you.

---

## Solution

VoidMarket is a **Telegram Mini App** where bets are private, UX is gasless, and identity is portable.

- **Private betting** — Your bet direction is hidden using commit-reveal cryptography. Nobody (not even the server) knows if you bet YES or NO until the market resolves and you reveal. The pool size is visible, but positions are in the void.

- **Zero-friction UX** — Open Telegram, tap the Mini App, pick a market, tap "Send to the Void." That's it. No wallet setup, no gas fees, no token approvals. Circle developer wallets handle everything behind the scenes.

- **Portable identity** — Every user, market, and team gets an ENS subdomain (`darth.voidmarket.eth`, `eth-5k.voidmarket.eth`). Zero gas via CCIP-Read. Your betting record is resolvable by any ENS-aware app.

- **Social wagering** — Fork any public market into a private one for your friend group. Form clusters (teams), battle other clusters in Novas (1v1 competitions), climb the energy leaderboard.

---

## How It Works

### The Betting Flow

```
1. USER PLACES BET
   Pick YES or NO → frontend generates: commitment = keccak256(direction, salt)
   Salt stored in Telegram Cloud Storage (persists across devices)
   Only the commitment hash goes on-chain — direction stays hidden

2. ON-CHAIN TRANSACTION (invisible to user)
   Circle developer wallet signs: VoidMarketCore.placeBet{value: 50 USDC}(marketId, commitment)
   USDC is the native gas token on Arc — no separate gas token needed
   User sees: "Bet sent to the void ✓"

3. MARKET RESOLVES
   Admin/oracle sets outcome → all forked markets auto-resolve
   User gets Telegram notification: "Reveal your bet!"

4. REVEAL & CLAIM
   Frontend retrieves salt from Telegram Cloud Storage
   Contract verifies: keccak256(direction, salt) == stored commitment
   Winners claim: original bet + proportional share of losers' pool
```

### The Social Layer

- **Stars** (users) — Choose a star type, get `username.voidmarket.eth`
- **Clusters** (teams) — Create or join, max 50 members, invite system
- **Novas** (battles) — Cluster vs cluster, multi-round 1v1 matches
- **Energy** — On-chain cluster score, earned by winning Novas
- **Photons** — On-chain individual score, earned per match (WIN = 100, LOSE = 25)
- **Forked Markets** — Private markets derived from public ones, auto-resolve when parent resolves

### Cross-Chain Deposits

Users deposit USDC from any Circle-supported EVM chain. Circle CCTP burns USDC on the source chain and mints native USDC on Arc. One balance, one currency, no bridging headaches.

---

## Architecture

```
┌──────────────────────────────────┐
│  Telegram Mini App (Next.js 16)  │
│  • React 19, Tailwind CSS 4     │
│  • Telegram WebApp SDK          │
│  • Commitment generation        │
│  • Salt → Telegram Cloud Storage│
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Circle Developer Wallets        │
│  • Gasless UX (server-signed)   │
│  • Multi-chain (RefID = TG ID)  │
│  • CCTP cross-chain deposits    │
└──────────────┬───────────────────┘
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
┌────────┐ ┌────────┐ ┌─────────────────┐
│  Arc   │ │  ENS   │ │  Circle CCTP    │
│Testnet │ │Sepolia │ │                 │
│        │ │        │ │  ETH → Arc      │
│Markets │ │CCIP-   │ │  Base → Arc     │
│Bets    │ │Read    │ │  Arb → Arc      │
│Clusters│ │Gateway │ │  Any EVM → Arc  │
│Novas   │ │        │ │                 │
│Energy  │ │*.void  │ │  Native USDC    │
│Photons │ │market  │ │  burn-and-mint  │
│        │ │.eth    │ │                 │
└────────┘ └────────┘ └─────────────────┘
```

### Smart Contracts (Arc Testnet)

| Contract | What It Does |
|----------|-------------|
| **VoidMarketCore** | Markets, commit-reveal betting, forked markets (auto-resolve), payouts |
| **ClusterManager** | Teams, invites (7-day codes), photon/energy on-chain scoring |
| **NovaManager** | Cluster battles, 3 matches/round, linked prediction markets per match |
| **VoidMarketResolver** | ENS CCIP-Read resolver (also deployed on Sepolia) |

All contracts deployed and linked. ~2,500 lines of Solidity, ~150 unit tests.

---

## Sponsor Integration

### Circle — Bridge Kit + Arc

**How we use Circle:**

- **Developer-Controlled Wallets** — Every user gets a Circle wallet keyed to their Telegram ID. Server signs all transactions. Users never see gas, never handle keys. This is what makes the "just tap to bet" UX possible.

- **CCTP Cross-Chain Deposits** — Users deposit USDC from Ethereum, Base, Arbitrum, or any CCTP-supported chain. Burn on source, mint on Arc. One unified balance.

- **Arc as Settlement Layer** — USDC is the native gas token on Arc. Every bet, market, cluster, and Nova settles in USDC on Arc. No wrapping, no swapping, no separate gas token. The entire app runs on a single currency.

- **Gateway API** — Unified balance queries across all chains. User sees one number regardless of where they deposited from.

### ENS — Identity Layer

**How we use ENS:**

- **Zero-Gas Subdomains via CCIP-Read (EIP-3668)** — Every Star (user), Market, and Cluster gets a `*.voidmarket.eth` subdomain. No on-chain minting — stored in PostgreSQL, resolved via our gateway server, signature-verified on-chain. Cost for 1000 users: $0 (vs ~$40,000 with traditional ENS).

- **Wildcard Resolution (ENSIP-10)** — Single resolver handles all subdomains. Stars, markets, and clusters resolved by priority. Nested subdomains for forked markets: `eth-5k.darth.voidmarket.eth`.

- **Text Records for DeFi** — Not just name→address. ENS records include: star type, photons, cluster membership, market question, pool size, status, bet counts. Full prediction market metadata resolvable via standard ENS queries.

- **Portable Betting Reputation** — Your win/loss record, photon score, and cluster membership travel with your ENS name. Any ENS-aware app can read your VoidMarket profile.

**ENS is not an afterthought — it IS the identity layer.** You can't use VoidMarket without an ENS subdomain. Markets are discoverable via ENS. Clusters are addressable via ENS. This is what "ENS for DeFi" looks like.

---

## What I Built During This Hackathon

**Smart Contracts** (~2,500 lines Solidity):
- VoidMarketCore — commit-reveal betting, forked markets with cascading resolution
- ClusterManager — team system with on-chain photon/energy scoring
- NovaManager — cluster battles with linked prediction markets per match
- VoidMarketResolver — custom CCIP-Read resolver
- All deployed on Arc Testnet + Sepolia

**ENS Gateway** (Express.js):
- CCIP-Read server resolving `*.voidmarket.eth` from PostgreSQL + Arc chain
- DNS decoder, EIP-191 signer, full test suite (83+ tests)

**Frontend** (Next.js 16 Telegram Mini App):
- 11 pages, 19+ API routes
- Circle SDK wallet creation + transaction signing
- Commit-reveal betting with Telegram Cloud Storage salt backup
- CCTP cross-chain deposit flow
- Full cluster/nova management UI

**Tests**: ~150 Solidity unit tests + 83 gateway tests + integration test suite

---

## Demo Flow

1. **Open Mini App** in Telegram → onboarding story → pick star type
2. **Username auto-populated** from Telegram → `darth.voidmarket.eth` minted (zero gas)
3. **Circle wallet created** silently → show unified balance across chains
4. **Deposit USDC** from Sepolia via CCTP → arrives on Arc
5. **Browse markets** → select "Will ETH hit $5k by March?"
6. **Place bet**: YES, 10 USDC → "Sent to the void" (commitment on-chain, direction hidden)
7. **Show on-chain**: only commitment hash visible, no one knows the direction
8. **Resolve market** → reveal bet → contract verifies commitment → claim winnings
9. **Fork the market** → private version for friends → auto-resolves when parent resolves
10. **Create cluster** → invite friend → start Nova → show photon/energy scoring

---

## Technical Novelty

1. **First prediction market where you can't see the bet distribution.** Not just "you can optionally hide" — all bets go through commit-reveal. The pool size is visible but positions are hidden until resolution. This eliminates herding, whale front-running, and sentiment gaming.

2. **Prediction markets as ENS names.** Markets aren't just entries in a database — they're resolvable ENS subdomains. `eth-5k.voidmarket.eth` returns the pool size, status, and deadline via standard ENS text record queries. This is discoverable, composable, and portable.

3. **Nested ENS subdomains for forked markets.** `eth-5k.darth.voidmarket.eth` — a private fork of a public market, namespaced under the creator's identity. Three levels of ENS hierarchy serving actual DeFi data.

4. **Team-based prediction market competitions.** Clusters compete in Novas where each 1v1 match creates a real linked prediction market on-chain. The battle system and the market system are the same system.

5. **Truly gasless Telegram UX on a single currency.** USDC is the native gas token on Arc. Circle developer wallets sign everything. There is literally no point in the user journey where gas or wallet management surfaces. From the user's perspective, it's a Telegram app that happens to be on-chain.
