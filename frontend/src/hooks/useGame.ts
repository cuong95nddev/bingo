import { useState, useEffect, useRef, useCallback } from "react";
import { Client } from "@colyseus/sdk";
import type { Room } from "@colyseus/sdk";
import type { GameState, GameBet } from "../types/game";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "ws://localhost:2567";

export function useGame(visitorId: string, name: string, enabled: boolean) {
  const [state, setState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (!enabled || !visitorId || !name) return;

    const client = new Client(BACKEND_URL);

    client
      .joinOrCreate("bingo", { visitorId, name })
      .then((r) => {
        roomRef.current = r;
        setConnected(true);

        // Sync full state on change
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
              status: s.round.status as "betting" | "drawing" | "result",
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
      .catch((err: unknown) => {
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
