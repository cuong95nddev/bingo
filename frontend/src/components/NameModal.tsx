import { useState } from "react";

interface Props {
  onSave: (name: string) => void;
}

export function NameModal({ onSave }: Props) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 bg-[#071a09] flex items-center justify-center z-50">
      <div
        className="rounded-2xl p-8 w-full max-w-sm space-y-6"
        style={{
          background: "#0d2812",
          border: "1px solid #1a3d1a",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{
              background: "radial-gradient(circle at 35% 30%, #fde068, #ca8a04)",
              boxShadow: "0 0 24px rgba(202,138,4,0.3)",
            }}
          >
            🎲
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white font-black text-2xl tracking-[0.18em]">BÍ NGÔ</span>
            <span className="font-black text-2xl" style={{ color: "#d4a050" }}>88</span>
          </div>
          <p className="text-sm" style={{ color: "#4a8a5a" }}>Nhập tên của bạn để vào game</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên của bạn..."
            minLength={2}
            maxLength={20}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium outline-none transition-colors"
            style={{
              background: "#0a1e0d",
              color: "#86c988",
              border: "1px solid #1a3d1a",
              caretColor: "#d4a050",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#2a6a32")}
            onBlur={(e) => (e.target.style.borderColor = "#1a3d1a")}
          />
          <button
            type="submit"
            disabled={name.trim().length < 2}
            className="w-full py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-40 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #dbb870, #c9960a)",
              color: "#3d2200",
            }}
          >
            Vào game
          </button>
        </form>
      </div>
    </div>
  );
}
