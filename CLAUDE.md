# GeoClear — Claude Code Project Instructions

> **US Address Intelligence API** — 120M+ addresses, real-time enrichment, Stripe-billed SaaS.
> Version 1.0.0 (2026-04-14) | Port 4001 | Stack: Node.js + SQLite (better-sqlite3) + Express
> North star: $100K MRR in 12 months
>
> **PRODUCTION STATUS (2026-04-14)**: LIVE at geoclear.io and geoclear.onrender.com
> Render service: `srv-d7ep7bfavr4c73d46gng` | nad.db: 91GB, 120M addresses on `/data`
> Stripe: LIVE mode — sk_live, whsec_live, live price IDs (Starter/Growth/Pay-as-you-go/Scale)
> DNS: Cloudflare CNAME DNS-only → geoclear.onrender.com

---

## CRITICAL BEHAVIOR RULE — Auto-Update Docs After Every Change

**After implementing any feature, fix, or infrastructure change — without being asked — always:**

1. Update `FEATURES.md` — add to the right section; remove from "Not yet built" if it was there
2. Add a bullet to `RELEASES.md` → `## Unreleased`
3. Update `ARCHITECTURE.md` — endpoint tables, tier table, "Not Yet Built" list
4. Check off the item in `QUEUE.md` with ✅

**After a deploy** — without being asked — run the smoke test (`curl https://geoclear.io/api/health`) and report pass/fail.

**Never declare a task done** without having updated these docs. The docs are part of the definition of done.

---

## CRITICAL BEHAVIOR RULE — Staging-First for All Data Operations

**Never run heavy data imports, large file transfers, or database mutations directly on prod or locally.**

The staging service (`geoclear-staging.onrender.com`, `srv-d7f6rh58nd3s73cve8dg`) is the data processing environment.

**The data pipeline is always:**
```
New source (S3 parquet / NAD / OpenAddresses)
  → Run import on staging Render Shell
  → Verify row counts on staging
  → Upload to prod /data via POST /v1/admin/upload-chunk (chunked, resumable)
  → Merge into prod nad.db via POST /v1/admin/merge
  → Verify via GET /api/stats
```

**Rules:**
1. **Never run `overture-import.js` or any large download locally** — staging has the 100GB disk; your Mac does not.
2. **Never rsync nad.db from local to prod** — always go through staging → upload-chunk → merge.
3. **Never overwrite prod nad.db directly** — only additive merges via INSERT OR IGNORE.
4. **For local dev**, use `data/dev.db` (572MB, 20K addrs/state). Generate with `node create-dev-db.js`. Set `NAD_DB=data/dev.db`.
5. **Staging autoDeploy is OFF** — code updates go to prod automatically; staging only gets a deploy when triggered manually (data work only).

---

## CRITICAL BEHAVIOR RULE — Branch Strategy

**Every new session: assess the scope before touching code.**

| Change type | Git strategy |
|-------------|-------------|
| Single-file fix, docs update, config tweak | Push directly to `main` |
| Multi-file feature, new endpoint, schema change | `git checkout -b feat/<name>` → work → `git merge main` when complete |
| Data operation (import, merge) | No branch needed — data never goes in git |

**Why:** `git push main` auto-deploys to prod. Half-done multi-file work going live with real customers is bad. A branch costs one extra git step; a bad prod deploy costs customer trust.

**NOT** doing full worktrees (OptionFlow-style) — that's for large monorepos with concurrent workstreams. GeoClear is a single-service project; simple branches are the right size.

---

## CRITICAL BEHAVIOR RULE — No Fabrication

**NEVER make up, estimate, or guess facts presented as if real.** This includes:
- Prices, API costs, domain availability
- Tool outputs or API responses you haven't actually run
- Code behavior you haven't verified by reading the actual files

If you don't know: **"I don't know — let me look that up."** The user makes real business and technical decisions based on this.

---

## CRITICAL SECURITY RULE — Never Share Secrets in Chat

**NEVER paste API keys, tokens, passwords, or secrets into chat output.**

- Secrets live in `~/.zshrc` — read that file to get `RENDER_API_KEY`, `CLOUDFLARE_API_KEY`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, etc.
- Use the browser (Playwright) for Render/Cloudflare dashboards — never paste keys into the conversation
- If a secret appears in chat accidentally, treat it as **compromised and revoke immediately**

---

## 1. ARCHITECTURE

**Stack**: Node.js (no framework beyond Express) | SQLite via better-sqlite3 | No ORM | No frontend framework

| File | Responsibility |
|------|---------------|
| `web-server.js` | Express server, all API routes, Stripe webhook, key auth middleware |
| `query.js` | `NADQuery` class — all address lookup/search logic against SQLite |
| `enrich.js` | `enrich()` — census, FEMA, RDI, timezone enrichment pipeline |
| `geocode.js` | `enrichPoint()` — reverse geocoding |
| `keys.js` | `KeyStore` — API key issuance, validation, usage tracking |
| `schema.sql` | DB schema — addresses, api_keys, usage_logs tables |
| `init-db.js` | One-time DB initialization |
| `download.js` | NAD + Overture data download pipeline |
| `overture-import.js` | Overture Maps gap-fill importer |
| `mcp-server.js` | MCP server interface for Claude integration |
| `public/` | Static assets (landing page, demo widget) |
| `docs/` | `api-guide.md`, `user-guide.md`, `systems-guide.md` |

**Data (local)**: `data/` contains `dev.db` (572MB, local dev only) and `keys.db` (live customer keys — never rsync to Render). Full `nad.db` (91GB) lives on prod Render disk only. All heavy imports run on staging. See Staging-First rule above.

**Data (prod)**: `/data/nad.db` (91GB, 120M+ addresses). `/data/keys.db` (live API keys). Never in git.

**Port**: 4001 (local). Production: `geoclear.io` via Render → Cloudflare.

---

## 2. COMMANDS

```bash
node web-server.js                    # Start server (port 4001)
node web-server.js --port=4002        # Custom port
node init-db.js                       # Init DB schema (one-time)
npm start                             # Alias for node web-server.js

# Health check
curl http://localhost:4001/api/health

# Address lookup
curl "http://localhost:4001/api/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC"

# Admin (local only)
curl -H "X-Admin-Secret: nad_admin_localdev" "http://localhost:4001/v1/admin/keys/stats"

# Production smoke test
curl https://geoclear.io/api/health
curl https://geoclear.onrender.com/api/health
```

---

## 3. DEVELOPMENT WORKFLOW

**Session start checklist:**
1. Check scope — single-file or multi-file? See Branch Strategy rule above.
2. If multi-file: `git checkout -b feat/<name>` before writing any code.
3. Read `QUEUE.md` to see what's pending and what's in progress.

**When adding a feature:**
1. **Read the relevant source files first** — do not guess existing APIs or patterns
2. **Schema changes** → update `schema.sql` AND document what migration is needed
3. **New endpoints** → add to `web-server.js`, follow existing auth middleware patterns
4. **New enrichment** → add to `enrich.js`, keep it composable
5. **API key scoping** → use `KeyStore` — never bypass key auth for new routes
6. **Test manually** before declaring done: `curl` the endpoint, check the response shape
7. **Commit format**: `<type>: <description>` (feat, fix, docs, refactor, test, chore)
8. **If on a feature branch**: merge to main only when the feature is complete and smoke-tested — not mid-work.

**For data operations** — always use staging, never local. See Staging-First rule above.

---

## 4. CRITICAL RULES

1. **NO DESTRUCTIVE OPS on `data/`** — contains the live NAD DB (85GB) and customer `keys.db`. Never `rm`, truncate, or drop tables without explicit approval. Never rsync `keys.db` to Render (contains live API keys).
2. **NO HARDCODING secrets** — All secrets via `process.env.*`. Local fallbacks only for `localdev` mode.
3. **STRIPE is real money** — Double-check webhook handler logic. Never skip signature verification (`stripe.webhooks.constructEvent()`).
4. **API key auth is the revenue gate** — Never weaken `KeyStore` validation or bypass it on production routes.
5. **Verify before full data run** — For any import/download script, do a `--limit 1000` sample first.
6. **No deletions without approval** — Never `git rm`, `rm -rf`, or drop schema without asking.

---

## 5. ENVIRONMENT VARIABLES

| Variable | Purpose | Where |
|----------|---------|-------|
| `NAD_ADMIN_SECRET` | Admin endpoint auth | Render dashboard |
| `STRIPE_SECRET_KEY` | Stripe API | `~/.zshrc` locally, Render dashboard in prod |
| `STRIPE_WEBHOOK_SECRET` | Webhook sig verification | Render dashboard |
| `STRIPE_PRICE_STARTER` | $49/mo price ID | Render dashboard |
| `STRIPE_PRICE_PRO` | $249/mo price ID | Render dashboard |
| `NAD_BASE_URL` | Absolute URL for redirects | `https://geoclear.io` in prod |
| `NAD_ALLOWED_ORIGINS` | CORS whitelist | `https://geoclear.io` in prod |

Local defaults are set in `web-server.js` (e.g., `process.env.NAD_ADMIN_SECRET || 'nad_admin_localdev'`).

---

## 6. DEPLOYMENT (Render + Cloudflare)

| Step | What |
|------|------|
| Code changes | `git push` → Render auto-deploys |
| DB schema changes | Update `schema.sql`, document migration steps |
| Persistent data | Render disk at `/data` — never in git |
| DNS | Cloudflare CNAME `@` → `<service>.onrender.com` (proxied) |
| Build command | `npm install` |
| Start command | `node web-server.js` |

QUEUE.md has the detailed deployment checklist (GitHub push → Render → DNS → smoke test).

### Render Services

| Service | ID | URL | Purpose |
|---------|----|-----|---------|
| Prod | `srv-d7ep7bfavr4c73d46gng` | `geoclear.io` | Live API — auto-deploys on `git push main` |
| Staging | `srv-d7f6rh58nd3s73cve8dg` | `geoclear-staging.onrender.com` | Data imports only — autoDeploy OFF, 100GB disk |

### Data Operations — Staging Pipeline

| Trigger | Action |
|---------|--------|
| New NAD quarterly release (~every 3 months) | Run import on staging Render Shell → upload-chunk to prod → merge |
| Overture / OpenAddresses new data | Run `overture-import.js --db=/data/overture-additions.db` on staging → upload-chunk → merge |
| Disaster recovery (prod disk lost) | Re-run full import on staging → upload-chunk → merge |
| Local dev setup | `node create-dev-db.js` → `NAD_DB=data/dev.db node web-server.js` |

Say **"data runbook"** → I will read `RUNBOOK-DATA.md` and walk you through the right section.

---

## 7. PRICING TIERS (reference)

| Tier | Price | Lookups/mo |
|------|-------|-----------|
| Free | $0 | 10K |
| Starter | $49/mo | 50K |
| Growth | $249/mo | 500K |
| Scale | $999/mo | 5M |
| Enterprise | Custom | Unlimited |

---

## 8. COMMON MISTAKES

| Symptom | Cause | Fix |
|---------|-------|-----|
| `SQLITE_CANTOPEN` | `data/` symlink broken | Check symlink target exists |
| Stripe webhook 400 | Missing raw body parser | Ensure `express.raw()` before JSON parser for `/v1/webhook/stripe` |
| CORS error in browser | `NAD_ALLOWED_ORIGINS` not set | Add origin to env var |
| API key always invalid | `KeyStore` DB not initialized | Run `init-db.js` first |
| Rate limit hitting in dev | Default limiter too tight | Pass `--port` flag; limiter is per-IP |

---

## 9. SHORTHAND COMMANDS

| You say... | I do... |
|-----------|---------|
| "add enrichment for X" | Add to `enrich.js` pipeline, wire to `/v1/address` response |
| "add endpoint for X" | Add route to `web-server.js` with key auth |
| "check keys" | Read `keys.js` + `KeyStore` logic |
| "check stripe" | Read Stripe webhook + checkout session handler in `web-server.js` |
| "deploy" | Walk through QUEUE.md Render deployment steps |
| "smoke test" | Run curl health + address lookup |
| "architecture" | Read `ARCHITECTURE.md` — full current feature list, all endpoints, tiers |
| "releases" | Read `RELEASES.md` — full version history and release notes |
| "cut release X.Y.Z" | Move Unreleased → versioned section in `RELEASES.md`, update `ARCHITECTURE.md` header |
| "data pipeline" / "data ops" | Read `ARCHITECTURE.md` § Data Pipeline; follow Staging-First rule |
| "import X data" | Always: staging Render Shell → verify → upload-chunk → merge → verify prod stats |

---

## 10. VERSIONING DISCIPLINE

Every time a feature ships (use `/feature` skill — it enforces this automatically):
1. **Update `FEATURES.md`** — canonical inventory of everything built; add to the right section, remove from "Not yet built"
2. **Update `RELEASES.md` → Unreleased** — one bullet per shipped item
3. **Update `ARCHITECTURE.md`** — add new endpoint or tier change to the relevant table
4. **Update `QUEUE.md`** — check off the completed item with ✅

When cutting a release (use `/release vX.Y.Z` — it enforces this automatically):
1. Move everything under `## Unreleased` in `RELEASES.md` into a new `## vX.Y.Z — YYYY-MM-DD` section
2. Update `ARCHITECTURE.md` header (`Last updated: vX.Y.Z`)
3. Update version in `CLAUDE.md` header
4. Update `FEATURES.md` header (`Last updated:`)

Reference files:
- `FEATURES.md` — **primary** — complete inventory of every feature built, organized by area
- `ARCHITECTURE.md` — tech stack, all endpoints, tier table, Stripe event table
- `RELEASES.md` — chronological version history
- `QUEUE.md` — what is pending
