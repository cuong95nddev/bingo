# CLAUDE.md

## Project
**Bingo 18** — Vietnamese multiplayer dice-betting game. 3 dice per round, Vietlott-style payouts. Real-time state via Colyseus WebSocket.

## Environment
> **Do NOT start the dev server.** Always `nvm use 20` before any install.

```bash
nvm use 20
npm install   # installs both workspaces from root
```

## Commands
```bash
# Root (runs workspace scripts)
npm run dev:backend    # port 2567
npm run dev:frontend   # port 5173

# Frontend (cd frontend)
npm run build   # tsc -b && vite build
npm run lint

# Backend (cd backend)
npm run build   # tsc → dist/
npm start       # node dist/index.js
```
No test infrastructure.

## Structure
```
bingo/
├── frontend/   # React 19 + Vite + Tailwind + @colyseus/sdk
├── backend/    # Express + Colyseus + @colyseus/schema
└── docs/plans/
```

## Key Files
- `backend/src/rooms/BingoRoom.ts` — game loop, message handlers
- `backend/src/schema/` — Colyseus state schemas (BingoState, Player, RoundState, GameConfig, RoundHistory)
- `backend/src/game/payouts.ts` — bet types & multipliers
- `frontend/src/hooks/useGame.ts` — Colyseus WS connection
- `frontend/src/hooks/useIdentity.ts` — FingerprintJS + localStorage identity

## Game Loop
1. **Betting** (30s) — `placeBet` messages; coins deducted immediately
2. **Drawing** — 3 dice (1-6) revealed one-by-one
3. **Result** (5s) — `applyBets()` calculates winnings, history appended

## Bet Payouts (`payouts.ts`)
| Bet | Payout |
|-----|--------|
| Single | 1:1 |
| Double | 5:1 |
| Triple | 20:1 |
| Big (sum ≥12) / Small (sum ≤9) | 1:1 (loses on triple) |
| Draw (sum 10-11) | 3:1 |
| Exact sum | Vietlott multipliers (e.g. 4 or 17 → 50:1) |

## Admin API
Password: set via `ADMIN_PASSWORD` env var. Vite proxies `/admin` → `http://localhost:2567`.

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/admin/verify?password=` | auth |
| GET | `/admin/players?password=` | list players |
| POST | `/admin/players/:sessionId/coins` | set/add coins (`mode: "set"\|"add"`) |
| GET/POST | `/admin/config` | get/update config |
| GET | `/admin/history?password=` | last 50 rounds |

## Gotchas
- Backend: `experimentalDecorators: true` required for `@Schema`/`@type` decorators
- ArraySchema spread: filter `undefined` before spreading (strict TS)
- Backend: CommonJS (`"module": "commonjs"`); Frontend: ESNext modules
- Never hardcode credentials in docs/README — always reference env vars (e.g. `ADMIN_PASSWORD`)
