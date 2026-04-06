import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPortfolioSummary, fetchHoldings, fetchUploads, uploadStatement, deleteUpload,
  fetchWallets, addWallet, deleteWallet, refreshWallet, refreshStockPrices,
  fetchSectorAllocation, fetchGeographyAllocation,
} from "../services/api";

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
    mutationFn: uploadStatement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "summary"] });
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
