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

// Simple keyword rules. Order matters — more specific first.
// Each entry: [regex pattern, category]
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
  [/coop\b|migros|aldi|lidl|denner|volg|spar\b|manor food|globus delicatessa|caritas markt/i, "Groceries"],
  [/tesco|sainsbury|asda|waitrose|whole foods|trader joe|walmart|carrefour|mercadona|edeka|rewe|penny|kaufland|billa/i, "Groceries"],

  // Transport
  [/\bsbb\b|\bcff\b|\bffs\b|postauto|zvv|tl lausanne|uber\b|lyft|bolt|mytaxi|\btaxi\b/i, "Transport"],
  [/\bshell\b|bp\b|esso|tamoil|coop pronto|migrol|aral|total\b|ovomaltine gas/i, "Transport"],
  [/parking|parkhaus|parcage|parkservice/i, "Transport"],
  [/swiss air|lufthansa|easyjet|ryanair|klm|british airways|\biag\b|edelweiss/i, "Travel"],

  // Food & Drink (restaurants / cafes / delivery)
  [/starbucks|caf[eé]\b|restaur|pizzer|sushi|burger|kebab|take.?away|lieferando|just eat|uber eats|smood|bar\b|pub\b|brauerei|brewery|wine/i, "Food & Drink"],
  [/mcdonald|burger king|kfc|subway|chipotle|domino|papa john|five guys/i, "Food & Drink"],

  // Shopping
  [/amazon|zalando|\bh&m\b|zara|uniqlo|nike|adidas|ikea|h&m|primark|galaxus|digitec|microspot|brack|interdiscount|media markt/i, "Shopping"],
  [/apple store|apple\.com|itunes|microsoft store|google store/i, "Shopping"],

  // Entertainment
  [/cinema|kino|path[eé]|theater|theatre|opera|museum|concert|konzert|ticketmaster|starticket/i, "Entertainment"],
  [/steam|playstation|nintendo|xbox|riot games|blizzard/i, "Entertainment"],

  // Health
  [/pharma|apotheke|pharmacie|drog|pharma24|galenic|optiker|optician|dentist|zahnarzt|doctor|arzt|m[eé]decin|hospital|spital|klinik/i, "Health"],

  // Travel (hotels, flights covered above)
  [/hotel|airbnb|booking\.com|expedia|trivago|hostelworld|agoda/i, "Travel"],

  // Subscriptions
  [/netflix|spotify|apple music|apple tv|disney\+?|hbo|sky |dazn|youtube premium|audible|adobe|dropbox|icloud|google one|one drive|microsoft 365|office 365|github|notion|evernote|chatgpt|openai|claude\.ai|anthropic|linkedin|nord vpn|express vpn/i, "Subscriptions"],

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
 *  1. Look up learned cache by merchant key.
 *  2. Match against RULES and cache the result.
 *  3. Fall back to "Other".
 */
export async function categorize(description: string, amount: number): Promise<ExpenseCategory> {
  // Income shortcut: positive amounts without a matched rule default to Income
  const key = normalizeMerchantKey(description);
  if (!key) return amount > 0 ? "Income" : "Other";

  // 1. Learned cache
  const cached = await getMerchantCategory(key);
  if (cached) return cached as ExpenseCategory;

  // 2. Rule matching
  for (const [pattern, category] of RULES) {
    if (pattern.test(description) || pattern.test(key)) {
      await upsertMerchantCategory(key, category, "rule").catch(() => {});
      return category;
    }
  }

  // 3. Fallback: income if positive, Other otherwise
  return amount > 0 ? "Income" : "Other";
}
