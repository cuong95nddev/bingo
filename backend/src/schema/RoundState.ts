import { Schema, type, ArraySchema } from "@colyseus/schema";

export type RoundStatus = "betting" | "drawing" | "result";

export class RoundState extends Schema {
  @type("number") id: number = 0;
  @type("string") status: string = "betting";
  @type("number") countdown: number = 30;
  @type(["number"]) numbers = new ArraySchema<number>(); // 3 numbers revealed
}
