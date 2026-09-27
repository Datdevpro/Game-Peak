CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS profiles(
 id TEXT PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(username) BETWEEN 3 AND 20),
 password_hash TEXT NOT NULL, avatar INTEGER NOT NULL DEFAULT 0 CHECK(avatar BETWEEN 0 AND 23),
 x REAL NOT NULL DEFAULT 960, y REAL NOT NULL DEFAULT 760, apartment INTEGER NOT NULL DEFAULT 0 CHECK(apartment IN (0,1)),
 commerce INTEGER NOT NULL DEFAULT 0 CHECK(commerce >= 0), created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS player_wallets(
 player_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
 cash INTEGER NOT NULL CHECK(cash >= 0 AND cash <= 9000000000000),
 bank INTEGER NOT NULL DEFAULT 0 CHECK(bank >= 0 AND bank <= 9000000000000)
);
CREATE TABLE IF NOT EXISTS sessions(
 token_hash TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_player ON sessions(player_id);
CREATE TABLE IF NOT EXISTS items(id TEXT PRIMARY KEY, name TEXT NOT NULL, base_price INTEGER NOT NULL CHECK(base_price > 0));
CREATE TABLE IF NOT EXISTS inventory_items(
 player_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, item_id TEXT NOT NULL REFERENCES items(id),
 quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0), cost INTEGER NOT NULL DEFAULT 0 CHECK(cost >= 0),
 PRIMARY KEY(player_id,item_id)
);
CREATE TABLE IF NOT EXISTS properties(id TEXT PRIMARY KEY, owner_id TEXT UNIQUE REFERENCES profiles(id), rented_at INTEGER);
CREATE TABLE IF NOT EXISTS businesses(
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES profiles(id), property_id TEXT NOT NULL UNIQUE REFERENCES properties(id),
 type TEXT NOT NULL, name TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 1 CHECK(level BETWEEN 1 AND 5),
 equipped INTEGER NOT NULL DEFAULT 0 CHECK(equipped IN (0,1)), is_open INTEGER NOT NULL DEFAULT 0 CHECK(is_open IN (0,1)),
 price INTEGER NOT NULL DEFAULT 500 CHECK(price BETWEEN 100 AND 5000),
 revenue INTEGER NOT NULL DEFAULT 0 CHECK(revenue >= 0), cogs INTEGER NOT NULL DEFAULT 0 CHECK(cogs >= 0),
 rent INTEGER NOT NULL DEFAULT 0 CHECK(rent >= 0), salary INTEGER NOT NULL DEFAULT 0 CHECK(salary >= 0), utility INTEGER NOT NULL DEFAULT 0 CHECK(utility >= 0),
 reputation REAL NOT NULL DEFAULT 1, customers INTEGER NOT NULL DEFAULT 0,
 last_charged_day INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS business_owner ON businesses(owner_id);
CREATE TABLE IF NOT EXISTS business_inventory(
 business_id TEXT PRIMARY KEY REFERENCES businesses(id), servings INTEGER NOT NULL DEFAULT 0 CHECK(servings >= 0),
 cost INTEGER NOT NULL DEFAULT 0 CHECK(cost >= 0)
);
CREATE TABLE IF NOT EXISTS marketplace_listings(
 id TEXT PRIMARY KEY, seller_id TEXT NOT NULL REFERENCES profiles(id), item_id TEXT NOT NULL REFERENCES items(id),
 quantity INTEGER NOT NULL CHECK(quantity >= 0), price INTEGER NOT NULL CHECK(price > 0), cost INTEGER NOT NULL CHECK(cost >= 0),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','sold','cancelled')), created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS marketplace_active ON marketplace_listings(status,created_at);
CREATE INDEX IF NOT EXISTS marketplace_seller ON marketplace_listings(seller_id);
CREATE TABLE IF NOT EXISTS marketplace_transactions(
 id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES marketplace_listings(id), buyer_id TEXT NOT NULL REFERENCES profiles(id),
 seller_id TEXT NOT NULL REFERENCES profiles(id), item_id TEXT NOT NULL REFERENCES items(id), quantity INTEGER NOT NULL CHECK(quantity > 0),
 amount INTEGER NOT NULL CHECK(amount > 0), created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ledger(
 id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES profiles(id), business_id TEXT REFERENCES businesses(id),
 label TEXT NOT NULL, amount INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_player_time ON ledger(player_id,created_at DESC);
CREATE TABLE IF NOT EXISTS requests(
 player_id TEXT NOT NULL REFERENCES profiles(id), request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, result TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(player_id,request_id)
);
CREATE TABLE IF NOT EXISTS world_state(id INTEGER PRIMARY KEY CHECK(id=1), minutes REAL NOT NULL, weather TEXT NOT NULL, event TEXT, economy TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS world_events(id TEXT PRIMARY KEY, name TEXT NOT NULL, starts_at REAL NOT NULL, ends_at REAL NOT NULL, data TEXT NOT NULL);
