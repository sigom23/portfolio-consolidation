import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPortfolioSummary, fetchHoldings, fetchUploads, uploadStatement, deleteUpload,
  fetchWallets, addWallet, deleteWallet, refreshWallet, refreshStockPrices,
  fetchSectorAllocation, fetchGeographyAllocation,
  fetchIncomeStreams, createIncomeStream, updateIncomeStream, deleteIncomeStream,
  fetchTransactions, createManualTransaction, updateTransactionCategory, deleteTransaction,
  fetchCashFlowSummary,
  fetchProperties, createProperty, updateProperty, deleteProperty,
  createMortgage, updateMortgage, deleteMortgage,
  createPropertyCost, updatePropertyCost, deletePropertyCost,
  fetchIlliquidAssets, createIlliquidAsset, deleteIlliquidAsset,
} from "../services/api";
import type { NewIncomeStream, NewTransaction, NewProperty, NewMortgage, NewPropertyCost, NewIlliquidAsset } from "../types";

export function usePortfolioSummary() {
  return useQuery({
    queryKey: ["portfolio", "summary"],
    queryFn: fetchPortfolioSummary,
  });
}

export function useHoldings() {
  return useQuery({
    queryKey: ["holdings"],
    queryFn: fetchHoldings,
  });
}

export function useUploads() {
  return useQuery({
    queryKey: ["uploads"],
    queryFn: fetchUploads,
  });
}

export function useUploadStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, kind = "wealth" }: { file: File; kind?: "wealth" | "transactions" }) =>
      uploadStatement(file, kind),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow-summary"] });
    },
  });
}

export function useDeleteUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUpload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "summary"] });
    },
  });
}

const walletInvalidations = ["wallets", "holdings", ["portfolio", "summary"]] as const;

function invalidateWalletQueries(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of walletInvalidations) {
    queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
  }
}

export function useWallets() {
  return useQuery({
    queryKey: ["wallets"],
    queryFn: fetchWallets,
  });
}

export function useAddWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ address, label }: { address: string; label?: string }) => addWallet(address, label),
    onSuccess: () => invalidateWalletQueries(queryClient),
  });
}

export function useDeleteWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWallet,
    onSuccess: () => invalidateWalletQueries(queryClient),
  });
}

export function useRefreshWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshWallet,
    onSuccess: () => invalidateWalletQueries(queryClient),
  });
}

export function useSectorAllocation() {
  return useQuery({
    queryKey: ["holdings", "sector-allocation"],
    queryFn: fetchSectorAllocation,
  });
}

export function useGeographyAllocation() {
  return useQuery({
    queryKey: ["holdings", "geography-allocation"],
    queryFn: fetchGeographyAllocation,
  });
}

export function useRefreshStockPrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshStockPrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "summary"] });
    },
  });
}

// Income streams
function invalidateCashflow(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["income-streams"] });
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
  queryClient.invalidateQueries({ queryKey: ["cashflow-summary"] });
}

export function useIncomeStreams() {
  return useQuery({
    queryKey: ["income-streams"],
    queryFn: fetchIncomeStreams,
  });
}

export function useCreateIncomeStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stream: NewIncomeStream) => createIncomeStream(stream),
    onSuccess: () => invalidateCashflow(queryClient),
  });
}

export function useUpdateIncomeStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<NewIncomeStream> }) =>
      updateIncomeStream(id, updates),
    onSuccess: () => invalidateCashflow(queryClient),
  });
}

export function useDeleteIncomeStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteIncomeStream(id),
    onSuccess: () => invalidateCashflow(queryClient),
  });
}

export function useTransactions(options: { sign?: "income" | "expense"; limit?: number } = {}) {
  return useQuery({
    queryKey: ["transactions", options],
    queryFn: () => fetchTransactions(options),
  });
}

export function useCashFlowSummary(month?: string) {
  return useQuery({
    queryKey: ["cashflow-summary", month ?? "all"],
    queryFn: () => fetchCashFlowSummary(month),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tx: NewTransaction) => createManualTransaction(tx),
    onSuccess: () => invalidateCashflow(queryClient),
  });
}

export function useUpdateTransactionCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, category }: { id: number; category: string }) =>
      updateTransactionCategory(id, category),
    onSuccess: () => invalidateCashflow(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTransaction(id),
    onSuccess: () => invalidateCashflow(queryClient),
  });
}

// Real Estate
function invalidateProperties(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["properties"] });
  queryClient.invalidateQueries({ queryKey: ["holdings"] });
  queryClient.invalidateQueries({ queryKey: ["portfolio", "summary"] });
}

export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: fetchProperties,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewProperty) => createProperty(input),
    onSuccess: () => invalidateProperties(queryClient),
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<NewProperty> }) =>
      updateProperty(id, updates),
    onSuccess: () => invalidateProperties(queryClient),
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProperty(id),
    onSuccess: () => invalidateProperties(queryClient),
  });
}

export function useCreateMortgage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, input }: { propertyId: number; input: NewMortgage }) =>
      createMortgage(propertyId, input),
    onSuccess: () => invalidateProperties(queryClient),
  });
}

export function useUpdateMortgage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<NewMortgage> }) =>
      updateMortgage(id, updates),
    onSuccess: () => invalidateProperties(queryClient),
  });
}

export function useDeleteMortgage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMortgage(id),
    onSuccess: () => invalidateProperties(queryClient),
  });
}

export function useCreatePropertyCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, input }: { propertyId: number; input: NewPropertyCost }) =>
      createPropertyCost(propertyId, input),
    onSuccess: () => invalidateProperties(queryClient),
  });
}

export function useUpdatePropertyCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<NewPropertyCost> }) =>
      updatePropertyCost(id, updates),
    onSuccess: () => invalidateProperties(queryClient),
  });
}

export function useDeletePropertyCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePropertyCost(id),
    onSuccess: () => invalidateProperties(queryClient),
  });
}

// Illiquid Assets
function invalidateIlliquid(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["illiquid"] });
  queryClient.invalidateQueries({ queryKey: ["holdings"] });
  queryClient.invalidateQueries({ queryKey: ["portfolio", "summary"] });
}

export function useIlliquidAssets() {
  return useQuery({
    queryKey: ["illiquid"],
    queryFn: fetchIlliquidAssets,
  });
}

export function useCreateIlliquidAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewIlliquidAsset) => createIlliquidAsset(input),
    onSuccess: () => invalidateIlliquid(queryClient),
  });
}

export function useDeleteIlliquidAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteIlliquidAsset(id),
    onSuccess: () => invalidateIlliquid(queryClient),
  });
}
