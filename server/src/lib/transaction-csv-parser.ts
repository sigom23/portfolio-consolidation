import type { ParsedTransaction } from "../types/index.js";

// Flexible column name matching for transaction CSVs
const COLUMN_MAP: Record<string, string[]> = {
  transaction_date: [
    "transaction_date", "trans_date", "trans date", "transaction date",
    "date", "datum", "purchase_date", "purchase date",
    "valuta", "value_date", "value date",
  ],
  booking_date: [
    "booking_date", "booking date", "buchungsdatum", "buchung", "posted_date", "posted date",
    "post date", "date posted",
  ],
  description: [
    "description", "beschreibung", "verwendungszweck", "text", "narration",
    "details", "reference", "memo", "merchant", "payee", "vendor", "name",
    "transaction_description", "transaction description", "buchungstext",
  ],
  amount: [
    "amount", "betrag", "value", "sum", "total", "importo", "montant",
    "debit", "credit", "belastung", "gutschrift",
  ],
  debit: ["debit", "belastung", "out", "withdrawal", "soll"],
  credit: ["credit", "gutschrift", "in", "deposit", "haben"],
  currency: ["currency", "waehrung", "ccy", "curr", "cur"],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
}

function matchColumn(header: string, field: string): boolean {
  const normalized = normalizeHeader(header);
  return (COLUMN_MAP[field] ?? []).some((alias) => normalizeHeader(alias) === normalized);
}

function parseCsvLines(text: string): string[][] {
  // Handle both \r\n and \n. Preserve quoted fields with commas/newlines.
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === "," || ch === ";" || ch === "\t") {
      current.push(field);
      field = "";
      continue;
    }

    if (ch === "\n" || ch === "\r") {
      if (field.length > 0 || current.length > 0) {
        current.push(field);
        rows.push(current);
        current = [];
        field = "";
      }
      // Swallow \r\n pair
      if (ch === "\r" && text[i + 1] === "\n") i++;
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function detectDelimiter(firstLine: string): "," | ";" | "\t" {
  const counts = {
    ",": (firstLine.match(/,/g) ?? []).length,
    ";": (firstLine.match(/;/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
  };
  if (counts[";"] > counts[","]) return ";";
  if (counts["\t"] > counts[","]) return "\t";
  return ",";
}

function parseAmount(s: string): number {
  if (!s) return 0;
  // Strip currency symbols, letters, spaces. Keep digits, . , - + parens
  let cleaned = s.replace(/[^0-9.,\-+()]/g, "").trim();
  if (!cleaned) return 0;

  // Parenthesized negatives: (123.45) -> -123.45
  let negative = false;
  if (/^\(.*\)$/.test(cleaned)) {
    negative = true;
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.startsWith("-")) {
    negative = !negative;
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // Decide decimal separator: if both , and . appear, the rightmost is the decimal.
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // European: 1.234,56
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // US: 1,234.56
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    // Only comma: could be 1,234 (thousands) or 1,23 (decimal). If 1–2 digits after comma, treat as decimal.
    const decimalPart = cleaned.slice(lastComma + 1);
    if (/^\d{1,2}$/.test(decimalPart)) {
      cleaned = cleaned.replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  }

  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  return negative ? -n : n;
}

function parseDate(s: string): string | null {
  if (!s) return null;
  const trimmed = s.trim();

  // ISO YYYY-MM-DD
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY (European)
  const eu = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/.exec(trimmed);
  if (eu) {
    let [, d, m, y] = eu;
    if (y.length === 2) y = (parseInt(y, 10) > 50 ? "19" : "20") + y;
    // Heuristic: if first number > 12, it must be day
    const first = parseInt(d, 10);
    const second = parseInt(m, 10);
    if (first > 12) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    // Default European DD/MM/YYYY
    if (second > 12) {
      // must be month first then — US style
      return `${y}-${d.padStart(2, "0")}-${m.padStart(2, "0")}`;
    }
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

export function parseTransactionCsv(buffer: Buffer): ParsedTransaction[] {
  // Strip BOM if present
  let text = buffer.toString("utf-8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const firstNewline = text.indexOf("\n");
  const firstLine = firstNewline === -1 ? text : text.slice(0, firstNewline);
  const delimiter = detectDelimiter(firstLine);
  // Re-parse with the right delimiter by replacing it with a canonical one isn't needed;
  // parseCsvLines already handles ",", ";", and "\t"
  void delimiter;

  const rows = parseCsvLines(text);
  if (rows.length < 2) {
    throw new Error("CSV must have a header row and at least one transaction row");
  }

  // Find the header row — most files start with it, but some banks have metadata preamble
  let headerIndex = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    const hasDate = row.some((c) => matchColumn(c, "transaction_date") || matchColumn(c, "booking_date"));
    const hasAmount = row.some(
      (c) => matchColumn(c, "amount") || matchColumn(c, "debit") || matchColumn(c, "credit")
    );
    if (hasDate && hasAmount) {
      headerIndex = i;
      break;
    }
  }

  const headers = rows[headerIndex];
  const dataRows = rows.slice(headerIndex + 1);

  // Identify column indices by trying each field
  const colIndex = (field: string): number => headers.findIndex((h) => matchColumn(h, field));

  const iTxDate = colIndex("transaction_date");
  const iBookDate = colIndex("booking_date");
  const iDescription = colIndex("description");
  const iAmount = colIndex("amount");
  const iDebit = colIndex("debit");
  const iCredit = colIndex("credit");
  const iCurrency = colIndex("currency");

  if (iDescription === -1) {
    throw new Error("Could not find a description column (description / beschreibung / verwendungszweck / text)");
  }
  if (iAmount === -1 && iDebit === -1 && iCredit === -1) {
    throw new Error("Could not find an amount column (amount / betrag / debit / credit)");
  }
  if (iTxDate === -1 && iBookDate === -1) {
    throw new Error("Could not find a date column (transaction_date / booking_date / datum)");
  }

  const results: ParsedTransaction[] = [];

  for (const row of dataRows) {
    const rawDate = iTxDate !== -1 ? row[iTxDate] : row[iBookDate];
    const date = parseDate(rawDate ?? "");
    if (!date) continue;

    const description = (row[iDescription] ?? "").trim();
    if (!description) continue;

    let amount = 0;
    if (iAmount !== -1) {
      amount = parseAmount(row[iAmount] ?? "");
    } else {
      // Separate debit/credit columns
      const debit = iDebit !== -1 ? parseAmount(row[iDebit] ?? "") : 0;
      const credit = iCredit !== -1 ? parseAmount(row[iCredit] ?? "") : 0;
      // Debit is money out; credit is money in
      amount = credit - Math.abs(debit);
    }

    if (amount === 0) continue;

    const currency = iCurrency !== -1 ? (row[iCurrency] ?? "").trim().toUpperCase() : "CHF";

    results.push({
      date,
      description,
      merchant: description, // parser is naive; categorizer handles normalization
      amount,
      currency: currency || "CHF",
    });
  }

  return results;
}
