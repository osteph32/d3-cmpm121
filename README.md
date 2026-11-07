# D3 starter

A walking skeleton: one thin slice of a game that works from end to end. The player moves gridwise over a big seeded world, with a game core that knows nothing about Phaser and a Phaser client that presents what the core reports. Assignment instructions are on Canvas.

Install [Deno](https://docs.deno.com/runtime/getting_started/installation/) and [Git](https://git-scm.com/downloads). Create your own repository from this template, clone it, open a terminal in that folder, and run `deno task setup` once. Run `deno task dev` and open the local URL printed in the terminal (normally `http://localhost:3000`). Arrow keys move. Add `?seed=7` to the URL for another world. Open the repository folder itself in VS Code, not a parent folder, and accept the recommended Deno extension. If Phaser still shows errors or `any` after `deno task setup`, type or save in that file once.

## Two folders, two rules

- **`core/`** holds the game itself: plain-data state, the seeded terrain function, and `apply(state, command)`. It has no clock, no animation, no browser, and no Phaser. A command updates the state it is given, immediately, and returns events: a record of what happened. Events are kept and played later while state keeps changing, so an event gets its own copies of any cells it reports, never an object that state still holds.
- **`game/`** is the client, wired together in `game/main.ts`. `controller.ts` turns keys into commands, `presenter.ts` plays events in order, and three outputs show each event as it plays: the Phaser grid (`grid/grid_view.ts`), the HUD (`hud.ts`, page elements in `index.html` styled by `style.css`), and sound (`sounds.ts`). The controller holds input while an event plays and calls the core when it ends. That busy state lives only in `game/`.

**Rule one:** `core/` never depends on `game/`, Phaser, or anything else outside `core/`. `game/` imports the core through `../core/mod.ts`. Game rules belong in `core/`, where tests can reach them without a browser. `console` is allowed in `core/` for debugging.

**Rule two:** only `game/grid/` may import Phaser. Phaser is here for one narrow job, drawing the grid and moving its camera. Everything around the grid is ordinary web page, so style it with CSS and make it your own.

Phaser has no device-pixel setting of its own, so `grid_view.ts` sizes the canvas backing store to CSS size times `devicePixelRatio` and zooms the camera to match. Draw in logical pixels and the grid stays crisp on high-resolution displays. The view has a fixed CSS size. A change in pixel ratio is handled, and a window resize changes the page layout only.

Sound uses the browser's Web Audio API directly, because Phaser plays loaded audio but has no synthesis. Audio starts on the first key press or click, as browsers require, and the page plays on silently if audio is unavailable. Change the notes in `sounds.ts` to change how your game sounds.

## Testing entry points

These are supported, for people and for agents driving a browser: `?seed=7` selects a world, `game.state` in the browser console reads logical state (the `game` handle is set in `game/main.ts`), and the `#live` element holds the most recent played event as text, since a canvas is opaque to accessibility-tree tools. [TESTING.md](TESTING.md) is a manual test script. No browser step runs in `deno task ci`.

## Patterns you are already using

Named here so you can read about them. Each also appears in a one-line comment where it is used.

- [Command](https://gameprogrammingpatterns.com/command.html): keys and tests drive the core with the same `Command` objects.
- [Event Queue](https://gameprogrammingpatterns.com/event-queue.html): the presenter separates when an event is produced from when it is played.
- [Observer](https://gameprogrammingpatterns.com/observer.html): the grid, the HUD, and sound each hear played events, and do not know about each other.
- [Mediator](https://refactoring.guru/design-patterns/mediator): the controller stands between input, the core, and the presenter.
- [Facade](https://refactoring.guru/design-patterns/facade): `apply` and `core/mod.ts` are the one way in.
- [Domain Event](https://martinfowler.com/eaaDev/DomainEvent.html): `GameEvent` says what happened in the game's own terms.
- [Humble Object](http://xunitpatterns.com/Humble%20Object.html): the grid view only shows events and decides nothing, because the logic lives in `core/`.
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture): the core is the inside, and keys, tests, the grid, the HUD, and sound all sit outside it. No formal port is declared.
- [Aliasing Bug](https://martinfowler.com/bliki/AliasingBug.html) and [Value Object](https://martinfowler.com/bliki/ValueObject.html): `apply` mutates state, so events copy their cells.
- [Given-When-Then](https://martinfowler.com/bliki/GivenWhenThen.html): the shape of the sample unit tests.
- [Singleton](https://gameprogrammingpatterns.com/singleton.html), avoided on purpose: `newGame(seed)` makes as many worlds as tests need.

## Tests

`deno task test` runs every `*_test.ts` file in `core/`, with no browser involved. The samples show the shape: a move, a blocked move that changes nothing, an event that keeps its cells while state moves on, terrain determinism, a check that no seed starts walled in, and a replay that plays the same seed and commands twice and compares the results. Add your own beside them.

## Tasks

| Task                 | What it does                                                          |
| -------------------- | --------------------------------------------------------------------- |
| `deno task setup`    | Install dependencies and turn on the commit hook (once per clone)     |
| `deno task dev`      | Run the game locally                                                  |
| `deno task test`     | Run the core's tests                                                  |
| `deno task check`    | Type-check `core/` and `game/`, each under its own `deno.json`        |
| `deno task boundary` | Check what `core/` imports, and that only `game/grid/` imports Phaser |
| `deno task fmt`      | Fix formatting                                                        |
| `deno task lint`     | Lint                                                                  |
| `deno task build`    | Build the site into `dist/`                                           |
| `deno task preview`  | Serve the built `dist/` locally                                       |
| `deno task ci`       | Run every gate below, in order                                        |

## The gates

The commit hook and the GitHub Pages workflow both run `deno task ci`. See each gate fail on purpose, then undo the change:

| Gate        | Try this                                                                                                                                          | What you should see                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Formatting  | Add extra spaces inside a line in `core/rules.ts`                                                                                                 | `deno fmt --check` reports the difference                                                      |
| Lint        | Add `const unused = 1;` to `core/rules.ts`                                                                                                        | `deno lint` reports `no-unused-vars`                                                           |
| Types       | Add `document.title = "core";` to `core/rules.ts`                                                                                                 | `deno check core` cannot find `document`                                                       |
| Tests       | In `move` in `core/rules.ts`, add `state.player = to;` to the start of the blocked branch                                                         | The blocked-move test fails and shows the difference                                           |
| Determinism | Use `Math.random()` in `terrainAt` in `core/terrain.ts`, or add `movedAt?: number` to `GameState` and set `state.movedAt = Date.now();` in `move` | The terrain test fails, or the replay test does                                                |
| Boundary    | Add `import type _Phaser from "npm:phaser@4.2.1";` to `core/rules.ts`                                                                             | `deno task boundary` names the file and the import. Only this gate catches it.                 |
| Boundary 2  | Add `import Phaser from "phaser"; console.log(Phaser);` to `game/hud.ts`                                                                          | `deno task boundary` says Phaser is mentioned outside `game/grid/`. Only this gate catches it. |
| Build       | Change `/game/main.ts` in `index.html` to a missing file                                                                                          | `deno task build` cannot resolve it                                                            |

## If blocked

Read the first failing command in the output, fix what it reports, and rerun `deno task ci`. If a hook or tool stalls you, ask course staff with the failing command and its error text.

## Credits

Tooling adapted from the [CMPM 121 Fall 2026 D2 starter](https://github.com/ucsc-cmpm-121-f26/d2-starter), with the Phaser setup following the instructor's E4 starter. Those repositories have no explicit repository license; no new license is assigned to that material. The D3 scaffold was instructor-directed and authored with Anthropic Claude agent assistance. Dependencies retain their respective licenses.

## Review bot

On every push to `main`, a review bot can comment on your commit. It's optional practice feedback, and it can be wrong, so weigh what it says. Until you set it up or opt out, the Review Bot workflow shows a red X and comments on every push. That X is about the bot: check the Deploy workflow separately to see whether your own checks passed.

[The workflow](.github/workflows/review-bot.yml) is the whole bot, and the top of that file explains how to set it up or opt out. [`REVIEWBOT.md`](REVIEWBOT.md) tells it what to look for, and it's yours to change.

Its comments are public if your repository is. It runs on a throwaway machine with your code, can browse the web, and spends your own BayLeaf allowance.
