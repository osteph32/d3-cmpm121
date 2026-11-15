import { assertEquals } from "@std/assert";
import {
  apply,
  type Direction,
  type GameState,
  isPassable,
  newGame,
  terrainAt,
} from "./mod.ts";

const SEED = 121;

// A passable-with-nothing cell beside the target terrain, plus the direction
// toward it, so a move command tests the barrier directly.
function beside(
  target: string,
): { state: GameState; direction: Direction } {
  const dirs: [number, number, Direction][] = [
    [1, 0, "east"],
    [-1, 0, "west"],
    [0, 1, "south"],
    [0, -1, "north"],
  ];
  for (let r = 0; r < 500; r++) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (!isPassable(terrainAt(SEED, x, y), {})) continue;
        for (const [dx, dy, direction] of dirs) {
          if (terrainAt(SEED, x + dx, y + dy) === target) {
            const state = newGame(SEED);
            state.player = { x, y };
            return { state, direction };
          }
        }
      }
    }
  }
  throw new Error(`No cell beside ${target} found near the origin.`);
}

Deno.test("rock is shut before crafting a pickaxe and open after", () => {
  const { state, direction } = beside("rock");

  assertEquals(apply(state, { type: "move", direction })[0].type, "blocked");

  // Craft the opener through apply, then the same move succeeds.
  state.inventory.plank = 2;
  state.inventory.fiber = 1;
  state.inventory.wood = 3;
  apply(state, { type: "craft", recipe: "pickaxe" });

  assertEquals(apply(state, { type: "move", direction })[0].type, "moved");
});

Deno.test("water is shut before crafting a boat and open after", () => {
  const { state, direction } = beside("water");

  assertEquals(apply(state, { type: "move", direction })[0].type, "blocked");

  state.inventory.plank = 6;
  apply(state, { type: "craft", recipe: "boat" });

  assertEquals(apply(state, { type: "move", direction })[0].type, "moved");
});
