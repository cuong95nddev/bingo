const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

interface Props {
  numbers: number[];
  status: string;
}

export function DiceResult({ numbers, status }: Props) {
  return (
    <div className="flex gap-4 justify-center items-center min-h-[80px]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`text-6xl transition-all duration-500 ${
            numbers[i]
              ? "opacity-100 scale-100"
              : status === "drawing"
              ? "opacity-30 animate-spin text-4xl"
              : "opacity-20"
          }`}
        >
          {numbers[i] ? DICE_FACES[numbers[i]] : "🎲"}
        </div>
      ))}
      {numbers.length === 3 && (
        <div className="text-gray-300 text-lg ml-4">
          Tổng: <span className="text-white font-bold text-xl">
            {numbers.reduce((a, b) => a + b, 0)}
          </span>
        </div>
      )}
    </div>
  );
}
