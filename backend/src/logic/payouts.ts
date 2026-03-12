import { Bet } from "../schema/Bet";
import { computeSumPayouts, computeThresholds } from "./diceUtils";

export function calculateWin(bet: Bet, numbers: number[], diceMax: number = 6): number {
  const counts: Record<number, number> = {};
  for (const n of numbers) {
    counts[n] = (counts[n] || 0) + 1;
  }
  const sum = numbers.reduce((a, b) => a + b, 0);
  const thresholds = computeThresholds(diceMax);

  switch (bet.type) {
    case "single": {
      if (counts[bet.value] && counts[bet.value] >= 1) {
        return bet.amount * 1;
      }
      return -bet.amount;
    }
    case "double": {
      if (counts[bet.value] && counts[bet.value] >= 2) {
        return bet.amount * 5;
      }
      return -bet.amount;
    }
    case "triple": {
      if (counts[bet.value] && counts[bet.value] === 3) {
        return bet.amount * 20;
      }
      return -bet.amount;
    }
    case "big": {
      const isTriple = Object.values(counts).some(c => c === 3);
      if (!isTriple && sum >= thresholds.bigMin) return bet.amount * 1;
      return -bet.amount;
    }
    case "small": {
      const isTriple = Object.values(counts).some(c => c === 3);
      if (!isTriple && sum <= thresholds.smallMax) return bet.amount * 1;
      return -bet.amount;
    }
    case "draw": {
      if (thresholds.drawValues.includes(sum)) return bet.amount * 3;
      return -bet.amount;
    }
    case "sum": {
      const sumPayouts = computeSumPayouts(diceMax);
      if (sum === bet.value && sumPayouts[sum]) {
        return bet.amount * sumPayouts[sum];
      }
      return -bet.amount;
    }
    default:
      return -bet.amount;
  }
}

export function applyBets(bets: Bet[], numbers: number[], diceMax: number = 6): number {
  return bets.reduce((total, bet) => total + calculateWin(bet, numbers, diceMax), 0);
}
