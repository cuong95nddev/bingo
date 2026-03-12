export interface GamePlayer {
  id: string;
  name: string;
  coins: number;
  lastWin: number;
  bets: GameBet[];
}

export interface GameBet {
  type: string;
  value: number;
  amount: number;
}

export interface GameRound {
  id: number;
  status: "waiting" | "betting" | "drawing" | "result" | "highlight" | "finished";
  countdown: number;
  numbers: number[];
}

export interface GameConfig {
  startCoins: number;
  minBet: number;
  roundDuration: number;
  maxRounds: number;
  diceMax: number;
}

export interface GameState {
  players: Map<string, GamePlayer>;
  round: GameRound;
  config: GameConfig;
  history: Array<{ id: number; numbers: number[]; timestamp: number }>;
  mySessionId: string;
}
