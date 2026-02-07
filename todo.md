# VoidMarket — TODO

> Gap between current implementation and desired app flow (appflow.md)

---

## P0 — Critical (App breaks without these)

### 1. Salt Backup to Telegram Cloud Storage
**Current:** Salt stored only in browser localStorage. If user clears cache or switches device, they lose salts and **cannot reveal their bets** — forfeiting funds permanently.

**Needed:**
- Integrate `WebApp.CloudStorage.setItem()` / `WebApp.CloudStorage.getItem()` from Telegram WebApp SDK
- On bet placement: write salt to Cloud Storage (keyed by `betId` or `marketId_address`)
- On reveal: read from Cloud Storage first, fall back to localStorage
- Cloud Storage persists across devices within Telegram — this is the safety net

**Files to change:**
- `frontend/src/lib/services/commitment.ts` — add Cloud Storage write on `storeBetCommitment()`
- `frontend/src/components/drawers/PlaceBetDrawer.tsx` — ensure Cloud Storage write completes before bet tx
- `frontend/src/app/api/reveal/route.ts` — read from Cloud Storage on reveal

---

### 2. CCTP Deposit Flow (Cross-Chain Bridge)
**Current:** `getUnifiedBalance()` reads balances across chains. Bridge chain configs exist (ETH-SEPOLIA, BASE-SEPOLIA, ARC-TESTNET with CCTP domain IDs). But there is **no UI or backend logic to actually trigger a CCTP bridge**.

**Needed:**
- Deposit UI: chain selector → amount input → "Bridge to Arc" button
- Backend: call Circle CCTP to burn USDC on source chain, mint on Arc
- Transaction status polling until bridge completes (~minutes)
- Balance refresh after deposit lands on Arc
- Error handling for failed bridges

**Files to change:**
- `frontend/src/components/drawers/DepositDrawer.tsx` — build bridge UI
- `frontend/src/app/api/deposit/route.ts` — add POST handler for bridge trigger
- `frontend/src/lib/services/circle.ts` — add `initiateCCTPBridge()` function
- `frontend/src/app/api/transaction/[id]/route.ts` — poll bridge status

---

### 3. Withdraw Flow
**Current:** `/api/withdraw` route exists but implementation is incomplete. No UI to trigger withdrawal.

**Needed:**
- Withdraw UI: amount input → destination chain selector → confirm
- Backend: transfer USDC from developer wallet
- For Arc-only withdrawal: direct native USDC transfer
- For cross-chain withdrawal: CCTP bridge back to destination chain

**Files to change:**
- `frontend/src/components/drawers/WithdrawDrawer.tsx` — build withdraw UI
- `frontend/src/app/api/withdraw/route.ts` — implement POST handler
- `frontend/src/lib/services/circle.ts` — add `initiateWithdrawal()` function

---

## P1 — Important (ENS + data integrity)

### 4. Gateway → Arc Chain Sync
**Current:** The ENS gateway reads **only from PostgreSQL**. It cannot serve live on-chain data like market pool sizes, bet counts, status, deadlines, or resolution results. When someone queries `eth-5k.voidmarket.eth` for `voidmarket.pool-size`, the gateway has no answer.

**Needed (pick one approach):**

**Option A — Event Listener Service (recommended):**
- New service that watches Arc chain for contract events
- On `MarketCreated` / `BetPlaced` / `MarketResolved` etc. → update PostgreSQL
- Keeps database in sync with on-chain state
- Gateway continues reading from PostgreSQL (fast)

**Option B — Gateway reads Arc RPC directly:**
- Add viem/ethers client to gateway pointing at Arc RPC
- On ENS query for live data fields, read from chain
- Slower per-request, but simpler architecture

**Option C — Accept metadata-only ENS (simplest for hackathon):**
- ENS resolves only metadata (category, creator, description)
- Live data (pool size, status) served only via frontend API routes
- Document this limitation

**Files to change (Option A):**
- New: `gateway/src/services/chain-sync.ts` — event listener
- `gateway/src/services/database.ts` — add write functions for on-chain data
- `gateway/prisma/schema.prisma` — add fields for on-chain market state
- New migration for additional columns

**Files to change (Option B):**
- `gateway/src/services/arc-client.ts` — viem client for Arc Testnet
- `gateway/src/routes/resolve.ts` — read from chain for live fields
- `gateway/src/services/database.ts` — add chain read functions

---

### 5. Notification System (Telegram DMs)
**Current:** No notifications. Users must manually check the app to see if markets resolved.

**Needed:**
- Telegram Bot that sends DMs when:
  - Market the user bet on is resolved → "Reveal your bet!"
  - Reveal deadline approaching → "You have X hours to reveal"
  - Nova match assigned → "You've been matched in Nova #X"
  - Winnings ready to claim
- Requires a Telegram Bot Token and the bot being able to DM users
- Triggered by the event listener (from task #4) or by admin action

**Files to change:**
- New: `frontend/src/lib/services/telegram-bot.ts` — grammY or telegraf bot instance
- New: `frontend/src/lib/services/notifications.ts` — notification triggers
- Integrate with event listener or resolution flow

---

### 6. Supabase Schema Completion
**Current:** 3 tables exist: `voidmarket_stars`, `voidmarket_market_metadata`, `voidmarket_cluster_metadata`. Missing tables for off-chain caching of bets, novas, and transactions.

**Needed:** These tables aren't strictly required (data is on-chain), but they improve UX by enabling fast queries, search, and filtering without hitting Arc RPC every time.

- `voidmarket_bets` — cache of bet placements, reveals, claims (for "My Bets" page)
- `voidmarket_transactions` — deposit/withdraw/bet/winnings audit trail (for wallet history)
- `voidmarket_cluster_members` — cached membership for fast cluster page loads
- Optionally: `voidmarket_novas`, `voidmarket_nova_matches` for Nova history

**Files to change:**
- New migration: `supabase/migrations/XXXX_add_bets_and_transactions.sql`
- `frontend/src/lib/services/db.ts` — add CRUD for new tables
- `gateway/prisma/schema.prisma` — add models if gateway needs them

---

## P2 — Enhancement (improves demo quality)

### 7. Market Discovery & Search
**Current:** `/markets` page exists but browsing, filtering, and search functionality is basic.

**Needed:**
- Filter by category (crypto, sports, politics, culture, custom)
- Filter by status (active, resolved, cancelled)
- Search by question text
- Sort by pool size, deadline, creation date
- Trending markets (most bets, largest pools)

**Files to change:**
- `frontend/src/app/markets/page.tsx` — add filter/search UI
- `frontend/src/app/api/markets/route.ts` — add query params for filtering
- `frontend/src/lib/services/db.ts` — add filtered market queries

---

### 8. Leaderboard
**Current:** No leaderboard.

**Needed:**
- Top clusters by energy
- Top stars by photons
- Most active bettors (by number of bets, winnings)
- Display on home page or dedicated leaderboard page

**Files to change:**
- New: `frontend/src/app/leaderboard/page.tsx`
- `frontend/src/app/api/leaderboard/route.ts` — aggregate queries
- Supabase views or queries for aggregations

---

### 9. ClusterEscrow Decision
**Current:** ClusterEscrow.sol contract exists (299 lines) but is not deployed and not integrated into the Nova flow. Currently `NovaManager.startNova()` takes `msg.value` directly — the initiator funds the entire prize pool.

**Decision needed:**
- **Option A — Keep current model (simpler):** Nova initiator provides full prize pool via `msg.value`. No escrow needed. Works fine for hackathon.
- **Option B — Integrate ClusterEscrow:** Each cluster deposits into their escrow. Both escrows must have sufficient funds before Nova starts. More realistic for production.

If Option B:
- Deploy ClusterEscrow per cluster (factory pattern or lazy deployment)
- Wire into NovaManager: check escrow balances before `startNova()`
- Frontend UI for cluster leader to deposit/manage escrow

---

### 10. Foundry Tests for ClusterEscrow
**Current:** ClusterEscrow.sol has no Solidity unit tests. Only TypeScript integration tests exist (mostly skipped).

**Needed:**
- `contracts/test/ClusterEscrow.t.sol` — test deposit, withdraw, nova locking, release, refund, cancel
- Edge cases: withdraw more than available, double-release, unauthorized access

---

## P3 — Nice-to-Have (polish)

### 11. Telegram Bot Commands
**Current:** No Telegram bot. App is MiniApp-only.

**Needed (if bot is desired):**
- `/start` — registration, links to MiniApp onboarding
- `/balance` — show USDC balance
- `/bet <marketId>` — deep link to market in MiniApp
- `/reveal <marketId>` — deep link to reveal page
- `/claim` — deep link to claim page
- `/profile` — show star profile
- `/cluster` — show cluster info

**Files to change:**
- New: `frontend/src/lib/telegram-bot/` — bot setup with grammY
- Webhook handler or long-polling setup

---

### 12. Oracle Integration (Stork)
**Current:** Market resolution is admin-only (`onlyAdmin` modifier). No oracle integration.

**Needed for production (not hackathon):**
- Stork oracle integration for price-based markets
- New contract function: `resolveMarketFromOracle(marketId)` that reads Stork price feed
- Auto-resolution when deadline passes and oracle has data

**Files to change:**
- `contracts/src/VoidMarketCore.sol` — add oracle resolution function
- `contracts/src/interfaces/IStorkOracle.sol` — oracle interface
- Redeploy or upgrade contract

---

### 13. ENS L2 Resolution on Arc
**Current:** VoidMarketResolver deployed on both Sepolia and Arc, but no cross-chain resolution bridge. Cannot resolve `username.voidmarket.eth` from an on-chain contract on Arc.

**Decision needed:**
- If the goal is "users resolve ENS in their browser" → current CCIP-Read from Sepolia is sufficient (clients handle it)
- If the goal is "smart contracts on Arc can read ENS" → need an L2 resolver or registry mirror on Arc

For hackathon: current setup works. Users interact via MiniApp which resolves from Sepolia.

---

## Summary

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 1 | Salt backup (Telegram Cloud Storage) | P0 | Small | Not started |
| 2 | CCTP deposit flow (bridge UI + backend) | P0 | Medium | Partial (read works, write missing) |
| 3 | Withdraw flow | P0 | Medium | Stub only |
| 4 | Gateway ↔ Arc chain sync | P1 | Medium | Not started |
| 5 | Notification system (Telegram DMs) | P1 | Medium | Not started |
| 6 | Supabase schema completion | P1 | Small | 3/7+ tables done |
| 7 | Market discovery & search | P2 | Small | Basic UI exists |
| 8 | Leaderboard | P2 | Small | Not started |
| 9 | ClusterEscrow integration decision | P2 | Small-Medium | Contract exists, not wired |
| 10 | ClusterEscrow Foundry tests | P2 | Small | Not started |
| 11 | Telegram Bot commands | P3 | Medium | Not started |
| 12 | Oracle integration (Stork) | P3 | Medium | Not started |
| 13 | ENS L2 resolution on Arc | P3 | Medium | Needs decision |
