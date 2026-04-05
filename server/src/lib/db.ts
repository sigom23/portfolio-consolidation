import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { User, Holding, Wallet } from "../types/index.js";

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

export default db;
