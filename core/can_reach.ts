import { type Recipe } from "./recipes.ts";
import { isPassable, OPENS, type Terrain, TERRAIN_YIELDS } from "./terrain.ts";

// Fixpoint algorithm: what recipes can the player ever complete?
// Returns the set of recipe names that CAN be reached.
// Takes recipes as a parameter so it can be fed a broken table.
export function canReach(recipes: Recipe[]): Set<string> {
  const terrains = Object.keys(TERRAIN_YIELDS) as Terrain[];

  // items reachable from terrains passable with nothing crafted.
  const reached = new Set<string>();
  for (const terrain of terrains) {
    if (isPassable(terrain, {})) {
      const yield_ = TERRAIN_YIELDS[terrain];
      if (yield_ !== null) reached.add(yield_);
    }
  }

  // repeatedly add recipes whose inputs are all in reached, and add their outputs to reached.
  const made = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const recipe of recipes) {
      if (made.has(recipe.name)) continue;
      const allInputsReached = Object.keys(recipe.inputs).every(
        (item) => reached.has(item),
      );
      if (allInputsReached) {
        made.add(recipe.name);
        reached.add(recipe.output);
        // If this output opens any barrier, add what that terrain yields.
        for (const terrain of terrains) {
          if (OPENS[terrain] === recipe.output) {
            const yield_ = TERRAIN_YIELDS[terrain];
            if (yield_ !== null) reached.add(yield_);
          }
        }
        changed = true;
      }
    }
  }

  return made;
}
