const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export async function getEthPrice(): Promise<number> {
  const res = await fetch(`${COINGECKO_BASE}/simple/price?ids=ethereum&vs_currencies=usd`);
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
  const data = (await res.json()) as { ethereum?: { usd?: number } };
  return data.ethereum?.usd ?? 0;
}

export async function getTokenPrices(
  contractAddresses: string[]
): Promise<Record<string, number>> {
  if (contractAddresses.length === 0) return {};

  const addresses = contractAddresses.join(",");
  const res = await fetch(
    `${COINGECKO_BASE}/simple/token_price/ethereum?contract_addresses=${addresses}&vs_currencies=usd`
  );

  if (!res.ok) {
    // CoinGecko free tier has strict rate limits — return empty on failure
    console.warn("CoinGecko token price fetch failed, returning empty prices");
    return {};
  }

  const data = (await res.json()) as Record<string, { usd?: number }>;

  const prices: Record<string, number> = {};
  for (const [addr, info] of Object.entries(data)) {
    prices[addr.toLowerCase()] = info.usd ?? 0;
  }
  return prices;
}
