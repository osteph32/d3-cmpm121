import { type GameState, missing, RECIPES } from "../core/mod.ts";

export class RecipeBook {
  private readonly state: GameState;
  private readonly craft: (command: { type: "craft"; recipe: string }) => void;
  private readonly buttons: HTMLButtonElement[] = [];

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
        if (event.detail > 0) button.blur();
      });
      li.appendChild(button);
      list.appendChild(li);
      this.buttons.push(button);
    }
  }

  update() {
    for (let i = 0; i < RECIPES.length; i++) {
      const recipe = RECIPES[i];
      const lack = missing(this.state.inventory, recipe);
      const button = this.buttons[i];
      if (Object.keys(lack).length === 0) {
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
