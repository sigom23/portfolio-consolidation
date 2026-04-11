const OPENFIGI_URL = "https://api.openfigi.com/v3/mapping";

export interface FigiResult {
  figi: string | null;
  compositeFIGI: string | null;
  shareClassFIGI: string | null;
  securityType: string | null;
  marketSector: string | null;
  exchCode: string | null;
  ticker: string | null;
  name: string | null;
}

interface FigiResponseItem {
  figi?: string;
  compositeFIGI?: string;
  shareClassFIGI?: string;
  securityType?: string;
  marketSector?: string;
  exchCode?: string;
  ticker?: string;
  name?: string;
}

interface FigiResponse {
  data?: FigiResponseItem[];
  warning?: string;
}

export interface LookupItem {
  ticker?: string | null;
  isin?: string | null;
  currency?: string | null;
}

// ISIN country prefix → preferred OpenFIGI exchange code (primary listing)
const ISIN_COUNTRY_EXCH: Record<string, string> = {
  US: "US",
  CH: "SW",
  DE: "GR",
  GB: "LN",
  FR: "FP",
  IT: "IM",
  ES: "SM",
  NL: "NA",
  BE: "BB",
  JP: "JP",
  HK: "HK",
  AU: "AU",
  CA: "CN",
};

function pickBestListing(listings: FigiResponseItem[], isin?: string): FigiResponseItem {
  if (!isin || listings.length <= 1) return listings[0];

  const country = isin.slice(0, 2).toUpperCase();
  const preferredExch = ISIN_COUNTRY_EXCH[country];
  if (preferredExch) {
    const match = listings.find((l) => l.exchCode === preferredExch);
    if (match) return match;
  }

  return listings[0];
}

function toFigiResult(item: FigiResponseItem): FigiResult {
  return {
    figi: item.figi ?? null,
    compositeFIGI: item.compositeFIGI ?? null,
    shareClassFIGI: item.shareClassFIGI ?? null,
    securityType: item.securityType ?? null,
    marketSector: item.marketSector ?? null,
    exchCode: item.exchCode ?? null,
    ticker: item.ticker ?? null,
    name: item.name ?? null,
  };
}

// Results are keyed by ISIN (when available) or ticker
export async function lookupSecurities(items: LookupItem[]): Promise<Map<string, FigiResult>> {
  const apiKey = process.env.OPENFIGI_API_KEY;
  if (!apiKey || items.length === 0) return new Map();

  // Build mapping jobs — prefer ISIN (globally unique) over ticker
  const jobs: Record<string, string>[] = [];
  const keys: string[] = []; // parallel array of map keys for each job

  for (const item of items) {
    if (item.isin) {
      jobs.push({ idType: "ID_ISIN", idValue: item.isin.toUpperCase() });
      keys.push(item.isin.toUpperCase());
    } else if (item.ticker) {
      const job: Record<string, string> = {
        idType: "TICKER",
        idValue: item.ticker.toUpperCase(),
      };
      if (item.currency) job.currency = item.currency.toUpperCase();
      jobs.push(job);
      keys.push(item.ticker.toUpperCase());
    }
  }

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
        const key = keys[i + j];
        const response = data[j];

        if (response?.data && response.data.length > 0) {
          const isin = batch[j].idType === "ID_ISIN" ? batch[j].idValue : undefined;
          const best = pickBestListing(response.data, isin);
          results.set(key, toFigiResult(best));
        }
      }
    } catch (err) {
      console.warn("OpenFIGI lookup failed:", err instanceof Error ? err.message : err);
    }
  }

  return results;
}
