import { assertEquals } from "@std/assert";
import {
  apply,
  cellYield,
  type GameState,
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

  assertEquals(events, [{ type: "gathered", at: { x, y }, item }]);
  assertEquals(state.inventory[item], 1);
});

Deno.test("gathering twice from one cell gives nothing the second time", () => {
  const { state, item } = onYieldingCell();
  const { x, y } = state.player;

  // First gather succeeds; second returns gatherFailed because the cell
  // was marked depleted in changedCells. Inventory stays at 1, not 2.
  const first = apply(state, { type: "gather" });
  const second = apply(state, { type: "gather" });

  assertEquals(first, [{ type: "gathered", at: { x, y }, item }]);
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
