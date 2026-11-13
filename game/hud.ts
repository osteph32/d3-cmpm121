import { type GameEvent, type GameState, terrainAt } from "../core/mod.ts";

function element(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function describe(event: GameEvent): string {
  switch (event.type) {
    case "moved":
      return `moved to ${event.to.x}, ${event.to.y}`;
    case "blocked":
      return `blocked by ${event.terrain} at ${event.toward.x}, ${event.toward.y}`;
    case "gathered":
      return `gathered ${event.item} at ${event.at.x}, ${event.at.y}`;
    case "gatherFailed":
      return `nothing to gather at ${event.at.x}, ${event.at.y}`;
  }
}

// The readout, as ordinary page elements that CSS can style and that assistive
// tools can read. It changes only as events play.
export class Hud {
  private readonly seed: number;
  // Cells the player has gathered from, learned from events so the HUD never
  // asks the core about the present (which may be ahead of what has played).
  private changedCells: Set<string> = new Set();

  constructor(state: GameState) {
    this.seed = state.seed;
    this.showPosition(state.player.x, state.player.y);
  }

  show(event: GameEvent) {
    element("live").textContent = describe(event);
    if (event.type === "moved") this.showPosition(event.to.x, event.to.y);
    // On a successful gather, record the depleted cell and refresh the terrain
    // readout so it shows the depleted state right away.
    if (event.type === "gathered") {
      this.changedCells.add(`${event.at.x},${event.at.y}`);
      this.showPosition(event.at.x, event.at.y);
    }
  }

  private showPosition(x: number, y: number) {
    element("position").textContent = `${x}, ${y}`;
    // terrainAt only knows the seed, so it cannot see player changes. The
    // changedCells set, filled from events, tracks depletion instead.
    const terrain = terrainAt(this.seed, x, y);
    const depleted = this.changedCells.has(`${x},${y}`);
    element("terrain").textContent = depleted
      ? `${terrain} (depleted)`
      : terrain;
  }
}
