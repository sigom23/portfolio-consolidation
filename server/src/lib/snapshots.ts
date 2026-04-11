import { getPool } from "./db.js";
import { getExchangeRates } from "./forex.js";

export type SnapshotTrigger =
  | "upload"
  | "property"
  | "illiquid"
  | "wallet"
  | "price_refresh";

/**
 * Write a wealth snapshot for a user. Reads the current holdings + property
 * mortgages, converts liabilities to USD, and inserts a row in wealth_snapshots.
 *
 * Design notes:
 * - Holdings is the single source of truth for wealth aggregation per CLAUDE.md.
 *   Category totals are derived by asset_type.
 * - Real estate stored as GROSS (sum of real_estate holdings). Liabilities are
 *   stored separately so the reader can compute net equity either way.
 * - net_worth_usd = liquid + illiquid + real_estate + crypto - liabilities
 * - This is fire-and-forget: any caller wraps in try/catch so a transient FX
 *   outage or DB blip never blocks the mutation that triggered it.
 */
export async function writeWealthSnapshot(
  userId: string,
  trigger: SnapshotTrigger
): Promise<void> {
  // 1. Read holdings and group by asset_type
  const { rows: holdings } = await getPool().query<{
    asset_type: string | null;
    value_usd: number | null;
  }>(
    "SELECT asset_type, value_usd FROM holdings WHERE user_id = $1",
    [userId]
  );

  let liquid = 0;
  let illiquid = 0;
  let realEstate = 0;
  let crypto = 0;

  for (const h of holdings) {
    const val = h.value_usd ?? 0;
    const t = (h.asset_type ?? "").toLowerCase();
    if (t === "crypto") crypto += val;
    else if (t === "real_estate") realEstate += val;
    else if (t === "illiquid") illiquid += val;
    else liquid += val;
  }

  // 2. Compute liabilities (sum of active property mortgage balances in USD)
  const { rows: mortgageRows } = await getPool().query<{
    current_balance: number;
    currency: string;
  }>(
    `SELECT pm.current_balance, p.currency
     FROM property_mortgages pm
     JOIN properties p ON p.id = pm.property_id
     WHERE p.user_id = $1 AND pm.is_active = TRUE`,
    [userId]
  );

  let liabilities = 0;
  if (mortgageRows.length > 0) {
    const rates = await getExchangeRates("USD");
    for (const m of mortgageRows) {
      const ccy = m.currency.toUpperCase();
      if (ccy === "USD") liabilities += m.current_balance;
      else if (rates[ccy]) liabilities += m.current_balance / rates[ccy];
      else liabilities += m.current_balance;
    }
  }

  const netWorth = liquid + illiquid + realEstate + crypto - liabilities;

  // 3. Insert the snapshot row
  await getPool().query(
    `INSERT INTO wealth_snapshots
       (user_id, net_worth_usd, liquid_usd, illiquid_usd, real_estate_usd, crypto_usd, liabilities_usd, trigger)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [userId, netWorth, liquid, illiquid, realEstate, crypto, liabilities, trigger]
  );
}

/**
 * Convenience wrapper: writes a snapshot and swallows errors (logs to stderr).
 * Use this at mutation call sites so a failed snapshot never breaks user-visible
 * operations.
 */
export async function writeWealthSnapshotSafe(
  userId: string,
  trigger: SnapshotTrigger
): Promise<void> {
  try {
    await writeWealthSnapshot(userId, trigger);
  } catch (err) {
    console.warn(
      "Failed to write wealth snapshot:",
      err instanceof Error ? err.message : err
    );
  }
}
