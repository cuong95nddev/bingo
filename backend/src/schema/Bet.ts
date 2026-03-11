import { Schema, type } from "@colyseus/schema";

export type BetType =
  | "single" | "double" | "triple"
  | "big" | "draw" | "small"
  | "sum";

export class Bet extends Schema {
  @type("string") type: string = "";
  @type("number") value: number = 0;   // số cụ thể (1-6) hoặc tổng (3-18)
  @type("number") amount: number = 0;  // số coins đặt
}
