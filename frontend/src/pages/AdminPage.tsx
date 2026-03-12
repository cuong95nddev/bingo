import { useState, useEffect, useRef } from "react";
import { computeThresholds } from "../utils/diceUtils";
import { Client } from "@colyseus/sdk";
import type { Room } from "@colyseus/sdk";
import {
  Shield,
  Dice5,
  Users,
  Settings,
  ClipboardList,
  LogOut,
  Zap,
  Trophy,
  Hash,
  Play,
  RotateCcw,
  Timer,
  Circle,
  Coins,
  Plus,
  Replace,
  Trash2,
} from "lucide-react";

const API = "/api/admin";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "ws://localhost:2567";

interface Player { sessionId: string; id: string; name: string; coins: number }
interface Config { startCoins: number; minBet: number; roundDuration: number; maxRounds: number; diceMax: number; houseFeeEnabled: boolean; houseFeeMin: number; houseFeeMax: number; hackerEnabled: boolean; hackerChance: number; hackerMin: number; hackerMax: number; jackpotEnabled: boolean; jackpotChance: number; jackpotMin: number; jackpotMax: number }
interface RoundHistory { id: number; numbers: number[]; timestamp: number }
interface StatusResponse { status: string; countdown: number; roundId: number; numbers: number[]; maxRounds: number; diceMax: number }

const DICE_FACES = "⚀⚁⚂⚃⚄⚅";
const STATUS_LABELS: Record<string, string> = {
  waiting: "Chờ bắt đầu",
  betting: "Đang đặt cược",
  drawing: "Đang quay",
  result: "Kết quả",
  highlight: "Highlight",
  finished: "Kết thúc",
};
const STATUS_COLORS: Record<string, string> = {
  waiting: "bg-slate-700 text-slate-300",
  betting: "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30",
  drawing: "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30",
  result: "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30",
  highlight: "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30",
  finished: "bg-slate-600/50 text-slate-400",
};

function LoginScreen({ password, setPassword, onLogin, error }: {
  password: string; setPassword: (v: string) => void; onLogin: (e: React.FormEvent) => void; error: string;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950" />
      <form onSubmit={onLogin} className="relative bg-slate-900 border border-slate-700/50 p-8 rounded-2xl w-80 space-y-5 shadow-2xl shadow-indigo-950/50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center">
            <Shield className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-white text-xl font-semibold tracking-tight">Admin Panel</h1>
          <p className="text-slate-500 text-sm">Nhập mật khẩu để tiếp tục</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none border border-slate-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-600"
        />
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors">
          Đăng nhập
        </button>
      </form>
    </div>
  );
}

function KpiCards({ playerCount, gameStatus, totalRounds }: {
  playerCount: number; gameStatus: string; totalRounds: number;
}) {
  const cards = [
    { label: "Online Players", value: playerCount, icon: Users, color: "border-indigo-500", iconColor: "text-indigo-400 bg-indigo-500/10" },
    { label: "Trạng thái", value: STATUS_LABELS[gameStatus] || gameStatus, icon: Circle, color: "border-emerald-500", iconColor: "text-emerald-400 bg-emerald-500/10" },
    { label: "Tổng vòng", value: totalRounds, icon: Hash, color: "border-amber-500", iconColor: "text-amber-400 bg-amber-500/10" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`bg-slate-800/80 rounded-xl p-4 border-t-2 ${card.color}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-white text-2xl font-bold tracking-tight">{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}

function LiveRoundCard({ statusData }: { statusData: StatusResponse }) {
  if (statusData.status === "waiting") return null;

  const sum = statusData.numbers.reduce((a, b) => a + b, 0);
  const allRevealed = statusData.numbers.length === 3;

  return (
    <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Dice5 className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="text-white font-semibold">Vòng #{statusData.roundId}</span>
            {statusData.maxRounds > 0 && (
              <span className="text-slate-500 text-sm ml-2">/ {statusData.maxRounds}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {statusData.status === "betting" && statusData.countdown > 0 && (
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
              <Timer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-mono font-bold text-lg tabular-nums">{statusData.countdown}s</span>
            </div>
          )}
          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${STATUS_COLORS[statusData.status] || "bg-slate-700 text-slate-300"}`}>
            {STATUS_LABELS[statusData.status] || statusData.status}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-bold transition-all ${
                statusData.numbers[i] != null
                  ? "bg-indigo-600/20 border border-indigo-500/30 text-white"
                  : "bg-slate-700/50 border border-slate-600/30 text-slate-600"
              }`}
            >
              {statusData.numbers[i] != null ? DICE_FACES[statusData.numbers[i] - 1] : "?"}
            </div>
          ))}
        </div>
        {allRevealed && (() => {
          const t = computeThresholds(statusData.diceMax);
          return (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-slate-400 text-sm">Tổng</span>
              <span className="bg-slate-700 text-white font-bold text-lg px-3 py-1 rounded-lg">{sum}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                sum >= t.bigMin ? "bg-red-500/20 text-red-400" : sum <= t.smallMax ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
              }`}>
                {sum >= t.bigMin ? "Tài" : sum <= t.smallMax ? "Xỉu" : "Hoà"}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function Toggle({ enabled, onToggle, color = "bg-emerald-600" }: {
  enabled: boolean; onToggle: () => void; color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? color : "bg-slate-600"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function ConfigForm({ config, setConfig }: { config: Config; setConfig: (c: Config) => void }) {
  return (
    <div className="space-y-5">
      <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/50 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-400" /> Cơ bản
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Coins ban đầu</label>
            <input type="number" value={config.startCoins} onChange={(e) => setConfig({ ...config, startCoins: Number(e.target.value) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2.5 border border-slate-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Cược tối thiểu</label>
            <input type="number" value={config.minBet} onChange={(e) => setConfig({ ...config, minBet: Number(e.target.value) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2.5 border border-slate-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Thời gian mỗi vòng (giây)</label>
            <input type="number" value={config.roundDuration} onChange={(e) => setConfig({ ...config, roundDuration: Number(e.target.value) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2.5 border border-slate-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Số vòng tối đa (0 = ∞)</label>
            <input type="number" value={config.maxRounds} min={0} onChange={(e) => setConfig({ ...config, maxRounds: Number(e.target.value) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2.5 border border-slate-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Dice Max (2-6)</label>
            <input type="number" value={config.diceMax} min={2} max={6} onChange={(e) => setConfig({ ...config, diceMax: Math.max(2, Math.min(6, Number(e.target.value))) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2.5 border border-slate-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
          </div>
        </div>
      </div>

      <div className="bg-slate-800/80 rounded-xl p-5 border-l-2 border-slate-500/30 border border-slate-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Phí nhàn rỗi</h3>
            <p className="text-slate-500 text-xs mt-0.5">Thu phí ngẫu nhiên nếu không đặt cược</p>
          </div>
          <Toggle enabled={config.houseFeeEnabled} onToggle={() => setConfig({ ...config, houseFeeEnabled: !config.houseFeeEnabled })} />
        </div>
        <div className={`grid grid-cols-2 gap-3 transition-opacity ${!config.houseFeeEnabled ? "opacity-30 pointer-events-none" : ""}`}>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Phí tối thiểu</label>
            <input type="number" value={config.houseFeeMin} onChange={(e) => setConfig({ ...config, houseFeeMin: Number(e.target.value) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-sm border border-slate-700/50 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Phí tối đa</label>
            <input type="number" value={config.houseFeeMax} onChange={(e) => setConfig({ ...config, houseFeeMax: Number(e.target.value) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-sm border border-slate-700/50 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-slate-800/80 rounded-xl p-5 border-l-2 border-red-500/30 border border-slate-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-red-400 font-semibold flex items-center gap-2"><Zap className="w-4 h-4" /> Hacker</h3>
            <p className="text-slate-500 text-xs mt-0.5">Ngẫu nhiên trừ tiền người chơi mỗi vòng</p>
          </div>
          <Toggle enabled={config.hackerEnabled} onToggle={() => setConfig({ ...config, hackerEnabled: !config.hackerEnabled })} color="bg-red-600" />
        </div>
        <div className={`grid grid-cols-3 gap-3 transition-opacity ${!config.hackerEnabled ? "opacity-30 pointer-events-none" : ""}`}>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Tỉ lệ (%)</label>
            <input type="number" value={config.hackerChance} min={0} max={100} onChange={(e) => setConfig({ ...config, hackerChance: Math.max(0, Math.min(100, Number(e.target.value))) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-sm border border-slate-700/50 focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Trừ tối thiểu</label>
            <input type="number" value={config.hackerMin} onChange={(e) => setConfig({ ...config, hackerMin: Number(e.target.value) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-sm border border-slate-700/50 focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Trừ tối đa</label>
            <input type="number" value={config.hackerMax} onChange={(e) => setConfig({ ...config, hackerMax: Number(e.target.value) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-sm border border-slate-700/50 focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-slate-800/80 rounded-xl p-5 border-l-2 border-amber-500/30 border border-slate-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-amber-400 font-semibold flex items-center gap-2"><Trophy className="w-4 h-4" /> Nổ Hũ</h3>
            <p className="text-slate-500 text-xs mt-0.5">Ngẫu nhiên chia tiền cho tất cả mỗi vòng</p>
          </div>
          <Toggle enabled={config.jackpotEnabled} onToggle={() => setConfig({ ...config, jackpotEnabled: !config.jackpotEnabled })} color="bg-amber-600" />
        </div>
        <div className={`grid grid-cols-3 gap-3 transition-opacity ${!config.jackpotEnabled ? "opacity-30 pointer-events-none" : ""}`}>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Tỉ lệ (%)</label>
            <input type="number" value={config.jackpotChance} min={0} max={100} onChange={(e) => setConfig({ ...config, jackpotChance: Math.max(0, Math.min(100, Number(e.target.value))) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-sm border border-slate-700/50 focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Tối thiểu</label>
            <input type="number" value={config.jackpotMin} onChange={(e) => setConfig({ ...config, jackpotMin: Number(e.target.value) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-sm border border-slate-700/50 focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Tối đa</label>
            <input type="number" value={config.jackpotMax} onChange={(e) => setConfig({ ...config, jackpotMax: Number(e.target.value) })} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-sm border border-slate-700/50 focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayersSection({ players, giftAmount, setGiftAmount, handleGiftCoins }: {
  players: Player[]; giftAmount: number; setGiftAmount: (v: number) => void;
  handleGiftCoins: (sessionId: string, mode: "add" | "set") => void;
}) {
  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/50">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" /> Players
          <span className="text-slate-500 text-sm font-normal ml-1">{players.length}</span>
        </h3>
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-slate-500" />
          <input
            type="number"
            value={giftAmount}
            onChange={(e) => setGiftAmount(Number(e.target.value))}
            className="w-24 bg-slate-900 text-white rounded-lg px-3 py-1.5 text-sm border border-slate-700/50 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
            <th className="text-left py-3 px-4 font-medium">Tên</th>
            <th className="text-right py-3 px-4 font-medium">Coins</th>
            <th className="text-center py-3 px-4 font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={p.sessionId} className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${i % 2 ? "bg-slate-800/30" : ""}`}>
              <td className="py-3 px-4">
                <div className="text-white font-medium">{p.name}</div>
                <div className="text-slate-600 text-xs font-mono">{p.id.slice(0, 12)}...</div>
              </td>
              <td className="py-3 px-4 text-right font-mono text-amber-400 font-semibold">{p.coins.toLocaleString()}</td>
              <td className="py-3 px-4">
                <div className="flex gap-1.5 justify-center">
                  <button onClick={() => handleGiftCoins(p.sessionId, "add")} className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" />{giftAmount}
                  </button>
                  <button onClick={() => handleGiftCoins(p.sessionId, "set")} className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors">
                    <Replace className="w-3 h-3" />{giftAmount}
                  </button>
                  <button onClick={() => { handleGiftCoins(p.sessionId, "set"); }} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors">
                    <Trash2 className="w-3 h-3" />0
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {players.length === 0 && (
            <tr><td colSpan={3} className="py-12 text-center text-slate-600">Chưa có người chơi nào</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function HistorySection({ history, diceMax }: { history: RoundHistory[]; diceMax: number }) {
  const t = computeThresholds(diceMax);
  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-700/50">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-amber-400" /> Lịch sử
          <span className="text-slate-500 text-sm font-normal ml-1">{history.length} vòng</span>
        </h3>
      </div>
      <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
        {history.map((h) => {
          const sum = h.numbers.reduce((a, b) => a + b, 0);
          return (
            <div key={h.id} className="bg-slate-900/60 rounded-xl px-4 py-3 flex items-center gap-4 border border-slate-700/30 hover:border-slate-700/50 transition-colors">
              <span className="text-slate-500 text-sm font-mono w-12">#{h.id}</span>
              <div className="flex gap-2 text-xl">
                {h.numbers.map((n, i) => (
                  <span key={i} className="w-9 h-9 rounded-lg bg-slate-700/50 flex items-center justify-center">{DICE_FACES[n - 1]}</span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-700 text-white font-bold text-sm px-2.5 py-1 rounded-lg">{sum}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  sum >= t.bigMin ? "bg-red-500/20 text-red-400" : sum <= t.smallMax ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
                }`}>
                  {sum >= t.bigMin ? "Tài" : sum <= t.smallMax ? "Xỉu" : "Hoà"}
                </span>
              </div>
              <span className="text-slate-600 text-xs ml-auto font-mono">
                {new Date(h.timestamp).toLocaleTimeString("vi-VN")}
              </span>
            </div>
          );
        })}
        {history.length === 0 && (
          <div className="text-center py-12 text-slate-600">Chưa có lịch sử</div>
        )}
      </div>
    </div>
  );
}

export function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

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

interface RawPlayer { id: string; name: string; coins: number; }
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
              playerList.push({ sessionId, id: p.id, name: p.name, coins: p.coins });
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
    if (!confirm("Reset toàn bộ dữ liệu và bắt đầu game mới?")) return;
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
      setAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Sai mật khẩu");
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

  if (!authenticated) {
    return <LoginScreen password={password} setPassword={setPassword} onLogin={handleLogin} error={authError} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <Dice5 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm tracking-tight">Bí Ngô 88</div>
            <div className="text-[10px] uppercase tracking-widest text-indigo-400 font-medium">Admin Dashboard</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-indigo-600/20 text-indigo-400 px-2.5 py-1 rounded-lg text-xs font-medium">Admin</span>
          <button
            onClick={() => setAuthenticated(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-slate-800/60 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-5">
        <KpiCards playerCount={players.length} gameStatus={gameStatus} totalRounds={history.length} />
        <LiveRoundCard statusData={statusData} />

        {/* Game controls */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/50">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" /> Điều khiển
            </h3>
            <button
              onClick={() => setShowStartDialog(true)}
              disabled={gameStatus !== "waiting" || starting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              {starting ? "Đang khởi động..." : "Bắt đầu Game"}
            </button>
            {gameStatus !== "waiting" && (
              <p className="text-slate-500 text-sm text-center mt-3">
                {gameStatus === "finished" ? "Game đã kết thúc — nhấn Reset để chơi lại" : "Game đang chạy — các vòng tự động tiếp tục"}
              </p>
            )}
          </div>
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/50">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-red-400" /> Reset
            </h3>
            <button
              onClick={handleNewGame}
              className="w-full bg-red-600/80 hover:bg-red-600 text-white font-bold py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Game Mới (Reset)
            </button>
            <p className="text-slate-500 text-sm text-center mt-3">Reset toàn bộ dữ liệu và bắt đầu lại</p>
          </div>
        </div>

        {/* Players */}
        <PlayersSection players={players} giftAmount={giftAmount} setGiftAmount={setGiftAmount} handleGiftCoins={handleGiftCoins} />

        {/* History */}
        <HistorySection history={history} diceMax={config.diceMax} />
      </main>

      {showStartDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowStartDialog(false)}>
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-md mx-4 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white text-center flex items-center justify-center gap-2">
              <Play className="w-5 h-5 text-emerald-400" /> Cấu hình & Bắt đầu
            </h2>
            <ConfigForm config={config} setConfig={setConfig} />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowStartDialog(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors border border-slate-700/50"
              >
                Huỷ
              </button>
              <button
                onClick={handleStartGame}
                disabled={starting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {starting ? "Đang khởi động..." : "Bắt đầu"}
              </button>
            </div>
            <p className="text-slate-600 text-xs text-center">* Cấu hình sẽ được lưu khi bắt đầu game</p>
          </div>
        </div>
      )}
    </div>
  );
}
