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

// Cache profiles for 1 hour
const profileCache = new Map<string, { data: CompanyProfile; fetchedAt: number }>();
const PROFILE_CACHE_TTL = 60 * 60 * 1000;

export async function getCompanyProfile(ticker: string): Promise<CompanyProfile | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  const key = ticker.toUpperCase();
  const cached = profileCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < PROFILE_CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(`${FMP_BASE}/profile?symbol=${key}&apikey=${apiKey}`);
    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, unknown>[];
    if (!data || data.length === 0) return null;

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
  } catch {
    return null;
  }
}

export async function getQuotes(tickers: string[]): Promise<Map<string, number>> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey || tickers.length === 0) return new Map();

  const prices = new Map<string, number>();
  const symbols = tickers.join(",");

  try {
    const res = await fetch(`${FMP_BASE}/quote?symbol=${symbols}&apikey=${apiKey}`);
    if (!res.ok) {
      console.warn(`FMP API error: ${res.status}`);
      return prices;
    }

    const data = (await res.json()) as FmpQuote[];
    for (const quote of data) {
      if (quote.symbol && typeof quote.price === "number") {
        prices.set(quote.symbol.toUpperCase(), quote.price);
      }
    }
  } catch (err) {
    console.warn("FMP quote fetch failed:", err instanceof Error ? err.message : err);
  }

  return prices;
}
