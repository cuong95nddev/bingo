import { useMemo, useState } from "react";
import { computeSumPayouts, computeThresholds } from "../utils/diceUtils";

interface Props {
  betType: string;
  betValue: number;
  availableCoins: number;
  onConfirm: (amount: number) => void;
  onClose: () => void;
  diceMax: number;
}

const BET_MULT: Record<string, string> = {
  single: "×1.2~3",
  double: "×7.5",
  triple: "×120",
  big: "×2",
  small: "×2",
  draw: "×4",
};

function ballCount(type: string): number {
  if (type === "single") return 1;
  if (type === "double") return 2;
  if (type === "triple") return 3;
  return 0;
}

function OrangeBall({ label }: { label: string | number }) {
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-xl"
      style={{
        background: "radial-gradient(circle at 38% 32%, #ffb84d, #d95a00)",
        boxShadow:
          "0 4px 10px rgba(0,0,0,0.45), inset 0 -2px 4px rgba(0,0,0,0.25), inset 0 2px 6px rgba(255,255,255,0.35)",
      }}
    >
      {label}
    </div>
  );
}

function Diamond({ amount }: { amount: number }) {
  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: 160,
          height: 160,
          background:
            "radial-gradient(circle, rgba(255,210,30,0.28) 0%, transparent 68%)",
        }}
      />
      <svg width="136" height="126" viewBox="0 0 136 126" className="relative">
        {/* Crown top facets */}
        <polygon points="68,6 30,46 106,46" fill="#dd1a1a" />
        {/* Crown side cuts */}
        <polygon points="6,46 30,46 68,6 22,6" fill="#ff5555" />
        <polygon points="130,46 106,46 68,6 114,6" fill="#bb0000" />
        {/* Top edge band */}
        <polygon points="22,6 114,6 68,6" fill="#ff7777" />
        {/* Girdle */}
        <polygon points="6,46 22,6 114,6 130,46" fill="#ee3333" />
        {/* Pavilion left */}
        <polygon points="6,46 30,46 68,118" fill="#880000" />
        {/* Pavilion center */}
        <polygon points="30,46 106,46 68,118" fill="#aa1111" />
        {/* Pavilion right */}
        <polygon points="106,46 130,46 68,118" fill="#660000" />
        {/* Highlight facet */}
        <polygon
          points="68,6 38,44 30,46 46,18"
          fill="rgba(255,255,255,0.32)"
        />
        <ellipse
          cx="52"
          cy="22"
          rx="13"
          ry="7"
          fill="rgba(255,255,255,0.18)"
        />
      </svg>
      {/* Amount text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
        <span
          className="font-black text-3xl leading-none"
          style={{ color: "white", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}
        >
          {amount}
        </span>
        <span className="text-white/75 text-sm font-medium">VNĐ</span>
      </div>
    </div>
  );
}

const ROW1 = [0, 10, 20, 50, 100];
const ROW2 = [300, 500, 1000];

export function BetModal({ betType, betValue, availableCoins, onConfirm, onClose, diceMax }: Props) {
  const [amount, setAmount] = useState(0);

  const thresholds = useMemo(() => computeThresholds(diceMax), [diceMax]);
  const sumPayouts = useMemo(() => computeSumPayouts(diceMax), [diceMax]);

  const betLabels: Record<string, string> = {
    single: "1 số trùng",
    double: "2 số trùng nhau",
    triple: "3 số trùng nhau",
    big: `Lớn (${thresholds.bigMin}–${3 * diceMax})`,
    small: `Nhỏ (3–${thresholds.smallMax})`,
    draw: `Hòa (${thresholds.drawValues.join("–")})`,
    sum: "Tổng",
  };

  const label = betType === "sum" ? `Tổng ${betValue}` : (betLabels[betType] ?? betType);
  const mult =
    betType === "sum"
      ? (sumPayouts[betValue] ? `×${sumPayouts[betValue]}` : "")
      : betType === "triple" && betValue === 0
      ? "×20"
      : (BET_MULT[betType] ?? "");
  const balls = ballCount(betType);
  const displayValue = betType === "triple" && betValue === 0 ? "★" : betValue;

  const handleConfirm = () => {
    if (amount > 0 && amount <= availableCoins) {
      onConfirm(amount);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-3"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[400px] rounded-2xl overflow-hidden"
        style={{ background: "#2d7a3a" }}
      >
        {/* Logo + close */}
        <div className="relative flex justify-center items-end pt-5 pb-3">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <span className="text-white font-black text-2xl tracking-[0.18em]">BÍ NGÔ</span>
            <span className="font-black text-2xl" style={{ color: "#d4a050" }}>88</span>
          </div>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full text-white text-lg font-bold transition-colors hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* Total bet */}
        <div className="text-center pb-3">
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
            Tổng tiền đặt:{" "}
          </span>
          <span className="text-white font-bold text-sm">{amount} ngô</span>
        </div>

        {/* Bet type row */}
        <div
          className="mx-4 rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: "#235a2a" }}
        >
          <span className="text-white font-bold text-sm leading-tight flex-1">{label}</span>
          {balls > 0 && (
            <div className="flex gap-2">
              {Array.from({ length: balls }).map((_, i) => (
                <OrangeBall key={i} label={displayValue} />
              ))}
            </div>
          )}
          <span className="text-white font-bold text-sm ml-auto">{mult}</span>
        </div>

        {/* Player count indicator */}
        <div
          className="flex items-center justify-center gap-2 py-3"
          style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "#ef4444" }}
          />
          <span>👥 0</span>
        </div>

        {/* Denomination title */}
        <div
          className="text-center font-bold text-lg pb-2"
          style={{ color: "white" }}
        >
          Chọn mệnh giá
        </div>

        {/* Diamond + −/+ */}
        <div className="relative flex items-center justify-center px-6">
          <button
            onClick={() => setAmount((a) => Math.max(0, a - 10))}
            className="w-14 h-14 rounded-full flex items-center justify-center text-3xl font-bold shrink-0 transition-all active:scale-90"
            style={{ background: "#b8d460", color: "#1a4a08" }}
          >
            −
          </button>
          <div className="flex-1 flex justify-center">
            <Diamond amount={amount} />
          </div>
          <button
            onClick={() => setAmount((a) => Math.min(availableCoins, a + 10))}
            className="w-14 h-14 rounded-full flex items-center justify-center text-3xl font-bold shrink-0 transition-all active:scale-90"
            style={{ background: "#b8d460", color: "#1a4a08" }}
          >
            +
          </button>
        </div>

        {/* Preset amounts */}
        <div className="px-4 pt-2 pb-2 space-y-2">
          <div className="grid grid-cols-5 gap-2">
            {ROW1.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(Math.min(v, availableCoins))}
                disabled={v > availableCoins && v !== 0}
                className="py-3 rounded-full font-bold text-sm transition-all active:scale-95 disabled:opacity-30"
                style={
                  amount === v
                    ? { background: "#b8d460", color: "#1a4a08" }
                    : { border: "1.5px solid #b8d460", color: "#b8d460" }
                }
              >
                {v}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {ROW2.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(Math.min(v, availableCoins))}
                disabled={v > availableCoins}
                className="py-3 rounded-full font-bold text-sm transition-all active:scale-95 disabled:opacity-30"
                style={
                  amount === v
                    ? { background: "#b8d460", color: "#1a4a08" }
                    : { border: "1.5px solid #b8d460", color: "#b8d460" }
                }
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => setAmount(availableCoins)}
              className="py-3 rounded-full font-bold text-sm transition-all active:scale-95"
              style={
                availableCoins > 0 && amount === availableCoins
                  ? { background: "#b8d460", color: "#1a4a08" }
                  : { border: "1.5px solid #b8d460", color: "#b8d460" }
              }
            >
              Đặt hết
            </button>
          </div>
        </div>

        {/* Limit note */}
        <div
          className="text-center py-2 italic text-xs"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Không vượt quá {availableCoins} ngô/kỳ QSMT
        </div>

        {/* Confirm */}
        <div className="px-4 pb-5 pt-1">
          <button
            onClick={handleConfirm}
            disabled={amount === 0}
            className="w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "#c8e060", color: "#1a4a08" }}
          >
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
}
