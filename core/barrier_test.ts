import { assertEquals } from "@std/assert";
import {
  apply,
  type GameState,
  isPassable,
  newGame,
  terrainAt,
} from "./mod.ts";

const SEED = 121;

function besideTerrainCell(
  targetTerrain: string,
): {
  state: GameState;
  direction: "east" | "west" | "south" | "north";
  target: { x: number; y: number };
} {
  const dirs: [number, number, "east" | "west" | "south" | "north"][] = [
    [1, 0, "east"],
    [-1, 0, "west"],
    [0, 1, "south"],
    [0, -1, "north"],
  ];
  for (let r = 0; r < 500; r++) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (!isPassable(terrainAt(SEED, x, y), {})) continue;
        for (const [dx, dy, dir] of dirs) {
          if (terrainAt(SEED, x + dx, y + dy) === targetTerrain) {
            const state = newGame(SEED);
            state.player = { x, y };
            return { state, direction: dir, target: { x: x + dx, y: y + dy } };
          }
        }
      }
    }
  }
  throw new Error("No suitable cell found near the origin.");
}

Deno.test("rock blocks movement without pickaxe", () => {
  const { state, direction, target } = besideTerrainCell("rock");
  const { x, y } = state.player;

  const events = apply(state, { type: "move", direction });

  assertEquals(state.player, { x, y });
  assertEquals(events, [{
    type: "blocked",
    at: { x, y },
    toward: target,
    terrain: "rock",
  }]);
});

Deno.test("pickaxe opens rock for movement", () => {
  const { state, direction } = besideTerrainCell("rock");

  state.inventory.pickaxe = 1;
  const events = apply(state, { type: "move", direction });

  assertEquals(events[0].type, "moved");
});

Deno.test("gathering on rock yields stone with pickaxe", () => {
  for (let r = 0; r < 500; r++) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (terrainAt(SEED, x, y) === "rock") {
          const state = newGame(SEED);
          state.player = { x, y };
          state.inventory.pickaxe = 1;

          const events = apply(state, { type: "gather" });

          assertEquals(events, [{
            type: "gathered",
            at: { x, y },
            item: "stone",
            inventory: { pickaxe: 1, stone: 1 },
          }]);
          return;
        }
      }
    }
  }
  throw new Error("No rock cell found near the origin.");
});
