import { Schema, type } from "@colyseus/schema";

export class GameConfig extends Schema {
  @type("number") startCoins: number = 1000;
  @type("number") minBet: number = 10;
  @type("number") roundDuration: number = 30; // seconds
  @type("boolean") houseFeeEnabled: boolean = false;
  @type("number") houseFeeMin: number = 10;
  @type("number") houseFeeMax: number = 50;
}
