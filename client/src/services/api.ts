import axios from "axios";
import type { User, PortfolioSummary, Holding, Upload, UploadResult, ApiResponse } from "../types";

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
