// SitePilot API — Vercel serverless entry.
// Uses Vercel's Hono framework preset: the app instance is the default export
// (src/app.ts also exports it) and Vercel wraps it automatically for every
// route. Local dev/server usage goes through src/server.ts (Bun.serve).
import app from "../src/app.js";

export default app;
