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
    hackerEnabled: c.hackerEnabled,
    hackerMin: c.hackerMin,
    hackerMax: c.hackerMax,
    jackpotEnabled: c.jackpotEnabled,
    jackpotMin: c.jackpotMin,
    jackpotMax: c.jackpotMax,
    maxRounds: c.maxRounds,
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
  if (req.body.hackerEnabled != null) c.hackerEnabled = Boolean(req.body.hackerEnabled);
  if (req.body.hackerMin != null) c.hackerMin = Number(req.body.hackerMin);
  if (req.body.hackerMax != null) c.hackerMax = Number(req.body.hackerMax);
  if (req.body.jackpotEnabled != null) c.jackpotEnabled = Boolean(req.body.jackpotEnabled);
  if (req.body.jackpotMin != null) c.jackpotMin = Number(req.body.jackpotMin);
  if (req.body.jackpotMax != null) c.jackpotMax = Number(req.body.jackpotMax);
  if (req.body.maxRounds != null) c.maxRounds = Number(req.body.maxRounds);
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
  const result = bingoRoomRef.triggerHacker(min, max);
  if (!result) return res.status(400).json({ error: "No players" });
  res.json({ ok: true, ...result });
});

app.post("/api/admin/jackpot", adminAuth, (req, res) => {
  if (!bingoRoomRef) return res.status(404).json({ error: "No room" });
  const min = Math.max(0, Number(req.body.min) || 0);
  const max = Math.max(min, Number(req.body.max) || min);
  const result = bingoRoomRef.triggerJackpot(min, max);
  if (!result) return res.status(400).json({ error: "No players" });
  res.json({ ok: true, ...result });
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
