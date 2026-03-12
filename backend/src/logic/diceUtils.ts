function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}

export function waysToSum(S: number, N: number, dice: number = 3): number {
  let total = 0;
  for (let k = 0; k <= Math.floor((S - dice) / N); k++) {
    const sign = k % 2 === 0 ? 1 : -1;
    total += sign * comb(dice, k) * comb(S - k * N - 1, dice - 1);
  }
  return total;
}

export function computeSumPayouts(diceMax: number): Record<number, number> {
  const totalOutcomes = diceMax ** 3;
  const payouts: Record<number, number> = {};
  for (let s = 3; s <= 3 * diceMax; s++) {
    const ways = waysToSum(s, diceMax);
    if (ways > 0) {
      payouts[s] = Math.max(1, Math.floor((totalOutcomes / ways) * 0.75));
    }
  }
  return payouts;
}

export function computeThresholds(diceMax: number): {
  smallMax: number;
  drawValues: number[];
  bigMin: number;
} {
  const mid = (3 * (diceMax + 1)) / 2;
  if (Number.isInteger(mid)) {
    return {
      smallMax: mid - 1,
      drawValues: [mid],
      bigMin: mid + 1,
    };
  }
  return {
    smallMax: Math.floor(mid) - 1,
    drawValues: [Math.floor(mid), Math.ceil(mid)],
    bigMin: Math.ceil(mid) + 1,
  };
}

export function diceNumbers(diceMax: number): number[] {
  return Array.from({ length: diceMax }, (_, i) => i + 1);
}
