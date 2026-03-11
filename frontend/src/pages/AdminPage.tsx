import { useState, useEffect, useCallback } from "react";

const API = "/api/admin";

interface Player { sessionId: string; id: string; name: string; coins: number }
interface Config { startCoins: number; minBet: number; roundDuration: number; houseFeeEnabled: boolean; houseFeeMin: number; houseFeeMax: number }
interface RoundHistory { id: number; numbers: number[]; timestamp: number }

export function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"game" | "players" | "config" | "history">("game");

  const [players, setPlayers] = useState<Player[]>([]);
  const [config, setConfig] = useState<Config>({ startCoins: 1000, minBet: 10, roundDuration: 30, houseFeeEnabled: false, houseFeeMin: 10, houseFeeMax: 50 });
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [giftAmount, setGiftAmount] = useState(100);
  const [gameStatus, setGameStatus] = useState<string>("waiting");
  const [starting, setStarting] = useState(false);
  const [jackpotMin, setJackpotMin] = useState(500);
  const [jackpotMax, setJackpotMax] = useState(2000);
  const [jackpotResult, setJackpotResult] = useState<{ total: number; perPlayer: number; playerCount: number } | null>(null);
  const [hackerMin, setHackerMin] = useState(50);
  const [hackerMax, setHackerMax] = useState(300);
  const [hackerResult, setHackerResult] = useState<{ victimCount: number; playerCount: number } | null>(null);

  const authHeader = `?password=${password}`;

  const fetchPlayers = useCallback(() => {
    fetch(`${API}/players${authHeader}`)
      .then((r) => r.json())
      .then(setPlayers);
  }, [authHeader]);

  const fetchConfig = useCallback(() => {
    fetch(`${API}/config${authHeader}`)
      .then((r) => r.json())
      .then(setConfig);
  }, [authHeader]);

  const fetchHistory = useCallback(() => {
    fetch(`${API}/history${authHeader}`)
      .then((r) => r.json())
      .then(setHistory);
  }, [authHeader]);

  const fetchStatus = useCallback(() => {
    fetch(`${API}/status${authHeader}`)
      .then((r) => r.json())
      .then((d) => setGameStatus(d.status));
  }, [authHeader]);

  const handleStartGame = async () => {
    setStarting(true);
    await fetch(`${API}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    await fetchStatus();
    setStarting(false);
  };

  const handleHacker = async () => {
    const res = await fetch(`${API}/hacker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, min: hackerMin, max: hackerMax }),
    });
    if (res.ok) {
      const data = await res.json();
      setHackerResult(data);
      setTimeout(() => setHackerResult(null), 5000);
    }
  };

  const handleJackpot = async () => {
    const res = await fetch(`${API}/jackpot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, min: jackpotMin, max: jackpotMax }),
    });
    if (res.ok) {
      const data = await res.json();
      setJackpotResult(data);
      setTimeout(() => setJackpotResult(null), 5000);
    }
  };

  const handleNewGame = async () => {
    if (!confirm("Reset toàn bộ dữ liệu và bắt đầu game mới?")) return;
    await fetch(`${API}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    await fetchStatus();
    await fetchPlayers();
  };

  useEffect(() => {
    if (!authenticated) return;
    fetchPlayers();
    fetchConfig();
    fetchHistory();
    fetchStatus();
    const interval = setInterval(() => {
      fetchPlayers();
      fetchStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [authenticated, fetchPlayers, fetchConfig, fetchHistory, fetchStatus]);

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
    await fetch(`${API}/players/${sessionId}/coins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, amount: giftAmount, mode }),
    });
    fetchPlayers();
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, password }),
    });
    alert("Đã lưu cấu hình!");
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-xl w-80 space-y-4">
          <h1 className="text-white text-2xl font-bold text-center">🔒 Admin</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
          {authError && <p className="text-red-400 text-sm">{authError}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">
            Đăng nhập
          </button>
        </form>
      </div>
    );
  }

  const tabs = [
    { key: "game", label: "Game" },
    { key: "players", label: "Players" },
    { key: "config", label: "Cấu hình" },
    { key: "history", label: "Lịch sử" },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700">
        <h1 className="text-xl font-bold text-yellow-400">🎲 Bí Ngô 88 — Admin</h1>
        <button onClick={() => setAuthenticated(false)} className="text-gray-400 hover:text-white text-sm">
          Đăng xuất
        </button>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === t.key ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Game Tab */}
        {activeTab === "game" && (
          <div className="max-w-sm space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Trạng thái</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  gameStatus === "waiting" ? "bg-gray-700 text-gray-300" :
                  gameStatus === "betting" ? "bg-green-900 text-green-400" :
                  gameStatus === "drawing" ? "bg-blue-900 text-blue-400" :
                  "bg-yellow-900 text-yellow-400"
                }`}>
                  {gameStatus === "waiting" ? "Chờ bắt đầu" :
                   gameStatus === "betting" ? "Đang đặt cược" :
                   gameStatus === "drawing" ? "Đang quay" :
                   "Kết quả"}
                </span>
              </div>
              <button
                onClick={handleStartGame}
                disabled={gameStatus !== "waiting" || starting}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-colors"
              >
                {starting ? "Đang khởi động..." : "Bắt đầu Game"}
              </button>
              {gameStatus !== "waiting" && (
                <p className="text-gray-500 text-sm text-center">Game đang chạy — các vòng tự động tiếp tục</p>
              )}
              <button
                onClick={handleNewGame}
                className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Game Mới (Reset)
              </button>
            </div>

            {/* Hacker */}
            <div className="bg-gray-800 rounded-xl p-6 space-y-4" style={{ border: "1px solid #ef444430" }}>
              <h2 className="text-red-400 font-bold text-lg">Hacker</h2>
              <p className="text-gray-400 text-xs">Trừ tiền ngẫu nhiên của hơn 50% người chơi, hiển thị cảnh báo tấn công</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Trừ tối thiểu</label>
                  <input
                    type="number"
                    value={hackerMin}
                    onChange={(e) => setHackerMin(Number(e.target.value))}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Trừ tối đa</label>
                  <input
                    type="number"
                    value={hackerMax}
                    onChange={(e) => setHackerMax(Number(e.target.value))}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleHacker}
                className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors text-lg font-mono tracking-widest"
              >
                HACK
              </button>
              {hackerResult && (
                <div className="bg-red-900/30 border border-red-600/30 rounded-lg px-4 py-3 text-sm space-y-1">
                  <div className="text-red-400 font-bold">Đã tấn công!</div>
                  <div className="text-gray-300">{hackerResult.victimCount}/{hackerResult.playerCount} người bị trừ tiền</div>
                </div>
              )}
            </div>

            {/* Jackpot */}
            <div className="bg-gray-800 rounded-xl p-6 space-y-4">
              <h2 className="text-yellow-400 font-bold text-lg">Nổ Hũ</h2>
              <p className="text-gray-400 text-xs">Chọn khoảng ngẫu nhiên — hệ thống sẽ chia đều cho tất cả người chơi</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Tối thiểu</label>
                  <input
                    type="number"
                    value={jackpotMin}
                    onChange={(e) => setJackpotMin(Number(e.target.value))}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Tối đa</label>
                  <input
                    type="number"
                    value={jackpotMax}
                    onChange={(e) => setJackpotMax(Number(e.target.value))}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleJackpot}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl transition-colors text-lg"
              >
                Nổ Hũ
              </button>
              {jackpotResult && (
                <div className="bg-yellow-900/40 border border-yellow-600/40 rounded-lg px-4 py-3 text-sm space-y-1">
                  <div className="text-yellow-300 font-bold">Đã nổ hũ!</div>
                  <div className="text-gray-300">Tổng: <span className="text-yellow-400 font-bold">{jackpotResult.total.toLocaleString("vi-VN")}đ</span></div>
                  <div className="text-gray-300">Mỗi người: <span className="text-yellow-400 font-bold">+{jackpotResult.perPlayer.toLocaleString("vi-VN")}đ</span> × {jackpotResult.playerCount} người</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Players Tab */}
        {activeTab === "players" && (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-gray-400">{players.length} players</span>
              <button onClick={fetchPlayers} className="text-blue-400 text-sm hover:text-blue-300">
                🔄 Refresh
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-gray-400 text-sm">Số coins:</span>
                <input
                  type="number"
                  value={giftAmount}
                  onChange={(e) => setGiftAmount(Number(e.target.value))}
                  className="w-24 bg-gray-700 text-white rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 px-3">Tên</th>
                    <th className="text-right py-2 px-3">Coins</th>
                    <th className="text-center py-2 px-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.sessionId} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="py-2 px-3">
                        <div>{p.name}</div>
                        <div className="text-gray-500 text-xs">{p.id.slice(0, 12)}...</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-yellow-400">💰 {p.coins}</td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleGiftCoins(p.sessionId, "add")}
                            className="bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-xs"
                          >
                            +{giftAmount}
                          </button>
                          <button
                            onClick={() => handleGiftCoins(p.sessionId, "set")}
                            className="bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-xs"
                          >
                            Set {giftAmount}
                          </button>
                          <button
                            onClick={() => { setGiftAmount(0); handleGiftCoins(p.sessionId, "set"); }}
                            className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded text-xs"
                          >
                            Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === "config" && (
          <form onSubmit={handleSaveConfig} className="max-w-md space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Coins ban đầu</label>
              <input
                type="number"
                value={config.startCoins}
                onChange={(e) => setConfig({ ...config, startCoins: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Cược tối thiểu</label>
              <input
                type="number"
                value={config.minBet}
                onChange={(e) => setConfig({ ...config, minBet: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Thời gian mỗi vòng (giây)</label>
              <input
                type="number"
                value={config.roundDuration}
                onChange={(e) => setConfig({ ...config, roundDuration: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
              />
            </div>
            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-white font-medium block">Phí nhàn rỗi</label>
                  <span className="text-gray-400 text-xs">Thu phí ngẫu nhiên nếu không đặt cược trong vòng</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, houseFeeEnabled: !config.houseFeeEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.houseFeeEnabled ? "bg-green-600" : "bg-gray-600"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.houseFeeEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div className={`grid grid-cols-2 gap-3 ${!config.houseFeeEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Phí tối thiểu</label>
                  <input
                    type="number"
                    value={config.houseFeeMin}
                    onChange={(e) => setConfig({ ...config, houseFeeMin: Number(e.target.value) })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Phí tối đa</label>
                  <input
                    type="number"
                    value={config.houseFeeMax}
                    onChange={(e) => setConfig({ ...config, houseFeeMax: Number(e.target.value) })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
                  />
                </div>
              </div>
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg">
              Lưu cấu hình
            </button>
            <p className="text-gray-500 text-xs">* Thay đổi áp dụng cho vòng tiếp theo</p>
          </form>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div>
            <div className="flex gap-2 mb-4">
              <button onClick={fetchHistory} className="text-blue-400 text-sm hover:text-blue-300">
                🔄 Refresh
              </button>
            </div>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-4">
                  <span className="text-gray-400 text-sm w-16">#{h.id}</span>
                  <div className="flex gap-2 text-2xl">
                    {h.numbers.map((n, i) => (
                      <span key={i}>{"⚀⚁⚂⚃⚄⚅"[n - 1]}</span>
                    ))}
                  </div>
                  <span className="text-gray-300 text-sm">
                    Tổng: <strong>{h.numbers.reduce((a, b) => a + b, 0)}</strong>
                  </span>
                  <span className="text-gray-500 text-xs ml-auto">
                    {new Date(h.timestamp).toLocaleTimeString("vi-VN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
