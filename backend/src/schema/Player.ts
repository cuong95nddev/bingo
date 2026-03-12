import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Bet } from "./Bet";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("number") coins: number = 0;
  @type([Bet]) bets = new ArraySchema<Bet>();
  @type("number") lastWin: number = 0;  // coins won/lost last round
  @type("boolean") online: boolean = true;
}
