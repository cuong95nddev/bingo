import { useState, useEffect, useRef, useCallback } from "react";
import { useIdentity } from "../hooks/useIdentity";
import { useGame } from "../hooks/useGame";
import { NameModal } from "../components/NameModal";
import { BettingPanel } from "../components/BettingPanel";
import { ChatPanel } from "../components/ChatPanel";
import { computeThresholds } from "../utils/diceUtils";

function PlayerList({ players, mySessionId, compact = false }: { players: Map<string, import("../types/game").GamePlayer>; mySessionId: string; compact?: boolean }) {
  const sorted = [...players.entries()].sort((a, b) => b[1].coins - a[1].coins);
  return (
    <div className={compact ? "px-2 py-2" : "px-3 py-3"}>
      {!compact && (
        <div className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "#3d6a4a" }}>
          Người chơi ({sorted.length})
        </div>
      )}
      <div className="space-y-1">
        {sorted.map(([sessionId, p], rank) => {
          const isMe = sessionId === mySessionId;
          return (
            <div
              key={sessionId}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
              style={{
                background: isMe ? "#0e2e14" : "#0a1e0d",
                border: isMe ? "1px solid #2a6a32" : "1px solid #122212",
              }}
            >
              <span className="text-[10px] font-mono w-4 shrink-0" style={{ color: rank < 3 ? "#d4a050" : "#2a5a3a" }}>
                {rank + 1}
              </span>
              <div className="relative shrink-0">
                <img
                  src={p.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(p.id)}`}
                  alt={p.name}
                  className="w-6 h-6 rounded-full bg-gray-700"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                    p.online ? "bg-green-500 border-[#0a1e0d]" : "bg-gray-500 border-[#0a1e0d]"
                  }`}
                />
              </div>
              <span className="flex-1 text-sm font-medium truncate" style={{ color: isMe ? "#86c988" : "#7a9a7a" }}>
                {p.name}{isMe && <span className="ml-1 text-[9px]" style={{ color: "#4a8a5a" }}>(bạn)</span>}
              </span>
              <span className="font-mono text-sm font-bold shrink-0" style={{ color: "#d4a050" }}>
                {p.coins.toLocaleString()} ngô
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function UserPage() {
  const { identity, needsName, saveName } = useIdentity();
  const { state, connected, ticker, placeBet, jackpot, clearJackpot, hackerEvent, clearHackerEvent, joinDenied } = useGame(
    identity?.visitorId || "",
    identity?.name || "",
    !!identity
  );
  const status = state?.round?.status ?? "waiting";

  const [showHistory, setShowHistory] = useState(false);
  const [stagedBets, setStagedBets] = useState<import("../types/game").GameBet[]>([]);
  const [confirmedBets, setConfirmedBets] = useState<import("../types/game").GameBet[]>([]);
  const overlayBetsRef = useRef<import("../types/game").GameBet[]>([]);
  const playerBetTotalsRef = useRef<Map<string, number>>(new Map());
  const [confirmed, setConfirmed] = useState(false);
  const restoredRef = useRef(false);
  // Persist last-round win options; cleared when next drawing starts
  const [lastWinOptions, setLastWinOptions] = useState<Set<string>>(new Set());

  // Restore confirmed bets from server state after F5
  useEffect(() => {
    if (restoredRef.current || !state) return;
    restoredRef.current = true;
    const myPlayer = state.players.get(state.mySessionId);
    if (myPlayer && myPlayer.bets.length > 0 && state.round.status === "betting") {
      setTimeout(() => {
        setConfirmedBets(myPlayer.bets);
        setConfirmed(true);
      }, 0);
    }
  }, [state]);

  const diceMax = state?.config?.diceMax ?? 6;

  const getWinOptions = useCallback((numbers: number[]): Set<string> => {
    if (numbers.length < 3) return new Set();
    const counts: Record<number, number> = {};
    for (const n of numbers) counts[n] = (counts[n] || 0) + 1;
    const sum = numbers.reduce((a, b) => a + b, 0);
    const isTriple = Object.values(counts).some((c) => c === 3);
    const thresholds = computeThresholds(diceMax);
    const keys = new Set<string>();
    for (let n = 1; n <= diceMax; n++) {
      if (counts[n] >= 1) keys.add(`single:${n}`);
      if (counts[n] >= 2) keys.add(`double:${n}`);
      if (counts[n] === 3) { keys.add(`triple:${n}`); keys.add("triple:0"); }
    }
    if (!isTriple && sum >= thresholds.bigMin) keys.add("big:0");
    if (!isTriple && sum <= thresholds.smallMax) keys.add("small:0");
    if (thresholds.drawValues.includes(sum)) keys.add("draw:0");
    keys.add(`sum:${sum}`);
    return keys;
  }, [diceMax]);

  useEffect(() => {
    if (status === "highlight" && state?.round?.numbers?.length === 3) {
      const numbers = [...state.round.numbers];
      setTimeout(() => {
        setLastWinOptions(getWinOptions(numbers));
      }, 0);
    } else if (status === "drawing") {
      const mp = state?.players.get(state.mySessionId);
      const serverBets = mp?.bets?.length ? [...mp.bets].filter(Boolean).map(b => ({ type: b.type, value: b.value, amount: b.amount })) : [];
      if (overlayBetsRef.current.length === 0 && serverBets.length > 0) {
        overlayBetsRef.current = serverBets;
      }
      const totals = new Map<string, number>();
      state?.players.forEach((p, sid) => {
        const total = [...p.bets].filter(Boolean).reduce((s, b) => s + b.amount, 0);
        totals.set(sid, total);
      });
      if (totals.size > 0) playerBetTotalsRef.current = totals;
      setTimeout(() => {
        setLastWinOptions(new Set());
        setStagedBets([]);
        setConfirmed(false);
      }, 0);
    } else if (status === "betting") {
      setTimeout(() => {
        setConfirmedBets([]);
        overlayBetsRef.current = [];
      }, 0);
    }
  }, [status, state?.round?.numbers, getWinOptions]);

  const myPlayer = state?.players.get(state.mySessionId);
  const totalBet = stagedBets.reduce((s, b) => s + b.amount, 0);
  const playersCount = state?.players?.size ?? 0;
  const isBetting = status === "betting";

  const stageBet = (bet: import("../types/game").GameBet) =>
    setStagedBets((prev) => [...prev, bet]);

  const clearStaged = () => setStagedBets([]);

  const confirmBets = () => {
    for (const bet of stagedBets) placeBet(bet);
    setConfirmedBets(stagedBets);
    overlayBetsRef.current = stagedBets;
    setStagedBets([]);
    setConfirmed(true);
  };

  const winOptions = status === "highlight" ? lastWinOptions : new Set<string>();
  const overlayVisible = status === "drawing" || status === "result";

  useEffect(() => {
    if (!hackerEvent) return;
    const timer = setTimeout(clearHackerEvent, 2000);
    return () => clearTimeout(timer);
  }, [hackerEvent, clearHackerEvent]);

  useEffect(() => {
    if (!jackpot) return;
    const timer = setTimeout(clearJackpot, 2000);
    return () => clearTimeout(timer);
  }, [jackpot, clearJackpot]);

  if (joinDenied) return (
    <div className="h-screen bg-[#071a09] flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-5xl">🚫</div>
        <h2 className="text-xl font-bold text-white">Không thể tham gia</h2>
        <p className="text-sm" style={{ color: "#86c988" }}>{joinDenied}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2.5 rounded-full font-medium text-sm transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #dbb870, #c9960a)", color: "#3d2200" }}
        >
          Thử lại
        </button>
      </div>
    </div>
  );

  if (needsName) return <NameModal onSave={saveName} />;

  return (
    <div className="h-screen bg-[#071a09] flex justify-center overflow-hidden">
      {/* Left sidebar — leaderboard + chat, only visible on lg+ */}
      <div className="hidden lg:flex flex-col w-56 shrink-0 mr-2 my-4 gap-2">
        <div className="rounded-xl overflow-hidden shrink-0" style={{ background: "#0a1a0d", border: "1px solid #1a3d1a" }}>
          <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid #1a3d1a" }}>
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#3d6a4a" }}>Bảng xếp hạng</span>
          </div>
          <div className="overflow-y-auto max-h-[40vh]">
            {state ? (
              <PlayerList players={state.players} mySessionId={state.mySessionId} compact />
            ) : (
              <div className="flex items-center justify-center h-20 text-xs" style={{ color: "#2a4a2a" }}>Đang tải...</div>
            )}
          </div>
        </div>
        <div className="rounded-xl overflow-hidden flex-1 min-h-0" style={{ background: "#0a1a0d", border: "1px solid #1a3d1a" }}>
          <ChatPanel messages={ticker} />
        </div>
      </div>

      <div className="w-full max-w-[430px] h-screen bg-[#0d2812] flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-[#061508] px-4 py-3 flex items-center justify-between shrink-0">
          <button className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex items-center gap-1">
            <span className="text-white font-black text-xl tracking-[0.18em]">BÍ NGÔ</span>
            <span className="font-black text-xl" style={{ color: "#d4a050" }}>88</span>
          </div>

          <div className="flex items-center gap-3.5">
            <button className="text-white/50 hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </button>
            <button className="text-white/50 hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            </button>
            {!connected && (
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Đang kết nối..." />
            )}
          </div>
        </header>


        {/* Chat panel for mobile (below header) — only on small screens */}
        <div className="lg:hidden shrink-0 max-h-28 overflow-y-auto" style={{ background: "#0a1a0d", borderBottom: "1px solid #1a3d1a" }}>
          <ChatPanel messages={ticker} />
        </div>

        {/* Round info bar */}
        {state && (
          <div className="px-3 py-2 bg-[#0a1e0d] flex items-center gap-2 shrink-0">
            <div className="flex-1 min-w-0">
              <div className="text-[9px] uppercase tracking-widest" style={{ color: "#3d6a4a" }}>
                Kỳ quay hiện tại
              </div>
              <div className="text-white font-mono text-sm font-bold">
                # {String(state.round.id).padStart(7, "0")}
              </div>
            </div>

            <div
              className={`bg-[#111827] rounded-lg px-3 py-1 font-mono text-2xl font-bold tracking-widest shrink-0 min-w-[88px] text-center ${
                isBetting && state.round.countdown <= 10
                  ? "text-red-400 animate-pulse"
                  : "text-white"
              }`}
            >
              {isBetting
                ? formatTime(state.round.countdown)
                : status === "drawing"
                ? "——"
                : status === "result"
                ? "05:00"
                : "——"}
            </div>

            <div className="flex-1 text-right min-w-0">
              <div className="text-[9px] uppercase tracking-widest" style={{ color: "#3d6a4a" }}>
                Dự đoán
              </div>
              <div className="text-white text-sm font-medium">Kết quả 3 số</div>
            </div>
          </div>
        )}

        {/* History / dice result bar */}
        {state && (
          <div
            className="px-3 py-1.5 flex items-center gap-2 min-h-[36px] shrink-0"
            style={{ background: "#0a1e0d", borderBottom: "1px solid #1a3d1a" }}
          >
            {(status === "drawing" || status === "result") && state.round.numbers.length > 0 ? (
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                        state.round.numbers[i]
                          ? "opacity-100 scale-100"
                          : "opacity-100 scale-100"
                      }`}
                      style={{
                        background: state.round.numbers[i]
                          ? "radial-gradient(circle at 35% 30%, #f5c842, #c8860a)"
                          : "transparent",
                        color: "#2d1800",
                      }}
                    >
                      {state.round.numbers[i] || <span className="dice-rolling text-base">🎲</span>}
                    </span>
                  ))}
                </div>
                {state.round.numbers.length === 3 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]" style={{ color: "#4a7a5a" }}>Tổng:</span>
                    <span className="text-white font-bold text-sm">
                      {state.round.numbers.reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                )}
                {status === "drawing" && (
                  <span className="text-yellow-400 text-[10px] animate-pulse">Đang quay...</span>
                )}
                {status === "result" && myPlayer && myPlayer.lastWin !== 0 && (
                  <span
                    className={`font-bold text-sm ml-auto ${
                      myPlayer.lastWin > 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {myPlayer.lastWin > 0 ? `+${myPlayer.lastWin} ngô` : `${myPlayer.lastWin} ngô`}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
                {state.history.length === 0 ? (
                  <span className="text-[10px]" style={{ color: "#2a4a2a" }}>
                    Chưa có lịch sử
                  </span>
                ) : (
                  [...state.history].reverse().slice(0, 5).map((h, idx) => (
                    <div key={h.id} className="flex items-center gap-1.5 shrink-0">
                      {idx > 0 && (
                        <div className="w-px h-3.5" style={{ background: "#1a3a1a" }} />
                      )}
                      <div className="flex gap-0.5">
                        {h.numbers.map((n, i) => (
                          <span
                            key={i}
                            className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={
                              idx === 0
                                ? {
                                    background: "radial-gradient(circle at 35% 30%, #f5c842, #c8860a)",
                                    color: "#2d1800",
                                  }
                                : {
                                    background: "transparent",
                                    border: "1.5px solid #3a6040",
                                    color: "#5a8060",
                                  }
                            }
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <button
              onClick={() => setShowHistory(true)}
              className="shrink-0 ml-1 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ background: "#22c55e" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-3.5 h-3.5">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
            </button>
          </div>
        )}

        {/* Main scrollable content */}
        {!state ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="text-5xl">🎲</div>
              <p style={{ color: "#3d6a4a" }}>Đang tải game...</p>
            </div>
          </div>
        ) : status === "waiting" ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-6xl animate-bounce">🎲</div>
              <p className="text-lg font-medium" style={{ color: "#86c988" }}>Đang chờ game bắt đầu...</p>
              <p className="text-sm" style={{ color: "#3d5a3d" }}>Admin sẽ khởi động game sớm thôi</p>
            </div>
          </div>
        ) : status === "finished" ? (
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">🏆</div>
              <h2 className="text-xl font-bold text-white">Game Kết Thúc!</h2>
              <p className="text-sm mt-1" style={{ color: "#4a8a5a" }}>Đã chơi {state.round.id} vòng</p>
            </div>
            <div className="space-y-2 max-w-sm mx-auto">
              {[...state.players.entries()]
                .sort((a, b) => b[1].coins - a[1].coins)
                .map(([sessionId, p], rank) => {
                  const isMe = sessionId === state.mySessionId;
                  return (
                    <div
                      key={sessionId}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{
                        background: rank === 0 ? "#1a3a10" : isMe ? "#0e2e14" : "#0a1e0d",
                        border: rank === 0 ? "1px solid #d4a050" : isMe ? "1px solid #2a6a32" : "1px solid #122212",
                      }}
                    >
                      <span className="text-lg font-bold w-8 text-center" style={{
                        color: rank === 0 ? "#fbbf24" : rank === 1 ? "#c0c0c0" : rank === 2 ? "#cd7f32" : "#4a6a4a",
                      }}>
                        {rank + 1}
                      </span>
                      <div className="relative shrink-0">
                        <img
                          src={p.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(p.id)}`}
                          alt={p.name}
                          className="w-8 h-8 rounded-full bg-gray-700"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                            p.online ? "bg-green-500 border-[#0a1e0d]" : "bg-gray-500 border-[#0a1e0d]"
                          }`}
                        />
                      </div>
                      <span className="flex-1 font-medium truncate" style={{ color: isMe ? "#86c988" : "#7a9a7a" }}>
                        {p.name} {isMe && "(bạn)"}
                      </span>
                      <span className="font-mono font-bold" style={{ color: "#d4a050" }}>
                        {p.coins.toLocaleString()} ngô
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <BettingPanel
              onPlaceBet={stageBet}
              onClearBets={clearStaged}
              disabled={!isBetting || confirmed}
              myCoins={myPlayer?.coins || 0}
              config={state.config}
              currentBets={confirmed ? confirmedBets : stagedBets}
              winOptions={winOptions}
            />
          </div>
        )}

        {/* Cart */}
        {status !== "finished" && (stagedBets.length > 0 || confirmed) && (() => {
          const cartBets = confirmed ? confirmedBets : stagedBets;
          const cartTotal = cartBets.reduce((s, b) => s + b.amount, 0);
          return (
            <div className="shrink-0 bg-[#0a1e0d]" style={{ borderTop: "1px solid #1a3d1a" }}>
              <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: "#3d6a4a" }}>
                    Giỏ cược ({cartBets.length})
                  </span>
                  {confirmed && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#1a5a28", color: "#4ade80" }}>
                      Đã xác nhận
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold" style={{ color: "#d4a050" }}>
                  {cartTotal.toLocaleString()} ngô
                </span>
              </div>
              <div className="px-3 pb-2 flex flex-col gap-1 max-h-[120px] overflow-y-auto">
                {cartBets.map((bet, idx) => {
                  const ballCount = bet.type === "triple" ? 3 : bet.type === "double" ? 2 : bet.type === "single" ? 1 : 0;
                  const displayValue = bet.type === "triple" && bet.value === 0 ? "★" : bet.value;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      {ballCount === 0 && (
                        <span className="text-[11px]" style={{ color: confirmed ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.7)" }}>
                          {bet.type === "big" ? "Lớn" : bet.type === "small" ? "Nhỏ" : bet.type === "draw" ? "Hòa" : bet.type === "sum" ? `Tổng ${bet.value}` : bet.type}
                        </span>
                      )}
                      {ballCount > 0 && (
                        <div className="flex gap-0.5">
                          {Array.from({ length: ballCount }).map((_, i) => (
                            <div
                              key={i}
                              className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0"
                              style={{
                                background: "radial-gradient(circle at 35% 30%, #f5c842, #c8860a)",
                                color: "#2d1800",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                              }}
                            >
                              {displayValue}
                            </div>
                          ))}
                        </div>
                      )}
                      <span className="flex-1" />
                      <span className="text-[11px] font-bold" style={{ color: "#d4a050" }}>
                        {bet.amount.toLocaleString()} ngô
                      </span>
                      {!confirmed && (
                        <button
                          onClick={() => setStagedBets((prev) => prev.filter((_, i) => i !== idx))}
                          className="w-4 h-4 flex items-center justify-center rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors text-[10px]"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Bottom info bar */}
        {status !== "finished" && <div className="bg-[#061508] px-4 py-2.5 flex items-center justify-between shrink-0" style={{ borderTop: "1px solid #1a3d1a" }}>
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <img
                src={myPlayer?.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=default`}
                alt={myPlayer?.name ?? "?"}
                className="w-9 h-9 rounded-full bg-gray-700"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                  connected ? "bg-green-500 border-[#061508]" : "bg-gray-500 border-[#061508]"
                }`}
              />
            </div>
            <div>
              <div className="font-bold text-sm text-white leading-tight">{myPlayer?.name ?? "—"}</div>
              <div className="text-[10px] leading-tight" style={{ color: "#4a8a5a" }}>{(myPlayer?.coins ?? 0).toLocaleString()} ngô</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-white">
              {playersCount} <span className="font-normal" style={{ color: "#4a8a5a" }}>👥</span>
            </div>
            <div className="text-[10px]" style={{ color: "#4a8a5a" }}>
              Giá vé tạm tính:{" "}
              <span className="font-bold" style={{ color: "#d4a050" }}>{totalBet} ngô</span>
            </div>
          </div>
        </div>}

        {/* Action buttons */}
        {status !== "finished" && <div className="px-4 py-3 bg-[#061508] flex gap-3 shrink-0" style={{ borderTop: "1px solid #1a3d1a" }}>
          <button
            onClick={clearStaged}
            disabled={!isBetting || confirmed || stagedBets.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-full font-medium text-sm transition-all disabled:opacity-40 active:scale-95"
            style={{ border: "1.5px solid #2a5a32", color: "#6aaa7a" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Chọn lại
          </button>
          <button
            onClick={confirmBets}
            disabled={!isBetting || confirmed || totalBet === 0}
            className="flex-[2] py-3 rounded-full font-bold text-sm transition-all disabled:opacity-40 active:scale-95"
            style={{
              background: confirmed
                ? "linear-gradient(135deg, #1a5a28, #166534)"
                : "linear-gradient(135deg, #dbb870, #c9960a)",
              color: confirmed ? "#4ade80" : "#3d2200",
            }}
          >
            {confirmed ? "Đã đặt cược" : "Xác nhận"}
          </button>
        </div>}
      </div>

      {/* Drawing / Result overlay */}
      {state && overlayVisible && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center px-4"
          style={{ background: "rgba(3, 9, 4, 0.96)", backdropFilter: "blur(2px)" }}
        >
          <div className="flex items-start gap-6 max-w-[700px] w-full">
            {/* Left: dice + sum + result */}
            <div className="flex-1 flex flex-col items-center">
              {/* Round id */}
              <div className="text-[10px] uppercase tracking-[0.25em] mb-8 px-3 py-1 rounded-full" style={{ color: "#3d6a4a", border: "1px solid #1a3d1a" }}>
                Kỳ #{String(state.round.id).padStart(7, "0")}
              </div>

              {/* Dice */}
              <div className="flex gap-4 mb-5">
                {[0, 1, 2].map((i) => {
                  const val = state.round.numbers[i];
                  return (
                    <div
                      key={i}
                      className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl font-black transition-all duration-500 ${
                        val ? "scale-100 opacity-100" : "scale-100 opacity-80"
                      }`}
                      style={{
                        background: val
                          ? "radial-gradient(circle at 32% 28%, #fde068, #ca8a04)"
                          : "#0e2510",
                        color: val ? "#1a0a00" : "#2a5a2a",
                        boxShadow: val
                          ? "0 0 40px rgba(202,138,4,0.5), 0 8px 24px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.2)"
                          : "inset 0 0 0 1.5px #1a3d1a",
                      }}
                    >
                      {val || <span className="dice-rolling">🎲</span>}
                    </div>
                  );
                })}
              </div>

              {/* Sum + Nhỏ/Hòa/Lớn */}
              {state.round.numbers.length === 3 && (() => {
                const sum = state.round.numbers.reduce((a, b) => a + b, 0);
                const thresholds = computeThresholds(diceMax);
                const category = sum <= thresholds.smallMax ? "NHỎ" : sum >= thresholds.bigMin ? "LỚN" : "HÒA";
                const categoryColor = category === "HÒA" ? "#d4a050" : "#4ade80";
                return (
                  <div
                    className="flex items-center gap-4 px-6 py-3 rounded-2xl mb-5"
                    style={{ background: "#0e2510", border: "1px solid #1a4a1a" }}
                  >
                    <span
                      className="text-3xl font-black tracking-wider"
                      style={{ color: categoryColor, textShadow: `0 0 16px ${categoryColor}60` }}
                    >
                      {category}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "#4a8a5a" }}>|</span>
                    <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#4a8a5a" }}>Tổng</span>
                    <span className="text-2xl font-black" style={{ color: "#fbbf24" }}>
                      {sum}
                    </span>
                  </div>
                );
              })()}

              {/* Win / loss result */}
              {status === "result" && myPlayer && myPlayer.lastWin > 0 && (
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="text-4xl font-black px-8 py-3 rounded-2xl"
                    style={{
                      background: "linear-gradient(135deg, #14532d, #166534)",
                      color: "#4ade80",
                      boxShadow: "0 0 32px rgba(74,222,128,0.25), 0 4px 16px rgba(0,0,0,0.4)",
                      border: "1px solid #22c55e40",
                    }}
                  >
                    +{myPlayer.lastWin.toLocaleString()} ngô
                  </div>
                  <span className="text-xs font-medium mt-1" style={{ color: "#4ade80" }}>Chúc mừng!</span>
                </div>
              )}
              {status === "result" && myPlayer && myPlayer.lastWin < 0 && (
                <div
                  className="text-3xl font-black px-8 py-3 rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, #450a0a, #7f1d1d)",
                    color: "#f87171",
                    boxShadow: "0 0 24px rgba(248,113,113,0.15), 0 4px 16px rgba(0,0,0,0.4)",
                    border: "1px solid #ef444430",
                  }}
                >
                  {myPlayer.lastWin.toLocaleString()} ngô
                </div>
              )}
            </div>

            {/* Right: all players results */}
            <div className="w-[220px] shrink-0 rounded-xl overflow-hidden" style={{ background: "#0e2510", border: "1px solid #1a4a1a" }}>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#4a8a5a", borderBottom: "1px solid #1a3d1a" }}>
                Người chơi
              </div>
              <div className="max-h-[320px] overflow-y-auto relative">
                {[...state.players.entries()]
                  .sort((a, b) => b[1].coins - a[1].coins)
                  .map(([sid, p], i, arr) => {
                    const isMe = sid === state.mySessionId;
                    const betTotal = status === "drawing"
                      ? [...p.bets].filter(Boolean).reduce((s, b) => s + b.amount, 0)
                      : (playerBetTotalsRef.current.get(sid) ?? 0);
                    const hasBets = betTotal > 0;
                    const showResult = status === "result";
                    return (
                      <div
                        key={sid}
                        className="flex items-center gap-2 px-3 py-2 player-row"
                        style={{
                          borderBottom: i < arr.length - 1 ? "1px solid #122a14" : undefined,
                          background: isMe ? "#0e2e14" : undefined,
                        }}
                      >
                        <img src={p.avatar} className="w-6 h-6 rounded-full shrink-0" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span
                              className="text-xs font-semibold truncate"
                              style={{ color: isMe ? "#4ade80" : "rgba(255,255,255,0.85)" }}
                            >
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono" style={{ color: "#d4a050" }}>
                              {p.coins.toLocaleString()} ngô
                            </span>
                            {hasBets && (
                              <span className="text-[9px] font-mono" style={{ color: "#4a8a5a" }}>
                                cược {betTotal.toLocaleString()}
                              </span>
                            )}
                            {!hasBets && (
                              <span className="text-[9px]" style={{ color: "#4a6a4a" }}>chưa cược</span>
                            )}
                          </div>
                        </div>
                        {showResult && p.lastWin !== 0 && (
                          <span
                            className="text-[11px] font-black shrink-0 result-fade-in"
                            style={{ color: p.lastWin > 0 ? "#4ade80" : "#f87171" }}
                          >
                            {p.lastWin > 0 ? "+" : ""}{p.lastWin.toLocaleString()}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History dialog */}
      {showHistory && state && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => e.target === e.currentTarget && setShowHistory(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-2xl flex flex-col"
            style={{ background: "#0d2812", maxHeight: "75vh" }}
          >
            {/* Dialog header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #1a3d1a" }}>
              <span className="text-white font-bold text-base">Lịch sử kết quả</span>
              <button
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 px-3 py-2">
              {[...state.history].reverse().map((h, idx) => {
                const sum = h.numbers.reduce((a, b) => a + b, 0);
                return (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 py-2.5"
                    style={{ borderBottom: "1px solid #1a3a1a" }}
                  >
                    <span className="text-[10px] font-mono shrink-0" style={{ color: "#3d6a4a", minWidth: 32 }}>
                      #{String(h.id).padStart(4, "0")}
                    </span>
                    <div className="flex gap-1 flex-1">
                      {h.numbers.map((n, i) => (
                        <span
                          key={i}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                          style={
                            idx === 0
                              ? {
                                  background: "radial-gradient(circle at 35% 30%, #f5c842, #c8860a)",
                                  color: "#2d1800",
                                }
                              : {
                                  background: "transparent",
                                  border: "1.5px solid #3a6040",
                                  color: "#5a8060",
                                }
                          }
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color: "#d4a050" }}>
                      Tổng: {sum}
                    </span>
                  </div>
                );
              })}
              {state.history.length === 0 && (
                <div className="text-center py-8" style={{ color: "#3d6a4a" }}>
                  Chưa có lịch sử
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hacker overlay */}
      {hackerEvent && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(4px)" }}
          onClick={clearHackerEvent}
        >
          <div className="text-5xl mb-4 animate-pulse">⚠️</div>
          <div
            className="w-full max-w-sm text-center px-6 py-6 rounded-3xl space-y-4"
            style={{ background: "linear-gradient(135deg, #1a0000, #3d0000)", border: "1px solid #ef444460" }}
          >
            <div className="font-black text-2xl tracking-widest" style={{ color: "#ef4444", fontFamily: "monospace" }}>
              HỆ THỐNG BỊ TẤN CÔNG
            </div>
            <div className="text-red-300 text-sm font-mono">
              Hacker đã xâm nhập và đánh cắp xu của người chơi!
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {hackerEvent.victims.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef444430" }}
                >
                  <span className="text-red-200 font-medium">{v.name}</span>
                  <span className="text-red-400 font-bold font-mono">−{v.amount.toLocaleString("vi-VN")} ngô</span>
                </div>
              ))}
            </div>
            <div className="text-red-300/60 text-xs leading-relaxed border-t border-red-900 pt-3">
              Rất xin lỗi quý khách vì sự bất tiện này. Chúng tôi đang khắc phục sự cố.
            </div>
          </div>
          <p className="text-white/20 text-xs mt-5">Nhấn bất kỳ để đóng</p>
        </div>
      )}

      {/* Jackpot overlay */}
      {jackpot && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(4px)" }}
          onClick={clearJackpot}
        >
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <div
            className="text-center px-8 py-6 rounded-3xl space-y-3"
            style={{ background: "linear-gradient(135deg, #7c2d12, #b45309)", border: "1px solid #f59e0b80" }}
          >
            <div className="text-white font-black text-2xl tracking-wide">NỔ HŨ!</div>
            <div className="text-yellow-200 text-sm">Có người chơi nổ hũ và chia sẻ</div>
            <div className="text-yellow-300 font-black text-4xl">
              {jackpot.total.toLocaleString("vi-VN")} ngô
            </div>
            <div className="text-orange-200 text-sm">
              cho {jackpot.playerCount} người chơi
            </div>
            <div
              className="text-white font-bold text-xl px-4 py-2 rounded-xl"
              style={{ background: "rgba(0,0,0,0.3)" }}
            >
              +{jackpot.perPlayer.toLocaleString("vi-VN")} ngô / người
            </div>
          </div>
          <p className="text-white/30 text-xs mt-6">Nhấn bất kỳ để đóng</p>
        </div>
      )}
    </div>
  );
}
