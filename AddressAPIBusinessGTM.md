# Address Intelligence API — Go-To-Market Plan
**Inspired by first-principles thinking | Built on USDOT NAD (96M addresses)**

---

## The Opportunity

The US address validation market is dominated by expensive, clunky incumbents:

| Competitor | Price per 1,000 lookups | Notes |
|---|---|---|
| SmartyStreets | $7–$10 | Requires contract |
| Google Geocoding | $5 | Rate-limited, TOS restrictions |
| USPS API | Free but slow | No coordinates, no enrichment, heavy rate limits |
| Melissa Data | $8–$15 | Enterprise only |
| Lob | $10+ | Print-focused |

**Our position:** $1 per 1,000 lookups. No contract. Instant API keys. Returns neighborhood + coordinates + county in one call — something no competitor does today.

**Data cost:** $0 (USDOT NAD — public domain)
**Infrastructure cost:** ~$50/month
**Time to revenue:** Day 1

---

## Product

### Core API: Address Verification + Enrichment

**Input:**
```
GET /v1/address?number=935&street=Pennsylvania+Ave&city=Washington&state=DC
```

**Output:**
```json
{
  "verified": true,
  "standardized": "935 Pennsylvania Avenue Northwest",
  "add_number": "935",
  "street": "Pennsylvania Avenue Northwest",
  "unit": null,
  "city": "Washington",
  "county": "District of Columbia",
  "neighborhood": "Penn Quarter",
  "state": "DC",
  "zip": "20535",
  "plus4": null,
  "latitude": 38.8947,
  "longitude": -77.0251,
  "addr_type": "Building",
  "addr_class": "Numbered Thoroughfare Address",
  "placement": "Rooftop",
  "source": "USDOT NAD Q1-2026",
  "confidence": 1.0
}
```

### Endpoints

| Endpoint | Description | Use Case |
|---|---|---|
| `GET /v1/address` | Verify + enrich a single address | Checkout forms, mortgage apps |
| `POST /v1/address/bulk` | Batch up to 1,000 addresses | CRM cleanup, list validation |
| `GET /v1/zip/:zip` | ZIP code metadata + stats | Coverage checks, routing |
| `GET /v1/city` | City lookup with address count | Market sizing |
| `GET /v1/county` | County lookup | Legal, tax, logistics |
| `GET /v1/near` | Addresses within radius of lat/lon | Delivery, proximity targeting |
| `GET /v1/neighborhood` | Neighborhood lookup | HyperLocal marketing |
| `GET /v1/stats` | DB coverage stats | Sales/trust page |

### Pricing Tiers

| Tier | Lookups/mo | Price/mo | Price per 1K |
|---|---|---|---|
| **Starter** | 50,000 | $50 | $1.00 |
| **Growth** | 500,000 | $350 | $0.70 |
| **Scale** | 5,000,000 | $2,500 | $0.50 |
| **Enterprise** | Unlimited | Custom | < $0.50 |
| **Free Trial** | 10,000 | $0 | — |

**Metered billing** (Stripe): customers pay for what they use, billed monthly.

---

## Killer Differentiator

No competitor returns **neighborhood** in a standard address lookup. Our `nbrhd_comm` field from USDOT NAD gives hyperlocal context that real estate, mortgage, and marketing platforms pay a premium for.

```
Input:  "222 5th Ave, New York NY 10001"
Others: verified ✓, lat/lon ✓
Us:     verified ✓, lat/lon ✓, neighborhood: "Flatiron District" ✓, county: "New York County" ✓
```

---

## Launch Announcement Strategy
_Updated 2026-04-14. Product is live at geoclear.io v1.0.0, 120M addresses, full billing._

### Pre-Announcement Gates (complete before any public post)

| Gate | Status | Owner |
|---|---|---|
| `/docs` page — full endpoint reference, curl + Node.js examples | ❌ Pending | |
| Status page wired to UptimeRobot (real uptime, not fake bars) | ❌ Pending | |
| Landing page demo widget — works with zero auth | ✅ Verified 2026-04-14 | |
| Error messages human-readable | ✅ Verified ("Invalid or revoked API key.") | |

**Do not post to HN or Product Hunt until docs and status page are live.**

---

### Week 1 — Warm Outreach Before Public Launch (most important)

Get first paying customer BEFORE going public. Announcements are one-time spikes; a paying customer is signal, case study, and referral source.

Send 15 personal emails to PropTech / Mortgage SaaS contacts:
- LOS vendors: Encompass, BytePro, Calyx
- POS platforms: Maxwell, BeSmartee, Blend
- Title / Closing: Qualia, Snapdocs

**Email template (personalize each one):**

```
Subject: Free 10K address lookups — returns neighborhood + FEMA zone (SmartyStreets doesn't)

Hi [Name],

We just launched geoclear.io — a US address API built on 120M USDOT records.
$1/1K lookups, no contract. Returns census tract, FEMA flood zone, county FIPS,
timezone, and neighborhood in one call.

Here's a live key with 10K free lookups, no card required: [key]

Try it:
curl "https://geoclear.io/api/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC&key=[key]"

15 minutes to show you how it maps to your validation flow?

— Shailesh
```

**Rules:** Include a working API key in every email. Reduce friction to zero. Goal: 3 paying customers before public launch.

---

### Week 2 — Hacker News Show HN

**When:** Tuesday or Wednesday, 9am PT. Not Monday, not Friday.

**Title:**
> Show HN: GeoClear — US address API on 120M public records, $1/1K vs. SmartyStreets' $10

**First comment (write before posting — this is the real pitch):**
- Why: SmartyStreets charges $10/1K for data USDOT publishes free
- What it returns others don't: neighborhood, FEMA zone, census tract, county FIPS in one call
- Stack: Node.js, SQLite, 91GB on persistent disk. p50 < 10ms.
- Pricing: free 10K, $49/mo for 50K, $249/mo for 500K. No contract.
- Honest limitation: 120M records NAD r22, not USPS CASS certified yet

**Be in comments for 3 straight hours. Reply to every comment within 10 minutes.**

Attack vectors to prepare for:
- "SQLite won't scale" → "reads 120M rows < 10ms, here's /api/health showing live latency"
- "NAD data is inaccurate" → "USDOT quarterly updates, same source incumbents use"
- "SmartyStreets has DPV" → "CASS certification in roadmap, not blocking our target use cases"

**Same day — Product Hunt:**
- Headline: "120M US Addresses. Returns Neighborhood + FEMA Zone. $1/1K lookups."
- Tagline: "The address API incumbents don't want you to know about."
- Get 5-10 upvotes in the first hour (ask Week 1 warm contacts)

---

### Week 3 — Build in Public

**Indie Hackers post:** Real numbers, honest trajectory. Frame: "Built a competitor to SmartyStreets. Here's what happened in the first 7 days." IH rewards transparency over polish.

**Twitter/X thread (10-15 tweets):**
1. The problem (SmartyStreets pricing)
2. The insight (public domain data, priced like gold)
3. Architecture (SQLite at 91GB, why it works)
4. Pricing decision
5. First customer story
6. Link + free tier

---

### Week 4 — LinkedIn (PropTech/Mortgage B2B Buyers)

Different frame than HN — B2B buyer, not developer:

> "Mortgage companies pay $8-15 per 1,000 address validations. We built the same capability for $1. Here's how 120M public records became a SaaS business."

Tag relevant PropTech/mortgage industry accounts. The mortgage tech community on LinkedIn is small and interconnected.

---

### Passive Channels (set up before HN, then forget)

| Channel | Action | Status |
|---|---|---|
| RapidAPI marketplace | List API — `openapi.yaml` generated at repo root | ❌ Pending |
| G2 / Capterra | "Address Verification Software" category — listing content below | ❌ Pending |
| SEO | Target: "address verification API", "SmartyStreets alternative", "US address validation API" | ❌ Pending |

**RapidAPI listing steps:**
1. rapidapi.com → Provider Hub → Add New API
2. Upload `openapi.yaml` from repo root (generated — covers all public endpoints)
3. Set pricing: Basic (free, 100 req/day), Pro ($49/mo, matches Starter tier)
4. API base URL: `https://geoclear.io`
5. Auth: header `X-Api-Key`

**G2 listing content:**
- Category: Address Verification Software
- Tagline: "120M US Addresses. Returns Neighborhood, FEMA Zone, Census Tract in One Call."
- Description: "GeoClear is a US address intelligence API built on the USDOT National Address Database (120M+ records). Verify, standardize, and enrich US addresses with neighborhood names, county FIPS codes, census tract data, FEMA flood zones, and timezone — all in a single API call. 10x cheaper than SmartyStreets. No contract. Instant API key. Free 10,000 lookups to start."
- Pricing: starts at $0 (free), $49/mo Starter

---

### The VC Frame — What Actually Matters (90-day metrics)

| Metric | Target | Why |
|---|---|---|
| Time to first paid customer | < 2 weeks | PMF signal |
| Net revenue retention (Month 3) | > 110% | API businesses live on expansion |
| Developer CAC (time to paid) | Track from Week 1 | Tells you which channel works |
| MRR Week 4 | $3K+ (3 paying customers) | Validates price point |

**The announcement is in service of the first metric only. Everything else is distraction until 10 paying customers.**

---

## Original 30-Day Plan (pre-launch reference)

### Week 1 — Ship ✅ DONE

- [x] Deploy REST API on Render.com ✅
- [x] API key auth + rate limiting ✅
- [x] Stripe metered billing ✅
- [x] Landing page with live demo widget ✅
- [ ] Status page (UptimeRobot) — still pending
- [ ] Docs page — still pending

### Week 2 — First Customers (in progress)

**Target segment: PropTech / Mortgage SaaS**

- [ ] Send 15 personal outreach emails (template above)
- [ ] Offer white-glove integration for first 3 customers
- [ ] Goal: 3 paying customers before public HN post

### Week 3 — Distribution

- [ ] RapidAPI marketplace listing
- [ ] Hacker News Show HN
- [ ] Product Hunt same day

### Week 4 — Scale Distribution

- [ ] G2 / Capterra listing
- [ ] LinkedIn post (PropTech/Mortgage angle)
- [ ] Indie Hackers build-in-public post
- [ ] SEO: "address verification API", "US address validation", "address geocoding API"

---

## Revenue Projections (Conservative)

| Day | Milestone | MRR |
|---|---|---|
| 7 | API live, 0 customers | $0 |
| 14 | 3 PropTech customers (avg 1M lookups/mo each) | $3,000 |
| 21 | 10 customers via RapidAPI + HN | $5,000 |
| 30 | 20 customers, first enterprise deal | $10,000+ |

**Profitable on day 1.** Infrastructure is $50/mo. Every dollar after that is margin.

---

## Target Customer Segments (Priority Order)

### 1. Mortgage / PropTech (Highest Value)
- Loan Origination Systems (LOS): Encompass, BytePro, Calyx
- Point-of-Sale: Maxwell, BeSmartee, Blend
- Title / Closing: Qualia, Snapdocs
- Pain: validate borrower address on every application (legal requirement)
- Volume: 500K–5M lookups/mo per platform

### 2. E-commerce / Logistics
- Checkout address validation (reduce failed deliveries)
- Last-mile routing optimization
- Volume: 100K–1M lookups/mo

### 3. Healthcare / Insurance
- Patient address verification
- Claims processing
- Volume: 500K–2M lookups/mo

### 4. Marketing / Direct Mail
- List hygiene (remove bad addresses before mailing)
- Neighborhood-level targeting
- Volume: 1M–10M lookups/mo (batch)

### 5. Government / Nonprofit
- 911 address validation
- Voter registration
- Volume: varies

---

## Competitive Moat (Long-term)

| Moat | How |
|---|---|
| **Price** | Public data = zero COGS. Always undercut incumbents. |
| **Neighborhood data** | Unique field no competitor returns by default |
| **Update cadence** | USDOT updates quarterly. Automate the re-import. |
| **Mortgage domain** | riTara relationships = warm sales channel competitors don't have |
| **Speed** | SQLite WAL on SSD = sub-5ms p99 lookups |

---

## Tech Stack (Already Built)

| Component | Status |
|---|---|
| 96M address database (SQLite) | ✅ Done |
| Query layer (nad/query.js) | ✅ Done |
| Geographic hierarchy (6 levels) | ✅ Done |
| REST API server | 🔲 Build next |
| MCP server | 🔲 Build after REST |
| API key auth + rate limiting | 🔲 |
| Stripe metered billing | 🔲 |
| Landing page | 🔲 |

---

## Domain / Brand Suggestions

- **AddressIQ.com** — intelligence angle
- **NADapi.com** — direct, technical
- **AddressLayer.com** — enrichment angle
- **VerifyUS.io** — verification angle

---

## Risk & Mitigation

| Risk | Mitigation |
|---|---|
| USDOT changes data format | Schema versioned in schema.sql; re-import is automated |
| SQLite doesn't scale at 10K RPS | Migrate to DuckDB or PG at that point (good problem to have) |
| Competitor copies us | First-mover + mortgage relationships = defensible |
| 3 missing states in NAD | Disclose coverage; add OpenAddresses for gaps |
