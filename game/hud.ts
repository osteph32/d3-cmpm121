import {
  type GameEvent,
  type GameState,
  OPENS,
  terrainAt,
} from "../core/mod.ts";

function element(id: string): HTMLElement {
  return document.getElementById(id)!;
}

// The HUD (heads-up display): the text panel beside the grid.
// describe() turns each event into a human-readable sentence.
// show() is called by the presenter whenever an event plays, updating
// the #live paragraph and specific sections per event type.
// The inventory is rebuilt from the event's copy (event.inventory),
// never from game.state, so the display matches what the player has
// seen happen, not what the core has already done ahead of the animation.
function describe(event: GameEvent): string {
  switch (event.type) {
    case "moved":
      return `moved to ${event.to.x}, ${event.to.y}`;
    case "blocked": {
      const opener = OPENS[event.terrain];
      const need = opener ? ` (need ${opener})` : "";
      return `blocked by ${event.terrain}${need} at ${event.toward.x}, ${event.toward.y}`;
    }
    case "gathered":
      return `gathered ${event.item} at ${event.at.x}, ${event.at.y}`;
    case "gatherFailed":
      return `nothing to gather at ${event.at.x}, ${event.at.y}`;
    case "crafted":
      // The capstone's crafted event carries won, so the panel can announce it.
      return `Crafted ${event.output}.`;
    case "won":
      return "Expedition complete! Your survival kit is packed for the journey home.";
    // craftFailed lists what is still missing, e.g. "need 3 fiber for cloth"
    case "craftFailed": {
      const needs = Object.entries(event.missing).map(([item, count]) =>
        `${count} ${item}`
      ).join(", ");
      return needs
        ? `need ${needs} for ${event.recipe}`
        : `unknown recipe: ${event.recipe}`;
    }
    case "craftMaxed":
      return `already crafted ${event.output}`;
  }
}

export class Hud {
  private readonly seed: number;
  private changedCells: Set<string> = new Set();

  constructor(state: GameState) {
    this.seed = state.seed;
    this.showPosition(state.player.x, state.player.y);
  }

  show(event: GameEvent) {
    element("live").textContent = describe(event);
    // moved: update position/terrain readout
    if (event.type === "moved") this.showPosition(event.to.x, event.to.y);
    // gathered: mark cell as depleted, update position, refresh inventory
    if (event.type === "gathered") {
      this.changedCells.add(`${event.at.x},${event.at.y}`);
      this.showPosition(event.at.x, event.at.y);
      this.showInventory(event.inventory);
    }
    // crafted: refresh inventory (inputs spent, output added)
    if (event.type === "crafted") {
      this.showInventory(event.inventory);
    }

    if (event.type === "won") {
      const banner = document.querySelector<HTMLElement>("#win-banner");
      if (banner) banner.hidden = false;
    }
  }

  private showPosition(x: number, y: number) {
    element("position").textContent = `${x}, ${y}`;
    const terrain = terrainAt(this.seed, x, y);
    const depleted = this.changedCells.has(`${x},${y}`);
    element("terrain").textContent = depleted
      ? `${terrain} (depleted)`
      : terrain;
  }

  private showInventory(inventory: Record<string, number>) {
    const list = element("inventory");
    list.innerHTML = "";
    for (const [item, count] of Object.entries(inventory)) {
      const li = document.createElement("li");
      li.textContent = `${item}: ${count}`;
      list.appendChild(li);
    }
  }
}
