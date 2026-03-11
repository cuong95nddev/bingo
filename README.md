# Bingo 18

Vietnamese-style real-time multiplayer dice-betting game. Players bet virtual coins on 3-dice outcomes with Vietlott-style payouts.

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS + Colyseus SDK
- **Backend:** Express + Colyseus (WebSocket) + TypeScript
- **Identity:** FingerprintJS (no login required)

## Setup

```bash
nvm use 20
npm install
```

## Dev

```bash
npm run dev:backend    # http://localhost:2567
npm run dev:frontend   # http://localhost:5173
```

## Build

```bash
cd frontend && npm run build
cd backend && npm run build && npm start
```

## Admin

Set `ADMIN_PASSWORD` env var on the backend. Access at `/admin` in the frontend (proxied to backend).

## Architecture

```
frontend/src/
  hooks/       # useGame (Colyseus), useIdentity (FingerprintJS)
  pages/       # UserPage, AdminPage
backend/src/
  rooms/       # BingoRoom — game loop & message handlers
  schema/      # Colyseus state (BingoState, Player, RoundState…)
  game/        # payouts.ts — bet types & multipliers
```

Game loop: **Betting (30s)** → **Drawing (3 dice)** → **Result (5s)** → repeat.
