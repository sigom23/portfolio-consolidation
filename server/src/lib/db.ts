import pg from "pg";
import type { User, Holding, Wallet, Upload, ParsedHolding } from "../types/index.js";

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
export async function createUpload(userId: string, filename: string, fileType: string, fileData?: Buffer): Promise<Upload> {
  const { rows } = await getPool().query(
    "INSERT INTO uploads (user_id, filename, file_type, file_data, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, filename, file_type, uploaded_at, status",
    [userId, filename, fileType, fileData ?? null, "processing"]
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
  figi: { figi: string | null; compositeFIGI: string | null; shareClassFIGI: string | null; securityType: string | null; marketSector: string | null; exchCode: string | null }
): Promise<void> {
  await getPool().query(
    `UPDATE holdings SET figi = $1, composite_figi = $2, share_class_figi = $3, security_type = $4, market_sector = $5, exch_code = $6 WHERE id = $7`,
    [figi.figi, figi.compositeFIGI, figi.shareClassFIGI, figi.securityType, figi.marketSector, figi.exchCode, holdingId]
  );
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

export { getPool as pool };
export default getPool;
