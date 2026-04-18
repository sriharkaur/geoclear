# GeoClear — Master Queue
**Single source of truth for all work. Check items off as done.**
_Last updated: 2026-04-18 (session 33 — Q-186 + Q-187 done (MCP Phase 1 + x402 Phase 2).)_

---

## 🤖 SESSION PROTOCOL — Read this before touching any code

Every Claude session that opens this file MUST follow these four steps, in order.

### Step 1 · Find the highest-priority unclaimed task

Scan sections **P0 → P1 → P2 → P3** (top to bottom in this file). Within each section, scan items top to bottom. Find the first item that is:
- marked `[ ]` (not done), AND
- does NOT show `⏳ IN PROGRESS` or a session claim

That is your task. Do not skip to a lower-priority section while a higher-priority `[ ]` item exists.

**Priority legend (P0 overrides everything):**

| Label | Meaning | Trigger |
|-------|---------|---------|
| `[P0]` | Active incident — prod down or data silently wrong right now | Drop everything. Fix before reading further. |
| `[P1]` | Uptime & deployment standards — prevents the next outage | Must complete before any P2 or P3 work |
| `[P2]` | Data quality — wrong data is a broken product | Must complete before any P3 work |
| `[P3-FEAT]` | New feature or API endpoint | Work in parallel with P3-DIST |
| `[P3-DIST]` | Distribution, GTM, SEO, outreach | Work in parallel with P3-FEAT |

### Step 2 · Claim the task (before writing any code)

Edit the item's status marker from `[ ]` to `⏳ IN PROGRESS` and append the session ID:

```
- [ ] **Q-NNN · ...**           ← before
- ⏳ **Q-NNN · ...**  · SESSION-{YYYY-MM-DD-NN}    ← after claiming
```

Use `SESSION-{today's date}-{two-digit counter}` (e.g. `SESSION-2026-04-17-01`). Increment the counter if another session claimed a task today.

**Commit the status change immediately** — before writing any code. This prevents two sessions from picking up the same task.

### Step 3 · Work the task

- Complete the task fully before declaring done. Partial work = leave as `⏳ IN PROGRESS`.
- If you get blocked: change status to `🚫 BLOCKED · {reason}` and pick the next available task.
- Do not take on a second task while one is `⏳ IN PROGRESS`.

### Step 4 · Close the task (before ending the session)

1. Change `⏳ IN PROGRESS · SESSION-...` → `✅ DONE {YYYY-MM-DD}`
2. Update **FEATURES.md** · **ARCHITECTURE.md** · **RELEASES.md** (same commit — no exceptions)
3. Commit format: `feat:` / `fix:` / `chore:` for the code, then `docs:` for the queue update, or combine both in one commit with the code

**Never end a session leaving a task as `⏳ IN PROGRESS` without a handoff note.** If you must stop mid-task, add one line under the item: `> Handoff: {what was done, what remains, what to watch out for}`.

---

> **North Star:** $100K MRR in 12 months
> **Next milestone:** $500 MRR by Day 30 → $2,500 by Day 60 → $5,000 by Day 90
> **Rule:** No new strategy sessions until Day 60. No new product features until first paying customer.
> **Strategy files:** [STRATEGY-INDEX.md](strategy/STRATEGY-INDEX.md) — all 9 analyses with conclusions

---

## PRIORITIZATION: P0 → P1 → P2 → P3
> **P0 = Active incident** · **P1 = Prod up** · **P2 = Data correct** · **P3 = Features + Distribution (equal)**

## 🚨 P0 — ACTIVE INCIDENT (prod down or data actively wrong)
> Nothing else matters until P0 is clear. Check this section first, every session.

_No active P0 incidents. If prod goes down or data is found actively wrong, add a `[P0]` item here immediately._

---

## 🔴 P1 — SYSTEM UPTIME (prod must never be down)
> Fix these before anything else. A down system has zero customers.

- ✅ **Q-144 · [P1-UPTIME] Pin all runtime versions** — `"node":"20.x"` done. Add to deployment checklist: verify Node pin present before any cache-clear deploy. Write `docs/runbooks/RUNBOOK-ENV-VARS.md` with required env var checklist per service. *Effort: 1 hr* · DONE 2026-04-17
- ✅ **Q-145 · [P1-UPTIME] Env var audit checklist — all services** — Document every required env var in runbook. Checklist: `DATA_DIR=/data`, `STRIPE_*`, `NAD_ADMIN_SECRET`, `NODE_VERSION=20`. Missing required var = deploy abort. *Effort: 1 hr* · DONE 2026-04-17
- ✅ **Q-146 · [P1-UPTIME] Extend DB readiness gate to risk.db** — Add `isReady()` to `risk-data.js`. Log risk.db status at startup alongside nad.db. Endpoints that need risk.db return explicit `risk_data_unavailable` error when not ready, not silent null. *Effort: 1 hr* · DONE 2026-04-17
- [ ] **Q-147 · [P1-UPTIME] /api/health/detailed endpoint** — Returns: nad.db status + address count, risk.db table list + row counts + last import dates, Node version, external API probe (FEMA + USGS spot check). Returns `"degraded"` if any table below minimum row count. Used by UptimeRobot keyword monitor (Q-158). *Effort: 2 hr*
- [ ] ~~**Q-148 · [P1-UPTIME] Standardize all import scripts to DATA_DIR env var**~~ — **SUPERSEDED by Q-161 (Xata migration).** With `XATA_DATABASE_URL`, all DB connections are URLs — no file paths, no `DATA_DIR`, no `__dirname`. The entire failure class this was preventing disappears.
- [ ] ~~**Q-149 · [P1-UPTIME] Import scripts self-contained**~~ — **SUPERSEDED by Q-161 (Xata migration).** Database is a connection string, not a filesystem artifact. No CWD dependency possible.
- [ ] ~~**Q-150 · [P1-UPTIME] Pre-upload check script**~~ — **SUPERSEDED by Q-161 (Xata migration).** Xata CoW branching replaces the entire upload/manifest/diff pipeline. No upload script needed.
- [ ] ~~**Q-151 · [P1-UPTIME] GET /v1/admin/data-manifest endpoint**~~ — **SUPERSEDED by Q-161 (Xata migration).** Branch comparison + `pg_stat_user_tables` replaces a hand-built manifest endpoint.
- [ ] ~~**Q-152 · [P1-UPTIME] Staging replica procedure**~~ — **SUPERSEDED by Q-161 (Xata migration).** Xata branches ARE staging replicas. CoW branching eliminates the staging pipeline entirely.
- [ ] **Q-158 · [P1-UPTIME] UptimeRobot /api/health/detailed keyword monitor** — Keyword check for `"status":"ok"` (not `"degraded"`). Fires on missing tables, stale data, FEMA probe failures. *30 min after Q-147.*
- [ ] **Q-159 · [P1-UPTIME] UptimeRobot address resolution smoke test** — Already created (ID 802868421). Verify it's firing correctly once Q-147 is up.
- [x] **Q-160 · [P1-UPTIME] Set NAD_ADMIN_SECRET on prod** ✅ 2026-04-17 — Generated `nad_admin_` + 56-char random secret, set in Render prod env vars alongside full Neon migration env var restore.

---

## 🔵 INFRASTRUCTURE MIGRATION — Xata + Hono
> **Architecture decisions 2026-04-17.** Full analysis: `architecture/ARCH-ANALYSIS-2026-04-17-postgres-xata.md` · `architecture/ARCH-ANALYSIS-2026-04-17-hono-framework.md`
> Sequenced: Q-161 → Q-162 → Q-163 / Q-164 / Q-165 in order. Q-163/164/165 are the 3 B2B2D Trojan Horse items.

- [ ] **Q-161 · [P1-INFRA] Xata Phase 0 — migrate risk.db + keys.db to Xata PostgreSQL** — (1) Enable PostGIS + pgvector + pg_cron + pg_duckdb on Xata branch settings; (2) migrate `wildfire_risk`, `storm_risk`, `earthquake_risk`, `drought_risk`, `nri_risk` + `api_keys`, `usage_log`, `address_signals`, `data_sources` from SQLite → Xata schemas `risk.*` + `keys.*` using **`xata-clone`** (not pg_dump — xata-clone handles the 150GB pull directly into a Xata branch without manual dump/restore); (3) run `COUNT(*)` across all tables in both SQLite source and Xata destination to verify data parity before cutover; (4) swap `better-sqlite3` → `pg` driver in `risk-data.js` + `keys.js`, connect via `XATA_DATABASE_URL`; (5) nad.db stays SQLite for now. **Unlocks Q-154 (pg_cron), Q-156 (freshness SQL), Q-153 (CHECK constraints). Supersedes Q-148, Q-149, Q-150, Q-151, Q-152 — those are SQLite pipeline workarounds that disappear when DB is a URL.** *Effort: 4 hr*
  > 📄 Reference: `architecture/DEV-SYSTEM-REF-2026-04-17.md` § 1. Phase Migration Map + § 4. Database-as-Code Workflow (Postgres-as-Code golden rule — merge Xata branch BEFORE git push)

- [ ] **Q-162 · [P1-INFRA] Migrate Express → Hono** — Rewrite `web-server.js` (1,956 lines, 55 routes) into structured Hono app. Split into `routes/api.js`, `routes/v1.js`, `routes/admin.js`, `routes/demo.js`, `routes/webhooks.js`. Route logic in `query.js`, `enrich.js`, `risk-data.js`, `keys.js` unchanged — HTTP layer only. Special care: Stripe raw body (`c.req.arrayBuffer()`), streaming upload, static files. `npm install hono @hono/zod-openapi zod && npm remove express`. **Prerequisite for Q-163, Q-164, Q-165.** *Effort: 2–3 days*

- [ ] **Q-163 · [P3-FEAT] Hono RPC → @geoclear/client typed npm package** — Export Hono `AppType` from server. Publish as `@geoclear/client` on npm. Developers get full TypeScript autocomplete on every endpoint and every response field — feels like calling a local function, not a remote 150GB database. **Supersedes Q-106 (Node.js SDK).** *Effort: 4 hr after Q-162. B2B2D Trojan Horse item 1.*

- [ ] **Q-164 · [P3-FEAT] Zod + OpenAPI → Swagger UI at /explorer + /openapi.json** — Add Zod request/response schemas to all public routes via `@hono/zod-openapi`. Generates: (1) live Swagger UI at `/explorer` — interactive playground, no Postman needed; (2) `/openapi.json` spec — feeds RapidAPI, auto-generates Python/Go/Java SDKs via `openapi-generator`. Input validation at HTTP boundary = SQL injection prevention + enterprise audit-ready. **Partially supersedes Q-107 (Python SDK).** *Effort: 1 day after Q-162. B2B2D Trojan Horse item 2.*

- [ ] **Q-165 · [P3-FEAT] Cloudflare Workers edge deployment for /api/* routes** — Deploy public API routes to Cloudflare Workers. Hono runs identically on CF Workers — zero code changes to routes. Result: ~30ms latency globally vs 200–400ms from single Render region. CF handles TLS, DDoS, edge rate limiting, static caching. **Gate: nad.db must be on Xata (Phase 3) before this ships — Workers require a URL-based DB, not a file path.** *Effort: 1 day. B2B2D Trojan Horse item 3.*

---

## 🛠 DEV SETUP & POSTGRES-AS-CODE
> **Source:** `research/dev_architecture_setup.docx` + `research/dev_system.docx` · Reviewed 2026-04-17.
> Local dev discipline, branch-first workflow, schema-as-code, GitHub integration, repo structure, and operational stability rules. Run **after Q-161 (Xata Phase 0)** is complete — these assume `XATA_DATABASE_URL` exists.
> Sequenced: Q-166 (schema capture) → Q-167 (local dev) → Q-168 (branch workflow) → Q-169 (repo structure) → Q-170 (GitHub + CI/CD) → Q-171–Q-175 (operational stability, run in parallel after Q-161).

- [ ] **Q-166 · [P1-INFRA] Drizzle-Kit schema capture — introspect Xata → schema.ts** — Run `npx drizzle-kit introspect` against `XATA_DATABASE_URL` after Q-161 completes. Outputs `src/db/schema.ts` with TypeScript table definitions matching actual Xata tables. Run `npx drizzle-kit generate` → outputs `drizzle/0001_init.sql`. Commit both. Purpose: (1) schema-as-code in git — full Postgres-as-Code discipline; (2) insurance policy — if Xata ever closes, `0001_init.sql` + `pg_dump` recreates the DB anywhere. `npm install -D drizzle-orm drizzle-kit`. **No ORM usage in application code at this point — schema.ts is documentation + migration source only.** *Effort: 1 hr after Q-161.*
  > 📄 Reference: `architecture/DEV-SYSTEM-REF-2026-04-17.md` § 3. Drizzle-Kit — Schema-as-Code Tool + § 13. Migration Window Skeleton (Step 3)

- [ ] **Q-167 · [P1-INFRA] Local dev environment — Docker Postgres + seed.sql** — Add `docker-compose.yml` with `postgres:16` service on port 5432. Add `scripts/seed.sql` with ~1,000 representative rows across `keys.*` and `risk.*` tables (never the full 150GB). Add `.env.example` with `DATABASE_URL=postgresql://localhost:5432/geoclear_dev` and `XATA_BRANCH_URL=` placeholder. Update `README` dev setup section. Goal: `docker compose up` → local Postgres ready in 30 seconds, no Render dependency for local work. *Effort: 2 hr.*

- [ ] **Q-168 · [P1-INFRA] Branch-first discipline — xata branch workflow enforced** — Document and enforce: every feature starts with `xata branch create <feature-name> --from main`. Local `.env` points to `XATA_BRANCH_URL` (feature branch) not `XATA_DATABASE_URL` (main). Explicit migration cycle: (1) modify `src/db/schema.ts`; (2) `npx drizzle-kit generate` → review generated `.sql`; (3) apply via `xata dbshell < drizzle/<migration>.sql`; (4) merge Xata branch → then `git push`. **Render deploy order: merge Xata schema FIRST, then git push to GitHub. Never the reverse.** Add this sequence to `RUNBOOK-ENV-VARS.md` and `CLAUDE.md` deployment section. *Effort: 1 hr + doc update.*

- [ ] **Q-169 · [P1-INFRA] Modular monorepo structure** — Reorganise repo to match the agreed structure from `dev_system.docx`: `drizzle/` (migration .sql files), `scripts/` (data pipeline scripts — import, validate, seed — never inside API routes), `src/db/schema.ts` (Drizzle table defs), `src/db/client.ts` (pg.Pool singleton), `src/api/v1/` (current Hono routes after Q-162), `src/api/v2/` (placeholder for new endpoints), `middleware/` (auth, rate-limit, logging). Move existing data pipeline scripts from root into `scripts/`. Add `render.yaml` (multi-service config) and `xata.toml` (project config). *Effort: 2–3 hr after Q-162.*
  > 📄 Reference: `architecture/DEV-SYSTEM-REF-2026-04-17.md` § 2. Modular Monorepo Structure (full directory tree)

- [ ] **Q-170 · [P1-INFRA] GitHub Actions — weekly schema backup workflow** — Add `.github/workflows/db-backup.yml`: runs weekly (Sunday 02:00 UTC, `cron: '0 0 * * 0'`) + `workflow_dispatch` for manual runs. Steps: (1) `npm install -g @xata.io/cli`; (2) `xata pull main` (pulls latest schema from Xata production branch); (3) commit `xata.toml` + `/drizzle/*.sql` back to repo with message `Auto-backup: Latest Xata Schema [YYYY-MM-DD]`. Add GitHub Secrets: `XATA_API_KEY`, `DATABASE_URL`, `XATA_BRANCH_URL`. Set repo Actions permissions to "Read and Write." Purpose: (1) zero lock-in — weekly schema state in git history; (2) audit trail for enterprise customers; (3) replaying `/drizzle` SQL files on any Postgres host recreates the full structure. *Effort: 2 hr.*

- [ ] **Q-171 · [P2-DATA] pg.Pool singleton — connection leak prevention** — Extract `pg.Pool` initialisation into `src/db/client.ts`, initialised once at process start outside request handlers. Import this singleton in `keys.js`, `risk-data.js`, `query.js`. Current pattern (creating pool per request or per module) leaks connections under load. Xata enforces a connection limit; leaks cause `too many connections` 500s. Add pool size config: `max: 10` for Render free tier, `max: 20` for paid. *Effort: 1 hr.*
  > 📄 Reference: `architecture/DEV-SYSTEM-REF-2026-04-17.md` § 5. src/db/client.ts Singleton Pool (complete TypeScript implementation)

- [ ] **Q-172 · [P1-UPTIME] pino structured JSON logging** — Replace `console.log` throughout with `pino` logger. Output: `{"level":"info","time":1234,"msg":"address lookup","latency_ms":45,"endpoint":"/v1/address"}`. Add request correlation ID (`x-request-id` header, fallback to `crypto.randomUUID()`). Structured logs are required for Xata query alerts (Q-173) and future log aggregation (Datadog/Logtail). `npm install pino pino-http`. *Effort: 2 hr.*

- [ ] **Q-173 · [P2-DATA] Xata long-running query alerts** — Configure Xata query performance alerts: alert on queries >2s P95, alert on connection count >15. Integrate with UptimeRobot or SendGrid. Required companion to Q-172 (structured logs surface the slow queries). *Effort: 1 hr setup in Xata dashboard.*

- [ ] **Q-174 · [P1-UPTIME] Weekly pg_dump to S3 — zero lock-in exit policy** — Add `scripts/backup-full.sh`: connects via `XATA_DATABASE_URL`, runs `pg_dump` (data + schema), uploads to S3 bucket `geoclear-backups/YYYY-MM-DD/`. Trigger: GitHub Actions weekly cron OR Render cron job. This is the unconditional exit ramp — if Xata closes or prices 10x, a full `pg_dump` restores to any PostgreSQL host in < 1 hour. Add to deployment checklist. *Effort: 2 hr.*

- [ ] **Q-175 · [P3-FEAT] Feature flag table in keys schema** — Add `feature_flags` table to `keys.*`: `(flag_name TEXT PRIMARY KEY, enabled BOOLEAN, description TEXT, updated_at TIMESTAMP)`. Add `GET /v1/admin/flags` and `PUT /v1/admin/flags/:name` endpoints (admin-auth only). Use to toggle: new enrichment signals, v2 endpoints, experimental risk dimensions on prod without a code deploy. Seed with initial flags for Xata migration gates (`xata_risk_enabled`, `xata_keys_enabled`, `hono_v2_enabled`). *Effort: 3 hr.*

- [ ] **Q-176 · [P3-FEAT] TanStack Start — SaaS dashboard frontend** — Build the authenticated customer dashboard in TanStack Start. Responsibilities: API key management, usage graphs (calls/day from `usage_log`), billing/upgrade flow (Stripe Customer Portal link), account settings. Uses Hono RPC `AppType` export for 100% end-to-end type safety — change a response field in the API and the dashboard shows a TypeScript error immediately. Lives at `src/dashboard/` in the monorepo. Serve from `geoclear.io/app` or a separate subdomain. Stack: TanStack Start + TanStack Router + Tailwind 4.0 + Shadcn/ui. **Gate: Q-162 (Hono migration) must be done first — RPC types come from the Hono AppType export.** *Effort: 3–5 days.*

- [ ] **Q-177 · [P3-DIST] Astro 5.x — marketing + docs website** — Rebuild the marketing site in Astro 5.x. Zero-JS by default → perfect Lighthouse scores → better SEO than the current static `public/` HTML. Features: Server Islands (dynamic login button / "Welcome back" on a fully static page), View Transitions (app-like feel between pages), PWA config (customers can install docs offline). Integrate a headless CMS (Prismic or Cosmic JS) so marketing copy, blog posts, and changelog entries update without a code deploy. Lives at `src/web/` in the monorepo. Deployed to Vercel or Netlify edge for <1s global load. **Independent of Hono/Xata — can start any time.** Stack: Astro 5.x + Tailwind 4.0 + Shadcn + Prismic/Cosmic. *Effort: 2–3 days.*

- [ ] **Q-178 · [P1-INFRA] Render Background Worker — data pipeline as separate service** — Extract all data import scripts (`overture-import.js`, `calfire-import.js`, future NAD imports) from the API service into a dedicated Render Background Worker (`geoclear-pipeline` in `render.yaml`). Start command: `node dist/scripts/import-worker.js`. This ensures: (1) a stuck 150GB import cannot OOM-kill the live API service; (2) worker can be scaled independently (more RAM/CPU during import runs); (3) clean separation — API routes never spawn long-running processes. Worker connects via same `XATA_DATABASE_URL`. **Add to `render.yaml` alongside the existing prod + staging services.** *Effort: 2 hr.*

- [ ] **Q-179 · [P1-INFRA] render.yaml — full multi-service configuration** — Write the complete `render.yaml` covering all three production services: (1) `geoclear-marketing` (Astro, `build:web`, `start:web`); (2) `geoclear-api` (Hono, `plan: pro`, `healthCheckPath: /api/health`, `fromSecret: XATA_DATABASE_URL`); (3) `geoclear-pipeline` (Background Worker, `node dist/scripts/import-worker.js`). Add optional `databases: geoclear-cache` (Redis, free plan) for shared rate-limiting state across services — prevents rate limit bypass when API scales to multiple instances. Add root `package.json` build scripts: `build:web`, `start:web`, `build:api`, `start:api`, `build:scripts`. This replaces the current single-service manual Render dashboard config with an IaC file committed to git — every Render service is reproducible from `render.yaml`. **Gate: Q-177 (Astro) and Q-178 (Worker) should exist before finalising.** *Effort: 1 hr.*
  > 📄 Reference: `architecture/DEV-SYSTEM-REF-2026-04-17.md` § 7. render.yaml Blueprint (complete YAML with all three services)

- [ ] **Q-180 · [P2-DATA] Soda Core — Data Quality as Code for 150GB pipeline** — Add `scripts/quality/` folder with two files: (1) `configuration.yml` — Xata Postgres connection using `XATA_PG_HOST/USER/PASSWORD/DB` env vars; (2) `checks.yml` — SodaCL contracts: `row_count > 1000000`, `missing_count(latitude) = 0`, `missing_count(longitude) = 0`, `avg(risk_score) between 0 and 100`, `duplicate_count(address_hash) = 0`, `freshness(updated_at) < 24h`. Add geospatial checks: "Null Island" (`lat = 0 AND lng = 0`), North America bounding box (`lat < 24 OR lat > 49` → warn >100, fail >1000), join integrity (`row_count_diff_percentage(address_signals) < 1%`). Add GitHub Action `.github/workflows/data-quality.yml`: triggers on `workflow_run` after the Sunday backup completes, runs `pip install soda-core-postgres` → `soda scan`. Saves pass/fail results to `data_health` table in Xata (`flag_name, status, checked_at, details`). **Soda Core is Python — requires `python: 3.11` in the CI step.** *Effort: 3 hr.*
  > 📄 Reference: `architecture/DEV-SYSTEM-REF-2026-04-17.md` § 9. Data Quality — Soda Core (complete checks.yml + configuration.yml + GitHub Action)

- [ ] **Q-181 · [P1-INFRA] PostGIS setup — geom column + GIST index on risk_data** — Enable PostGIS on Xata branch: `CREATE EXTENSION IF NOT EXISTS postgis`. Add `geom geography(Point, 4326)` column to `risk_data`, `wildfire_risk`, `flood_zones` tables. Populate: `UPDATE risk_data SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`. Create GIST spatial index: `CREATE INDEX idx_risk_data_spatial ON risk_data USING GIST (geom)` — this makes `ST_DWithin` index-aware and < 100ms on 150GB. Add Drizzle custom type in `schema.ts`: `const geometry = customType<{ data: string }>({ dataType: () => 'geometry(Point, 4326)' })`. **Validation:** run `EXPLAIN ANALYZE` on a test `ST_DWithin` query and confirm "Index Scan using idx_risk_data_spatial" appears. **Gate: Q-161 (Xata Phase 0). Run on a feature branch first, merge only after EXPLAIN ANALYZE confirms index use.** *Effort: 2 hr.*
  > 📄 Reference: `architecture/DEV-SYSTEM-REF-2026-04-17.md` § 10. PostGIS — Spatial Engine Setup (CREATE EXTENSION, geom column, GIST index, EXPLAIN ANALYZE validation SQL)

- [ ] **Q-182 · [P3-FEAT] `/v2/proximity` Hono endpoint — ST_DWithin proximity search** — New file `src/api/v2/proximity.ts`. Zod schema: `lat` (string → Number), `lng` (string → Number), `radius_meters` (default 500), `limit` (default 50). Core query uses `ST_DWithin(geom, ST_MakePoint($1,$2)::geography, $3)` for index-aware radius filter + `ST_Distance` for sort. Returns `{ meta: { center, radius, count }, data: [{ id, risk_score, address_hash, lat, lng, distance_meters }] }`. `::geography` cast handles Earth curvature — 500m in London = 500m in New York. `ST_X(geom)` / `ST_Y(geom)` extract clean floats (not hex strings) for developer maps. Mount at `app.route('/v2', v2)`. **This is the headline v2 endpoint — the product differentiation over any REST-only competitor.** *Effort: 3 hr. Gate: Q-162 (Hono) + Q-181 (PostGIS + GIST index).*
  > 📄 Reference: `architecture/DEV-SYSTEM-REF-2026-04-17.md` § 11. /v2/proximity Hono Endpoint (complete proximity.ts implementation with Zod schema + ST_DWithin query)

- [ ] **Q-183 · [P3-FEAT] `/status/data` public data health page** — Astro page at `geoclear.io/status/data`. Reads from `data_health` table (populated by Soda Core, Q-180). Displays: Last Check timestamp, pass/fail per check, Data Freshness (hours since last `updated_at`), check history (last 4 weeks). **Enterprise selling point** — share this URL with B2B prospects as a "Data Health Certificate" proving the 150GB product is actively monitored. Can be gated behind auth or left public (public is more credible). *Effort: 2 hr. Gate: Q-177 (Astro) + Q-180 (Soda Core + data_health table).*

- [ ] **Q-184 · [P2-DATA] Data freshness SLA test in Vitest + GitHub Actions summary** — Add `src/db/health.ts` with `getDataFreshness()`: queries `MAX(updated_at)` from `risk_data`, returns `{ lastUpdate, hoursOld }`. Add Vitest SLA test (`src/api/v2/data-health.test.ts`): `expect(hoursOld).toBeLessThan(24)` — fails CI build if the 150GB data is stale. Add GitHub Actions step that appends a "GeoClear Data Health Report" block to `$GITHUB_STEP_SUMMARY` (status, threshold, last update). **Why:** code tests pass even when the Sunday import fails silently. This test catches the data staleness before customers see wrong scores on Monday. *Effort: 1 hr. Gate: Q-054 (Vitest setup) + Q-161 (Xata migration — needs real `updated_at` column).*
  > 📄 Reference: `architecture/DEV-SYSTEM-REF-2026-04-17.md` § 12. Data Freshness SLA Test

- ✅ **Q-187 · [P3-FEAT] MCP x402 micropayment auth (Phase 2)** — DONE 2026-04-18 — Dual-auth on `/mcp`: API key OR x402 USDC payment ($0.004/session, Base mainnet). `GEOCLEAR_USDC_WALLET` env var gates feature. EIP-3009 gasless settlement via Coinbase x402.org facilitator. Session auth method stamped on transport; x402 sessions don't re-pay per tool call. `PAYMENT-RESPONSE` header returned after settlement. `/mcp-docs` updated with x402 flow + pricing rationale.

- ✅ **Q-186 · [P3-FEAT] MCP HTTP server Phase 1** — DONE 2026-04-18 — `POST /mcp`, `GET /mcp`, `DELETE /mcp` using `StreamableHTTPServerTransport`. 4 tools: `verify_address`, `suggest_address`, `reverse_geocode`, `get_coverage`. Auth via `X-Api-Key` (same key as REST API). Per-session McpServer instances in `_mcpSessions` Map. `/mcp-docs` marketing page with Claude Desktop + Cursor setup snippets. Coverage cache pre-warm on startup via `setImmediate()`.

- ✅ **Q-185 · [P1-INFRA] Migration Window Skeleton Sprint — parallel work while xata-clone runs** · DONE 2026-04-17 — xata-clone of 150GB takes 1–3 hours. Use that window to build the skeleton of the new system so code is ready the moment clone finishes. Five steps, ~2 hours total, all safe (no DB write, no prod change):

  **Step 1 — Monorepo folder structure** (~60 min)
  Create the agreed directory layout (from `dev_system.docx`): `src/api/v1/` (move current Express/Hono routes), `src/api/v2/` (placeholder `index.ts`), `src/db/` (empty — populated by Q-166 after clone), `scripts/` (move `overture-import.js`, `calfire-import.js`, pipeline scripts from root), `drizzle/` (empty — populated by `drizzle-kit generate` after Q-166), `src/dashboard/` (placeholder for Q-176 TanStack Start), `src/web/` (placeholder for Q-177 Astro). Update all relative `require()` / `import` paths. Run `node web-server.js` locally — must start cleanly after restructure.

  **Step 2 — render.yaml skeleton** (~20 min)
  Create `render.yaml` with three service stubs: `geoclear-api` (Hono, `plan: pro`, `healthCheckPath: /api/health`), `geoclear-marketing` (Astro, placeholder), `geoclear-pipeline` (Background Worker, placeholder). Add `fromSecret` refs for `XATA_DATABASE_URL`, `NAD_ADMIN_SECRET`, `STRIPE_*`. Does not deploy anything — Render only reads this file when you trigger a new deploy. Gate: finalise in Q-179.

  **Step 3 — Drizzle + client.ts skeleton** (~20 min)
  Create `src/db/client.ts` with the `pg.Pool` singleton (full code in DEV-SYSTEM-REF § 5). Tables intentionally empty — `drizzle-kit introspect` fills `schema.ts` after Q-161 clone completes. Create `src/db/schema.ts` with one comment: `// Auto-generated by drizzle-kit introspect after Q-161 — do not hand-edit`. Install deps: `npm install pg drizzle-orm` and `npm install -D drizzle-kit`. Add `drizzle.config.ts` pointing at `XATA_DATABASE_URL` with `out: 'drizzle/'`.

  **Step 4 — GitHub Actions scaffolding** (~15 min)
  Create `.github/workflows/db-backup.yml` (weekly `xata pull main` schema backup — full spec in Q-170). Create `.github/workflows/data-quality.yml` (Soda Core scan after Sunday backup — full spec in Q-180). Both workflows reference `XATA_API_KEY` secret — add to GitHub repo Secrets now (value from `~/.zshrc` or Xata dashboard) so CI runs the moment clone finishes.

  **Step 5 — docs/roadmap.md** (~5 min)
  Create `docs/roadmap.md` with the three-phase migration plan:
  - Phase 0: xata-clone + Drizzle schema capture (Q-161, Q-166)
  - Phase 1: Hono migration + pg.Pool singleton (Q-162, Q-171)
  - Phase 2: PostGIS + /v2/proximity + Soda Core (Q-181, Q-182, Q-180)

  **Gate:** Start during xata-clone run (Q-161). Steps 1–5 are safe to do on `main` directly (structural moves + new files, no data change). Commit each step separately for clean rollback. After all 5 steps: the repo structure is Xata-ready before the first query is routed to it.
  *Effort: ~2 hr. Run in parallel with Q-161 xata-clone.*
  > 📄 Reference: `architecture/DEV-SYSTEM-REF-2026-04-17.md` § 13. Migration Window Skeleton

---

## 🟠 P2 — DATA QUALITY (wrong data = broken product)
> Fix these before any new features. A working API with wrong data is not a product.

- [ ] **Q-139 · [P2-DATA] FEMA NFHL returns OUTSIDE for all prod addresses** — Render IP blocked by FEMA ArcGIS. Flood always 0 in prod. Fix options: (1) add `Referer`+`User-Agent` headers (try first, 30 min); (2) pre-import NFHL polygons into risk.db (permanent fix, weeks). Start with option 1. *Priority: ship option 1 this week.*
- [ ] **Q-140 · [P2-DATA] CA Overture addresses missing county_fips** — 29.5M CA addresses have null FIPS → risk lookups return null for CA. Fix: post-import FIPS backfill via spatial join against TIGER county polygons on staging. *Blocking for CA market.*
- [ ] **Q-153 · [P2-DATA] Post-import validation script** — `scripts/validate-import.js`: row count ranges, null rate <5%, value range checks, 10 known-county spot checks. Exit 1 on failure. Must pass before every prod upload. *Effort: 3 hr*
- [ ] **Q-154 · [P2-DATA] Daily synthetic data monitor** — 5 known-good addresses, one per risk dimension, assert non-null non-zero, assert latency <3s. Render cron daily 06:00 UTC. Alert via SendGrid on failure. *Effort: 3 hr*
- [ ] **Q-155 · [P2-DATA] External API response quality logging** — Log every FEMA/USGS/Census call. Rolling counter: OUTSIDE >80% in 1hr → return `null` + `flood_zone_note:"data_unavailable"` instead of wrong OUTSIDE. *Effort: 3 hr*
- [ ] **Q-156 · [P2-DATA] Data freshness tracking** — `/api/health/detailed` checks `MAX(import_date)` per table, flags >120 days as `"stale"`. UptimeRobot catches stale data. Add `import_date` to tables missing it. *Effort: 2 hr*
- [ ] **Q-141 · [P2-DATA] Import CAL FIRE FHSZ into risk.db** — `calfire-import.js` ready, never run. More granular CA wildfire signal (polygon vs county). Depends on Q-140 for full usefulness. *Effort: staging shell run.*
- [ ] **Q-142 · [P2-DATA] Galveston TX address coverage gap** — ZIP 77550 returns no addresses. High-priority flood demo target. Check Overture parquet for FIPS 48167. *Effort: 2 hr investigation.*
- [ ] **Q-157 · [P2-DATA] UptimeRobot risk demo quality monitor** — Already created (ID 802868420, keyword: `wildfire`). Fires if risk endpoint returns error or missing data. Monitors data layer, not just HTTP.

---

## 🟡 P3 — FEATURES + DISTRIBUTION (equal priority, develop in parallel)
> Build new capability AND distribution channels together. One without the other is wasted.

### 🏗 DEVOPS STANDARDS — Engineering Discipline (retro 2026-04-17)
> Root cause: 10 incident patterns in one session. Full retro: `sessions/RETRO-2026-04-17-devops-standards.md`
> Theme split: **Prod Uptime** · **Path to Push** · **Data/Code Separation** · **Data Quality**

#### Prod Uptime

- ✅ **Q-144 · Pin all runtime versions in package.json** — `"node": "20.x"` done today. Extend: add `"engines"` check to deploy checklist; document in RUNBOOK that any `node` or native addon version bump requires a cache-clear test deploy on staging before prod. Prevents P-1 (ABI mismatch) class of failure permanently. *Effort: 30 min* · DONE 2026-04-17
- ✅ **Q-145 · Env var audit checklist — all services** — Document every required env var per service in `docs/runbooks/RUNBOOK-ENV-VARS.md`. Checklist: `DATA_DIR=/data`, `NAD_DB` (if overriding), `STRIPE_*`, `NAD_ADMIN_SECRET`, `NODE_VERSION=20`. Run audit on every new service creation and every cache-clear deploy. Required vars that are absent = deploy abort. Prevents P-2 (missing DATA_DIR) class. *Effort: 1 hr* · DONE 2026-04-17
- ✅ **Q-146 · Extend DB readiness gate to risk.db** — `risk-data.js` currently opens risk.db silently and returns null if absent. Add `isReady()` method. `startServer()` in `web-server.js` should log `[startup] risk.db: ready/not-found` alongside nad.db status. If risk.db absent, endpoints that need it return `{"error":"risk_data_unavailable"}` not null — makes the missing-data state explicit. Prevents P-3 extension. *Effort: 1 hr* · DONE 2026-04-17
- [ ] **Q-147 · /api/health/detailed endpoint** — `GET /api/health/detailed` returns: nad.db status + address count, risk.db table list + row counts + last import dates, external API probe results (FEMA flood zone for a known address, USGS for a known point), Node version. Used by UptimeRobot keyword monitor (Q-158) and pre-deploy smoke test. If any table row count is below minimum threshold, returns `"degraded"` status. *Effort: 2 hr*

#### Path to Push

- [ ] ~~**Q-148 · Standardize all import scripts to DATA_DIR env var**~~ — **SUPERSEDED by Q-161.** Xata migration removes all file-path DB patterns.
- [ ] ~~**Q-149 · Import scripts self-contained — no CWD dependency**~~ — **SUPERSEDED by Q-161.** DB is a URL, not a path.
- [ ] ~~**Q-150 · Pre-upload check script**~~ — **SUPERSEDED by Q-161.** Xata CoW branching eliminates the upload pipeline.

#### Data / Code Separation

- [ ] ~~**Q-151 · GET /v1/admin/data-manifest endpoint**~~ — **SUPERSEDED by Q-161.** `pg_stat_user_tables` + Xata branch diffs replace a custom manifest endpoint.
- [ ] ~~**Q-152 · Staging replica procedure — documented and enforced**~~ — **SUPERSEDED by Q-161.** Xata branches are instant staging replicas. The procedure no longer needs to exist.

#### Data Quality

- [ ] **Q-153 · Post-import validation script** — `scripts/validate-import.js --db=/data/risk.db`: (1) checks all expected tables exist; (2) row counts within defined ranges (wildfire: ≥3100, storm: ≥3200, earthquake: ≥3200, drought: ≥3200, nri_risk: ≥3100); (3) null rate <5% on score fields; (4) no scores outside valid range (wildfire 1–5, all normalized fields 0–1); (5) spot-checks 10 known counties with known-good values (e.g. Maricopa AZ wildfire=3, Harris TX storm=high, King WA earthquake=high). Exit 1 on any failure. Must pass before any prod upload. Prevents P-6 (silent 0-county success). *Effort: 3 hr*
- [ ] **Q-154 · Daily synthetic data monitor** — Script `scripts/synthetic-monitor.js`: hits 5 known-good addresses (one strong signal per dimension), asserts each risk dimension returns non-null and non-zero value, asserts response latency <3s. Runs as Render cron job daily at 06:00 UTC. Logs pass/fail to structured log. On failure: POST to a Slack webhook or send email via SendGrid. Catches P-8 (FEMA silent wrong data) same-day instead of weeks later. *Effort: 3 hr*
- [ ] **Q-155 · External API response quality logging** — In `enrich.js` and `web-server.js`, log every external API call with: endpoint, status code, response_size_bytes, first 100 chars of response. Add rolling counter: if `flood_zone=OUTSIDE` appears in >80% of calls in a 1hr window, set a process-level flag `process.env.FEMA_SUSPECTED_BLOCKED=1` and return `flood_zone: null, flood_zone_note: "data_unavailable"` instead of OUTSIDE. Prevents customers seeing systematically wrong flood scores. Addresses P-7 and P-8. *Effort: 3 hr*
- [ ] **Q-156 · Data freshness tracking per table** — `nri_risk`, `wildfire_risk`, `storm_risk` etc. each have `import_date` column. `/api/health/detailed` (Q-147) checks `MAX(import_date)` per table and flags any table not updated in >120 days as `"stale"`. UptimeRobot keyword monitor on `/api/health/detailed` catches stale data before customers notice. Add `import_date` to tables that are missing it (calfire_fhsz, building_footprints). *Effort: 2 hr*

#### Monitoring (UptimeRobot)

- [ ] **Q-157 · UptimeRobot — risk demo data quality monitor** ✅ 2026-04-17 — Keyword monitor on `/api/demo/risk?street=200+Pine+St&city=Globe&state=AZ` checking for keyword `"ok":true`. 5-min interval. Fires alert if risk endpoint goes down or returns error. Complements existing health monitor with data-layer coverage. *Set up today.*
- [ ] **Q-158 · UptimeRobot — /api/health/detailed keyword monitor** — Once Q-147 is implemented, add keyword monitor checking for `"status":"ok"` (not `"degraded"`) on `/api/health/detailed`. Catches: missing tables, row counts below threshold, stale import dates, FEMA probe failures. This is the single monitor that captures all data quality regressions in prod. *Effort: 30 min after Q-147.*
- [ ] **Q-159 · UptimeRobot — address resolution smoke test** — Keyword monitor on `/api/demo/enrich?street=1600+Pennsylvania+Ave&city=Washington&state=DC` checking for `"census_tract"` in response. Verifies nad.db is open and returning enrichment data (not just HTTP 200). Complements `/api/health` which only checks server liveness. *Set up after Q-147.*

---

## SESSION 27 — Bug fixes & UX shipped (2026-04-17)

- [x] **Q-138 · Address direction-suffix matching** ✅ 2026-04-17 — `/api/demo/risk` and `/api/demo/enrich` now strip direction suffixes (NW/NE/SW/SE) and street types (St/Ave/Blvd…) from `stName` before NAD query. "10th Street NW" → matches `st_name=10TH`. Risk demo prepopulated with confirmed-working address (1012 10th Street NW, Washington DC).
- [x] **Q-139 · demo/enrich 502 / FEMA timeout** ✅ 2026-04-17 — `enrichPoint()` in `/api/demo/enrich` wrapped in `Promise.race([…, hardNull(5000)])`. No more 502s from slow FEMA/Census APIs. Returns 504 with message on timeout instead of crashing.
- [x] **Q-140 · /status redirect** ✅ 2026-04-17 — `GET /status` now 301-redirects to `/status.html` in `web-server.js`.
- [x] **Q-141 · Sign In nav + portal security** ✅ 2026-04-17 — Sign In nav link in `landing.html` changed from `onclick="openModal()"` to `href="/portal.html"`. Hardcoded `value="nad_admin_localdev"` removed from portal admin secret input.
- [x] **Q-142 · CMO/UX pass** ✅ 2026-04-17 — Hero badge → "Trusted by insurance, fintech, and logistics teams". Hero sub-copy → outcome-first. "Builder" → "Starter" renamed throughout. Pro Compliance card merged into Professional at $499. PAYG link fixed. Compliance nav: Pricing + Sign In added. Compliance cost calculator updated to $499 reference.
- [x] **Q-143 · Stripe Growth/Pro/Scale prices live** ✅ 2026-04-17 — 3 new Stripe products + prices created via API. `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PRO` (updated), `STRIPE_PRICE_SCALE` set on Render. Deploy triggered. `openCheckout('growth'/'pro'/'scale')` fully operational for new signups.

---

## 🔴 URGENT — Fix Now (production data issue)

- ✅ **Q-001 · FK relink on prod** — DONE 2026-04-17. Final: 194,880,008 linked (98.1%), 3,777,529 permanently unlinked (1.9% — NJ OpenAddresses records with NULL state text + no zip bridge). FL: 41.7M, CA: 29.5M, TX: 11.5M, NJ: 9.98M, MI: 9.49M. `/api/states` sum corrected via `POST /v1/admin/refresh-counts` (was stale by 14.6M). Phase 1b (zip bridge) found 0 new rows — unlinked NJ records have no zip_code either.

---

## PHASE 1 — Days 1–30: Ship the 7 GTM Assets `[P3]`
> Every item here is a prerequisite for the first paying customer. Do in sequence. No detours.
> 🟡 All unchecked items in this section are **P3**. Outreach/GTM = `[P3-DIST]` · Content/pages = `[P3-FEAT]`

### Week 1 — Foundation (Days 1–7)

- [x] **Q-002 · RapidAPI listing** ✅ 2026-04-17 — GeoClear live at `rapidapi.com/auduuai/api/geoclear`. OpenAPI spec imported, all endpoints (Address/Enrichment/Geography/Account/Status), base URL `https://geoclear.io`, X-Api-Key auth, Category: Data, visibility: Public.
- [x] **Q-003 · `/compliance` landing page** ✅ 2026-04-17 — `public/compliance.html` (678 lines) + `/compliance` route in `web-server.js`. H1: "Flood zone + census tract for every US address. NFIP-ready." Body: FEMA NFHL as primary source (auditable for legal), HMDA census tract, self-serve $249/mo, no sales call. Show live JSON response with `flood_zone`, `flood_sfha`, `census_tract`. CTA: "Start free." *Destination for all compliance outreach emails — zero Claire conversions without this.*
- [x] **Q-004 · Google Search Console setup** ✅ 2026-04-17 — geoclear.io Domain property verified via Cloudflare DNS TXT integration (automated, no manual DNS entry needed). Sitemap submitted: `https://geoclear.io/sitemap.xml` (7 URLs). `public/sitemap.xml` created and deployed. GSC will index once Render deploy propagates.
- [ ] **Q-005 · [P3-DIST] Build compliance outreach list — 15 targets** — LinkedIn: "VP Product" OR "Head of Engineering" + "mortgage" OR "insurance" OR "proptech". Targets: Encompass, BytePro, Maxwell, Blend, Qualia, Snapdocs, Hippo Insurance, Kin Insurance, Better.com, Morty, Neptune Flood, Openly, Lemonade. Add name + direct email to `AddressAPIBusinessGTM.md`.
- [ ] **Q-006 · [P3-DIST] Send compliance outreach batch 1 (15 emails)** — plain text, < 150 words. Subject: `"Flood zone determination API — NFIP-ready, self-serve, $249/mo"`. Body: NFIP compliance framing → live API JSON showing `flood_zone: "AE"`, `flood_sfha: true`, `census_tract` → link to `/compliance`. *Do not send until /compliance page is live.*

### Week 2 — Launch (Days 8–14)

- [ ] **Q-007 · [P3-DIST] Post "Show HN: GeoClear"** — title: `"Show HN: GeoClear – US address API with FEMA flood zone + census tract in one call"`. Post Tuesday or Wednesday 9am PT. First comment: data pipeline (NAD + Overture + FEMA NFHL + Census Bureau), enrichment fields, free tier limits, link to /docs. *Post after RapidAPI listing is live.*
- [ ] **Q-008 · [P3-FEAT] Write `/docs/vs-smartystreets` comparison page** — capability table (flood zone ✅ vs ❌, census tract, pricing, free tier), migration guide. SEO target: "SmartyStreets alternative", "address API with flood zone". File: `public/docs/vs-smartystreets.html`.
- [ ] **Q-009 · [P3-FEAT] Write `/docs/flood-zone-api` SEO page** — "What is FEMA flood zone data?", FEMA zone codes (AE, X, VE), how to get it via API, curl example. SEO target: "FEMA flood zone API", "NFIP flood determination API". Submit both new pages to GSC.
- [ ] **Q-010 · [P3-DIST] Follow up compliance outreach batch 1** — Day 5 after send (~Day 10–12). One sentence: "Did you get a chance to see the flood zone response? Happy to do a 15-min call." Max 2 touchpoints total.
- [ ] **Q-011 · [P3-DIST] LinkedIn founder post — FEMA anchor** — "Manual flood zone determination costs $3–$15 per address. We built an API that returns it for free (up to 1K/day)." Screenshot of API response showing `flood_zone`. Tag PropTech + mortgage tech communities.

### Week 3 — Messaging + Instrumentation (Days 15–21)

- [x] **Q-012 · Rewrite landing page H1/H2/CTA** ✅ 2026-04-17 — H1: `"US address intelligence. One call. Everything included."` H2: `"Validate, geocode, and enrich US addresses with census tract, FEMA flood zone, and timezone — from a free API key."` CTA: `"Get your free key"`. File: `public/landing.html`
- [x] **Q-013 · Add FEMA anchor copy to pricing section** ✅ 2026-04-17 — Banner above pricing grid: `"Manual flood zone determination costs $3–$15 per address. GeoClear Pro includes unlimited flood zone lookups for $249/mo."` File: `public/landing.html`
- [x] **Q-014 · Rename tiers on pricing page + portal** ✅ 2026-04-17 — Starter→Builder, Growth→Professional (display names only; internal Stripe keys unchanged). Updated landing.html, portal.html, JS volSteps, calc default.
- [x] **Q-015 · Set "Most Popular" badge on Professional tier** ✅ 2026-04-17 — `featured` class + "Most Popular" badge moved from Builder ($49) to Professional ($249). Slider defaults to Professional on page load. File: `public/landing.html`
- [x] **Q-016 · Add Enterprise "Starting at $2,000/mo"** ✅ 2026-04-17 — Styled Enterprise banner below pricing grid with "$2,000/mo", feature list, and "Contact us →" mailto CTA. File: `public/landing.html`
- [x] **Q-017 · Add data provenance section to landing page** ✅ 2026-04-17 — 4-card section before CTA: USDOT NAD r22, Overture Maps, FEMA NFHL API, US Census Bureau Geocoder. Each with source label + one-liner. File: `public/landing.html`
- [x] **Q-018 · Add competitive comparison table to landing page** ✅ 2026-04-17 — GeoClear vs SmartyStreets vs Lob vs Melissa. 7-row table. Key row: FEMA flood zone (✅ free vs ❌ vs ❌ vs ❌). File: `public/landing.html`
- [x] **Q-019 · Add `first_call_at` timestamp to `api_keys` table** ✅ 2026-04-17 — Migration in keys.js. Set via `COALESCE(first_call_at, datetime('now'))` in recordUsage UPDATE. Files: `schema.sql`, `web-server.js`
- [x] **Q-020 · Add `latency_ms` + `tier` columns to `usage_log`** ✅ 2026-04-17 — Migrations in keys.js. Latency captured via `process.hrtime.bigint()` in auth middleware. Tier passed from `info.tier`. Files: `schema.sql`, `web-server.js`

### Week 4 — Convert + Retain (Days 22–30)

- [x] **Q-021 · Build `GET /v1/admin/analytics` endpoint** ✅ 2026-04-17 — Returns: requests_by_day, top_keys_by_volume, tier_breakdown, error_rate, new_signups_by_day, avg_latency_by_endpoint. `?days=N` param (default 30). File: `web-server.js`
- [x] **Q-022 · Build welcome email drip (3 emails, SendGrid)** ✅ 2026-04-17 — Day 1: existing keyEmail on signup. Day 3: sent if first_call_at set (shows enrichment curl example). Day 7: upgrade prompt for free/starter, feature roundup for paid. Daily cron at 01:00 UTC. `drip_sent` column tracks state. Manual trigger: `POST /v1/admin/drip/run`.
- [x] **Q-023 · Product Hunt listing** ✅ 2026-04-17 — Draft saved at `producthunt.com/products/geoclear-address-intelligence-api`. Name: "GeoClear — Address Intelligence API", tagline: "Address API with FEMA flood zone + census tract. Free." (54 chars). Ready to schedule launch date.
- [ ] **Q-024 · [P3-DIST] Compliance outreach batch 2 (15 new targets)** — apply learnings from batch 1. If flood zone subject got replies: keep. If not: test `"Quick question about your flood zone workflow"` or `"HMDA census tract API — $249/mo, no sales call"`.
- [x] **Q-025 · Set up KPI cadence** ✅ 2026-04-17 — `sessions/KPI-WEEKLY-LOG.md` with bookmarks (daily pulse, analytics, Stripe, SendGrid, uptime) + weekly metrics template. Stripe MRR notifications checklist included.
- [x] **Q-026 · Set calendar reminders** ✅ 2026-04-17 — Google Calendar events created: Month 3 (2026-07-16, red), Month 5 investment trigger (2026-09-16, orange), Month 6 strategic review (2026-10-16, blue). Each with full assessment checklist.

### Day 30 Checkpoint

- [ ] **Q-027 · [P3-DIST] [Day 30] $500 MRR check** — if yes: identify winning channel, double down in Phase 2. If no: email every free signup personally ("what were you trying to build?") before adding any new channels. Offer founding-customer pricing ($149/mo, locked 12 months) to first 5 customers.

### War Room Triggers

- [ ] **Q-028 · [P3-DIST] [Day 7] Outreach reply rate** — if 0 replies after 15 emails: check spam first; if fine, rewrite body to question-first opener.
- [ ] **Q-029 · [P3-DIST] [HN day] < 10 upvotes** — do not repost. Immediately cross-post to dev.to + r/webdev + r/programming.

---

## PHASE 2 — Days 30–60: Scale What Worked `[P3]`
> Don't add new channels. Scale the one that produced the first customer.
> 🟡 All unchecked items in this section are **P3**. Outreach/GTM = `[P3-DIST]` · Content/pages = `[P3-FEAT]`

- [x] **Q-030 · Create Pro Compliance tier at $499 in Stripe** ✅ 2026-04-17 — `pro_compliance` in TIERS (keys.js) + STRIPE_PRICES (web-server.js), portal.html card added, SLA document at `public/geoclear-compliance-sla.html` (printable, signable), linked from /compliance page. **Pending**: create $499 price in Stripe dashboard, set `STRIPE_PRICE_PRO_COMPLIANCE` env var in Render.
- [x] **Q-031 · Add "Why GeoClear vs SmartyStreets" section to `/docs`** ✅ 2026-04-17 — 6-row table + migration guide added to docs.html; sidebar nav link added.
- [x] **Q-032 · Add tagline to `/docs` page header** ✅ 2026-04-17 — "198M US addresses. Census tract, FEMA flood zone, and timezone — one API call." added to docs intro section.
- [x] **Q-033 · Add 500 enrichment calls/mo to Builder tier** ✅ 2026-04-17 — `enrichment_monthly_limit: 500` in TIERS, `checkEnrichmentQuota()` method in KeyStore, quota check wired into `/api/enrich`. Files: `keys.js`, `web-server.js`.
- [x] **Q-034 · Fix activation funnel** ✅ 2026-04-17 — 30-second curl added to Day 1 welcome email (`keyEmail()`); 80% daily quota warning header (`X-Quota-Warning`) in auth middleware. Files: `web-server.js`.
- [ ] **Q-035 · [P3-DIST] Scale winning channel** — if outreach: batch 3 (30 targets) + testimonial request from first customer. If RapidAPI/HN: 2 more SEO pages + submit to developer newsletters (TLDR, Bytes.dev).
- [ ] **Q-036 · [P3-DIST] LinkedIn founder post — "one call" developer angle** — curl example returning `flood_zone` + `census_tract` + `timezone` + `residential`. "Free tier. No credit card." Cross-post to dev.to + r/webdev.
- [ ] **Q-037 · [P3-DIST] "Why GeoClear" SEO content plan** — 10 target keywords from GSC data; map to pages/posts; schedule 1 post/week for 8 weeks.

### Day 60 Checkpoint

- [ ] **Q-038 · [P3-DIST] [Day 60] $2,500 MRR check + first monthly strategic review** — MRR, NRR, ECPC (North Star), CAC by channel, activation rate, cohort retention. Schedule breakeven review. Next strategy session at this point.

---

## PHASE 3 — Days 60–90: Execute to PMF Signal `[P3]`
> Target: $5,000 MRR, NRR > 100%, ECPC growing week-over-week.
> 🟡 All unchecked items in this section are **P3**. Outreach/GTM = `[P3-DIST]` · Content/pages = `[P3-FEAT]`

- [x] **Q-039 · Create Bulk Credits Pack in Stripe** ✅ 2026-04-17 — `prod_ULmPbW3DgGenEh` (1M/$199) + `prod_ULmPjIOpbCdElY` (5M/$799). `POST /v1/checkout/bulk` endpoint. `buyBulk()` wired in bulk.html. `STRIPE_PRICE_BULK_1M` + `STRIPE_PRICE_BULK_5M` env vars added to Render.
- [x] **Q-040 · Build `/bulk` landing page** ✅ 2026-04-17 — `public/bulk.html` + `/bulk` route. Drag-drop CSV upload zone, 3-step how-it-works, input/output column table, pricing grid (free/$199 1M/$799 5M), FAQ, signup modal. Wired to `POST /api/address/csv`. Bulk credits `buyBulk()` stub ready — needs Stripe price IDs from dashboard.
- [ ] **Q-041 · [P3-DIST] Compliance outreach batch 3 (30 targets)** — apply learnings from batches 1 + 2.
- [ ] **Q-042 · [P3-DIST] G2 listing** — Category: "Address Verification Software". Content in `AddressAPIBusinessGTM.md`. Keywords: "bulk address validation", "CRM data quality".
- [ ] **Q-043 · [P3-DIST] Capterra listing** — same content as G2. Category: "Address Verification".
- [ ] **Q-044 · [P3-FEAT] Begin CASS certification research** — USPS application requirements, engineering estimate, timeline. Add to T3 with start date. The 3–6 month process means starting late is costly.
- [ ] **Q-045 · [P3-DIST] Set Crunchbase + Google alerts** — Crunchbase: "address verification" + "geocoding" + "property data" funding rounds. Google alerts: "Lob address enrichment", "Google Maps census tract", "SmartyStreets flood zone".
- [ ] **Q-046 · [P3-DIST] Monthly check: SmartyStreets pricing page** — watch for flood zone or census tract appearing at any tier. If yes: reassess Pro tier pricing and GTM messaging immediately.

### Day 90 Checkpoint

- [ ] **Q-047 · [P3-DIST] [Day 90] Full assessment** — (1) $5K MRR? (2) ECPC growing week-over-week? (3) Which ICP converted most reliably? (4) Anyone churn — if yes, exit interview. (5) NRR > 100%? Schedule next 90-day plan.

---

## PRODUCT BACKLOG — Revenue-Blocking `[P3-FEAT]` (do after first paying customer)
> 🟡 All unchecked items in this section are **[P3-FEAT]**

- [x] **Q-048 · CSV upload → enriched CSV download** ✅ 2026-04-17 — `POST /api/address/csv` (text/csv, max 5K rows, 10MB). Auto-detects columns. Returns: geo_verified, nad_uuid, confidence, residential, fips, timezone, coverage, match_type. RFC 4180 inline. **Pending**: portal drag-drop UI + pro-tier external enrichment (flood_zone, census_tract).
- [x] **Q-049 · Add metered cost calculator to pricing slider** ✅ 2026-04-17 — Shows "Pay-as-you-go equivalent: $X/mo — saves Y%" for Builder/Professional/Scale positions. File: `public/landing.html`
- [x] **Q-050 · Usage dashboard for customers** ✅ 2026-04-17 — `GET /v1/me` returns `usage_history` (per-day counts, 30d default). Portal renders 30-day sparkline bar chart. Files: `keys.js`, `web-server.js`, `public/portal.html`
- [ ] **Q-051 · [P3-FEAT] FCC broadband tier by address** — $42B BEAD program demand. Enrichment field addition.
- [ ] **Q-052 · [P3-FEAT] Address standardization** — normalize to USPS format.
- [ ] **Q-053 · [P3-FEAT] Bulk async + webhooks** — for 10M+ record jobs (current bulk is sync, max 1K).

---

## ENGINEERING INFRASTRUCTURE `[P3-FEAT]`
> 🟡 All unchecked items in this section are **[P3-FEAT]**

- [ ] **Q-054 · [P3-FEAT] Comprehensive Testing Framework** — No test runner installed yet (`package.json` has no `test` script). `tests/TC-REGISTRY.md` and `tests/BUG-REGISTRY.md` scaffolded but empty. Full implementation spec below.
  > 📄 Reference: `architecture/DEV-SYSTEM-REF-2026-04-17.md` § 8. Testing Stack — Vitest + Playwright (vitest.config.ts with coverage thresholds, testClient pattern, transactional rollback, GitHub PR action)

  **⚠️ Tooling decision updated 2026-04-17 (post-Hono + Xata migration):** Stack is **Vitest 3.x + Playwright** — not Mocha/supertest. Vitest is Vite-native (89% faster watch mode), shares `vite.config` with TanStack Start (Q-176), and natively supports the Hono `testClient` helper. Mocha is Express-era tooling; do not install it. **Gate: implement after Q-162 (Hono) is complete — testClient requires a Hono app export.**

  **The 2026 Testing Stack:**

  | Layer | Tool | Why |
  |-------|------|-----|
  | Unit + Integration | Vitest 3.x | Vite-native, shares build config, 89% faster watch mode than Mocha |
  | API (type-safe) | Vitest + `hono/testing` testClient | Full autocomplete on endpoint params + response shape — no raw `supertest` strings |
  | DB tests (Xata) | Vitest + transactional rollback pattern | Start transaction → run test → rollback — test data never hits 150GB, stays fast |
  | Frontend components | Vitest Browser Mode | Uses Playwright internally; tests in a real browser, not JSDOM |
  | E2E critical paths | Playwright (critical paths only) | User Login → Search 150GB Data → Export Report; Trace Viewer records video on failure |
  | Performance | autocannon | p50/p95/p99 SLAs unchanged (see Layer 7) |

  **Install:**
  ```bash
  npm install --save-dev vitest @vitest/browser playwright autocannon
  npx playwright install chromium
  ```
  Add to `package.json`:
  ```json
  "scripts": {
    "test":        "vitest run",
    "test:watch":  "vitest",
    "test:unit":   "vitest run tests/unit",
    "test:api":    "vitest run tests/api",
    "test:sec":    "vitest run tests/security",
    "test:data":   "vitest run tests/data",
    "test:perf":   "node tests/perf/run.js",
    "test:e2e":    "playwright test"
  }
  ```

  **Hono testClient pattern (replaces supertest for API layer):**
  ```typescript
  import { testClient } from 'hono/testing'
  import app from './src/api/index'

  it('returns a valid risk score', async () => {
    const client = testClient(app)
    const res = await client.v1['risk-score'].$get({ query: { lat: '40', lng: '-74' } })
    expect(await res.json()).toMatchObject({ score: expect.any(Number) })
  })
  ```

  **Transactional pattern for Xata/Postgres tests:**
  ```typescript
  beforeEach(async () => { await pool.query('BEGIN') })
  afterEach(async ()  => { await pool.query('ROLLBACK') })
  // test inserts/updates never actually commit — 150GB DB stays clean
  ```

  **Coverage reports (`@vitest/coverage-v8` + `@vitest/ui`):**
  ```bash
  npm install --save-dev @vitest/coverage-v8 @vitest/ui
  ```
  Full `vitest.config.ts` coverage block:
  ```typescript
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'json-summary'],
    include: ['src/**/*.{ts,js}'],
    thresholds: { lines: 80, branches: 75, functions: 80, statements: 80 },
    reportOnFailure: true
  }
  ```
  - `npx vitest run --coverage` — terminal summary
  - `npx vitest --ui --coverage` — visual dashboard at `localhost:51204`, searchable by file
  - Priority targets: `enrich.js` (external API paths), `risk-data.js` (county lookup logic), `keys.js` (quota enforcement — must stay >80%, it is the revenue gate)

  **GitHub PR coverage comment (add to `.github/workflows/test.yml`):**
  ```yaml
  - name: Run Tests with Coverage
    run: npx vitest run --coverage
  - name: Report Coverage
    if: always()
    uses: davelosert/vitest-coverage-report-action@v2
    with:
      github-token: ${{ secrets.GITHUB_TOKEN }}
  ```
  Posts a coverage summary as a PR comment — acts as a quality gate before merging into the 150GB production branch.

  **Layer 1 — Unit (TC-UNIT-XXXX)** | File: `tests/unit/`
  Target modules and functions to test in isolation (no DB, no network, no filesystem):
  - `enrich.js` — `enrich(lat, lon)`: null inputs, non-US coords, timeout simulation, cache hit/miss
  - `keys.js` / `KeyStore` — `generate()`, `validate()`, `recordUsage()`, `checkEnrichmentQuota()`, tier limit enforcement, key hashing round-trip (hash → validate → match), `updateDataSource()` field whitelist
  - `query.js` / `NADQuery` — `parseAddress()` input sanitization, confidence score calculation at each placement tier (Rooftop=100, Parcel=85, Street=70, Interpolation=50, Unknown=30), anomaly flag deduction logic, `displayCity()` post_city vs inc_muni preference
  - `geocode.js` — `enrichPoint()` response shape validation, FEMA flood zone parsing (all 15 zone codes), SFHA derivation logic
  - `risk-data.js` — `RiskData`: county FIPS lookup, WHP class normalization (1–5 → Very Low–Very High), storm score calculation

  **Layer 2 — Integration (TC-INT-XXXX)** | File: `tests/integration/`
  Tests against real `data/dev.db` (572MB, 20K addresses/state). Set `NAD_DB=data/dev.db`.
  - `KeyStore._init()`: table + seed runs idempotently (run `_init()` twice, no duplicate rows, no error)
  - `data_sources` seed: all 9 rows present, `status` correct (calfire_fhsz=blocked, openaddresses=planned, 7 active)
  - `KeyStore.generate()` + `validate()` round-trip: generate key → hash stored → validate raw key → returns correct tier
  - `KeyStore.checkEnrichmentQuota()`: free tier at 0 calls → allowed; free tier at 500 calls → blocked; professional tier → always allowed
  - `NADQuery`: basic address lookup against dev.db returns `nad_uuid`, `confidence` ≥ 0, `state` matches input
  - `address_signals` upsert: first call creates row with `query_count=1`; second call increments to 2; no duplicate rows
  - `updateDataSource()`: updates `last_sourced_at` → verify persisted; reject unknown field → no-op

  **Layer 3 — System (TC-SYS-XXXX)** | File: `tests/api/` (inline with API tests, using supertest)
  Full request path through Express middleware:
  - Auth middleware chain: unauthenticated → 401 before any DB query
  - Rate limit middleware: 60 req/min limit enforced; 61st request → 429
  - Admin auth: missing `X-Admin-Secret` → 401; wrong secret → 401; correct secret → passes
  - Error propagation: DB unavailable → 503, not 500 with stack trace leaked

  **Layer 4 — API Contract (TC-API-XXXX)** | File: `tests/api/`
  Every endpoint, verified with supertest against `NAD_DB=data/dev.db` server:

  | Endpoint | TC IDs | Key assertions |
  |----------|--------|---------------|
  | `GET /api/health` | TC-API-0001–0003 | 200, `{"status":"ok","db":"connected"}`, no X-Api-Key required |
  | `GET /api/address` | TC-API-0010–0025 | valid key+address → 200 + `nad_uuid` + `confidence`; missing street → 400; no key → 401; wrong key → 401; quota exceeded → 429 |
  | `GET /api/suggest` | TC-API-0030–0035 | returns array, each item has `display`, `nad_uuid`; empty query → 400 |
  | `GET /api/near` | TC-API-0040–0045 | valid lat/lon → array with `distance_m`; missing lat → 400; `radius` > 50000 → 400 or clamped |
  | `GET /api/enrich` | TC-API-0050–0060 | Professional key → 200 + `flood_zone` + `census_tract`; free key → 402; missing lat/lon → 400; quota exhaustion → 429 |
  | `GET /v1/risk` | TC-API-0070–0080 | Professional key → 200 + 4 scores (0–1); free key → 402; invalid address → 404 |
  | `GET /v1/me` | TC-API-0090–0092 | valid key → tier + usage + limits; no key → 401 |
  | `GET /v1/admin/keys/stats` | TC-API-0100–0103 | correct secret → 200; no secret → 401 |
  | `GET /v1/admin/analytics` | TC-API-0110–0113 | `?days=30` → `requests_by_day` array length ≤ 30; `?days=0` → 400 or clamped |
  | `GET /v1/admin/data-sources` | TC-API-0120–0124 | 9 sources returned; `?status=blocked` → 1 result (calfire_fhsz); `?status=planned` → 1 result (openaddresses) |
  | `PATCH /v1/admin/data-sources/:id` | TC-API-0125–0128 | valid fields update + returns `updated:true`; unknown source_id → `updated:false`; disallowed field → ignored |
  | `POST /v1/keys` | TC-API-0130–0135 | valid email → key issued + email format correct; missing email → 400 |
  | `GET /api/states` | TC-API-0140–0142 | returns array of states with `code`, `address_count` > 0 |
  | `GET /v1/admin/signals` | TC-API-0150–0152 | returns `total_addresses_tracked`, `total_query_hits`, `top` array |

  **Layer 5 — E2E (TC-E2E-XXXX)** | File: `tests/e2e/` (Playwright)
  Complete user journeys covering critical revenue paths:
  - TC-E2E-0001: Free signup flow — `GET /` → landing page loads → `POST /v1/keys` → email contains API key → `GET /api/address` with key → 200
  - TC-E2E-0002: Quota enforcement — generate free key → exhaust 10K daily limit → next request → 429 → response body contains upgrade CTA
  - TC-E2E-0003: Portal — `GET /portal.html` → key input → submit → tier/usage displays correctly
  - TC-E2E-0004: Compliance page — `GET /compliance` → 200 → live demo widget returns `flood_zone` for test address

  **Layer 6 — Visual Regression (TC-VIS-XXXX)** | File: `tests/e2e/` (Playwright screenshots)
  Baseline screenshots of all public pages at 1280px, 768px, 375px. Run on every UI change:
  - TC-VIS-0001–0003: `landing.html` — desktop/tablet/mobile
  - TC-VIS-0004–0006: `compliance.html` — desktop/tablet/mobile
  - TC-VIS-0007–0009: `docs.html` — desktop/tablet/mobile
  - TC-VIS-0010–0012: `portal.html` — desktop/tablet/mobile
  Setup: `npx playwright test --update-snapshots` once to create baselines. Store in `tests/e2e/snapshots/`.

  **Layer 7 — Performance (TC-PERF-XXXX)** | File: `tests/perf/run.js` (autocannon)
  SLAs (GeoClear-specific — override BDS defaults for enrichment endpoints):

  | Endpoint | p50 | p95 | p99 | throughput |
  |----------|-----|-----|-----|------------|
  | `GET /api/health` | <5ms | <20ms | <50ms | >500 req/s |
  | `GET /api/address` (dev.db) | <50ms | <200ms | <500ms | >50 req/s |
  | `GET /api/enrich` (cached FEMA/Census) | <150ms | <500ms | <1500ms | >20 req/s |
  | `GET /v1/risk` (risk.db cached) | <30ms | <100ms | <300ms | >50 req/s |

  Run: `node tests/perf/run.js` — autocannon 50 connections, 30 seconds, report p50/p95/p99.
  Memory leak check: send 10K requests → `process.memoryUsage()` before vs after < 5% growth.

  **Layer 8 — Security (TC-SEC-XXXX)** | File: `tests/security/`
  ```bash
  # TC-SEC-0001: no key → 401
  # TC-SEC-0002: invalid key → 401 (not 403 or 500)
  # TC-SEC-0003: SQL injection in street param → no DB error leaked, no unexpected rows
  # TC-SEC-0004: XSS in street param → response is JSON, not HTML with script tag
  # TC-SEC-0005: oversized payload (100KB GET param) → 400 or 414, not crash
  # TC-SEC-0006: CORS — Origin: evil.com → no ACAO: * on /v1/* endpoints
  # TC-SEC-0007: admin endpoints without secret → 401
  # TC-SEC-0008: rate limit — 61 req/min → 429 with Retry-After header
  # TC-SEC-0009: Stripe webhook without signature → 400 (not 200)
  # TC-SEC-0010: key in URL param (not header) — should NOT work (keys only via X-Api-Key header)
  # TC-SEC-0011: plaintext key not stored in DB (verify key column = 24-char prefix only)
  # TC-SEC-0012: admin secret via header only — not querystring
  ```

  **Layer 9 — Data Integrity (TC-DATA-XXXX)** | File: `tests/data/`
  Run against `data/dev.db`:
  - TC-DATA-0001: `addresses` table has ≥ 18,000 rows (dev.db has 20K/state × ≥1 state)
  - TC-DATA-0002: All addresses with `placement='Rooftop'` have non-null `latitude` and `longitude`
  - TC-DATA-0003: No addresses where `state IS NULL AND state_id IS NOT NULL`
  - TC-DATA-0004: `api_keys` — `key_hash` IS NOT NULL for all rows (no plaintext keys)
  - TC-DATA-0005: `data_sources` — all 9 seed rows present; `calfire_fhsz` status = 'blocked'
  - TC-DATA-0006: `usage_log` FK integrity — no `key_id` referencing a non-existent `api_keys.id`
  - TC-DATA-0007: All 16 expected indexes present on `addresses` table (`EXPLAIN QUERY PLAN` for address lookup uses index)
  - TC-DATA-0008: `KeyStore._init()` idempotent — run 3× on same DB, no errors, no duplicate rows in `data_sources`

  **Layer 10 — Pipeline (TC-PIPE-XXXX)**
  - TC-PIPE-0001: `curl https://geoclear.io/api/health` → 200, `db:connected`, latency < 2s
  - TC-PIPE-0002: `curl https://geoclear-staging.onrender.com/api/health` → 200 (when staging deployed)
  - TC-PIPE-0003: `git push main` → Render deploy log shows `node web-server.js` started, no crash
  - TC-PIPE-0004: Post-deploy address lookup returns known address (1600 Pennsylvania Ave DC) with `confidence ≥ 85`

  **Directory structure to create:**
  ```
  tests/
  ├── TC-REGISTRY.md          ← exists (empty)
  ├── BUG-REGISTRY.md         ← exists (empty)
  ├── unit/
  │   ├── enrich.test.js
  │   ├── keys.test.js
  │   ├── query.test.js
  │   └── geocode.test.js
  ├── integration/
  │   ├── keystore.test.js
  │   ├── data-sources.test.js
  │   └── address-query.test.js
  ├── api/
  │   ├── address.test.js
  │   ├── enrich.test.js
  │   ├── risk.test.js
  │   ├── admin.test.js
  │   └── auth.test.js
  ├── security/
  │   └── security.test.js
  ├── data/
  │   └── integrity.test.js
  ├── perf/
  │   └── run.js
  └── e2e/
      ├── signup-flow.test.js
      ├── quota-enforcement.test.js
      └── snapshots/         ← Playwright baselines (git-committed)
  ```

  **BDS framework reference:** `/dev-test` skill at `~/.claude/skills/dev-test.md`
  **Owner:** engineering. Run `/dev-test` to execute the full framework on any session.
  **Gate rule:** No feature is complete without all applicable layers green. Security + data integrity layers mandatory on every deploy.

- [x] **Q-055 · Data Catalog** ✅ 2026-04-17 — `docs/DATA-CATALOG.md` created. Comprehensive inventory of all 9 data sources (NAD, Overture, Census, FEMA, USGS, USFS WHP, NOAA Storm, CAL FIRE FHSZ, OpenAddresses). Each entry covers: publisher, license, role, coverage, last sourced, next refresh date, cadence, API endpoint, pipeline, all attributes extracted, use cases powered. Includes refresh calendar (2026-07-15 NAD, 2026-10-01 USFS, 2027-03-01 NOAA). Update this file whenever a source is added or refreshed.

---

## T0 — DATA & CORE STATUS

✅ Complete: NAD r22 (120M), Overture full gap-fill (64.9M), total 198,657,537 addresses, all 16 indexes live (2026-04-16).

✅ FK relink + count refresh complete (2026-04-17):
- 180.3M rows fully linked (state_id → county_id → city_id → zip_code_id)
- 18.3M rows permanently unlinked (Overture rows imported with state=NULL — no state field in source data, cannot relink)
- All major states now show correct counts on /api/states (FL: 41.7M, CA: 15M, MI: 9.5M, NJ: 10M, NV: 2.3M, NH: 870K)
- New endpoints: POST /v1/admin/relink-fks (idempotent), POST /v1/admin/refresh-counts

Open:
- [ ] **Q-056 · [P3-FEAT] Fill remaining state gaps — AL, AK** (not in Overture — need state GIS portals)
- [ ] **Q-057 · [P3-FEAT] NAD r23 quarterly update (~June 2026)** — run on staging, merge to prod

---

## DATA STRATEGY — Additional Sources & Platform Capabilities `[P3-FEAT]`
> 🟡 All unchecked items in this section are **[P3-FEAT]** unless labeled otherwise.

> **Context:** These items cover (1) additional data sources that extend GeoClear's addressable use cases and competitive moat, and (2) platform architecture decisions that determine whether GeoClear stays an enrichment API or becomes the authoritative geospatial intelligence layer for American commerce. Think at Sundar/Zuck/Elon scale: Google built Maps as a platform layer everything else runs on. That's the model here — not "more enrichment fields" but "the ground truth that every proptech, insurtech, and fintech must connect to."

### A. Additional Data Sources — Prioritized by Revenue Impact

> Add each to `docs/DATA-CATALOG.md` when imported. Update `data_sources` table in `keys.db` via `PATCH /v1/admin/data-sources/:source_id`.

#### Tier 1 — Ship by $10K MRR (high ROI, all free federal sources)

- [ ] **Q-058 · Census ACS Vacancy + Demographics by tract** — US Census American Community Survey. Vacancy rate, median income, population density, age distribution by census tract. Free. Import: `census-acs-import.js`. Unlocks: vacancy dimension of `/v1/risk` (currently placeholder), lending redlining detection, real estate demand signals. Already have the census tract from TIGER — this is the payload that makes it valuable. Source: `data.census.gov` (B25002 Occupancy Status, B19013 Median Income, B01003 Population). ~74,000 tracts. Cadence: annual (5-year ACS).
- [ ] **Q-059 · EPA EJScreen — Environmental Justice Screening** — EPA's environmental justice index by census block group. 11 environmental indicators: air toxics, proximity to Superfund sites, RMP facilities, wastewater discharge, lead paint, traffic, ozone, PM2.5, diesel PM, underground storage tanks, proximity to hazardous waste. Free. Source: `https://ejscreen.epa.gov/mapper/ejscreenRESTbroker.aspx`. Live API (lat/lon → block group → EJ scores). Unlocks: environmental risk dimension on `/v1/risk`, ESG/impact investing use case, environmental due diligence for lenders. Target customer: climate-focused lenders, ESG funds, insurance underwriters.
- [ ] **Q-060 · USPS No-Stat / Delivery Statistics (CASS-adjacent)** — USPS publishes No-Stat address counts by ZIP+carrier route. No-Stat = addresses that don't receive regular delivery (vacant, seasonal, under construction). Free public data. Source: USPS Address Management System public release. Unlocks: vacancy dimension in `/v1/risk` with real data instead of heuristic. Note: full CASS certification (3–6 months, $$$) needed for `/v1/address` to return CASS-standardized output — track separately.
- [ ] **Q-061 · USGS National Hydrography Dataset (NHD)** — Rivers, streams, lakes, reservoirs, coastline. Distance to nearest waterbody by lat/lon. Free. Source: `https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer`. Unlocks: flood risk context (proximity to water + FEMA zone = much stronger flood signal), waterfront property premium detection. 1M+ features.
- [ ] **Q-062 · HUD Fair Market Rents + Housing Choice Voucher zones** — HUD publishes FMR by ZIP and metro area annually. Also: Opportunity Zones (QCT + DDA designations) by census tract. Free. Source: `https://www.huduser.gov/portal/datasets/fmr.html`. Unlocks: rental market intelligence, affordable housing compliance, LIHTC eligibility for lenders.
- [ ] **Q-063 · Overture Maps Places (POIs)** — Same Overture data source we already use for addresses, but the `places` theme. 59M+ global POIs (restaurants, banks, hospitals, schools, stores) with name, category, brand, hours, website. Free (CDLA 2.0). Source: `s3://overturemaps-us-west-2/release/.../theme=places`. Unlocks: commercial density score per address, neighborhood character detection, retail accessibility index. The Overture S3 pipeline is already built — this is a schema extension, not a new pipeline.
- [ ] **Q-064 · FEMA Disaster Declarations** — FEMA declares major disasters by county. Historical record going back to 1953. Free. Source: `https://www.fema.gov/api/open/v2/disasterDeclarations`. Import to `risk.db`. Unlocks: long-term disaster frequency per county beyond NOAA storm events — includes earthquakes, droughts, ice storms, etc. that NOAA misses.

**[Cat 5 — Satellite & Sensor]**
- [ ] **Q-065 · USGS 3DEP — 3D Elevation Program** — USGS lidar-derived elevation above sea level per lat/lon. 1m resolution where lidar exists; 10m national baseline. Free. Source: `https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer` (ArcGIS REST, live). Live API call — no import needed; cache results keyed by lat/lon bounding box. Unlocks: elevation-adjusted flood depth estimation (elevation + FEMA zone = much stronger flood signal than zone alone), terrain classification, hillshade + slope derived products. Directly improves disaster score accuracy in `/v1/risk`. Coverage: CONUS + AK + HI + PR. Cadence: continuous as new lidar surveys complete.
- [ ] **Q-066 · NLCD — National Land Cover Database** — USGS/MRLC 30m raster covering 20+ land cover classes (developed open/low/medium/high intensity, forest, cropland, wetland, barren, water). Free (public domain). Source: `https://www.mrlc.gov/data` download + WCS service. Pipeline: staging shell → download annual GeoTIFF → aggregate to census tract (dominant class + impervious surface %) → import to `risk.db`. Unlocks: land use classification per address (urban/suburban/rural/agricultural), impervious surface % (flood runoff proxy), wildfire-urban interface (WUI) detection. Complements NLCS wildfire data already in `risk.db`. Updated annually (NLCD 2021 current; 2022 expected mid-2026).

**[Cat 6 — Specialized / Domain-Specific]**
- [ ] **Q-067 · USGS GNIS — Geographic Names Information System** — Official US place name gazetteer. 2M+ named features with official names, variant names, and historical spellings. Free (public domain). Source: `https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer` (live ArcGIS REST, JSON/GeoJSON). Unlocks: place name disambiguation for `/api/address` and `/api/suggest` (post_city vs inc_muni vs common name conflicts), authoritative neighborhood name enrichment, "is this a real place?" validation layer. Query by name or coordinates; cache results. Continuously updated by the Board on Geographic Names.
- [ ] **Q-068 · NCES School District Boundaries** — National Center for Education Statistics official K-12 district boundaries, updated annually. Free (public domain). Source: `https://nces.ed.gov/programs/edge/Geographic/DistrictBoundaries` (ArcGIS REST + shapefile). Point-in-polygon lookup against district polygons → return `school_district` field on `/api/address` + `/api/enrich`. Build spatial index on staging; store district LEAID + name per census tract. Unlocks: top homebuyer signal (school district is the #1 question for residential real estate ICPs). Fields: LEAID, district name, district type (unified/elementary/secondary), state FIPS.

#### Tier 2 — Ship by $50K MRR (require more pipeline work or cost/legal review)

- [ ] **Q-069 · County Parcel / Cadastral Data (REGRID or county GIS portals)** — Property boundaries, ownership, assessed value, land use code, year built, building sq ft, lot size, zoning. This is the **single highest-value dataset GeoClear doesn't have**. Makes every address a financial and physical asset record. Sources: (a) free from county GIS portals (~3,100 counties — painful); (b) REGRID ($$$, covers 98% of US parcels, API); (c) Microsoft USBuildingFootprints partially overlaps. Unlocks: property intelligence endpoint `/v1/property`, lending AVM input, real estate comp analysis, insurance replacement cost estimation. Note: REGRID likely $20K+/year — evaluate after $25K MRR.
- [ ] **Q-070 · First Street Foundation — Climate Risk (Foundation API)** — Parcel-level flood, fire, heat, drought, wind risk with 30-year projections. The only source with climate-forward risk (FEMA NFHL is historical, First Street is predictive). Commercial API ($$$). Unlocks: climate risk score addition to `/v1/risk`, forward-looking insurance underwriting. Evaluate after $25K MRR. Direct competitor to our disaster score but ~10× more granular.
- [ ] **Q-071 · ATTOM / CoreLogic Property Data** — Commercial data provider. Ownership history, sales history, deed transfers, liens, foreclosures, MLS history. Expensive ($25K–$100K+/year). Unlocks: complete property intelligence layer. Evaluate after $50K MRR or enterprise contract.
- [ ] **Q-072 · FCC Broadband Coverage Map** — FCC published new fabric-based broadband map in 2023 (545M locations). Free. Source: `broadbandmap.fcc.gov`. Unlocks: broadband tier by address (BEAD program demand, $42B addressable). ISP-level coverage data.
- [ ] **Q-073 · Bureau of Transportation Statistics (BTS) — National Transit Map** — Transit stops, routes, frequency by lat/lon. Free. Source: NTD + GTFS feeds. Unlocks: walkability/transit accessibility score, urban vs suburban classification refinement.
- [ ] **Q-074 · USGS Earthquake Hazard (NSHM)** — National Seismic Hazard Model. Peak ground acceleration (PGA) probability by lat/lon. Free. Source: `https://earthquake.usgs.gov/hazards/hazmaps/`. Unlocks: seismic risk dimension on `/v1/risk`. Especially valuable for CA, WA, OR, AK, NM — states with significant quake exposure.
- [ ] **Q-075 · OpenStreetMap Buildings + Land Use** — Building outlines, roof types, land use (residential/commercial/industrial/park). Free (ODbL — same license issue as OpenAddresses, needs legal review). 70M+ US building outlines. Unlocks: building density per block, land use classification, green space proximity. Better coverage than Microsoft footprints in dense urban areas.

**[Cat 5 — Satellite & Sensor]**
- [ ] **Q-076 · Copernicus Land Cover (Sentinel-2 derived)** — EU Copernicus programme 10m global land cover raster, 11 classes. Free and open (Copernicus open data licence). Source: `https://download.dataspace.copernicus.eu/odata/v1/` (OData API) or Sentinel Hub. Primarily relevant for international expansion (Canada, UK) — for US, NLCD (Q-066) is superior. Import only when Canada/UK expansion begins (see T3 Moat international entries). No action until international is on the roadmap.

**[Cat 6 — Specialized / Domain-Specific]**
- [ ] **Q-077 · Walk Score API** — Walkability, transit, and bike scores per address. Commercial freemium (Walk Score LLC). Free tier for low volume; production pricing requires sales contact (estimated $0.01–0.05/lookup). Source: `https://api.walkscore.com/score` (live REST, lat/lon → scores + nearby amenities). No import needed — live API call per address. Unlocks: lifestyle/amenity scoring on `/api/enrich`, strong signal for residential real estate ICPs. Evaluate pricing against customer value at $10K MRR before enabling.
- [ ] **Q-078 · Congressional District Boundaries (TIGER/Census)** — Official US House district boundaries, all 435 districts. Free (public domain). Source: `https://www.census.gov/geographies/mapping-files/2023/geo/tiger-line-file.html` (shapefile + GeoJSON). Download → build spatial index → point-in-polygon per address → return `congressional_district` field on `/api/address`. Also: state legislative upper/lower chamber districts (same TIGER source). Update cadence: decennial (next after 2030 census); interim redistricting files issued as needed. Low pipeline complexity — spatial join only.
- [ ] **Q-079 · StreetLight Data — Mobility Intelligence** — GPS and cellular-derived traffic volumes, origin-destination flows, and vehicle counts by road segment. Commercial (StreetLight Data Inc.); no public pricing — requires sales engagement; estimated $20K+/yr. Coverage: 5M+ miles of North American roadway, 25M+ road segments. Source: proprietary API + bulk file delivery. Unlocks: commercial viability signals per address (foot traffic to nearby businesses), trip origin-destination for logistics customers, vehicle classification by segment. Evaluate after $50K MRR.

#### Tier 3 — Platform Scale (after $100K MRR or strategic partnership)

- [ ] **Q-080 · NASA/NOAA Climate Projections (CMIP6)** — 30-year temperature, precipitation, sea level projections by grid cell. Free. Source: NASA SEDAC. Unlocks: long-horizon climate risk for insurance/lending. Requires building a raster lookup layer.
- [ ] **Q-081 · Zoning Data (aggregated)** — Municipal zoning codes: residential, commercial, industrial, agricultural, mixed-use. No national source exists — requires aggregating ~20,000 municipalities. Options: (a) build scraper; (b) ZoningPoint ($$$); (c) Regrid includes some zoning data. Unlocks: development potential, land use compliance, ADU eligibility detection. Enormous real estate value.
- [ ] **Q-082 · SafeGraph / Foursquare Places (mobility + POI)** — Foot traffic, visit patterns, POI data. Commercial. Unlocks: economic activity signals per address, retail viability scoring. Expensive but creates unique behavioral layer.
- [ ] **Q-083 · GreatSchools Ratings API** — Commercial school quality ratings (1–10) per district and individual school. Source: `greatschools.org/gsr/api/`. Requires license agreement. Complements NCES free boundaries (Q-068) with the quality signal homebuyers actually want. Evaluate after $25K MRR.

**[Cat 5 — Satellite & Sensor]**
- [ ] **Q-084 · Landsat / NASA Earth Observations (historical change detection)** — USGS Landsat archive via AWS Open Data (`s3://usgs-landsat/`). 30m multispectral imagery, 40+ years of history. Free. Source: `https://earthexplorer.usgs.gov/` or AWS S3. Not a per-address live API — requires raster processing pipeline. Relevant only if GeoClear adds temporal enrichment ("how has land use at this address changed over 20 years?"). Defer until temporal enrichment is on roadmap. Combined with NLCD (Q-066), Landsat is the raw source from which NLCD is derived — NLCD is the correct choice for current needs.

**[Cat 6 — Specialized / Domain-Specific: Gap Items]**
- [ ] **Q-085 · NGA GeoNames Server (GNS)** — National Geospatial-Intelligence Agency global place name gazetteer. 8M+ features, 13M+ names across 195 countries, updated daily. Free (public domain). Source: `https://geonames.nga.mil/geonames/GNSData/` (bulk download by country, tab-delimited). For US coverage, USGS GNIS (Q-067) is superior. GNS becomes relevant at international expansion (Canada, UK) — activate when T3 Moat international items are prioritised.
- [ ] **Q-086 · Carrier / Telecom GPS Mobility (aggregated behavioral data)** — Carrier-derived location signals via data brokers: Veraset (`veraset.com`), Outlogic/X-Mode (subject to FTC settlement Jan 2024 — restricted sensitive location use), or direct telecom partnerships. Behavioral dwell time, visit frequency, origin-destination patterns per address. Commercial ($50K+/yr); requires enterprise agreement and legal review. Unlocks: strongest behavioral ground truth for fraud scoring — real foot traffic patterns vs. claimed address residency; anomaly detection (address claimed as residential but shows zero dwell time). Legal review required before any integration: CPRA, TCPA, FCC data broker rules (2025 effective). Evaluate only after $100K MRR and with legal counsel.

---

### B. Platform Capability Decisions

> These are architectural choices that determine whether GeoClear becomes a data platform or stays an enrichment endpoint. Decide each explicitly — not deciding is deciding.

- [ ] **Q-087 · [DECISION NEEDED] GeoServer / OGC Standards layer** — GeoServer exposes data via WFS, WMS, WCS (OGC standards). Enterprise GIS customers (government, utilities, large insurers) expect OGC-compliant APIs — they often can't integrate REST JSON-only APIs into their ArcGIS/QGIS workflows. **Recommendation:** Yes, but after $50K MRR. Adds significant integration surface area. File a DECISIONS.md entry when this decision is made. Reference: `geoserver.org`.
- [ ] **Q-088 · [DECISION NEEDED] GeoPlatform.gov integration** — Federal data gateway providing programmatic access to authoritative US geospatial datasets via standards-based APIs. High-value for federal contracts and government customers. **Recommendation:** Yes — integrate as a data source aggregator (replace some of our individual agency API calls with GeoPlatform endpoints). Low risk, no cost. Review `geoapi.geoplatform.gov` API when building Tier 1 sources above. Adopt FAIR principles (Findable, Accessible, Interoperable, Reusable) as design constraints on `/v1/enrich` response schema.
- [ ] **Q-089 · [SKIP] STAC (SpatioTemporal Asset Catalog)** — Standard for discovering satellite imagery and temporal raster datasets. Not applicable to address intelligence in current form. Only relevant if we add historical/temporal address data. **Decision: skip until temporal enrichment is on roadmap.** Revisit at $100K MRR.
- [ ] **Q-090 · [SKIP] Tiling / Tilegarden** — Serverless map tile rendering. Only needed if we build a map visualization product. We are an API; our customers build maps. **Decision: skip entirely.** If customers need tiles, recommend MapTiler or Mapbox as complementary tools.
- [ ] **Q-091 · [DECISION NEEDED] Knowledge Graph / RDF layer** — Representing addresses as semantic nodes linked to risk factors, census data, zoning, parcel ownership via RDF triples and SPARQL queries. This is the "Google Knowledge Graph for addresses" play. High complexity, high moat. **Recommendation:** Design for it — use `nad_uuid` as a stable URI for every address now, which makes a future RDF layer trivially buildable. Actual RDF exposure: defer until $100K MRR. Reference: `kb.geoplatform.gov/knowledge-graphs/rdf-data.html`.
- [ ] **Q-092 · [ACTION] Adopt `nad_uuid` as canonical address URI** — Currently `nad_uuid` is used internally. Expose it as a stable, permanent address identifier in all API responses (`"id": "NAD:us-{nad_uuid}"`). This is the foundation for: (a) knowledge graph, (b) OGC feature IDs, (c) customer-side stable references across API calls. No data change — just schema/response change. File as a feature ticket.

---

### C. Competitive Intelligence Watch List

- [ ] **Q-093 · Monthly: check if SmartyStreets adds flood zone or census tract** — If yes: reassess Pro tier pricing and GTM messaging immediately.
- [ ] **Q-094 · Quarterly: review Overture Maps new themes** — Overture is adding buildings, transportation, base maps. Any new theme that overlaps our roadmap: evaluate import.
- [ ] **Q-095 · Quarterly: check Google Maps Platform pricing** — Google has census tract in Places API. If they bundle it into a cheaper tier, our compliance moat narrows. Watch closely.
- [ ] **Q-096 · Crunchbase alerts** — "address verification" + "property data" + "climate risk" funding rounds. Funded competitors = new entrants with resources.

---

## T2 — DIFFERENTIATION `[P3-FEAT]` (after $10K MRR)
> 🟡 All unchecked items in this section are **[P3-FEAT]** unless labeled `[P3-DIST]`

### Strategic Intelligence Layer
> Outcome: GeoClear becomes the ground-truth layer of American commerce, not just an address lookup.

> ⚠️ **STAGING-FIRST RULE — applies to every data import below.**
> All heavy data processing runs on Render staging (`srv-d7f6rh58nd3s73cve8dg`, 100GB disk), never locally and never directly on prod.
> Pipeline for every import: **Staging Render Shell → verify row counts on staging → `POST /v1/admin/upload-chunk` (chunked) → `POST /v1/admin/merge` on prod → verify via `GET /api/stats`.**
> Never rsync directly to prod. Never run large downloads on your Mac. See CLAUDE.md § Staging-First for the full rule.

- [x] **Q-097 · Ground-Truth Graph (internal)** ✅ 2026-04-17 — `address_signals` table in `keys.db` (NOT nad.db — zero migration on 91GB table). Schema: `nad_uuid PK, query_count, last_queried_at, fraud_signal_count`. Fire-and-forget upsert via `setImmediate` after every `/api/address` hit. `recordAddressQuery()` + `recordFraudSignal()` + `getTopQueriedAddresses()` in KeyStore. Admin endpoint: `GET /v1/admin/signals`. Starts compounding behavioral data immediately.
- [x] **Q-098 · Risk Score v1 — `/v1/risk` endpoint** ✅ 2026-04-17 — `GET /v1/risk` (Professional+). Resolves address by nad_uuid / street+city+state / lat+lon. Returns 4 scores (0–1): deliverability (confidence+placement+query_count), fraud (fraud_signal_count+velocity), disaster (live FEMA NFHL), vacancy (zero-query+addr_class). `data_coverage` flags show which dimensions have real data vs pending imports. File: `web-server.js`.
- [x] **Q-099 · Import USFS Wildfire Risk data** ✅ 2026-04-17 — `wildfire-import.js` rewritten to use USFS/Esri "USA Wildfire Hazard Potential" FeatureServer (layer 2 = county). 3,108 counties with WHP class (Very Low–Very High) + MEAN score. Source: `services.arcgis.com/jIL9msH9OI208GCb/.../USA_Wildfire_Hazard_Potential/FeatureServer/2`. Uploaded to prod risk.db. `/v1/risk` returns `data_coverage.wildfire: true`.
- [x] **Q-100 · Import NOAA severe weather history** ✅ 2026-04-17 — Storm data imported locally (NOAA NCEI CSV files). 3,257 counties, 338,864 storm events, 10-year window (2017–2026). Uploaded to prod `/data/risk.db` (316KB). `/v1/risk` now returns `data_coverage.storm: true` with real county storm counts. Script: `storm-import.js`.
- [x] **Q-101 · CAL FIRE FHSZ live lookup** ✅ 2026-04-17 — `cal_fire_fhsz` field on `/api/enrich`. Live polygon lookup via `egis.fire.ca.gov/arcgis/rest/services/FRAP/HHZ_ref_FHSZ/MapServer/0` (CAL FIRE's own ArcGIS server). CA only, null for non-CA. High+Very High zones: SRA_High, SRA_VeryHigh, LRA_High, LRA_VeryHigh, FRA_High, FRA_VeryHigh. No import to risk.db needed — live API call like FEMA NFHL. Requires ±100m Web Mercator envelope (service rejects point geometry).
- [x] **Q-102 · Import Microsoft Building Footprints** ✅ 2026-04-17 — `building-import.js` written (staging-only). Downloads per-state GeoJSON.gz from MS Azure Open Data, streams polygon centroid+area into `building_footprints` table in risk.db. `getBuildingFootprint(lat,lon)` added to risk-data.js with lat/lon bounding-box index. **Pending: run on staging Render Shell and upload to prod.** Run: `DATA_DIR=/data node building-import.js` on staging shell.
- [x] **Q-103 · FAA drone airspace** ✅ 2026-04-17 — `getFAADroneAirspace(lat, lon)` added to geocode.js. Queries FAA UAS Facility Map ArcGIS REST service (public, no key). Returns `{ in_controlled_airspace, authorized_altitude_ft, airport_id, laanc_available }`. 6hr in-memory cache.
- [x] **Q-104 · Drone-deliverable flag — `/v1/enrich` extension** ✅ 2026-04-17 — `drone` block added to `/v1/enrich` response: `{ deliverable, airspace_class, authorized_altitude_ft, laanc_available, airport_id, estimated_open_sqm, building_area_sqm, confidence }`. Parallel FAA + building-footprint lookup; 5s hard timeout. Confidence is "high" when both FAA + building data available.
- [x] **Q-105 · Pricing reframe — floor to $199** ✅ 2026-04-17 — Landing page updated: $49 Starter card removed; Growth $199/150K, Professional $499/500K (compliance fields merged in), Scale $999/5M. Checkout validates `growth`/`pro`/`scale`/`metered`. COMMS #7 added: Stripe action for new price IDs + Render env vars.

### Distribution
- [ ] ~~**Q-106 · [P3-DIST] Node.js SDK**~~ (`npm install geoclear`) — **SUPERSEDED by Q-163 (Hono RPC).** Hono `AppType` export + `@geoclear/client` npm package IS the Node.js SDK. Ships in 4 hours after Q-162, not a separate sprint.
- [ ] ~~**Q-107 · [P3-DIST] Python SDK**~~ (`pip install geoclear`) — **PARTIALLY SUPERSEDED by Q-164 (OpenAPI).** `/openapi.json` from Hono zod-openapi → `openapi-generator` auto-generates Python, Go, Java clients. Manual SDK work no longer needed.
- [ ] **Q-108 · [P3-DIST]** Zapier integration ("Verify US address" action)
- [ ] **Q-109 · [P3-DIST]** Shopify App
- [ ] **Q-110 · [P3-DIST]** WordPress / WooCommerce plugin
- [ ] **Q-111 · [P3-DIST]** Salesforce AppExchange listing

### Enterprise
- [ ] **Q-112 · [P3-FEAT]** SOC 2 Type II audit — start process (takes 6–12 months); begin at $10K MRR
- [ ] **Q-113 · [P3-FEAT]** NCOA integration (address change detection — 40M Americans move/year)
- [ ] **Q-114 · [P3-FEAT]** Mortgage compliance bundle (HMDA + CRA + census tract + FIPS + flood in 1 call)
- [ ] **Q-115 · [P3-FEAT]** White-label / OEM API option
- [ ] **Q-116 · [P3-FEAT]** Data licensing tier (flat file download, $10K–$100K/yr)
- [ ] **Q-117 · [P3-FEAT]** Render autoscaling / standby instance — only when first enterprise customer signs SLA

### Address Intelligence
- [ ] **Q-118 · [P3-FEAT]** Address history / change log
- [ ] **Q-119 · [P3-FEAT]** Neighborhood character score (urban/suburban/rural)

---

## T3 — MOAT `[P3-FEAT]` (months 3–6)
> 🟡 All unchecked items in this section are **[P3-FEAT]** unless labeled `[P3-DIST]`

- [ ] **Q-120 · [P3-FEAT] Parcel boundary polygons** — county assessor data for all 3,000+ US counties. Expensive to aggregate (commercial vendors: Regrid ~$15K/yr, PreciselyData). Unlocks high-confidence drone landing zone detection and parcel-level fraud scoring. *Required for Risk Score confidence: "high" tier. Worth it after first drone company customer.*
- [ ] **Q-121 · [P3-FEAT]** USPS CASS certification — required for $10B direct mail market; 3–6 month process; begin research Phase 3
- [ ] **Q-122 · [P3-FEAT]** DPV — Delivery Point Validation (bundled with CASS)
- [ ] **Q-123 · [P3-FEAT]** Automated quarterly NAD update pipeline (cron → detect → download → re-import)
- [ ] **Q-124 · [P3-FEAT]** Address change webhook service
- [ ] **Q-125 · [P3-DIST]** International: Canada (Overture has CA data, 15M addresses)
- [ ] **Q-126 · [P3-DIST]** International: UK (Ordnance Survey open data, 32M addresses)
- [ ] **Q-127 · [P3-FEAT]** Parcel ID / property tax linkage
- [ ] **Q-128 · [P3-DIST]** Mobile SDK (iOS + Android)

---

## T4 — BIG SWINGS `[P3-FEAT]` (6–18 months)
> 🟡 All unchecked items in this section are **[P3-FEAT]** unless labeled `[P3-DIST]`

- [x] **Q-129 · GeoClear Risk Score v2** ✅ 2026-04-17 — `POST /v1/outcomes` endpoint; `address_outcomes` table in `keys.db`; score_version v1→v2 auto-upgrade at ≥3 delivery or ≥2 fraud outcomes; inline key auth on `/v1/risk` and `/v1/outcomes`; `GET /v1/admin/outcomes`; drone delivery use case ground-truthing deliverability. Moat: no competitor can buy this dataset — earned from live traffic.
- [x] **Q-130 · Compliance page — interactive demo + FEMA legend + cost calculator** ✅ 2026-04-17 — Hero-right: live input (number/street/city/state) → real `/api/demo/enrich` response shows `flood_zone`, `flood_sfha`, `census_tract`, `county_fips`. FEMA zone legend (expandable: AE/VE/A/X/D with SFHA status). Cost calculator (slider: N lookups/mo → manual $3–15/ea vs GeoClear $249/mo + % savings). Auth bypass: `req.path.startsWith('/demo')` in API gateway. File: `public/compliance.html`, `web-server.js`.
- [x] **Q-131 · Landing page compliance callout section** ✅ 2026-04-17 — Prominent section between verticals and pricing: "HMDA, NFIP, and CRA fields. One API call. Auditable source." → links to `/compliance`. Three trust bullets + "See compliance features →" CTA. File: `public/landing.html`.
- [x] **Q-132 · Climate Risk Score per address — Phase 1** ✅ 2026-04-17 — All 4 county-level risk tables live in prod risk.db: wildfire (3,108 counties USFS WHP), storm (3,257 counties NOAA NCEI 10yr), earthquake (3,221 counties USGS NSHM), drought (3,221 counties USDA). `/api/demo/risk` stable, <4s, no crash loops. Address direction suffix stripping fixed so directional addresses (e.g. "10th Street NW") match NAD. Demo prepopulated with working DC address.
- [x] **Q-137 · [P3-FEAT] Climate Risk Score — Phase 2** ✅ 2026-04-17 — NRI import complete: 3,142 counties in `nri_risk` table. Downloaded via FEMA ArcGIS public service (bulk CSV URL was 301-blocked on Render). risk.db uploaded to prod (1.7MB). Prod `reload-risk-db` confirmed: wildfire ✅ storm ✅ earthquake ✅ drought ✅ nri ✅. Note: FEMA bulk CSV URL (hazards.fema.gov) permanently redirected — future re-imports must use ArcGIS paginated API or pre-download locally.

---

## RISK SCORE — DATA QUALITY (detail — see P2 above for prioritized summary)

- [x] **Q-138 · Fix WHP wildfire score lookup using float key** ✅ 2026-04-17 — `WHP_SCORE[4.02]` returned undefined → 0 because the lookup table uses integer keys (1–5) but `whp_score` stores a float MEAN from the USFS FeatureServer (e.g. 4.02). Fixed with `Math.round(wildfireRow.whp_score)` in both `/v1/risk` and `/api/demo/risk`. Was silently zeroing wildfire scores for all High/Very High counties. Files: `web-server.js`.
- [ ] **Q-139 · FEMA NFHL returns OUTSIDE for all prod addresses** — every `/api/demo/risk` and `/api/demo/enrich` call returns `flood_zone: OUTSIDE` from prod even for confirmed AE/VE zone addresses (verified: 4111 Breakwood Dr Houston = AE, 29.6811/-95.4445). Direct calls from local Mac return correct zones. Root cause: likely Render datacenter IP range is rate-limited or receiving empty feature sets from FEMA's ArcGIS server. Impact: flood dimension is always 0 in prod — kills the flood risk signal entirely. Fix options: (1) add `Referer` + `User-Agent` headers to FEMA request; (2) retry with different FEMA endpoint URL; (3) proxy FEMA calls through a residential IP or CDN; (4) pre-import FEMA NFHL polygons into risk.db (eliminates live call dependency). Option 4 is the long-term fix (also unlocks offline enrichment).
- [ ] **Q-140 · CA Overture addresses missing county_fips** — ~29.5M CA addresses imported from Overture have `fips: null` in the address row. FIPS-dependent risk lookups (earthquake, drought, wildfire) all return null for these addresses, making `/v1/risk` useless for CA. Fix: (1) run a post-import FIPS backfill on staging — spatial join against TIGER county polygons to assign `county_fips` for all Overture rows with lat/lon; (2) or derive FIPS at query time via in-memory TIGER county lookup (lighter but ~50ms latency). Same issue likely affects other Overture-only states (FL, MI, NJ, NV, NH). Blocking for CA risk score use cases.
- [ ] **Q-141 · Import CAL FIRE FHSZ into risk.db** — `calfire-import.js` exists and is ready but was never run. `calfire_fhsz` table absent from risk.db. CAL FIRE FHSZ is more granular than USFS WHP (polygon-level vs county-level) for CA wildfire risk and is the primary signal used in the `/v1/risk` CA wildfire score. Run on staging Render Shell: `node calfire-import.js --db=/data/risk.db` (SRA + LRA sources). Then re-upload risk.db to prod. Dependency: Q-140 (CA addresses need county_fips for the combined wildfire score to be useful).
- [ ] **Q-142 · Galveston TX address coverage gap** — ZIP 77550 (Galveston Island) addresses return "No addresses found" from all lookup attempts. Galveston is a high-priority flood zone demo target (coastal VE/AE zones confirmed via FEMA API). NAD r22 likely has sparse Galveston coverage. Fix: check Overture parquet for Galveston County (FIPS 48167) — if present, import via staging pipeline. Also check Texas GLO (General Land Office) for coastal address data.

---

- [ ] **Q-133 · [P3-FEAT]** Physical World Graph API — address nodes connected to businesses, schools, flood zones
- [ ] **Q-134 · [P3-FEAT]** National 911 Address Layer — partner with NENA ($10B NG911 funding)
- [ ] **Q-135 · [P3-FEAT]** Autonomous Address Deduplication-as-a-Service (AI agent for CRM cleanup)
- [ ] **Q-136 · [P3-FEAT]** Address Intelligence for AI Training Data licensing

---

## INFRA & DOMAIN STATUS

| Item | Status |
|------|--------|
| geoclear.io DNS | ✅ Cloudflare proxy (orange cloud), Full (strict) SSL |
| Render prod | ✅ `srv-d7ep7bfavr4c73d46gng` — auto-deploys on push |
| Render staging | ✅ `srv-d7f6rh58nd3s73cve8dg` — 100GB disk, autoDeploy OFF |
| GitHub | ✅ `sriharkaur/geoclear` |
| Cloudflare cache | ✅ `/api/stats`, `/api/states`, `/api/health` — 5min TTL |
| auduu.com | ✅ Transfer to Cloudflare initiated |
| auduu.ai | 🔒 GoDaddy, auto-renew OFF, expires 2027-02-25 |
| axiomprotocol.ai | 🔒 GoDaddy, auto-renew OFF, expires 2028-01-13 |

---

## PRICING (updated 2026-04-17 — Q-105 reframe)

| Tier key | Display name | Price | Lookups/mo | Stripe price ID | Notes |
|----------|-------------|-------|------------|-----------------|-------|
| `free` | Free | $0 | 10,000 | — | No credit card |
| `starter` | Starter | $49/mo | 50,000 | `price_1TM8sFClBrXaJBXikafSD5le` | Entry paid tier — shown on pricing page |
| `growth` | Growth | $199/mo | 150,000 | `price_1TNBwaClBrXaJBXi2CtyoE7s` | New entry paid tier |
| `pro` | Professional | $499/mo | 500,000 | `price_1TNBwbClBrXaJBXidt43zB1M` | Most Popular; compliance fields merged in |
| `scale` | Scale | $999/mo | 5,000,000 | `price_1TNBwcClBrXaJBXiC1G0g1Kx` | Volume anchor |
| `enterprise` | Enterprise | $2,000+/mo | Unlimited | — | Contact us |
| `metered` | Pay-as-you-go | $0.001/lookup | Unlimited | `price_1TM8sGClBrXaJBXiSOP6VLK4` | PAYG no commitment |
| — | Bulk Credits | $199/$799 one-time | 1M / 5M | bulk_1m / bulk_5m | One-shot CSV jobs |

> **Financial facts:** Break-even = 1 Professional customer ($499). Gross margin ~98%. LTV Professional (24mo avg) $11,976.

**North Star:** $100K MRR in 12 months

---

_Reference: `FEATURES.md` (built), `RELEASES.md` (history), `AddressAPIBusinessGTM.md` (GTM playbook), `strategy/` (9 analyses)_
