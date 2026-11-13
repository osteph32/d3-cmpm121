// The rules of the game. There is no clock here: a command updates the state at
// once, and the events it returns are a record of what happened. Whoever called
// apply() decides how, or whether, to show them over time.

import {
  isPassable,
  type Terrain,
  TERRAIN_YIELDS,
  terrainAt,
} from "./terrain.ts";

export type Cell = { x: number; y: number };

export type Direction = "north" | "south" | "east" | "west";

// Plain data that survives JSON. Terrain is absent because the seed can recompute
// it: besides the seed, only what the player has caused belongs here. Inventory
// counts items by name (a plain string, not a union, so step 3 can add kinds
// freely). changedCells stores only the cells the player has altered, keyed by
// "x,y", so saved state stays small and a plain object survives JSON.
export type GameState = {
  seed: number;
  player: Cell;
  inventory: Record<string, number>;
  changedCells: Record<string, string | null>;
};

// Command: https://gameprogrammingpatterns.com/command.html
// move carries a direction; gather takes none, it acts on the cell under the player.
export type Command =
  | { type: "move"; direction: Direction }
  | { type: "gather" };

// Domain Event: https://martinfowler.com/eaaDev/DomainEvent.html
// gathered carries the item name so displays can show it without asking the core.
// gatherFailed carries only the cell, since nothing was produced.
export type GameEvent =
  | { type: "moved"; from: Cell; to: Cell }
  | { type: "blocked"; at: Cell; toward: Cell; terrain: Terrain }
  | { type: "gathered"; at: Cell; item: string }
  | { type: "gatherFailed"; at: Cell };

const STEPS: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// Singleton, avoided on purpose: tests make as many games as they need. https://gameprogrammingpatterns.com/singleton.html
export function newGame(seed: number): GameState {
  return { seed, player: { x: 0, y: 0 }, inventory: {}, changedCells: {} };
}

// The single way in. It updates the state it is given and returns the events.
export function apply(state: GameState, command: Command): GameEvent[] {
  switch (command.type) {
    case "move":
      return move(state, command.direction);
    case "gather":
      return gather(state);
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
  if (!isPassable(terrain)) {
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

// Gather from the cell the player stands on. If cellYield returns null, the cell
// is depleted or non-yielding, so nothing changes.
function gather(state: GameState): GameEvent[] {
  const { x, y } = state.player;
  const item = cellYield(state, x, y);
  if (item === null) {
    return [{ type: "gatherFailed", at: { ...state.player } }];
  }
  // An item never held reads as undefined, so count from ?? 0.
  state.inventory[item] = (state.inventory[item] ?? 0) + 1; // Increment the count of that item in the player's inventory.
  state.changedCells[`${x},${y}`] = null; // Add cell to changedCells with value null to indicate it has been depleted
  return [{ type: "gathered", at: { ...state.player }, item }];
}
