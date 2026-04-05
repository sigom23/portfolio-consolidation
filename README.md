# Portfolio Consolidation

Track all your assets in one place — stocks, crypto, bonds, and more.

## Tech Stack

- **Backend:** Node.js + Express + TypeScript + SQLite
- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4 + TanStack Router + TanStack Query
- **Auth:** OIDC via Pocket ID (with dev bypass mode)
- **Deployment:** Railway

## Quick Start

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values (or keep DEV_MODE=true for local testing)
```

### 3. Run dev servers

In two terminals:

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Visit http://localhost:5173

### Dev Mode

With `DEV_MODE=true` in `.env`, the app auto-logs in as a test user — no Pocket ID instance needed.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/login` | Initiate OIDC login (or dev auto-login) |
| GET | `/auth/callback` | OIDC callback handler |
| GET | `/auth/logout` | Destroy session |
| GET | `/auth/me` | Current authenticated user |
| GET | `/api/portfolio/summary` | Portfolio value + breakdown |
| GET | `/api/holdings` | List all holdings |
| POST | `/api/uploads` | Upload statement (Phase 2) |
| GET/POST | `/api/wallets` | Wallet management (Phase 3) |

## Deployment (Railway)

1. Push to GitHub
2. Connect repo in Railway dashboard
3. Set environment variables in Railway (see `.env.example`)
4. Railway will auto-build and deploy using `railway.json`

**Note:** SQLite data resets on each deploy. For persistent data, add a Railway PostgreSQL service and update the database layer.

## Roadmap

- **Phase 1** (current): Auth + dashboard skeleton
- **Phase 2**: PDF/CSV statement uploads via Claude AI
- **Phase 3**: Ethereum wallet integration via Etherscan + CoinGecko
