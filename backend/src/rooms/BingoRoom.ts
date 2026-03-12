import { Room, Client } from "@colyseus/core";
import { BingoState, RoundHistory } from "../schema/BingoState";
import { Player } from "../schema/Player";
import { Bet } from "../schema/Bet";
import { ArraySchema } from "@colyseus/schema";
import { applyBets } from "../logic/payouts";

const DRAWING_DELAY = 1000; // 3s per number reveal
const RESULT_DISPLAY = 3000; // 5s show result
const HIGHLIGHT_DISPLAY = 3000; // 5s show win highlights

function betLabel(type: string, value: number): string {
  switch (type) {
    case "single": return `Đơn ${value}`;
    case "double": return `Đôi ${value}`;
    case "triple": return value === 0 ? "Ba bất kỳ" : `Ba ${value}`;
    case "big":    return "Lớn";
    case "small":  return "Nhỏ";
    case "draw":   return "Hòa";
    case "sum":    return `Tổng ${value}`;
    default:       return type;
  }
}

export class BingoRoom extends Room {
  state = new BingoState();
  private roundTimer?: NodeJS.Timeout;
  private roundId = 0;

  onCreate(_options: { adminPassword?: string }) {
    this.autoDispose = false;
    this.seatReservationTimeout = 20;

    // Allow admin to update config via message
    this.onMessage("adminUpdateConfig", (client, data) => {
      const adminPwd = process.env.ADMIN_PASSWORD || "admin123";
      if (data.password !== adminPwd) return;
      if (data.startCoins != null) this.state.config.startCoins = data.startCoins;
      if (data.minBet != null) this.state.config.minBet = data.minBet;
      if (data.roundDuration != null) this.state.config.roundDuration = data.roundDuration;
      if (data.houseFeeEnabled != null) this.state.config.houseFeeEnabled = data.houseFeeEnabled;
      if (data.houseFeeMin != null) this.state.config.houseFeeMin = data.houseFeeMin;
      if (data.houseFeeMax != null) this.state.config.houseFeeMax = data.houseFeeMax;
      if (data.hackerEnabled != null) this.state.config.hackerEnabled = data.hackerEnabled;
      if (data.hackerChance != null) this.state.config.hackerChance = Math.max(0, Math.min(100, Number(data.hackerChance)));
      if (data.hackerMin != null) this.state.config.hackerMin = data.hackerMin;
      if (data.hackerMax != null) this.state.config.hackerMax = data.hackerMax;
      if (data.jackpotEnabled != null) this.state.config.jackpotEnabled = data.jackpotEnabled;
      if (data.jackpotChance != null) this.state.config.jackpotChance = Math.max(0, Math.min(100, Number(data.jackpotChance)));
      if (data.jackpotMin != null) this.state.config.jackpotMin = data.jackpotMin;
      if (data.jackpotMax != null) this.state.config.jackpotMax = data.jackpotMax;
      if (data.maxRounds != null) this.state.config.maxRounds = data.maxRounds;
      if (data.diceMax != null) this.state.config.diceMax = Math.max(2, Math.min(6, Number(data.diceMax)));
    });

    this.onMessage("placeBet", (client, data: { type: string; value: number; amount: number }) => {
      if (this.state.round.status !== "betting") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const amount = Math.floor(data.amount);
      if (amount < this.state.config.minBet) return;
      if (player.coins < amount) return;

      const dMax = this.state.config.diceMax;
      if ((data.type === "single" || data.type === "double") && (data.value < 1 || data.value > dMax)) return;
      if (data.type === "triple" && data.value !== 0 && (data.value < 1 || data.value > dMax)) return;
      if (data.type === "sum" && (data.value < 3 || data.value > 3 * dMax)) return;

      const bet = new Bet();
      bet.type = data.type;
      bet.value = data.value;
      bet.amount = amount;
      player.bets.push(bet);
      player.coins -= amount;

      this.broadcast("ticker", `${player.name} cược ${amount.toLocaleString("vi-VN")} ngô → ${betLabel(data.type, data.value)}`);
    });

    this.onMessage("clearBets", (client) => {
      if (this.state.round.status !== "betting") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      for (const bet of player.bets) {
        player.coins += bet.amount;
      }
      player.bets = new ArraySchema<Bet>();
    });
  }

  private adminSessions = new Set<string>();

  onJoin(client: Client, options: { name: string; visitorId: string; admin?: boolean; password?: string }) {
    if (options.admin) {
      const adminPwd = process.env.ADMIN_PASSWORD || "admin123";
      if (options.password !== adminPwd) {
        client.leave(4001);
        return;
      }
      this.adminSessions.add(client.sessionId);
      return;
    }

    // Check if player already exists (reconnect by visitorId)
    let existing: Player | undefined;
    this.state.players.forEach((p) => {
      if (p.id === options.visitorId) existing = p;
    });

    if (existing) {
      // Remove old sessionId entry, remap to new session
      this.state.players.forEach((_p, key) => {
        if (_p === existing) this.state.players.delete(key);
      });
      this.state.players.set(client.sessionId, existing);
    } else {
      const player = new Player();
      player.id = options.visitorId;
      player.name = options.name || "Player";
      player.coins = this.state.config.startCoins;
      this.state.players.set(client.sessionId, player);
    }
  }

  onLeave(client: Client, _code?: number) {
    this.adminSessions.delete(client.sessionId);
    // Keep player state for reconnect — do NOT delete
  }

  startGame(): boolean {
    if (this.state.round.status !== "waiting") return false;
    this.state.players.forEach((player) => {
      player.coins = this.state.config.startCoins;
      player.lastWin = 0;
      player.bets = new ArraySchema<Bet>();
    });
    this.startBettingPhase();
    return true;
  }

  resetGame(): void {
    if (this.roundTimer) {
      clearInterval(this.roundTimer);
      clearTimeout(this.roundTimer);
      this.roundTimer = undefined;
    }
    this.roundId = 0;
    this.state.round.status = "waiting";
    this.state.round.countdown = 0;
    this.state.round.numbers.clear();
    this.state.round.id = 0;
    this.state.history.clear();
    this.state.players.forEach((player) => {
      player.coins = this.state.config.startCoins;
      player.lastWin = 0;
      player.bets = new ArraySchema<Bet>();
    });
  }

  private startBettingPhase() {
    this.state.round.status = "betting";
    this.state.round.countdown = this.state.config.roundDuration;
    this.state.round.numbers.clear();
    this.state.round.id = ++this.roundId;

    const duration = this.state.config.roundDuration;
    const hackerAt = this.state.config.hackerEnabled && Math.random() * 100 < this.state.config.hackerChance
      ? 1 + Math.floor(Math.random() * duration) : -1;
    const jackpotAt = this.state.config.jackpotEnabled && Math.random() * 100 < this.state.config.jackpotChance
      ? 1 + Math.floor(Math.random() * duration) : -1;

    // Countdown tick every second
    let remaining = duration;
    let tick = 0;
    this.roundTimer = setInterval(() => {
      remaining--;
      tick++;
      this.state.round.countdown = remaining;
      if (tick === hackerAt) this.triggerHacker();
      if (tick === jackpotAt) this.triggerJackpot();
      if (remaining <= 0) {
        clearInterval(this.roundTimer);
        this.startDrawingPhase();
      }
    }, 1000);
  }

  private async startDrawingPhase() {
    this.state.round.status = "drawing";
    const diceMax = this.state.config.diceMax;
    const numbers = [
      Math.ceil(Math.random() * diceMax),
      Math.ceil(Math.random() * diceMax),
      Math.ceil(Math.random() * diceMax),
    ];

    // Reveal numbers one by one
    for (const n of numbers) {
      await this.delay(DRAWING_DELAY);
      this.state.round.numbers.push(n);
    }

    await this.delay(1000);
    this.startResultPhase(numbers);
  }

  private startResultPhase(numbers: number[]) {
    this.state.round.status = "result";

    const { houseFeeEnabled, houseFeeMin, houseFeeMax } = this.state.config;

    // Calculate wins/losses for each player and broadcast ticker events
    this.state.players.forEach((player) => {
      const hasBets = player.bets.length > 0;
      const delta = applyBets([...player.bets].filter((b): b is Bet => b !== undefined), numbers, this.state.config.diceMax);

      if (!hasBets && houseFeeEnabled && player.coins > 0) {
        const range = Math.max(1, houseFeeMax - houseFeeMin);
        const fee = Math.min(player.coins, houseFeeMin + Math.floor(Math.random() * (range + 1)));
        player.coins = Math.max(0, player.coins - fee);
        player.lastWin = -fee;
        player.bets = new ArraySchema<Bet>();
        this.broadcast("ticker", `🏦 ${player.name} bị thu phí ${fee.toLocaleString("vi-VN")} ngô (không cược)`);
        return;
      }

      player.coins = Math.max(0, player.coins + delta);
      player.lastWin = delta;
      player.bets = new ArraySchema<Bet>();

      if (delta > 0) {
        this.broadcast("ticker", `★ ${player.name} THẮNG +${delta.toLocaleString("vi-VN")} ngô`);
      } else if (delta < 0) {
        this.broadcast("ticker", `✗ ${player.name} thua ${delta.toLocaleString("vi-VN")} ngô`);
      }
    });

    // Save to history (keep last 50)
    const hist = new RoundHistory();
    hist.id = this.roundId;
    hist.numbers.push(...numbers);
    hist.timestamp = Date.now();
    this.state.history.push(hist);
    if (this.state.history.length > 50) {
      this.state.history.splice(0, 1);
    }

    // After result display, move to highlight phase
    this.roundTimer = setTimeout(() => {
      this.state.round.status = "highlight";
      this.roundTimer = setTimeout(() => {
        const maxRounds = this.state.config.maxRounds;
        if (maxRounds > 0 && this.roundId >= maxRounds) {
          this.state.round.status = "finished";
        } else {
          this.startBettingPhase();
        }
      }, HIGHLIGHT_DISPLAY);
    }, RESULT_DISPLAY);
  }

  triggerHacker(min?: number, max?: number): { victimCount: number; playerCount: number } | null {
    const hackerMin = Math.max(0, min ?? this.state.config.hackerMin);
    const hackerMax = Math.max(hackerMin, max ?? this.state.config.hackerMax);
    const allKeys: string[] = [];
    this.state.players.forEach((_p, key) => allKeys.push(key));
    const count = allKeys.length;
    if (count === 0) return null;
    const shuffled = allKeys.sort(() => Math.random() - 0.5);
    const targetCount = Math.floor(count / 2) + 1 + Math.floor(Math.random() * Math.ceil(count / 2));
    const victims = shuffled.slice(0, Math.min(targetCount, count));
    const stolen: { name: string; amount: number }[] = [];
    victims.forEach((key) => {
      const p = this.state.players.get(key);
      if (!p) return;
      const fee = hackerMin + Math.floor(Math.random() * (hackerMax - hackerMin + 1));
      const actual = Math.min(p.coins, fee);
      p.coins = Math.max(0, p.coins - actual);
      if (actual > 0) stolen.push({ name: p.name, amount: actual });
    });
    this.broadcast("hacker", { victims: stolen });
    return { victimCount: stolen.length, playerCount: count };
  }

  triggerJackpot(min?: number, max?: number): { total: number; perPlayer: number; playerCount: number } | null {
    const jackpotMin = Math.max(0, min ?? this.state.config.jackpotMin);
    const jackpotMax = Math.max(jackpotMin, max ?? this.state.config.jackpotMax);
    const total = jackpotMin + Math.floor(Math.random() * (jackpotMax - jackpotMin + 1));
    const players: string[] = [];
    this.state.players.forEach((_p, key) => players.push(key));
    const count = players.length;
    if (count === 0) return null;
    const perPlayer = Math.floor(total / count);
    this.state.players.forEach((p) => { p.coins += perPlayer; });
    this.broadcast("jackpot", { total, perPlayer, playerCount: count });
    return { total, perPlayer, playerCount: count };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
