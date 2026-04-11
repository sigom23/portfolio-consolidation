export interface User {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
}

export interface Holding {
  id: number;
  name: string;
  ticker: string | null;
  isin: string | null;
  asset_type: string | null;
  quantity: number | null;
  value_usd: number | null;
  source_type: string;
  source_id: string | null;
  figi: string | null;
  composite_figi: string | null;
  share_class_figi: string | null;
  security_type: string | null;
  market_sector: string | null;
  exch_code: string | null;
  currency: string | null;
  value_local: number | null;
  last_updated: string | null;
}

export interface PortfolioSummary {
  totalValue: number; // assets only (before mortgage)
  netWorth?: number;  // assets - liabilities (mortgages)
  liabilities?: number;
  breakdown: {
    stocks: number;
    crypto: number;
    bonds: number;
    cash: number;
    real_estate: number;
    other: number;
  };
}

export interface Upload {
  id: number;
  filename: string | null;
  file_type: string | null;
  uploaded_at: string;
  status: string;
  upload_kind: "wealth" | "transactions" | null;
}

export interface UploadResult {
  upload: Upload;
  holdings?: Holding[];
  kind?: "wealth" | "transactions";
  parsed?: number;
  inserted?: number;
  duplicates?: number;
}

export interface Wallet {
  id: number;
  address: string;
  chain: string;
  label: string | null;
  added_at: string;
}

export interface WalletRefreshResult {
  wallet: Wallet;
  holdings: Holding[];
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

  committed_capital: number | null;
  called_capital: number | null;

  employer: string | null;
  units: number | null;
  vesting_years: number | null;
  grant_start_date: string | null;
  end_value: number | null;

  amount_invested: number | null;
  investment_date: string | null;

  created_at: string;
  updated_at: string;
}

export type NewIlliquidAsset = Omit<IlliquidAsset, "id" | "user_id" | "created_at" | "updated_at">;

/**
 * Vested-to-date value for an unvested equity grant, per CLAUDE.md:
 *   end_value × min(years_elapsed, vesting_years) / vesting_years
 * Calendar years since grant start. Returns 0 if required fields are missing.
 * Mirrors the server-side `computeUnvestedVestedValue` so client-rendered
 * numbers match the holdings table exactly.
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
 * Wealth contribution in native currency for a given illiquid asset.
 * Subtype switch mirrors server logic so cards and totals stay consistent.
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

export interface PropertyWithDetails extends Property {
  mortgages: PropertyMortgage[];
  costs: PropertyCost[];
  rental_streams: IncomeStream[];
  monthly_mortgage_interest: number;
  monthly_costs: number;
  monthly_rent: number;
  total_mortgage_balance: number;
  equity: number;
  net_monthly_income: number;
}

export interface NewProperty {
  name: string;
  property_type: PropertyType;
  address?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  current_value: number;
  currency: string;
  notes?: string | null;
}

export interface NewMortgage {
  lender?: string | null;
  original_amount: number;
  current_balance: number;
  interest_rate: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

export interface NewPropertyCost {
  label: string;
  category: PropertyCostCategory;
  amount: number;
  currency?: string;
  frequency: IncomeFrequency;
  day_of_month?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
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

export interface CashFlowSummary {
  month: string | null;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
  transactionCount: number;
  categories: { name: string; value: number }[];
  topMerchants: { name: string; value: number }[];
}

export interface NewTransaction {
  date: string;
  amount: number;
  currency: string;
  description: string;
  merchant?: string | null;
  category?: string | null;
}

export interface NewIncomeStream {
  name: string;
  type: IncomeStreamType;
  amount: number;
  currency: string;
  frequency: IncomeFrequency;
  day_of_month?: number | null;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
