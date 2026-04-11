import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useHoldings, useWallets } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import type { Holding, Wallet } from "../types";

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

type WalletGroup = {
  wallet: Wallet | null; // null = unassigned / unknown wallet
  sourceId: string | null;
  holdings: Holding[];
  totalUsd: number;
};

function AssetsCryptoPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: holdings, isLoading: holdingsLoading } = useHoldings();
  const { data: wallets, isLoading: walletsLoading } = useWallets();
  const { format, baseCurrency, flag } = useCurrency();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  const cryptoHoldings = useMemo(
    () => (holdings ?? []).filter((h) => h.asset_type === "crypto"),
    [holdings]
  );

  const totalUsd = useMemo(
    () => cryptoHoldings.reduce((sum, h) => sum + (h.value_usd ?? 0), 0),
    [cryptoHoldings]
  );

  // Group holdings by wallet (source_id). Holdings without a matching wallet
  // fall into a null bucket so nothing silently disappears.
  const groups = useMemo<WalletGroup[]>(() => {
    const byId = new Map<string, WalletGroup>();
    const unassigned: WalletGroup = {
      wallet: null,
      sourceId: null,
      holdings: [],
      totalUsd: 0,
    };

    for (const h of cryptoHoldings) {
      const sourceId = h.source_id;
      if (!sourceId) {
        unassigned.holdings.push(h);
        unassigned.totalUsd += h.value_usd ?? 0;
        continue;
      }
      let group = byId.get(sourceId);
      if (!group) {
        const wallet = (wallets ?? []).find((w) => String(w.id) === sourceId) ?? null;
        group = { wallet, sourceId, holdings: [], totalUsd: 0 };
        byId.set(sourceId, group);
      }
      group.holdings.push(h);
      group.totalUsd += h.value_usd ?? 0;
    }

    const result = Array.from(byId.values()).sort((a, b) => b.totalUsd - a.totalUsd);
    if (unassigned.holdings.length > 0) result.push(unassigned);
    for (const g of result) {
      g.holdings.sort((a, b) => (b.value_usd ?? 0) - (a.value_usd ?? 0));
    }
    return result;
  }, [cryptoHoldings, wallets]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const loading = holdingsLoading || walletsLoading;

  return (
    <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Crypto</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Tokens held across your tracked wallets
        </p>
      </div>

      {/* Total value hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
        className="hero-card rounded-2xl p-6 mb-6 transition-all"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
            Total Crypto Value
          </p>
          <span className="text-xs text-[var(--text-muted)]">{flag} {baseCurrency}</span>
        </div>
        {loading ? (
          <div className="h-10 w-56 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
            <AnimatedNumber value={totalUsd} format={format} />
          </p>
        )}
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          {cryptoHoldings.length} token{cryptoHoldings.length === 1 ? "" : "s"} across{" "}
          {groups.length} wallet{groups.length === 1 ? "" : "s"}
        </p>
      </motion.div>

      {/* Wallet groups */}
      {loading ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center text-[var(--text-muted)]">
          Loading crypto holdings...
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center text-[var(--text-muted)]">
          No crypto holdings yet. Add a wallet address in the{" "}
          <a href="/data-room" className="text-blue-500 hover:text-blue-400">Data Room</a> to
          start tracking tokens.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group, i) => (
            <motion.section
              key={group.sourceId ?? "unassigned"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    {group.wallet?.label ?? (group.wallet ? truncateAddress(group.wallet.address) : "Unassigned")}
                  </h2>
                  {group.wallet && (
                    <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                      {truncateAddress(group.wallet.address)} · {group.wallet.chain}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                  {format(group.totalUsd)}
                </p>
              </div>

              <div className="divide-y divide-[var(--border-color)]/50">
                {group.holdings.map((h) => (
                  <div
                    key={h.id}
                    className="px-6 py-3 flex items-center justify-between hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{h.name}</p>
                      {h.ticker && (
                        <p className="text-xs text-[var(--text-muted)] uppercase">{h.ticker}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                        {format(h.value_usd ?? 0)}
                      </p>
                      {h.quantity != null && (
                        <p className="text-xs text-[var(--text-muted)] tabular-nums">
                          {h.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} {h.ticker ?? ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/assets/crypto",
  component: AssetsCryptoPage,
});
