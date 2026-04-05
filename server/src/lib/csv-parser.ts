import type { ParsedHolding } from "../types/index.js";

const VALID_ASSET_TYPES = ["stocks", "crypto", "bonds", "cash", "other"] as const;

// Flexible column name matching
const COLUMN_MAP: Record<string, string[]> = {
  name: ["name", "asset", "account", "description", "security", "holding", "asset_name", "account_name"],
  ticker: ["ticker", "symbol", "code", "asset_code", "ticker_symbol"],
  asset_type: ["asset_type", "type", "category", "asset_class", "class"],
  quantity: ["quantity", "qty", "shares", "units", "amount", "balance"],
  value_usd: ["value_usd", "value", "market_value", "total_value", "balance_usd", "total", "usd_value", "worth"],
  currency: ["currency", "ccy", "curr"],
};

function matchColumn(header: string, field: string): boolean {
  const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
  return COLUMN_MAP[field]?.includes(normalized) ?? false;
}

function parseRow(headers: string[], values: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    for (const [field, _aliases] of Object.entries(COLUMN_MAP)) {
      if (matchColumn(header, field)) {
        row[field] = values[i]?.trim() ?? "";
        break;
      }
    }
  }
  return row;
}

function parseCsvLines(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current);
    return values;
  });
}

export function parseCsv(fileBuffer: Buffer): ParsedHolding[] {
  const text = fileBuffer.toString("utf-8");
  const rows = parseCsvLines(text);

  if (rows.length < 2) {
    throw new Error("CSV must have a header row and at least one data row");
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Check we can match at least "name" or "value"
  const hasName = headers.some((h) => matchColumn(h, "name"));
  const hasValue = headers.some((h) => matchColumn(h, "value_usd"));
  if (!hasName && !hasValue) {
    throw new Error(
      "CSV headers not recognized. Expected columns like: name, ticker, asset_type, quantity, value_usd, currency"
    );
  }

  const results: ParsedHolding[] = [];
  for (const values of dataRows) {
    const row = parseRow(headers, values);
    if (!row.name && !row.value_usd) continue;

    const assetType = (row.asset_type ?? "other").toLowerCase();
    const numericValue = parseFloat(row.value_usd?.replace(/[$,]/g, "") ?? "0");
    const numericQty = row.quantity ? parseFloat(row.quantity.replace(/[,]/g, "")) : null;

    results.push({
      name: row.name || "Unknown",
      ticker: row.ticker || null,
      asset_type: (VALID_ASSET_TYPES.includes(assetType as typeof VALID_ASSET_TYPES[number])
        ? assetType
        : "other") as ParsedHolding["asset_type"],
      quantity: numericQty !== null && !isNaN(numericQty) ? numericQty : null,
      value_usd: !isNaN(numericValue) ? numericValue : 0,
      currency: row.currency || "USD",
    });
  }
  return results;
}
