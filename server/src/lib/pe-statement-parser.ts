import Anthropic from "@anthropic-ai/sdk";

/**
 * Parsed output from a PE fund capital account statement.
 * All monetary values are in the statement's native currency.
 */
export interface ParsedPEStatement {
  fund_name: string | null;
  gp_name: string | null;
  currency: string;
  committed_capital: number | null;
  called_capital: number | null;
  distributed_capital: number | null;
  nav: number | null;
  vintage_year: number | null;
  strategy: string | null;
  statement_date: string | null;
}

const PE_EXTRACTION_PROMPT = `You are analyzing a private equity fund capital account statement for an individual investor (limited partner).

This document will typically contain:
- A "Commitment" section showing: commitment amount, paid-in (called) capital, unfunded/uncalled amount
- A "Capital Account" section showing: drawn capital, distributions, gains/losses, fees, and ending NAV

IMPORTANT: The document may show BOTH fund-level totals AND the individual investor's share. You must extract ONLY the individual investor's numbers (the column for the specific person, not the whole fund).

Extract the following from the INVESTOR's column (not the fund column):

Return ONLY a JSON object (not an array) with these fields:
- "fund_name": string or null — the full fund name from the document header
- "gp_name": string or null — the GP or management company name if shown
- "currency": string — 3-letter currency code (e.g. "GBP", "USD", "EUR")
- "committed_capital": number or null — the investor's total commitment amount (positive number)
- "called_capital": number or null — "Paid in Capital" or "Drawn Capital" (positive number, even if shown in parentheses in the document)
- "distributed_capital": number or null — "Distributions to Investors" or "Distributions" (positive number, even if shown as 0)
- "nav": number or null — "Ending NAV" or "Net Asset Value" — the investor's current residual value
- "vintage_year": number or null — the fund's vintage year if mentioned, or the year from inception date
- "strategy": string or null — one of "buyout", "growth", "venture", "secondaries", "co_investment", "other" if identifiable from fund name or document context
- "statement_date": string or null — the "as of" date in YYYY-MM-DD format

Rules:
- All monetary values should be POSITIVE numbers (remove parentheses, minus signs)
- called_capital = the amount actually drawn/paid in by the investor
- nav = the ending/current net asset value for the investor's share
- If the document shows "Unfunded Commitment" instead of "Called Capital", you can compute: called = committed - unfunded
- Extract from the INVESTOR column, not the fund-level column`;

export async function parsePEStatement(fileBuffer: Buffer): Promise<ParsedPEStatement> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required for PE statement parsing");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const base64 = fileBuffer.toString("base64");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          { type: "text", text: PE_EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response from Claude");

  return parseJsonResponse(textBlock.text);
}

function parseJsonResponse(raw: string): ParsedPEStatement {
  let jsonStr = raw.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

  const numOrNull = (v: unknown): number | null => {
    if (typeof v === "number" && !isNaN(v)) return Math.abs(v);
    return null;
  };

  const strOrNull = (v: unknown): string | null => {
    if (typeof v === "string" && v.trim()) return v.trim();
    return null;
  };

  return {
    fund_name: strOrNull(parsed.fund_name),
    gp_name: strOrNull(parsed.gp_name),
    currency: typeof parsed.currency === "string" ? parsed.currency.toUpperCase() : "USD",
    committed_capital: numOrNull(parsed.committed_capital),
    called_capital: numOrNull(parsed.called_capital),
    distributed_capital: numOrNull(parsed.distributed_capital),
    nav: numOrNull(parsed.nav),
    vintage_year: typeof parsed.vintage_year === "number" ? parsed.vintage_year : null,
    strategy: strOrNull(parsed.strategy),
    statement_date: strOrNull(parsed.statement_date),
  };
}
