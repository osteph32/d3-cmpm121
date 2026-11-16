import { assertEquals } from "@std/assert";
import { apply, type Command, type GameEvent, newGame } from "./mod.ts";
import run from "./run.json" with { type: "json" };

function replay() {
  const state = newGame(run.seed);
  const events: GameEvent[] = [];

  for (const command of run.commands as Command[]) {
    events.push(...apply(state, command));
  }

  return { state, events };
}

Deno.test("the recorded expedition wins and replays identically", () => {
  const first = replay();

  assertEquals(first.state.won, true);
  assertEquals(first.events.at(-1)?.type, "won");

  const firstTick = Date.now();
  while (Date.now() === firstTick) {
    // Wait one tick before next replay
  }

  const second = replay();
  assertEquals(second.state, first.state);
  assertEquals(second.events, first.events);
});
