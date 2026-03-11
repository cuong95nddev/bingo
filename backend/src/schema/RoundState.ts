import { Schema, type, ArraySchema } from "@colyseus/schema";

export type RoundStatus = "waiting" | "betting" | "drawing" | "result" | "highlight";

export class RoundState extends Schema {
  @type("number") id: number = 0;
  @type("string") status: string = "waiting";
  @type("number") countdown: number = 0;
  @type(["number"]) numbers = new ArraySchema<number>(); // 3 numbers revealed
}
