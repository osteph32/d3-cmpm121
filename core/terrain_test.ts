import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { isPassable, terrainAt } from "./mod.ts";

function sample(seed: number, originX = 0, originY = 0): string[] {
  const cells: string[] = [];
  for (let y = originY - 30; y < originY + 30; y++) {
    for (let x = originX - 30; x < originX + 30; x++) {
      cells.push(terrainAt(seed, x, y));
    }
  }
  return cells;
}

Deno.test("terrain depends only on seed and coordinates", () => {
  assertEquals(sample(121), sample(121));
  assertEquals(
    sample(121, 1_000_000, -1_000_000),
    sample(121, 1_000_000, -1_000_000),
  );
});

Deno.test("different seeds give different worlds", () => {
  assertNotEquals(sample(121), sample(122));
});

Deno.test("no seed starts walled in", () => {
  for (const seed of [1, 2, 3, 121, 2026]) {
    const seen = new Set(["0,0"]);
    const frontier = [{ x: 0, y: 0 }];
    while (frontier.length > 0 && seen.size < 2000) {
      const { x, y } = frontier.pop()!;
      for (const next of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const key = next.join();
        if (seen.has(key)) continue;
        if (!isPassable(terrainAt(seed, next[0], next[1]))) continue;
        seen.add(key);
        frontier.push({ x: next[0], y: next[1] });
      }
    }
    assert(seen.size >= 2000, `seed ${seed} stops at ${seen.size} cells`);
  }
});
