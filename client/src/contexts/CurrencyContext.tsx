import { createContext, useState, useEffect, useContext, type ReactNode } from "react";
import { fetchExchangeRates, type CurrencyInfo } from "../services/api";

const LOCALE_BY_CURRENCY: Record<string, string> = {
  CHF: "de-CH",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  JPY: "ja-JP",
};

// Prefer ISO code over ambiguous/national symbols. Non-breaking space keeps
// prefix + number on one line.
const PREFIX_BY_CURRENCY: Record<string, string> = {
  CHF: "CHF\u00A0",
};

interface CurrencyContextValue {
  baseCurrency: string;
  setBaseCurrency: (code: string) => void;
  currencies: CurrencyInfo[];
  rates: Record<string, number>;
  convert: (usdValue: number) => number;
  format: (usdValue: number) => string;
  rateVsBase: (ccy: string) => number;
  symbol: string;
  flag: string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  baseCurrency: "USD",
  setBaseCurrency: () => {},
  currencies: [],
  rates: {},
  convert: (v) => v,
  format: (v) => `$${v.toFixed(2)}`,
  rateVsBase: () => 1,
  symbol: "$",
  flag: "",
  loading: false,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [baseCurrency, setBaseCurrencyState] = useState(() => {
    return localStorage.getItem("baseCurrency") ?? "USD";
  });
  const [rates, setRates] = useState<Record<string, number>>({});
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const setBaseCurrency = (code: string) => {
    setBaseCurrencyState(code);
    localStorage.setItem("baseCurrency", code);
  };

  useEffect(() => {
    setLoading(true);
    fetchExchangeRates("USD")
      .then((data) => {
        setRates(data.rates);
        setCurrencies(data.currencies);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentCurrency = currencies.find((c) => c.code === baseCurrency);
  const rate = baseCurrency === "USD" ? 1 : (rates[baseCurrency] ?? 1);
  const symbol = currentCurrency?.symbol ?? "$";
  const flag = currentCurrency?.flag ?? "";

  const convert = (usdValue: number) => usdValue * rate;

  // How much of the base currency equals 1 unit of the given currency
  const rateVsBase = (ccy: string): number => {
    const code = ccy.toUpperCase();
    if (code === baseCurrency) return 1;
    const ccyPerUsd = code === "USD" ? 1 : (rates[code] ?? 1);
    const basePerUsd = baseCurrency === "USD" ? 1 : (rates[baseCurrency] ?? 1);
    // 1 CCY = (1 / ccyPerUsd) USD = (basePerUsd / ccyPerUsd) BASE
    return basePerUsd / ccyPerUsd;
  };

  const format = (usdValue: number) => {
    const converted = convert(usdValue);
    const locale = LOCALE_BY_CURRENCY[baseCurrency] ?? undefined;
    const prefix = PREFIX_BY_CURRENCY[baseCurrency] ?? symbol;
    if (baseCurrency === "JPY") {
      return `${prefix}${Math.round(converted).toLocaleString(locale)}`;
    }
    const useDecimals = Math.abs(converted) < 10000;
    const digits = useDecimals ? 2 : 0;
    return `${prefix}${converted.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  };

  return (
    <CurrencyContext.Provider
      value={{ baseCurrency, setBaseCurrency, currencies, rates, convert, format, rateVsBase, symbol, flag, loading }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
