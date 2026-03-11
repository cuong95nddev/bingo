# Bingo 18 Multiplayer Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Xây dựng game multiplayer Bingo 18 (như Vietlott) — players đặt cược virtual coins vào kết quả quay 3 số từ 1-6, với timer tự động và trang admin.

**Architecture:** Monorepo với `frontend/` (React + Vite) và `backend/` (Node.js + Colyseus). Backend giữ toàn bộ game state trong RAM qua Colyseus Schema; frontend kết nối WebSocket để sync state realtime. Admin có REST endpoints riêng bảo vệ bằng password.

**Tech Stack:** React 18, Vite 5, TypeScript, React Router 6, @fingerprintjs/fingerprintjs, Colyseus 0.15 (client + server), Express 4, Node.js 20

---

## Task 1: Root Monorepo Scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`

**Step 1: Tạo root package.json với npm workspaces**

```bash
cd /Users/cuongpham/ws/bingo
cat > package.json << 'EOF'
{
  "name": "bingo18",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run dev --workspace=frontend"
  }
}
EOF
```

**Step 2: Tạo .gitignore**

```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
build/
.env
*.log
EOF
```

**Step 3: Init git**

```bash
git init
git add .
git commit -m "chore: init monorepo with npm workspaces"
```

---

## Task 2: Backend Scaffolding

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/index.ts`

**Step 1: Tạo backend package.json**

```bash
mkdir -p backend/src
cat > backend/package.json << 'EOF'
{
  "name": "bingo18-backend",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@colyseus/core": "^0.15.0",
    "@colyseus/express": "^0.15.0",
    "@colyseus/schema": "^2.0.0",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
EOF
```

**Step 2: Tạo tsconfig.json**

```bash
cat > backend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

**Step 3: Tạo minimal index.ts để verify server starts**

```typescript
// backend/src/index.ts
import express from "express";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import cors from "cors";

const PORT = Number(process.env.PORT) || 2567;
const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

const gameServer = new Server({
  transport: new WebSocketTransport({ server: require("http").createServer(app) }),
});

gameServer.listen(PORT).then(() => {
  console.log(`Colyseus server running on ws://localhost:${PORT}`);
});
```

**Step 4: Cài dependencies**

```bash
cd backend && npm install
```

Expected: `node_modules/` được tạo, không có lỗi.

**Step 5: Verify server starts**

```bash
cd backend && npm run dev
```

Expected output: `Colyseus server running on ws://localhost:2567`

Ctrl+C để dừng.

**Step 6: Commit**

```bash
git add backend/
git commit -m "chore: scaffold backend with Colyseus + Express"
```

---

## Task 3: Backend — Colyseus Schema

**Files:**
- Create: `backend/src/schema/GameConfig.ts`
- Create: `backend/src/schema/Bet.ts`
- Create: `backend/src/schema/Player.ts`
- Create: `backend/src/schema/RoundState.ts`
- Create: `backend/src/schema/BingoState.ts`

**Step 1: GameConfig schema**

```typescript
// backend/src/schema/GameConfig.ts
import { Schema, type } from "@colyseus/schema";

export class GameConfig extends Schema {
  @type("number") startCoins: number = 1000;
  @type("number") minBet: number = 10;
  @type("number") roundDuration: number = 30; // seconds
}
```

**Step 2: Bet schema**

```typescript
// backend/src/schema/Bet.ts
import { Schema, type } from "@colyseus/schema";

export type BetType =
  | "single" | "double" | "triple"
  | "big" | "draw" | "small"
  | "sum";

export class Bet extends Schema {
  @type("string") type: string = "";
  @type("number") value: number = 0;   // số cụ thể (1-6) hoặc tổng (3-18)
  @type("number") amount: number = 0;  // số coins đặt
}
```

**Step 3: Player schema**

```typescript
// backend/src/schema/Player.ts
import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Bet } from "./Bet";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("number") coins: number = 0;
  @type([Bet]) bets = new ArraySchema<Bet>();
  @type("number") lastWin: number = 0;  // coins won/lost last round
}
```

**Step 4: RoundState schema**

```typescript
// backend/src/schema/RoundState.ts
import { Schema, type, ArraySchema } from "@colyseus/schema";

export type RoundStatus = "betting" | "drawing" | "result";

export class RoundState extends Schema {
  @type("number") id: number = 0;
  @type("string") status: string = "betting";
  @type("number") countdown: number = 30;
  @type(["number"]) numbers = new ArraySchema<number>(); // 3 numbers revealed
}
```

**Step 5: BingoState schema (root)**

```typescript
// backend/src/schema/BingoState.ts
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Player } from "./Player";
import { RoundState } from "./RoundState";
import { GameConfig } from "./GameConfig";

export class RoundHistory extends Schema {
  @type("number") id: number = 0;
  @type(["number"]) numbers = new ArraySchema<number>();
  @type("number") timestamp: number = 0;
}

export class BingoState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(RoundState) round = new RoundState();
  @type(GameConfig) config = new GameConfig();
  @type([RoundHistory]) history = new ArraySchema<RoundHistory>();
}
```

**Step 6: Commit**

```bash
git add backend/src/schema/
git commit -m "feat(backend): add Colyseus schemas for game state"
```

---

## Task 4: Backend — Payout Logic

**Files:**
- Create: `backend/src/logic/payouts.ts`

**Step 1: Viết payouts.ts**

```typescript
// backend/src/logic/payouts.ts
import { Bet } from "../schema/Bet";

/**
 * Tính multiplier cho 1 bet dựa trên kết quả quay.
 * Return: số tiền thắng (không tính tiền gốc), hoặc -amount nếu thua.
 */
export function calculateWin(bet: Bet, numbers: number[]): number {
  const counts: Record<number, number> = {};
  for (const n of numbers) {
    counts[n] = (counts[n] || 0) + 1;
  }
  const sum = numbers.reduce((a, b) => a + b, 0);

  switch (bet.type) {
    case "single": {
      // Thắng nếu số xuất hiện trong 3 số (1:1)
      if (counts[bet.value] && counts[bet.value] >= 1) {
        return bet.amount * 1;
      }
      return -bet.amount;
    }
    case "double": {
      // Thắng nếu số xuất hiện ≥ 2 lần (5:1)
      if (counts[bet.value] && counts[bet.value] >= 2) {
        return bet.amount * 5;
      }
      return -bet.amount;
    }
    case "triple": {
      // Thắng nếu số xuất hiện đúng 3 lần (20:1)
      if (counts[bet.value] && counts[bet.value] === 3) {
        return bet.amount * 20;
      }
      return -bet.amount;
    }
    case "big": {
      // Tổng ≥ 12 (1:1), nhưng triple giải trừ
      const isTriple = Object.values(counts).some(c => c === 3);
      if (!isTriple && sum >= 12) return bet.amount * 1;
      return -bet.amount;
    }
    case "small": {
      // Tổng ≤ 9 (1:1), nhưng triple giải trừ
      const isTriple = Object.values(counts).some(c => c === 3);
      if (!isTriple && sum <= 9) return bet.amount * 1;
      return -bet.amount;
    }
    case "draw": {
      // Tổng = 10 hoặc 11 (3:1)
      if (sum === 10 || sum === 11) return bet.amount * 3;
      return -bet.amount;
    }
    case "sum": {
      // Tổng chính xác (bet.value là tổng cần)
      // Tỷ lệ theo Vietlott: tổng 4,17 = 50:1; 5,16 = 18:1; 6,15 = 14:1
      // 7,14 = 12:1; 8,13 = 8:1; 9,12 = 6:1; 10,11 = 6:1
      const sumPayouts: Record<number, number> = {
        4: 50, 17: 50,
        5: 18, 16: 18,
        6: 14, 15: 14,
        7: 12, 14: 12,
        8: 8,  13: 8,
        9: 6,  12: 6,
        10: 6, 11: 6,
      };
      if (sum === bet.value && sumPayouts[sum]) {
        return bet.amount * sumPayouts[sum];
      }
      return -bet.amount;
    }
    default:
      return -bet.amount;
  }
}

/**
 * Áp dụng tất cả bets của 1 player, trả về tổng coins thay đổi
 */
export function applyBets(bets: Bet[], numbers: number[]): number {
  return bets.reduce((total, bet) => total + calculateWin(bet, numbers), 0);
}
```

**Step 2: Test thủ công logic (verify bằng console)**

```bash
cd backend
node -e "
const { calculateWin } = require('./src/logic/payouts');
// Bet single on 3, numbers [3,5,2] -> should win (amount=10 -> +10)
const bet = { type: 'single', value: 3, amount: 10 };
console.log('single win:', calculateWin(bet, [3,5,2])); // expect 10
console.log('single lose:', calculateWin(bet, [1,2,4])); // expect -10
const bigBet = { type: 'big', value: 0, amount: 10 };
console.log('big win:', calculateWin(bigBet, [4,5,6])); // sum=15 -> expect 10
console.log('big lose:', calculateWin(bigBet, [1,2,3])); // sum=6 -> expect -10
"
```

Expected: `single win: 10`, `single lose: -10`, `big win: 10`, `big lose: -10`

(Cần compile TS trước hoặc dùng ts-node):
```bash
cd backend && npx ts-node -e "
import { calculateWin } from './src/logic/payouts';
const bet = { type: 'single', value: 3, amount: 10 } as any;
console.log('single win:', calculateWin(bet, [3,5,2]));
console.log('single lose:', calculateWin(bet, [1,2,4]));
"
```

**Step 3: Commit**

```bash
git add backend/src/logic/
git commit -m "feat(backend): add payout calculation logic"
```

---

## Task 5: Backend — BingoRoom

**Files:**
- Create: `backend/src/rooms/BingoRoom.ts`

**Step 1: Viết BingoRoom.ts**

```typescript
// backend/src/rooms/BingoRoom.ts
import { Room, Client } from "@colyseus/core";
import { BingoState, RoundHistory } from "../schema/BingoState";
import { Player } from "../schema/Player";
import { Bet } from "../schema/Bet";
import { ArraySchema } from "@colyseus/schema";
import { applyBets } from "../logic/payouts";

const DRAWING_DELAY = 3000; // 3s per number reveal
const RESULT_DISPLAY = 5000; // 5s show result

export class BingoRoom extends Room<BingoState> {
  private roundTimer?: NodeJS.Timeout;
  private roundId = 0;

  onCreate(options: { adminPassword?: string }) {
    this.setState(new BingoState());
    this.startBettingPhase();

    // Allow admin to update config via message
    this.onMessage("adminUpdateConfig", (client, data) => {
      const adminPwd = process.env.ADMIN_PASSWORD || "admin123";
      if (data.password !== adminPwd) return;
      if (data.startCoins != null) this.state.config.startCoins = data.startCoins;
      if (data.minBet != null) this.state.config.minBet = data.minBet;
      if (data.roundDuration != null) this.state.config.roundDuration = data.roundDuration;
    });

    this.onMessage("placeBet", (client, data: { type: string; value: number; amount: number }) => {
      if (this.state.round.status !== "betting") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const amount = Math.floor(data.amount);
      if (amount < this.state.config.minBet) return;
      if (player.coins < amount) return;

      const bet = new Bet();
      bet.type = data.type;
      bet.value = data.value;
      bet.amount = amount;
      player.bets.push(bet);
      player.coins -= amount;
    });

    this.onMessage("clearBets", (client) => {
      if (this.state.round.status !== "betting") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      // Refund all bets
      for (const bet of player.bets) {
        player.coins += bet.amount;
      }
      player.bets = new ArraySchema<Bet>();
    });
  }

  onJoin(client: Client, options: { name: string; visitorId: string }) {
    // Check if player already exists (reconnect by visitorId)
    let existing: Player | undefined;
    this.state.players.forEach((p) => {
      if (p.id === options.visitorId) existing = p;
    });

    if (existing) {
      // Reassign sessionId mapping
      this.state.players.delete(client.sessionId);
      this.state.players.set(client.sessionId, existing);
    } else {
      const player = new Player();
      player.id = options.visitorId;
      player.name = options.name || "Player";
      player.coins = this.state.config.startCoins;
      this.state.players.set(client.sessionId, player);
    }
  }

  onLeave(client: Client, consented: boolean) {
    // Keep player state for reconnect — do NOT delete
  }

  private startBettingPhase() {
    this.state.round.status = "betting";
    this.state.round.countdown = this.state.config.roundDuration;
    this.state.round.numbers.clear();
    this.state.round.id = ++this.roundId;

    // Countdown tick every second
    let remaining = this.state.config.roundDuration;
    this.roundTimer = setInterval(() => {
      remaining--;
      this.state.round.countdown = remaining;
      if (remaining <= 0) {
        clearInterval(this.roundTimer);
        this.startDrawingPhase();
      }
    }, 1000);
  }

  private async startDrawingPhase() {
    this.state.round.status = "drawing";
    const numbers = [
      Math.ceil(Math.random() * 6),
      Math.ceil(Math.random() * 6),
      Math.ceil(Math.random() * 6),
    ];

    // Reveal numbers one by one
    for (const n of numbers) {
      await this.delay(DRAWING_DELAY);
      this.state.round.numbers.push(n);
    }

    await this.delay(1000);
    this.startResultPhase(numbers);
  }

  private startResultPhase(numbers: number[]) {
    this.state.round.status = "result";

    // Calculate wins/losses for each player
    this.state.players.forEach((player) => {
      const delta = applyBets([...player.bets], numbers);
      player.coins = Math.max(0, player.coins + delta);
      player.lastWin = delta;
      player.bets = new ArraySchema<Bet>(); // clear bets
    });

    // Save to history (keep last 50)
    const hist = new RoundHistory();
    hist.id = this.roundId;
    hist.numbers.push(...numbers);
    hist.timestamp = Date.now();
    this.state.history.push(hist);
    if (this.state.history.length > 50) {
      this.state.history.splice(0, 1);
    }

    // After result display, start next round
    this.roundTimer = setTimeout(() => {
      this.startBettingPhase();
    }, RESULT_DISPLAY);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

**Step 2: Register room trong index.ts**

```typescript
// backend/src/index.ts — thêm vào sau imports
import { BingoRoom } from "./rooms/BingoRoom";

// Thêm trước gameServer.listen():
gameServer.define("bingo", BingoRoom);
```

**Step 3: Verify server starts với room**

```bash
cd backend && npm run dev
```

Expected: Server starts, không có TypeScript errors.

**Step 4: Commit**

```bash
git add backend/src/rooms/ backend/src/index.ts
git commit -m "feat(backend): implement BingoRoom with game loop"
```

---

## Task 6: Backend — Admin REST Endpoints

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: Thêm admin endpoints vào index.ts**

Thêm vào `backend/src/index.ts` sau `app.get("/health", ...)`:

```typescript
// Admin middleware
const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const password = req.query.password || req.body?.password;
  const adminPwd = process.env.ADMIN_PASSWORD || "admin123";
  if (password !== adminPwd) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Expose gameServer's room for admin access
let bingoRoomRef: BingoRoom | null = null;

// GET /admin/verify?password=...
app.get("/admin/verify", adminAuth, (_req, res) => {
  res.json({ ok: true });
});

// GET /admin/players?password=...
app.get("/admin/players", adminAuth, (_req, res) => {
  if (!bingoRoomRef) return res.json([]);
  const players: object[] = [];
  bingoRoomRef.state.players.forEach((p, sessionId) => {
    players.push({ sessionId, id: p.id, name: p.name, coins: p.coins });
  });
  res.json(players);
});

// POST /admin/players/:sessionId/coins  body: {password, amount, mode:"set"|"add"}
app.post("/admin/players/:sessionId/coins", adminAuth, (req, res) => {
  if (!bingoRoomRef) return res.status(404).json({ error: "No room" });
  const player = bingoRoomRef.state.players.get(req.params.sessionId);
  if (!player) return res.status(404).json({ error: "Player not found" });
  const { amount, mode } = req.body;
  if (mode === "set") player.coins = Number(amount);
  else player.coins = Math.max(0, player.coins + Number(amount));
  res.json({ ok: true, coins: player.coins });
});

// GET /admin/config?password=...
app.get("/admin/config", adminAuth, (_req, res) => {
  if (!bingoRoomRef) return res.json({});
  const c = bingoRoomRef.state.config;
  res.json({ startCoins: c.startCoins, minBet: c.minBet, roundDuration: c.roundDuration });
});

// POST /admin/config  body: {password, startCoins?, minBet?, roundDuration?}
app.post("/admin/config", adminAuth, (req, res) => {
  if (!bingoRoomRef) return res.status(404).json({ error: "No room" });
  const c = bingoRoomRef.state.config;
  if (req.body.startCoins != null) c.startCoins = Number(req.body.startCoins);
  if (req.body.minBet != null) c.minBet = Number(req.body.minBet);
  if (req.body.roundDuration != null) c.roundDuration = Number(req.body.roundDuration);
  res.json({ ok: true });
});

// GET /admin/history?password=...
app.get("/admin/history", adminAuth, (_req, res) => {
  if (!bingoRoomRef) return res.json([]);
  const history: object[] = [];
  bingoRoomRef.state.history.forEach((h) => {
    history.push({ id: h.id, numbers: [...h.numbers], timestamp: h.timestamp });
  });
  res.json(history.reverse()); // newest first
});
```

**Step 2: Lưu room ref sau khi create**

Sửa `gameServer.define(...)` thành:
```typescript
gameServer.define("bingo", BingoRoom).on("create", (room: BingoRoom) => {
  bingoRoomRef = room;
});
```

**Step 3: Test admin endpoints**

```bash
cd backend && npm run dev
# In terminal 2:
curl "http://localhost:2567/admin/verify?password=admin123"
# Expected: {"ok":true}

curl "http://localhost:2567/admin/verify?password=wrong"
# Expected: {"error":"Unauthorized"}
```

**Step 4: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat(backend): add admin REST endpoints"
```

---

## Task 7: Frontend Scaffolding

**Files:**
- Create: `frontend/` (via Vite)

**Step 1: Tạo Vite project**

```bash
cd /Users/cuongpham/ws/bingo
npm create vite@latest frontend -- --template react-ts
```

**Step 2: Cài thêm dependencies**

```bash
cd frontend
npm install react-router-dom @colyseus/sdk @fingerprintjs/fingerprintjs
npm install -D tailwindcss @tailwindcss/vite
```

**Step 3: Cấu hình Tailwind CSS**

Thêm vào `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/admin': 'http://localhost:2567',
    }
  }
})
```

Thay nội dung `frontend/src/index.css` thành:
```css
@import "tailwindcss";
```

**Step 4: Verify frontend starts**

```bash
cd frontend && npm run dev
```

Expected: Vite server chạy trên http://localhost:5173

**Step 5: Commit**

```bash
git add frontend/
git commit -m "chore: scaffold frontend with Vite + React + Tailwind"
```

---

## Task 8: Frontend — Identity Hook

**Files:**
- Create: `frontend/src/hooks/useIdentity.ts`
- Create: `frontend/src/components/NameModal.tsx`

**Step 1: Tạo useIdentity hook**

```typescript
// frontend/src/hooks/useIdentity.ts
import { useState, useEffect } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const STORAGE_KEY = "bingo_identity";

interface Identity {
  visitorId: string;
  name: string;
}

export function useIdentity() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [visitorId, setVisitorId] = useState<string>("");

  useEffect(() => {
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        const vid = result.visitorId;
        setVisitorId(vid);

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const all = JSON.parse(stored) as Record<string, string>;
          if (all[vid]) {
            setIdentity({ visitorId: vid, name: all[vid] });
            return;
          }
        }
        // No name found — prompt user
        setNeedsName(true);
      });
  }, []);

  const saveName = (name: string) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const all = stored ? JSON.parse(stored) : {};
    all[visitorId] = name;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setIdentity({ visitorId, name });
    setNeedsName(false);
  };

  return { identity, needsName, saveName };
}
```

**Step 2: Tạo NameModal component**

```typescript
// frontend/src/components/NameModal.tsx
import { useState } from "react";

interface Props {
  onSave: (name: string) => void;
}

export function NameModal({ onSave }: Props) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
          🎲 Bingo 18
        </h2>
        <p className="text-gray-500 text-center mb-6">Nhập tên của bạn để vào game</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên của bạn..."
            minLength={2}
            maxLength={20}
            className="border-2 border-gray-200 rounded-lg px-4 py-3 text-lg focus:border-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={name.trim().length < 2}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg text-lg transition-colors"
          >
            Vào game
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/ frontend/src/components/NameModal.tsx
git commit -m "feat(frontend): add useIdentity hook with FingerprintJS"
```

---

## Task 9: Frontend — Colyseus Game Hook

**Files:**
- Create: `frontend/src/hooks/useGame.ts`
- Create: `frontend/src/types/game.ts`

**Step 1: Tạo shared types**

```typescript
// frontend/src/types/game.ts
export interface GamePlayer {
  id: string;
  name: string;
  coins: number;
  lastWin: number;
  bets: GameBet[];
}

export interface GameBet {
  type: string;
  value: number;
  amount: number;
}

export interface GameRound {
  id: number;
  status: "betting" | "drawing" | "result";
  countdown: number;
  numbers: number[];
}

export interface GameConfig {
  startCoins: number;
  minBet: number;
  roundDuration: number;
}

export interface GameState {
  players: Map<string, GamePlayer>;
  round: GameRound;
  config: GameConfig;
  history: Array<{ id: number; numbers: number[]; timestamp: number }>;
  mySessionId: string;
}
```

**Step 2: Tạo useGame hook**

```typescript
// frontend/src/hooks/useGame.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { Client, Room } from "@colyseus/sdk";
import { GameState, GameBet } from "../types/game";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "ws://localhost:2567";

export function useGame(visitorId: string, name: string, enabled: boolean) {
  const [state, setState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (!enabled || !visitorId || !name) return;

    const client = new Client(BACKEND_URL);
    let room: Room;

    client
      .joinOrCreate("bingo", { visitorId, name })
      .then((r) => {
        room = r;
        roomRef.current = r;
        setConnected(true);

        // Sync full state on change
        r.onStateChange((s) => {
          const players = new Map<string, any>();
          s.players.forEach((p: any, key: string) => {
            players.set(key, {
              id: p.id,
              name: p.name,
              coins: p.coins,
              lastWin: p.lastWin,
              bets: [...p.bets].map((b: any) => ({ type: b.type, value: b.value, amount: b.amount })),
            });
          });

          const history: any[] = [];
          s.history.forEach((h: any) => {
            history.push({ id: h.id, numbers: [...h.numbers], timestamp: h.timestamp });
          });

          setState({
            players,
            round: {
              id: s.round.id,
              status: s.round.status as any,
              countdown: s.round.countdown,
              numbers: [...s.round.numbers],
            },
            config: {
              startCoins: s.config.startCoins,
              minBet: s.config.minBet,
              roundDuration: s.config.roundDuration,
            },
            history,
            mySessionId: r.sessionId,
          });
        });

        r.onLeave(() => setConnected(false));
      })
      .catch((err) => {
        console.error("Failed to join room:", err);
      });

    return () => {
      roomRef.current?.leave();
    };
  }, [enabled, visitorId, name]);

  const placeBet = useCallback((bet: GameBet) => {
    roomRef.current?.send("placeBet", bet);
  }, []);

  const clearBets = useCallback(() => {
    roomRef.current?.send("clearBets", {});
  }, []);

  return { state, connected, placeBet, clearBets };
}
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/useGame.ts frontend/src/types/
git commit -m "feat(frontend): add useGame hook for Colyseus connection"
```

---

## Task 10: Frontend — User Page Layout

**Files:**
- Create: `frontend/src/pages/UserPage.tsx`
- Create: `frontend/src/components/Countdown.tsx`
- Create: `frontend/src/components/DiceResult.tsx`
- Create: `frontend/src/components/Leaderboard.tsx`
- Create: `frontend/src/components/BettingPanel.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Countdown component**

```typescript
// frontend/src/components/Countdown.tsx
interface Props {
  seconds: number;
  status: string;
}

export function Countdown({ seconds, status }: Props) {
  const isUrgent = seconds <= 10 && status === "betting";
  return (
    <div className={`text-center ${isUrgent ? "animate-pulse" : ""}`}>
      {status === "betting" && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Đặt cược trong</div>
          <div className={`text-5xl font-mono font-bold ${isUrgent ? "text-red-500" : "text-white"}`}>
            {String(seconds).padStart(2, "0")}
          </div>
          <div className="text-xs text-gray-400 mt-1">giây</div>
        </div>
      )}
      {status === "drawing" && (
        <div className="text-yellow-400 text-xl font-bold animate-pulse">
          🎲 Đang quay...
        </div>
      )}
      {status === "result" && (
        <div className="text-green-400 text-xl font-bold">
          ✅ Kết quả
        </div>
      )}
    </div>
  );
}
```

**Step 2: DiceResult component**

```typescript
// frontend/src/components/DiceResult.tsx
const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

interface Props {
  numbers: number[];
  status: string;
}

export function DiceResult({ numbers, status }: Props) {
  return (
    <div className="flex gap-4 justify-center items-center min-h-[80px]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`text-6xl transition-all duration-500 ${
            numbers[i]
              ? "opacity-100 scale-100"
              : status === "drawing"
              ? "opacity-30 animate-spin text-4xl"
              : "opacity-20"
          }`}
        >
          {numbers[i] ? DICE_FACES[numbers[i]] : "🎲"}
        </div>
      ))}
      {numbers.length === 3 && (
        <div className="text-gray-300 text-lg ml-4">
          Tổng: <span className="text-white font-bold text-xl">
            {numbers.reduce((a, b) => a + b, 0)}
          </span>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Leaderboard component**

```typescript
// frontend/src/components/Leaderboard.tsx
import { GamePlayer } from "../types/game";

interface Props {
  players: Map<string, GamePlayer>;
  mySessionId: string;
}

export function Leaderboard({ players, mySessionId }: Props) {
  const sorted = [...players.entries()]
    .map(([sid, p]) => ({ ...p, sessionId: sid }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10);

  return (
    <div>
      <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Bảng xếp hạng</h3>
      <div className="space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.sessionId}
            className={`flex items-center justify-between px-3 py-2 rounded-lg ${
              p.sessionId === mySessionId ? "bg-blue-900/50 border border-blue-500" : "bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-5 text-sm">{i + 1}</span>
              <span className={`text-sm ${p.sessionId === mySessionId ? "text-blue-300 font-bold" : "text-white"}`}>
                {p.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {p.lastWin > 0 && <span className="text-green-400 text-xs">+{p.lastWin}</span>}
              {p.lastWin < 0 && <span className="text-red-400 text-xs">{p.lastWin}</span>}
              <span className="text-yellow-400 font-mono text-sm">💰{p.coins}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: BettingPanel component**

```typescript
// frontend/src/components/BettingPanel.tsx
import { useState } from "react";
import { GameBet, GameConfig } from "../types/game";

interface Props {
  onPlaceBet: (bet: GameBet) => void;
  onClearBets: () => void;
  disabled: boolean;
  myCoins: number;
  config: GameConfig;
  currentBets: GameBet[];
}

const NUMBERS = [1, 2, 3, 4, 5, 6];

export function BettingPanel({ onPlaceBet, onClearBets, disabled, myCoins, config, currentBets }: Props) {
  const [amount, setAmount] = useState(config.minBet);

  const totalBet = currentBets.reduce((s, b) => s + b.amount, 0);

  const bet = (type: string, value: number) => {
    if (disabled || myCoins - totalBet < amount) return;
    onPlaceBet({ type, value, amount });
  };

  const btnClass = (active = false) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      disabled
        ? "opacity-40 cursor-not-allowed bg-gray-700 text-gray-400"
        : active
        ? "bg-blue-600 text-white"
        : "bg-gray-700 hover:bg-gray-600 text-white"
    }`;

  return (
    <div className="space-y-4">
      {/* Amount selector */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">Mức cược:</span>
        {[10, 50, 100, 500].map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className={`px-3 py-1 rounded text-sm ${amount === v ? "bg-yellow-500 text-black font-bold" : "bg-gray-700 text-gray-300"}`}
          >
            {v}
          </button>
        ))}
        <input
          type="number"
          value={amount}
          min={config.minBet}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-20 bg-gray-700 text-white rounded px-2 py-1 text-sm"
        />
      </div>

      {/* Lớn / Hòa / Nhỏ */}
      <div>
        <div className="text-xs text-gray-400 mb-2">Lớn / Hòa / Nhỏ</div>
        <div className="flex gap-2">
          <button onClick={() => bet("big", 0)} className={`${btnClass()} flex-1`}>
            Lớn (12-18) <span className="text-green-400">1:1</span>
          </button>
          <button onClick={() => bet("draw", 0)} className={`${btnClass()} flex-1`}>
            Hòa (10-11) <span className="text-yellow-400">3:1</span>
          </button>
          <button onClick={() => bet("small", 0)} className={`${btnClass()} flex-1`}>
            Nhỏ (3-9) <span className="text-green-400">1:1</span>
          </button>
        </div>
      </div>

      {/* Số đơn */}
      <div>
        <div className="text-xs text-gray-400 mb-2">Số đơn (xuất hiện ≥1 lần) — 1:1</div>
        <div className="flex gap-2">
          {NUMBERS.map((n) => (
            <button key={n} onClick={() => bet("single", n)} className={`${btnClass()} flex-1`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Đôi */}
      <div>
        <div className="text-xs text-gray-400 mb-2">Số đôi (xuất hiện ≥2 lần) — 5:1</div>
        <div className="flex gap-2">
          {NUMBERS.map((n) => (
            <button key={n} onClick={() => bet("double", n)} className={`${btnClass()} flex-1`}>
              {n}×2
            </button>
          ))}
        </div>
      </div>

      {/* Ba */}
      <div>
        <div className="text-xs text-gray-400 mb-2">Số ba (cả 3 cùng số) — 20:1</div>
        <div className="flex gap-2">
          {NUMBERS.map((n) => (
            <button key={n} onClick={() => bet("triple", n)} className={`${btnClass()} flex-1`}>
              {n}×3
            </button>
          ))}
        </div>
      </div>

      {/* Current bets + clear */}
      {currentBets.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-xs">Cược hiện tại ({currentBets.length})</span>
            <button onClick={onClearBets} disabled={disabled} className="text-red-400 text-xs hover:text-red-300">
              Xóa tất cả
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {currentBets.map((b, i) => (
              <span key={i} className="bg-blue-900 text-blue-300 text-xs px-2 py-1 rounded">
                {b.type} {b.value > 0 ? b.value : ""} — {b.amount}💰
              </span>
            ))}
          </div>
          <div className="text-right text-sm text-yellow-400 mt-2">Tổng cược: {totalBet}💰</div>
        </div>
      )}
    </div>
  );
}
```

**Step 5: Viết UserPage.tsx**

```typescript
// frontend/src/pages/UserPage.tsx
import { useIdentity } from "../hooks/useIdentity";
import { useGame } from "../hooks/useGame";
import { NameModal } from "../components/NameModal";
import { Countdown } from "../components/Countdown";
import { DiceResult } from "../components/DiceResult";
import { Leaderboard } from "../components/Leaderboard";
import { BettingPanel } from "../components/BettingPanel";

export function UserPage() {
  const { identity, needsName, saveName } = useIdentity();
  const { state, connected, placeBet, clearBets } = useGame(
    identity?.visitorId || "",
    identity?.name || "",
    !!identity
  );

  if (needsName) return <NameModal onSave={saveName} />;

  const myPlayer = state?.players.get(state.mySessionId);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-yellow-400">🎲 Bingo 18</h1>
        <div className="flex items-center gap-4">
          {!connected && <span className="text-red-400 text-sm animate-pulse">⚡ Đang kết nối...</span>}
          {myPlayer && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">{myPlayer.name}</span>
              <span className="bg-yellow-900 text-yellow-400 px-3 py-1 rounded-full font-mono text-sm">
                💰 {myPlayer.coins}
              </span>
            </div>
          )}
        </div>
      </header>

      {!state ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Đang tải game...
        </div>
      ) : (
        <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Betting Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 text-sm">Vòng #{state.round.id}</span>
                <Countdown seconds={state.round.countdown} status={state.round.status} />
              </div>
              <DiceResult numbers={state.round.numbers} status={state.round.status} />
              {state.round.status === "result" && myPlayer && myPlayer.lastWin !== 0 && (
                <div className={`text-center text-2xl font-bold mt-3 ${myPlayer.lastWin > 0 ? "text-green-400" : "text-red-400"}`}>
                  {myPlayer.lastWin > 0 ? `+${myPlayer.lastWin} 💰 Thắng!` : `${myPlayer.lastWin} 💰 Thua`}
                </div>
              )}
            </div>

            <div className="bg-gray-800 rounded-xl p-4">
              <BettingPanel
                onPlaceBet={placeBet}
                onClearBets={clearBets}
                disabled={state.round.status !== "betting"}
                myCoins={myPlayer?.coins || 0}
                config={state.config}
                currentBets={myPlayer?.bets || []}
              />
            </div>
          </div>

          {/* Right: Leaderboard */}
          <div className="bg-gray-800 rounded-xl p-4">
            <Leaderboard players={state.players} mySessionId={state.mySessionId} />
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 6: Setup React Router trong App.tsx**

```typescript
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserPage } from "./pages/UserPage";
import { AdminPage } from "./pages/AdminPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UserPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Step 7: Tạo AdminPage placeholder để App.tsx compile**

```typescript
// frontend/src/pages/AdminPage.tsx
export function AdminPage() {
  return <div className="text-white p-8">Admin Page (coming soon)</div>;
}
```

**Step 8: Verify frontend compiles**

```bash
cd frontend && npm run build
```

Expected: Build thành công, không có TypeScript errors.

**Step 9: Commit**

```bash
git add frontend/src/
git commit -m "feat(frontend): implement UserPage with betting, countdown, leaderboard"
```

---

## Task 11: Frontend — Admin Page

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`

**Step 1: Viết AdminPage hoàn chỉnh**

```typescript
// frontend/src/pages/AdminPage.tsx
import { useState, useEffect, useCallback } from "react";

const API = "/admin";

interface Player { sessionId: string; id: string; name: string; coins: number }
interface Config { startCoins: number; minBet: number; roundDuration: number }
interface RoundHistory { id: number; numbers: number[]; timestamp: number }

export function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"players" | "config" | "history">("players");

  const [players, setPlayers] = useState<Player[]>([]);
  const [config, setConfig] = useState<Config>({ startCoins: 1000, minBet: 10, roundDuration: 30 });
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [giftAmount, setGiftAmount] = useState(100);

  const authHeader = `?password=${password}`;

  const fetchPlayers = useCallback(() => {
    fetch(`${API}/players${authHeader}`)
      .then((r) => r.json())
      .then(setPlayers);
  }, [authHeader]);

  const fetchConfig = useCallback(() => {
    fetch(`${API}/config${authHeader}`)
      .then((r) => r.json())
      .then(setConfig);
  }, [authHeader]);

  const fetchHistory = useCallback(() => {
    fetch(`${API}/history${authHeader}`)
      .then((r) => r.json())
      .then(setHistory);
  }, [authHeader]);

  useEffect(() => {
    if (!authenticated) return;
    fetchPlayers();
    fetchConfig();
    fetchHistory();
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, [authenticated, fetchPlayers, fetchConfig, fetchHistory]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API}/verify?password=${password}`);
    if (res.ok) {
      setAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Sai mật khẩu");
    }
  };

  const handleGiftCoins = async (sessionId: string, mode: "add" | "set") => {
    await fetch(`${API}/players/${sessionId}/coins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, amount: giftAmount, mode }),
    });
    fetchPlayers();
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, password }),
    });
    alert("Đã lưu cấu hình!");
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-xl w-80 space-y-4">
          <h1 className="text-white text-2xl font-bold text-center">🔒 Admin</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
          {authError && <p className="text-red-400 text-sm">{authError}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">
            Đăng nhập
          </button>
        </form>
      </div>
    );
  }

  const tabs = [
    { key: "players", label: "Players" },
    { key: "config", label: "Cấu hình" },
    { key: "history", label: "Lịch sử" },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700">
        <h1 className="text-xl font-bold text-yellow-400">🎲 Bingo 18 — Admin</h1>
        <button onClick={() => setAuthenticated(false)} className="text-gray-400 hover:text-white text-sm">
          Đăng xuất
        </button>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === t.key ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Players Tab */}
        {activeTab === "players" && (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-gray-400">{players.length} players</span>
              <button onClick={fetchPlayers} className="text-blue-400 text-sm hover:text-blue-300">
                🔄 Refresh
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-gray-400 text-sm">Số coins:</span>
                <input
                  type="number"
                  value={giftAmount}
                  onChange={(e) => setGiftAmount(Number(e.target.value))}
                  className="w-24 bg-gray-700 text-white rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 px-3">Tên</th>
                    <th className="text-right py-2 px-3">Coins</th>
                    <th className="text-center py-2 px-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.sessionId} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="py-2 px-3">
                        <div>{p.name}</div>
                        <div className="text-gray-500 text-xs">{p.id.slice(0, 12)}...</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-yellow-400">💰 {p.coins}</td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleGiftCoins(p.sessionId, "add")}
                            className="bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-xs"
                          >
                            +{giftAmount}
                          </button>
                          <button
                            onClick={() => handleGiftCoins(p.sessionId, "set")}
                            className="bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-xs"
                          >
                            Set {giftAmount}
                          </button>
                          <button
                            onClick={() => { setGiftAmount(0); handleGiftCoins(p.sessionId, "set"); }}
                            className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded text-xs"
                          >
                            Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === "config" && (
          <form onSubmit={handleSaveConfig} className="max-w-md space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Coins ban đầu</label>
              <input
                type="number"
                value={config.startCoins}
                onChange={(e) => setConfig({ ...config, startCoins: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Cược tối thiểu</label>
              <input
                type="number"
                value={config.minBet}
                onChange={(e) => setConfig({ ...config, minBet: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Thời gian mỗi vòng (giây)</label>
              <input
                type="number"
                value={config.roundDuration}
                onChange={(e) => setConfig({ ...config, roundDuration: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
              />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg">
              Lưu cấu hình
            </button>
            <p className="text-gray-500 text-xs">* Thay đổi áp dụng cho vòng tiếp theo</p>
          </form>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div>
            <div className="flex gap-2 mb-4">
              <button onClick={fetchHistory} className="text-blue-400 text-sm hover:text-blue-300">
                🔄 Refresh
              </button>
            </div>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-4">
                  <span className="text-gray-400 text-sm w-16">#{h.id}</span>
                  <div className="flex gap-2 text-2xl">
                    {h.numbers.map((n, i) => (
                      <span key={i}>{"⚀⚁⚂⚃⚄⚅"[n - 1]}</span>
                    ))}
                  </div>
                  <span className="text-gray-300 text-sm">
                    Tổng: <strong>{h.numbers.reduce((a, b) => a + b, 0)}</strong>
                  </span>
                  <span className="text-gray-500 text-xs ml-auto">
                    {new Date(h.timestamp).toLocaleTimeString("vi-VN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Build để verify**

```bash
cd frontend && npm run build
```

Expected: Build thành công.

**Step 3: Commit**

```bash
git add frontend/src/pages/AdminPage.tsx
git commit -m "feat(frontend): implement full Admin page with player/config/history tabs"
```

---

## Task 12: End-to-End Verification

**Step 1: Start backend**

```bash
cd /Users/cuongpham/ws/bingo/backend && npm run dev
```

Expected: `Colyseus server running on ws://localhost:2567`

**Step 2: Start frontend (terminal mới)**

```bash
cd /Users/cuongpham/ws/bingo/frontend && npm run dev
```

Expected: Vite server trên http://localhost:5173

**Step 3: Test User flow**

1. Mở http://localhost:5173 — modal nhập tên xuất hiện
2. Nhập tên, bấm "Vào game"
3. Màn hình game hiện ra, countdown đang chạy
4. Mở tab mới, nhập tên khác — cả 2 tab cùng countdown
5. Đặt cược trong tab 1 — cược hiện trên màn hình
6. Chờ hết countdown — xem dice reveal animation
7. Xem thắng/thua và coins thay đổi trong leaderboard
8. Refresh trang — tên không hỏi lại (localStorage)

**Step 4: Test Admin flow**

1. Mở http://localhost:5173/admin
2. Nhập password `admin123` — vào được admin
3. Tab Players: thấy danh sách players, bấm "+100" tặng coins
4. Tab Config: thay đổi roundDuration → 10, lưu → vòng tiếp ngắn hơn
5. Tab History: thấy các vòng đã quay

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: complete Bingo 18 multiplayer game implementation"
```

---

## .env Setup (Optional)

```bash
# backend/.env
PORT=2567
ADMIN_PASSWORD=your-secret-password
```

Update `backend/src/index.ts` để load dotenv:
```bash
cd backend && npm install dotenv
```
Thêm đầu file: `import "dotenv/config";`
