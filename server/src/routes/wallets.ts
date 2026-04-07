import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createWallet,
  getWalletsByUser,
  getWalletById,
  deleteWallet,
  deleteHoldingsByWallet,
  createHoldingFromWallet,
} from "../lib/db.js";
import { getWalletBalances } from "../lib/etherscan.js";
import { getEthPrice, getTokenPrices } from "../lib/coingecko.js";
import type { ParsedHolding } from "../types/index.js";

const router = Router();
router.use(requireAuth);

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

// GET /api/wallets — list user's wallets
router.get("/", async (req: Request, res: Response) => {
  const wallets = await getWalletsByUser(req.session.userId!);
  res.json({ success: true, data: wallets });
});

// POST /api/wallets — add a wallet
router.post("/", async (req: Request, res: Response) => {
  const { address, label } = req.body as { address?: string; label?: string };

  if (!address || !ETH_ADDRESS_RE.test(address)) {
    res.status(400).json({ success: false, error: "Invalid Ethereum address (must be 0x + 40 hex chars)" });
    return;
  }

  const wallet = await createWallet(req.session.userId!, address, label ?? null);
  res.json({ success: true, data: wallet });
});

// DELETE /api/wallets/:id — remove wallet and its holdings
router.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: "Invalid wallet ID" });
    return;
  }

  const deleted = await deleteWallet(id, req.session.userId!);
  if (!deleted) {
    res.status(404).json({ success: false, error: "Wallet not found" });
    return;
  }

  res.json({ success: true, data: null });
});

// POST /api/wallets/:id/refresh — fetch balances and update holdings
router.post("/:id/refresh", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "Invalid wallet ID" });
      return;
    }

    const wallet = await getWalletById(id);
    if (!wallet || wallet.user_id !== req.session.userId!) {
      res.status(404).json({ success: false, error: "Wallet not found" });
      return;
    }

    // Fetch balances from Etherscan
    const balances = await getWalletBalances(wallet.address);

    // Fetch prices from CoinGecko
    const ethPrice = await getEthPrice();
    const tokenAddresses = balances.tokens.map((t) => t.contractAddress);
    const tokenPrices = await getTokenPrices(tokenAddresses);

    // Clear old holdings for this wallet
    await deleteHoldingsByWallet(id);

    // Create ETH holding
    const holdings: ParsedHolding[] = [];

    if (balances.eth > 0) {
      holdings.push({
        name: "Ethereum",
        ticker: "ETH",
        isin: null,
        asset_type: "crypto",
        quantity: balances.eth,
        value_usd: balances.eth * ethPrice,
        currency: "USD",
      });
    }

    // Create token holdings
    for (const token of balances.tokens) {
      const price = tokenPrices[token.contractAddress.toLowerCase()] ?? 0;
      holdings.push({
        name: token.name,
        ticker: token.symbol,
        isin: null,
        asset_type: "crypto",
        quantity: token.balance,
        value_usd: token.balance * price,
        currency: "USD",
      });
    }

    const created = await Promise.all(
      holdings.map((h) => createHoldingFromWallet(req.session.userId!, id, h))
    );

    res.json({ success: true, data: { wallet, holdings: created } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
