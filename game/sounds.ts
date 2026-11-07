import type { GameEvent } from "../core/mod.ts";

type SoundName = "step" | "bump" | "chime";

// Which sound each event plays. A new event fails to type-check until it has an entry.
const SOUND_FOR: Record<GameEvent["type"], SoundName | null> = {
  moved: "step",
  blocked: "bump",
};

type Note = {
  frequency: number;
  seconds: number;
  wave: OscillatorType;
  at?: number;
};

const NOTES: Record<SoundName, Note[]> = {
  step: [{ frequency: 170, seconds: 0.04, wave: "triangle" }],
  bump: [{ frequency: 90, seconds: 0.09, wave: "square" }],
  chime: [
    { frequency: 660, seconds: 0.18, wave: "sine" },
    { frequency: 990, seconds: 0.25, wave: "sine", at: 0.09 },
  ],
};

const VOLUME = 0.12;

// Phaser plays loaded audio but has no synthesis, so this is plain Web Audio, with
// no library and no Phaser. Browsers refuse to start audio before a user gesture,
// so the context waits for the first key or click.
export class Sounds {
  context: AudioContext | null = null;
  private muted = false;
  private readonly button: HTMLButtonElement;

  constructor(button: HTMLButtonElement) {
    this.button = button;
    const start = () => this.startContext();
    addEventListener("keydown", start, { once: true });
    addEventListener("pointerdown", start, { once: true });
    button.addEventListener("click", (event) => {
      this.setMuted(!this.muted);
      // After a mouse click, give keys back to the game. Keyboard users keep focus.
      if (event.detail > 0) button.blur();
    });
  }

  show(event: GameEvent) {
    const sound = SOUND_FOR[event.type];
    if (sound) this.play(sound);
  }

  private setMuted(muted: boolean) {
    this.muted = muted;
    this.button.textContent = muted ? "Sound: off" : "Sound: on";
    this.button.setAttribute("aria-pressed", String(muted));
    this.startContext();
    // Unmuting confirms itself.
    this.play("chime");
  }

  private startContext() {
    try {
      this.context ??= new AudioContext();
      this.context.resume();
    } catch {
      // No audio on this browser or device. The game plays on, silently.
      this.context = null;
    }
  }

  private play(sound: SoundName) {
    const { context } = this;
    if (!context || this.muted) return;
    for (const { frequency, seconds, wave, at = 0 } of NOTES[sound]) {
      const begin = context.currentTime + at;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = wave;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(VOLUME, begin);
      gain.gain.exponentialRampToValueAtTime(0.001, begin + seconds);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(begin);
      oscillator.stop(begin + seconds);
    }
  }
}
