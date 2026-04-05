import pg from "pg";
import type { User, Holding, Wallet, Upload, ParsedHolding } from "../types/index.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

// Auto-create tables on startup
export async function initDb(): Promise<void> {
  await pool.query(`
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
      last_updated TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT,
      file_type TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      status TEXT DEFAULT 'processed'
    );
  `);
}

// Users
export async function getUserById(id: string): Promise<User | undefined> {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] as User | undefined;
}

export async function createOrUpdateUser(id: string, email: string | null, name: string | null): Promise<User> {
  const { rows } = await pool.query(
    `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)
     ON CONFLICT(id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
     RETURNING *`,
    [id, email, name]
  );
  return rows[0] as User;
}

// Holdings
export async function getHoldingsByUser(userId: string): Promise<Holding[]> {
  const { rows } = await pool.query(
    "SELECT * FROM holdings WHERE user_id = $1 ORDER BY value_usd DESC",
    [userId]
  );
  return rows as Holding[];
}

// Wallets
export async function getWalletsByUser(userId: string): Promise<Wallet[]> {
  const { rows } = await pool.query(
    "SELECT * FROM wallets WHERE user_id = $1 ORDER BY added_at DESC",
    [userId]
  );
  return rows as Wallet[];
}

// Uploads
export async function createUpload(userId: string, filename: string, fileType: string): Promise<Upload> {
  const { rows } = await pool.query(
    "INSERT INTO uploads (user_id, filename, file_type, status) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId, filename, fileType, "processing"]
  );
  return rows[0] as Upload;
}

export async function getUploadById(id: number): Promise<Upload | undefined> {
  const { rows } = await pool.query("SELECT * FROM uploads WHERE id = $1", [id]);
  return rows[0] as Upload | undefined;
}

export async function getUploadsByUser(userId: string): Promise<Upload[]> {
  const { rows } = await pool.query(
    "SELECT * FROM uploads WHERE user_id = $1 ORDER BY uploaded_at DESC",
    [userId]
  );
  return rows as Upload[];
}

export async function updateUploadStatus(id: number, status: string): Promise<void> {
  await pool.query("UPDATE uploads SET status = $1 WHERE id = $2", [status, id]);
}

export async function deleteUpload(id: number, userId: string): Promise<boolean> {
  await pool.query("DELETE FROM holdings WHERE source_type = 'upload' AND source_id = $1", [String(id)]);
  const { rowCount } = await pool.query("DELETE FROM uploads WHERE id = $1 AND user_id = $2", [id, userId]);
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
  const { rows } = await pool.query(
    `INSERT INTO holdings (user_id, source_type, source_id, name, ticker, asset_type, quantity, value_usd, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [userId, sourceType, sourceId, holding.name, holding.ticker, holding.asset_type, holding.quantity, holding.value_usd, holding.currency]
  );
  return rows[0] as Holding;
}

export async function getHoldingsByUpload(uploadId: number): Promise<Holding[]> {
  const { rows } = await pool.query(
    "SELECT * FROM holdings WHERE source_type = 'upload' AND source_id = $1",
    [String(uploadId)]
  );
  return rows as Holding[];
}

// Wallets CRUD
export async function createWallet(userId: string, address: string, label: string | null = null): Promise<Wallet> {
  const { rows } = await pool.query(
    "INSERT INTO wallets (user_id, address, chain, label) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId, address.toLowerCase(), "ethereum", label]
  );
  return rows[0] as Wallet;
}

export async function getWalletById(id: number): Promise<Wallet | undefined> {
  const { rows } = await pool.query("SELECT * FROM wallets WHERE id = $1", [id]);
  return rows[0] as Wallet | undefined;
}

export async function deleteWallet(id: number, userId: string): Promise<boolean> {
  await pool.query("DELETE FROM holdings WHERE source_type = 'wallet' AND source_id = $1", [String(id)]);
  const { rowCount } = await pool.query("DELETE FROM wallets WHERE id = $1 AND user_id = $2", [id, userId]);
  return (rowCount ?? 0) > 0;
}

export async function deleteHoldingsByWallet(walletId: number): Promise<void> {
  await pool.query("DELETE FROM holdings WHERE source_type = 'wallet' AND source_id = $1", [String(walletId)]);
}

export async function getHoldingsByWallet(walletId: number): Promise<Holding[]> {
  const { rows } = await pool.query(
    "SELECT * FROM holdings WHERE source_type = 'wallet' AND source_id = $1",
    [String(walletId)]
  );
  return rows as Holding[];
}

export { pool };
export default pool;
