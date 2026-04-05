export interface User {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
}

export interface Holding {
  id: number;
  name: string;
  ticker: string | null;
  asset_type: string | null;
  quantity: number | null;
  value_usd: number | null;
  source_type: string;
}

export interface PortfolioSummary {
  totalValue: number;
  breakdown: {
    stocks: number;
    crypto: number;
    bonds: number;
    cash: number;
    other: number;
  };
}

export interface Upload {
  id: number;
  filename: string | null;
  file_type: string | null;
  uploaded_at: string;
  status: string;
}

export interface UploadResult {
  upload: Upload;
  holdings: Holding[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
