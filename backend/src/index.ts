import "dotenv/config";
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

const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const password = req.query.password || req.body?.password;
  const adminPwd = process.env.ADMIN_PASSWORD || "admin123";
  if (password !== adminPwd) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

let bingoRoomRef: BingoRoom | null = null;

app.get("/api/admin/verify", adminAuth, (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/admin/players", adminAuth, (_req, res) => {
  if (!bingoRoomRef) return res.json([]);
  const players: object[] = [];
  bingoRoomRef.state.players.forEach((p, sessionId) => {
    players.push({ sessionId, id: p.id, name: p.name, coins: p.coins });
  });
  res.json(players);
});

app.post("/api/admin/players/:sessionId/coins", adminAuth, (req, res) => {
  if (!bingoRoomRef) return res.status(404).json({ error: "No room" });
  const player = bingoRoomRef.state.players.get(req.params.sessionId);
  if (!player) return res.status(404).json({ error: "Player not found" });
  const { amount, mode } = req.body;
  if (mode === "set") player.coins = Number(amount);
  else player.coins = Math.max(0, player.coins + Number(amount));
  res.json({ ok: true, coins: player.coins });
});

app.get("/api/admin/config", adminAuth, (_req, res) => {
  if (!bingoRoomRef) return res.json({});
  const c = bingoRoomRef.state.config;
  res.json({
    startCoins: c.startCoins,
    minBet: c.minBet,
    roundDuration: c.roundDuration,
    houseFeeEnabled: c.houseFeeEnabled,
    houseFeeMin: c.houseFeeMin,
    houseFeeMax: c.houseFeeMax,
  });
});

app.post("/api/admin/config", adminAuth, (req, res) => {
  if (!bingoRoomRef) return res.status(404).json({ error: "No room" });
  const c = bingoRoomRef.state.config;
  if (req.body.startCoins != null) c.startCoins = Number(req.body.startCoins);
  if (req.body.minBet != null) c.minBet = Number(req.body.minBet);
  if (req.body.roundDuration != null) c.roundDuration = Number(req.body.roundDuration);
  if (req.body.houseFeeEnabled != null) c.houseFeeEnabled = Boolean(req.body.houseFeeEnabled);
  if (req.body.houseFeeMin != null) c.houseFeeMin = Number(req.body.houseFeeMin);
  if (req.body.houseFeeMax != null) c.houseFeeMax = Number(req.body.houseFeeMax);
  res.json({ ok: true });
});

app.get("/api/admin/status", adminAuth, (_req, res) => {
  if (!bingoRoomRef) return res.json({ status: "waiting" });
  res.json({ status: bingoRoomRef.state.round.status });
});

app.post("/api/admin/start", adminAuth, (_req, res) => {
  if (!bingoRoomRef) return res.status(404).json({ error: "No room" });
  const started = bingoRoomRef.startGame();
  if (!started) return res.status(400).json({ error: "Game already running" });
  res.json({ ok: true });
});

app.post("/api/admin/reset", adminAuth, (_req, res) => {
  if (!bingoRoomRef) return res.status(404).json({ error: "No room" });
  bingoRoomRef.resetGame();
  res.json({ ok: true });
});

app.post("/api/admin/hacker", adminAuth, (req, res) => {
  if (!bingoRoomRef) return res.status(404).json({ error: "No room" });
  const min = Math.max(0, Number(req.body.min) || 0);
  const max = Math.max(min, Number(req.body.max) || min);
  const allKeys: string[] = [];
  bingoRoomRef.state.players.forEach((_p, key) => allKeys.push(key));
  const count = allKeys.length;
  if (count === 0) return res.status(400).json({ error: "No players" });
  const shuffled = allKeys.sort(() => Math.random() - 0.5);
  const targetCount = Math.floor(count / 2) + 1 + Math.floor(Math.random() * Math.ceil(count / 2));
  const victims = shuffled.slice(0, Math.min(targetCount, count));
  const stolen: { name: string; amount: number }[] = [];
  victims.forEach((key) => {
    const p = bingoRoomRef!.state.players.get(key);
    if (!p) return;
    const fee = min + Math.floor(Math.random() * (max - min + 1));
    const actual = Math.min(p.coins, fee);
    p.coins = Math.max(0, p.coins - actual);
    if (actual > 0) stolen.push({ name: p.name, amount: actual });
  });
  bingoRoomRef.broadcast("hacker", { victims: stolen });
  res.json({ ok: true, victimCount: stolen.length, playerCount: count });
});

app.post("/api/admin/jackpot", adminAuth, (req, res) => {
  if (!bingoRoomRef) return res.status(404).json({ error: "No room" });
  const min = Math.max(0, Number(req.body.min) || 0);
  const max = Math.max(min, Number(req.body.max) || min);
  const total = min + Math.floor(Math.random() * (max - min + 1));
  const players: string[] = [];
  bingoRoomRef.state.players.forEach((_p, key) => players.push(key));
  const count = players.length;
  if (count === 0) return res.status(400).json({ error: "No players" });
  const perPlayer = Math.floor(total / count);
  bingoRoomRef.state.players.forEach((p) => { p.coins += perPlayer; });
  bingoRoomRef.broadcast("jackpot", { total, perPlayer, playerCount: count });
  res.json({ ok: true, total, perPlayer, playerCount: count });
});

app.get("/api/admin/history", adminAuth, (_req, res) => {
  if (!bingoRoomRef) return res.json([]);
  const history: object[] = [];
  bingoRoomRef.state.history.forEach((h) => {
    history.push({ id: h.id, numbers: [...h.numbers], timestamp: h.timestamp });
  });
  res.json(history.reverse());
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
