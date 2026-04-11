import pg from "pg";
import crypto from "node:crypto";
import type {
  User,
  Holding,
  Wallet,
  Upload,
  ParsedHolding,
  IncomeStream,
  Transaction,
  Property,
  PropertyMortgage,
  PropertyCost,
  PropertyWithDetails,
  IlliquidAsset,
  IlliquidSubtype,
} from "../types/index.js";
import { illiquidAssetNativeValue } from "../types/index.js";

// Return DATE columns (oid 1082) as plain YYYY-MM-DD strings instead of JS Date objects
// to avoid timezone shifts for transaction dates.
pg.types.setTypeParser(1082, (val: string) => val);

let pool: pg.Pool;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

// Auto-create tables on startup
export async function initDb(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      address TEXT NOT NULL,
      chain TEXT DEFAULT 'ethereum',
      label TEXT,
      added_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS holdings (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL,
      source_id TEXT,
      name TEXT NOT NULL,
      ticker TEXT,
      asset_type TEXT,
      quantity REAL,
      value_usd REAL,
      currency TEXT DEFAULT 'USD',
      figi TEXT,
      composite_figi TEXT,
      share_class_figi TEXT,
      security_type TEXT,
      market_sector TEXT,
      exch_code TEXT,
      last_updated TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT,
      file_type TEXT,
      file_data BYTEA,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      status TEXT DEFAULT 'processed'
    );

    -- Add file_data column if it doesn't exist (migration for existing DBs)
    DO $$ BEGIN
      ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_data BYTEA;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;

    -- Add FIGI columns if they don't exist (migration for existing DBs)
    ALTER TABLE holdings ADD COLUMN IF NOT EXISTS figi TEXT;
    ALTER TABLE holdings ADD COLUMN IF NOT EXISTS composite_figi TEXT;
    ALTER TABLE holdings ADD COLUMN IF NOT EXISTS share_class_figi TEXT;
    ALTER TABLE holdings ADD COLUMN IF NOT EXISTS security_type TEXT;
    ALTER TABLE holdings ADD COLUMN IF NOT EXISTS market_sector TEXT;
    ALTER TABLE holdings ADD COLUMN IF NOT EXISTS exch_code TEXT;
    ALTER TABLE holdings ADD COLUMN IF NOT EXISTS value_local REAL;
    ALTER TABLE holdings ADD COLUMN IF NOT EXISTS isin TEXT;

    CREATE TABLE IF NOT EXISTS companies (
      symbol TEXT PRIMARY KEY,
      company_name TEXT,
      sector TEXT,
      industry TEXT,
      country TEXT,
      description TEXT,
      ceo TEXT,
      website TEXT,
      exchange TEXT,
      currency TEXT,
      market_cap REAL,
      image TEXT,
      ipo_date TEXT,
      price_range TEXT,
      last_fetched TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE companies ADD COLUMN IF NOT EXISTS price REAL;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS price_fetched_at TIMESTAMP;

    CREATE TABLE IF NOT EXISTS income_streams (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'CHF',
      frequency TEXT NOT NULL,
      day_of_month INTEGER,
      start_date DATE NOT NULL,
      end_date DATE,
      is_active BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL,
      source_id TEXT,
      date DATE NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'CHF',
      amount_usd REAL,
      description TEXT,
      merchant TEXT,
      category TEXT,
      dedup_hash TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant TEXT;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS dedup_hash TEXT;

    -- Align cash flow defaults to CHF for Swiss-native data entry (2026-04-11)
    ALTER TABLE income_streams ALTER COLUMN currency SET DEFAULT 'CHF';
    ALTER TABLE transactions ALTER COLUMN currency SET DEFAULT 'CHF';

    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_stream ON transactions(source_type, source_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedup ON transactions(user_id, dedup_hash) WHERE dedup_hash IS NOT NULL;

    -- Learned merchant -> category mappings (cache)
    CREATE TABLE IF NOT EXISTS merchant_categories (
      id SERIAL PRIMARY KEY,
      merchant_key TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'rule',  -- 'rule' | 'ai' | 'user'
      created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE uploads ADD COLUMN IF NOT EXISTS upload_kind TEXT;

    -- ============================================================
    -- Real Estate
    -- ============================================================
    CREATE TABLE IF NOT EXISTS properties (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      property_type TEXT NOT NULL DEFAULT 'apartment',
      address TEXT,
      purchase_date DATE,
      purchase_price REAL,
      current_value REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'CHF',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS property_mortgages (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      lender TEXT,
      original_amount REAL NOT NULL,
      current_balance REAL NOT NULL,
      interest_rate REAL NOT NULL,  -- annual %, e.g. 1.85 for 1.85%
      start_date DATE,
      end_date DATE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS property_costs (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      category TEXT NOT NULL,  -- 'maintenance' | 'management' | 'other'
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'CHF',
      frequency TEXT NOT NULL,  -- 'monthly' | 'quarterly' | 'yearly'
      day_of_month INTEGER,
      start_date DATE,
      end_date DATE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_mortgages_property ON property_mortgages(property_id);
    CREATE INDEX IF NOT EXISTS idx_costs_property ON property_costs(property_id);

    -- Link rental income streams to a property
    ALTER TABLE income_streams ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL;

    -- ============================================================
    -- Illiquid Assets
    -- ============================================================
    -- One table covers all four subtypes: private_equity, pension,
    -- unvested_equity, startup. Subtype-specific fields are nullable.
    -- Wealth contribution is resolved at sync time based on subtype.
    CREATE TABLE IF NOT EXISTS illiquid_assets (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subtype TEXT NOT NULL,  -- 'private_equity' | 'pension' | 'unvested_equity' | 'startup'
      name TEXT NOT NULL,
      current_value REAL,      -- native currency; for unvested_equity this is unused (computed from end_value)
      currency TEXT NOT NULL DEFAULT 'CHF',
      notes TEXT,

      -- Private Equity
      committed_capital REAL,
      called_capital REAL,

      -- Unvested Equity
      employer TEXT,
      units REAL,
      vesting_years INTEGER,
      grant_start_date DATE,
      end_value REAL,

      -- Startup
      amount_invested REAL,
      investment_date DATE,

      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_illiquid_user ON illiquid_assets(user_id);

    -- Idempotent: in case the table was created earlier with the old USD default
    ALTER TABLE illiquid_assets ALTER COLUMN currency SET DEFAULT 'CHF';

    -- ============================================================
    -- Wealth Snapshots
    -- ============================================================
    -- Historical record of net worth at each meaningful data change.
    -- Written on upload, property/illiquid/wallet CRUD, price refresh.
    -- v1 collects data silently — no UI yet.
    CREATE TABLE IF NOT EXISTS wealth_snapshots (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      taken_at TIMESTAMP NOT NULL DEFAULT NOW(),
      net_worth_usd REAL NOT NULL,
      liquid_usd REAL NOT NULL,
      illiquid_usd REAL NOT NULL,
      real_estate_usd REAL NOT NULL,
      crypto_usd REAL NOT NULL,
      liabilities_usd REAL NOT NULL,
      trigger TEXT  -- short label for the event: 'upload', 'property', 'illiquid', 'wallet', 'price_refresh'
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_user_taken ON wealth_snapshots(user_id, taken_at DESC);
  `);
}

// Users
export async function getUserById(id: string): Promise<User | undefined> {
  const { rows } = await getPool().query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] as User | undefined;
}

export async function createOrUpdateUser(id: string, email: string | null, name: string | null): Promise<User> {
  const { rows } = await getPool().query(
    `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)
     ON CONFLICT(id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
     RETURNING *`,
    [id, email, name]
  );
  return rows[0] as User;
}

// Holdings
export async function getHoldingsByUser(userId: string): Promise<Holding[]> {
  const { rows } = await getPool().query(
    "SELECT * FROM holdings WHERE user_id = $1 ORDER BY value_usd DESC",
    [userId]
  );
  return rows as Holding[];
}

// Wallets
export async function getWalletsByUser(userId: string): Promise<Wallet[]> {
  const { rows } = await getPool().query(
    "SELECT * FROM wallets WHERE user_id = $1 ORDER BY added_at DESC",
    [userId]
  );
  return rows as Wallet[];
}

// Uploads
export async function createUpload(
  userId: string,
  filename: string,
  fileType: string,
  fileData?: Buffer,
  uploadKind: "wealth" | "transactions" = "wealth"
): Promise<Upload> {
  const { rows } = await getPool().query(
    "INSERT INTO uploads (user_id, filename, file_type, file_data, status, upload_kind) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, filename, file_type, uploaded_at, status, upload_kind",
    [userId, filename, fileType, fileData ?? null, "processing", uploadKind]
  );
  return rows[0] as Upload;
}

export async function getUploadFileData(id: number, userId: string): Promise<{ filename: string; file_type: string; file_data: Buffer } | undefined> {
  const { rows } = await getPool().query(
    "SELECT filename, file_type, file_data FROM uploads WHERE id = $1 AND user_id = $2 AND file_data IS NOT NULL",
    [id, userId]
  );
  return rows[0] as { filename: string; file_type: string; file_data: Buffer } | undefined;
}

export async function getUploadById(id: number): Promise<Upload | undefined> {
  const { rows } = await getPool().query("SELECT * FROM uploads WHERE id = $1", [id]);
  return rows[0] as Upload | undefined;
}

export async function getUploadsByUser(userId: string): Promise<Upload[]> {
  const { rows } = await getPool().query(
    "SELECT * FROM uploads WHERE user_id = $1 ORDER BY uploaded_at DESC",
    [userId]
  );
  return rows as Upload[];
}

export async function updateUploadStatus(id: number, status: string): Promise<void> {
  await getPool().query("UPDATE uploads SET status = $1 WHERE id = $2", [status, id]);
}

export async function deleteUpload(id: number, userId: string): Promise<boolean> {
  await getPool().query("DELETE FROM holdings WHERE source_type = 'upload' AND source_id = $1", [String(id)]);
  const { rowCount } = await getPool().query("DELETE FROM uploads WHERE id = $1 AND user_id = $2", [id, userId]);
  return (rowCount ?? 0) > 0;
}

// Holdings creation
export async function createHoldingFromUpload(userId: string, uploadId: number, holding: ParsedHolding): Promise<Holding> {
  return createHoldingRecord(userId, "upload", String(uploadId), holding);
}

export async function createHoldingFromWallet(userId: string, walletId: number, holding: ParsedHolding): Promise<Holding> {
  return createHoldingRecord(userId, "wallet", String(walletId), holding);
}

async function createHoldingRecord(userId: string, sourceType: string, sourceId: string, holding: ParsedHolding): Promise<Holding> {
  const { rows } = await getPool().query(
    `INSERT INTO holdings (user_id, source_type, source_id, name, ticker, isin, asset_type, quantity, value_usd, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [userId, sourceType, sourceId, holding.name, holding.ticker, holding.isin, holding.asset_type, holding.quantity, holding.value_usd, holding.currency]
  );
  return rows[0] as Holding;
}

export async function getHoldingsByUpload(uploadId: number): Promise<Holding[]> {
  const { rows } = await getPool().query(
    "SELECT * FROM holdings WHERE source_type = 'upload' AND source_id = $1",
    [String(uploadId)]
  );
  return rows as Holding[];
}

// Wallets CRUD
export async function createWallet(userId: string, address: string, label: string | null = null): Promise<Wallet> {
  const { rows } = await getPool().query(
    "INSERT INTO wallets (user_id, address, chain, label) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId, address.toLowerCase(), "ethereum", label]
  );
  return rows[0] as Wallet;
}

export async function getWalletById(id: number): Promise<Wallet | undefined> {
  const { rows } = await getPool().query("SELECT * FROM wallets WHERE id = $1", [id]);
  return rows[0] as Wallet | undefined;
}

export async function deleteWallet(id: number, userId: string): Promise<boolean> {
  await getPool().query("DELETE FROM holdings WHERE source_type = 'wallet' AND source_id = $1", [String(id)]);
  const { rowCount } = await getPool().query("DELETE FROM wallets WHERE id = $1 AND user_id = $2", [id, userId]);
  return (rowCount ?? 0) > 0;
}

export async function deleteHoldingsByWallet(walletId: number): Promise<void> {
  await getPool().query("DELETE FROM holdings WHERE source_type = 'wallet' AND source_id = $1", [String(walletId)]);
}

export async function getHoldingsByWallet(walletId: number): Promise<Holding[]> {
  const { rows } = await getPool().query(
    "SELECT * FROM holdings WHERE source_type = 'wallet' AND source_id = $1",
    [String(walletId)]
  );
  return rows as Holding[];
}

export async function updateHoldingFigi(
  holdingId: number,
  figi: { figi: string | null; compositeFIGI: string | null; shareClassFIGI: string | null; securityType: string | null; marketSector: string | null; exchCode: string | null; ticker?: string | null }
): Promise<void> {
  if (figi.ticker) {
    await getPool().query(
      `UPDATE holdings SET figi = $1, composite_figi = $2, share_class_figi = $3, security_type = $4, market_sector = $5, exch_code = $6, ticker = $7 WHERE id = $8`,
      [figi.figi, figi.compositeFIGI, figi.shareClassFIGI, figi.securityType, figi.marketSector, figi.exchCode, figi.ticker, holdingId]
    );
  } else {
    await getPool().query(
      `UPDATE holdings SET figi = $1, composite_figi = $2, share_class_figi = $3, security_type = $4, market_sector = $5, exch_code = $6 WHERE id = $7`,
      [figi.figi, figi.compositeFIGI, figi.shareClassFIGI, figi.securityType, figi.marketSector, figi.exchCode, holdingId]
    );
  }
}

export async function updateHoldingCurrency(holdingId: number, currency: string): Promise<void> {
  await getPool().query("UPDATE holdings SET currency = $1 WHERE id = $2", [currency, holdingId]);
}

export async function updateHoldingValue(holdingId: number, valueUsd: number, valueLocal?: number): Promise<void> {
  if (valueLocal !== undefined) {
    await getPool().query(
      "UPDATE holdings SET value_usd = $1, value_local = $2, last_updated = NOW() WHERE id = $3",
      [valueUsd, valueLocal, holdingId]
    );
  } else {
    await getPool().query(
      "UPDATE holdings SET value_usd = $1, last_updated = NOW() WHERE id = $2",
      [valueUsd, holdingId]
    );
  }
}

export async function getStockHoldingsByUser(userId: string): Promise<Holding[]> {
  const { rows } = await getPool().query(
    "SELECT * FROM holdings WHERE user_id = $1 AND ticker IS NOT NULL AND LOWER(asset_type) = 'stocks' ORDER BY value_usd DESC",
    [userId]
  );
  return rows as Holding[];
}

// Account management
export async function deleteUserAccount(userId: string): Promise<void> {
  // Delete all sessions for this user (covers other devices)
  await getPool().query("DELETE FROM session WHERE sess->>'userId' = $1", [userId]);
  // Delete user — cascades to holdings, uploads, wallets via ON DELETE CASCADE
  await getPool().query("DELETE FROM users WHERE id = $1", [userId]);
}

export async function deleteAllHoldings(userId: string): Promise<number> {
  const { rowCount } = await getPool().query("DELETE FROM holdings WHERE user_id = $1", [userId]);
  return rowCount ?? 0;
}

export async function exportUserData(userId: string) {
  const [userResult, holdingsResult, uploadsResult, walletsResult] = await Promise.all([
    getPool().query("SELECT id, email, name, created_at FROM users WHERE id = $1", [userId]),
    getPool().query(
      "SELECT id, name, ticker, isin, asset_type, quantity, value_usd, value_local, currency, exch_code, source_type, last_updated FROM holdings WHERE user_id = $1 ORDER BY value_usd DESC",
      [userId]
    ),
    getPool().query(
      "SELECT id, filename, file_type, uploaded_at, status FROM uploads WHERE user_id = $1 ORDER BY uploaded_at DESC",
      [userId]
    ),
    getPool().query(
      "SELECT id, address, chain, label, added_at FROM wallets WHERE user_id = $1 ORDER BY added_at DESC",
      [userId]
    ),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user: userResult.rows[0] ?? null,
    holdings: holdingsResult.rows,
    uploads: uploadsResult.rows,
    wallets: walletsResult.rows,
  };
}

// Company profile cache
export interface CachedCompany {
  symbol: string;
  company_name: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  description: string | null;
  ceo: string | null;
  website: string | null;
  exchange: string | null;
  currency: string | null;
  market_cap: number | null;
  image: string | null;
  ipo_date: string | null;
  price_range: string | null;
  last_fetched: string;
}

export async function getCachedCompany(symbol: string): Promise<CachedCompany | undefined> {
  const { rows } = await getPool().query("SELECT * FROM companies WHERE symbol = $1", [symbol.toUpperCase()]);
  return rows[0] as CachedCompany | undefined;
}

export async function upsertCompany(company: Omit<CachedCompany, "last_fetched">): Promise<void> {
  await getPool().query(
    `INSERT INTO companies (symbol, company_name, sector, industry, country, description, ceo, website, exchange, currency, market_cap, image, ipo_date, price_range, last_fetched)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
     ON CONFLICT(symbol) DO UPDATE SET
       company_name = EXCLUDED.company_name, sector = EXCLUDED.sector, industry = EXCLUDED.industry,
       country = EXCLUDED.country, description = EXCLUDED.description, ceo = EXCLUDED.ceo,
       website = EXCLUDED.website, exchange = EXCLUDED.exchange, currency = EXCLUDED.currency,
       market_cap = EXCLUDED.market_cap, image = EXCLUDED.image, ipo_date = EXCLUDED.ipo_date,
       price_range = EXCLUDED.price_range, last_fetched = NOW()`,
    [
      company.symbol.toUpperCase(), company.company_name, company.sector, company.industry,
      company.country, company.description, company.ceo, company.website, company.exchange,
      company.currency, company.market_cap, company.image, company.ipo_date, company.price_range,
    ]
  );
}

export interface CachedPrice {
  price: number;
  currency: string;
  fetchedAt: Date;
}

export async function getCachedPrice(symbol: string): Promise<CachedPrice | undefined> {
  const { rows } = await getPool().query(
    "SELECT price, currency, price_fetched_at FROM companies WHERE symbol = $1 AND price IS NOT NULL AND price_fetched_at IS NOT NULL",
    [symbol.toUpperCase()]
  );
  if (rows.length === 0) return undefined;
  const row = rows[0] as { price: number; currency: string; price_fetched_at: Date };
  return { price: row.price, currency: row.currency ?? "USD", fetchedAt: row.price_fetched_at };
}

export async function upsertCachedPrice(symbol: string, price: number, currency: string): Promise<void> {
  await getPool().query(
    `INSERT INTO companies (symbol, price, currency, price_fetched_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT(symbol) DO UPDATE SET price = $2, currency = $3, price_fetched_at = NOW()`,
    [symbol.toUpperCase(), price, currency]
  );
}

// ============================================================
// Income streams
// ============================================================

export async function getIncomeStreamsByUser(userId: string): Promise<IncomeStream[]> {
  const { rows } = await getPool().query(
    "SELECT * FROM income_streams WHERE user_id = $1 ORDER BY is_active DESC, created_at DESC",
    [userId]
  );
  return rows as IncomeStream[];
}

export async function createIncomeStream(
  userId: string,
  stream: Omit<IncomeStream, "id" | "user_id" | "created_at" | "updated_at">
): Promise<IncomeStream> {
  const { rows } = await getPool().query(
    `INSERT INTO income_streams
       (user_id, name, type, amount, currency, frequency, day_of_month, start_date, end_date, is_active, notes, property_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      userId,
      stream.name,
      stream.type,
      stream.amount,
      stream.currency,
      stream.frequency,
      stream.day_of_month,
      stream.start_date,
      stream.end_date,
      stream.is_active,
      stream.notes,
      stream.property_id,
    ]
  );
  return rows[0] as IncomeStream;
}

export async function updateIncomeStream(
  id: number,
  userId: string,
  stream: Partial<Omit<IncomeStream, "id" | "user_id" | "created_at">>
): Promise<IncomeStream | undefined> {
  const fields = Object.keys(stream);
  if (fields.length === 0) return undefined;
  const setClause = fields.map((k, i) => `${k} = $${i + 3}`).join(", ");
  const values = fields.map((k) => (stream as Record<string, unknown>)[k]);
  const { rows } = await getPool().query(
    `UPDATE income_streams SET ${setClause}, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, userId, ...values]
  );
  return rows[0] as IncomeStream | undefined;
}

export async function deleteIncomeStream(id: number, userId: string): Promise<boolean> {
  // Delete associated generated transactions
  await getPool().query(
    "DELETE FROM transactions WHERE source_type = 'stream' AND source_id = $1 AND user_id = $2",
    [String(id), userId]
  );
  const { rowCount } = await getPool().query(
    "DELETE FROM income_streams WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}

// ============================================================
// Transactions
// ============================================================

export async function getTransactionsByUser(
  userId: string,
  options: { limit?: number; sign?: "income" | "expense" } = {}
): Promise<Transaction[]> {
  const conditions = ["user_id = $1"];
  const params: (string | number)[] = [userId];
  if (options.sign === "income") conditions.push("amount > 0");
  if (options.sign === "expense") conditions.push("amount < 0");
  const limit = options.limit ?? 100;
  params.push(limit);

  const { rows } = await getPool().query(
    `SELECT * FROM transactions WHERE ${conditions.join(" AND ")} ORDER BY date DESC, id DESC LIMIT $${params.length}`,
    params
  );
  return rows as Transaction[];
}

export function computeDedupHash(tx: {
  date: string;
  amount: number;
  currency: string;
  description: string | null;
}): string {
  const key = `${tx.date}|${tx.amount.toFixed(2)}|${tx.currency.toUpperCase()}|${(tx.description ?? "").trim().toLowerCase()}`;
  return crypto.createHash("sha1").update(key).digest("hex");
}

// Insert a transaction. Returns the created row, or null if a duplicate exists.
export async function createTransaction(
  userId: string,
  tx: Omit<Transaction, "id" | "user_id" | "created_at" | "dedup_hash"> & { dedup_hash?: string | null }
): Promise<Transaction | null> {
  const dedupHash =
    tx.dedup_hash ??
    computeDedupHash({
      date: tx.date,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
    });

  const { rows } = await getPool().query(
    `INSERT INTO transactions (user_id, source_type, source_id, date, amount, currency, amount_usd, description, merchant, category, dedup_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (user_id, dedup_hash) WHERE dedup_hash IS NOT NULL DO NOTHING
     RETURNING *`,
    [
      userId,
      tx.source_type,
      tx.source_id,
      tx.date,
      tx.amount,
      tx.currency,
      tx.amount_usd,
      tx.description,
      tx.merchant,
      tx.category,
      dedupHash,
    ]
  );
  return (rows[0] as Transaction | undefined) ?? null;
}

export async function updateTransactionCategory(
  id: number,
  userId: string,
  category: string
): Promise<Transaction | null> {
  const { rows } = await getPool().query(
    "UPDATE transactions SET category = $3 WHERE id = $1 AND user_id = $2 RETURNING *",
    [id, userId, category]
  );
  return (rows[0] as Transaction | undefined) ?? null;
}

export async function deleteTransaction(id: number, userId: string): Promise<boolean> {
  const { rowCount } = await getPool().query(
    "DELETE FROM transactions WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}

// merchant category cache
export async function getMerchantCategory(merchantKey: string): Promise<string | null> {
  const { rows } = await getPool().query(
    "SELECT category FROM merchant_categories WHERE merchant_key = $1",
    [merchantKey]
  );
  return (rows[0] as { category: string } | undefined)?.category ?? null;
}

export async function upsertMerchantCategory(
  merchantKey: string,
  category: string,
  source: "rule" | "ai" | "user" = "rule"
): Promise<void> {
  await getPool().query(
    `INSERT INTO merchant_categories (merchant_key, category, source)
     VALUES ($1, $2, $3)
     ON CONFLICT(merchant_key) DO UPDATE SET category = EXCLUDED.category, source = EXCLUDED.source`,
    [merchantKey, category, source]
  );
}

export async function deleteTransactionsByStream(userId: string, streamId: number): Promise<void> {
  await getPool().query(
    "DELETE FROM transactions WHERE user_id = $1 AND source_type = 'stream' AND source_id = $2",
    [userId, String(streamId)]
  );
}

// Generate transactions for a stream from its start_date up to today.
// Returns the list of dates (YYYY-MM-DD) that events were created for.
export function computeStreamEventDates(stream: IncomeStream, until: Date = new Date()): string[] {
  const start = new Date(stream.start_date);
  const end = stream.end_date ? new Date(stream.end_date) : until;
  const stopAt = end < until ? end : until;

  const dates: string[] = [];

  if (stream.frequency === "irregular") return dates;

  if (stream.frequency === "monthly") {
    const day = stream.day_of_month ?? start.getDate();
    const cursor = new Date(start.getFullYear(), start.getMonth(), day);
    // If start date is after the chosen day in its month, start next month
    if (cursor < start) cursor.setMonth(cursor.getMonth() + 1);
    while (cursor <= stopAt) {
      dates.push(toDateString(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return dates;
  }

  if (stream.frequency === "quarterly") {
    const day = stream.day_of_month ?? start.getDate();
    const cursor = new Date(start.getFullYear(), start.getMonth(), day);
    if (cursor < start) cursor.setMonth(cursor.getMonth() + 3);
    while (cursor <= stopAt) {
      dates.push(toDateString(cursor));
      cursor.setMonth(cursor.getMonth() + 3);
    }
    return dates;
  }

  if (stream.frequency === "yearly") {
    const cursor = new Date(start);
    while (cursor <= stopAt) {
      dates.push(toDateString(cursor));
      cursor.setFullYear(cursor.getFullYear() + 1);
    }
    return dates;
  }

  return dates;
}

function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function generateStreamTransactions(userId: string, stream: IncomeStream): Promise<number> {
  const dates = computeStreamEventDates(stream);
  if (dates.length === 0) return 0;

  const category = stream.type.charAt(0).toUpperCase() + stream.type.slice(1);
  let created = 0;
  for (const date of dates) {
    const result = await createTransaction(userId, {
      source_type: "stream",
      source_id: String(stream.id),
      date,
      amount: stream.amount,
      currency: stream.currency,
      amount_usd: null, // converted client-side or later
      description: stream.name,
      merchant: null,
      category,
    });
    if (result) created++;
  }
  return created;
}

// ============================================================
// Real Estate
// ============================================================

export async function getPropertiesByUser(userId: string): Promise<Property[]> {
  const { rows } = await getPool().query(
    "SELECT * FROM properties WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return rows as Property[];
}

export async function getPropertyById(id: number, userId: string): Promise<Property | undefined> {
  const { rows } = await getPool().query(
    "SELECT * FROM properties WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return rows[0] as Property | undefined;
}

export async function createProperty(
  userId: string,
  data: Omit<Property, "id" | "user_id" | "created_at" | "updated_at">
): Promise<Property> {
  const { rows } = await getPool().query(
    `INSERT INTO properties
       (user_id, name, property_type, address, purchase_date, purchase_price, current_value, currency, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      data.name,
      data.property_type,
      data.address,
      data.purchase_date,
      data.purchase_price,
      data.current_value,
      data.currency,
      data.notes,
    ]
  );
  return rows[0] as Property;
}

export async function updateProperty(
  id: number,
  userId: string,
  updates: Partial<Omit<Property, "id" | "user_id" | "created_at">>
): Promise<Property | undefined> {
  const fields = Object.keys(updates);
  if (fields.length === 0) return undefined;
  const setClause = fields.map((k, i) => `${k} = $${i + 3}`).join(", ");
  const values = fields.map((k) => (updates as Record<string, unknown>)[k]);
  const { rows } = await getPool().query(
    `UPDATE properties SET ${setClause}, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, userId, ...values]
  );
  return rows[0] as Property | undefined;
}

export async function deleteProperty(id: number, userId: string): Promise<boolean> {
  const { rowCount } = await getPool().query(
    "DELETE FROM properties WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}

// Mortgages

export async function getMortgagesByProperty(propertyId: number): Promise<PropertyMortgage[]> {
  const { rows } = await getPool().query(
    "SELECT * FROM property_mortgages WHERE property_id = $1 ORDER BY is_active DESC, created_at ASC",
    [propertyId]
  );
  return rows as PropertyMortgage[];
}

export async function createMortgage(
  propertyId: number,
  data: Omit<PropertyMortgage, "id" | "property_id" | "created_at" | "updated_at">
): Promise<PropertyMortgage> {
  const { rows } = await getPool().query(
    `INSERT INTO property_mortgages
       (property_id, lender, original_amount, current_balance, interest_rate, start_date, end_date, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      propertyId,
      data.lender,
      data.original_amount,
      data.current_balance,
      data.interest_rate,
      data.start_date,
      data.end_date,
      data.is_active,
    ]
  );
  return rows[0] as PropertyMortgage;
}

export async function updateMortgage(
  id: number,
  updates: Partial<Omit<PropertyMortgage, "id" | "property_id" | "created_at">>
): Promise<PropertyMortgage | undefined> {
  const fields = Object.keys(updates);
  if (fields.length === 0) return undefined;
  const setClause = fields.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = fields.map((k) => (updates as Record<string, unknown>)[k]);
  const { rows } = await getPool().query(
    `UPDATE property_mortgages SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0] as PropertyMortgage | undefined;
}

export async function deleteMortgage(id: number): Promise<boolean> {
  const { rowCount } = await getPool().query("DELETE FROM property_mortgages WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

// Costs

export async function getCostsByProperty(propertyId: number): Promise<PropertyCost[]> {
  const { rows } = await getPool().query(
    "SELECT * FROM property_costs WHERE property_id = $1 ORDER BY is_active DESC, created_at ASC",
    [propertyId]
  );
  return rows as PropertyCost[];
}

export async function createPropertyCost(
  propertyId: number,
  data: Omit<PropertyCost, "id" | "property_id" | "created_at" | "updated_at">
): Promise<PropertyCost> {
  const { rows } = await getPool().query(
    `INSERT INTO property_costs
       (property_id, label, category, amount, currency, frequency, day_of_month, start_date, end_date, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      propertyId,
      data.label,
      data.category,
      data.amount,
      data.currency,
      data.frequency,
      data.day_of_month,
      data.start_date,
      data.end_date,
      data.is_active,
    ]
  );
  return rows[0] as PropertyCost;
}

export async function updatePropertyCost(
  id: number,
  updates: Partial<Omit<PropertyCost, "id" | "property_id" | "created_at">>
): Promise<PropertyCost | undefined> {
  const fields = Object.keys(updates);
  if (fields.length === 0) return undefined;
  const setClause = fields.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = fields.map((k) => (updates as Record<string, unknown>)[k]);
  const { rows } = await getPool().query(
    `UPDATE property_costs SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0] as PropertyCost | undefined;
}

export async function deletePropertyCost(id: number): Promise<boolean> {
  const { rowCount } = await getPool().query("DELETE FROM property_costs WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

// Rental streams for a property

export async function getRentalStreamsByProperty(propertyId: number): Promise<IncomeStream[]> {
  const { rows } = await getPool().query(
    "SELECT * FROM income_streams WHERE property_id = $1 ORDER BY is_active DESC, created_at ASC",
    [propertyId]
  );
  return rows as IncomeStream[];
}

// ------------------------------------------------------------
// Aggregation helpers
// ------------------------------------------------------------

function monthlyNormalized(amount: number, frequency: string): number {
  if (frequency === "monthly") return amount;
  if (frequency === "quarterly") return amount / 3;
  if (frequency === "yearly") return amount / 12;
  return 0;
}

function monthlyInterest(m: PropertyMortgage): number {
  // annual interest / 12
  return (m.current_balance * m.interest_rate) / 12 / 100;
}

export async function getPropertiesWithDetails(userId: string): Promise<PropertyWithDetails[]> {
  const properties = await getPropertiesByUser(userId);
  const result: PropertyWithDetails[] = [];

  for (const p of properties) {
    const [mortgages, costs, rentals] = await Promise.all([
      getMortgagesByProperty(p.id),
      getCostsByProperty(p.id),
      getRentalStreamsByProperty(p.id),
    ]);

    const activeMortgages = mortgages.filter((m) => m.is_active);
    const totalMortgageBalance = activeMortgages.reduce((sum, m) => sum + m.current_balance, 0);
    const monthlyMortgageInterest = activeMortgages.reduce((sum, m) => sum + monthlyInterest(m), 0);

    const activeCosts = costs.filter((c) => c.is_active);
    const monthlyCosts = activeCosts.reduce((sum, c) => sum + monthlyNormalized(c.amount, c.frequency), 0);

    const activeRentals = rentals.filter((r) => r.is_active);
    const monthlyRent = activeRentals.reduce((sum, r) => sum + monthlyNormalized(r.amount, r.frequency), 0);

    result.push({
      ...p,
      mortgages,
      costs,
      rental_streams: rentals,
      monthly_mortgage_interest: monthlyMortgageInterest,
      monthly_costs: monthlyCosts,
      monthly_rent: monthlyRent,
      total_mortgage_balance: totalMortgageBalance,
      equity: p.current_value - totalMortgageBalance,
      net_monthly_income: monthlyRent - monthlyCosts - monthlyMortgageInterest,
    });
  }

  return result;
}

// ------------------------------------------------------------
// Holdings auto-sync for properties
// ------------------------------------------------------------

export async function syncPropertyHolding(
  userId: string,
  property: Property,
  valueUsd: number
): Promise<void> {
  // Upsert a holdings row tied to this property (source_type='property')
  await getPool().query(
    `INSERT INTO holdings (user_id, source_type, source_id, name, asset_type, value_usd, value_local, currency)
     VALUES ($1, 'property', $2, $3, 'real_estate', $4, $5, $6)
     ON CONFLICT DO NOTHING`,
    [userId, String(property.id), property.name, valueUsd, property.current_value, property.currency]
  );

  // ON CONFLICT DO NOTHING is only useful if we had a unique index.
  // We don't, so just delete-and-insert if a row already exists.
  const { rows } = await getPool().query(
    "SELECT id FROM holdings WHERE user_id = $1 AND source_type = 'property' AND source_id = $2",
    [userId, String(property.id)]
  );
  if (rows.length > 1) {
    // Clean up duplicates from the insert above
    const keepId = rows[0].id as number;
    await getPool().query(
      "DELETE FROM holdings WHERE user_id = $1 AND source_type = 'property' AND source_id = $2 AND id != $3",
      [userId, String(property.id), keepId]
    );
  }

  // Finally, update the row with fresh values (in case it already existed)
  await getPool().query(
    `UPDATE holdings
       SET name = $3, value_usd = $4, value_local = $5, currency = $6, last_updated = NOW()
     WHERE user_id = $1 AND source_type = 'property' AND source_id = $2`,
    [userId, String(property.id), property.name, valueUsd, property.current_value, property.currency]
  );
}

export async function deletePropertyHolding(userId: string, propertyId: number): Promise<void> {
  await getPool().query(
    "DELETE FROM holdings WHERE user_id = $1 AND source_type = 'property' AND source_id = $2",
    [userId, String(propertyId)]
  );
}

// ============================================================
// Illiquid Assets
// ============================================================

export type NewIlliquidAsset = Omit<IlliquidAsset, "id" | "user_id" | "created_at" | "updated_at">;

export async function getIlliquidAssetsByUser(userId: string): Promise<IlliquidAsset[]> {
  const { rows } = await getPool().query(
    "SELECT * FROM illiquid_assets WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return rows as IlliquidAsset[];
}

export async function getIlliquidAssetById(
  id: number,
  userId: string
): Promise<IlliquidAsset | undefined> {
  const { rows } = await getPool().query(
    "SELECT * FROM illiquid_assets WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return rows[0] as IlliquidAsset | undefined;
}

export async function createIlliquidAsset(
  userId: string,
  asset: NewIlliquidAsset
): Promise<IlliquidAsset> {
  const { rows } = await getPool().query(
    `INSERT INTO illiquid_assets (
       user_id, subtype, name, current_value, currency, notes,
       committed_capital, called_capital,
       employer, units, vesting_years, grant_start_date, end_value,
       amount_invested, investment_date
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      userId,
      asset.subtype,
      asset.name,
      asset.current_value,
      asset.currency,
      asset.notes,
      asset.committed_capital,
      asset.called_capital,
      asset.employer,
      asset.units,
      asset.vesting_years,
      asset.grant_start_date,
      asset.end_value,
      asset.amount_invested,
      asset.investment_date,
    ]
  );
  return rows[0] as IlliquidAsset;
}

export async function deleteIlliquidAsset(id: number, userId: string): Promise<boolean> {
  const { rowCount } = await getPool().query(
    "DELETE FROM illiquid_assets WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}

// ------------------------------------------------------------
// Holdings auto-sync for illiquid assets
// ------------------------------------------------------------

/**
 * Upsert the holdings row that represents this illiquid asset's wealth contribution.
 * source_type = 'illiquid_asset', source_id = String(asset.id), asset_type = 'illiquid'.
 *
 * The caller passes the already-converted USD value (computed against current FX rates
 * at the route layer — the DB layer does not hit the forex cache).
 */
export async function syncIlliquidHolding(
  userId: string,
  asset: IlliquidAsset,
  valueUsd: number
): Promise<void> {
  const nativeValue = illiquidAssetNativeValue(asset);

  // Upsert pattern mirrors syncPropertyHolding: INSERT-if-missing, then UPDATE.
  const { rows } = await getPool().query(
    "SELECT id FROM holdings WHERE user_id = $1 AND source_type = 'illiquid_asset' AND source_id = $2",
    [userId, String(asset.id)]
  );

  if (rows.length === 0) {
    await getPool().query(
      `INSERT INTO holdings (user_id, source_type, source_id, name, asset_type, value_usd, value_local, currency)
       VALUES ($1, 'illiquid_asset', $2, $3, 'illiquid', $4, $5, $6)`,
      [userId, String(asset.id), asset.name, valueUsd, nativeValue, asset.currency]
    );
    return;
  }

  if (rows.length > 1) {
    // Defensive cleanup — keep the first, drop the rest
    const keepId = rows[0].id as number;
    await getPool().query(
      "DELETE FROM holdings WHERE user_id = $1 AND source_type = 'illiquid_asset' AND source_id = $2 AND id != $3",
      [userId, String(asset.id), keepId]
    );
  }

  await getPool().query(
    `UPDATE holdings
       SET name = $3, value_usd = $4, value_local = $5, currency = $6, last_updated = NOW()
     WHERE user_id = $1 AND source_type = 'illiquid_asset' AND source_id = $2`,
    [userId, String(asset.id), asset.name, valueUsd, nativeValue, asset.currency]
  );
}

export async function deleteIlliquidHolding(userId: string, assetId: number): Promise<void> {
  await getPool().query(
    "DELETE FROM holdings WHERE user_id = $1 AND source_type = 'illiquid_asset' AND source_id = $2",
    [userId, String(assetId)]
  );
}

// Suppress unused-import warning — IlliquidSubtype is re-exported via NewIlliquidAsset's
// subtype field, and consumers that want the union directly import it from types.
export type { IlliquidSubtype };

export { getPool as pool };
export default getPool;
