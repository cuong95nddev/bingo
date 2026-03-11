interface Props {
  seconds: number;
  status: string;
}

export function Countdown({ seconds, status }: Props) {
  const isUrgent = seconds <= 10 && status === "betting";
  return (
    <div className={`text-center ${isUrgent ? "animate-pulse" : ""}`}>
      {status === "betting" && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Đặt cược trong</div>
          <div className={`text-5xl font-mono font-bold ${isUrgent ? "text-red-500" : "text-white"}`}>
            {String(seconds).padStart(2, "0")}
          </div>
          <div className="text-xs text-gray-400 mt-1">giây</div>
        </div>
      )}
      {status === "drawing" && (
        <div className="text-yellow-400 text-xl font-bold animate-pulse">
          🎲 Đang quay...
        </div>
      )}
      {status === "result" && (
        <div className="text-green-400 text-xl font-bold">
          ✅ Kết quả
        </div>
      )}
    </div>
  );
}
