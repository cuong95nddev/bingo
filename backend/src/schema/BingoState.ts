import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Player } from "./Player";
import { RoundState } from "./RoundState";
import { GameConfig } from "./GameConfig";

export class RoundHistory extends Schema {
  @type("number") id: number = 0;
  @type(["number"]) numbers = new ArraySchema<number>();
  @type("number") timestamp: number = 0;
}

export class BingoState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(RoundState) round = new RoundState();
  @type(GameConfig) config = new GameConfig();
  @type([RoundHistory]) history = new ArraySchema<RoundHistory>();
  @type({ map: "number" }) betPool = new MapSchema<number>();
}
