import Anthropic from "@anthropic-ai/sdk";

export type DocumentKind = "salary" | "transactions" | "wealth" | "pe_statement";

const CLASSIFY_PROMPT = `Look at this document and classify it into exactly one of these categories:

- salary: Pay slip, salary statement, Lohnausweis, payroll summary, wage certificate
- transactions: Credit card statement, bank statement, or account statement with individual transaction line items (purchases, payments, fees)
- wealth: Portfolio or brokerage statement showing asset holdings (stocks, bonds, ETFs, cash positions, fund allocations)
- pe_statement: Private equity fund report, capital call notice, distribution notice, NAV statement for a fund

Reply with ONLY the category name (salary, transactions, wealth, or pe_statement). Nothing else.`;

export async function classifyDocument(
  fileBuffer: Buffer,
  mimetype: string
): Promise<{ detected_kind: DocumentKind }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set — cannot classify document");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const base64 = fileBuffer.toString("base64");
  const isPdf = mimetype === "application/pdf";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 20,
    messages: [
      {
        role: "user",
        content: [
          isPdf
            ? { type: "document" as const, source: { type: "base64" as const, media_type: mimetype as "application/pdf", data: base64 } }
            : { type: "image" as const, source: { type: "base64" as const, media_type: mimetype as "image/png", data: base64 } },
          { type: "text", text: CLASSIFY_PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No response from classifier");

  const raw = textBlock.text.trim().toLowerCase();
  const VALID: DocumentKind[] = ["salary", "transactions", "wealth", "pe_statement"];
  const kind = VALID.find((k) => raw.includes(k));

  return { detected_kind: kind ?? "transactions" };
}
