# GeoClear — Master Queue
**Single source of truth for all work. Check items off as done.**
_Last updated: 2026-04-15 (session 6 — SWOT analysis)_

---

## 🎯 SWOT PRIORITIES — Next 30 Days (from 2026-04-15 analysis)
> Source: `strategy/2026-04-15-swot-analysis.md`

### Top 5 — Do in this order

- [ ] **P1 — RapidAPI marketplace listing** — upload `openapi.yaml`, write enrichment-led description, set pricing tiers. ~60 min. Success: listing live within 7 days, first API call from RapidAPI within 14 days.
- [x] **P2 — Ship `/docs` page** — full endpoint reference, curl + Node.js examples, sidebar nav, rate limits, errors. ✅
- [ ] **P3 — Warm outreach to 20 target companies** — logistics, proptech, fintech. Use template in `AddressAPIBusinessGTM.md`. Success: 20 sent, 5 replies, 1 paid trial within 30 days.
- [x] **P4 — Usage dashboard in customer portal** — quota bar, 70% upgrade CTA, enrichment preview. ✅
- [ ] **P5 — Complete + announce Overture 185M merge** — verify row count, post HN + LinkedIn announcement. Success: 185M+ confirmed, announcement posted.

### Enrichment Monetization — "Enrichment = Pro" conversion lever (S1 + W2)

- [x] **Return enrichment fields as `null` for free/starter** — `census_tract`, `flood_zone`, `flood_sfha` + `_enrichment` upgrade hint on every `/api/address` response for non-pro tiers. ✅
- [x] **Soft-gate `/api/enrich` for free/starter** — 402 with example response + `upgrade_url` for free/starter/metered. ✅
- [x] **Enrichment preview in portal** — live enrichment field preview in `/portal.html`; shows real values for pro, `null — Pro required` for others. ✅
- [x] **Reframe pricing page** — portal pricing grid now leads with enrichment access; census tract + FEMA flood zone as primary differentiator. ✅
- [ ] **Fintech/insurance vertical outreach** — FEMA flood zone is a compliance line item for mortgage lenders (NFIP), property insurers, proptech. Outreach message: "flood zone determination API, self-serve, $249/mo" — not generic "address API." Target: lenders, insurers, proptech platforms.

### Infrastructure — CDN & Availability (T3)

> **Context:** Current setup is Cloudflare DNS-only (grey cloud) → Render origin. This means every request hits Render directly — no edge caching, no DDoS mitigation, no failover. Fine for launch, but a liability once paying customers depend on uptime. The fix is enabling Cloudflare proxy (orange cloud), but it has one hard prerequisite that will cause an outage if skipped.
>
> **Critical SSL prerequisite before enabling proxy:** Cloudflare's default SSL mode is "Flexible" — it encrypts browser→Cloudflare but sends plain HTTP to the origin. Render's custom domain cert expects HTTPS end-to-end. If you flip the orange cloud with Flexible SSL, the Render cert chain breaks and the site goes down. Set SSL/TLS mode to **Full (strict)** in Cloudflare dashboard *before* enabling proxy. Verify on `geoclear-staging.onrender.com` first — staging has the same Render cert setup.

- [x] **Enable Cloudflare proxy (orange cloud) on geoclear.io** ✅
  - SSL/TLS set to Full (strict), both DNS records proxied, CF-Ray header confirmed in smoke test

- [x] **Add Cloudflare cache rules for read-only API responses** ✅
  - Rule: "GeoClear read-only API cache" — matches `/api/stats`, `/api/states`, `/api/health`
  - TTL: 5 minutes (300s), ignore cache-control header — 1 of 10 active Cache Rules used

- [ ] **Evaluate Render autoscaling or standby instance** *(defer until first enterprise customer)*
  - Current single-instance setup: a deploy or process crash = 30–60s downtime
  - Render paid plans support multiple instances with zero-downtime deploys
  - Not urgent until an enterprise customer signs an uptime SLA — flag for T2 milestone

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
- [x] `POST /v1/admin/merge` — merges a SQLite DB into nad.db in background (INSERT OR IGNORE, 10K-row batches) — fixed to use writable DB connection (session 6) ✅
- [x] `sync-staging-to-prod.sh` — documents and guides staging → prod data promotion workflow ✅
- [x] `POST /v1/admin/import-tsv-gz-cached` — re-run import from cached `/data/overture.tsv.gz`; now runs in `worker_threads` (non-blocking) ✅
- [x] `import-worker.js` — standalone worker_threads module; offloads all SQLite bulk-insert work from main event loop ✅
- [x] `GET /v1/admin/db-probe` — diagnostic endpoint: tests write access, schema inspection, test INSERT ✅
- [x] Fixed write endpoints (`import-tsv-gz`, `import-tsv-gz-cached`, `merge`) — nad.db was opened readonly; now open separate writable connection per operation ✅
- [x] **Overture full gap-fill import** — 64.9M addresses across FL(16.1M), CA(27.1M), MI(4.7M), NJ(4.9M), PA(2.3M), MS(2.3M), SC, GA, SD, HI, LA, NV, NH + more — in `overture-additions.db` (37GB) ✅
- [x] **Merge Overture data into prod** — 198,657,535 addresses in nad.db. All 16 indexes rebuilt (completed 01:59 UTC 2026-04-16). ✅
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
