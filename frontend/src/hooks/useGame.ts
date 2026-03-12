import { useState, useEffect, useRef, useCallback } from "react";
import { Client } from "@colyseus/sdk";
import type { Room } from "@colyseus/sdk";
import type { GameState, GameBet } from "../types/game";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "ws://localhost:2567";

export function useGame(visitorId: string, name: string, enabled: boolean) {
  const [state, setState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [ticker, setTicker] = useState<string[]>([]);
  const [jackpot, setJackpot] = useState<{ total: number; perPlayer: number; playerCount: number } | null>(null);
  const [hackerEvent, setHackerEvent] = useState<{ victims: { name: string; amount: number }[] } | null>(null);
  const [joinDenied, setJoinDenied] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (!enabled || !visitorId || !name) return;

    let cancelled = false;
    const client = new Client(BACKEND_URL);

    // Small delay prevents React StrictMode double-invocation from making
    // two concurrent seat reservations (the cleanup cancels the first timer
    // before any HTTP request is sent).
    const connectTimer = setTimeout(() => {
      if (cancelled) return;
      client
        .joinOrCreate("bingo", { visitorId, name })
        .then((r) => {
          if (cancelled) {
            r.leave();
            return;
          }
          roomRef.current = r;
          setConnected(true);

interface RawBet { type: string; value: number; amount: number; }
interface RawPlayer { id: string; name: string; avatar: string; coins: number; lastWin: number; bets: Iterable<RawBet>; online: boolean; }
interface RawHistory { id: number; numbers: Iterable<number>; timestamp: number; }
interface RawState {
  players: { forEach: (cb: (p: RawPlayer, key: string) => void) => void };
  history: { forEach: (cb: (h: RawHistory) => void) => void };
  round: { id: number; status: string; countdown: number; numbers: Iterable<number>; };
  config: { startCoins: number; minBet: number; roundDuration: number; maxRounds: number; diceMax?: number; };
}

          r.onStateChange((state: unknown) => {
            const s = state as RawState;
            const players = new Map<string, import("../types/game").GamePlayer>();
            s.players.forEach((p: RawPlayer, key: string) => {
              players.set(key, {
                id: p.id,
                name: p.name,
                avatar: p.avatar ?? "",
                coins: p.coins,
                lastWin: p.lastWin,
                bets: [...p.bets].map((b: RawBet) => ({ type: b.type, value: b.value, amount: b.amount })),
                online: p.online ?? false,
              });
            });

            const history: Array<{ id: number; numbers: number[]; timestamp: number }> = [];
            s.history.forEach((h: RawHistory) => {
              history.push({ id: h.id, numbers: [...h.numbers], timestamp: h.timestamp });
            });

            setState({
              players,
              round: {
                id: s.round.id,
                status: s.round.status as "waiting" | "betting" | "drawing" | "result" | "highlight" | "finished",
                countdown: s.round.countdown,
                numbers: [...s.round.numbers],
              },
              config: {
                startCoins: s.config.startCoins,
                minBet: s.config.minBet,
                roundDuration: s.config.roundDuration,
                maxRounds: s.config.maxRounds,
                diceMax: s.config.diceMax ?? 6,
              },
              history,
              mySessionId: r.sessionId,
            });
          });

          r.onMessage("ticker", (msg: string) => {
            setTicker((prev) => [...prev, msg].slice(-50));
          });

          r.onMessage("tickerHistory", (msgs: string[]) => {
            setTicker(msgs.slice(-50));
          });

          r.onMessage("jackpot", (data: { total: number; perPlayer: number; playerCount: number }) => {
            setJackpot(data);
          });

          r.onMessage("hacker", (data: { victims: { name: string; amount: number }[] }) => {
            setHackerEvent(data);
          });

          r.onMessage("kicked", (data: { visitorId: string }) => {
            const stored = localStorage.getItem("bingo_identity");
            if (stored) {
              const all = JSON.parse(stored) as Record<string, string>;
              delete all[data.visitorId];
              localStorage.setItem("bingo_identity", JSON.stringify(all));
            }
            window.location.reload();
          });

          r.onLeave(() => setConnected(false));
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const code = (err as { code?: number }).code;
          if (code === 4003) {
            setJoinDenied("Game đã bắt đầu, không thể tham gia.");
          } else {
            console.error("Failed to join room:", err);
          }
        });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(connectTimer);
      roomRef.current?.leave();
      roomRef.current = null;
    };
  }, [enabled, visitorId, name]);

  const placeBet = useCallback((bet: GameBet) => {
    roomRef.current?.send("placeBet", bet);
  }, []);

  const clearBets = useCallback(() => {
    roomRef.current?.send("clearBets", {});
  }, []);

  const clearJackpot = useCallback(() => setJackpot(null), []);
  const clearHackerEvent = useCallback(() => setHackerEvent(null), []);

  return { state, connected, ticker, placeBet, clearBets, jackpot, clearJackpot, hackerEvent, clearHackerEvent, joinDenied };
}
