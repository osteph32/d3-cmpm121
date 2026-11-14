import { assertEquals } from "@std/assert";
import { canReach } from "./can_reach.ts";
import { type Recipe, RECIPES } from "./mod.ts";

Deno.test("all recipes in the real table are reachable", () => {
  const unreachable = canReach(RECIPES);
  assertEquals(unreachable.size, 0);
});

Deno.test("a recipe that needs its own output is unreachable", () => {
  const broken: Recipe[] = [
    ...RECIPES,
    { name: "sunstone", inputs: { stone: 1, sunstone: 1 }, output: "sunstone" },
  ];
  const unreachable = canReach(broken);
  assertEquals(unreachable.has("sunstone"), true);
});
