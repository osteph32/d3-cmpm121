// The rules of the game. There is no clock here: a command updates the state at
// once, and the events it returns are a record of what happened. Whoever called
// apply() decides how, or whether, to show them over time.

import {
  GATHER_TOOLS,
  isPassable,
  type Terrain,
  TERRAIN_YIELDS,
  terrainAt,
} from "./terrain.ts";
import { type Recipe, RECIPES } from "./recipes.ts";

export type Cell = { x: number; y: number };

export type Direction = "north" | "south" | "east" | "west";

// Plain data that survives JSON: the seed regenerates terrain, so only what
// the player caused is stored (inventory, altered cells, and whether they won).
export type GameState = {
  seed: number;
  player: Cell;
  inventory: Record<string, number>;
  changedCells: Record<string, string | null>;
  won: boolean;
};

// Command: https://gameprogrammingpatterns.com/command.html
// move carries a direction; gather takes none, it acts on the cell under the player.
export type Command =
  | { type: "move"; direction: Direction }
  | { type: "gather" }
  | { type: "craft"; recipe: string };

// Domain Event: https://martinfowler.com/eaaDev/DomainEvent.html
// gathered carries the item name so displays can show it without asking the core.
// gatherFailed carries only the cell, since nothing was produced.
export type GameEvent =
  | { type: "moved"; from: Cell; to: Cell }
  | { type: "blocked"; at: Cell; toward: Cell; terrain: Terrain }
  | {
    type: "gathered";
    at: Cell;
    item: string;
    inventory: Record<string, number>;
  }
  | { type: "gatherFailed"; at: Cell }
  | {
    type: "crafted";
    recipe: string;
    output: string;
    inventory: Record<string, number>;
    won?: true;
  }
  | { type: "craftFailed"; recipe: string; missing: Record<string, number> }
  | { type: "craftMaxed"; recipe: string; output: string };

const STEPS: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// Singleton, avoided on purpose: tests make as many games as they need. https://gameprogrammingpatterns.com/singleton.html
export function newGame(seed: number): GameState {
  return {
    seed,
    player: { x: 0, y: 0 },
    inventory: {},
    changedCells: {},
    won: false,
  };
}

// The single way in. It updates the state it is given and returns the events.
// A won game is over: the core ignores every further command.
export function apply(state: GameState, command: Command): GameEvent[] {
  if (state.won) return [];
  switch (command.type) {
    case "move":
      return move(state, command.direction);
    case "gather":
      return gather(state);
    case "craft":
      return craft(state, command.recipe);
  }
}

function move(state: GameState, direction: Direction): GameEvent[] {
  const step = STEPS[direction];
  // Events are retained and played back later, while state keeps changing. So an
  // event gets cells of its own, never an object that state still holds.
  // Aliasing Bug: https://martinfowler.com/bliki/AliasingBug.html
  // Cells in events act as a Value Object: https://martinfowler.com/bliki/ValueObject.html
  const from = { ...state.player };
  const to = { x: from.x + step.x, y: from.y + step.y };
  const terrain = terrainAt(state.seed, to.x, to.y);
  if (!isPassable(terrain, state.inventory)) {
    return [{ type: "blocked", at: from, toward: to, terrain }];
  }
  state.player.x = to.x;
  state.player.y = to.y;
  return [{ type: "moved", from, to }];
}

// Returns what a cell yields right now. Player changes take priority: after a
// gather the cell's key is in changedCells with value null (depleted). "in"
// detects that even though null is false. Cells the player never touch return the default value. Internal only: apply()
// updates state instantly, so this reflects the final state, not what the view has animated yet
export function cellYield(
  state: GameState,
  x: number,
  y: number,
): string | null {
  const key = `${x},${y}`;
  if (key in state.changedCells) return state.changedCells[key]; // Check whether key exists in changedCells, otherwise fall to terrain table
  return TERRAIN_YIELDS[terrainAt(state.seed, x, y)];
}

// Gather from the cell the player stands on. If the terrain needs a tool the
// player lacks, or cellYield returns null, the cell is depleted or non-yielding,
// so nothing changes.
function gather(state: GameState): GameEvent[] {
  const { x, y } = state.player;
  const tool = GATHER_TOOLS[terrainAt(state.seed, x, y)];
  if (tool !== null && (state.inventory[tool] ?? 0) < 1) {
    return [{ type: "gatherFailed", at: { ...state.player } }];
  }
  const item = cellYield(state, x, y);
  if (item === null) {
    return [{ type: "gatherFailed", at: { ...state.player } }];
  }
  // An item never held reads as undefined, so count from ?? 0.
  state.inventory[item] = (state.inventory[item] ?? 0) + 1;
  state.changedCells[`${x},${y}`] = null;
  return [{
    type: "gathered",
    at: { ...state.player },
    item,
    inventory: { ...state.inventory },
  }];
}

// Specification: what inputs are still needed for a recipe, as data.
// Empty means the recipe is ready to craft.
export function missing(
  inventory: Record<string, number>,
  recipe: Recipe,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [item, need] of Object.entries(recipe.inputs)) {
    const have = inventory[item] ?? 0;
    if (have < need) result[item] = need - have;
  }
  return result;
}

function craft(state: GameState, recipeName: string): GameEvent[] {
  const recipe = RECIPES.find((r) => r.name === recipeName);
  if (!recipe) {
    return [{ type: "craftFailed", recipe: recipeName, missing: {} }];
  }
  // A once-recipe cannot be crafted while the player owns its output.
  if (recipe.once && (state.inventory[recipe.output] ?? 0) > 0) {
    return [{ type: "craftMaxed", recipe: recipeName, output: recipe.output }];
  }
  const lack = missing(state.inventory, recipe);
  if (Object.keys(lack).length > 0) {
    return [{ type: "craftFailed", recipe: recipeName, missing: lack }];
  }
  for (const [item, count] of Object.entries(recipe.inputs)) {
    state.inventory[item] -= count;
    if (state.inventory[item] === 0) delete state.inventory[item];
  }
  state.inventory[recipe.output] = (state.inventory[recipe.output] ?? 0) + 1;
  // Crafting the capstone wins the game; state and the event both report it.
  const won = recipe.wins === true;
  if (won) state.won = true;
  return [{
    type: "crafted",
    recipe: recipeName,
    output: recipe.output,
    inventory: { ...state.inventory },
    ...(won ? { won: true } : {}),
  }];
}
