import { Room, Client } from "@colyseus/core";
import { BingoState, RoundHistory } from "../schema/BingoState";
import { Player } from "../schema/Player";
import { Bet } from "../schema/Bet";
import { ArraySchema } from "@colyseus/schema";
import { applyBets } from "../logic/payouts";

const DRAWING_DELAY = 3000; // 3s per number reveal
const RESULT_DISPLAY = 5000; // 5s show result

export class BingoRoom extends Room<BingoState> {
  private roundTimer?: NodeJS.Timeout;
  private roundId = 0;

  onCreate(options: { adminPassword?: string }) {
    this.setState(new BingoState());
    this.startBettingPhase();

    // Allow admin to update config via message
    this.onMessage("adminUpdateConfig", (client, data) => {
      const adminPwd = process.env.ADMIN_PASSWORD || "admin123";
      if (data.password !== adminPwd) return;
      if (data.startCoins != null) this.state.config.startCoins = data.startCoins;
      if (data.minBet != null) this.state.config.minBet = data.minBet;
      if (data.roundDuration != null) this.state.config.roundDuration = data.roundDuration;
    });

    this.onMessage("placeBet", (client, data: { type: string; value: number; amount: number }) => {
      if (this.state.round.status !== "betting") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const amount = Math.floor(data.amount);
      if (amount < this.state.config.minBet) return;
      if (player.coins < amount) return;

      const bet = new Bet();
      bet.type = data.type;
      bet.value = data.value;
      bet.amount = amount;
      player.bets.push(bet);
      player.coins -= amount;
    });

    this.onMessage("clearBets", (client) => {
      if (this.state.round.status !== "betting") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      // Refund all bets
      for (const bet of player.bets) {
        player.coins += bet.amount;
      }
      player.bets = new ArraySchema<Bet>();
    });
  }

  onJoin(client: Client, options: { name: string; visitorId: string }) {
    // Check if player already exists (reconnect by visitorId)
    let existing: Player | undefined;
    this.state.players.forEach((p) => {
      if (p.id === options.visitorId) existing = p;
    });

    if (existing) {
      // Reassign sessionId mapping
      this.state.players.delete(client.sessionId);
      this.state.players.set(client.sessionId, existing);
    } else {
      const player = new Player();
      player.id = options.visitorId;
      player.name = options.name || "Player";
      player.coins = this.state.config.startCoins;
      this.state.players.set(client.sessionId, player);
    }
  }

  onLeave(_client: Client, _consented: boolean) {
    // Keep player state for reconnect — do NOT delete
  }

  private startBettingPhase() {
    this.state.round.status = "betting";
    this.state.round.countdown = this.state.config.roundDuration;
    this.state.round.numbers.clear();
    this.state.round.id = ++this.roundId;

    // Countdown tick every second
    let remaining = this.state.config.roundDuration;
    this.roundTimer = setInterval(() => {
      remaining--;
      this.state.round.countdown = remaining;
      if (remaining <= 0) {
        clearInterval(this.roundTimer);
        this.startDrawingPhase();
      }
    }, 1000);
  }

  private async startDrawingPhase() {
    this.state.round.status = "drawing";
    const numbers = [
      Math.ceil(Math.random() * 6),
      Math.ceil(Math.random() * 6),
      Math.ceil(Math.random() * 6),
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

    // Calculate wins/losses for each player
    this.state.players.forEach((player) => {
      const delta = applyBets([...player.bets].filter((b): b is Bet => b !== undefined), numbers);
      player.coins = Math.max(0, player.coins + delta);
      player.lastWin = delta;
      player.bets = new ArraySchema<Bet>(); // clear bets
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

    // After result display, start next round
    this.roundTimer = setTimeout(() => {
      this.startBettingPhase();
    }, RESULT_DISPLAY);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
