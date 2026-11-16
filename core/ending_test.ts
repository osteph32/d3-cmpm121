import { assertEquals } from "@std/assert";
import { apply, type Command, newGame, RECIPES } from "./mod.ts";

Deno.test("crafting the survival kit ends the game and stops all commands", () => {
  const state = newGame(121);
  const kit = RECIPES.find((recipe) => recipe.name === "survival kit");
  if (!kit) throw new Error("Missing survival kit recipe");
  state.inventory = { ...kit.inputs };

  const events = apply(state, { type: "craft", recipe: kit.name });

  assertEquals(events.map((event) => event.type), ["crafted", "won"]);
  assertEquals(state.inventory[kit.output], 1);
  assertEquals(state.won, true);

  const snapshot = JSON.parse(JSON.stringify(state));
  const commands: Command[] = [
    { type: "move", direction: "east" },
    { type: "gather" },
    { type: "craft", recipe: kit.name },
  ];

  for (const command of commands) {
    assertEquals(apply(state, command), []);
    assertEquals(state, snapshot);
  }
});
