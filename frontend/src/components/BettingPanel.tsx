import { useState } from "react";
import type { GameBet, GameConfig } from "../types/game";
import { BetModal } from "./BetModal";

interface Props {
  onPlaceBet: (bet: GameBet) => void;
  onClearBets: () => void;
  disabled: boolean;
  myCoins: number;
  config: GameConfig;
  currentBets: GameBet[];
  winOptions?: Set<string>;
}

const NUMBERS = [1, 2, 3, 4, 5, 6];

const SUM_MULT: Record<number, string> = {
  3: "x120", 4: "x40", 5: "x20", 6: "x12",
  7: "x8", 8: "x5.5", 9: "x4.7", 10: "x4.4",
  11: "x4.4", 12: "x4.7", 13: "x5.5", 14: "x8",
  15: "x12", 16: "x20", 17: "x40", 18: "x120",
};

const GOLD_ACTIVE = "radial-gradient(circle at 35% 30%, #ffffff, #22c55e)";
const GOLD_NORMAL = "radial-gradient(circle at 35% 30%, #f5c842, #c8860a)";
const GOLD_SHADOW = "0 2px 4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35)";
const GOLD_SHADOW_ACTIVE = "0 0 8px rgba(34,197,94,0.55)";

function QuestionBadge() {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ml-1 shrink-0"
      style={{ background: "#1a5a2a", color: "#5aaa6a", border: "1px solid #2a7a3a" }}
    >
      ?
    </span>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pt-2 pb-1.5 flex items-center gap-1" style={{ color: "white" }}>
      <span className="text-[11px] font-semibold">{children}</span>
      <QuestionBadge />
    </div>
  );
}

function GoldCircle({
  label,
  size,
  active,
}: {
  label: string | number;
  size: "lg" | "md" | "sm";
  active: boolean;
}) {
  const dim =
    size === "lg" ? "w-11 h-11" : size === "md" ? "w-8 h-8" : "w-[26px] h-[26px]";
  const text =
    size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-[11px]";
  return (
    <div
      className={`${dim} ${text} rounded-full flex items-center justify-center font-bold`}
      style={{
        background: active ? GOLD_ACTIVE : GOLD_NORMAL,
        color: active ? "#071a09" : "#2d1800",
        boxShadow: active ? GOLD_SHADOW_ACTIVE : GOLD_SHADOW,
      }}
    >
      {label}
    </div>
  );
}



function SumGrid({
  rows,
  hasBet,
  isWin,
  selectBet,
  disabled,
}: {
  rows: number[][];
  hasBet: (type: string, value: number) => boolean;
  isWin: (type: string, value: number) => boolean;
  selectBet: (type: string, value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="px-2 pb-1">
      {rows.map((row, ri) => (
        <div key={ri} className={`grid grid-cols-8 gap-0.5 ${ri < rows.length - 1 ? "mb-0.5" : ""}`}>
          {row.map((n) => (
            <button
              key={n}
              onClick={() => selectBet("sum", n)}
              disabled={disabled}
              className="flex flex-col items-center py-1.5 rounded-sm transition-all active:scale-95 disabled:opacity-60"
              style={
                hasBet("sum", n)
                  ? { background: "#22c55e", color: "white" }
                  : isWin("sum", n)
                  ? { background: "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)", color: "#1a0a00", boxShadow: "0 0 12px rgba(245,158,11,0.8), 0 0 3px rgba(255,220,100,0.5)" }
                  : {
                      background: "linear-gradient(180deg, #dab870 0%, #b8901a 100%)",
                      color: "#2d1800",
                    }
              }
            >
              <span className="text-[15px] font-extrabold leading-none">{n}</span>
              <span className="text-[8px] mt-0.5 opacity-75 font-medium">{SUM_MULT[n]}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

const WIN_BG = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
const WIN_SHADOW = "0 0 16px rgba(245,158,11,0.7), 0 0 4px rgba(255,220,100,0.5)";

function TripleSection({
  hasBet, isWin, selectBet, disabled,
}: { hasBet: (t: string, v: number) => boolean; isWin: (t: string, v: number) => boolean; selectBet: (t: string, v: number) => void; disabled: boolean }) {
  const items = [...NUMBERS.map((n) => ({ label: n, value: n })), { label: "★", value: 0 }];
  return (
    <div className="pb-1">
      <div className="px-2 pt-2 pb-1.5 flex items-center" style={{ color: "white" }}>
        <span className="text-[11px] font-semibold">
          3 số trùng nhau{" "}
          <span style={{ color: "#c8c8c8" }}>x120</span>
          <span className="mx-1" style={{ color: "#3a6a3a" }}>|</span>
          3 số trùng nhau bất kỳ{" "}
          <span style={{ color: "#c8c8c8" }}>x20</span>
        </span>
        <QuestionBadge />
      </div>
      <div className="px-2">
        <div className="rounded-xl p-2 flex gap-1.5" style={{ background: "#0e2510" }}>
          {items.map(({ label, value }) => {
            const active = hasBet("triple", value);
            const win = isWin("triple", value);
            return (
              <button
                key={value}
                onClick={() => !disabled && selectBet("triple", value)}
                disabled={disabled}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                style={{ background: active ? "#1a5a28" : win ? WIN_BG : "#162e1a", boxShadow: win ? WIN_SHADOW : undefined }}
              >
                <GoldCircle label={label} size="md" active={active} />
                <GoldCircle label={label} size="md" active={active} />
                <GoldCircle label={label} size="md" active={active} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DoubleSection({
  hasBet, isWin, selectBet, disabled,
}: { hasBet: (t: string, v: number) => boolean; isWin: (t: string, v: number) => boolean; selectBet: (t: string, v: number) => void; disabled: boolean }) {
  return (
    <div className="pb-1">
      <div className="px-2 pt-2 pb-1.5 flex items-center" style={{ color: "white" }}>
        <span className="text-[11px] font-semibold">
          2 số trùng nhau{" "}
          <span style={{ color: "#c8c8c8" }}>x7.5</span>
        </span>
        <QuestionBadge />
      </div>
      <div className="px-2">
        <div className="rounded-xl p-2 flex gap-1.5" style={{ background: "#0e2510" }}>
          {NUMBERS.map((n) => {
            const active = hasBet("double", n);
            const win = isWin("double", n);
            return (
              <button
                key={n}
                onClick={() => !disabled && selectBet("double", n)}
                disabled={disabled}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                style={{ background: active ? "#1a5a28" : win ? WIN_BG : "#162e1a", boxShadow: win ? WIN_SHADOW : undefined }}
              >
                <GoldCircle label={n} size="md" active={active} />
                <GoldCircle label={n} size="md" active={active} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SingleSection({
  hasBet, isWin, selectBet, disabled,
}: { hasBet: (t: string, v: number) => boolean; isWin: (t: string, v: number) => boolean; selectBet: (t: string, v: number) => void; disabled: boolean }) {
  return (
    <div className="pb-3">
      <div className="px-2 pt-2 pb-1.5 flex items-center" style={{ color: "white" }}>
        <span className="text-[11px] font-semibold">
          1 số trùng{" "}
          <span style={{ color: "#c8c8c8" }}>1 số x1.2</span>
          <span className="mx-1" style={{ color: "#3a6a3a" }}>|</span>
          <span style={{ color: "#c8c8c8" }}>2 số x2</span>
          <span className="mx-1" style={{ color: "#3a6a3a" }}>|</span>
          <span style={{ color: "#c8c8c8" }}>3 số x3</span>
        </span>
        <QuestionBadge />
      </div>
      <div className="px-2">
        <div className="rounded-xl p-2 flex gap-1.5" style={{ background: "#0e2510" }}>
          {NUMBERS.map((n) => {
            const active = hasBet("single", n);
            const win = isWin("single", n);
            return (
              <button
                key={n}
                onClick={() => !disabled && selectBet("single", n)}
                disabled={disabled}
                className="flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                style={{ background: active ? "#1a5a28" : win ? WIN_BG : "#162e1a", boxShadow: win ? WIN_SHADOW : undefined }}
              >
                <GoldCircle label={n} size="lg" active={active} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function BettingPanel({
  onPlaceBet,
  disabled,
  myCoins,
  currentBets,
  winOptions = new Set(),
}: Props) {
  const [pendingBet, setPendingBet] = useState<{ type: string; value: number } | null>(null);

  const totalBet = currentBets.reduce((s, b) => s + b.amount, 0);
  const availableCoins = Math.max(0, myCoins - totalBet);

  const hasBet = (type: string, value: number) =>
    currentBets.some((b) => b.type === type && b.value === value);

  const isWin = (type: string, value: number) => winOptions.has(`${type}:${value}`);

  const selectBet = (type: string, value: number) => {
    if (disabled) return;
    if (availableCoins <= 0) return;
    setPendingBet({ type, value });
  };

  const handleConfirm = (amount: number) => {
    if (!pendingBet) return;
    onPlaceBet({ type: pendingBet.type, value: pendingBet.value, amount });
  };

  const modal = pendingBet && (
    <BetModal
      betType={pendingBet.type}
      betValue={pendingBet.value}
      availableCoins={availableCoins}
      onConfirm={handleConfirm}
      onClose={() => setPendingBet(null)}
    />
  );

  return (
    <>
      {modal}

      {/* Cộng tổng section header */}
      <SectionHeader>Cộng tổng</SectionHeader>

        {/* Big / Draw / Small buttons */}
        <div className="px-2 pb-1">
          <div className="flex gap-1.5">
            {[
              { type: "small", label: "NHỎ", sub: "3-9", mult: "x1.5" },
              { type: "draw",  label: "HÒA",  sub: "10-11", mult: "x2" },
              { type: "big",   label: "LỚN",  sub: "12-18", mult: "x1.5" },
            ].map(({ type, label, sub, mult }) => (
              <button
                key={type}
                onClick={() => selectBet(type, 0)}
                disabled={disabled}
                className="flex-1 py-4 rounded-xl flex flex-col items-center gap-0.5 transition-all disabled:opacity-50 active:scale-95"
                style={
                  hasBet(type, 0)
                    ? { background: "#22c55e", color: "#061508" }
                    : isWin(type, 0)
                    ? { background: WIN_BG, color: "#1a0800", boxShadow: WIN_SHADOW }
                    : { background: "#0e2510", color: "white", border: "1px solid #1a4a20" }
                }
              >
                <span
                  className="font-black text-xl tracking-tight"
                  style={{ color: hasBet(type, 0) || isWin(type, 0) ? "#1a0800" : type === "draw" ? "#d4a050" : "white" }}
                >
                  {label}
                </span>
                <span className="text-[10px] opacity-60">{sub}</span>
                <span
                  className="text-xs font-bold"
                  style={{ color: hasBet(type, 0) || isWin(type, 0) ? "#1a0800" : "#d4a050" }}
                >
                  {mult}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sum grid: 3–10 top, 18–11 bottom */}
        <SumGrid
          rows={[[3, 4, 5, 6, 7, 8, 9, 10], [18, 17, 16, 15, 14, 13, 12, 11]]}
          hasBet={hasBet}
          isWin={isWin}
          selectBet={selectBet}
          disabled={disabled}
        />

        <TripleSection hasBet={hasBet} isWin={isWin} selectBet={selectBet} disabled={disabled} />
        <DoubleSection hasBet={hasBet} isWin={isWin} selectBet={selectBet} disabled={disabled} />
        <SingleSection hasBet={hasBet} isWin={isWin} selectBet={selectBet} disabled={disabled} />
      </>
    );
}
