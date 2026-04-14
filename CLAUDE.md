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

**Data**: `data/` is a **real directory** (moved from Syntheticdata — project is now self-contained).
Contains `nad.db` (85GB, 120M addresses), `keys.db` (live API keys), `NAD_r22.txt`.
Neither `nad.db` nor `keys.db` are in git — transferred to Render via rsync. See `RUNBOOK-DATA.md`.

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

When adding a feature:
1. **Read the relevant source files first** — do not guess existing APIs or patterns
2. **Schema changes** → update `schema.sql` AND document what migration is needed
3. **New endpoints** → add to `web-server.js`, follow existing auth middleware patterns
4. **New enrichment** → add to `enrich.js`, keep it composable
5. **API key scoping** → use `KeyStore` — never bypass key auth for new routes
6. **Test manually** before declaring done: `curl` the endpoint, check the response shape
7. **Commit format**: `<type>: <description>` (feat, fix, docs, refactor, test, chore)

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

### Data Operations — When to run RUNBOOK-DATA.md

| Trigger | Action |
|---------|--------|
| New Render service / disk re-created | Full rsync — `RUNBOOK-DATA.md` § Initial Full Transfer |
| NAD quarterly release (~every 3 months) | Delta rsync — `RUNBOOK-DATA.md` § Quarterly Delta Update |
| Overture gap-fill import completed locally | Delta rsync — same as above |
| Disaster recovery (disk lost/corrupt) | Full rsync — same as Initial Full Transfer |

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
