import { apply, type Command, type Direction } from "../core/mod.ts";
import type { GameState } from "../core/mod.ts";
import type { Presenter } from "./presenter.ts";

const ARROWS: Record<string, Direction> = {
  ArrowUp: "north",
  ArrowDown: "south",
  ArrowLeft: "west",
  ArrowRight: "east",
};

// Input in, core in the middle, presenter out. None of those three knows the others,
// which makes this a Mediator: https://refactoring.guru/design-patterns/mediator
// There is no frame loop here: a command runs on a key press or when playback ends.
export class Controller {
  private readonly state: GameState;
  private readonly presenter: Presenter;
  // A tap made during a walk, kept until the presenter is free.
  private pressed: Command | null = null;
  private held: Direction[] = [];
  // Runs when nothing is playing and no next command has started, so it is safe
  // to read the core here. During playback, the core is ahead of what the player
  // has seen, and reading it would show the future.
  onSettled: () => void = () => {};

  constructor(state: GameState, presenter: Presenter) {
    this.state = state;
    this.presenter = presenter;
    presenter.onIdle = () => {
      this.next();
      // next() may have just started another walk.
      if (!presenter.busy) this.onSettled();
    };
    addEventListener("keydown", (event) => this.keyDown(event));
    addEventListener("keyup", (event) => this.keyUp(event));
    addEventListener("blur", () => this.held = []);
  }

  private keyDown(event: KeyboardEvent) {
    const direction = ARROWS[event.key];
    if (!direction || event.ctrlKey || event.metaKey || event.altKey) return;
    // Otherwise arrow keys would also scroll the page.
    event.preventDefault();
    if (event.repeat) return;
    this.held.push(direction);
    this.pressed = { type: "move", direction };
    this.next();
  }

  private keyUp(event: KeyboardEvent) {
    this.held = this.held.filter((direction) =>
      direction !== ARROWS[event.key]
    );
  }

  private next() {
    // While the presenter is busy, input waits and the core hears nothing. The
    // busy state lives here in game/: the core never learns about animation.
    if (this.presenter.busy) return;

    const held = this.held.at(-1);
    const command: Command | null = this.pressed ??
      (held ? { type: "move", direction: held } : null);
    this.pressed = null;
    if (!command) return;

    // Playing nothing would report idle at once, and a held key would land back
    // here until the stack overflowed. No events means there is nothing to wait for.
    const events = apply(this.state, command);
    if (events.length > 0) this.presenter.play(events);
  }
}
