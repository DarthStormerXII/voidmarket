CREATE TABLE IF NOT EXISTS voidmarket_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  wallet_address VARCHAR(255) NOT NULL,
  telegram_id VARCHAR(255),
  circle_wallet_id VARCHAR(255),
  star_type VARCHAR(255) NOT NULL,
  description TEXT,
  cluster_id VARCHAR(255),
  total_photons INTEGER NOT NULL DEFAULT 0,
  bets_won INTEGER NOT NULL DEFAULT 0,
  bets_lost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_voidmarket_stars_wallet ON voidmarket_stars(wallet_address);
CREATE INDEX IF NOT EXISTS idx_voidmarket_stars_telegram ON voidmarket_stars(telegram_id);

CREATE TABLE IF NOT EXISTS voidmarket_market_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  on_chain_id INTEGER NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(255) NOT NULL DEFAULT 'custom',
  oracle_type VARCHAR(255) NOT NULL DEFAULT 'manual',
  oracle_source VARCHAR(255),
  creator_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_voidmarket_markets_category ON voidmarket_market_metadata(category);

CREATE TABLE IF NOT EXISTS voidmarket_cluster_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  on_chain_id INTEGER NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
