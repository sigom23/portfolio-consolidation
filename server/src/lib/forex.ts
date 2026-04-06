interface ExchangeRateResponse {
  base_code: string;
  rates: Record<string, number>;
}

let cachedRates: { base: string; rates: Record<string, number>; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getExchangeRates(base: string = "USD"): Promise<Record<string, number>> {
  // Return cached rates if fresh
  if (cachedRates && cachedRates.base === base && Date.now() - cachedRates.fetchedAt < CACHE_TTL) {
    return cachedRates.rates;
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);

    const data = (await res.json()) as ExchangeRateResponse;
    cachedRates = { base, rates: data.rates, fetchedAt: Date.now() };
    return data.rates;
  } catch (err) {
    console.warn("Exchange rate fetch failed:", err instanceof Error ? err.message : err);
    // Return fallback rates if cache exists but is stale
    if (cachedRates) return cachedRates.rates;
    return {};
  }
}

export const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", flag: "🇦🇺" },
];
