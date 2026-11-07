import type { GameEvent } from "../core/mod.ts";

// Anything that shows events: the grid, the HUD, sound. An output that takes time
// returns a promise, and the next event waits for it.
export type Output = { show(event: GameEvent): Promise<void> | void };

// Owns the order and timing of played events. By the time an event arrives here it
// has already happened: this only plays it back over time, and no output hears of
// an event before its turn, so the HUD never shows the future relative to the grid.
// Event Queue (produced now, played later): https://gameprogrammingpatterns.com/event-queue.html
// Observer (outputs subscribe, and do not know each other): https://gameprogrammingpatterns.com/observer.html
export class Presenter {
  // True until the last event has finished playing.
  busy = false;
  onIdle: () => void = () => {};
  private readonly outputs: Output[];
  private readonly queue: GameEvent[] = [];

  constructor(outputs: Output[]) {
    this.outputs = outputs;
  }

  play(events: GameEvent[]) {
    this.queue.push(...events);
    if (!this.busy) this.playQueue();
  }

  private async playQueue() {
    this.busy = true;
    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      await Promise.all(this.outputs.map((output) => output.show(event)));
    }
    this.busy = false;
    this.onIdle();
  }
}
