import Anthropic from "@anthropic-ai/sdk";
import type { ParsedTransaction } from "../types/index.js";

const SALARY_PROMPT = `Extract the salary/income information from this pay slip or salary statement.

Return ONLY a JSON array with no other text. Typically one entry per pay period on the document.

For each pay period found, extract:
- "date": the payment date or pay period end date. Format as YYYY-MM-DD. If only a month/year is shown (e.g. "March 2026"), use the last day of that month.
- "description": a short description combining the employer name and pay period, e.g. "Salary - Acme GmbH - March 2026"
- "merchant": the employer name if identifiable, otherwise null
- "amount": the NET pay amount (what was actually deposited). Must be POSITIVE. If only gross is shown and no net, use gross.
- "currency": 3-letter currency code (e.g. "CHF", "EUR", "USD"). Infer from the document.

Rules:
- Extract only the net pay (take-home amount), not individual deduction lines.
- If the document contains multiple pay periods (e.g. an annual summary), extract one entry per period.
- If you see both gross and net, always prefer net.
- Skip any non-salary items like expense reimbursements unless they are part of the net pay.
- The amount must always be positive — this represents income.

Example output:
[
  {"date": "2026-03-25", "description": "Salary - Acme GmbH - March 2026", "merchant": "Acme GmbH", "amount": 7500.00, "currency": "CHF"}
]`;

type SupportedMediaType = "application/pdf" | "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export async function parseSalaryPdf(fileBuffer: Buffer, mediaType: SupportedMediaType = "application/pdf"): Promise<ParsedTransaction[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set — cannot parse salary statement");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const base64 = fileBuffer.toString("base64");

  const isPdf = mediaType === "application/pdf";
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          isPdf
            ? { type: "document" as const, source: { type: "base64" as const, media_type: mediaType, data: base64 } }
            : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType, data: base64 } },
          { type: "text", text: SALARY_PROMPT },
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
    let amount = typeof t.amount === "number" ? t.amount : 0;
    if (!date || !description || amount === 0) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    // Ensure positive — salary is income
    amount = Math.abs(amount);

    const merchant = typeof t.merchant === "string" && t.merchant.trim() !== "" ? t.merchant.trim() : null;
    const currency = typeof t.currency === "string" && t.currency.trim() !== ""
      ? t.currency.trim().toUpperCase()
      : "CHF";

    results.push({ date, description, merchant, amount, currency });
  }

  return results;
}
