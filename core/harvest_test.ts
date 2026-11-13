import { assertEquals } from "@std/assert";
import {
  apply,
  cellYield,
  type GameState,
  isPassable,
  newGame,
  TERRAIN_YIELDS,
  terrainAt,
} from "./mod.ts";

const SEED = 121;

// Finds the nearest passable cell whose terrain yields an item, searching
// outward as besideEasternCell searches along a row.
function findYieldingCell(
  seed: number,
): { x: number; y: number; item: string } {
  for (let r = 0; r < 500; r++) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const terrain = terrainAt(seed, x, y);
        const item = TERRAIN_YIELDS[terrain];
        if (item !== null) return { x, y, item };
      }
    }
  }
  throw new Error("No yielding cell found near the origin.");
}

// Places the player on a cell that yields an item.
function onYieldingCell(): { state: GameState; item: string } {
  const { x, y, item } = findYieldingCell(SEED);
  const state = newGame(SEED);
  state.player = { x, y };
  return { state, item };
}

Deno.test("gathering from a yielding cell adds the item to inventory", () => {
  const { state, item } = onYieldingCell();
  const { x, y } = state.player;

  // A successful gather returns a gathered event with the item name,
  // and the inventory count for that item becomes 1.
  const events = apply(state, { type: "gather" });

  assertEquals(events, [{
    type: "gathered",
    at: { x, y },
    item,
    inventory: { [item]: 1 },
  }]);
  assertEquals(state.inventory[item], 1);
});

Deno.test("gathering twice from one cell gives nothing the second time", () => {
  const { state, item } = onYieldingCell();
  const { x, y } = state.player;

  // First gather succeeds; second returns gatherFailed because the cell
  // was marked depleted in changedCells. Inventory stays at 1, not 2.
  const first = apply(state, { type: "gather" });
  const second = apply(state, { type: "gather" });

  assertEquals(first, [{
    type: "gathered",
    at: { x, y },
    item,
    inventory: { [item]: 1 },
  }]);
  assertEquals(second, [{ type: "gatherFailed", at: { x, y } }]);
  assertEquals(state.inventory[item], 1);
});

Deno.test("a failed gather changes nothing", () => {
  const { state } = onYieldingCell();
  // Deplete the cell first so the next gather fails.
  apply(state, { type: "gather" });
  // Snapshot via JSON so deep equality catches any mutation.
  const snapshot = JSON.parse(JSON.stringify(state));
  const { x, y } = state.player;

  const events = apply(state, { type: "gather" });

  assertEquals(state, snapshot);
  assertEquals(events, [{ type: "gatherFailed", at: { x, y } }]);
});

Deno.test("saved state holds only the cells that changed", () => {
  const { state } = onYieldingCell();
  const { x, y } = state.player;

  // After one gather, changedCells should have exactly one key,
  // mapped to null (depleted).
  apply(state, { type: "gather" });

  assertEquals(Object.keys(state.changedCells).length, 1);
  assertEquals(state.changedCells[`${x},${y}`], null);
});

Deno.test("cellYield reports null on a depleted cell", () => {
  const { state, item } = onYieldingCell();
  const { x, y } = state.player;

  // Before gathering: the cell yields its terrain's item.
  assertEquals(cellYield(state, x, y), item);

  // After gathering: changedCells marks it null, so cellYield returns null.
  apply(state, { type: "gather" });

  assertEquals(cellYield(state, x, y), null);
});

Deno.test("a gathered event keeps its inventory while state gathers on", () => {
  const { x, y, item } = findYieldingCell(SEED);
  const state = newGame(SEED);
  state.player = { x, y };
  // Gather at the first yielding cell, then walk to a second and gather again.
  const first = apply(state, { type: "gather" });
  // Find a different yielding cell and move there.
  const second = findSecondYieldingCell(SEED, x, y);
  for (let step = 0; step < Math.abs(second.x - state.player.x); step++) {
    apply(state, {
      type: "move",
      direction: second.x > state.player.x ? "east" : "west",
    });
  }
  for (let step = 0; step < Math.abs(second.y - state.player.y); step++) {
    apply(state, {
      type: "move",
      direction: second.y > state.player.y ? "south" : "north",
    });
  }
  apply(state, { type: "gather" });
  // The first event's inventory snapshot is still { item: 1 }, even though
  // state.inventory now has two items (or the same item at count 2).
  assertEquals(first, [{
    type: "gathered",
    at: { x, y },
    item,
    inventory: { [item]: 1 },
  }]);
});

function findSecondYieldingCell(
  seed: number,
  skipX: number,
  skipY: number,
): { x: number; y: number; item: string } {
  for (let r = 0; r < 500; r++) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x === skipX && y === skipY) continue;
        const terrain = terrainAt(seed, x, y);
        if (!isPassable(terrain)) continue;
        const item = TERRAIN_YIELDS[terrain];
        if (item !== null) return { x, y, item };
      }
    }
  }
  throw new Error("No second yielding cell found near the origin.");
}
