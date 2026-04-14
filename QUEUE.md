# GeoClear — Master Queue
**Single source of truth for all work. Check items off as done.**
_Last updated: 2026-04-13_

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
- [x] `invoice.payment_failed` → dunning email sent ✅
- [x] Upgrade-in-place — existing key upgraded, no duplicate issued ✅
- [ ] `customer.subscription.updated` handler (plan-change detection) — **PENDING**

---

## T0 — DATA & CORE

- [x] Overture Maps gap-fill — FL, MI, NJ, NV, NH ✅
- [x] `inc_muni` vs `post_city` bug fixed ✅
- [x] Address confidence score 0–100 on every response (`confidenceScore()` in enrich.js) ✅
- [x] Fuzzy / typo matching — `?fuzzy=true` on `/api/address` (`findAddressFuzzy` in query.js) ✅
- [ ] **Overture gap-fill full run** — `overture-import.js` exists; run locally against nad.db, then rsync delta to Render. Goal: 120M → ~130–135M addresses.
- [ ] Fill remaining state gaps via state GIS portals (GA, CA partial)
- [ ] Address disambiguation — rank candidates when multiple "123 Main St" exist
- [ ] Coverage declaration per response — which states have full/partial/no coverage

---

## T1 — REVENUE UNLOCKING (first paying customers)

### Data Enrichment — DONE ✅
- [x] Census tract + block group — via Census Bureau Geocoder API (`/api/enrich`) ✅
- [x] County FIPS code — `countyFips()` in enrich.js, on every `/api/address` response ✅
- [x] FEMA flood zone — via FEMA NFHL API (`/api/enrich`) ✅
- [x] RDI — `residentialFlag()` in enrich.js, on every `/api/address` response ✅
- [x] Timezone — `timezone()` in enrich.js, on every `/api/address` response ✅
- [ ] FCC broadband tier by address ($42B BEAD program demand)

### API Completeness — MOSTLY DONE
- [x] Autocomplete / typeahead — `GET /api/suggest` ✅
- [x] Proximity / reverse geocoding — `GET /api/near` + `GET /api/enrich` ✅
- [x] Bulk address verify — `POST /api/address/bulk` (max 1,000) ✅
- [ ] Address standardization (normalize to USPS format)
- [ ] Bulk async + webhooks (for 10M+ record jobs — current bulk is sync, max 1K)
- [ ] CSV upload → enriched CSV download (web UI, no-code users)

### Infrastructure — MOSTLY DONE
- [x] Metered flush cron — self-scheduling `setTimeout` at midnight UTC in server process ✅
- [x] Per-lookup metered billing — `metered` tier, Stripe Billing Meter, flush endpoint ✅
- [x] Rate limit tiers per API key — `req_per_min` + `req_per_day` enforced per-key ✅
- [x] API key portal — `public/portal.html` (signup, upgrade, key display) ✅
- [x] Landing page with live demo widget — `public/index.html` ✅
- [ ] Usage dashboard for API customers (show their own usage over time)
- [ ] Status page (UptimeRobot — free tier fine to start)

---

## T2 — DIFFERENTIATION (days 30–90)

### Distribution
- [ ] Node.js SDK (`npm install geoclear`) 
- [ ] Python SDK (`pip install geoclear`)
- [ ] RapidAPI listing
- [ ] Zapier integration ("Verify US address" action)
- [ ] Shopify App
- [ ] WordPress / WooCommerce plugin
- [ ] Salesforce AppExchange listing

### Enterprise
- [ ] 99.9% uptime SLA + credits policy (legal doc, 1 day)
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
| geoclear.io DNS | ✅ Cloudflare (christina/sage nameservers) |
| auduu.com | ✅ Transfer to Cloudflare initiated (5–7 days) |
| auduu.ai | 🔒 Locked at GoDaddy, auto-renew OFF, expires Feb 25 2027 |
| axiomprotocol.ai | 🔒 Locked at GoDaddy, auto-renew OFF, expires Jan 13 2028 |
| Clerk/SendGrid CNAMEs (axiomprotocol.ai) | ✅ All 6 added to Cloudflare |
| Render deployment | ⏸ Not yet |
| GitHub repo | ⏸ Not yet |

---

## PRICING (current plan)

| Tier | Price | Lookups/mo |
|------|-------|-----------|
| Free | $0 | 10K |
| Starter | $49/mo | 50K |
| Growth | $249/mo | 500K |
| Scale | $999/mo | 5M |
| Enterprise | Custom | Unlimited |
| Data License | $10K–$100K/yr | Local copy |

**North Star:** $100K MRR in 12 months (20 Scale or 2 Enterprise customers)

---

_Reference docs: `AddressQueue.md` (full backlog with CEO review), `AddressArchitecture.md`, `AddressAPIBusinessGTM.md`, `AddressBusinessCases.md`, `LAUNCH-CHECKLIST.md`_
