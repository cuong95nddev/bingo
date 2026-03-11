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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
          🎲 Bí Ngô 88
        </h2>
        <p className="text-gray-500 text-center mb-6">Nhập tên của bạn để vào game</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên của bạn..."
            minLength={2}
            maxLength={20}
            className="border-2 border-gray-200 rounded-lg px-4 py-3 text-lg focus:border-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={name.trim().length < 2}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg text-lg transition-colors"
          >
            Vào game
          </button>
        </form>
      </div>
    </div>
  );
}
