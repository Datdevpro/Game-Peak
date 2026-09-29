-- ============================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR GAME-PEAK (MẦM XANH)
-- ============================================================================

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles & Accounts
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT NOT NULL UNIQUE CHECK(length(username) BETWEEN 3 AND 20),
  password_hash TEXT NOT NULL,
  avatar INTEGER NOT NULL DEFAULT 0 CHECK(avatar BETWEEN 0 AND 23),
  x REAL NOT NULL DEFAULT 960,
  y REAL NOT NULL DEFAULT 760,
  apartment BOOLEAN NOT NULL DEFAULT false,
  commerce INTEGER NOT NULL DEFAULT 0 CHECK(commerce >= 0),
  created_at BIGINT NOT NULL
);

-- 2. Player Wallets
CREATE TABLE IF NOT EXISTS player_wallets (
  player_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  cash BIGINT NOT NULL CHECK(cash >= 0),
  bank BIGINT NOT NULL DEFAULT 0 CHECK(bank >= 0)
);

-- 3. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_player ON sessions(player_id);

-- 4. Items Definition
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_price INTEGER NOT NULL CHECK(base_price > 0)
);

-- 5. Player Inventory
CREATE TABLE IF NOT EXISTS inventory_items (
  player_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  cost BIGINT NOT NULL DEFAULT 0 CHECK(cost >= 0),
  PRIMARY KEY (player_id, item_id)
);

-- 6. Commercial Properties
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  owner_id TEXT UNIQUE REFERENCES profiles(id),
  rented_at BIGINT
);

-- 7. Businesses (Quán cà phê / Cửa hàng)
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id TEXT NOT NULL REFERENCES profiles(id),
  property_id TEXT NOT NULL UNIQUE REFERENCES properties(id),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1 CHECK(level BETWEEN 1 AND 5),
  equipped BOOLEAN NOT NULL DEFAULT false,
  is_open BOOLEAN NOT NULL DEFAULT false,
  price INTEGER NOT NULL DEFAULT 500 CHECK(price BETWEEN 100 AND 5000),
  revenue BIGINT NOT NULL DEFAULT 0 CHECK(revenue >= 0),
  cogs BIGINT NOT NULL DEFAULT 0 CHECK(cogs >= 0),
  rent BIGINT NOT NULL DEFAULT 0 CHECK(rent >= 0),
  salary BIGINT NOT NULL DEFAULT 0 CHECK(salary >= 0),
  utility BIGINT NOT NULL DEFAULT 0 CHECK(utility >= 0),
  reputation REAL NOT NULL DEFAULT 1,
  customers INTEGER NOT NULL DEFAULT 0,
  last_charged_day INTEGER NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_business_owner ON businesses(owner_id);

-- 8. Business Inventory
CREATE TABLE IF NOT EXISTS business_inventory (
  business_id TEXT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  servings INTEGER NOT NULL DEFAULT 0 CHECK(servings >= 0),
  cost BIGINT NOT NULL DEFAULT 0 CHECK(cost >= 0)
);

-- 9. P2P Marketplace Listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  seller_id TEXT NOT NULL REFERENCES profiles(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL CHECK(quantity >= 0),
  price INTEGER NOT NULL CHECK(price > 0),
  cost BIGINT NOT NULL DEFAULT 0 CHECK(cost >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'sold', 'cancelled')),
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_marketplace_active ON marketplace_listings(status, created_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON marketplace_listings(seller_id);

-- 10. Marketplace Transactions Log
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  listing_id TEXT NOT NULL REFERENCES marketplace_listings(id),
  buyer_id TEXT NOT NULL REFERENCES profiles(id),
  seller_id TEXT NOT NULL REFERENCES profiles(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  amount BIGINT NOT NULL CHECK(amount > 0),
  created_at BIGINT NOT NULL
);

-- 11. Financial Ledger (Sổ cái thu chi)
CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player_id TEXT NOT NULL REFERENCES profiles(id),
  business_id TEXT REFERENCES businesses(id),
  label TEXT NOT NULL,
  amount BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_player_time ON ledger(player_id, created_at DESC);

-- 12. Idempotent Action Requests
CREATE TABLE IF NOT EXISTS requests (
  player_id TEXT NOT NULL REFERENCES profiles(id),
  request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (player_id, request_id)
);

-- 13. World State & Events
CREATE TABLE IF NOT EXISTS world_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  minutes REAL NOT NULL,
  weather TEXT NOT NULL,
  event TEXT,
  economy TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS world_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  starts_at REAL NOT NULL,
  ends_at REAL NOT NULL,
  data TEXT NOT NULL
);

-- 14. Bank Term Savings & Compound Interest (Sổ tiết kiệm ngân hàng)
CREATE TABLE IF NOT EXISTS bank_savings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  principal BIGINT NOT NULL CHECK(principal > 0),
  term_months INTEGER NOT NULL CHECK(term_months IN (1, 3, 6, 9, 12)),
  interest_rate REAL NOT NULL,
  is_compound BOOLEAN NOT NULL DEFAULT true,
  created_at BIGINT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'withdrawn')),
  withdrawn_at BIGINT,
  interest_paid BIGINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_bank_savings_player ON bank_savings(player_id, status);

-- 15. Player Fashion Equipment (Tủ đồ & Thời trang nhân vật)
CREATE TABLE IF NOT EXISTS player_fashion (
  player_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  umbrella BOOLEAN NOT NULL DEFAULT false,
  raincoat BOOLEAN NOT NULL DEFAULT false,
  cap BOOLEAN NOT NULL DEFAULT false
);

-- ============================================================================
-- SEED DATA INITIALIZATION
-- ============================================================================

INSERT INTO items(id, name, base_price) VALUES
  ('beans', 'Hạt cà phê', 1000),
  ('milk', 'Sữa tươi', 400),
  ('tea', 'Trà lá', 700),
  ('umbrella', 'Dù đi mưa Pastel', 2500),
  ('raincoat', 'Áo mưa Hàn Quốc', 3500),
  ('cap', 'Nón lưỡi trai Mầm Xanh', 1500)
ON CONFLICT (id) DO NOTHING;

INSERT INTO properties(id) VALUES
  ('lot-1'),
  ('lot-2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO world_state(id, minutes, weather, economy)
VALUES (1, 480, 'sunny', '{}')
ON CONFLICT (id) DO NOTHING;
