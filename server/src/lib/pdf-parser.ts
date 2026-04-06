import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { ParsedHolding } from "../types/index.js";

const VALID_ASSET_TYPES = ["stocks", "crypto", "bonds", "cash", "other"] as const;

const EXTRACTION_PROMPT = `Extract all financial holdings, positions, and account balances from this bank statement.

Return ONLY a JSON array with no other text. Each item should have these fields:
- "name": string — the name of the asset or account (e.g. "Checking Account", "Apple Inc.", "Bitcoin")
- "ticker": string or null — ticker symbol if applicable (e.g. "AAPL", "BTC", null for bank accounts)
- "asset_type": one of "stocks", "crypto", "bonds", "cash", "other"
- "quantity": number or null — number of shares/units, null for cash accounts
- "value_usd": number — the value in USD
- "currency": string — the currency code (usually "USD")

For bank accounts (checking, savings), use asset_type "cash" with the balance as value_usd.

Example output:
[{"name": "Checking Account", "ticker": null, "asset_type": "cash", "quantity": null, "value_usd": 5432.10, "currency": "USD"}]`;

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
  const base64 = fileBuffer.toString("base64");

  const response = await client.chat.completions.create({
    model: "gpt-5.4-nano",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:application/pdf;base64,${base64}` },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

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
