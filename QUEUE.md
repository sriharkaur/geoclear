# GeoClear — Master Queue
**Single source of truth for all work. Check items off as done.**
_Last updated: 2026-04-17 (session 22 — data strategy section added: 15 additional data sources prioritized across 3 tiers, 6 platform capability decisions)_

> **North Star:** $100K MRR in 12 months
> **Next milestone:** $500 MRR by Day 30 → $2,500 by Day 60 → $5,000 by Day 90
> **Rule:** No new strategy sessions until Day 60. No new product features until first paying customer.
> **Strategy files:** [STRATEGY-INDEX.md](strategy/STRATEGY-INDEX.md) — all 9 analyses with conclusions

---

## 🔴 URGENT — Fix Now (production data issue)

- ✅ **FK relink on prod** — DONE 2026-04-17. MI/NJ/NV/NH/FL/CA now show correct counts (FL: 41.7M, CA: 15M, MI: 9.5M, NJ: 10M, NV: 2.3M, NH: 870K). Fixed via `POST /v1/admin/refresh-counts` after adding `refresh-counts-worker.js`.

---

## PHASE 1 — Days 1–30: Ship the 7 GTM Assets
> Every item here is a prerequisite for the first paying customer. Do in sequence. No detours.

### Week 1 — Foundation (Days 1–7)

- [x] **RapidAPI listing** ✅ 2026-04-17 — GeoClear live at `rapidapi.com/auduuai/api/geoclear`. OpenAPI spec imported, all endpoints (Address/Enrichment/Geography/Account/Status), base URL `https://geoclear.io`, X-Api-Key auth, Category: Data, visibility: Public.
- [x] **`/compliance` landing page** ✅ 2026-04-17 — `public/compliance.html` (678 lines) + `/compliance` route in `web-server.js`. Awaiting commit with relink-complete batch. — H1: "Flood zone + census tract for every US address. NFIP-ready." Body: FEMA NFHL as primary source (auditable for legal), HMDA census tract, self-serve $249/mo, no sales call. Show live JSON response with `flood_zone`, `flood_sfha`, `census_tract`. CTA: "Start free." File: `public/compliance.html`, route in `web-server.js`. *Destination for all compliance outreach emails — zero Claire conversions without this.*
- [ ] **Google Search Console setup** — add geoclear.io as property, verify via Cloudflare DNS TXT record, submit sitemap. 20 min. *Prerequisite for all SEO traction.*
- [ ] **Build compliance outreach list — 15 targets** — LinkedIn: "VP Product" OR "Head of Engineering" + "mortgage" OR "insurance" OR "proptech". Targets: Encompass, BytePro, Maxwell, Blend, Qualia, Snapdocs, Hippo Insurance, Kin Insurance, Better.com, Morty, Neptune Flood, Openly, Lemonade. Add name + direct email to `AddressAPIBusinessGTM.md`.
- [ ] **Send compliance outreach batch 1 (15 emails)** — plain text, < 150 words. Subject: `"Flood zone determination API — NFIP-ready, self-serve, $249/mo"`. Body: NFIP compliance framing → live API JSON showing `flood_zone: "AE"`, `flood_sfha: true`, `census_tract` → link to `/compliance`. *Do not send until /compliance page is live.*

### Week 2 — Launch (Days 8–14)

- [ ] **Post "Show HN: GeoClear"** — title: `"Show HN: GeoClear – US address API with FEMA flood zone + census tract in one call"`. Post Tuesday or Wednesday 9am PT. First comment: data pipeline (NAD + Overture + FEMA NFHL + Census Bureau), enrichment fields, free tier limits, link to /docs. *Post after RapidAPI listing is live.*
- [ ] **Write `/docs/vs-smartystreets` comparison page** — capability table (flood zone ✅ vs ❌, census tract, pricing, free tier), migration guide. SEO target: "SmartyStreets alternative", "address API with flood zone". File: `public/docs/vs-smartystreets.html`.
- [ ] **Write `/docs/flood-zone-api` SEO page** — "What is FEMA flood zone data?", FEMA zone codes (AE, X, VE), how to get it via API, curl example. SEO target: "FEMA flood zone API", "NFIP flood determination API". Submit both new pages to GSC.
- [ ] **Follow up compliance outreach batch 1** — Day 5 after send (~Day 10–12). One sentence: "Did you get a chance to see the flood zone response? Happy to do a 15-min call." Max 2 touchpoints total.
- [ ] **LinkedIn founder post — FEMA anchor** — "Manual flood zone determination costs $3–$15 per address. We built an API that returns it for free (up to 1K/day)." Screenshot of API response showing `flood_zone`. Tag PropTech + mortgage tech communities.

### Week 3 — Messaging + Instrumentation (Days 15–21)

- [x] **Rewrite landing page H1/H2/CTA** ✅ 2026-04-17 — H1: "US address intelligence. One call. Everything included." / H2: "Validate, geocode, and enrich..." / CTA: "Get your free key" — H1: `"US address intelligence. One call. Everything included."` H2: `"Validate, geocode, and enrich US addresses with census tract, FEMA flood zone, and timezone — from a free API key."` CTA: `"Get your free key"`. File: `public/landing.html`
- [x] **Add FEMA anchor copy to pricing section** ✅ 2026-04-17 — Banner above pricing grid: "Manual flood zone determination costs $3–$15 per address. GeoClear Professional includes unlimited flood zone lookups for $249/mo." — above the pricing grid: `"Manual flood zone determination costs $3–$15 per address. GeoClear Pro includes unlimited flood zone lookups for $249/mo."` File: `public/landing.html`
- [x] **Rename tiers on pricing page + portal** ✅ 2026-04-17 — Starter→Builder, Growth→Professional (display names only; internal Stripe keys unchanged). Updated landing.html, portal.html, JS volSteps, calc default. — display names only (internal keys unchanged): Starter → Builder, Pro → Professional. File: `public/landing.html`, `public/portal.html`
- [x] **Set "Most Popular" badge on Professional tier** ✅ 2026-04-17 — `featured` class + "Most Popular" badge moved from Builder ($49) to Professional ($249). Slider defaults to Professional on page load. — move visual highlight to the $249 card; make pricing slider default-land on Professional on page load. File: `public/landing.html`
- [x] **Add Enterprise "Starting at $2,000/mo"** ✅ 2026-04-17 — Styled Enterprise banner below pricing grid with "$2,000/mo", feature list, and "Contact us →" mailto CTA. — removes ambiguity; adds "Contact us" CTA. File: `public/landing.html`
- [x] **Add data provenance section to landing page** ✅ 2026-04-17 — 4-card section before CTA: USDOT NAD r22, Overture Maps, FEMA NFHL API, US Census Bureau Geocoder. Each with source label + one-liner. — all three personas ask "where does this data come from?" Four sources with logos + one-liner each: USDOT NAD r22, Overture Maps, FEMA NFHL API, US Census Bureau Geocoder. File: `public/landing.html`
- [x] **Add competitive comparison table to landing page** ✅ 2026-04-17 — GeoClear vs SmartyStreets vs Lob vs Melissa. 7-row table. Key row: FEMA flood zone (✓ Free vs ✗ vs ✗ vs ✗). Free tier comparison included. — GeoClear vs SmartyStreets vs Lob vs Melissa. Key row: FEMA flood zone (✅ free vs ❌ vs ❌ vs ❌). File: `public/landing.html`
- [x] **Add `first_call_at` timestamp to `api_keys` table** ✅ 2026-04-17 — Migration in keys.js. Set via `COALESCE(first_call_at, datetime('now'))` in recordUsage UPDATE. — set on first successful API call per key. Migration: `ALTER TABLE api_keys ADD COLUMN first_call_at INTEGER`. Set in auth middleware. Files: `schema.sql`, `web-server.js`
- [x] **Add `latency_ms` + `tier` columns to `usage_log`** ✅ 2026-04-17 — Migrations in keys.js. Latency captured via `process.hrtime.bigint()` in auth middleware. Tier passed from `info.tier`. — required for KPI tracking. Migration: `ALTER TABLE usage_log ADD COLUMN latency_ms INTEGER; ADD COLUMN tier TEXT`. Files: `schema.sql`, `web-server.js`

### Week 4 — Convert + Retain (Days 22–30)

- [x] **Build `GET /v1/admin/analytics` endpoint** ✅ 2026-04-17 — Returns: requests_by_day, top_keys_by_volume, tier_breakdown, error_rate, new_signups_by_day, avg_latency_by_endpoint. `?days=N` param (default 30). — 30-day breakdown: requests/day by tier, top 10 keys by volume, error rate, new signups/day, upgrades/downgrades. Required for daily pulse + weekly KPI review. File: `web-server.js`
- [x] **Build welcome email drip (3 emails, SendGrid)** ✅ 2026-04-17 — Day 1: existing keyEmail on signup. Day 3: sent if first_call_at set (shows enrichment curl example). Day 7: upgrade prompt for free/starter, feature roundup for paid. Daily cron at 01:00 UTC. `drip_sent` column tracks state. Manual trigger: `POST /v1/admin/drip/run`. — Day 1: key + 5-min quickstart curl example; Day 3 (only if ≥ 1 API call made): "you've made X calls — here's what enrichment looks like"; Day 7: upgrade to Professional for unlimited enrichment. Personalise with `GET /v1/me` usage data.
- [x] **Product Hunt listing** ✅ 2026-04-17 — Draft saved at `producthunt.com/products/geoclear-address-intelligence-api`. Name: "GeoClear — Address Intelligence API", tagline: "Address API with FEMA flood zone + census tract. Free." (54 chars), description + maker comment filled, tags: Developer Tools + API, pricing: Paid with free tier, bootstrapped, gallery: landing page screenshot. Ready to schedule launch date.
- [ ] **Compliance outreach batch 2 (15 new targets)** — apply learnings from batch 1. If flood zone subject got replies: keep. If not: test `"Quick question about your flood zone workflow"` or `"HMDA census tract API — $249/mo, no sales call"`.
- [x] **Set up KPI cadence** ✅ 2026-04-17 — `sessions/KPI-WEEKLY-LOG.md` with bookmarks (daily pulse, analytics, Stripe, SendGrid, uptime) + weekly metrics template. Stripe MRR notifications checklist included.
- [x] **Set calendar reminders** ✅ 2026-04-17 — Google Calendar events created: Month 3 (2026-07-16, red), Month 5 investment trigger (2026-09-16, orange), Month 6 strategic review (2026-10-16, blue). Each with full assessment checklist.

### Day 30 Checkpoint

- [ ] **[Day 30] $500 MRR check** — if yes: identify winning channel, double down in Phase 2. If no: email every free signup personally ("what were you trying to build?") before adding any new channels. Offer founding-customer pricing ($149/mo, locked 12 months) to first 5 customers.

### War Room Triggers

- [ ] **[Day 7] Outreach reply rate** — if 0 replies after 15 emails: check spam first; if fine, rewrite body to question-first opener.
- [ ] **[HN day] < 10 upvotes** — do not repost. Immediately cross-post to dev.to + r/webdev + r/programming.

---

## PHASE 2 — Days 30–60: Scale What Worked
> Don't add new channels. Scale the one that produced the first customer.

- [x] **Create Pro Compliance tier at $499 in Stripe** ✅ 2026-04-17 — `pro_compliance` in TIERS (keys.js) + STRIPE_PRICES (web-server.js), portal.html card added, SLA document at `public/geoclear-compliance-sla.html` (printable, signable), linked from /compliance page. **Pending**: create $499 price in Stripe dashboard, set `STRIPE_PRICE_PRO_COMPLIANCE` env var in Render.
- [x] **Add "Why GeoClear vs SmartyStreets" section to `/docs`** ✅ 2026-04-17 — 6-row table + migration guide added to docs.html; sidebar nav link added.
- [x] **Add tagline to `/docs` page header** ✅ 2026-04-17 — "198M US addresses. Census tract, FEMA flood zone, and timezone — one API call." added to docs intro section.
- [x] **Add 500 enrichment calls/mo to Builder tier** ✅ 2026-04-17 — `enrichment_monthly_limit: 500` in TIERS, `checkEnrichmentQuota()` method in KeyStore, quota check wired into `/api/enrich`. Files: `keys.js`, `web-server.js`.
- [x] **Fix activation funnel** ✅ 2026-04-17 — 30-second curl added to Day 1 welcome email (`keyEmail()`); 80% daily quota warning header (`X-Quota-Warning`) in auth middleware. Files: `web-server.js`.
- [ ] **Scale winning channel** — if outreach: batch 3 (30 targets) + testimonial request from first customer. If RapidAPI/HN: 2 more SEO pages + submit to developer newsletters (TLDR, Bytes.dev).
- [ ] **LinkedIn founder post — "one call" developer angle** — curl example returning `flood_zone` + `census_tract` + `timezone` + `residential`. "Free tier. No credit card." Cross-post to dev.to + r/webdev.
- [ ] **"Why GeoClear" SEO content plan** — 10 target keywords from GSC data; map to pages/posts; schedule 1 post/week for 8 weeks.

### Day 60 Checkpoint

- [ ] **[Day 60] $2,500 MRR check + first monthly strategic review** — MRR, NRR, ECPC (North Star), CAC by channel, activation rate, cohort retention. Schedule breakeven review. Next strategy session at this point.

---

## PHASE 3 — Days 60–90: Execute to PMF Signal
> Target: $5,000 MRR, NRR > 100%, ECPC growing week-over-week.

- [ ] **Create Bulk Credits Pack in Stripe** — 1M credits for $199 one-time; 5M for $799. No expiry. No enrichment (preserves Pro upsell). Add "Clean a list?" CTA to pricing page. *Only after CSV upload exists or is scheduled.*
- [ ] **Build `/bulk` landing page** — H1: "Clean your address list. No subscription." Framing: upload CSV → validate → download. Pricing: 1M / $199. File: `public/bulk.html`
- [ ] **Compliance outreach batch 3 (30 targets)** — apply learnings from batches 1 + 2.
- [ ] **G2 listing** — Category: "Address Verification Software". Content in `AddressAPIBusinessGTM.md`. Keywords: "bulk address validation", "CRM data quality".
- [ ] **Capterra listing** — same content as G2. Category: "Address Verification".
- [ ] **Begin CASS certification research** — USPS application requirements, engineering estimate, timeline. Add to T3 with start date. The 3–6 month process means starting late is costly.
- [ ] **Set Crunchbase + Google alerts** — Crunchbase: "address verification" + "geocoding" + "property data" funding rounds. Google alerts: "Lob address enrichment", "Google Maps census tract", "SmartyStreets flood zone".
- [ ] **Monthly check: SmartyStreets pricing page** — watch for flood zone or census tract appearing at any tier. If yes: reassess Pro tier pricing and GTM messaging immediately.

### Day 90 Checkpoint

- [ ] **[Day 90] Full assessment** — (1) $5K MRR? (2) ECPC growing week-over-week? (3) Which ICP converted most reliably? (4) Anyone churn — if yes, exit interview. (5) NRR > 100%? Schedule next 90-day plan.

---

## PRODUCT BACKLOG — Revenue-Blocking (do after first paying customer)

- [x] **CSV upload → enriched CSV download** ✅ 2026-04-17 — `POST /api/address/csv` (text/csv, max 5K rows, 10MB). Auto-detects columns. Returns: geo_verified, nad_uuid, confidence, residential, fips, timezone, coverage, match_type. RFC 4180 inline. **Pending**: portal drag-drop UI + pro-tier external enrichment (flood_zone, census_tract).
- [ ] **Add metered cost calculator to pricing slider** — "500K addresses × $0.002 = $1,000." Add "one-time cleanup" framing alongside monthly subscription. File: `public/landing.html`
- [ ] **Usage dashboard for customers** — self-serve usage over time in portal (calls/day, quota used, cost accrued for metered). File: `public/portal.html`
- [ ] **API usage analytics endpoint** — `GET /v1/admin/analytics`: requests/day by tier, top keys by volume, error rate. *(also in Phase 1 Week 4 — done there, remove when complete)*
- [ ] **Add 500-call enrichment taste to Builder tier** — *(also in Phase 2 — remove this entry when done)*
- [ ] **FCC broadband tier by address** — $42B BEAD program demand. Enrichment field addition.
- [ ] **Address standardization** — normalize to USPS format.
- [ ] **Bulk async + webhooks** — for 10M+ record jobs (current bulk is sync, max 1K).

---

## ENGINEERING INFRASTRUCTURE

- [x] **Data Catalog** ✅ 2026-04-17 — `docs/DATA-CATALOG.md` created. Comprehensive inventory of all 9 data sources (NAD, Overture, Census, FEMA, USGS, USFS WHP, NOAA Storm, CAL FIRE FHSZ, OpenAddresses). Each entry covers: publisher, license, role, coverage, last sourced, next refresh date, cadence, API endpoint, pipeline, all attributes extracted, use cases powered. Includes refresh calendar (2026-07-15 NAD, 2026-10-01 USFS, 2027-03-01 NOAA). Update this file whenever a source is added or refreshed.

---

## T0 — DATA & CORE STATUS

✅ Complete: NAD r22 (120M), Overture full gap-fill (64.9M), total 198,657,537 addresses, all 16 indexes live (2026-04-16).

✅ FK relink + count refresh complete (2026-04-17):
- 180.3M rows fully linked (state_id → county_id → city_id → zip_code_id)
- 18.3M rows permanently unlinked (Overture rows imported with state=NULL — no state field in source data, cannot relink)
- All major states now show correct counts on /api/states (FL: 41.7M, CA: 15M, MI: 9.5M, NJ: 10M, NV: 2.3M, NH: 870K)
- New endpoints: POST /v1/admin/relink-fks (idempotent), POST /v1/admin/refresh-counts

Open:
- [ ] Fill remaining state gaps — AL, AK (not in Overture — need state GIS portals)
- [ ] NAD r23 quarterly update (~June 2026) — run on staging, merge to prod

---

## DATA STRATEGY — Additional Sources & Platform Capabilities

> **Context:** These items cover (1) additional data sources that extend GeoClear's addressable use cases and competitive moat, and (2) platform architecture decisions that determine whether GeoClear stays an enrichment API or becomes the authoritative geospatial intelligence layer for American commerce. Think at Sundar/Zuck/Elon scale: Google built Maps as a platform layer everything else runs on. That's the model here — not "more enrichment fields" but "the ground truth that every proptech, insurtech, and fintech must connect to."

### A. Additional Data Sources — Prioritized by Revenue Impact

> Add each to `docs/DATA-CATALOG.md` when imported. Update `data_sources` table in `keys.db` via `PATCH /v1/admin/data-sources/:source_id`.

#### Tier 1 — Ship by $10K MRR (high ROI, all free federal sources)

- [ ] **Census ACS Vacancy + Demographics by tract** — US Census American Community Survey. Vacancy rate, median income, population density, age distribution by census tract. Free. Import: `census-acs-import.js`. Unlocks: vacancy dimension of `/v1/risk` (currently placeholder), lending redlining detection, real estate demand signals. Already have the census tract from TIGER — this is the payload that makes it valuable. Source: `data.census.gov` (B25002 Occupancy Status, B19013 Median Income, B01003 Population). ~74,000 tracts. Cadence: annual (5-year ACS).
- [ ] **EPA EJScreen — Environmental Justice Screening** — EPA's environmental justice index by census block group. 11 environmental indicators: air toxics, proximity to Superfund sites, RMP facilities, wastewater discharge, lead paint, traffic, ozone, PM2.5, diesel PM, underground storage tanks, proximity to hazardous waste. Free. Source: `https://ejscreen.epa.gov/mapper/ejscreenRESTbroker.aspx`. Live API (lat/lon → block group → EJ scores). Unlocks: environmental risk dimension on `/v1/risk`, ESG/impact investing use case, environmental due diligence for lenders. Target customer: climate-focused lenders, ESG funds, insurance underwriters.
- [ ] **USPS No-Stat / Delivery Statistics (CASS-adjacent)** — USPS publishes No-Stat address counts by ZIP+carrier route. No-Stat = addresses that don't receive regular delivery (vacant, seasonal, under construction). Free public data. Source: USPS Address Management System public release. Unlocks: vacancy dimension in `/v1/risk` with real data instead of heuristic. Note: full CASS certification (3–6 months, $$$) needed for `/v1/address` to return CASS-standardized output — track separately.
- [ ] **USGS National Hydrography Dataset (NHD)** — Rivers, streams, lakes, reservoirs, coastline. Distance to nearest waterbody by lat/lon. Free. Source: `https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer`. Unlocks: flood risk context (proximity to water + FEMA zone = much stronger flood signal), waterfront property premium detection. 1M+ features.
- [ ] **HUD Fair Market Rents + Housing Choice Voucher zones** — HUD publishes FMR by ZIP and metro area annually. Also: Opportunity Zones (QCT + DDA designations) by census tract. Free. Source: `https://www.huduser.gov/portal/datasets/fmr.html`. Unlocks: rental market intelligence, affordable housing compliance, LIHTC eligibility for lenders.
- [ ] **Overture Maps Places (POIs)** — Same Overture data source we already use for addresses, but the `places` theme. 59M+ global POIs (restaurants, banks, hospitals, schools, stores) with name, category, brand, hours, website. Free (CDLA 2.0). Source: `s3://overturemaps-us-west-2/release/.../theme=places`. Unlocks: commercial density score per address, neighborhood character detection, retail accessibility index. The Overture S3 pipeline is already built — this is a schema extension, not a new pipeline.
- [ ] **FEMA Disaster Declarations** — FEMA declares major disasters by county. Historical record going back to 1953. Free. Source: `https://www.fema.gov/api/open/v2/disasterDeclarations`. Import to `risk.db`. Unlocks: long-term disaster frequency per county beyond NOAA storm events — includes earthquakes, droughts, ice storms, etc. that NOAA misses.

#### Tier 2 — Ship by $50K MRR (require more pipeline work or cost/legal review)

- [ ] **County Parcel / Cadastral Data (REGRID or county GIS portals)** — Property boundaries, ownership, assessed value, land use code, year built, building sq ft, lot size, zoning. This is the **single highest-value dataset GeoClear doesn't have**. Makes every address a financial and physical asset record. Sources: (a) free from county GIS portals (~3,100 counties — painful); (b) REGRID ($$$, covers 98% of US parcels, API); (c) Microsoft USBuildingFootprints partially overlaps. Unlocks: property intelligence endpoint `/v1/property`, lending AVM input, real estate comp analysis, insurance replacement cost estimation. Note: REGRID likely $20K+/year — evaluate after $25K MRR.
- [ ] **First Street Foundation — Climate Risk (Foundation API)** — Parcel-level flood, fire, heat, drought, wind risk with 30-year projections. The only source with climate-forward risk (FEMA NFHL is historical, First Street is predictive). Commercial API ($$$). Unlocks: climate risk score addition to `/v1/risk`, forward-looking insurance underwriting. Evaluate after $25K MRR. Direct competitor to our disaster score but ~10× more granular.
- [ ] **ATTOM / CoreLogic Property Data** — Commercial data provider. Ownership history, sales history, deed transfers, liens, foreclosures, MLS history. Expensive ($25K–$100K+/year). Unlocks: complete property intelligence layer. Evaluate after $50K MRR or enterprise contract.
- [ ] **FCC Broadband Coverage Map** — Already in product backlog. Moving here: FCC published new fabric-based broadband map in 2023 (545M locations). Free. Source: `broadbandmap.fcc.gov`. Unlocks: broadband tier by address (BEAD program demand, $42B addressable). ISP-level coverage data.
- [ ] **Bureau of Transportation Statistics (BTS) — National Transit Map** — Transit stops, routes, frequency by lat/lon. Free. Source: NTD + GTFS feeds. Unlocks: walkability/transit accessibility score, urban vs suburban classification refinement.
- [ ] **USGS Earthquake Hazard (NSHM)** — National Seismic Hazard Model. Peak ground acceleration (PGA) probability by lat/lon. Free. Source: `https://earthquake.usgs.gov/hazards/hazmaps/`. Unlocks: seismic risk dimension on `/v1/risk`. Especially valuable for CA, WA, OR, AK, NM — states with significant quake exposure.
- [ ] **OpenStreetMap Buildings + Land Use** — Building outlines, roof types, land use (residential/commercial/industrial/park). Free (ODbL — same license issue as OpenAddresses, needs legal review). 70M+ US building outlines. Unlocks: building density per block, land use classification, green space proximity. Better coverage than Microsoft footprints in dense urban areas.

#### Tier 3 — Platform Scale (after $100K MRR or strategic partnership)

- [ ] **NASA/NOAA Climate Projections (CMIP6)** — 30-year temperature, precipitation, sea level projections by grid cell. Free. Source: NASA SEDAC. Unlocks: long-horizon climate risk for insurance/lending. Requires building a raster lookup layer.
- [ ] **Zoning Data (aggregated)** — Municipal zoning codes: residential, commercial, industrial, agricultural, mixed-use. No national source exists — requires aggregating ~20,000 municipalities. Options: (a) build scraper; (b) ZoningPoint ($$$); (c) Regrid includes some zoning data. Unlocks: development potential, land use compliance, ADU eligibility detection. Enormous real estate value.
- [ ] **School District Boundaries + Ratings** — NCES school district boundaries (free). GreatSchools ratings (commercial). Unlocks: highest-signal amenity for residential real estate and family persona targeting.
- [ ] **Walk Score / Transit Score API** — Walkability, bikeability, transit scores per address. Commercial ($$$). Unlocks: lifestyle/amenity scoring. Strong signal for residential real estate customers.
- [ ] **SafeGraph / Foursquare Places (mobility + POI)** — Foot traffic, visit patterns, POI data. Commercial. Unlocks: economic activity signals per address, retail viability scoring. Expensive but creates unique behavioral layer.

---

### B. Platform Capability Decisions

> These are architectural choices that determine whether GeoClear becomes a data platform or stays an enrichment endpoint. Decide each explicitly — not deciding is deciding.

- [ ] **[DECISION NEEDED] GeoServer / OGC Standards layer** — GeoServer exposes data via WFS, WMS, WCS (OGC standards). Enterprise GIS customers (government, utilities, large insurers) expect OGC-compliant APIs — they often can't integrate REST JSON-only APIs into their ArcGIS/QGIS workflows. **Recommendation:** Yes, but after $50K MRR. Adds significant integration surface area. File a DECISIONS.md entry when this decision is made. Reference: `geoserver.org`.
- [ ] **[DECISION NEEDED] GeoPlatform.gov integration** — Federal data gateway providing programmatic access to authoritative US geospatial datasets via standards-based APIs. High-value for federal contracts and government customers. **Recommendation:** Yes — integrate as a data source aggregator (replace some of our individual agency API calls with GeoPlatform endpoints). Low risk, no cost. Review `geoapi.geoplatform.gov` API when building Tier 1 sources above. Adopt FAIR principles (Findable, Accessible, Interoperable, Reusable) as design constraints on `/v1/enrich` response schema.
- [ ] **[SKIP] STAC (SpatioTemporal Asset Catalog)** — Standard for discovering satellite imagery and temporal raster datasets. Not applicable to address intelligence in current form. Only relevant if we add historical/temporal address data (e.g., "how has flood risk at this address changed over 10 years?"). **Decision: skip until temporal enrichment is on roadmap.** Revisit at $100K MRR.
- [ ] **[SKIP] Tiling / Tilegarden** — Serverless map tile rendering. Only needed if we build a map visualization product. We are an API; our customers build maps. **Decision: skip entirely.** If customers need tiles, recommend MapTiler or Mapbox as complementary tools.
- [ ] **[DECISION NEEDED] Knowledge Graph / RDF layer** — Representing addresses as semantic nodes linked to risk factors, census data, zoning, parcel ownership via RDF triples and SPARQL queries. This is the "Google Knowledge Graph for addresses" play. High complexity, high moat. **Recommendation:** Design for it — use `nad_uuid` as a stable URI for every address now, which makes a future RDF layer trivially buildable. Actual RDF exposure: defer until $100K MRR. Reference: `kb.geoplatform.gov/knowledge-graphs/rdf-data.html`.
- [ ] **[ACTION] Adopt `nad_uuid` as canonical address URI** — Currently `nad_uuid` is used internally. Expose it as a stable, permanent address identifier in all API responses (`"id": "NAD:us-{nad_uuid}"`). This is the foundation for: (a) knowledge graph, (b) OGC feature IDs, (c) customer-side stable references across API calls. No data change — just schema/response change. File as a feature ticket.

---

### C. Competitive Intelligence Watch List

- [ ] **Monthly: check if SmartyStreets adds flood zone or census tract** — If yes: reassess Pro tier pricing and GTM messaging immediately. (Already in Phase 3 — duplicate reminder here for data strategy context.)
- [ ] **Quarterly: review Overture Maps new themes** — Overture is adding buildings, transportation, base maps. Any new theme that overlaps our roadmap: evaluate import.
- [ ] **Quarterly: check Google Maps Platform pricing** — Google has census tract in Places API. If they bundle it into a cheaper tier, our compliance moat narrows. Watch closely.
- [ ] **Crunchbase alerts** — "address verification" + "property data" + "climate risk" funding rounds. Funded competitors = new entrants with resources.

---

## T2 — DIFFERENTIATION (after $10K MRR)

### Strategic Intelligence Layer
> Outcome: GeoClear becomes the ground-truth layer of American commerce, not just an address lookup.

> ⚠️ **STAGING-FIRST RULE — applies to every data import below.**
> All heavy data processing runs on Render staging (`srv-d7f6rh58nd3s73cve8dg`, 100GB disk), never locally and never directly on prod.
> Pipeline for every import: **Staging Render Shell → verify row counts on staging → `POST /v1/admin/upload-chunk` (chunked) → `POST /v1/admin/merge` on prod → verify via `GET /api/stats`.**
> Never rsync directly to prod. Never run large downloads on your Mac. See CLAUDE.md § Staging-First for the full rule.

- [x] **Ground-Truth Graph (internal)** ✅ 2026-04-17 — `address_signals` table in `keys.db` (NOT nad.db — zero migration on 91GB table). Schema: `nad_uuid PK, query_count, last_queried_at, fraud_signal_count`. Fire-and-forget upsert via `setImmediate` after every `/api/address` hit. `recordAddressQuery()` + `recordFraudSignal()` + `getTopQueriedAddresses()` in KeyStore. Admin endpoint: `GET /v1/admin/signals`. Starts compounding behavioral data immediately.
- [x] **Risk Score v1 — `/v1/risk` endpoint** ✅ 2026-04-17 — `GET /v1/risk` (Professional+). Resolves address by nad_uuid / street+city+state / lat+lon. Returns 4 scores (0–1): deliverability (confidence+placement+query_count), fraud (fraud_signal_count+velocity), disaster (live FEMA NFHL), vacancy (zero-query+addr_class). `data_coverage` flags show which dimensions have real data vs pending imports. File: `web-server.js` — single call returns four numbers: `deliverability` (0–1, from RDI + query patterns), `fraud` (0–1, from velocity + unit anomaly + FTC lists), `disaster` (0–1, from FEMA + USFS wildfire + NOAA), `vacancy` (0–1, from Census ACS + USPS No-Stat proxy + zero-query signal). Ship free to all $249+ customers. Data sources: USFS wildfire risk (free import), NOAA severe weather (free), Census ACS vacancy by tract (already have), internal query logs. No open-source dependency required. *This is the bundle kill — replaces Melissa + LexisNexis + RiskMeter in one call.*
- [x] **Import USFS Wildfire Risk data** ✅ 2026-04-17 — `wildfire-import.js` rewritten to use USFS/Esri "USA Wildfire Hazard Potential" FeatureServer (layer 2 = county). 3,108 counties with WHP class (Very Low–Very High) + MEAN score. Source: `services.arcgis.com/jIL9msH9OI208GCb/.../USA_Wildfire_Hazard_Potential/FeatureServer/2`. Uploaded to prod risk.db. `/v1/risk` returns `data_coverage.wildfire: true`.
- [x] **Import NOAA severe weather history** ✅ 2026-04-17 — Storm data imported locally (NOAA NCEI CSV files). 3,257 counties, 338,864 storm events, 10-year window (2017–2026). Uploaded to prod `/data/risk.db` (316KB). `/v1/risk` now returns `data_coverage.storm: true` with real county storm counts. Script: `storm-import.js`.
- [x] **CAL FIRE FHSZ live lookup** ✅ 2026-04-17 — `cal_fire_fhsz` field on `/api/enrich`. Live polygon lookup via `egis.fire.ca.gov/arcgis/rest/services/FRAP/HHZ_ref_FHSZ/MapServer/0` (CAL FIRE's own ArcGIS server, discovered from `egis.fire.ca.gov`). CA only, null for non-CA. High+Very High zones: SRA_High, SRA_VeryHigh, LRA_High, LRA_VeryHigh, FRA_High, FRA_VeryHigh. No import to risk.db needed — live API call like FEMA NFHL. Requires ±100m Web Mercator envelope (service rejects point geometry).
- [ ] **Import Microsoft Building Footprints** — 130M US building polygons, free MIT license. **Run on staging Render Shell → verify → upload-chunk → merge to prod.** Enables: open yard area calculation (parcel - building = landing zone), roof type, building size. *Prerequisite for drone-deliverable flag. Also improves address confidence scoring.*
- [ ] **Integrate FAA LAANC API** — real-time airspace class + altitude ceiling per lat/lon. Free FAA DroneZone API. Response time < 100ms. *Live API call at query time — no staging data pipeline needed.*
- [ ] **Drone-deliverable flag — `/v1/enrich` extension** — add `drone` object to enrichment response: `{ deliverable: bool, airspace_class: "G"|"B"|"C"|"D", legal_altitude_ft: 400, estimated_open_sqm: 180, property_type: "single_family"|"multi_family"|"commercial", no_fly_zone: bool, confidence: "high"|"medium"|"low" }`. Data: FAA LAANC API + Microsoft Building Footprints + Overture parcel geometry (already have). *Target customers: Wing, Zipline, Starship, Amazon Prime Air, last-mile 3PLs. Pricing: $0.005/call add-on.*
- [ ] **Pricing reframe — floor to $199** — grandfather all current $49/Starter customers at their rate (contractual, never raise). All new signups: floor is $199. Update Stripe product, pricing page, portal. *Elon framing: $49 attracts hobbyists and support load. Value is in avoided loss, not per-row cost.*

### Distribution
- [ ] Node.js SDK (`npm install geoclear`)
- [ ] Python SDK (`pip install geoclear`)
- [ ] Zapier integration ("Verify US address" action)
- [ ] Shopify App
- [ ] WordPress / WooCommerce plugin
- [ ] Salesforce AppExchange listing

### Enterprise
- [ ] SOC 2 Type II audit — start process (takes 6–12 months); begin at $10K MRR
- [ ] NCOA integration (address change detection — 40M Americans move/year)
- [ ] Mortgage compliance bundle (HMDA + CRA + census tract + FIPS + flood in 1 call)
- [ ] White-label / OEM API option
- [ ] Data licensing tier (flat file download, $10K–$100K/yr)
- [ ] Render autoscaling / standby instance — only when first enterprise customer signs SLA

### Address Intelligence
- [ ] School district boundaries (top homebuyer question)
- [ ] Congressional + state legislative district
- [ ] Address history / change log
- [ ] Neighborhood character score (urban/suburban/rural)

---

## T3 — MOAT (months 3–6)

- [ ] **Parcel boundary polygons** — county assessor data for all 3,000+ US counties. Expensive to aggregate (commercial vendors: Regrid ~$15K/yr, PreciselyData). Unlocks high-confidence drone landing zone detection and parcel-level fraud scoring. *Required for Risk Score confidence: "high" tier. Worth it after first drone company customer.*
- [ ] **USPS CASS certification** — required for $10B direct mail market; 3–6 month process; begin research Phase 3
- [ ] DPV — Delivery Point Validation (bundled with CASS)
- [ ] Automated quarterly NAD update pipeline (cron → detect → download → re-import)
- [ ] Address change webhook service
- [ ] International: Canada (Overture has CA data, 15M addresses)
- [ ] International: UK (Ordnance Survey open data, 32M addresses)
- [ ] Parcel ID / property tax linkage
- [ ] Mobile SDK (iOS + Android)

---

## T4 — BIG SWINGS (6–18 months)

- [ ] **GeoClear Risk Score v2** — add outcome feedback loop: customers send delivery/fraud/chargeback webhooks → label individual addresses → train per-address scores (not just tract-level). This is the Ground-Truth Graph fully realized. Moat: no competitor can buy this dataset — earned from live traffic.
- [ ] Physical World Graph API — address nodes connected to businesses, schools, flood zones
- [ ] Climate Risk Score per address (FEMA + CAL FIRE + NOAA + USGS)
- [ ] National 911 Address Layer — partner with NENA ($10B NG911 funding)
- [ ] Autonomous Address Deduplication-as-a-Service (AI agent for CRM cleanup)
- [ ] Address Intelligence for AI Training Data licensing

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

## PRICING (updated 2026-04-16)

| Tier | Display name | Price | Lookups/day | Enrichment | Notes |
|------|-------------|-------|-------------|-----------|-------|
| `free` | Free | $0 | 1,000 | No (nulled) | No credit card |
| `starter` | Builder | $49/mo | 50,000 | 500 calls/mo taste | Bridges to Professional |
| `pro` | Professional | $249/mo | 500,000 | Unlimited | Most Popular |
| `pro_compliance` | Pro Compliance | $499/mo | 500,000 | Unlimited + SLA | Claire persona |
| `scale` | Scale | $999/mo | 5,000,000 | Unlimited | Volume anchor |
| `enterprise` | Enterprise | $2,000+/mo | Unlimited | Unlimited + custom | Contact us |
| `metered` | Pay-as-you-go | per lookup | Unlimited | No | Ops Owen one-time |
| — | Bulk Credits | $199/$799 one-time | — | No | 1M / 5M credits |

> **Financial facts:** Break-even = 1 Professional customer. Gross margin ~98%. LTV Professional $4,980 / Pro Compliance $16,633.

**North Star:** $100K MRR in 12 months

---

_Reference: `FEATURES.md` (built), `RELEASES.md` (history), `AddressAPIBusinessGTM.md` (GTM playbook), `strategy/` (9 analyses)_
