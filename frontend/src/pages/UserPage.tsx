import { useIdentity } from "../hooks/useIdentity";
import { useGame } from "../hooks/useGame";
import { NameModal } from "../components/NameModal";
import { Countdown } from "../components/Countdown";
import { DiceResult } from "../components/DiceResult";
import { Leaderboard } from "../components/Leaderboard";
import { BettingPanel } from "../components/BettingPanel";

export function UserPage() {
  const { identity, needsName, saveName } = useIdentity();
  const { state, connected, placeBet, clearBets } = useGame(
    identity?.visitorId || "",
    identity?.name || "",
    !!identity
  );

  if (needsName) return <NameModal onSave={saveName} />;

  const myPlayer = state?.players.get(state.mySessionId);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-yellow-400">🎲 Bingo 18</h1>
        <div className="flex items-center gap-4">
          {!connected && <span className="text-red-400 text-sm animate-pulse">⚡ Đang kết nối...</span>}
          {myPlayer && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">{myPlayer.name}</span>
              <span className="bg-yellow-900 text-yellow-400 px-3 py-1 rounded-full font-mono text-sm">
                💰 {myPlayer.coins}
              </span>
            </div>
          )}
        </div>
      </header>

      {!state ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Đang tải game...
        </div>
      ) : (
        <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Betting Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 text-sm">Vòng #{state.round.id}</span>
                <Countdown seconds={state.round.countdown} status={state.round.status} />
              </div>
              <DiceResult numbers={state.round.numbers} status={state.round.status} />
              {state.round.status === "result" && myPlayer && myPlayer.lastWin !== 0 && (
                <div className={`text-center text-2xl font-bold mt-3 ${myPlayer.lastWin > 0 ? "text-green-400" : "text-red-400"}`}>
                  {myPlayer.lastWin > 0 ? `+${myPlayer.lastWin} 💰 Thắng!` : `${myPlayer.lastWin} 💰 Thua`}
                </div>
              )}
            </div>

            <div className="bg-gray-800 rounded-xl p-4">
              <BettingPanel
                onPlaceBet={placeBet}
                onClearBets={clearBets}
                disabled={state.round.status !== "betting"}
                myCoins={myPlayer?.coins || 0}
                config={state.config}
                currentBets={myPlayer?.bets || []}
              />
            </div>
          </div>

          {/* Right: Leaderboard */}
          <div className="bg-gray-800 rounded-xl p-4">
            <Leaderboard players={state.players} mySessionId={state.mySessionId} />
          </div>
        </div>
      )}
    </div>
  );
}
