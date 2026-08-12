// SitePilot API — Bun server entry (local dev & standalone prod).
// The Hono app itself lives in ./app.ts (runtime-agnostic) and is reused by
// the Vercel serverless entry (./api/index.ts) — never bind a port here.
import app from "./app.js";

const port = parseInt(process.env.PORT ?? "3001", 10);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`🚀 SitePilot API server ready on port ${port}`);
