import { assertEquals } from "@std/assert";
import {
  apply,
  type Command,
  type Direction,
  type GameEvent,
  newGame,
} from "./mod.ts";

function commands(): Command[] {
  const walk: Direction[] = ["east", "east", "south", "south", "west", "north"];
  // A long enough walk to bump into terrain as well as cross it.
  return Array.from({ length: 300 }, (_, i) => ({
    type: "move",
    direction: walk[(i * i + i) % walk.length],
  }));
}

function play(seed: number) {
  const state = newGame(seed);
  const events: GameEvent[] = [];
  for (const command of commands()) {
    events.push(...apply(state, command));
  }
  return { state, events };
}

Deno.test("same seed and commands give identical state and events", () => {
  const first = play(121);
  // Let the clock tick, so that a stored timestamp cannot match by luck.
  const start = Date.now();
  while (Date.now() === start);
  const second = play(121);

  assertEquals(first, second);
});

Deno.test("state and events survive a trip through JSON", () => {
  const played = play(121);

  assertEquals(JSON.parse(JSON.stringify(played)), played);
});
