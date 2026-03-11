import { useState } from "react";
import type { GameBet, GameConfig } from "../types/game";

interface Props {
  onPlaceBet: (bet: GameBet) => void;
  onClearBets: () => void;
  disabled: boolean;
  myCoins: number;
  config: GameConfig;
  currentBets: GameBet[];
}

const NUMBERS = [1, 2, 3, 4, 5, 6];

export function BettingPanel({ onPlaceBet, onClearBets, disabled, myCoins, config, currentBets }: Props) {
  const [amount, setAmount] = useState(config.minBet);

  const totalBet = currentBets.reduce((s, b) => s + b.amount, 0);

  const bet = (type: string, value: number) => {
    if (disabled || myCoins - totalBet < amount) return;
    onPlaceBet({ type, value, amount });
  };

  const btnClass = (active = false) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      disabled
        ? "opacity-40 cursor-not-allowed bg-gray-700 text-gray-400"
        : active
        ? "bg-blue-600 text-white"
        : "bg-gray-700 hover:bg-gray-600 text-white"
    }`;

  return (
    <div className="space-y-4">
      {/* Amount selector */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">Mức cược:</span>
        {[10, 50, 100, 500].map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className={`px-3 py-1 rounded text-sm ${amount === v ? "bg-yellow-500 text-black font-bold" : "bg-gray-700 text-gray-300"}`}
          >
            {v}
          </button>
        ))}
        <input
          type="number"
          value={amount}
          min={config.minBet}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-20 bg-gray-700 text-white rounded px-2 py-1 text-sm"
        />
      </div>

      {/* Lớn / Hòa / Nhỏ */}
      <div>
        <div className="text-xs text-gray-400 mb-2">Lớn / Hòa / Nhỏ</div>
        <div className="flex gap-2">
          <button onClick={() => bet("big", 0)} className={`${btnClass()} flex-1`}>
            Lớn (12-18) <span className="text-green-400">1:1</span>
          </button>
          <button onClick={() => bet("draw", 0)} className={`${btnClass()} flex-1`}>
            Hòa (10-11) <span className="text-yellow-400">3:1</span>
          </button>
          <button onClick={() => bet("small", 0)} className={`${btnClass()} flex-1`}>
            Nhỏ (3-9) <span className="text-green-400">1:1</span>
          </button>
        </div>
      </div>

      {/* Số đơn */}
      <div>
        <div className="text-xs text-gray-400 mb-2">Số đơn (xuất hiện ≥1 lần) — 1:1</div>
        <div className="flex gap-2">
          {NUMBERS.map((n) => (
            <button key={n} onClick={() => bet("single", n)} className={`${btnClass()} flex-1`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Đôi */}
      <div>
        <div className="text-xs text-gray-400 mb-2">Số đôi (xuất hiện ≥2 lần) — 5:1</div>
        <div className="flex gap-2">
          {NUMBERS.map((n) => (
            <button key={n} onClick={() => bet("double", n)} className={`${btnClass()} flex-1`}>
              {n}×2
            </button>
          ))}
        </div>
      </div>

      {/* Ba */}
      <div>
        <div className="text-xs text-gray-400 mb-2">Số ba (cả 3 cùng số) — 20:1</div>
        <div className="flex gap-2">
          {NUMBERS.map((n) => (
            <button key={n} onClick={() => bet("triple", n)} className={`${btnClass()} flex-1`}>
              {n}×3
            </button>
          ))}
        </div>
      </div>

      {/* Current bets + clear */}
      {currentBets.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-xs">Cược hiện tại ({currentBets.length})</span>
            <button onClick={onClearBets} disabled={disabled} className="text-red-400 text-xs hover:text-red-300">
              Xóa tất cả
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {currentBets.map((b, i) => (
              <span key={i} className="bg-blue-900 text-blue-300 text-xs px-2 py-1 rounded">
                {b.type} {b.value > 0 ? b.value : ""} — {b.amount}💰
              </span>
            ))}
          </div>
          <div className="text-right text-sm text-yellow-400 mt-2">Tổng cược: {totalBet}💰</div>
        </div>
      )}
    </div>
  );
}
