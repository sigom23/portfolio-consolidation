export interface User {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
}

export interface Wallet {
  id: number;
  user_id: string;
  address: string;
  chain: string;
  label: string | null;
  added_at: string;
}

export interface Holding {
  id: number;
  user_id: string;
  source_type: string;
  source_id: string | null;
  name: string;
  ticker: string | null;
  asset_type: string | null;
  quantity: number | null;
  value_usd: number | null;
  currency: string;
  figi: string | null;
  composite_figi: string | null;
  share_class_figi: string | null;
  security_type: string | null;
  market_sector: string | null;
  exch_code: string | null;
  last_updated: string;
}

export interface Upload {
  id: number;
  user_id: string;
  filename: string | null;
  file_type: string | null;
  uploaded_at: string;
  status: string;
}

export interface ParsedHolding {
  name: string;
  ticker: string | null;
  asset_type: "stocks" | "crypto" | "bonds" | "cash" | "other";
  quantity: number | null;
  value_usd: number | null;
  currency: string;
}

export interface PortfolioSummary {
  totalValue: number;
  breakdown: {
    stocks: number;
    crypto: number;
    bonds: number;
    cash: number;
    other: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    nonce?: string;
    state?: string;
  }
}
