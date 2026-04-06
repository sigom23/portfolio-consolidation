const OPENFIGI_URL = "https://api.openfigi.com/v3/mapping";

export interface FigiResult {
  figi: string | null;
  compositeFIGI: string | null;
  shareClassFIGI: string | null;
  securityType: string | null;
  marketSector: string | null;
  exchCode: string | null;
  name: string | null;
}

interface FigiResponseItem {
  figi?: string;
  compositeFIGI?: string;
  shareClassFIGI?: string;
  securityType?: string;
  marketSector?: string;
  exchCode?: string;
  name?: string;
}

interface FigiResponse {
  data?: FigiResponseItem[];
  warning?: string;
}

export async function lookupTickers(tickers: string[]): Promise<Map<string, FigiResult>> {
  const apiKey = process.env.OPENFIGI_API_KEY;
  if (!apiKey || tickers.length === 0) return new Map();

  // Build mapping jobs — one per ticker
  const jobs = tickers.map((ticker) => ({
    idType: "TICKER",
    idValue: ticker.toUpperCase(),
  }));

  // OpenFIGI allows max 100 jobs per request
  const results = new Map<string, FigiResult>();
  const batchSize = 100;

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    try {
      const res = await fetch(OPENFIGI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OPENFIGI-APIKEY": apiKey,
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        console.warn(`OpenFIGI API error: ${res.status}`);
        continue;
      }

      const data = (await res.json()) as FigiResponse[];

      for (let j = 0; j < batch.length; j++) {
        const ticker = batch[j].idValue;
        const response = data[j];

        if (response?.data && response.data.length > 0) {
          const item = response.data[0];
          results.set(ticker, {
            figi: item.figi ?? null,
            compositeFIGI: item.compositeFIGI ?? null,
            shareClassFIGI: item.shareClassFIGI ?? null,
            securityType: item.securityType ?? null,
            marketSector: item.marketSector ?? null,
            exchCode: item.exchCode ?? null,
            name: item.name ?? null,
          });
        }
      }
    } catch (err) {
      console.warn("OpenFIGI lookup failed:", err instanceof Error ? err.message : err);
    }
  }

  return results;
}
