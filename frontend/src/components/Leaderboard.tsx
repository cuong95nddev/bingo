import type { GamePlayer } from "../types/game";

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
              <div className="relative shrink-0">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "linear-gradient(135deg, #f97316, #dc2626)", color: "white" }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                    p.online ? "bg-green-500 border-gray-800" : "bg-gray-500 border-gray-800"
                  }`}
                />
              </div>
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
