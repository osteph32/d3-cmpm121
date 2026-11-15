// RecipeBook renders the crafting recipe list as clickable buttons and
// keeps each button's label in sync with what the player can currently afford.
import { type GameState, missing, RECIPES } from "../core/mod.ts";

export class RecipeBook {
  // The shared game state, used to check the player's inventory each frame.
  private readonly state: GameState;
  // Callback fired when a recipe button is clicked. Hands the craft command
  private readonly craft: (command: { type: "craft"; recipe: string }) => void;
  private readonly buttons: HTMLButtonElement[] = [];

  // Builds the <li><button> rows for every recipe in the table and makes each button call the craft() callback when clicked
  constructor(
    list: HTMLUListElement,
    state: GameState,
    craft: (command: { type: "craft"; recipe: string }) => void,
  ) {
    this.state = state;
    this.craft = craft;
    for (const recipe of RECIPES) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = recipe.name;
      button.addEventListener("click", (event) => {
        this.craft({ type: "craft", recipe: recipe.name });
        // A real click (detail > 0) should not keep focus on the button, so
        // keyboard input doesn't accidentally re-trigger crafting afterward.
        if (event.detail > 0) button.blur();
      });
      li.appendChild(button);
      list.appendChild(li);
      this.buttons.push(button);
    }
  }

  // Called each frame (or whenever the inventory may have changed) to refresh
  // button labels. If the player has everything the recipe needs, show just
  // the name; otherwise list what's still missing.
  update() {
    for (let i = 0; i < RECIPES.length; i++) {
      const recipe = RECIPES[i];
      // A crafted once-recipe is done for good: gray it out and disable it.
      const done = recipe.once === true &&
        (this.state.inventory[recipe.output] ?? 0) > 0;
      const lack = missing(this.state.inventory, recipe);
      const button = this.buttons[i];
      button.disabled = done;
      if (done) {
        button.textContent = `${recipe.name} (crafted)`;
      } else if (Object.keys(lack).length === 0) {
        button.textContent = recipe.name;
      } else {
        const needs = Object.entries(lack).map(([item, count]) =>
          `${count} ${item}`
        ).join(", ");
        button.textContent = `${recipe.name} (need ${needs})`;
      }
    }
  }
}
