// Type Object: a recipe is a row of data, not a class or a function.
// Adding a recipe is adding a row, not writing code.

export type Recipe = {
  name: string;
  inputs: Record<string, number>;
  output: string;
};

// The recipe table. To add a recipe, add a row here.
export const RECIPES: Recipe[] = [
  { name: "cloth", inputs: { fiber: 3 }, output: "cloth" },
  { name: "plank", inputs: { wood: 2 }, output: "plank" },
];
