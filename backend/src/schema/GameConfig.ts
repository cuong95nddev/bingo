import { Schema, type } from "@colyseus/schema";

export class GameConfig extends Schema {
  @type("number") startCoins: number = 1000;
  @type("number") minBet: number = 10;
  @type("number") roundDuration: number = 30; // seconds
  @type("boolean") houseFeeEnabled: boolean = false;
  @type("number") houseFeeMin: number = 10;
  @type("number") houseFeeMax: number = 50;
  @type("boolean") hackerEnabled: boolean = false;
  @type("number") hackerChance: number = 20;
  @type("number") hackerMin: number = 50;
  @type("number") hackerMax: number = 300;
  @type("boolean") jackpotEnabled: boolean = false;
  @type("number") jackpotChance: number = 15;
  @type("number") jackpotMin: number = 500;
  @type("number") jackpotMax: number = 2000;
  @type("number") maxRounds: number = 0;
  @type("number") diceMax: number = 6;
}
