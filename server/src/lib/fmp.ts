const FMP_BASE = "https://financialmodelingprep.com/stable";

interface FmpQuote {
  symbol: string;
  price: number;
  name?: string;
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
