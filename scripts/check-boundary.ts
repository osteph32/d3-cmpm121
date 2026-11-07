// Gate 1: core/ may not depend on anything outside core/.
// Gate 2: only game/grid/ may import Phaser.
// Asks Deno for the import graph of every code file, including files that nothing
// reaches. Type-only imports count too.

const CORE = new URL("../core/", import.meta.url);
const GAME = new URL("../game/", import.meta.url);
const GRID = new URL("../game/grid/", import.meta.url);
const PHASER =
  /["'](npm:|[^"']*node_modules\/)?phaser(@[^"']*)?(\/[^"']*)?["']/;
const CODE_FILE = /\.[cm]?[jt]sx?$/;
const TEST_FILE = /(^|[._])test\.[cm]?[jt]sx?$/;
// Test files alone may also use the assertion library pinned in core/deno.json.
const TEST_LIBRARY =
  /^(jsr:@std\/assert@|https:\/\/jsr\.io\/@std\/(assert|internal)\/)/;

type Resolved = { specifier?: string; error?: string };
type Dependency = { specifier: string; code?: Resolved; type?: Resolved };
type Graph = {
  modules: { specifier: string; error?: string; dependencies?: Dependency[] }[];
};

async function codeFilesIn(dir: URL): Promise<URL[]> {
  const files: URL[] = [];
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isDirectory) {
      files.push(...await codeFilesIn(new URL(`${entry.name}/`, dir)));
    } else if (CODE_FILE.test(entry.name)) {
      files.push(new URL(entry.name, dir));
    }
  }
  return files;
}

function display(specifier: string): string {
  return specifier.startsWith(CORE.href)
    ? "core/" + decodeURI(specifier.slice(CORE.href.length))
    : specifier;
}

async function violationsFrom(file: URL): Promise<string[]> {
  const result = await new Deno.Command("deno", {
    args: ["info", "--json", file.href],
    cwd: CORE,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!result.success) {
    const reason = new TextDecoder().decode(result.stderr).trim();
    return [`${display(file.href)} could not be analyzed: ${reason}`];
  }

  const graph: Graph = JSON.parse(new TextDecoder().decode(result.stdout));
  const isTest = TEST_FILE.test(file.pathname);
  const violations: string[] = [];
  for (const module of graph.modules) {
    // Anything outside core/ was reached through a file inside it, so reporting
    // the file inside is enough.
    if (!module.specifier.startsWith(CORE.href)) continue;
    const from = display(module.specifier);
    if (module.error) violations.push(`${from}: ${module.error}`);
    for (const { specifier, code, type } of module.dependencies ?? []) {
      for (const target of [code, type]) {
        if (!target) continue;
        if (target.error) {
          violations.push(
            `${from} imports "${specifier}", which does not resolve`,
          );
        } else if (
          !target.specifier?.startsWith(CORE.href) &&
          !(isTest && TEST_LIBRARY.test(target.specifier ?? ""))
        ) {
          violations.push(`${from} imports "${specifier}"`);
        }
      }
    }
  }
  return violations;
}

const files = await codeFilesIn(CORE);
const found = await Promise.all(files.map(violationsFrom));
const violations = [...new Set(found.flat())].sort();

// Gate 2 reads text rather than the import graph, which is simple and strict: any
// quoted "phaser", "npm:phaser@...", or path into node_modules/phaser counts.
const gameFiles = (await codeFilesIn(GAME)).filter((file) =>
  !file.href.startsWith(GRID.href)
);
for (const file of gameFiles) {
  if (PHASER.test(await Deno.readTextFile(file))) {
    violations.push(`${file.pathname} mentions Phaser outside game/grid/`);
  }
}

if (violations.length > 0) {
  console.error("Boundary check failed: core/ must depend only on core/, and");
  console.error("only game/grid/ may import Phaser.\n");
  for (const violation of violations) console.error(`  ${violation}`);
  console.error(`
The core has to run with no browser, no Phaser, and no game/ folder, which is
what lets your tests drive it headlessly. Move this dependency into game/, and
have the core report an event that game/ can present instead. Phaser is here only
to draw the grid: keep it in game/grid/ and give the rest of game/ plain events.`);
  Deno.exit(1);
}
console.log(
  `Boundary check passed: ${files.length} files in core/, ${gameFiles.length} in game/ outside game/grid/.`,
);
