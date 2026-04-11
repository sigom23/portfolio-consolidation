import axios from "axios";
import type {
  User, PortfolioSummary, Holding, Upload, UploadResult, Wallet, WalletRefreshResult, ApiResponse,
  IncomeStream, Transaction, NewIncomeStream, CashFlowSummary, NewTransaction,
  PropertyWithDetails, Property, PropertyMortgage, PropertyCost,
  NewProperty, NewMortgage, NewPropertyCost,
  IlliquidAsset, NewIlliquidAsset,
} from "../types";

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

export async function uploadStatement(
  file: File,
  kind: "wealth" | "transactions" = "wealth"
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);
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

export interface SectorAllocation {
  name: string;
  value: number;
}

export async function fetchSectorAllocation(): Promise<SectorAllocation[]> {
  try {
    const { data } = await api.get<ApiResponse<SectorAllocation[]>>("/api/holdings/sector-allocation");
    return data.data ?? [];
  } catch {
    return [];
  }
}

export interface GeographyAllocation {
  name: string;
  value: number;
}

export async function fetchGeographyAllocation(): Promise<GeographyAllocation[]> {
  try {
    const { data } = await api.get<ApiResponse<GeographyAllocation[]>>("/api/holdings/geography-allocation");
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function deleteAccount(): Promise<void> {
  await api.delete("/api/account");
  window.location.href = "/";
}

export function exportUserData(): void {
  window.location.href = "/api/account/export";
}

export async function clearAllHoldings(): Promise<{ deleted: number }> {
  const { data } = await api.delete<ApiResponse<{ deleted: number }>>("/api/account/holdings");
  if (!data.success) throw new Error(data.error ?? "Failed to clear holdings");
  return data.data!;
}

export async function fetchExchangeRates(base: string = "USD"): Promise<ExchangeRateData> {
  const { data } = await api.get<ApiResponse<ExchangeRateData>>(`/api/exchange-rates?base=${base}`);
  return data.data!;
}

// Income streams
export async function fetchIncomeStreams(): Promise<IncomeStream[]> {
  const { data } = await api.get<ApiResponse<IncomeStream[]>>("/api/income/streams");
  return data.data ?? [];
}

export async function createIncomeStream(stream: NewIncomeStream): Promise<IncomeStream> {
  const { data } = await api.post<ApiResponse<{ stream: IncomeStream; eventsCreated: number }>>(
    "/api/income/streams",
    stream
  );
  if (!data.success) throw new Error(data.error ?? "Failed to create stream");
  return data.data!.stream;
}

export async function updateIncomeStream(id: number, updates: Partial<NewIncomeStream>): Promise<IncomeStream> {
  const { data } = await api.put<ApiResponse<IncomeStream>>(`/api/income/streams/${id}`, updates);
  if (!data.success) throw new Error(data.error ?? "Failed to update stream");
  return data.data!;
}

export async function deleteIncomeStream(id: number): Promise<void> {
  const { data } = await api.delete<ApiResponse<null>>(`/api/income/streams/${id}`);
  if (!data.success) throw new Error(data.error ?? "Failed to delete stream");
}

export async function fetchTransactions(options: { sign?: "income" | "expense"; limit?: number } = {}): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (options.sign) params.set("sign", options.sign);
  if (options.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  const { data } = await api.get<ApiResponse<Transaction[]>>(`/api/transactions${qs ? `?${qs}` : ""}`);
  return data.data ?? [];
}

export async function createManualTransaction(tx: NewTransaction): Promise<Transaction> {
  const { data } = await api.post<ApiResponse<Transaction>>("/api/transactions", tx);
  if (!data.success) throw new Error(data.error ?? "Failed to create transaction");
  return data.data!;
}

export async function updateTransactionCategory(id: number, category: string): Promise<Transaction> {
  const { data } = await api.put<ApiResponse<Transaction>>(`/api/transactions/${id}`, { category });
  if (!data.success) throw new Error(data.error ?? "Failed to update transaction");
  return data.data!;
}

export async function deleteTransaction(id: number): Promise<void> {
  const { data } = await api.delete<ApiResponse<null>>(`/api/transactions/${id}`);
  if (!data.success) throw new Error(data.error ?? "Failed to delete transaction");
}

export async function fetchCashFlowSummary(month?: string): Promise<CashFlowSummary> {
  const qs = month ? `?month=${month}` : "";
  const { data } = await api.get<ApiResponse<CashFlowSummary>>(`/api/cashflow/summary${qs}`);
  return data.data!;
}

// Real Estate
export async function fetchProperties(): Promise<PropertyWithDetails[]> {
  const { data } = await api.get<ApiResponse<PropertyWithDetails[]>>("/api/properties");
  return data.data ?? [];
}

export async function createProperty(input: NewProperty): Promise<Property> {
  const { data } = await api.post<ApiResponse<Property>>("/api/properties", input);
  if (!data.success) throw new Error(data.error ?? "Failed to create property");
  return data.data!;
}

export async function updateProperty(id: number, updates: Partial<NewProperty>): Promise<Property> {
  const { data } = await api.put<ApiResponse<Property>>(`/api/properties/${id}`, updates);
  if (!data.success) throw new Error(data.error ?? "Failed to update property");
  return data.data!;
}

export async function deleteProperty(id: number): Promise<void> {
  const { data } = await api.delete<ApiResponse<null>>(`/api/properties/${id}`);
  if (!data.success) throw new Error(data.error ?? "Failed to delete property");
}

export async function createMortgage(propertyId: number, input: NewMortgage): Promise<PropertyMortgage> {
  const { data } = await api.post<ApiResponse<PropertyMortgage>>(`/api/properties/${propertyId}/mortgages`, input);
  if (!data.success) throw new Error(data.error ?? "Failed to create mortgage");
  return data.data!;
}

export async function updateMortgage(id: number, updates: Partial<NewMortgage>): Promise<PropertyMortgage> {
  const { data } = await api.put<ApiResponse<PropertyMortgage>>(`/api/mortgages/${id}`, updates);
  if (!data.success) throw new Error(data.error ?? "Failed to update mortgage");
  return data.data!;
}

export async function deleteMortgage(id: number): Promise<void> {
  const { data } = await api.delete<ApiResponse<null>>(`/api/mortgages/${id}`);
  if (!data.success) throw new Error(data.error ?? "Failed to delete mortgage");
}

export async function createPropertyCost(propertyId: number, input: NewPropertyCost): Promise<PropertyCost> {
  const { data } = await api.post<ApiResponse<PropertyCost>>(`/api/properties/${propertyId}/costs`, input);
  if (!data.success) throw new Error(data.error ?? "Failed to create cost");
  return data.data!;
}

export async function updatePropertyCost(id: number, updates: Partial<NewPropertyCost>): Promise<PropertyCost> {
  const { data } = await api.put<ApiResponse<PropertyCost>>(`/api/property-costs/${id}`, updates);
  if (!data.success) throw new Error(data.error ?? "Failed to update cost");
  return data.data!;
}

export async function deletePropertyCost(id: number): Promise<void> {
  const { data } = await api.delete<ApiResponse<null>>(`/api/property-costs/${id}`);
  if (!data.success) throw new Error(data.error ?? "Failed to delete cost");
}

// Illiquid Assets
export async function fetchIlliquidAssets(): Promise<IlliquidAsset[]> {
  const { data } = await api.get<ApiResponse<IlliquidAsset[]>>("/api/illiquid");
  return data.data ?? [];
}

export async function createIlliquidAsset(input: NewIlliquidAsset): Promise<IlliquidAsset> {
  const { data } = await api.post<ApiResponse<IlliquidAsset>>("/api/illiquid", input);
  if (!data.success) throw new Error(data.error ?? "Failed to create illiquid asset");
  return data.data!;
}

export async function deleteIlliquidAsset(id: number): Promise<void> {
  const { data } = await api.delete<ApiResponse<null>>(`/api/illiquid/${id}`);
  if (!data.success) throw new Error(data.error ?? "Failed to delete illiquid asset");
}
