const ETHERSCAN_BASE = "https://api.etherscan.io/api";

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

interface TokenTx {
  contractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimal: string;
}

export interface TokenBalance {
  contractAddress: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
}

export interface WalletBalances {
  eth: number;
  tokens: TokenBalance[];
}

function getApiKey(): string {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) throw new Error("ETHERSCAN_API_KEY is not configured");
  return key;
}

async function etherscanFetch<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(ETHERSCAN_BASE);
  params.apikey = getApiKey();
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Etherscan API error: ${res.status}`);
  const data = (await res.json()) as EtherscanResponse<T>;
  if (data.status === "0" && data.message === "NOTOK") {
    throw new Error(`Etherscan: ${data.result}`);
  }
  return data.result;
}

export async function getEthBalance(address: string): Promise<number> {
  const weiStr = await etherscanFetch<string>({
    module: "account",
    action: "balance",
    address,
    tag: "latest",
  });
  return parseFloat(weiStr) / 1e18;
}

export async function getERC20Tokens(address: string): Promise<TokenBalance[]> {
  // Get token transfer history to discover which tokens the address has interacted with
  const txs = await etherscanFetch<TokenTx[]>({
    module: "account",
    action: "tokentx",
    address,
    page: "1",
    offset: "100",
    sort: "desc",
  });

  if (!Array.isArray(txs)) return [];

  // Deduplicate by contract address
  const uniqueTokens = new Map<string, TokenTx>();
  for (const tx of txs) {
    if (!uniqueTokens.has(tx.contractAddress.toLowerCase())) {
      uniqueTokens.set(tx.contractAddress.toLowerCase(), tx);
    }
  }

  // Fetch current balance for each token
  const tokens: TokenBalance[] = [];
  for (const [contractAddr, tx] of uniqueTokens) {
    try {
      const balanceStr = await etherscanFetch<string>({
        module: "account",
        action: "tokenbalance",
        contractaddress: contractAddr,
        address,
        tag: "latest",
      });

      const decimals = parseInt(tx.tokenDecimal, 10) || 18;
      const balance = parseFloat(balanceStr) / Math.pow(10, decimals);

      if (balance > 0) {
        tokens.push({
          contractAddress: contractAddr,
          symbol: tx.tokenSymbol,
          name: tx.tokenName,
          balance,
          decimals,
        });
      }
    } catch {
      // Skip tokens that fail to fetch
    }
  }

  return tokens;
}

export async function getWalletBalances(address: string): Promise<WalletBalances> {
  const [eth, tokens] = await Promise.all([
    getEthBalance(address),
    getERC20Tokens(address),
  ]);
  return { eth, tokens };
}
