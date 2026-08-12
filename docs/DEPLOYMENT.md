# SitePilot AI — Production Deployment Runbook (Vercel + Neon + Upstash)

Concise, ordered guide for deploying the SitePilot monorepo (`/home/team/shared/sitepilot`)
to production. The API (`apps/api`, Hono) and web SPA (`apps/web`, Vite/React) deploy as
**two separate Vercel projects**; the web project proxies `/api/*` to the API project so the
browser only ever talks to one origin (required for httpOnly auth cookies).

---

## 1. Infrastructure overview

| Layer     | Provider            | Purpose                                          |
|-----------|---------------------|--------------------------------------------------|
| Database  | Neon (PostgreSQL 16)| Primary datastore (Drizzle ORM, `postgres` driver) |
| Cache/Queue| Upstash (Redis)     | Sessions / job queues (wired via `REDIS_URL`; **not yet consumed by app code** — optional today) |
| Hosting   | Vercel              | API (Node serverless functions) + web (static SPA) |

Repo layout used by this runbook:

```
sitepilot/
├── apps/api/
│   ├── api/index.ts        # Vercel serverless entry (hono/vercel adapter)
│   ├── vercel.json         # @vercel/node build + routes + env declarations
│   └── src/app.ts          # Hono app (runtime-agnostic, default export)
│   └── src/server.ts       # Bun local server (Bun.serve) — dev/standalone only
├── apps/web/
│   ├── vercel.json         # build command, SPA fallback, /api proxy rewrite
│   └── (vite build → dist/)
└── packages/db/            # Drizzle schema + migrations (PostgreSQL dialect in prod)
```

---

## 2. Required environment variables

`apps/api/vercel.json` declares these. **Values are never stored in the repo** — set them
in the Vercel dashboard (Project → Settings → Environment Variables).

### Required (API will not boot correctly without these)

| Variable         | Where to get it                                             |
|------------------|-------------------------------------------------------------|
| `DATABASE_URL`   | Neon → your project → Connect → pooled connection string (`postgresql://...?sslmode=require`). Use the **pooled** URL for serverless (via pgBouncer) |
| `JWT_SECRET`     | Generate: `openssl rand -base64 48` (≥32 chars)             |
| `CORS_ORIGIN`    | The web app's origin, e.g. `https://sitepilot-web.vercel.app` |

### Optional / feature-gated (empty-string placeholders in vercel.json; fill when used)

| Variable | Notes |
|----------|-------|
| `JWT_REFRESH_SECRET` | Declared in `.env.example`; not yet consumed by code |
| `REDIS_URL` | Upstash → REST/connection details. Not consumed yet (see infra table) |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | AI agents/analyst (OpenAI-compatible) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Voice/WhatsApp + webhooks |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing |
| `RESEND_API_KEY` | Email |
| `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION` | File storage (Cloudflare R2 / S3) |
| `APP_URL`, `API_URL` | Declared; not consumed by API code today |

`NODE_ENV` is managed by Vercel — do **not** set it yourself. `PORT` is ignored by Vercel
functions (used only by `src/server.ts` locally).

> Note: `vercel.json` uses `"@name"` references for the three required vars — the deploy
> fails fast if they are missing from the dashboard. Values set in the dashboard override
> vercel.json.

---

## 3. Step 1 — Provision Neon (PostgreSQL)

1. Sign up at neon.tech → **Create project** (region near your users, e.g. `us-east-1`).
2. In the dashboard, copy the **pooled connection string** (it contains `-pooler.`):
   `postgresql://USER:PASSWORD@HOST-pooler.neon.tech/DB?sslmode=require`
3. Save it — it becomes `DATABASE_URL` for migrations *and* for Vercel.

## 4. Step 2 — Run migrations against Neon

From the repo root (requires `DATABASE_URL` in the environment, local Postgres NOT running):

```bash
cd /home/team/shared/sitepilot
export DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.neon.tech/DB?sslmode=require"
bun run db:migrate        # → packages/db: drizzle-orm/postgres-js migrator, ./src/migrations
```

Verify: `psql "$DATABASE_URL" -c '\dt'` should list the SitePilot tables.

Optional demo data: `bun run db:seed` (sets `DATABASE_URL` the same way).

## 5. Step 3 — Deploy the API to Vercel

1. Push the monorepo to GitHub. In Vercel → **Add New Project** → import the repo.
2. Project config (API project):
   - **Root Directory:** `apps/api`
   - **Framework Preset:** Other (vercel.json's `builds` key drives the build)
   - **Install Command:** `bun install` (Vercel detects Bun from the repo-root `bun.lock`)
   - **Build Command:** `bun run build` (runs `tsc`; the function itself is bundled from `api/index.ts` by `@vercel/node`)
   - **Output Directory:** `dist`
3. Settings → Environment Variables — set **Production** values (and Preview/Development
   if desired): `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (required), plus any optional ones.
4. Deploy. When green, note the API project URL, e.g. `https://sitepilot-api.vercel.app`.
5. Sanity check: `curl https://sitepilot-api.vercel.app/api/health` → `{"status":"ok",...}`.

### How the API function works on Vercel
- `api/index.ts` exports `handle(app)` from `hono/vercel` (Web-standard `Request → Response`
  handler, supported by the Vercel Node runtime).
- `apps/api/vercel.json` routes every `/api/*` request to that function.
- The Hono app lives in `src/app.ts` (`export default app`) and is also directly compatible
  with Vercel's **Hono framework preset** (remove the `builds`/`routes` keys and
  `export default app` from `api/index.ts` to switch).

### Known bundling caveat (read before first deploy)
`packages/db/src/index.ts` switches dialect at runtime via top-level `await import(...)`
(SQLite path imports `bun:sqlite`, which does not exist on Vercel). On Vercel, always set
`DATABASE_URL` to the Neon **Postgres** URL and never set `DB_DRIVER=sqlite`. If the Vercel
build fails resolving `bun:sqlite` or on top-level await, the fix is to make the dialect
switch bundler-safe (dynamic `import()` with the sqlite branch behind a runtime guard that
bundlers keep external) — file lives in `packages/db/src/index.ts`.

## 6. Step 4 — Deploy the web app to Vercel

1. Vercel → **Add New Project** → same repo.
2. Project config (web project):
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Vite
   - **Install Command:** `bun install`
   - **Build Command:** `bun run build` (runs `tsc -b && vite build`)
   - **Output Directory:** `dist`
3. No env vars strictly required. After first deploy, note the URL,
   e.g. `https://sitepilot-web.vercel.app`.
4. **Wire the API proxy:** in `apps/web/vercel.json`, replace the placeholder
   `https://sitepilot-api.vercel.app/api/$1` with the real API project URL, then redeploy:
   ```json
   "rewrites": [
     { "source": "/api/(.*)", "destination": "https://sitepilot-api.vercel.app/api/$1" },
     { "source": "/(.*)", "destination": "/index.html" }
   ]
   ```
   Order matters: `/api/*` first, then the SPA fallback (non-asset requests → `index.html`).
   Static assets (`dist/assets/*`) are served directly before rewrites are applied.
5. Update the API's `CORS_ORIGIN` env var to `https://sitepilot-web.vercel.app` (if the web
   origin changed) and redeploy the API. CORS is only exercised on direct API calls — the
   proxy path is same-origin from the browser's perspective.

## 7. Post-deploy verification

```bash
API=https://sitepilot-api.vercel.app
WEB=https://sitepilot-web.vercel.app

# 1. Health check
curl -s $API/api/health                      # {"status":"ok",...}

# 2. 404 catch-all (API mounted correctly)
curl -s -o /dev/null -w '%{http_code}\n' $API/api/v1/nope   # 404

# 3. Register (org + owner + password ≥ 8 chars)
curl -s -X POST $API/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"orgName":"Acme Plumbing","ownerName":"Ada Owner","email":"ada@acme.test","password":"supersecret1"}'

# 4. Login (expect access token + httpOnly refresh cookie)
curl -s -c /tmp/cookies.txt -X POST $API/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@acme.test","password":"supersecret1"}'

# 5. Authenticated call (use the access token from step 4)
curl -s $API/api/v1/orgs/<orgId>/leads -H "Authorization: Bearer <access_token>"

# 6. Web app loads + proxies API through the same origin
curl -s -o /dev/null -w '%{http_code}\n' $WEB/                    # 200
curl -s $WEB/api/health                                           # same JSON as step 1
# 7. Browser: open $WEB → register → log in → land on dashboard
```

## 8. Rollback procedure

- **Per project:** Vercel → project → Deployments → ⋯ menu on the last known-good
  deployment → **Promote to Production** (instant; no code changes).
- **Database schema:** Neon → your project → **Branches** (create a `prod` branch before
  each migration) — roll back a bad migration by pointing the app at an older branch
  (change `DATABASE_URL` and redeploy, or use Neon's time-travel restore). Schema changes
  are forward-only via Drizzle; destructive reversions require a Neon branch restore.
- **Secrets:** rotate `JWT_SECRET`/`DATABASE_URL` in the dashboard and redeploy — existing
  sessions invalidate automatically (tokens are JWT-signed).
- **Code:** revert the merged PR → push → Vercel auto-deploys both projects.

## 9. Repo checklist (what this runbook assumes exists)

- [x] `apps/api/vercel.json` — `@vercel/node` build, routes, env declarations
- [x] `apps/api/api/index.ts` — serverless entry (`handle(app)` from `hono/vercel`)
- [x] `apps/api/src/app.ts` — Hono app, `export default app`
- [x] `apps/api/src/server.ts` — `Bun.serve` for local dev (`bun run dev` / `bun run start`)
- [x] `apps/web/vercel.json` — build command, SPA fallback, `/api` proxy rewrite
- [x] Both `bun run build`s pass locally (`apps/api`, `apps/web`)
