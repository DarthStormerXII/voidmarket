# VoidMarket App Flow

## Architecture Overview

VoidMarket is a **Telegram Mini App** prediction market where bet directions are hidden using commit-reveal (keccak256 commitments). Users bet on public markets privately, fork private markets from public ones, and compete in cluster-vs-cluster battles called Novas. The system uses **Circle developer-controlled wallets** for gasless UX, **ENS CCIP-Read (EIP-3668)** for zero-gas subdomain identity, and **Arc Testnet** as the primary settlement chain where USDC is the native gas token.

**Key principle:** Users never need to think about gas, wallets, or chain mechanics. Onboarding creates a Circle wallet silently. Bets are placed via the server signing transactions on behalf of users through developer wallets. ENS subdomains are minted off-chain through the CCIP-Read gateway. The only currency is USDC.

---

## Deployed Contracts (Arc Testnet, Chain ID 5042002)

| Contract | Address | Purpose |
|----------|---------|---------|
| VoidMarketCore | `0xe05dc9467de459adfc5c31ce4746579d29b65ba2` | Prediction markets, commit-reveal betting, payout distribution |
| ClusterManager | `0x9dfbfba639a5fd11cf9bc58169157c450ce99661` | Cluster CRUD, invite system, photon/energy tracking |
| NovaManager | `0xcef696b36e24945f45166548b1632c7585e3f0db` | Cluster vs cluster battles, match creation, reward distribution |
| VoidMarketResolver (Arc) | `0xb26a88b1082c84b0aa4ed8bad84b95dbe39e32a8` | ENS CCIP-Read resolver on Arc |

### ENS Infrastructure (Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| VoidMarketResolver (Sepolia) | `0x2ddf88ccadff651030e971b93153c5a865c1fa89` | ENS CCIP-Read resolver set on `voidmarket.eth` |
| ENS Registry | `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` | Standard ENS registry (Sepolia) |
| Gateway Signer | `0x32FE11d9900D63350016374BE98ff37c3Af75847` | Trusted signer for gateway responses |

---

## Components

### 1. VoidMarketCore.sol (On-Chain, Arc Testnet)
- Creates prediction markets with questions, deadlines, and resolution deadlines
- Accepts bets via `placeBet(marketId, commitmentHash)` — `payable` with native USDC as `msg.value`
- Commitment = `keccak256(abi.encodePacked(direction, salt))` — direction is hidden until reveal
- After resolution, users call `revealBet(betId, direction, salt)` — contract verifies commitment matches
- Winners call `claimWinnings(betId)` — proportional share of losers' pool
- Forked markets: `createForkedMarket(parentId, ...)` — inherits resolution from parent, auto-resolves when parent resolves
- Market cancellation refunds all bettors

### 2. ClusterManager.sol (On-Chain, Arc Testnet)
- Cluster creation with unique names, public/private modes
- Invite system with 7-day expiry codes, supports open and targeted invites
- Max 50 members per cluster
- Photon tracking (individual score) and energy tracking (team score)
- Only NovaManager can update photons/energy — prevents manipulation
- Leadership transfer system

### 3. NovaManager.sol (On-Chain, Arc Testnet)
- Cluster vs cluster battles with multi-round format
- Each round has 3 matches (1v1 between members)
- Each match creates a linked prediction market via `VoidMarketCore.createMarket()`
- Scoring: WIN = 100 photons, LOSE = 25 photons per match
- Winning cluster gets +500 energy bonus
- Prize pool (sent as `msg.value` at Nova start) distributed proportionally to winning cluster members based on photons earned
- Admin-resolved matches

### 4. VoidMarketResolver.sol (On-Chain, Sepolia + Arc)
- ENS CCIP-Read (EIP-3668) resolver implementing wildcard resolution (ENSIP-10)
- `resolve(name, data)` always reverts with `OffchainLookup` → directs client to gateway
- `resolveWithProof(response, extraData)` verifies gateway signature (EIP-191) and expiry
- Supports: addr, text, contenthash, name records
- Deployed on Sepolia (where `voidmarket.eth` registry lives) and Arc Testnet

### 5. ENS CCIP-Read Gateway (Off-Chain, Express.js)
- Resolves `*.voidmarket.eth` subdomains from PostgreSQL + Arc chain
- Priority: Star (user) > Market > Cluster
- Nested subdomain support: `eth-5k.alice.voidmarket.eth` for forked markets
- Signs responses with trusted signer key (EIP-191)
- 5-minute response validity period
- Reads metadata from PostgreSQL, reads live market state (pool size, status, deadlines) from Arc RPC

### 6. Circle Developer Wallets (Off-Chain, Server-Side)
- Creates multi-chain wallets keyed by Telegram ID (RefID-based, deterministic addresses)
- Server signs transactions on behalf of users — gasless UX
- Supports all Circle-supported chains for deposit/withdrawal
- Developer-controlled wallets: users don't hold private keys directly

### 7. Frontend (Telegram Mini App, Next.js 16)
- React 19 with Tailwind CSS 4
- Telegram WebApp SDK integration (auto-populates username, theme, etc.)
- Circle SDK integration for wallet creation and transaction signing
- Commit-reveal betting flow with salt stored in Telegram Cloud Storage (backup) + localStorage (fast access)
- CCIP-Read ENS gateway implemented as Next.js API route (fallback)
- Full API routes for all operations
- WalletProvider context with all contract interaction methods

---

## Galaxy Theme Terminology

| Term | Meaning |
|------|---------|
| **Star** | User profile/account |
| **Cluster** | Team/clan of stars |
| **Energy** | Cluster score (like trophies) — on-chain |
| **Photons** | Individual performance score from Nova matches — on-chain |
| **Nova** | Competition between two clusters |
| **Forked Market** | Private market derived from a public market |
| **The Void** | Where bets go — hidden until resolution |

---

## Detailed User Flow

### Phase 1: Onboarding (Telegram Mini App)

```
User opens VoidMarket Mini App inside Telegram
    |
    v
Story screens (galaxy lore, 2-3 slides)
    |
    v
Telegram username auto-populated from WebApp SDK
    |
    v
User chooses Star type (6 options):
    Red Giant, Blue Supergiant, White Dwarf,
    Yellow Sun, Neutron Star, Binary Star
    |
    v
ENS subdomain auto-minted (zero gas):
    username.voidmarket.eth
    |   NO on-chain transaction — gateway registers in PostgreSQL
    |   CCIP-Read resolves it as if it were on-chain
    |
    v
Circle developer wallet created:
    - Server calls Circle SDK with RefID = telegramId
    - Same deterministic address across all supported chains
    - Multi-chain wallet (Arc, Ethereum, Base, Arbitrum, etc.)
    |
    v
User is onboarded — ready to deposit and bet
```

**ENS subdomain minting is "pack and call":**

The subdomain `username.voidmarket.eth` is not minted on-chain. The user's profile is stored in PostgreSQL. When anyone queries `username.voidmarket.eth`:
1. Client calls `VoidMarketResolver.resolve()` on Sepolia
2. Contract reverts with `OffchainLookup` → points to gateway
3. Gateway looks up the username in PostgreSQL → returns profile data
4. Client calls `resolveWithProof()` → contract verifies gateway signature
5. Result returned as if it were an on-chain ENS record

### Phase 2: Depositing Funds (Cross-Chain)

```
User taps "Deposit" in Mini App
    |
    v
Select source chain:
    [Ethereum] [Base] [Arbitrum] [Solana*] [Arc directly]
    *Solana support via Circle where available
    |
    v
ROUTE A — Deposit from external EVM chain (Circle CCTP):
    1. Frontend shows deposit address on selected chain
    2. User sends USDC to deposit address (or uses in-app bridge UI)
    3. Circle CCTP burns USDC on source chain
    4. Circle CCTP mints native USDC on Arc
    5. Developer wallet balance updated
    6. Frontend polls transaction status until confirmed
    |
    v
ROUTE B — Deposit directly on Arc:
    User already has USDC on Arc
    Transfer to developer wallet balance
    |
    v
"Gateway Balance" = user's USDC across all chains
    - Queried via Circle Gateway API
    - Single unified balance view regardless of deposit source
    - Betting uses Arc balance specifically
```

**Gateway Balance concept:**

The user's "Gateway Balance" is their unified USDC balance queried via Circle Gateway API. This aggregates across all supported chains. For betting, the Arc Testnet balance is what matters — USDC is the native gas token on Arc (18 decimals for native, 6 for ERC20 interface).

### Phase 3: Placing a Bet (Commit Phase)

```
User browses markets (public or forked)
    |
    v
User selects a market and chooses YES or NO, enters amount
    |
    v
Frontend generates commitment locally:
    1. salt = crypto.randomBytes(32)
    2. commitment = keccak256(abi.encodePacked(direction, salt))
    3. Salt stored in Telegram Cloud Storage (persistent backup)
    4. Salt also cached in localStorage (fast access)
    |
    v
Server executes transaction via Circle developer wallet:
    VoidMarketCore.placeBet{value: amount}(marketId, commitment)
    |   On-chain tx on Arc Testnet
    |   msg.value = bet amount in native USDC
    |   Only commitment hash is stored — NOT the direction
    |
    v
Bet is "in the void" — nobody knows the direction
    - Contract sees: commitment hash + amount
    - Server sees: commitment hash + amount
    - Other users see: nothing (or just total pool size)
    - Only the user knows: direction + salt (stored in Telegram Cloud Storage)
```

**What the user experiences:**

From the user's perspective, they just pick YES/NO, enter an amount, and tap "Send to the Void." The Circle developer wallet handles the actual on-chain transaction signing — the user never sees gas fees, wallet popups, or transaction confirmations. It feels like a simple app interaction.

**What's actually hidden:**

| Data | Contract Sees? | Server Sees? | Other Users See? |
|------|----------------|--------------|------------------|
| Bet amount | Yes (`msg.value`) | Yes | No (only total pool) |
| Bet direction | No (only hash) | No (only hash) | No |
| Salt | No | No | No |

### Phase 4: Market Resolution (Admin/Oracle)

```
Betting deadline passes
    |
    v
Admin resolves market:
    VoidMarketCore.resolveMarket(marketId, outcome)
    |   On-chain tx on Arc Testnet
    |   Sets market status = RESOLVED
    |   Sets outcome = true (YES) or false (NO)
    |
    v
If market has forked children:
    All active forked markets auto-resolve with same outcome
    |   Loop through forkedMarkets[parentId]
    |   Set each child's status + outcome
    |
    v
Telegram notification sent to all bettors:
    "Market resolved! Reveal your bet to claim winnings."
    |
    v
Reveal window opens (24 hours from resolution deadline):
    Users can now reveal their bets
```

### Phase 5: Revealing Bets & Claiming Winnings (Reveal Phase)

```
User receives Telegram DM: "Market resolved! Reveal your bet."
    |
    v
User taps notification → opens Mini App
    |
    v
Frontend retrieves salt from Telegram Cloud Storage
    (falls back to localStorage if Cloud Storage unavailable)
    |
    v
Server executes reveal via Circle developer wallet:
    VoidMarketCore.revealBet(betId, direction, salt)
    |   Contract verifies: keccak256(direction, salt) == stored commitment
    |   If match: records direction, updates market YES/NO totals
    |   If mismatch: reverts with InvalidCommitment
    |
    v
After reveal, if user is a winner:
    Server executes claim via Circle developer wallet:
    VoidMarketCore.claimWinnings(betId)
    |
    v
Payout calculation:
    winningPool = total revealed YES or NO amount (whichever won)
    losingPool = total revealed amount on losing side
    payout = betAmount + (betAmount * losingPool / winningPool)
    |
    v
Native USDC transferred to user's developer wallet
    |
    v
User sees updated Gateway Balance
```

**Edge cases:**
- If a user doesn't reveal within 24 hours → bet is forfeited (cannot claim)
- If no one bets on the losing side → winners just get their original bet back
- Unrevealed bets don't count toward YES/NO totals

### Phase 6: Creating Markets & Forked Markets

```
PUBLIC MARKET CREATION:
    User creates a new market:
    VoidMarketCore.createMarket(question, deadline, resolutionDeadline)
    |   On-chain tx on Arc Testnet
    |   Returns marketId
    |
    v
    ENS subdomain auto-minted:
    market-slug.voidmarket.eth → market metadata
    |   Stored in PostgreSQL, resolved via CCIP-Read gateway
    |
    v
    Market is live — anyone can bet

---

FORKED MARKET CREATION:
    User forks a public market for private betting:
    VoidMarketCore.createForkedMarket(parentId, customQuestion, deadline, resolutionDeadline)
    |   On-chain tx on Arc Testnet
    |   Links to parent market
    |   Can't fork a fork (only 1 level deep)
    |
    v
    ENS subdomain:
    market-slug.username.voidmarket.eth → forked market metadata
    |   Nested subdomain under user's name
    |
    v
    User shares link with friends
    Forked market auto-resolves when parent resolves
```

### Phase 7: Withdrawal

```
User taps "Withdraw" in wallet page
    |
    v
Select destination:
    [Keep on Arc] [Withdraw to Ethereum] [Withdraw to Base] [...]
    |
    v
ROUTE A — Withdraw to external chain (Circle CCTP):
    1. USDC on Arc burned via CCTP
    2. USDC minted on destination chain
    3. Arrives in user's wallet on destination chain
    |
    v
ROUTE B — Direct transfer on Arc:
    Transfer native USDC to external wallet address on Arc
```

---

## Cluster & Nova System

### Creating and Joining Clusters

```
CREATE CLUSTER:
    ClusterManager.createCluster(name, isPrivate)
    |   On-chain tx on Arc Testnet
    |   Creator becomes leader, starts with 0 energy
    |   Max 50 members
    |
    v
    ENS subdomain: cluster-name.voidmarket.eth
    |
    v
    Leader can invite members

---

INVITE SYSTEM:
    Any member calls: ClusterManager.inviteToCluster(clusterId, inviteeAddress)
    |   Generates unique invite code
    |   7-day expiry
    |   Can be targeted (specific address) or open (address(0))
    |
    v
    Invitee joins: ClusterManager.joinCluster(clusterId, inviteCode)

---

PUBLIC CLUSTERS:
    Anyone can join without invite code:
    ClusterManager.joinCluster(clusterId, bytes32(0))
```

### Nova Battles (Cluster vs Cluster)

```
STARTING A NOVA:
    Any cluster member initiates:
    NovaManager.startNova{value: prizePool}(cluster1Id, cluster2Id, totalRounds)
    |   Prize pool deposited as msg.value
    |   3 matches created per round (DEFAULT_MATCHES_PER_ROUND)
    |   Members paired by index (with wraparound)
    |
    v
    Each match creates a linked prediction market:
    marketCore.createMarket("Nova #X Round Y: Will Star 1 win?", ...)
    |   1-hour betting duration per match
    |
    v
    Status: ACTIVE — matches begin

---

MATCH RESOLUTION:
    Admin resolves each match:
    NovaManager.resolveMatch(matchId, outcome)
    |   outcome: true = star1 wins, false = star2 wins
    |   Winner: +100 photons (BASE_PHOTONS_WIN)
    |   Loser: +25 photons (BASE_PHOTONS_LOSE)
    |   Updates ClusterManager photon tracking
    |   Resolves linked prediction market

---

ROUND ADVANCEMENT:
    After all 3 matches in a round are resolved:
    NovaManager.advanceRound(novaId)
    |   Tallies round photons
    |   Creates matches for next round (or completes Nova)

---

NOVA COMPLETION:
    After all rounds:
    _completeNova(novaId)
    |   Cluster with most total photons wins
    |   Winning cluster: +500 energy (ENERGY_BONUS_WIN)
    |   Both clusters: novas count updated
    |
    v
    Winning cluster members claim rewards:
    NovaManager.claimReward(novaId)
    |   USDC reward = (myPhotons * prizePool) / winningClusterTotalPhotons
    |   Proportional distribution — earn more photons, get more USDC
```

---

## Privacy Model: Commit-Reveal

### What's Hidden
- **Bet direction** — hidden via `keccak256(direction, salt)` commitment
- Nobody (server, contract, other users) knows if you bet YES or NO until you reveal

### What's NOT Hidden
- **Bet amount** — visible on-chain as `msg.value`
- **Who bet** — bettor address visible on-chain
- **Total pool** — aggregate of all bet amounts visible

### Security Properties
- **Binding**: Once committed, you can't change your direction (hash is fixed)
- **Hiding**: Without the salt, the commitment reveals nothing about direction
- **Verifiable**: On reveal, contract checks `keccak256(direction, salt) == commitment`

---

## Data Architecture (Hybrid Layer)

### On-Chain (Arc Testnet) — Financial & Critical Data

| Data | Contract | Why On-Chain |
|------|----------|--------------|
| Bet commitments + amounts | VoidMarketCore | Tamper-proof betting |
| Bet reveals + directions | VoidMarketCore | Verifiable resolution |
| Market creation + resolution | VoidMarketCore | Immutable outcomes |
| Payout distribution | VoidMarketCore | Financial integrity |
| Cluster membership + scores | ClusterManager | Photons/energy are on-chain currency |
| Nova matches + results | NovaManager | Verifiable competition results |
| Nova prize pools + rewards | NovaManager | Financial integrity |

### Off-Chain (PostgreSQL via Supabase) — Metadata & Profiles

| Data | Table | Why Off-Chain |
|------|-------|---------------|
| Star profiles (type, bio) | `voidmarket_stars` | Cosmetic, frequently updated |
| Market metadata (question, category) | `voidmarket_market_metadata` | Fast queries, filtering |
| Cluster metadata (description) | `voidmarket_cluster_metadata` | Cosmetic data |
| Bet history (cached from chain) | `voidmarket_bets` | Fast queries, cross-reference |
| Transaction log | `voidmarket_transactions` | Deposit/withdraw audit trail |

### ENS Resolution — Identity Layer

The gateway resolves ENS text records from **both** PostgreSQL (metadata) and Arc chain (live state):

| Subdomain Pattern | Entity | Example Records |
|-------------------|--------|-----------------|
| `username.voidmarket.eth` | Star | addr → wallet, `voidmarket.star-type`, `voidmarket.total-photons`, `voidmarket.cluster` |
| `market-slug.voidmarket.eth` | Market | `voidmarket.question`, `voidmarket.pool-size`, `voidmarket.status`, `voidmarket.category` |
| `cluster-name.voidmarket.eth` | Cluster | `voidmarket.energy`, `voidmarket.members`, `voidmarket.leader`, `voidmarket.novas-won` |
| `market.username.voidmarket.eth` | Forked Market | Same as market, nested under creator |

---

## Balance Tracking

### Single Layer: Arc Developer Wallet

```
User's USDC balance = their Circle developer wallet balance on Arc

Deposit:  USDC arrives on Arc via CCTP → wallet balance increases
Bet:      VoidMarketCore.placeBet{value: amount}() → wallet balance decreases
Win:      VoidMarketCore.claimWinnings() → wallet balance increases
Withdraw: Transfer USDC from Arc to any supported chain via CCTP
```

The "Gateway Balance" shown in the UI is the user's unified USDC balance across all chains, queried via Circle's Gateway API.

### Example Scenario

```
1. User deposits 100 USDC from Ethereum (via CCTP)
   Arc wallet: 100 USDC

2. User bets 30 USDC on Market A (YES)
   Arc wallet: 70 USDC | VoidMarketCore holds: 30 USDC

3. User bets 50 USDC on Market B (NO)
   Arc wallet: 20 USDC | VoidMarketCore holds: 80 USDC

4. Market A resolves YES — user won
   User reveals → claims → payout = 30 + proportional share of losers
   Arc wallet: 20 + payout USDC

5. Market B resolves YES — user lost (bet NO)
   User reveals → not a winner → 50 USDC stays in contract
   Arc wallet: unchanged from step 4

6. User withdraws remaining balance via CCTP to Ethereum
```

---

## ENS Resolution Flow (Zero Gas)

```
Client queries: cosmicvoyager.voidmarket.eth
         |
         v
1. VoidMarketResolver.resolve(name, data)
   |   On Sepolia — READ operation (no gas)
   |   Reverts with OffchainLookup error
   |
   v
2. Client receives: OffchainLookup {
     sender: resolverAddress,
     urls: ["https://gateway.voidmarket.xyz/{sender}/{data}.json"],
     callData: abi.encode(name, data),
     callbackFunction: resolveWithProof.selector,
     extraData: callData
   }
   |
   v
3. Client auto-fetches from gateway (wagmi/viem handle this transparently):
   GET gateway.voidmarket.xyz/{sender}/{calldata}
   |
   v
4. Gateway:
   - Decodes DNS-encoded name → "cosmicvoyager"
   - Looks up in PostgreSQL (priority: Star > Market > Cluster)
   - For live data (pool-size, status): reads from Arc chain via RPC
   - Decodes resolver method (addr, text, contenthash)
   - Returns signed response: (result, expires, signature)
   |
   v
5. Client calls: VoidMarketResolver.resolveWithProof(response, extraData)
   |   On Sepolia — READ operation (no gas)
   |   Verifies: signature from trusted signer, response not expired
   |   Returns: resolved data
   |
   v
6. Client receives the ENS record as if it were on-chain
```

---

## Security Model

### What commit-reveal guarantees
- Bet direction is hidden until the user voluntarily reveals
- Cannot change direction after commitment (hash is binding)
- Reveal is cryptographically verified: `keccak256(direction, salt) == commitment`
- Unrevealed bets are forfeited — users can't selectively reveal only winning bets after seeing others' reveals (24-hour window applies to all)

### What Circle developer wallets guarantee
- Users don't hold private keys — server manages keys via Circle SDK
- Gasless UX — server signs all transactions on behalf of users
- Deterministic addresses from Telegram ID — consistent identity across chains

### What ENS CCIP-Read guarantees
- Gateway responses are signed by a trusted signer and verified on-chain
- 5-minute response expiry prevents replay attacks
- Full ENS compatibility — works with any ENS-aware client

### Trust assumptions
- **Admin is trusted** for market creation and resolution (centralized)
- **Circle is trusted** for wallet custody and transaction signing (custodial model)
- **Gateway server is trusted** for ENS resolution data integrity (single point of failure — if gateway is down, names don't resolve)
- **Salt storage is durable** — Telegram Cloud Storage persists across devices within Telegram
- **No on-chain privacy for amounts** — only direction is hidden, bet amounts are public on-chain
