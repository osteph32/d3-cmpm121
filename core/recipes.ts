// Type Object: a recipe is a row of data, not a class or a function.
// Adding a recipe is adding a row, not writing code.

export type Recipe = {
  name: string;
  inputs: Record<string, number>;
  output: string;
  // once: the player can craft this only while they do not own the output.
  once?: boolean;
  // wins: crafting this recipe ends the game
  wins?: boolean;
};

// The recipe table. To add a recipe, add a row here.
export const RECIPES: Recipe[] = [
  { name: "cloth", inputs: { fiber: 3 }, output: "cloth" },
  { name: "plank", inputs: { wood: 2 }, output: "plank" },
  {
    name: "pickaxe",
    inputs: { plank: 2, fiber: 1, wood: 3 },
    output: "pickaxe",
    once: true,
  }, //unlocks rocks
  {
    name: "boat",
    inputs: { plank: 6 },
    output: "boat",
    once: true,
  }, //unlocks water movement
  {
    name: "water bucket",
    inputs: { stone: 6 },
    output: "water bucket",
    once: true,
  }, //unlocks gathering on water
  {
    name: "survival kit",
    inputs: { cloth: 1, plank: 1, "water bucket": 1 },
    output: "survival kit",
    wins: true,
  }, //unlocks win condition
];
