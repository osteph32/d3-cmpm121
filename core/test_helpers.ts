import { isPassable, type Terrain, terrainAt } from "./mod.ts";

// Finds the nearest passable cell of a given terrain, searching outward from
// the origin in expanding rings, as besideEasternCell searches along a row.
export function findCellOfTerrain(
  seed: number,
  terrain: Terrain,
): { x: number; y: number } {
  for (let r = 0; r < 500; r++) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (terrainAt(seed, x, y) === terrain && isPassable(terrain)) {
          return { x, y };
        }
      }
    }
  }
  throw new Error(`No passable ${terrain} cell found near the origin.`);
}
