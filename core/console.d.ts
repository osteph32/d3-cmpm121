// Core's lib list has no browser globals, which is why document and window fail
// to type-check here. console is let back in on purpose: debugging prints work
// in both Deno and the browser, and they cannot change a game's results.
declare const console: {
  log(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(...data: unknown[]): void;
};
