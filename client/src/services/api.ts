import axios from "axios";
import type { User, PortfolioSummary, Holding, ApiResponse } from "../types";

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
