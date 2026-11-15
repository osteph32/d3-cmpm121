import { assertEquals } from "@std/assert";
import { canReach } from "./can_reach.ts";
import { type Recipe, RECIPES } from "./mod.ts";

Deno.test("all recipes in the real table are reachable", () => {
  const reachable = canReach(RECIPES);
  for (const recipe of RECIPES) {
    assertEquals(reachable.has(recipe.name), true);
  }
});

Deno.test("a recipe that needs its own output is unreachable", () => {
  const broken: Recipe[] = [
    ...RECIPES,
    { name: "sunstone", inputs: { stone: 1, sunstone: 1 }, output: "sunstone" },
  ];
  const reachable = canReach(broken);
  assertEquals(reachable.has("sunstone"), false);
});
