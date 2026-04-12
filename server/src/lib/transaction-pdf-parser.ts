import Anthropic from "@anthropic-ai/sdk";
import type { ParsedTransaction } from "../types/index.js";

const TRANSACTION_PROMPT = `Extract ALL individual transactions from this bank or credit card statement.

Return ONLY a JSON array with no other text. One entry per transaction line item.

For each transaction, extract:
- "date": the TRANSACTION date (when the purchase actually happened), NOT the booking/posting date. Format as YYYY-MM-DD. If the statement only shows DD.MM (no year), infer the year from the statement date or header.
- "description": the full merchant/description text as printed
- "merchant": the cleaned merchant name if identifiable (e.g. "Starbucks" from "STARBUCKS 12345 ZURICH", "Coop" from "Coop-2293 Baden Ba , Baden"), otherwise null
- "amount": the signed amount — POSITIVE for money coming IN (income, credits, refunds), NEGATIVE for money going OUT (expenses, debits, purchases)
- "currency": 3-letter currency code (e.g. "CHF", "EUR", "USD"). Always use the statement's HOME currency for the amount (i.e. the converted amount that was actually charged), NOT the original foreign currency.

Rules:
- Extract every real purchase/payment transaction. Do NOT summarize or aggregate.
- If the statement shows separate debit/credit columns (e.g. "Belastungen" and "Gutschriften"), a debit = negative amount, credit = positive amount.
- SKIP these non-transaction rows entirely — do NOT include them:
  - Balance carry-forwards (e.g. "Saldovortrag", "Balance brought forward")
  - Card payments / bill payments (e.g. "Ihre Zahlung", "Payment received", "Zahlung erhalten")
  - Rounding adjustments (e.g. "Rundung")
  - Totals, subtotals, section headers, card numbers
- Foreign-currency purchases: use the HOME CURRENCY amount (the converted amount actually charged to the account), not the original foreign amount. For example, if a EUR 25.94 purchase was charged as CHF 25.39, use amount: -25.39 and currency: "CHF".
- Skip rows without a real date or amount.

Example output:
[
  {"date": "2025-08-20", "description": "LS UNO Espressobar Bad , Baden", "merchant": "UNO Espressobar", "amount": -6.40, "currency": "CHF"},
  {"date": "2025-08-26", "description": "PADDLE.NET* N8N CLOUD1 , LISBOA , Portugal", "merchant": "n8n", "amount": -25.39, "currency": "CHF"}
]`;

type SupportedMediaType = "application/pdf" | "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export async function parseTransactionPdf(fileBuffer: Buffer, mediaType: SupportedMediaType = "application/pdf"): Promise<ParsedTransaction[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set — cannot parse PDF transactions");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const base64 = fileBuffer.toString("base64");

  const isPdf = mediaType === "application/pdf";
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          isPdf
            ? { type: "document" as const, source: { type: "base64" as const, media_type: mediaType, data: base64 } }
            : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType, data: base64 } },
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
