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

          r.onStateChange((s: any) => {
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
                status: s.round.status as "waiting" | "betting" | "drawing" | "result",
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

          r.onMessage("ticker", (msg: string) => {
            setTicker((prev) => [...prev, msg].slice(-50));
          });

          r.onMessage("jackpot", (data: { total: number; perPlayer: number; playerCount: number }) => {
            setJackpot(data);
          });

          r.onMessage("hacker", (data: { victims: { name: string; amount: number }[] }) => {
            setHackerEvent(data);
          });

          r.onLeave(() => setConnected(false));
        })
        .catch((err: unknown) => {
          if (!cancelled) console.error("Failed to join room:", err);
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

  return { state, connected, ticker, placeBet, clearBets, jackpot, clearJackpot, hackerEvent, clearHackerEvent };
}
