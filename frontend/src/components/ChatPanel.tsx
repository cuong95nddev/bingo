
interface Props {
  messages: string[];
}

export function ChatPanel({ messages }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid #1a3d1a" }}>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#3d6a4a" }}>
          Thông báo
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-16 text-[10px]" style={{ color: "#2a4a2a" }}>
            Chưa có thông báo
          </div>
        )}
        {[...messages].reverse().map((msg, i) => (
          <div
            key={i}
            className="px-2.5 py-1.5 rounded-lg text-[11px] leading-relaxed break-words"
            style={{ background: "#0e2e14", border: "1px solid #1a3d1a", color: "#b8d4b8" }}
          >
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}
