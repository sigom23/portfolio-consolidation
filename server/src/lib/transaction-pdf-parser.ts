import Anthropic from "@anthropic-ai/sdk";
import type { ParsedTransaction } from "../types/index.js";

const TRANSACTION_PROMPT = `Extract ALL individual transactions from this bank or credit card statement.

Return ONLY a JSON array with no other text. One entry per transaction line item.

For each transaction, extract:
- "date": the TRANSACTION date (when the purchase actually happened), NOT the booking/posting date. Format as YYYY-MM-DD. If only one date is shown, use it.
- "description": the full merchant/description text as printed
- "merchant": the cleaned merchant name if identifiable (e.g. "Starbucks" from "STARBUCKS 12345 ZURICH"), otherwise null
- "amount": the signed amount — POSITIVE for money coming IN (income, credits, refunds), NEGATIVE for money going OUT (expenses, debits, purchases)
- "currency": 3-letter currency code (e.g. "CHF", "EUR", "USD"). Use the per-line currency if shown, otherwise the statement currency.

Rules:
- Extract every transaction. Do NOT summarize or aggregate.
- If the statement shows separate debit and credit columns, a debit = negative amount, credit = positive amount.
- Card payments shown as "PAYMENT RECEIVED" or similar are positive (they reduce your debt).
- Foreign-currency purchases: use the ORIGINAL transaction currency if shown, not the converted home-currency value.
- Skip section headers, totals, subtotals, balances.
- Skip rows without a real date or amount.

Example output:
[
  {"date": "2026-03-15", "description": "STARBUCKS 12345 ZURICH", "merchant": "Starbucks", "amount": -8.50, "currency": "CHF"},
  {"date": "2026-03-16", "description": "SALARY PAYMENT ACME GMBH", "merchant": "Acme Gmbh", "amount": 5000.00, "currency": "CHF"}
]`;

export async function parseTransactionPdf(fileBuffer: Buffer): Promise<ParsedTransaction[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set — cannot parse PDF transactions");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const base64 = fileBuffer.toString("base64");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          { type: "text", text: TRANSACTION_PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response from Claude");

  return parseJsonResponse(textBlock.text);
}

function parseJsonResponse(raw: string): ParsedTransaction[] {
  let jsonStr = raw.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed: unknown[] = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error("Response is not an array");

  const results: ParsedTransaction[] = [];
  for (const item of parsed) {
    const t = item as Record<string, unknown>;
    const date = typeof t.date === "string" ? t.date.trim() : "";
    const description = typeof t.description === "string" ? t.description.trim() : "";
    const amount = typeof t.amount === "number" ? t.amount : 0;
    if (!date || !description || amount === 0) continue;

    // Validate/normalize date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const merchant = typeof t.merchant === "string" && t.merchant.trim() !== "" ? t.merchant.trim() : null;
    const currency = typeof t.currency === "string" && t.currency.trim() !== ""
      ? t.currency.trim().toUpperCase()
      : "CHF";

    results.push({ date, description, merchant, amount, currency });
  }

  return results;
}
