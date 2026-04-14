# GeoClear — Master Queue
**Single source of truth for all work. Check items off as done.**
_Last updated: 2026-04-13_

---

## 🚀 LAUNCH BLOCKERS (do these first)

- [ ] Set `NAD_ADMIN_SECRET` env var — replace hardcoded `nad_admin_localdev`
- [ ] Create Stripe products: **Starter $49/mo** + **Pro $249/mo** → copy Price IDs
- [ ] Create Stripe webhook → `POST /v1/webhook/stripe` → event: `checkout.session.completed`
- [ ] Set env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `NAD_BASE_URL`, `NAD_ALLOWED_ORIGINS`
- [ ] Push geoclear repo to GitHub
- [ ] Deploy to Render → Web Service, mount persistent disk for `data/`
- [ ] Point `geoclear.io` → Render service URL (add A/CNAME in Cloudflare)
- [ ] Smoke test live API: `/health`, `/v1/stats`, `/v1/address?street=...`
- [ ] Enable SSL on Render (auto via Cloudflare or Render TLS)

---

## T0 — DATA & CORE (product not sellable without these)

- [x] Overture Maps integration — FL, MI, NJ, NV, NH gap fill ✅
- [x] `inc_muni` vs `post_city` bug fixed ✅
- [ ] Fill remaining state gaps via state GIS portals (GA, CA partial)
- [ ] Address confidence score (0–100) on every response
- [ ] Fuzzy / typo matching (Levenshtein / phonetic) — "Pensilvania Ave" works
- [ ] Address disambiguation — rank candidates when multiple "123 Main St" exist
- [ ] Coverage declaration per response — which states have full/partial/no coverage

---

## T1 — REVENUE UNLOCKING (first paying customers)

### Data Enrichment
- [ ] Census tract + block code per address (required for HMDA/mortgage)
- [ ] County FIPS code (required for all gov/healthcare data exchange)
- [ ] FEMA flood zone per address (required for mortgage underwriting)
- [ ] RDI — residential vs commercial flag
- [ ] Time zone by address
- [ ] FCC broadband tier by address ($42B BEAD program demand)

### API Completeness
- [ ] Autocomplete / typeahead endpoint (`GET /v1/autocomplete`)
- [ ] Reverse geocoding (`GET /v1/reverse?lat=&lon=`)
- [ ] Address standardization (normalize to USPS format)
- [ ] Bulk async processing + webhooks (for 10M+ record jobs)
- [ ] CSV upload → enriched CSV download (web UI, no-code users)

### Infrastructure
- [ ] API key management portal (self-serve signup → get key in <60s)
- [ ] Stripe metered billing wired to usage
- [ ] Usage dashboard for API customers
- [ ] Rate limit tiers per API key (Starter vs Growth vs Enterprise)
- [ ] Status page (UptimeRobot — free tier fine to start)
- [ ] Landing page with live demo widget

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
