import express from "express";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import cors from "cors";
import http from "http";
import { BingoRoom } from "./rooms/BingoRoom";

const PORT = Number(process.env.PORT) || 2567;
const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

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

const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("bingo", BingoRoom).on("create", (room: BingoRoom) => {
  bingoRoomRef = room;
});

gameServer.listen(PORT).then(() => {
  console.log(`Colyseus server running on ws://localhost:${PORT}`);
});
