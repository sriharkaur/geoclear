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

## 30-Day Go-To-Market Plan

### Week 1 — Ship (Days 1–7)

- [ ] Deploy REST API on Render.com ($25/mo)
- [ ] Add API key auth + rate limiting (express-rate-limit)
- [ ] Integrate Stripe metered billing
- [ ] Build landing page (single page, no fluff):
  - Hero: "96M US Addresses. $1/1K lookups. Returns neighborhood."
  - Live demo widget
  - Pricing table
  - Instant API key signup (email only)
- [ ] Set up status page (uptimerobot.com — free)
- [ ] Set up docs (readme.io or simple markdown)

### Week 2 — First Customers (Days 8–14)

**Target segment: PropTech / Mortgage SaaS**
*(Warm path — riTara is already in this space)*

- [ ] Identify 20 mortgage tech companies (LOS vendors, POS platforms, title software)
- [ ] Personal outreach email:

```
Subject: Free 10K address lookups — returns neighborhood (SmartyStreets doesn't)

Hi [Name],

We built an address validation API on top of the USDOT National Address Database 
(96M records). It's 10x cheaper than SmartyStreets and returns neighborhood-level 
data in every response.

Free 10,000 lookups to try it. No credit card.

[API Key] — try it now:
curl "https://api.addressiq.com/v1/address?number=100&street=Main+St&state=TX&key=YOUR_KEY"

— Shailesh
```

- [ ] Offer white-glove integration for first 3 customers
- [ ] Goal: 3 paying customers by end of Week 2

### Week 3 — Add Killer Features (Days 15–21)

- [ ] **Bulk endpoint** (POST /v1/address/bulk) — CSV upload → enriched CSV download
- [ ] **Webhook support** — async processing for large batches
- [ ] **Address autocomplete** — typeahead as you type (replaces Google Places for US)
- [ ] **Reverse geocode** — lat/lon → full address + neighborhood
- [ ] Add to RapidAPI marketplace (passive inbound channel)
- [ ] Post on Hacker News: "Show HN: Address API built on public DOT data — 10x cheaper"

### Week 4 — Scale Distribution (Days 22–30)

- [ ] Affiliate partner with 1 mortgage software vendor (rev share)
- [ ] List on G2, Capterra under "Address Verification Software"
- [ ] Reach out to 5 no-code/low-code platforms (Bubble, Webflow, Zapier)
- [ ] Launch Zapier integration ("Verify and enrich US address")
- [ ] SEO: target "address verification API", "US address validation", "address geocoding API"

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
