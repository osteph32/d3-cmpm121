import { assertEquals } from "@std/assert";
import { apply, newGame, RECIPES, TERRAIN_YIELDS } from "./mod.ts";

const SEED = 121;

Deno.test("a successful craft spends inputs and adds the output", () => {
  const state = newGame(SEED);
  const recipe = RECIPES[0];
  for (const [item, count] of Object.entries(recipe.inputs)) {
    state.inventory[item] = count;
  }

  const events = apply(state, { type: "craft", recipe: recipe.name });

  assertEquals(events, [{
    type: "crafted",
    recipe: recipe.name,
    output: recipe.output,
    inventory: { [recipe.output]: 1 },
  }]);
  assertEquals(state.inventory[recipe.output], 1);
  for (const item of Object.keys(recipe.inputs)) {
    assertEquals(state.inventory[item], undefined);
  }
});

Deno.test("a failed craft changes nothing and says what is missing", () => {
  const state = newGame(SEED);
  const recipe = RECIPES[0];
  const snapshot = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "craft", recipe: recipe.name });

  assertEquals(state, snapshot);
  assertEquals(events, [{
    type: "craftFailed",
    recipe: recipe.name,
    missing: recipe.inputs,
  }]);
});

Deno.test("every recipe input has a source (gatherable or craftable)", () => {
  const sources = new Set<string>();
  for (const yield_ of Object.values(TERRAIN_YIELDS)) {
    if (yield_ !== null) sources.add(yield_);
  }
  for (const recipe of RECIPES) {
    sources.add(recipe.output);
  }
  for (const recipe of RECIPES) {
    for (const input of Object.keys(recipe.inputs)) {
      assertEquals(
        sources.has(input),
        true,
        `Recipe "${recipe.name}" needs "${input}" but nothing provides it`,
      );
    }
  }
});

Deno.test("a crafted event keeps its inventory while state crafts on", () => {
  const state = newGame(SEED);
  const recipe = RECIPES[0];
  // Set up enough for two crafts of the same recipe.
  for (const [item, count] of Object.entries(recipe.inputs)) {
    state.inventory[item] = count * 2;
  }

  const first = apply(state, { type: "craft", recipe: recipe.name });
  apply(state, { type: "craft", recipe: recipe.name });

  // The first event's inventory copy still reflects after one craft,
  // even though state.inventory has now been changed by the second.
  assertEquals(first, [{
    type: "crafted",
    recipe: recipe.name,
    output: recipe.output,
    inventory: {
      [recipe.output]: 1,
      ...Object.fromEntries(
        Object.entries(recipe.inputs).map(([item, count]) => [item, count]),
      ),
    },
  }]);
});

Deno.test("a once-recipe cannot be crafted again while owned", () => {
  const state = newGame(SEED);
  const recipe = RECIPES.find((r) => r.once === true)!;
  for (const [item, count] of Object.entries(recipe.inputs)) {
    state.inventory[item] = count;
  }

  const first = apply(state, { type: "craft", recipe: recipe.name });
  assertEquals(first[0].type, "crafted");

  // Restock the inputs: still refuses because the output is already owned.
  for (const [item, count] of Object.entries(recipe.inputs)) {
    state.inventory[item] = count;
  }
  const snapshot = JSON.parse(JSON.stringify(state));
  const second = apply(state, { type: "craft", recipe: recipe.name });

  assertEquals(second, [{
    type: "craftMaxed",
    recipe: recipe.name,
    output: recipe.output,
  }]);
  assertEquals(state, snapshot);
});
