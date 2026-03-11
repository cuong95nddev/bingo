import { Bet } from "../schema/Bet";

/**
 * Tính multiplier cho 1 bet dựa trên kết quả quay.
 * Return: số tiền thắng (không tính tiền gốc), hoặc -amount nếu thua.
 */
export function calculateWin(bet: Bet, numbers: number[]): number {
  const counts: Record<number, number> = {};
  for (const n of numbers) {
    counts[n] = (counts[n] || 0) + 1;
  }
  const sum = numbers.reduce((a, b) => a + b, 0);

  switch (bet.type) {
    case "single": {
      // Thắng nếu số xuất hiện trong 3 số (1:1)
      if (counts[bet.value] && counts[bet.value] >= 1) {
        return bet.amount * 1;
      }
      return -bet.amount;
    }
    case "double": {
      // Thắng nếu số xuất hiện ≥ 2 lần (5:1)
      if (counts[bet.value] && counts[bet.value] >= 2) {
        return bet.amount * 5;
      }
      return -bet.amount;
    }
    case "triple": {
      // Thắng nếu số xuất hiện đúng 3 lần (20:1)
      if (counts[bet.value] && counts[bet.value] === 3) {
        return bet.amount * 20;
      }
      return -bet.amount;
    }
    case "big": {
      // Tổng ≥ 12 (1:1), nhưng triple giải trừ
      const isTriple = Object.values(counts).some(c => c === 3);
      if (!isTriple && sum >= 12) return bet.amount * 1;
      return -bet.amount;
    }
    case "small": {
      // Tổng ≤ 9 (1:1), nhưng triple giải trừ
      const isTriple = Object.values(counts).some(c => c === 3);
      if (!isTriple && sum <= 9) return bet.amount * 1;
      return -bet.amount;
    }
    case "draw": {
      // Tổng = 10 hoặc 11 (3:1)
      if (sum === 10 || sum === 11) return bet.amount * 3;
      return -bet.amount;
    }
    case "sum": {
      // Tổng chính xác (bet.value là tổng cần)
      // Tỷ lệ theo Vietlott: tổng 4,17 = 50:1; 5,16 = 18:1; 6,15 = 14:1
      // 7,14 = 12:1; 8,13 = 8:1; 9,12 = 6:1; 10,11 = 6:1
      const sumPayouts: Record<number, number> = {
        4: 50, 17: 50,
        5: 18, 16: 18,
        6: 14, 15: 14,
        7: 12, 14: 12,
        8: 8,  13: 8,
        9: 6,  12: 6,
        10: 6, 11: 6,
      };
      if (sum === bet.value && sumPayouts[sum]) {
        return bet.amount * sumPayouts[sum];
      }
      return -bet.amount;
    }
    default:
      return -bet.amount;
  }
}

/**
 * Áp dụng tất cả bets của 1 player, trả về tổng coins thay đổi
 */
export function applyBets(bets: Bet[], numbers: number[]): number {
  return bets.reduce((total, bet) => total + calculateWin(bet, numbers), 0);
}
