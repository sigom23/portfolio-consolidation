import axios from "axios";
import type { User, PortfolioSummary, Holding, Upload, UploadResult, Wallet, WalletRefreshResult, ApiResponse } from "../types";

const api = axios.create({
  baseURL: "/",
  withCredentials: true,
});

export async function fetchUser(): Promise<User | null> {
  const { data } = await api.get<ApiResponse<User | null>>("/auth/me");
  return data.data ?? null;
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  const { data } = await api.get<ApiResponse<PortfolioSummary>>("/api/portfolio/summary");
  return data.data!;
}

export async function fetchHoldings(): Promise<Holding[]> {
  const { data } = await api.get<ApiResponse<Holding[]>>("/api/holdings");
  return data.data ?? [];
}

export async function uploadStatement(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<ApiResponse<UploadResult>>("/api/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (!data.success) throw new Error(data.error ?? "Upload failed");
  return data.data!;
}

export async function fetchUploads(): Promise<Upload[]> {
  const { data } = await api.get<ApiResponse<Upload[]>>("/api/uploads");
  return data.data ?? [];
}

export async function deleteUpload(id: number): Promise<void> {
  const { data } = await api.delete<ApiResponse<null>>(`/api/uploads/${id}`);
  if (!data.success) throw new Error(data.error ?? "Delete failed");
}

export async function fetchWallets(): Promise<Wallet[]> {
  const { data } = await api.get<ApiResponse<Wallet[]>>("/api/wallets");
  return data.data ?? [];
}

export async function addWallet(address: string, label?: string): Promise<Wallet> {
  const { data } = await api.post<ApiResponse<Wallet>>("/api/wallets", { address, label });
  if (!data.success) throw new Error(data.error ?? "Failed to add wallet");
  return data.data!;
}

export async function deleteWallet(id: number): Promise<void> {
  const { data } = await api.delete<ApiResponse<null>>(`/api/wallets/${id}`);
  if (!data.success) throw new Error(data.error ?? "Delete failed");
}

export async function refreshWallet(id: number): Promise<WalletRefreshResult> {
  const { data } = await api.post<ApiResponse<WalletRefreshResult>>(`/api/wallets/${id}/refresh`);
  if (!data.success) throw new Error(data.error ?? "Refresh failed");
  return data.data!;
}

export async function refreshStockPrices(): Promise<{ updated: number }> {
  const { data } = await api.post<ApiResponse<{ updated: number }>>("/api/holdings/refresh-prices");
  if (!data.success) throw new Error(data.error ?? "Price refresh failed");
  return data.data!;
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export interface ExchangeRateData {
  base: string;
  rates: Record<string, number>;
  currencies: CurrencyInfo[];
}

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercentage: number;
  marketCap: number;
  sector: string;
  industry: string;
  description: string;
  ceo: string;
  website: string;
  exchange: string;
  currency: string;
  range: string;
  image: string;
  ipoDate: string;
  country: string;
}

export async function fetchCompanyProfile(ticker: string, exchCode?: string): Promise<CompanyProfile | null> {
  try {
    const params = exchCode ? `?exch=${exchCode}` : "";
    const { data } = await api.get<ApiResponse<CompanyProfile>>(`/api/company/${ticker}${params}`);
    return data.data ?? null;
  } catch {
    return null;
  }
}

export interface HistoricalPrice {
  date: string;
  price: number;
}

export async function fetchPriceHistory(ticker: string, exchCode?: string): Promise<HistoricalPrice[]> {
  try {
    const params = exchCode ? `?exch=${exchCode}` : "";
    const { data } = await api.get<ApiResponse<HistoricalPrice[]>>(`/api/company/${ticker}/history${params}`);
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchExchangeRates(base: string = "USD"): Promise<ExchangeRateData> {
  const { data } = await api.get<ApiResponse<ExchangeRateData>>(`/api/exchange-rates?base=${base}`);
  return data.data!;
}
