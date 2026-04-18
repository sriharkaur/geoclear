# GeoClear Data Gap Analysis — USPS vs GeoClear
> Date: 2026-04-18 | Session 34 | Status: Active reference — drives Q-188 through Q-194

---

## The Numbers

| Source | Count | What it counts |
|---|---|---|
| USPS DSF2 (2024) | 168.6M | Deliverable mail points only — occupied, active, on a carrier route |
| GeoClear prod (2026-04-18) | 198,657,538 | Addressable parcels — includes vacant, unoccupied, and non-postal locations |
| Estimated overlap | ~150–155M | Addresses in both datasets |
| In USPS, not GeoClear | ~18–20M | PO Boxes (~19M), territories, new construction not yet in NAD/Overture |
| In GeoClear, not USPS | ~45M | Vacant parcels, rural land with assigned addresses, demolished/historical |

**Surface read: GeoClear wins by 30M.** Real read: they measure different things. GeoClear is stronger for location intelligence; USPS is stronger for postal deliverability.

---

## Critical Gaps — States Where GeoClear Has Zero or Thin Coverage

| State / Territory | GeoClear count | Census housing units (est.) | Coverage ratio | Priority |
|---|---|---|---|---|
| Hawaii (HI) | **0** | ~560,000 | 0% | P2 — critical |
| Puerto Rico (PR) | **0** | ~1,300,000 | 0% | P2 |
| Guam (GU) | **0** | ~50,000 | 0% | P3 |
| American Samoa (AS) | **0** | ~15,000 | 0% | P3 |
| N. Mariana Islands (MP) | **0** | ~12,000 | 0% | P3 |
| South Dakota (SD) | 206,082 | ~400,000 | ~52% | P2 |
| Alaska (AK) | 324,330 | ~320,000 | ~101% | OK |
| Vermont (VT) | 333,610 | ~330,000 | ~101% | OK |

**Hawaii is the single most important gap.** It is a US state with 1.5M people and GeoClear returns zero results. Any customer testing "does this API work?" with a Hawaii address gets an immediate fail.

---

## What USPS Has That No Open Dataset Can Replace

**PO Boxes (~19M)** — These are USPS-exclusive. No open data equivalent exists. DSF2 licensing requires:
- CASS certification authority approval
- Physical security audit
- Annual compliance review
- No redistribution

Decision: **do not pursue USPS licensing**. GeoClear customers (insurance, fintech, logistics, proptech) don't use PO Boxes for location intelligence. A PO Box has no lat/lon, no flood zone, no census tract. It is a mail routing artifact, not a location.

**New construction (2M/year)** — USPS updates monthly; NAD updates quarterly. The ~6-month lag is unavoidable without real-time data sourcing (Microsoft Building Footprints + street network helps here).

---

## Recommended Fix Sequence

### Step 1 — Overture targeted re-run for Hawaii (1 day, free)
Run the Overture import scoped to HI on staging Render Shell. Overture sources Hawaii from Hawaii Statewide GIS + OSM + Microsoft buildings. Expected yield: 350–500K Hawaii addresses.

```bash
# On staging Render Shell
node overture-import.js --db=/data/hi-overture.db --state=HI
# Then: verify row count → upload-chunk → merge → check /api/stats
```

If yield < 300K after merge: escalate to Step 1b (Hawaii State GIS direct pull — see Q-188).

### Step 2 — OpenAddresses full US import (3–5 days, free)
OpenAddresses aggregates ~80M US addresses from 5,000+ state and county GIS portals. Strong coverage where government data is the primary source (HI, PR, SD, rural midwest). Same pipeline as Overture: TSV → staging → upload-chunk → merge.

Sources:
- `openaddresses.io` → US → download by state
- Total US compressed: ~22GB
- Format: `lon, lat, number, street, unit, city, district, region, postcode`

Expected yield after dedup with existing 198M: net ~8–15M new addresses (heavy overlap with NAD/Overture in dense states).

### Step 3 — Puerto Rico direct GIS pull (1 day, free)
Puerto Rico Planning Board publishes a full address file. 1.3M housing units. Format: Shapefile.
Source: `estado.pr.gov` / ArcGIS Online

### Step 4 — Microsoft Building Footprints spatial join (1 week, free — Q-102 script already written)
125M US building polygons (MIT license). Building centroid + street network → derived addresses for structures not in any government file. Fills new construction gap. Script `building-import.js` is already written — needs staging run.

### Step 5 — Quarterly Overture refresh (ongoing)
Overture releases quarterly. July 2026 will be the next release after the April 2025 import. Set a calendar reminder. Run only for states where delta is likely significant (new construction, urban growth areas).

### Step 6 — Regrid (if rural coverage becomes a customer complaint, ~$15–50K/yr)
Parcel-level data for 3,100+ US counties, updated monthly. Only justified when enterprise customers specifically request rural parcel completeness at a price point that supports the cost.

---

## Overture vs Other Sources — Quick Comparison

| Source | US addresses | Cost | Update freq | Strengths | Weaknesses |
|---|---|---|---|---|---|
| NAD r22 | ~120M | Free | Quarterly | Federal authority, all 50 states (some thin) | Lags new construction by 1–2 quarters |
| Overture Maps | Global 440M+ | Free (CDLA) | Quarterly | Building footprints, GERS IDs, urban quality | Not postal-certified, some rural gaps |
| OpenAddresses | ~80M US | Free | Variable | Best for government-source states | Aggregation quality varies by county |
| Microsoft Building Footprints | 125M buildings | Free (MIT) | Quarterly | Captures structures with no address record | Requires address inference (spatial join) |
| Regrid | ~140M parcels | $15–50K/yr | Monthly | Most complete for rural parcels | Cost, commercial license |
| USPS DSF2 | 168.6M | License ($$$) | Monthly | Gold standard for deliverability | CASS compliance burden, no lat/lon for POs |
| Google / HERE / TomTom | Global | TOS prohibit caching | — | Quality | Can't cache/store → can't use |

---

## What Overture Actually Gives Us (That We're Not Using Yet)

**GERS IDs** — Overture's Global Entity Reference System assigns a permanent ID to every address/building. Even if a street is renamed, the GERS ID is stable. Currently GeoClear discards this on import. Storing `overture_id` on address rows enables:
- Dataset correlation (customers can join GeoClear data to other Overture-based tools)
- Future: building type, height, age from Overture Buildings theme

**Building footprints** — Overture has building polygons, not just address points. Importing centroids + area gives `building_area_sqft` and `building_type` as enrichment fields. No competitor offers this in a combined address+risk API.

**Quarterly releases** — Overture is maintained by Amazon, Meta, Microsoft, TomTom. Each quarterly release incorporates new government data, corrected addresses, and new buildings. The gap between NAD r22 (~2023 vintage) and Overture's current release is approximately 2–3M net new US addresses.

---

## MCP Server — Separate but Related

Session 34 actions completed:
- `verify_address` tool upgraded with `guidance` block (recommended_action + reasoning) and `coverage.state_coverage` enum (full/partial/sparse)
- `mcp.geoclear.io` DNS CNAME added to Cloudflare → geoclear.onrender.com
- Render custom domain `mcp.geoclear.io` registered and verified
- Code pushed to main → Render auto-deploying

MCP endpoint: `https://mcp.geoclear.io/mcp` (POST to initialize, GET for SSE)
Auth: `X-Api-Key` header OR x402 USDC micropayment ($0.004/call on Base mainnet)

Queue items added: Q-195 (directory listings), Q-196 (homepage AI-native section), Q-197 (launch post).

---

## Queue Items Added This Session

| Q# | Priority | Title |
|---|---|---|
| Q-188 | P2-DATA | Hawaii coverage — 0 addresses, Overture targeted re-run |
| Q-189 | P2-DATA | Puerto Rico coverage — 0 addresses, direct GIS pull |
| Q-190 | P3-FEAT | OpenAddresses full US import |
| Q-191 | P3-FEAT | Run Microsoft Building Footprints on staging (script ready) |
| Q-192 | P3-FEAT | Quarterly Overture refresh cadence — July 2026 |
| Q-193 | P3-FEAT | Store Overture GERS ID in address schema |
| Q-194 | P3-FEAT | South Dakota gap-fill targeted import |
| Q-195 | P3-DIST | MCP directory listings — Anthropic, Cursor, Cline |
| Q-196 | P3-DIST | Homepage "AI-native / MCP-ready" section |
| Q-197 | P3-DIST | MCP launch post — "First MCP server for US address intelligence" |
