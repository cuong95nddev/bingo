import { useState, useEffect, useCallback } from "react";

const API = "/admin";

interface Player { sessionId: string; id: string; name: string; coins: number }
interface Config { startCoins: number; minBet: number; roundDuration: number }
interface RoundHistory { id: number; numbers: number[]; timestamp: number }

export function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"players" | "config" | "history">("players");

  const [players, setPlayers] = useState<Player[]>([]);
  const [config, setConfig] = useState<Config>({ startCoins: 1000, minBet: 10, roundDuration: 30 });
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [giftAmount, setGiftAmount] = useState(100);

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

  useEffect(() => {
    if (!authenticated) return;
    fetchPlayers();
    fetchConfig();
    fetchHistory();
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, [authenticated, fetchPlayers, fetchConfig, fetchHistory]);

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
    { key: "players", label: "Players" },
    { key: "config", label: "Cấu hình" },
    { key: "history", label: "Lịch sử" },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700">
        <h1 className="text-xl font-bold text-yellow-400">🎲 Bingo 18 — Admin</h1>
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
