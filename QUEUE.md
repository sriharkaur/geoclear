# GeoClear — Master Queue
**Single source of truth for all work. Check items off as done.**
_Last updated: 2026-04-14 (session 5)_

---

## 🚀 LAUNCH BLOCKERS — ALL DONE ✅

- [x] Render Web Service deployed (`srv-d7ep7bfavr4c73d46gng`) ✅
- [x] GitHub repo: `sriharkaur/geoclear` — Render auto-deploys on push ✅
- [x] Persistent disk at `/data` — nad.db (91GB, 120M addresses) ✅
- [x] All env vars set on Render ✅
- [x] Cloudflare CNAME `geoclear.io → geoclear.onrender.com` ✅
- [x] SSL via Render custom domain ✅
- [x] Smoke test passing: `https://geoclear.io/api/health` ✅

### Stripe Setup — ALL DONE ✅
- [x] Live Stripe secret key, webhook secret, price IDs set in Render ✅
- [x] Live webhook registered: `https://geoclear.io/v1/webhook/stripe` ✅
- [x] Metered billing live: `STRIPE_METER_ID` + `STRIPE_PRICE_METERED` (live meter) ✅
- [x] Free tier self-serve signup (`POST /v1/signup`) ✅
- [x] `customer.subscription.deleted` → downgrade to free ✅
- [x] `customer.subscription.updated` → key tier synced on plan change ✅
- [x] `invoice.payment_failed` → dunning email sent ✅
- [x] Upgrade-in-place — existing key upgraded, no duplicate issued ✅

### Legal & Trust — ALL DONE ✅
- [x] Privacy Policy — `GET /privacy` ✅
- [x] Terms of Service — `GET /terms` ✅
- [x] Status page — UptimeRobot monitors live, shown on landing page + `/status.html` ✅

---

## T0 — DATA & CORE

- [x] Overture Maps gap-fill — FL, MI, NJ, NV, NH ✅
- [x] `inc_muni` vs `post_city` bug fixed ✅
- [x] Address confidence score 0–100 on every response ✅
- [x] Fuzzy / typo matching — `?fuzzy=true` on `/api/address` ✅
- [x] Staging Render service (`srv-d7f6rh58nd3s73cve8dg`, `geoclear-staging.onrender.com`) — 100GB disk, autoDeploy OFF — data import environment, no local disk needed ✅
- [x] `create-dev-db.js` — generates `data/dev.db` (572MB, 20K addrs/state) for local dev without 91GB nad.db ✅
- [x] `POST /v1/admin/stream-upload` — streams large files to `/data` without buffering ✅
- [x] `POST /v1/admin/upload-chunk` — resumable chunked upload for 37GB+ files (bypasses Render HTTP timeout) ✅
- [x] `POST /v1/admin/merge` — merges a SQLite DB into nad.db in background (INSERT OR IGNORE, 10K-row batches) ✅
- [x] `sync-staging-to-prod.sh` — documents and guides staging → prod data promotion workflow ✅
- [x] **Overture full gap-fill import** — 64.9M addresses across FL(16.1M), CA(27.1M), MI(4.7M), NJ(4.9M), PA(2.3M), MS(2.3M), SC, GA, SD, HI, LA, NV, NH + more — in `overture-additions.db` (37GB) ✅
- [ ] **Merge Overture data into prod** — upload `overture-additions.db` → `POST /v1/admin/merge` → 120M + 64.9M = ~185M addresses. **IN PROGRESS** (chunked upload running)
- [ ] Fill remaining state gaps via state GIS portals (AL, AK — not in Overture)
- [ ] Address disambiguation — rank candidates when multiple "123 Main St" exist
- [ ] Coverage declaration per response — which states have full/partial/no coverage
- [ ] OpenAddresses import (~50M additional US addresses, new source)
- [ ] NAD r23 quarterly update (~June 2026) — run on staging, merge to prod

---

## T1 — REVENUE UNLOCKING (first paying customers)

### Data Enrichment — ALL DONE ✅
- [x] Census tract + block group — `GET /api/enrich` ✅
- [x] County FIPS code — on every `/api/address` response ✅
- [x] FEMA flood zone — `GET /api/enrich` ✅
- [x] RDI — residential/commercial flag on every `/api/address` response ✅
- [x] Timezone — on every `/api/address` response ✅
- [ ] FCC broadband tier by address ($42B BEAD program demand)

### API Completeness — MOSTLY DONE ✅
- [x] Autocomplete / typeahead — `GET /api/suggest` ✅
- [x] Proximity / reverse geocoding — `GET /api/near` + `GET /api/enrich` ✅
- [x] Bulk address verify — `POST /api/address/bulk` (max 1,000 sync) ✅
- [ ] Address standardization (normalize to USPS format)
- [ ] Bulk async + webhooks (for 10M+ record jobs — current bulk is sync, max 1K)
- [ ] CSV upload → enriched CSV download (web UI, no-code users)

### Infrastructure — MOSTLY DONE
- [x] Metered flush cron — self-scheduling at midnight UTC in server process ✅
- [x] Per-lookup metered billing — `metered` tier, Stripe Billing Meter ✅
- [x] Rate limit tiers per API key — `req_per_min` + `req_per_day` per-key ✅
- [x] API key portal — `public/portal.html` ✅
- [x] Landing page with live demo widget — `public/landing.html` ✅
- [x] Status page — UptimeRobot + `/api/status` proxy + `/status.html` ✅
- [x] OpenAPI spec — `openapi.yaml` at repo root (OAS 3.0, all public endpoints) ✅
- [ ] Usage dashboard for API customers (self-serve usage over time)
- [ ] **API usage analytics** — (a) add `latency_ms` + `tier` columns to `usage_log`; (b) build `GET /v1/admin/analytics` returning 30-day breakdown (requests/day by tier, top keys by volume, error rate); (c) wire Stripe dashboard for revenue metrics — no external tool needed at this stage

### Launch Announcement — Pre-HN Gates
- [ ] **Docs page** `/docs` — full endpoint reference with curl + Node.js examples. Blocker for HN post.
- [ ] **15 warm outreach emails** — PropTech/Mortgage SaaS (Encompass, BytePro, Maxwell, Blend, Qualia, Snapdocs). Template in `AddressAPIBusinessGTM.md`. Include a live API key. Goal: 3 paying customers before HN.
- [ ] **Hacker News Show HN** — Tuesday or Wednesday 9am PT after docs are live. Title + first-comment template in `AddressAPIBusinessGTM.md`.
- [ ] **Product Hunt** — same day as HN.

### Passive Channels (set up once)
- [ ] **RapidAPI listing** — `openapi.yaml` ready. Steps: rapidapi.com → Provider Hub → Add New API → upload `openapi.yaml` → base URL `https://geoclear.io` → auth: `X-Api-Key`.
- [ ] **G2 listing** — Category: "Address Verification Software". Content in `AddressAPIBusinessGTM.md`.
- [ ] **Capterra listing** — same content as G2. Category: "Address Verification".
- [ ] **SEO** — blog post targeting "SmartyStreets alternative", "US address verification API". Write after first 3 customers.

---

## T2 — DIFFERENTIATION (days 30–90)

### Distribution
- [ ] Node.js SDK (`npm install geoclear`)
- [ ] Python SDK (`pip install geoclear`)
- [ ] Zapier integration ("Verify US address" action)
- [ ] Shopify App
- [ ] WordPress / WooCommerce plugin
- [ ] Salesforce AppExchange listing

### Enterprise
- [ ] 99.9% uptime SLA + credits policy (legal doc)
- [ ] SOC 2 Type II audit — start process now (takes 6–12 months)
- [ ] NCOA integration (address change detection — 40M Americans move/year)
- [ ] Mortgage compliance bundle (HMDA + CRA + census tract + FIPS + flood in 1 call)
- [ ] White-label / OEM API option
- [ ] Data licensing tier (flat file download, $10K–$100K/yr)

### Address Intelligence
- [ ] School district boundaries (top homebuyer question)
- [ ] Congressional + state legislative district
- [ ] Address history / change log
- [ ] Neighborhood character score (urban/suburban/rural)

---

## T3 — MOAT (months 3–6)

- [ ] USPS CASS certification (required for $10B direct mail market — 3–6 month process)
- [ ] DPV — Delivery Point Validation (bundled with CASS)
- [ ] Automated quarterly NAD update pipeline (cron → detect → download → re-import)
- [ ] Address change webhook service (push when address in DB changes)
- [ ] International: Canada (Overture has CA data, 15M addresses)
- [ ] International: UK (Ordnance Survey open data, 32M addresses)
- [ ] Parcel ID / property tax linkage
- [ ] Mobile SDK (iOS + Android)

---

## T4 — BIG SWINGS (6–18 months)

- [ ] Physical World Graph API — address nodes connected to businesses, schools, flood zones, etc.
- [ ] Climate Risk Score per address (FEMA + CAL FIRE + NOAA + USGS)
- [ ] National 911 Address Layer — partner with NENA ($10B NG911 funding)
- [ ] Autonomous Address Deduplication-as-a-Service (AI agent for CRM cleanup)
- [ ] Address Intelligence for AI Training Data licensing

---

## DOMAIN & INFRA STATUS

| Item | Status |
|------|--------|
| geoclear.io DNS | ✅ Cloudflare CNAME → geoclear.onrender.com |
| Render prod | ✅ Live — `srv-d7ep7bfavr4c73d46gng` (`geoclear.onrender.com`) |
| Render staging | ✅ Live — `srv-d7f6rh58nd3s73cve8dg` (`geoclear-staging.onrender.com`) — 100GB disk, autoDeploy OFF |
| GitHub repo | ✅ `sriharkaur/geoclear` — auto-deploys on push |
| auduu.com | ✅ Transfer to Cloudflare initiated |
| auduu.ai | 🔒 Locked at GoDaddy, auto-renew OFF, expires Feb 25 2027 |
| axiomprotocol.ai | 🔒 Locked at GoDaddy, auto-renew OFF, expires Jan 13 2028 |

---

## PRICING (current plan)

| Tier | Price | Lookups/mo |
|------|-------|-----------|
| Free | $0 | 10K/day |
| Starter | $49/mo | 50K/day |
| Growth | $249/mo | 500K/day |
| Scale | $999/mo | 5M/day |
| Enterprise | Custom | Unlimited |
| Data License | $10K–$100K/yr | Local copy |

**North Star:** $100K MRR in 12 months (20 Scale or 2 Enterprise customers)

---

_Reference docs: `FEATURES.md` (what's built), `RELEASES.md` (version history), `AddressAPIBusinessGTM.md` (GTM playbook)_
