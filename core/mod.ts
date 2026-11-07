// The core's public face. game/ imports from here and nowhere else in core/.
// Facade: https://refactoring.guru/design-patterns/facade
// Hexagonal Architecture (core inside, Phaser and tests as adapters): https://alistair.cockburn.us/hexagonal-architecture
export * from "./rules.ts";
export * from "./terrain.ts";
