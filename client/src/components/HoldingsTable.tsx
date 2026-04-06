import type { Holding, Upload, Wallet } from "../types";
import { useCurrency } from "../contexts/CurrencyContext";
import { HoldingHoverCard } from "./HoldingHoverCard";
import { useState } from "react";

interface Props {
  holdings: Holding[];
  loading: boolean;
  uploads?: Upload[];
  wallets?: Wallet[];
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function SourceBadge({ holding, uploads, wallets }: { holding: Holding; uploads: Upload[]; wallets: Wallet[] }) {
  const isWallet = holding.source_type === "wallet";
  let detail = "";

  if (isWallet && holding.source_id) {
    const wallet = wallets.find((w) => String(w.id) === holding.source_id);
    detail = wallet?.label ?? (wallet ? truncateAddress(wallet.address) : "");
  } else if (!isWallet && holding.source_id) {
    const upload = uploads.find((u) => String(u.id) === holding.source_id);
    detail = upload?.filename ?? "";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
        isWallet
          ? "bg-purple-500/10 text-purple-500"
          : "bg-blue-500/10 text-blue-500"
      }`}
      title={detail}
    >
      {isWallet ? "Wallet" : "Upload"}
      {detail && <span className="opacity-70 max-w-[80px] truncate">· {detail}</span>}
    </span>
  );
}

const EXCH_SUFFIX: Record<string, string> = {
  SW: ".SW", LN: ".L", GR: ".DE", FP: ".PA", IM: ".MI",
  SM: ".MC", NA: ".AS", BB: ".BR", JP: ".T", HK: ".HK",
  AU: ".AX", CN: ".TO",
};

function getLogoUrl(ticker: string, exchCode?: string | null): string {
  let symbol = ticker.toUpperCase();
  if (exchCode) {
    const suffix = EXCH_SUFFIX[exchCode.toUpperCase()];
    if (suffix) symbol = `${symbol}${suffix}`;
  }
  return `https://images.financialmodelingprep.com/symbol/${symbol}.png`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CHF: "Fr", JPY: "¥",
  CAD: "C$", AUD: "A$", HKD: "HK$", CNY: "¥", KRW: "₩",
  SEK: "kr", NOK: "kr", DKK: "kr", SGD: "S$", INR: "₹",
};

function formatLocal(value: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  if (currency === "JPY" || currency === "KRW") {
    return `${sym}${Math.round(value).toLocaleString()}`;
  }
  return `${sym}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const SPAM_THRESHOLD = 1;

export function HoldingsTable({ holdings, loading, uploads = [], wallets = [] }: Props) {
  const { format, baseCurrency } = useCurrency();
  const [hideSpam, setHideSpam] = useState(true);

  const spamCount = holdings.filter((h) => (h.value_usd ?? 0) < SPAM_THRESHOLD && h.source_type === "wallet").length;
  const filtered = hideSpam
    ? holdings.filter((h) => (h.value_usd ?? 0) >= SPAM_THRESHOLD || h.source_type !== "wallet")
    : holdings;

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden transition-colors">
      <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Holdings</h2>
        {spamCount > 0 && (
          <button
            onClick={() => setHideSpam(!hideSpam)}
            className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <div
              className={`w-8 h-4 rounded-full relative transition-colors ${
                hideSpam ? "bg-blue-500" : "bg-[var(--bg-tertiary)]"
              }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  hideSpam ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
            Hide spam ({spamCount})
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border-color)]">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Ticker</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Source</th>
              <th className="px-6 py-3 font-medium text-right">Quantity</th>
              <th className="px-6 py-3 font-medium text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border-color)]/50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-6 py-3">
                      <div className="h-4 bg-[var(--bg-tertiary)] rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                  No holdings yet. Upload a statement or connect a wallet to get started.
                </td>
              </tr>
            ) : (
              filtered.map((h) => {
                return (
                  <tr
                    key={h.id}
                    className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                  >
                      <td className="px-6 py-3 text-sm font-medium text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          {h.ticker && (
                            <img
                              src={getLogoUrl(h.ticker, h.exch_code)}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover bg-[var(--bg-tertiary)]"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                const plainUrl = `https://images.financialmodelingprep.com/symbol/${h.ticker!.toUpperCase()}.png`;
                                if (img.src !== plainUrl) {
                                  img.src = plainUrl;
                                } else {
                                  img.style.display = "none";
                                }
                              }}
                            />
                          )}
                          {h.ticker ? (
                            <HoldingHoverCard
                              ticker={h.ticker}
                              exchCode={h.exch_code}
                              figiData={{
                                figi: h.figi,
                                composite_figi: h.composite_figi,
                                share_class_figi: h.share_class_figi,
                                security_type: h.security_type,
                                market_sector: h.market_sector,
                                exch_code: h.exch_code,
                              }}
                            >
                              <span className="hover:text-blue-500 transition-colors cursor-default">{h.name}</span>
                            </HoldingHoverCard>
                          ) : (
                            h.name
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-[var(--text-secondary)] font-mono">{h.ticker ?? "—"}</td>
                      <td className="px-6 py-3 text-sm text-[var(--text-secondary)] capitalize">{h.asset_type ?? "—"}</td>
                      <td className="px-6 py-3 text-sm">
                        <SourceBadge holding={h} uploads={uploads} wallets={wallets} />
                      </td>
                      <td className="px-6 py-3 text-sm text-[var(--text-primary)] text-right tabular-nums">
                        {h.quantity != null ? h.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-right tabular-nums">
                        {h.value_local != null && h.currency ? (
                          <div>
                            <span className="font-medium text-[var(--text-primary)]">
                              {formatLocal(h.value_local, h.currency.toUpperCase())}
                            </span>
                            {h.currency.toUpperCase() !== baseCurrency && h.value_usd != null && (
                              <span className="block text-xs text-[var(--text-muted)]">
                                {format(h.value_usd)}
                              </span>
                            )}
                          </div>
                        ) : h.value_usd != null ? (
                          <span className="font-medium text-[var(--text-primary)]">{format(h.value_usd)}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
