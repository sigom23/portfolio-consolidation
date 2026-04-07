import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { ParsedHolding } from "../types/index.js";

const VALID_ASSET_TYPES = ["stocks", "crypto", "bonds", "cash", "other"] as const;

const EXTRACTION_PROMPT = `Extract all financial holdings, positions, and account balances from this bank statement.

Return ONLY a JSON array with no other text. Each item should have these fields:
- "name": string — the name of the asset or account (e.g. "Checking Account", "Apple Inc.", "Bitcoin")
- "ticker": string or null — ticker symbol if applicable (e.g. "AAPL", "BTC", null for bank accounts)
- "isin": string or null — ISIN code if shown in the document (e.g. "US0378331005" for Apple). Extract this exactly as printed.
- "asset_type": one of "stocks", "crypto", "bonds", "cash", "other"
- "quantity": number or null — number of shares/units, null for cash accounts
- "value": number — the market value as stated in the document, in the currency shown for that line item
- "currency": string — the currency code for this holding's value (e.g. "USD", "CHF", "EUR"). Use the per-line currency if available, otherwise use the statement's base currency.

IMPORTANT: Use the value exactly as shown in the document. Do NOT convert currencies. If a CHF statement shows a USD stock valued at CHF 10,000, use value 10000 and currency "CHF". If the document shows the value in the stock's native currency (e.g. USD), use that currency.

For bank accounts (checking, savings, liquidity), use asset_type "cash" with the balance as value.

Example output:
[{"name": "Apple Inc.", "ticker": "AAPL", "isin": "US0378331005", "asset_type": "stocks", "quantity": 10, "value": 1750.00, "currency": "USD"}]`;

export async function parsePdf(fileBuffer: Buffer): Promise<ParsedHolding[]> {
  // Try Anthropic first, fall back to OpenAI
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await parsePdfWithAnthropic(fileBuffer);
    } catch (err) {
      console.warn("Anthropic PDF parsing failed, trying OpenAI:", err instanceof Error ? err.message : err);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    return await parsePdfWithOpenAI(fileBuffer);
  }

  throw new Error("No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
}

async function parsePdfWithAnthropic(fileBuffer: Buffer): Promise<ParsedHolding[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const base64 = fileBuffer.toString("base64");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response from Claude");

  return parseJsonResponse(textBlock.text);
}

async function parsePdfWithOpenAI(fileBuffer: Buffer): Promise<ParsedHolding[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  let response;
  try {
    // Upload file to OpenAI first
    const file = await client.files.create({
      file: new File([fileBuffer], "statement.pdf", { type: "application/pdf" }),
      purpose: "assistants",
    });

    response = await client.chat.completions.create({
      model: "gpt-5.4-nano",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              file: { file_id: file.id },
            } as never,
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    // Clean up uploaded file
    await client.files.delete(file.id).catch(() => {});
  } catch (apiError) {
    console.error("OpenAI API error:", apiError);
    throw new Error(`OpenAI API call failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
  }

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("No response from OpenAI");

  return parseJsonResponse(text);
}

function parseJsonResponse(raw: string): ParsedHolding[] {
  let jsonStr = raw.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed: unknown[] = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    throw new Error("Response is not an array");
  }

  return parsed.map((item: unknown) => {
    const h = item as Record<string, unknown>;
    const assetType = String(h.asset_type ?? "other").toLowerCase();
    // Support both "value" (new) and "value_usd" (legacy) fields
    const rawValue = typeof h.value === "number" ? h.value : (typeof h.value_usd === "number" ? h.value_usd : 0);
    return {
      name: String(h.name ?? "Unknown"),
      ticker: h.ticker ? String(h.ticker) : null,
      isin: h.isin ? String(h.isin) : null,
      asset_type: (VALID_ASSET_TYPES.includes(assetType as typeof VALID_ASSET_TYPES[number])
        ? assetType
        : "other") as ParsedHolding["asset_type"],
      quantity: typeof h.quantity === "number" ? h.quantity : null,
      value_usd: rawValue,
      currency: String(h.currency ?? "USD"),
    };
  });
}
