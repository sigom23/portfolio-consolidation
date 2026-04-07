# Portfolio Consolidation

Full-stack portfolio tracking app (stocks, crypto, bonds, cash) with multi-currency support.

## Stack

- **Server:** Express + TypeScript + PostgreSQL (Railway)
- **Client:** Vite + React 19 + TanStack Router + TanStack Query + Tailwind v4 + Recharts
- **Auth:** OIDC via Pocket ID (passkeys). `DEV_MODE=true` bypasses auth locally.

## Development

```bash
# Server (from /server)
npx tsx watch src/server.ts

# Client (from /client)
npm run dev
```

Server runs on `:3000`, client on `:5173` with Vite proxy to server.

## Database

PostgreSQL on Railway. Tables auto-create/migrate on startup via `initDb()` in `server/src/lib/db.ts`.

**Tables:** `users`, `holdings`, `uploads`, `wallets`, `companies`, `session`

- `holdings` — all assets with ticker, ISIN, FIGI identifiers, native currency values (`value_local`) and USD-converted values (`value_usd`)
- `companies` — persistent cache for FMP company profiles (sector, country, logo, etc.) to reduce API calls
- `uploads` — stores original PDF/CSV files as bytea for re-download

## External APIs

| Service | Purpose | Notes |
|---------|---------|-------|
| FMP (Financial Modeling Prep) | Company profiles, stock quotes, historical prices | **Free tier — rate limited.** Use DB cache (`companies` table). 3-tier cache: in-memory → DB → API |
| OpenFIGI | Security identification | Prefer `ID_ISIN` over `TICKER` for accurate results (avoids ticker collisions like ROG=Roche vs Rogers) |
| open.er-api.com | Exchange rates (USD base) | 1-hour in-memory cache. **Always use this, not other FX services** |
| Etherscan V2 | Ethereum wallet balances | chainid=1 |
| CoinGecko | Crypto token prices | Free tier |
| Anthropic Claude | PDF/CSV statement parsing | claude-haiku-4-5 model |

## Key Architecture Decisions

- **Currency handling:** Holdings store both `value_usd` (for totals/charts) and `value_local` (native currency display). The `currency` field on each holding indicates its native currency. Conversion uses open.er-api.com rates.
- **ISIN support:** Upload parsing (AI + CSV) extracts ISINs. OpenFIGI uses `ID_ISIN` when available for unambiguous security identification. Crypto holdings have no ISIN.
- **Company caching:** FMP profiles are cached in the `companies` DB table after first fetch. The in-memory cache (1-hour TTL) sits in front. This means sector allocation, geography charts, and hover cards rarely hit FMP after initial population.
- **Exchange codes:** OpenFIGI returns `exchCode` (e.g., `GR` for Germany, `SW` for Switzerland). These map to FMP suffixes (`.DE`, `.SW`) via `EXCH_SUFFIX` in `fmp.ts` and `HoldingsTable.tsx`.

## Deploy

```bash
railway up
```

Production: https://portfolio-consolidation-production.up.railway.app
