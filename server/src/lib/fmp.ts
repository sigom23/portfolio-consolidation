const FMP_BASE = "https://financialmodelingprep.com/stable";

interface FmpQuote {
  symbol: string;
  price: number;
  name?: string;
}

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercentage: number;
  marketCap: number;
  sector: string;
  industry: string;
  description: string;
  ceo: string;
  website: string;
  exchange: string;
  currency: string;
  range: string;
  image: string;
  ipoDate: string;
  country: string;
}

// Map OpenFIGI exchange codes to FMP exchange suffixes
const EXCH_SUFFIX: Record<string, string> = {
  SW: ".SW",  // Swiss Exchange
  LN: ".L",   // London
  GR: ".DE",  // Germany (XETRA)
  FP: ".PA",  // Paris
  IM: ".MI",  // Milan
  SM: ".MC",  // Madrid
  NA: ".AS",  // Amsterdam
  BB: ".BR",  // Brussels
  JP: ".T",   // Tokyo
  HK: ".HK",  // Hong Kong
  AU: ".AX",  // Australia
  CN: ".TO",  // Toronto
};

// Cache profiles for 1 hour
const profileCache = new Map<string, { data: CompanyProfile; fetchedAt: number }>();
const PROFILE_CACHE_TTL = 60 * 60 * 1000;

async function fetchProfile(symbol: string, apiKey: string): Promise<Record<string, unknown>[] | null> {
  try {
    const res = await fetch(`${FMP_BASE}/profile?symbol=${symbol}&apikey=${apiKey}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>[];
    return data && data.length > 0 ? data : null;
  } catch {
    return null;
  }
}

export async function getCompanyProfile(ticker: string, exchCode?: string): Promise<CompanyProfile | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  const key = ticker.toUpperCase();
  const cached = profileCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < PROFILE_CACHE_TTL) {
    return cached.data;
  }

  // Try plain ticker first, then with exchange suffix
  let data = await fetchProfile(key, apiKey);
  if (!data && exchCode) {
    const suffix = EXCH_SUFFIX[exchCode.toUpperCase()];
    if (suffix) {
      data = await fetchProfile(`${key}${suffix}`, apiKey);
    }
  }
  if (!data) return null;

  const d = data[0];
  const profile: CompanyProfile = {
    symbol: String(d.symbol ?? ""),
    companyName: String(d.companyName ?? ""),
    price: Number(d.price ?? 0),
    change: Number(d.change ?? 0),
    changePercentage: Number(d.changePercentage ?? 0),
    marketCap: Number(d.marketCap ?? 0),
    sector: String(d.sector ?? ""),
    industry: String(d.industry ?? ""),
    description: String(d.description ?? ""),
    ceo: String(d.ceo ?? ""),
    website: String(d.website ?? ""),
    exchange: String(d.exchange ?? ""),
    currency: String(d.currency ?? ""),
    range: String(d.range ?? ""),
    image: String(d.image ?? ""),
    ipoDate: String(d.ipoDate ?? ""),
    country: String(d.country ?? ""),
  };

  profileCache.set(key, { data: profile, fetchedAt: Date.now() });
  return profile;
}

// Historical prices
export interface HistoricalPrice {
  date: string;
  price: number;
}

const historyCache = new Map<string, { data: HistoricalPrice[]; fetchedAt: number }>();

export async function getHistoricalPrices(ticker: string, exchCode?: string): Promise<HistoricalPrice[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [];

  const symbol = resolveFmpSymbol(ticker, exchCode);
  const cached = historyCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < PROFILE_CACHE_TTL) {
    return cached.data;
  }

  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const res = await fetch(`${FMP_BASE}/historical-price-eod/light?symbol=${symbol}&from=${from}&to=${to}&apikey=${apiKey}`);
    if (!res.ok) return [];

    const data = (await res.json()) as { date: string; price: number }[];
    const prices = data.map((d) => ({ date: d.date, price: d.price })).reverse();
    historyCache.set(symbol, { data: prices, fetchedAt: Date.now() });
    return prices;
  } catch {
    return [];
  }
}

// Resolve a ticker + optional exchange code to a FMP-compatible symbol
export function resolveFmpSymbol(ticker: string, exchCode?: string | null): string {
  const key = ticker.toUpperCase();
  if (!exchCode) return key;
  const suffix = EXCH_SUFFIX[exchCode.toUpperCase()];
  return suffix ? `${key}${suffix}` : key;
}

export async function getQuotes(holdings: { ticker: string; exchCode?: string | null }[]): Promise<Map<string, number>> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey || holdings.length === 0) return new Map();

  const prices = new Map<string, number>();

  // Build ticker → FMP symbol mapping
  const tickerToSymbol = new Map<string, string>();
  const symbolToTicker = new Map<string, string>();
  for (const h of holdings) {
    const fmpSymbol = resolveFmpSymbol(h.ticker, h.exchCode);
    tickerToSymbol.set(h.ticker.toUpperCase(), fmpSymbol);
    symbolToTicker.set(fmpSymbol, h.ticker.toUpperCase());
  }

  const symbols = [...new Set(tickerToSymbol.values())].join(",");

  try {
    const res = await fetch(`${FMP_BASE}/quote?symbol=${symbols}&apikey=${apiKey}`);
    if (!res.ok) {
      console.warn(`FMP API error: ${res.status}`);
      return prices;
    }

    const data = (await res.json()) as FmpQuote[];
    for (const quote of data) {
      if (quote.symbol && typeof quote.price === "number") {
        // Map back to original ticker
        const originalTicker = symbolToTicker.get(quote.symbol) ?? quote.symbol.toUpperCase();
        prices.set(originalTicker, quote.price);
      }
    }
  } catch (err) {
    console.warn("FMP quote fetch failed:", err instanceof Error ? err.message : err);
  }

  return prices;
}
