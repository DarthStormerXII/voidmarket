-- Add telegram_chat_id to stars
ALTER TABLE voidmarket_stars ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(255);

-- Bet cache for "My Bets" page
CREATE TABLE IF NOT EXISTS voidmarket_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id INTEGER NOT NULL UNIQUE,
  market_id INTEGER NOT NULL,
  bettor_address VARCHAR(255) NOT NULL,
  telegram_user_id VARCHAR(255),
  commitment_hash VARCHAR(255) NOT NULL,
  direction BOOLEAN,
  amount NUMERIC NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'placed',
  tx_hash VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_voidmarket_bets_market ON voidmarket_bets(market_id);
CREATE INDEX IF NOT EXISTS idx_voidmarket_bets_bettor ON voidmarket_bets(bettor_address);
CREATE INDEX IF NOT EXISTS idx_voidmarket_bets_telegram ON voidmarket_bets(telegram_user_id);

-- Transaction audit trail
CREATE TABLE IF NOT EXISTS voidmarket_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount NUMERIC NOT NULL,
  chain VARCHAR(100),
  tx_hash VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_voidmarket_tx_user ON voidmarket_transactions(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_voidmarket_tx_type ON voidmarket_transactions(type);

-- Cluster members cache
CREATE TABLE IF NOT EXISTS voidmarket_cluster_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id INTEGER NOT NULL,
  member_address VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cluster_id, member_address)
);
CREATE INDEX IF NOT EXISTS idx_voidmarket_cm_cluster ON voidmarket_cluster_members(cluster_id);
CREATE INDEX IF NOT EXISTS idx_voidmarket_cm_member ON voidmarket_cluster_members(member_address);

-- Nova history
CREATE TABLE IF NOT EXISTS voidmarket_novas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nova_id INTEGER NOT NULL UNIQUE,
  challenger_cluster_id INTEGER NOT NULL,
  defender_cluster_id INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  prize_pool NUMERIC NOT NULL DEFAULT 0,
  winner_cluster_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_voidmarket_novas_status ON voidmarket_novas(status);

-- Nova match details
CREATE TABLE IF NOT EXISTS voidmarket_nova_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id INTEGER NOT NULL UNIQUE,
  nova_id INTEGER NOT NULL,
  round INTEGER NOT NULL,
  challenger_address VARCHAR(255) NOT NULL,
  defender_address VARCHAR(255) NOT NULL,
  market_id INTEGER,
  winner_address VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_voidmarket_nm_nova ON voidmarket_nova_matches(nova_id);
