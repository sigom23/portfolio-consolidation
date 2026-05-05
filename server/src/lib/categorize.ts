import Anthropic from "@anthropic-ai/sdk";
import { getMerchantCategory, upsertMerchantCategory } from "./db.js";

export type ExpenseCategory =
  | "Housing"
  | "Groceries"
  | "Transport"
  | "Food & Drink"
  | "Shopping"
  | "Entertainment"
  | "Health"
  | "Travel"
  | "Subscriptions"
  | "Bills"
  | "Boat"
  | "Income"
  | "Transfers"
  | "Other";

// Keyword rules for auto-categorization. Order matters — more specific first.
// IMPORTANT: Only add well-known brands, national/international chains, or generic
// category terms (e.g. "restaurant", "bakery", "pharmacy"). NEVER add local
// businesses, personal merchants, or anything derived from a specific user's
// statements. Those get learned automatically by the AI fallback and cached in
// the merchant_categories DB table — not in code.
const RULES: [RegExp, ExpenseCategory][] = [
  // Boat (user-requested)
  [/\bboat\b|marina|yacht|harbor|harbour|mooring|sailing|nautic|chandlery|boatyard|volvo penta|yanmar/i, "Boat"],

  // Housing / rent / utilities
  [/\brent\b|mortgage|hypothek|miete|landlord|property mgmt/i, "Housing"],
  [/electricit|strom|ewz|bkw|iwb|swissgrid|romande energie|energie|gas\b|utilit/i, "Bills"],
  [/water|wasser|abwasser/i, "Bills"],
  [/insuran|versicherung|helsana|css|swica|sanitas|assura|mobiliar|zurich ins|axa|allianz/i, "Bills"],
  [/\btax\b|steuer|canton|gemeinde/i, "Bills"],

  // Groceries
  [/coop\b|coop-\d|coop pronto|migros|aldi|lidl|denner|volg|spar\b|manor food|globus delicatessa|caritas markt/i, "Groceries"],
  [/tesco|sainsbury|asda|waitrose|whole foods|trader joe|walmart|carrefour|mercadona|edeka|rewe|penny|kaufland|billa/i, "Groceries"],

  // Transport
  [/\bsbb\b|\bcff\b|\bffs\b|postauto|zvv|tl lausanne|uber\b|lyft|bolt|mytaxi|\btaxi\b/i, "Transport"],
  [/\bshell\b|bp\b|esso|tamoil|migrol|aral|socar|agrola/i, "Transport"],
  [/parking|parkhaus|parcage|parkservice/i, "Transport"],
  [/swiss air|lufthansa|easyjet|ryanair|klm|british airways|\biag\b|edelweiss/i, "Travel"],

  // Food & Drink (restaurants / cafes / delivery)
  [/starbucks|caf[eé]\b|restaur|ristorante|pizzer|sushi|burger|kebab|take.?away|lieferando|just eat|uber eats|smood|bar\b|pub\b|brauerei|brewery|wine|poke\b|espressobar|confiserie|spr[uü]ngli|boulangerie|b[aä]ckerei/i, "Food & Drink"],
  [/mcdonald|burger king|kfc|subway|chipotle|domino|papa john|five guys/i, "Food & Drink"],

  // Subscriptions (before Shopping so apple.com/bill doesn't match Shopping's apple.com)
  [/netflix|spotify|apple music|apple tv|apple\.com\/bill|disney\+?|hbo|sky |dazn|youtube premium|audible|adobe|dropbox|icloud|google one|one drive|microsoft 365|office 365|github|notion\b|evernote|chatgpt|openai|claude\.ai|anthropic|linkedin|nord vpn|express vpn|paddle\.net|obsidian|n8n|proton|1password|bitwarden|todoist|figma|linear\b|vercel/i, "Subscriptions"],

  // Shopping
  [/amazon|zalando|\bh\s*&\s*m\b|zara|uniqlo|nike|adidas|ikea|primark|galaxus|digitec|microspot|brack|interdiscount|media markt|dosenbach|ochsner|manor\b|pfister/i, "Shopping"],
  [/apple store|apple\.com\/store|itunes|microsoft store|google store/i, "Shopping"],

  // Entertainment
  [/cinema|kino|path[eé]|theater|theatre|opera|museum|concert|konzert|ticketmaster|starticket/i, "Entertainment"],
  [/steam|playstation|nintendo|xbox|riot games|blizzard/i, "Entertainment"],

  // Health
  [/pharma|apotheke|pharmacie|drog|pharma24|galenic|optiker|optician|dentist|zahnarzt|doctor|arzt|m[eé]decin|hospital|spital|klinik/i, "Health"],

  // Travel (hotels, flights covered above)
  [/hotel|airbnb|booking\.com|expedia|trivago|hostelworld|agoda/i, "Travel"],

  // Bills / Telecom
  [/swisscom|sunrise|salt\b|upc\b|wingo|yallo|m-budget mobile|vodafone|o2\b|\bt-mobile\b|verizon|at&t|orange\b|deutsche telekom/i, "Bills"],

  // Transfers (internal/account moves)
  [/transfer|[uü]berweisung|virement|payment to|from account|debitkarte zahlung|credit card payment|card payment/i, "Transfers"],

  // Explicit income markers
  [/salary|gehalt|salaire|lohn|payroll|dividend|interest/i, "Income"],
];

/**
 * Normalize a description into a merchant key for cache lookup.
 * Strip numbers, dates, card detail suffixes, locations to get a stable key.
 */
export function normalizeMerchantKey(description: string): string {
  return description
    .toLowerCase()
    .replace(/[0-9]{4,}/g, " ") // long numbers (card digits, dates)
    .replace(/\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\b/g, " ") // dates
    .replace(/[^a-z\u00e0-\u00ff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/**
 * Categorize a transaction by its description.
 *  1. Check user-specific overrides (learned from manual reclassifications).
 *  2. Look up global cache by merchant key.
 *  3. Match against RULES and cache the result.
 *  4. AI fallback.
 *  5. Fall back to "Other".
 */
export async function categorize(description: string, amount: number, userId?: string): Promise<ExpenseCategory> {
  // Income shortcut: positive amounts without a matched rule default to Income
  const key = normalizeMerchantKey(description);
  if (!key) return amount > 0 ? "Income" : "Other";

  // 1. User-specific override (highest priority) + global cache
  const cached = await getMerchantCategory(key, userId);
  if (cached) return cached as ExpenseCategory;

  // 2. Rule matching
  for (const [pattern, category] of RULES) {
    if (pattern.test(description) || pattern.test(key)) {
      await upsertMerchantCategory(key, category, "rule").catch(() => {});
      return category;
    }
  }

  // 3. AI fallback — ask Claude to categorize unrecognized merchants
  const aiCategory = await aiCategorize(description, amount).catch(() => null);
  if (aiCategory) {
    await upsertMerchantCategory(key, aiCategory, "ai").catch(() => {});
    return aiCategory;
  }

  // 4. Final fallback: income if positive, Other otherwise
  return amount > 0 ? "Income" : "Other";
}

const VALID_CATEGORIES: Set<string> = new Set([
  "Housing", "Groceries", "Transport", "Food & Drink", "Shopping",
  "Entertainment", "Health", "Travel", "Subscriptions", "Bills",
  "Boat", "Income", "Transfers", "Other",
]);

async function aiCategorize(description: string, amount: number): Promise<ExpenseCategory | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    messages: [
      {
        role: "user",
        content: `Categorize this transaction into exactly one of these categories: Housing, Groceries, Transport, Food & Drink, Shopping, Entertainment, Health, Travel, Subscriptions, Bills, Income, Transfers, Other.

Transaction: "${description}" (${amount > 0 ? "income" : "expense"}, ${Math.abs(amount)})

Reply with ONLY the category name, nothing else.`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;

  const category = text.text.trim();
  if (VALID_CATEGORIES.has(category)) return category as ExpenseCategory;
  return null;
}
