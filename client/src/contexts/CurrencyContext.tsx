import { createContext, useState, useEffect, useContext, type ReactNode } from "react";
import { fetchExchangeRates, type CurrencyInfo } from "../services/api";

interface CurrencyContextValue {
  baseCurrency: string;
  setBaseCurrency: (code: string) => void;
  currencies: CurrencyInfo[];
  convert: (usdValue: number) => number;
  format: (usdValue: number) => string;
  symbol: string;
  flag: string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  baseCurrency: "USD",
  setBaseCurrency: () => {},
  currencies: [],
  convert: (v) => v,
  format: (v) => `$${v.toFixed(2)}`,
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

  const format = (usdValue: number) => {
    const converted = convert(usdValue);
    if (baseCurrency === "JPY") {
      return `${symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider
      value={{ baseCurrency, setBaseCurrency, currencies, convert, format, symbol, flag, loading }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
