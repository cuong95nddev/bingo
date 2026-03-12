import { useState, useEffect, useRef } from "react";
import { computeThresholds } from "../utils/diceUtils";
import { Client } from "@colyseus/sdk";
import type { Room } from "@colyseus/sdk";
import {
  Shield,
  Dice5,
  Users,
  LogOut,
  Zap,
  Trophy,
  Hash,
  Play,
  RotateCcw,
  Timer,
  Coins,
  Plus,
  Replace,
  Trash2,
  Activity,
  CircleDot,
  UserX,
} from "lucide-react";

const API = "/api/admin";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "ws://localhost:2567";

interface Player { sessionId: string; id: string; name: string; avatar: string; coins: number; online: boolean }
interface Config { startCoins: number; minBet: number; roundDuration: number; maxRounds: number; diceMax: number; houseFeeEnabled: boolean; houseFeeMin: number; houseFeeMax: number; hackerEnabled: boolean; hackerChance: number; hackerMin: number; hackerMax: number; jackpotEnabled: boolean; jackpotChance: number; jackpotMin: number; jackpotMax: number }
interface RoundHistory { id: number; numbers: number[]; timestamp: number }
interface StatusResponse { status: string; countdown: number; roundId: number; numbers: number[]; maxRounds: number; diceMax: number }

const STATUS_LABELS: Record<string, string> = {
  waiting: "Waiting",
  betting: "Betting",
  drawing: "Drawing",
  result: "Result",
  highlight: "Highlight",
  finished: "Finished",
};

/* ─── Login ─── */
function LoginScreen({ password, setPassword, onLogin, error }: {
  password: string; setPassword: (v: string) => void; onLogin: (e: React.FormEvent) => void; error: string;
}) {
  return (
    <div className="min-h-screen bg-[#1a1b1e] flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <form onSubmit={onLogin} className="bg-[#25262b] border border-[#373a40] p-8 rounded-xl w-[340px] space-y-5">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2c2e33] border border-[#424549] flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#d1d5db]" />
          </div>
          <h1 className="text-[#f3f4f6] text-lg font-semibold tracking-tight">Admin Panel</h1>
          <p className="text-[#9ca3af] text-sm">Enter password to continue</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-[#1a1b1e] text-[#f3f4f6] rounded-lg px-3.5 py-2.5 text-sm outline-none border border-[#373a40] focus:border-[#6b7280] transition-colors placeholder:text-[#6b7280]"
        />
        {error && <p className="text-[#e5484d] text-sm text-center">{error}</p>}
        <button type="submit" className="w-full bg-[#f3f4f6] hover:bg-white text-[#1a1b1e] font-medium py-2.5 rounded-lg text-sm transition-colors">
          Sign in
        </button>
      </form>
    </div>
  );
}

/* ─── Status dot ─── */
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    waiting: "bg-[#9ca3af]",
    betting: "bg-[#30a46c]",
    drawing: "bg-[#6e56cf]",
    result: "bg-[#e5a000]",
    highlight: "bg-[#ab4aba]",
    finished: "bg-[#9ca3af]",
  };
  return (
    <span className="relative flex h-2 w-2">
      {(status === "betting" || status === "drawing") && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${colors[status] || "bg-[#9ca3af]"}`} />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colors[status] || "bg-[#9ca3af]"}`} />
    </span>
  );
}

/* ─── KPI Card ─── */
function KpiCards({ playerCount, gameStatus, totalRounds }: {
  playerCount: number; gameStatus: string; totalRounds: number;
}) {
  const cards = [
    { label: "Online", value: playerCount, icon: Users, accent: "#30a46c" },
    { label: "Status", value: STATUS_LABELS[gameStatus] || gameStatus, icon: Activity, accent: "#6e56cf", dot: gameStatus },
    { label: "Rounds", value: totalRounds, icon: Hash, accent: "#e5a000" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-[#25262b] border border-[#373a40] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#9ca3af] text-xs font-medium uppercase tracking-wider">{card.label}</span>
              <Icon className="w-3.5 h-3.5" style={{ color: card.accent }} />
            </div>
            <div className="flex items-center gap-2">
              {card.dot && <StatusDot status={card.dot} />}
              <span className="text-[#f3f4f6] text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{card.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Live Round ─── */
function LiveRoundCard({ statusData }: { statusData: StatusResponse }) {
  if (statusData.status === "waiting") return null;

  const sum = statusData.numbers.reduce((a, b) => a + b, 0);
  const allRevealed = statusData.numbers.length === 3;

  return (
    <div className="bg-[#25262b] border border-[#373a40] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Dice5 className="w-4 h-4 text-[#9ca3af]" />
          <span className="text-[#f3f4f6] text-sm font-medium">
            Round #{statusData.roundId}
            {statusData.maxRounds > 0 && <span className="text-[#6b7280]"> / {statusData.maxRounds}</span>}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {statusData.status === "betting" && statusData.countdown > 0 && (
            <div className="flex items-center gap-1.5 text-[#30a46c]">
              <Timer className="w-3.5 h-3.5" />
              <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{statusData.countdown}s</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2c2e33] border border-[#373a40]">
            <StatusDot status={statusData.status} />
            <span className="text-xs font-medium text-[#d1d5db]">{STATUS_LABELS[statusData.status] || statusData.status}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl transition-all border ${
                statusData.numbers[i] != null
                  ? "bg-[#2c2e33] border-[#424549] text-[#f3f4f6]"
                  : "bg-[#1a1b1e] border-[#2c2e33] text-[#424549]"
              }`}
            >
              {statusData.numbers[i] != null ? statusData.numbers[i] : "?"}
            </div>
          ))}
        </div>
        {allRevealed && (() => {
          const t = computeThresholds(statusData.diceMax);
          const label = sum >= t.bigMin ? "Big" : sum <= t.smallMax ? "Small" : "Draw";
          const color = sum >= t.bigMin ? "#e5484d" : sum <= t.smallMax ? "#3b9eff" : "#e5a000";
          return (
            <div className="flex items-center gap-2 ml-1">
              <span className="text-[#9ca3af] text-sm">=</span>
              <span className="text-[#f3f4f6] font-bold text-lg" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sum}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ color, backgroundColor: `${color}15` }}>{label}</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ─── Toggle ─── */
function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? "bg-[#30a46c]" : "bg-[#424549]"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
    </button>
  );
}

/* ─── Config Section ─── */
function ConfigSection({ config, setConfig }: { config: Config; setConfig: (c: Config) => void }) {
  const inputCls = "w-full bg-[#1a1b1e] text-[#f3f4f6] rounded-lg px-3 py-2 text-sm border border-[#373a40] focus:border-[#6b7280] outline-none transition-colors";
  const labelCls = "text-[#9ca3af] text-xs font-medium block mb-1.5";

  return (
    <div className="space-y-4">
      {/* Basic */}
      <div className="bg-[#25262b] border border-[#373a40] rounded-lg">
        <div className="px-5 py-3.5 border-b border-[#373a40]">
          <h3 className="text-[#f3f4f6] text-sm font-medium">Basic Settings</h3>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Starting Coins</label>
            <input type="number" value={config.startCoins} onChange={(e) => setConfig({ ...config, startCoins: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Min Bet</label>
            <input type="number" value={config.minBet} onChange={(e) => setConfig({ ...config, minBet: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Round Duration (sec)</label>
            <input type="number" value={config.roundDuration} onChange={(e) => setConfig({ ...config, roundDuration: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Max Rounds (0 = unlimited)</label>
            <input type="number" value={config.maxRounds} min={0} onChange={(e) => setConfig({ ...config, maxRounds: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Dice Max (2-6)</label>
            <input type="number" value={config.diceMax} min={2} max={6} onChange={(e) => setConfig({ ...config, diceMax: Math.max(2, Math.min(6, Number(e.target.value))) })} className={inputCls} />
          </div>
        </div>
      </div>

      {/* House Fee */}
      <div className="bg-[#25262b] border border-[#373a40] rounded-lg">
        <div className="px-5 py-3.5 border-b border-[#373a40] flex items-center justify-between">
          <div>
            <h3 className="text-[#f3f4f6] text-sm font-medium">Idle Fee</h3>
            <p className="text-[#6b7280] text-xs mt-0.5">Charge random fee if player doesn't bet</p>
          </div>
          <Toggle enabled={config.houseFeeEnabled} onToggle={() => setConfig({ ...config, houseFeeEnabled: !config.houseFeeEnabled })} />
        </div>
        <div className={`p-5 grid grid-cols-2 gap-4 transition-opacity ${!config.houseFeeEnabled ? "opacity-30 pointer-events-none" : ""}`}>
          <div>
            <label className={labelCls}>Min Fee</label>
            <input type="number" value={config.houseFeeMin} onChange={(e) => setConfig({ ...config, houseFeeMin: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Max Fee</label>
            <input type="number" value={config.houseFeeMax} onChange={(e) => setConfig({ ...config, houseFeeMax: Number(e.target.value) })} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Hacker */}
      <div className="bg-[#25262b] border border-[#373a40] rounded-lg">
        <div className="px-5 py-3.5 border-b border-[#373a40] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#e5484d]" />
            <div>
              <h3 className="text-[#f3f4f6] text-sm font-medium">Hacker</h3>
              <p className="text-[#6b7280] text-xs mt-0.5">Randomly deduct coins each round</p>
            </div>
          </div>
          <Toggle enabled={config.hackerEnabled} onToggle={() => setConfig({ ...config, hackerEnabled: !config.hackerEnabled })} />
        </div>
        <div className={`p-5 grid grid-cols-3 gap-4 transition-opacity ${!config.hackerEnabled ? "opacity-30 pointer-events-none" : ""}`}>
          <div>
            <label className={labelCls}>Chance (%)</label>
            <input type="number" value={config.hackerChance} min={0} max={100} onChange={(e) => setConfig({ ...config, hackerChance: Math.max(0, Math.min(100, Number(e.target.value))) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Min Deduct</label>
            <input type="number" value={config.hackerMin} onChange={(e) => setConfig({ ...config, hackerMin: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Max Deduct</label>
            <input type="number" value={config.hackerMax} onChange={(e) => setConfig({ ...config, hackerMax: Number(e.target.value) })} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Jackpot */}
      <div className="bg-[#25262b] border border-[#373a40] rounded-lg">
        <div className="px-5 py-3.5 border-b border-[#373a40] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-[#e5a000]" />
            <div>
              <h3 className="text-[#f3f4f6] text-sm font-medium">Jackpot</h3>
              <p className="text-[#6b7280] text-xs mt-0.5">Randomly distribute coins each round</p>
            </div>
          </div>
          <Toggle enabled={config.jackpotEnabled} onToggle={() => setConfig({ ...config, jackpotEnabled: !config.jackpotEnabled })} />
        </div>
        <div className={`p-5 grid grid-cols-3 gap-4 transition-opacity ${!config.jackpotEnabled ? "opacity-30 pointer-events-none" : ""}`}>
          <div>
            <label className={labelCls}>Chance (%)</label>
            <input type="number" value={config.jackpotChance} min={0} max={100} onChange={(e) => setConfig({ ...config, jackpotChance: Math.max(0, Math.min(100, Number(e.target.value))) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Min Amount</label>
            <input type="number" value={config.jackpotMin} onChange={(e) => setConfig({ ...config, jackpotMin: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Max Amount</label>
            <input type="number" value={config.jackpotMax} onChange={(e) => setConfig({ ...config, jackpotMax: Number(e.target.value) })} className={inputCls} />
          </div>
        </div>
      </div>

    </div>
  );
}

/* ─── Players Section ─── */
function PlayersSection({ players, giftAmount, setGiftAmount, handleGiftCoins, handleDeletePlayer }: {
  players: Player[]; giftAmount: number; setGiftAmount: (v: number) => void;
  handleGiftCoins: (sessionId: string, mode: "add" | "set") => void;
  handleDeletePlayer: (sessionId: string, name: string) => void;
}) {
  return (
    <div className="bg-[#25262b] border border-[#373a40] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#373a40]">
        <div className="flex items-center gap-2">
          <h3 className="text-[#f3f4f6] text-sm font-medium">Players</h3>
          <span className="text-[#6b7280] text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{players.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Coins className="w-3.5 h-3.5 text-[#9ca3af]" />
          <input
            type="number"
            value={giftAmount}
            onChange={(e) => setGiftAmount(Number(e.target.value))}
            className="w-20 bg-[#1a1b1e] text-[#f3f4f6] rounded-md px-2.5 py-1.5 text-xs border border-[#373a40] focus:border-[#6b7280] outline-none transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[#9ca3af] text-xs uppercase tracking-wider border-b border-[#2c2e33]">
            <th className="text-left py-2.5 px-5 font-medium">Name</th>
            <th className="text-right py-2.5 px-5 font-medium">Coins</th>
            <th className="text-center py-2.5 px-5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.sessionId} className="border-b border-[#2c2e33] hover:bg-[#2c2e33]/50 transition-colors">
              <td className="py-3 px-5">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={p.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(p.id)}`}
                      alt={p.name}
                      className="w-8 h-8 rounded-full bg-[#2c2e33]"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                        p.online ? "bg-[#30a46c] border-[#25262b]" : "bg-[#6b7280] border-[#25262b]"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-[#f3f4f6] text-sm font-medium">{p.name}</div>
                    <div className="text-[#6b7280] text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.id.slice(0, 12)}</div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-5 text-right font-semibold text-[#e5a000]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.coins.toLocaleString()}</td>
              <td className="py-3 px-5">
                <div className="flex gap-1.5 justify-center">
                  <button onClick={() => handleGiftCoins(p.sessionId, "add")} className="bg-[#2c2e33] hover:bg-[#373a40] text-[#30a46c] px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors border border-[#373a40]">
                    <Plus className="w-3 h-3" />{giftAmount}
                  </button>
                  <button onClick={() => handleGiftCoins(p.sessionId, "set")} className="bg-[#2c2e33] hover:bg-[#373a40] text-[#3b9eff] px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors border border-[#373a40]">
                    <Replace className="w-3 h-3" />{giftAmount}
                  </button>
                  <button onClick={() => handleGiftCoins(p.sessionId, "set")} className="bg-[#2c2e33] hover:bg-[#373a40] text-[#e5484d] px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors border border-[#373a40]">
                    <Trash2 className="w-3 h-3" />0
                  </button>
                  <button onClick={() => handleDeletePlayer(p.sessionId, p.name)} className="bg-[#2c2e33] hover:bg-[#e5484d]/20 text-[#e5484d] px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors border border-[#e5484d]/30">
                    <UserX className="w-3 h-3" />Kick
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {players.length === 0 && (
            <tr><td colSpan={3} className="py-16 text-center text-[#6b7280] text-sm">No players connected</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── History Section ─── */
function HistorySection({ history, diceMax }: { history: RoundHistory[]; diceMax: number }) {
  const t = computeThresholds(diceMax);
  return (
    <div className="bg-[#25262b] border border-[#373a40] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#373a40]">
        <div className="flex items-center gap-2">
          <h3 className="text-[#f3f4f6] text-sm font-medium">Round History</h3>
          <span className="text-[#6b7280] text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{history.length}</span>
        </div>
      </div>
      <div className="divide-y divide-[#2c2e33] max-h-[420px] overflow-y-auto">
        {history.map((h) => {
          const sum = h.numbers.reduce((a, b) => a + b, 0);
          const label = sum >= t.bigMin ? "Big" : sum <= t.smallMax ? "Small" : "Draw";
          const color = sum >= t.bigMin ? "#e5484d" : sum <= t.smallMax ? "#3b9eff" : "#e5a000";
          return (
            <div key={h.id} className="px-5 py-3 flex items-center gap-4 hover:bg-[#2c2e33]/50 transition-colors">
              <span className="text-[#6b7280] text-xs w-10" style={{ fontFamily: "'JetBrains Mono', monospace" }}>#{h.id}</span>
              <div className="flex gap-1.5">
                {h.numbers.map((n, i) => (
                  <span key={i} className="w-8 h-8 rounded-md bg-[#2c2e33] border border-[#373a40] flex items-center justify-center text-sm font-bold text-[#f3f4f6]">{n}</span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#f3f4f6] text-sm font-semibold w-6 text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sum}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color, backgroundColor: `${color}12` }}>{label}</span>
              </div>
              <span className="text-[#6b7280] text-xs ml-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {new Date(h.timestamp).toLocaleTimeString("vi-VN")}
              </span>
            </div>
          );
        })}
        {history.length === 0 && (
          <div className="text-center py-16 text-[#6b7280] text-sm">No history yet</div>
        )}
      </div>
    </div>
  );
}

/* ─── Dashboard Tab ─── */
function DashboardTab({ players, statusData, gameStatus, history, starting, onStart, onReset, giftAmount, setGiftAmount, handleGiftCoins, handleDeletePlayer, diceMax }: {
  players: Player[]; statusData: StatusResponse; gameStatus: string; history: RoundHistory[];
  starting: boolean; onStart: () => void; onReset: () => void;
  giftAmount: number; setGiftAmount: (v: number) => void;
  handleGiftCoins: (sessionId: string, mode: "add" | "set") => void;
  handleDeletePlayer: (sessionId: string, name: string) => void;
  diceMax: number;
}) {
  return (
    <div className="space-y-4">
      <KpiCards playerCount={players.length} gameStatus={gameStatus} totalRounds={history.length} />
      <LiveRoundCard statusData={statusData} />

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#25262b] border border-[#373a40] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <CircleDot className="w-3.5 h-3.5 text-[#30a46c]" />
            <h3 className="text-[#f3f4f6] text-sm font-medium">Controls</h3>
          </div>
          <button
            onClick={onStart}
            disabled={gameStatus !== "waiting" || starting}
            className="w-full bg-[#30a46c] hover:bg-[#3cb97c] disabled:bg-[#2c2e33] disabled:text-[#6b7280] disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {starting ? "Starting..." : "Start Game"}
          </button>
          {gameStatus !== "waiting" && (
            <p className="text-[#6b7280] text-xs text-center mt-3">
              {gameStatus === "finished" ? "Game over \u2014 reset to play again" : "Game running \u2014 rounds auto-continue"}
            </p>
          )}
        </div>
        <div className="bg-[#25262b] border border-[#373a40] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw className="w-3.5 h-3.5 text-[#e5484d]" />
            <h3 className="text-[#f3f4f6] text-sm font-medium">Reset</h3>
          </div>
          <button
            onClick={onReset}
            className="w-full bg-transparent hover:bg-[#e5484d]/10 text-[#e5484d] font-medium py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 border border-[#e5484d]/20 hover:border-[#e5484d]/40"
          >
            <RotateCcw className="w-4 h-4" />
            New Game (Reset)
          </button>
          <p className="text-[#6b7280] text-xs text-center mt-3">Reset all data and start fresh</p>
        </div>
      </div>

      <PlayersSection players={players} giftAmount={giftAmount} setGiftAmount={setGiftAmount} handleGiftCoins={handleGiftCoins} handleDeletePlayer={handleDeletePlayer} />
      <HistorySection history={history} diceMax={diceMax} />
    </div>
  );
}

/* ─── Main ─── */
export function AdminPage() {
  const [password, setPassword] = useState(() => localStorage.getItem("admin_password") || "");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin_password");
    if (!saved) { setAuthChecked(true); return; }
    fetch(`${API}/verify?password=${saved}`).then((res) => {
      if (res.ok) {
        setPassword(saved);
        setAuthenticated(true);
      } else {
        localStorage.removeItem("admin_password");
      }
      setAuthChecked(true);
    }).catch(() => { setAuthChecked(true); });
  }, []);
  const [players, setPlayers] = useState<Player[]>([]);
  const [config, setConfig] = useState<Config>({ startCoins: 1000, minBet: 10, roundDuration: 30, maxRounds: 0, diceMax: 6, houseFeeEnabled: false, houseFeeMin: 10, houseFeeMax: 50, hackerEnabled: false, hackerChance: 20, hackerMin: 50, hackerMax: 300, jackpotEnabled: false, jackpotChance: 15, jackpotMin: 500, jackpotMax: 2000 });
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [giftAmount, setGiftAmount] = useState(100);
  const [statusData, setStatusData] = useState<StatusResponse>({ status: "waiting", countdown: 0, roundId: 0, numbers: [], maxRounds: 0, diceMax: 6 });
  const [starting, setStarting] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const roomRef = useRef<Room | null>(null);

  const gameStatus = statusData.status;

  useEffect(() => {
    if (!authenticated) return;

    let cancelled = false;
    const client = new Client(BACKEND_URL);

    const connectTimer = setTimeout(() => {
      if (cancelled) return;
      client
        .joinOrCreate("bingo", { admin: true, password, name: "Admin", visitorId: "admin" })
        .then((room) => {
          if (cancelled) { room.leave(); return; }
          roomRef.current = room;

interface RawPlayer { id: string; name: string; avatar: string; coins: number; online: boolean; }
interface RawHistory { id: number; numbers: Iterable<number>; timestamp: number; }
interface RawState {
  players: { forEach: (cb: (p: RawPlayer, sessionId: string) => void) => void };
  round: { status: string; countdown: number; id: number; numbers: Iterable<number>; };
  config: Config;
  history: { forEach: (cb: (h: RawHistory) => void) => void };
}

          room.onStateChange((state: unknown) => {
            const s = state as RawState;
            const playerList: Player[] = [];
            s.players.forEach((p: RawPlayer, sessionId: string) => {
              playerList.push({ sessionId, id: p.id, name: p.name, avatar: p.avatar ?? "", coins: p.coins, online: p.online ?? false });
            });
            setPlayers(playerList);

            setStatusData({
              status: s.round.status,
              countdown: s.round.countdown,
              roundId: s.round.id,
              numbers: [...s.round.numbers],
              maxRounds: s.config.maxRounds,
              diceMax: s.config.diceMax ?? 6,
            });

            const hist: RoundHistory[] = [];
            s.history.forEach((h: RawHistory) => {
              hist.push({ id: h.id, numbers: [...h.numbers], timestamp: h.timestamp });
            });
            setHistory(hist.reverse());

            setConfig({
              startCoins: s.config.startCoins,
              minBet: s.config.minBet,
              roundDuration: s.config.roundDuration,
              maxRounds: s.config.maxRounds,
              diceMax: s.config.diceMax ?? 6,
              houseFeeEnabled: s.config.houseFeeEnabled,
              houseFeeMin: s.config.houseFeeMin,
              houseFeeMax: s.config.houseFeeMax,
              hackerEnabled: s.config.hackerEnabled,
              hackerChance: s.config.hackerChance ?? 20,
              hackerMin: s.config.hackerMin,
              hackerMax: s.config.hackerMax,
              jackpotEnabled: s.config.jackpotEnabled,
              jackpotChance: s.config.jackpotChance ?? 15,
              jackpotMin: s.config.jackpotMin,
              jackpotMax: s.config.jackpotMax,
            });
          });

          room.onLeave(() => { roomRef.current = null; });
        })
        .catch((err: unknown) => {
          if (!cancelled) console.error("Admin failed to join room:", err);
        });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(connectTimer);
      roomRef.current?.leave();
      roomRef.current = null;
    };
  }, [authenticated, password]);

  const handleSaveConfig = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await fetch(`${API}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, password }),
    });
  };

  const handleStartGame = async () => {
    setStarting(true);
    await handleSaveConfig();
    await fetch(`${API}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setStarting(false);
    setShowStartDialog(false);
  };

  const handleNewGame = async () => {
    if (!confirm("Reset all data and start a new game?")) return;
    await fetch(`${API}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API}/verify?password=${password}`);
    if (res.ok) {
      localStorage.setItem("admin_password", password);
      setAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Wrong password");
    }
  };

  const handleGiftCoins = async (sessionId: string, mode: "add" | "set") => {
    const amount = mode === "set" && giftAmount === 0 ? 0 : giftAmount;
    await fetch(`${API}/players/${sessionId}/coins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, amount, mode }),
    });
  };

  const handleDeletePlayer = async (sessionId: string, name: string) => {
    if (!confirm(`Kick player "${name}"? They will be removed and redirected to login.`)) return;
    await fetch(`${API}/players/${sessionId}?password=${password}`, {
      method: "DELETE",
    });
  };

  if (!authChecked) {
    return <div className="min-h-screen bg-[#1a1b1e]" />;
  }

  if (!authenticated) {
    return <LoginScreen password={password} setPassword={setPassword} onLogin={handleLogin} error={authError} />;
  }

  return (
    <div className="min-h-screen bg-[#1a1b1e] text-[#f3f4f6]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="border-b border-[#2c2e33] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#25262b] border border-[#373a40] flex items-center justify-center">
            <Dice5 className="w-4 h-4 text-[#9ca3af]" />
          </div>
          <div className="text-[#f3f4f6] text-sm font-semibold">Bingo 18 Admin</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <StatusDot status={gameStatus} />
            <span className="text-xs text-[#9ca3af]">{STATUS_LABELS[gameStatus] || gameStatus}</span>
          </div>
          <button
            onClick={() => { localStorage.removeItem("admin_password"); setAuthenticated(false); }}
            className="flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-[#e5484d] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <DashboardTab
          players={players}
          statusData={statusData}
          gameStatus={gameStatus}
          history={history}
          starting={starting}
          onStart={() => setShowStartDialog(true)}
          onReset={handleNewGame}
          giftAmount={giftAmount}
          setGiftAmount={setGiftAmount}
          handleGiftCoins={handleGiftCoins}
          handleDeletePlayer={handleDeletePlayer}
          diceMax={config.diceMax}
        />
      </div>

      {/* Start Dialog */}
      {showStartDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#25262b] border border-[#373a40] rounded-xl p-6 w-full max-w-md mx-4 space-y-5 max-h-[90vh] overflow-y-auto" style={{ fontFamily: "'DM Sans', sans-serif" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5">
              <Play className="w-4 h-4 text-[#30a46c]" />
              <h2 className="text-[#f3f4f6] text-base font-semibold">Configure & Start</h2>
            </div>
            <ConfigSection config={config} setConfig={setConfig} />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowStartDialog(false)}
                className="flex-1 bg-[#2c2e33] hover:bg-[#373a40] text-[#d1d5db] font-medium py-2.5 rounded-lg text-sm transition-colors border border-[#373a40]"
              >
                Cancel
              </button>
              <button
                onClick={handleStartGame}
                disabled={starting}
                className="flex-1 bg-[#30a46c] hover:bg-[#3cb97c] disabled:bg-[#2c2e33] disabled:text-[#6b7280] text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {starting ? "Starting..." : "Start Game"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
