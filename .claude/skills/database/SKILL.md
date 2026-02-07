# Database Skill — VoidMarket (Supabase)

## Supabase Project

- **Project name:** brains
- **Project ID:** `qrsdodlbzjghfxoppcsp`
- **Region:** (default)
- **DB connection:** `postgresql://postgres:<password>@db.qrsdodlbzjghfxoppcsp.supabase.co:5432/postgres`
- **API URL:** `https://qrsdodlbzjghfxoppcsp.supabase.co`
- **Service role key:** set in env as `SUPABASE_KEY`
- **Anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyc2RvZGxiempnaGZ4b3BwY3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDgwODUsImV4cCI6MjA3MDQyNDA4NX0.u0DAHag3Jz8v-P2-JGxcaoPU96sfdqrlWxycGJLdtrk`

> This Supabase project is **shared** across multiple apps (moltrades, voidmarket, etc.). All VoidMarket tables, functions, buckets, and policies **MUST** use the `voidmarket_` prefix to avoid collisions.

---

## Current Database Layer

VoidMarket currently uses **Prisma ORM** with a direct PostgreSQL connection (`DATABASE_URL`). The Prisma schema defines three models in `frontend/prisma/schema.prisma` (shared by `gateway/`):

| Prisma Model | Purpose |
|-------------|---------|
| `Star` | User profiles (name, wallet, telegram, star type, stats) |
| `MarketMetadata` | Off-chain market metadata (category, oracle config) |
| `ClusterMetadata` | Off-chain cluster metadata (name, description, avatar) |

The **comprehensive schema** (for full migration) is defined in Drizzle format at `flow-testing/src/services/db/schema.ts` and covers 12 tables.

---

## Naming Convention

**ALL custom database objects MUST use the `voidmarket_` prefix:**

- Tables: `voidmarket_users`, `voidmarket_profiles`, `voidmarket_markets`, etc.
- Functions: `voidmarket_increment_photons(...)`, etc.
- Storage buckets: `voidmarket-avatars`, `voidmarket-covers`, etc.
- Policies: `voidmarket_avatars_public_read`, etc.
- Indexes: `idx_voidmarket_users_telegram_id`, etc.

---

## Tables

### Core User Tables

| Table | Description |
|-------|-------------|
| `voidmarket_users` | Telegram users linked to Circle wallets |
| `voidmarket_profiles` | Star profiles (display name, star type, ENS, stats) |

### Market Tables

| Table | Description |
|-------|-------------|
| `voidmarket_markets` | Prediction markets (question, deadline, status, pool amounts) |
| `voidmarket_bets` | Hidden bets with commitment hashes (commitment-reveal scheme) |

### Social / Team Tables

| Table | Description |
|-------|-------------|
| `voidmarket_clusters` | Teams with leaders, energy, and nova stats |
| `voidmarket_cluster_members` | Team membership with roles (LEADER, OFFICER, MEMBER) |
| `voidmarket_cluster_invites` | Invite codes for private clusters |

### Competition Tables

| Table | Description |
|-------|-------------|
| `voidmarket_novas` | Cluster vs cluster battles (rounds, prize pool) |
| `voidmarket_nova_matches` | 1v1 matches within a nova (star1 vs star2) |
| `voidmarket_nova_rewards` | Photon + USDC rewards per nova participant |

### Infrastructure Tables

| Table | Description |
|-------|-------------|
| `voidmarket_transactions` | On-chain activity tracking (bet, reveal, claim, deposit) |
| `voidmarket_ens_records` | Cached ENS subdomain data for CCIP-Read resolver |

---

## Schema Reference (SQL)

```sql
-- ============================================================================
-- USERS & WALLETS
-- ============================================================================

CREATE TABLE voidmarket_users (
  id SERIAL PRIMARY KEY,
  telegram_id VARCHAR(64) NOT NULL UNIQUE,
  username VARCHAR(64),
  wallet_id VARCHAR(128) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  ref_id VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_voidmarket_users_telegram_id ON voidmarket_users(telegram_id);
CREATE INDEX idx_voidmarket_users_wallet_address ON voidmarket_users(wallet_address);

-- ============================================================================
-- PROFILES (STARS)
-- ============================================================================

CREATE TABLE voidmarket_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES voidmarket_users(id),
  display_name VARCHAR(64) NOT NULL,
  star_type VARCHAR(32) NOT NULL,  -- MAIN_SEQUENCE, RED_GIANT, BLUE_SUPERGIANT, etc.
  ens_subdomain VARCHAR(128) UNIQUE, -- e.g. 'alice.voidmarket.eth'
  avatar_url TEXT,
  bio TEXT,
  total_bets INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_earnings BIGINT NOT NULL DEFAULT 0,
  photons INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_voidmarket_profiles_user_id ON voidmarket_profiles(user_id);
CREATE UNIQUE INDEX idx_voidmarket_profiles_ens ON voidmarket_profiles(ens_subdomain);

-- ============================================================================
-- MARKETS
-- ============================================================================

CREATE TABLE voidmarket_markets (
  id SERIAL PRIMARY KEY,
  on_chain_id BIGINT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  creator_id INTEGER NOT NULL REFERENCES voidmarket_users(id),
  deadline TIMESTAMPTZ NOT NULL,
  resolution_deadline TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',  -- OPEN, BETTING_CLOSED, RESOLVED, CANCELLED
  outcome BOOLEAN,  -- null until resolved
  total_yes_amount BIGINT NOT NULL DEFAULT 0,
  total_no_amount BIGINT NOT NULL DEFAULT 0,
  total_pool BIGINT NOT NULL DEFAULT 0,
  is_forked BOOLEAN NOT NULL DEFAULT FALSE,
  parent_market_id INTEGER,
  category VARCHAR(64),  -- crypto, sports, politics, culture, custom
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_voidmarket_markets_on_chain_id ON voidmarket_markets(on_chain_id);
CREATE INDEX idx_voidmarket_markets_creator ON voidmarket_markets(creator_id);
CREATE INDEX idx_voidmarket_markets_status ON voidmarket_markets(status);
CREATE INDEX idx_voidmarket_markets_deadline ON voidmarket_markets(deadline);

-- ============================================================================
-- BETS (Hidden Commitment-Reveal)
-- ============================================================================

CREATE TABLE voidmarket_bets (
  id SERIAL PRIMARY KEY,
  on_chain_id BIGINT NOT NULL UNIQUE,
  market_id INTEGER NOT NULL REFERENCES voidmarket_markets(id),
  user_id INTEGER NOT NULL REFERENCES voidmarket_users(id),
  amount BIGINT NOT NULL,
  commitment_hash VARCHAR(66) NOT NULL,  -- keccak256(direction, salt)
  direction BOOLEAN,  -- null until revealed (true=YES, false=NO)
  salt VARCHAR(66),   -- stored after reveal
  revealed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  winnings BIGINT,
  tx_hash VARCHAR(66),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_voidmarket_bets_on_chain_id ON voidmarket_bets(on_chain_id);
CREATE INDEX idx_voidmarket_bets_market ON voidmarket_bets(market_id);
CREATE INDEX idx_voidmarket_bets_user ON voidmarket_bets(user_id);
CREATE INDEX idx_voidmarket_bets_commitment ON voidmarket_bets(commitment_hash);

-- ============================================================================
-- CLUSTERS (Teams)
-- ============================================================================

CREATE TABLE voidmarket_clusters (
  id SERIAL PRIMARY KEY,
  on_chain_id BIGINT NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  leader_id INTEGER NOT NULL REFERENCES voidmarket_users(id),
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  energy BIGINT NOT NULL DEFAULT 0,
  novas_won INTEGER NOT NULL DEFAULT 0,
  total_novas INTEGER NOT NULL DEFAULT 0,
  member_count INTEGER NOT NULL DEFAULT 1,
  max_members INTEGER NOT NULL DEFAULT 50,
  avatar_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_voidmarket_clusters_on_chain_id ON voidmarket_clusters(on_chain_id);
CREATE INDEX idx_voidmarket_clusters_leader ON voidmarket_clusters(leader_id);
CREATE INDEX idx_voidmarket_clusters_name ON voidmarket_clusters(name);

-- ============================================================================
-- CLUSTER MEMBERS
-- ============================================================================

CREATE TABLE voidmarket_cluster_members (
  id SERIAL PRIMARY KEY,
  cluster_id INTEGER NOT NULL REFERENCES voidmarket_clusters(id),
  user_id INTEGER NOT NULL REFERENCES voidmarket_users(id),
  photons INTEGER NOT NULL DEFAULT 0,
  role VARCHAR(32) NOT NULL DEFAULT 'MEMBER',  -- LEADER, OFFICER, MEMBER
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(cluster_id, user_id)
);

CREATE INDEX idx_voidmarket_cluster_members_cluster ON voidmarket_cluster_members(cluster_id);
CREATE INDEX idx_voidmarket_cluster_members_user ON voidmarket_cluster_members(user_id);

-- ============================================================================
-- CLUSTER INVITES
-- ============================================================================

CREATE TABLE voidmarket_cluster_invites (
  id SERIAL PRIMARY KEY,
  cluster_id INTEGER NOT NULL REFERENCES voidmarket_clusters(id),
  invite_code VARCHAR(66) NOT NULL UNIQUE,
  invitee_address VARCHAR(42),
  invited_by_id INTEGER NOT NULL REFERENCES voidmarket_users(id),
  used_by_id INTEGER REFERENCES voidmarket_users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_voidmarket_cluster_invites_code ON voidmarket_cluster_invites(invite_code);
CREATE INDEX idx_voidmarket_cluster_invites_cluster ON voidmarket_cluster_invites(cluster_id);

-- ============================================================================
-- NOVAS (Cluster Battles)
-- ============================================================================

CREATE TABLE voidmarket_novas (
  id SERIAL PRIMARY KEY,
  on_chain_id BIGINT NOT NULL UNIQUE,
  cluster1_id INTEGER NOT NULL REFERENCES voidmarket_clusters(id),
  cluster2_id INTEGER NOT NULL REFERENCES voidmarket_clusters(id),
  total_rounds INTEGER NOT NULL,
  current_round INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',  -- PENDING, ACTIVE, COMPLETED, CANCELLED
  prize_pool BIGINT NOT NULL,
  winning_cluster_id INTEGER REFERENCES voidmarket_clusters(id),
  cluster1_total_photons BIGINT NOT NULL DEFAULT 0,
  cluster2_total_photons BIGINT NOT NULL DEFAULT 0,
  betting_duration INTEGER NOT NULL,  -- seconds
  matches_per_round INTEGER NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_voidmarket_novas_on_chain_id ON voidmarket_novas(on_chain_id);
CREATE INDEX idx_voidmarket_novas_status ON voidmarket_novas(status);
CREATE INDEX idx_voidmarket_novas_cluster1 ON voidmarket_novas(cluster1_id);
CREATE INDEX idx_voidmarket_novas_cluster2 ON voidmarket_novas(cluster2_id);

-- ============================================================================
-- NOVA MATCHES (1v1 Battles)
-- ============================================================================

CREATE TABLE voidmarket_nova_matches (
  id SERIAL PRIMARY KEY,
  on_chain_id BIGINT NOT NULL UNIQUE,
  nova_id INTEGER NOT NULL REFERENCES voidmarket_novas(id),
  round INTEGER NOT NULL,
  star1_id INTEGER NOT NULL REFERENCES voidmarket_users(id),
  star2_id INTEGER NOT NULL REFERENCES voidmarket_users(id),
  market_id INTEGER REFERENCES voidmarket_markets(id),
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',  -- PENDING, BETTING, RESOLVED
  winner_id INTEGER REFERENCES voidmarket_users(id),
  star1_photons INTEGER NOT NULL DEFAULT 0,
  star2_photons INTEGER NOT NULL DEFAULT 0,
  betting_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_voidmarket_nova_matches_on_chain_id ON voidmarket_nova_matches(on_chain_id);
CREATE INDEX idx_voidmarket_nova_matches_nova ON voidmarket_nova_matches(nova_id);
CREATE INDEX idx_voidmarket_nova_matches_star1 ON voidmarket_nova_matches(star1_id);
CREATE INDEX idx_voidmarket_nova_matches_star2 ON voidmarket_nova_matches(star2_id);

-- ============================================================================
-- NOVA REWARDS
-- ============================================================================

CREATE TABLE voidmarket_nova_rewards (
  id SERIAL PRIMARY KEY,
  nova_id INTEGER NOT NULL REFERENCES voidmarket_novas(id),
  user_id INTEGER NOT NULL REFERENCES voidmarket_users(id),
  photons_earned INTEGER NOT NULL,
  usdc_reward BIGINT NOT NULL,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_at TIMESTAMPTZ,
  tx_hash VARCHAR(66),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(nova_id, user_id)
);

CREATE INDEX idx_voidmarket_nova_rewards_nova ON voidmarket_nova_rewards(nova_id);
CREATE INDEX idx_voidmarket_nova_rewards_user ON voidmarket_nova_rewards(user_id);

-- ============================================================================
-- TRANSACTIONS (On-chain Activity)
-- ============================================================================

CREATE TABLE voidmarket_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES voidmarket_users(id),
  type VARCHAR(32) NOT NULL,  -- BET, REVEAL, CLAIM, CREATE_MARKET, DEPOSIT, WITHDRAW, etc.
  tx_hash VARCHAR(66) NOT NULL UNIQUE,
  circle_transaction_id VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',  -- PENDING, CONFIRMED, FAILED
  chain_id INTEGER NOT NULL,
  amount BIGINT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_voidmarket_transactions_tx_hash ON voidmarket_transactions(tx_hash);
CREATE INDEX idx_voidmarket_transactions_user ON voidmarket_transactions(user_id);
CREATE INDEX idx_voidmarket_transactions_type ON voidmarket_transactions(type);
CREATE INDEX idx_voidmarket_transactions_status ON voidmarket_transactions(status);

-- ============================================================================
-- ENS RECORDS (CCIP-Read Cache)
-- ============================================================================

CREATE TABLE voidmarket_ens_records (
  id SERIAL PRIMARY KEY,
  subdomain VARCHAR(128) NOT NULL UNIQUE,  -- e.g. 'alice'
  full_name VARCHAR(256) NOT NULL,          -- e.g. 'alice.voidmarket.eth'
  address VARCHAR(42) NOT NULL,
  user_id INTEGER REFERENCES voidmarket_users(id),
  records JSONB DEFAULT '{}',  -- arbitrary text records for ENS resolution
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_voidmarket_ens_records_subdomain ON voidmarket_ens_records(subdomain);
CREATE INDEX idx_voidmarket_ens_records_address ON voidmarket_ens_records(address);
```

---

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `voidmarket-avatars` | Yes | Star profile avatars |
| `voidmarket-clusters` | Yes | Cluster avatar images |

---

## RPC Functions (Helpers)

```sql
-- Atomically increment a user's photons
CREATE OR REPLACE FUNCTION voidmarket_increment_photons(p_user_id INTEGER, p_amount INTEGER)
RETURNS void AS $$
  UPDATE voidmarket_profiles
  SET photons = photons + p_amount, updated_at = NOW()
  WHERE user_id = p_user_id;
$$ LANGUAGE sql;

-- Atomically update bet stats after a win
CREATE OR REPLACE FUNCTION voidmarket_record_win(p_user_id INTEGER)
RETURNS void AS $$
  UPDATE voidmarket_profiles
  SET total_wins = total_wins + 1, total_bets = total_bets + 1, updated_at = NOW()
  WHERE user_id = p_user_id;
$$ LANGUAGE sql;

-- Atomically update bet stats after a loss
CREATE OR REPLACE FUNCTION voidmarket_record_loss(p_user_id INTEGER)
RETURNS void AS $$
  UPDATE voidmarket_profiles
  SET total_bets = total_bets + 1, updated_at = NOW()
  WHERE user_id = p_user_id;
$$ LANGUAGE sql;

-- Increment cluster member count
CREATE OR REPLACE FUNCTION voidmarket_increment_cluster_members(p_cluster_id INTEGER)
RETURNS void AS $$
  UPDATE voidmarket_clusters
  SET member_count = member_count + 1, updated_at = NOW()
  WHERE id = p_cluster_id;
$$ LANGUAGE sql;
```

---

## Access Pattern

- **No RLS** — all access goes through server-side code using the service role key.
- **No Supabase Auth** — user identity comes from Telegram IDs + Circle wallets.
- **Financial data lives on-chain** — the database stores only off-chain metadata, cached state, and user profiles.

---

## Architecture Notes

### Hybrid Data Model

| Data | Where It Lives |
|------|---------------|
| Market creation, bet placement, resolution | **On-chain** (VoidMarketCore.sol on Arc Chain) |
| Market metadata (category, oracle type) | **Supabase** (voidmarket_markets) |
| Bet commitments and reveals | **Both** (on-chain + cached in voidmarket_bets) |
| User profiles (Star) | **Supabase** (voidmarket_users + voidmarket_profiles) |
| Cluster management | **On-chain** (ClusterManager.sol) + **Supabase** metadata |
| Nova battles | **On-chain** (NovaManager.sol) + **Supabase** tracking |
| ENS resolution | **Supabase** (voidmarket_ens_records) via CCIP-Read gateway |
| Transactions | **Both** (on-chain + indexed in voidmarket_transactions) |

### Services That Access the DB

| Service | Location | ORM | Purpose |
|---------|----------|-----|---------|
| Frontend (Next.js) | `frontend/src/lib/services/db.ts` | Prisma 7 | Star, Market, Cluster CRUD |
| Gateway (Express) | `gateway/src/services/database.ts` | Prisma 6 | ENS CCIP-Read resolution |
| Flow Testing | `flow-testing/src/services/db/` | Drizzle | Integration tests |

### Key Domain Concepts

- **Stars** — User profiles with 6 types: `red-giant`, `blue-supergiant`, `white-dwarf`, `yellow-sun`, `neutron`, `binary`
- **Photons** — Reputation/experience points earned from betting and novas
- **Commitment-Reveal** — Bets are hidden using `keccak256(direction, salt)` until market resolves
- **Clusters** — Teams of up to 50 members with energy and nova win tracking
- **Novas** — Cluster vs cluster tournaments with 1v1 matches across rounds
- **Market Forking** — Private copies of public markets for group betting

---

## Conventions

- All table/function names are **snake_case** with `voidmarket_` prefix.
- On-chain IDs are stored as `BIGINT` (Solidity `uint256`, cast to JS `bigint`).
- Internal IDs use `SERIAL` auto-increment.
- Amounts (USDC) are stored as `BIGINT` in smallest unit (6 decimals for USDC).
- Timestamps use `TIMESTAMPTZ` (UTC).
- Status enums are stored as `VARCHAR(32)` strings, not Postgres enums.

---

## Quick Reference — Common Queries

```sql
-- Get a star profile by Telegram ID
SELECT u.*, p.*
FROM voidmarket_users u
JOIN voidmarket_profiles p ON p.user_id = u.id
WHERE u.telegram_id = '123456789';

-- Get all open markets
SELECT * FROM voidmarket_markets
WHERE status = 'OPEN' AND deadline > NOW()
ORDER BY created_at DESC;

-- Get bets for a market (revealed only)
SELECT b.*, p.display_name, p.star_type
FROM voidmarket_bets b
JOIN voidmarket_users u ON u.id = b.user_id
JOIN voidmarket_profiles p ON p.user_id = u.id
WHERE b.market_id = 1 AND b.revealed = TRUE;

-- Get cluster leaderboard
SELECT c.name, c.energy, c.novas_won, c.member_count,
       p.display_name AS leader_name
FROM voidmarket_clusters c
JOIN voidmarket_users u ON u.id = c.leader_id
JOIN voidmarket_profiles p ON p.user_id = u.id
ORDER BY c.energy DESC;

-- Get active novas
SELECT n.*, c1.name AS cluster1_name, c2.name AS cluster2_name
FROM voidmarket_novas n
JOIN voidmarket_clusters c1 ON c1.id = n.cluster1_id
JOIN voidmarket_clusters c2 ON c2.id = n.cluster2_id
WHERE n.status = 'ACTIVE';

-- Resolve ENS subdomain
SELECT address, records FROM voidmarket_ens_records
WHERE subdomain = 'alice';

-- Get user transaction history
SELECT * FROM voidmarket_transactions
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 20;
```

---

## Migration from Prisma

The current Prisma models (`Star`, `MarketMetadata`, `ClusterMetadata`) map to the Supabase tables as follows:

| Prisma Model | Supabase Table(s) |
|-------------|-------------------|
| `Star` | `voidmarket_users` + `voidmarket_profiles` (split into two tables) |
| `MarketMetadata` | `voidmarket_markets` (expanded with full market state) |
| `ClusterMetadata` | `voidmarket_clusters` (expanded with full cluster state) |

When migrating, the Prisma client in `frontend/src/lib/services/db.ts` should be replaced with a Supabase client using the same singleton pattern. The gateway's Prisma client should similarly be updated.
