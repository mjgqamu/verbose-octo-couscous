// Minimal ambient types for the Bun runtime APIs used by this package.
// Full `bun-types` are intentionally not installed (keeps deps light);
// this covers only what src/server.ts needs.
declare const Bun: {
  serve(options: {
    port?: number;
    fetch: (request: Request) => Response | Promise<Response>;
  }): unknown;
};
