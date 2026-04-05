import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { User, Holding, Wallet, Upload, ParsedHolding } from "../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../data.db");

const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Auto-create tables on startup
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    chain TEXT DEFAULT 'ethereum',
    label TEXT,
    added_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id TEXT,
    name TEXT NOT NULL,
    ticker TEXT,
    asset_type TEXT,
    quantity REAL,
    value_usd REAL,
    currency TEXT DEFAULT 'USD',
    last_updated TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT,
    file_type TEXT,
    uploaded_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'processed'
  );
`);

// Prepared statements
const stmts = {
  getUserById: db.prepare("SELECT * FROM users WHERE id = ?"),
  createOrUpdateUser: db.prepare(`
    INSERT INTO users (id, email, name) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name
  `),
  getHoldingsByUser: db.prepare("SELECT * FROM holdings WHERE user_id = ? ORDER BY value_usd DESC"),
  getWalletsByUser: db.prepare("SELECT * FROM wallets WHERE user_id = ? ORDER BY added_at DESC"),
  createUpload: db.prepare("INSERT INTO uploads (user_id, filename, file_type, status) VALUES (?, ?, ?, ?)"),
  getUploadById: db.prepare("SELECT * FROM uploads WHERE id = ?"),
  getUploadsByUser: db.prepare("SELECT * FROM uploads WHERE user_id = ? ORDER BY uploaded_at DESC"),
  updateUploadStatus: db.prepare("UPDATE uploads SET status = ? WHERE id = ?"),
  deleteUpload: db.prepare("DELETE FROM uploads WHERE id = ? AND user_id = ?"),
  createHolding: db.prepare(`
    INSERT INTO holdings (user_id, source_type, source_id, name, ticker, asset_type, quantity, value_usd, currency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  deleteHoldingsByUpload: db.prepare("DELETE FROM holdings WHERE source_type = 'upload' AND source_id = ?"),
  getHoldingsByUpload: db.prepare("SELECT * FROM holdings WHERE source_type = 'upload' AND source_id = ?"),
};

export function getUserById(id: string): User | undefined {
  return stmts.getUserById.get(id) as User | undefined;
}

export function createOrUpdateUser(id: string, email: string | null, name: string | null): User {
  stmts.createOrUpdateUser.run(id, email, name);
  return getUserById(id)!;
}

export function getHoldingsByUser(userId: string): Holding[] {
  return stmts.getHoldingsByUser.all(userId) as Holding[];
}

export function getWalletsByUser(userId: string): Wallet[] {
  return stmts.getWalletsByUser.all(userId) as Wallet[];
}

export function createUpload(userId: string, filename: string, fileType: string): Upload {
  const result = stmts.createUpload.run(userId, filename, fileType, "processing");
  return stmts.getUploadById.get(result.lastInsertRowid) as Upload;
}

export function getUploadById(id: number): Upload | undefined {
  return stmts.getUploadById.get(id) as Upload | undefined;
}

export function getUploadsByUser(userId: string): Upload[] {
  return stmts.getUploadsByUser.all(userId) as Upload[];
}

export function updateUploadStatus(id: number, status: string): void {
  stmts.updateUploadStatus.run(status, id);
}

export function deleteUpload(id: number, userId: string): boolean {
  const uploadId = String(id);
  stmts.deleteHoldingsByUpload.run(uploadId);
  const result = stmts.deleteUpload.run(id, userId);
  return result.changes > 0;
}

export function createHolding(userId: string, uploadId: number, holding: ParsedHolding): Holding {
  const result = stmts.createHolding.run(
    userId,
    "upload",
    String(uploadId),
    holding.name,
    holding.ticker,
    holding.asset_type,
    holding.quantity,
    holding.value_usd,
    holding.currency
  );
  return {
    id: Number(result.lastInsertRowid),
    user_id: userId,
    source_type: "upload",
    source_id: String(uploadId),
    name: holding.name,
    ticker: holding.ticker,
    asset_type: holding.asset_type,
    quantity: holding.quantity,
    value_usd: holding.value_usd,
    currency: holding.currency,
    last_updated: new Date().toISOString(),
  };
}

export function getHoldingsByUpload(uploadId: number): Holding[] {
  return stmts.getHoldingsByUpload.all(String(uploadId)) as Holding[];
}

export default db;
