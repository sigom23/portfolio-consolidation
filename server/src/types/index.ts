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
  isin: string | null;
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
  value_local: number | null;
  last_updated: string;
}

export interface Upload {
  id: number;
  user_id: string;
  filename: string | null;
  file_type: string | null;
  uploaded_at: string;
  status: string;
  upload_kind: "wealth" | "transactions" | null;
}

export interface ParsedHolding {
  name: string;
  ticker: string | null;
  isin: string | null;
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

export type IncomeStreamType =
  | "salary"
  | "dividend"
  | "freelance"
  | "pension"
  | "interest"
  | "rental"
  | "other";
export type IncomeFrequency = "monthly" | "quarterly" | "yearly" | "irregular";

export interface IncomeStream {
  id: number;
  user_id: string;
  name: string;
  type: IncomeStreamType;
  amount: number;
  currency: string;
  frequency: IncomeFrequency;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  property_id: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Real Estate
// ============================================================
export type PropertyType = "apartment" | "house" | "commercial" | "land" | "other";
export type PropertyCostCategory = "maintenance" | "management" | "other";

export interface Property {
  id: number;
  user_id: string;
  name: string;
  property_type: PropertyType;
  address: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyMortgage {
  id: number;
  property_id: number;
  lender: string | null;
  original_amount: number;
  current_balance: number;
  interest_rate: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyCost {
  id: number;
  property_id: number;
  label: string;
  category: PropertyCostCategory;
  amount: number;
  currency: string;
  frequency: IncomeFrequency;
  day_of_month: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Aggregate for list views
export interface PropertyWithDetails extends Property {
  mortgages: PropertyMortgage[];
  costs: PropertyCost[];
  rental_streams: IncomeStream[];
  // Derived (monthly)
  monthly_mortgage_interest: number;  // in property currency
  monthly_costs: number;               // in property currency (all recurring costs normalized)
  monthly_rent: number;                // in property currency
  total_mortgage_balance: number;      // in property currency
  equity: number;                      // value - total mortgage balance
  net_monthly_income: number;          // rent - costs - interest
}

// ============================================================
// Illiquid Assets
// ============================================================
export type IlliquidSubtype = "private_equity" | "pension" | "unvested_equity" | "startup";

export interface IlliquidAsset {
  id: number;
  user_id: string;
  subtype: IlliquidSubtype;
  name: string;
  current_value: number | null;
  currency: string;
  notes: string | null;

  // Private Equity
  committed_capital: number | null;
  called_capital: number | null;

  // Unvested Equity
  employer: string | null;
  units: number | null;
  vesting_years: number | null;
  grant_start_date: string | null;
  end_value: number | null;

  // Startup
  amount_invested: number | null;
  investment_date: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Vested-to-date value for an unvested equity grant, computed yearly per CLAUDE.md:
 *   end_value × min(years_elapsed, vesting_years) / vesting_years
 * Years elapsed = calendar years since grant_start_date.
 * Returns 0 if any required field is missing or grant is in the future.
 */
export function computeUnvestedVestedValue(
  endValue: number | null,
  vestingYears: number | null,
  grantStartDate: string | null,
  now: Date = new Date()
): number {
  if (endValue == null || vestingYears == null || vestingYears <= 0 || !grantStartDate) return 0;
  const start = new Date(grantStartDate);
  if (isNaN(start.getTime())) return 0;
  const yearsElapsedRaw = now.getUTCFullYear() - start.getUTCFullYear();
  const yearsElapsed = Math.max(0, Math.min(yearsElapsedRaw, vestingYears));
  return (endValue * yearsElapsed) / vestingYears;
}

/**
 * Resolves the wealth contribution (in the asset's native currency) for an illiquid asset,
 * based on its subtype. FX conversion to USD happens at sync time in db.ts.
 */
export function illiquidAssetNativeValue(a: IlliquidAsset, now: Date = new Date()): number {
  switch (a.subtype) {
    case "private_equity":
    case "pension":
    case "startup":
      return a.current_value ?? 0;
    case "unvested_equity":
      return computeUnvestedVestedValue(a.end_value, a.vesting_years, a.grant_start_date, now);
  }
}

export interface Transaction {
  id: number;
  user_id: string;
  source_type: "stream" | "upload" | "manual";
  source_id: string | null;
  date: string;
  amount: number;
  currency: string;
  amount_usd: number | null;
  description: string | null;
  merchant: string | null;
  category: string | null;
  dedup_hash: string | null;
  created_at: string;
}

export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  merchant: string | null;
  amount: number; // signed: positive = income, negative = expense
  currency: string;
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
