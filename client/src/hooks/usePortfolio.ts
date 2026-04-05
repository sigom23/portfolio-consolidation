import { useQuery } from "@tanstack/react-query";
import { fetchPortfolioSummary, fetchHoldings } from "../services/api";

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
