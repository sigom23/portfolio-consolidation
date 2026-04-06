import Anthropic from "@anthropic-ai/sdk";
import type { ParsedHolding } from "../types/index.js";

const VALID_ASSET_TYPES = ["stocks", "crypto", "bonds", "cash", "other"] as const;

export async function parsePdf(fileBuffer: Buffer): Promise<ParsedHolding[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });

  const base64 = fileBuffer.toString("base64");

  let response;
  try {
    response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: `Extract all financial holdings, positions, and account balances from this bank statement.

Return ONLY a JSON array with no other text. Each item should have these fields:
- "name": string — the name of the asset or account (e.g. "Checking Account", "Apple Inc.", "Bitcoin")
- "ticker": string or null — ticker symbol if applicable (e.g. "AAPL", "BTC", null for bank accounts)
- "asset_type": one of "stocks", "crypto", "bonds", "cash", "other"
- "quantity": number or null — number of shares/units, null for cash accounts
- "value_usd": number — the value in USD
- "currency": string — the currency code (usually "USD")

For bank accounts (checking, savings), use asset_type "cash" with the balance as value_usd.

Example output:
[{"name": "Checking Account", "ticker": null, "asset_type": "cash", "quantity": null, "value_usd": 5432.10, "currency": "USD"}]`,
          },
        ],
      },
    ],
  });
  } catch (apiError) {
    console.error("Claude API error:", apiError);
    throw new Error(`Claude API call failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = textBlock.text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed: unknown[] = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    throw new Error("Claude response is not an array");
  }

  return parsed.map((item: unknown) => {
    const h = item as Record<string, unknown>;
    const assetType = String(h.asset_type ?? "other").toLowerCase();
    return {
      name: String(h.name ?? "Unknown"),
      ticker: h.ticker ? String(h.ticker) : null,
      asset_type: (VALID_ASSET_TYPES.includes(assetType as typeof VALID_ASSET_TYPES[number])
        ? assetType
        : "other") as ParsedHolding["asset_type"],
      quantity: typeof h.quantity === "number" ? h.quantity : null,
      value_usd: typeof h.value_usd === "number" ? h.value_usd : 0,
      currency: String(h.currency ?? "USD"),
    };
  });
}
