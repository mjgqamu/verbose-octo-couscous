// SitePilot API — Vercel serverless entry.
// Bundled by @vercel/node (see ./vercel.json "builds"). `handle()` from
// hono/vercel adapts the Hono app to a Web-standard (Request => Response)
// handler, which the Vercel Node runtime invokes for every HTTP method.
//
// Alternative (framework preset): remove the "builds"/"routes" keys from
// vercel.json and simply `export default app` here — Vercel's Hono framework
// preset detects the Hono app and wraps it automatically.
import { handle } from "hono/vercel";
import app from "../src/app.js";

export default handle(app);
