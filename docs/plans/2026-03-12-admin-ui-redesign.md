# Admin UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign `AdminPage.tsx` into a professional dashboard with fixed sidebar, KPI stat cards, and polished Tailwind styling — zero business logic changes.

**Architecture:** Single-file rewrite of `AdminPage.tsx`. Add `lucide-react` for icons. Layout splits into a fixed 240px sidebar + scrollable main content area. All state, API calls, and polling remain unchanged.

**Tech Stack:** React 19, Tailwind CSS, lucide-react (new dep)

---

### Task 1: Install lucide-react

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install the package**

```bash
cd /Users/cuongpham/ws/bingo/frontend
npm install lucide-react
```

Expected: package added to `dependencies` in `frontend/package.json`

**Step 2: Verify install**

```bash
cd /Users/cuongpham/ws/bingo/frontend
node -e "require('lucide-react')" 2>&1 || echo "ESM only - ok"
```

Expected: either silent or "ESM only - ok" (lucide-react is ESM, Vite handles it fine)

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add lucide-react for admin UI icons"
```

---

### Task 2: Rewrite login screen

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`

**Step 1: Replace the login return block**

Find the block starting at line 145 (`if (!authenticated) {`) and replace with:

```tsx
if (!authenticated) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600/20 rounded-2xl mb-2">
              <ShieldCheck className="w-7 h-7 text-indigo-400" />
            </div>
            <h1 className="text-white text-2xl font-bold">Bí Ngô 88</h1>
            <p className="text-slate-400 text-sm">Admin Dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            {authError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {authError}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Đăng nhập
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Add lucide-react imports at top of file**

Add after line 1 (`import { useState, useEffect, useCallback } from "react";`):

```tsx
import { ShieldCheck, AlertCircle, Zap, Users, Settings, History, LogOut, RefreshCw, Trophy, Skull } from "lucide-react";
```

**Step 3: Verify it builds**

```bash
cd /Users/cuongpham/ws/bingo/frontend
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors

**Step 4: Commit**

```bash
git add frontend/src/pages/AdminPage.tsx
git commit -m "feat: redesign admin login screen with shield icon and polished styling"
```

---

### Task 3: Add KPI stat cards component (inline)

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`

**Step 1: Add a KPI cards block**

After the tabs definition (`const tabs = [...]`), add this helper before the `return`:

```tsx
const kpiCards = [
  {
    label: "Online Players",
    value: players.length,
    icon: <Users className="w-5 h-5 text-indigo-400" />,
    accent: "border-indigo-500/30",
  },
  {
    label: "Trạng thái Game",
    value: gameStatus === "waiting" ? "Chờ bắt đầu" :
           gameStatus === "betting" ? "Đặt cược" :
           gameStatus === "drawing" ? "Đang quay" : "Kết quả",
    icon: <Zap className="w-5 h-5 text-emerald-400" />,
    accent: "border-emerald-500/30",
    badge: gameStatus,
  },
  {
    label: "Tổng vòng",
    value: history.length,
    icon: <History className="w-5 h-5 text-amber-400" />,
    accent: "border-amber-500/30",
  },
];
```

**Step 2: Create the KPI cards JSX block** (to be used inside the main layout in the next task)

Save this snippet — it will be placed inside the main content area:

```tsx
{/* KPI Cards */}
<div className="grid grid-cols-3 gap-4 mb-6">
  {kpiCards.map((card) => (
    <div key={card.label} className={`bg-slate-800 rounded-xl p-4 border-t-2 ${card.accent}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{card.label}</span>
        {card.icon}
      </div>
      <div className="text-2xl font-bold text-white">{card.value}</div>
    </div>
  ))}
</div>
```

**Step 3: Verify build still passes**

```bash
cd /Users/cuongpham/ws/bingo/frontend
npm run build 2>&1 | tail -5
```

---

### Task 4: Build the dashboard shell (sidebar + header + main area)

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`

**Step 1: Replace the entire authenticated `return` block** (lines 173–479) with the new layout:

```tsx
return (
  <div className="min-h-screen bg-slate-950 flex">
    {/* Sidebar */}
    <aside className="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-lg">🎲</div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">Bí Ngô 88</div>
            <div className="text-slate-500 text-xs">Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {[
          { key: "game" as const, label: "Game Control", icon: <Zap className="w-4 h-4" /> },
          { key: "players" as const, label: "Players", icon: <Users className="w-4 h-4" />, badge: players.length },
          { key: "config" as const, label: "Cấu hình", icon: <Settings className="w-4 h-4" /> },
          { key: "history" as const, label: "Lịch sử", icon: <History className="w-4 h-4" /> },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === item.key
                ? "bg-slate-800 text-indigo-400 border-l-2 border-indigo-500 pl-[10px]"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge !== undefined && (
              <span className="bg-indigo-600/30 text-indigo-300 text-xs font-mono px-1.5 py-0.5 rounded-md">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={() => setAuthenticated(false)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </aside>

    {/* Main */}
    <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-white font-semibold text-lg">
            {activeTab === "game" && "Game Control"}
            {activeTab === "players" && "Players"}
            {activeTab === "config" && "Cấu hình"}
            {activeTab === "history" && "Lịch sử"}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          admin
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {kpiCards.map((card) => (
            <div key={card.label} className={`bg-slate-800 rounded-xl p-5 border-t-2 ${card.accent}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{card.label}</span>
                {card.icon}
              </div>
              <div className="text-3xl font-bold text-white">{card.value}</div>
            </div>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "game" && <GameTab />}
        {activeTab === "players" && <PlayersTab />}
        {activeTab === "config" && <ConfigTab />}
        {activeTab === "history" && <HistoryTab />}
      </main>
    </div>
  </div>
);
```

NOTE: `<GameTab />`, `<PlayersTab />`, `<ConfigTab />`, `<HistoryTab />` are inline components defined inside `AdminPage` — see next tasks.

**Step 2: Verify build**

```bash
cd /Users/cuongpham/ws/bingo/frontend
npm run build 2>&1 | tail -10
```

**Step 3: Commit**

```bash
git add frontend/src/pages/AdminPage.tsx
git commit -m "feat: add dashboard sidebar and header shell to admin panel"
```

---

### Task 5: Rewrite Game tab content

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`

**Step 1: Remove the old `{activeTab === "game" && (...)}` block and replace `<GameTab />` usage with an inline fragment**

Define `GameTab` as a const inside `AdminPage` (before the `return`):

```tsx
const GameTab = () => (
  <div className="max-w-lg space-y-6">
    {/* Start / Status */}
    <div className="bg-slate-800 rounded-xl p-6 space-y-4 border border-slate-700">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Trạng thái vòng</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          gameStatus === "waiting" ? "bg-slate-700 text-slate-300" :
          gameStatus === "betting" ? "bg-emerald-900/60 text-emerald-400 border border-emerald-700/40" :
          gameStatus === "drawing" ? "bg-blue-900/60 text-blue-400 border border-blue-700/40" :
          "bg-amber-900/60 text-amber-400 border border-amber-700/40"
        }`}>
          {gameStatus === "waiting" ? "Chờ bắt đầu" :
           gameStatus === "betting" ? "● Đặt cược" :
           gameStatus === "drawing" ? "● Đang quay" : "● Kết quả"}
        </span>
      </div>
      <button
        onClick={handleStartGame}
        disabled={gameStatus !== "waiting" || starting}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-base transition-colors"
      >
        {starting ? "Đang khởi động..." : "Bắt đầu Game"}
      </button>
      {gameStatus !== "waiting" && (
        <p className="text-slate-500 text-sm text-center">Game đang chạy — các vòng tự động tiếp tục</p>
      )}
      <button
        onClick={handleNewGame}
        className="w-full bg-red-900/40 hover:bg-red-800/60 border border-red-700/40 text-red-400 font-semibold py-3 rounded-xl transition-colors text-sm"
      >
        Game Mới (Reset toàn bộ)
      </button>
    </div>

    {/* Hacker */}
    <div className="bg-slate-800 rounded-xl p-6 space-y-4 border-l-4 border-red-600/60">
      <div className="flex items-center gap-2">
        <Skull className="w-5 h-5 text-red-400" />
        <h2 className="text-red-400 font-bold">Hacker</h2>
      </div>
      <p className="text-slate-400 text-xs">Trừ tiền ngẫu nhiên của hơn 50% người chơi, hiển thị cảnh báo tấn công</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-slate-400 text-xs block mb-1">Trừ tối thiểu</label>
          <input
            type="number"
            value={hackerMin}
            onChange={(e) => setHackerMin(Number(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">Trừ tối đa</label>
          <input
            type="number"
            value={hackerMax}
            onChange={(e) => setHackerMax(Number(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>
      <button
        onClick={handleHacker}
        className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors font-mono tracking-widest"
      >
        HACK
      </button>
      {hackerResult && (
        <div className="bg-red-950/50 border border-red-700/40 rounded-lg px-4 py-3 text-sm">
          <div className="text-red-400 font-bold mb-1">Đã tấn công!</div>
          <div className="text-slate-300">{hackerResult.victimCount}/{hackerResult.playerCount} người bị trừ tiền</div>
        </div>
      )}
    </div>

    {/* Jackpot */}
    <div className="bg-slate-800 rounded-xl p-6 space-y-4 border-l-4 border-amber-500/60">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-400" />
        <h2 className="text-amber-400 font-bold">Nổ Hũ</h2>
      </div>
      <p className="text-slate-400 text-xs">Chọn khoảng ngẫu nhiên — hệ thống sẽ chia đều cho tất cả người chơi</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-slate-400 text-xs block mb-1">Tối thiểu</label>
          <input
            type="number"
            value={jackpotMin}
            onChange={(e) => setJackpotMin(Number(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">Tối đa</label>
          <input
            type="number"
            value={jackpotMax}
            onChange={(e) => setJackpotMax(Number(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>
      <button
        onClick={handleJackpot}
        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-colors"
      >
        Nổ Hũ
      </button>
      {jackpotResult && (
        <div className="bg-amber-950/50 border border-amber-700/40 rounded-lg px-4 py-3 text-sm">
          <div className="text-amber-300 font-bold mb-1">Đã nổ hũ!</div>
          <div className="text-slate-300">Tổng: <span className="text-amber-400 font-bold">{jackpotResult.total.toLocaleString("vi-VN")}đ</span></div>
          <div className="text-slate-300">Mỗi người: <span className="text-amber-400 font-bold">+{jackpotResult.perPlayer.toLocaleString("vi-VN")}đ</span> × {jackpotResult.playerCount} người</div>
        </div>
      )}
    </div>
  </div>
);
```

**Step 2: Verify build**

```bash
cd /Users/cuongpham/ws/bingo/frontend
npm run build 2>&1 | tail -10
```

---

### Task 6: Rewrite Players tab content

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`

**Step 1: Replace old players tab block with `PlayersTab` const**

```tsx
const PlayersTab = () => (
  <div>
    {/* Toolbar */}
    <div className="flex items-center gap-4 mb-5">
      <div className="flex items-center gap-2">
        <span className="bg-slate-700 text-slate-300 text-xs font-mono px-2 py-1 rounded">{players.length} players</span>
        <button onClick={fetchPlayers} className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <label className="text-slate-400 text-sm">Số coins:</label>
        <input
          type="number"
          value={giftAmount}
          onChange={(e) => setGiftAmount(Number(e.target.value))}
          className="w-28 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>

    {/* Table */}
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-900/50">
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Người chơi</th>
            <th className="text-right py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Coins</th>
            <th className="text-center py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={p.sessionId} className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${i % 2 === 0 ? "" : "bg-slate-800/50"}`}>
              <td className="py-3 px-4">
                <div className="text-white font-medium">{p.name}</div>
                <div className="text-slate-500 text-xs font-mono">{p.id.slice(0, 12)}…</div>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="inline-flex items-center gap-1 bg-amber-900/30 border border-amber-700/30 text-amber-400 font-mono font-semibold px-2.5 py-1 rounded-lg text-sm">
                  💰 {p.coins.toLocaleString()}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-2 justify-center">
                  <button onClick={() => handleGiftCoins(p.sessionId, "add")} className="bg-emerald-800/60 hover:bg-emerald-700/80 border border-emerald-700/40 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                    +{giftAmount}
                  </button>
                  <button onClick={() => handleGiftCoins(p.sessionId, "set")} className="bg-indigo-800/60 hover:bg-indigo-700/80 border border-indigo-700/40 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                    Set {giftAmount}
                  </button>
                  <button onClick={() => { setGiftAmount(0); handleGiftCoins(p.sessionId, "set"); }} className="bg-red-900/40 hover:bg-red-800/60 border border-red-700/40 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                    Reset
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {players.length === 0 && (
            <tr>
              <td colSpan={3} className="py-12 text-center text-slate-500 text-sm">Chưa có người chơi nào kết nối</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
```

**Step 2: Verify build**

```bash
cd /Users/cuongpham/ws/bingo/frontend
npm run build 2>&1 | tail -10
```

---

### Task 7: Rewrite Config tab content

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`

**Step 1: Replace old config tab block with `ConfigTab` const**

```tsx
const ConfigTab = () => (
  <div className="max-w-lg">
    <form onSubmit={handleSaveConfig} className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-5">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider text-slate-400">Cài đặt cơ bản</h2>
        <div>
          <label className="text-slate-300 text-sm font-medium block mb-1.5">Coins ban đầu</label>
          <p className="text-slate-500 text-xs mb-2">Số coins mỗi người chơi mới nhận khi tham gia</p>
          <input
            type="number"
            value={config.startCoins}
            onChange={(e) => setConfig({ ...config, startCoins: Number(e.target.value) })}
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div>
          <label className="text-slate-300 text-sm font-medium block mb-1.5">Cược tối thiểu</label>
          <input
            type="number"
            value={config.minBet}
            onChange={(e) => setConfig({ ...config, minBet: Number(e.target.value) })}
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div>
          <label className="text-slate-300 text-sm font-medium block mb-1.5">Thời gian mỗi vòng (giây)</label>
          <input
            type="number"
            value={config.roundDuration}
            onChange={(e) => setConfig({ ...config, roundDuration: Number(e.target.value) })}
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Phí nhàn rỗi</h2>
            <p className="text-slate-400 text-xs mt-0.5">Thu phí ngẫu nhiên nếu không đặt cược trong vòng</p>
          </div>
          <button
            type="button"
            onClick={() => setConfig({ ...config, houseFeeEnabled: !config.houseFeeEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.houseFeeEnabled ? "bg-indigo-600" : "bg-slate-600"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${config.houseFeeEnabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        <div className={`grid grid-cols-2 gap-4 transition-opacity ${!config.houseFeeEnabled ? "opacity-40 pointer-events-none" : ""}`}>
          <div>
            <label className="text-slate-400 text-sm block mb-1.5">Phí tối thiểu</label>
            <input
              type="number"
              value={config.houseFeeMin}
              onChange={(e) => setConfig({ ...config, houseFeeMin: Number(e.target.value) })}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1.5">Phí tối đa</label>
            <input
              type="number"
              value={config.houseFeeMax}
              onChange={(e) => setConfig({ ...config, houseFeeMax: Number(e.target.value) })}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
          Lưu cấu hình
        </button>
        <p className="text-slate-500 text-xs">* Thay đổi áp dụng cho vòng tiếp theo</p>
      </div>
    </form>
  </div>
);
```

**Step 2: Verify build**

```bash
cd /Users/cuongpham/ws/bingo/frontend
npm run build 2>&1 | tail -10
```

---

### Task 8: Rewrite History tab content

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`

**Step 1: Replace old history tab block with `HistoryTab` const**

```tsx
const HistoryTab = () => (
  <div>
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-white font-semibold">Lịch sử vòng</h2>
      <button onClick={fetchHistory} className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
        <RefreshCw className="w-3.5 h-3.5" />
        Refresh
      </button>
    </div>
    <div className="space-y-2">
      {history.length === 0 && (
        <div className="text-center text-slate-500 py-12 text-sm">Chưa có vòng nào được chơi</div>
      )}
      {history.map((h) => (
        <div key={h.id} className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex items-center gap-5 hover:border-slate-600 transition-colors">
          <span className="text-slate-500 text-xs font-mono w-12">#{h.id}</span>
          <div className="flex gap-2 text-2xl">
            {h.numbers.map((n, i) => (
              <span key={i}>{"⚀⚁⚂⚃⚄⚅"[n - 1]}</span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Tổng:</span>
            <span className="bg-slate-700 text-white text-sm font-bold font-mono px-2.5 py-0.5 rounded-lg">
              {h.numbers.reduce((a, b) => a + b, 0)}
            </span>
          </div>
          <span className="text-slate-500 text-xs font-mono ml-auto">
            {new Date(h.timestamp).toLocaleTimeString("vi-VN")}
          </span>
        </div>
      ))}
    </div>
  </div>
);
```

**Step 2: Verify build**

```bash
cd /Users/cuongpham/ws/bingo/frontend
npm run build 2>&1 | tail -10
```

---

### Task 9: Final cleanup and commit

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`

**Step 1: Remove any leftover old tab blocks or dead code**

Check for any remaining `{activeTab === "game" && (`, `{activeTab === "players" && (` etc. blocks that are now replaced by the inline `const` components. Delete them.

**Step 2: Run lint**

```bash
cd /Users/cuongpham/ws/bingo/frontend
npm run lint 2>&1 | tail -20
```

Fix any lint errors reported.

**Step 3: Final build**

```bash
cd /Users/cuongpham/ws/bingo/frontend
npm run build 2>&1 | tail -10
```

Expected: clean build, no errors, no warnings about unused imports.

**Step 4: Commit**

```bash
git add frontend/src/pages/AdminPage.tsx
git commit -m "feat: redesign admin dashboard with sidebar, KPI cards, and polished UI"
```
