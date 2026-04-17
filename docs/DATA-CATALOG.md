# GeoClear — Data Catalog
**Comprehensive inventory of every data source powering the GeoClear API**
_Last updated: 2026-04-17 | Maintained by: engineering session_

---

## How to use this catalog

Each entry covers: what the dataset is, what attributes we extract, the pipeline used to load or query it, when it was last refreshed, the next refresh due date, cadence, and which API features it powers.

**Dataset roles:**
- **Foundational** — core address corpus; without this the product doesn't exist
- **Enrichment (live)** — queried at runtime per request
- **Enrichment (cached)** — loaded into `risk.db` or in-process LRU; no per-request external call
- **Planned** — sourced but not yet in production

---

## 1. NAD — National Address Database (r22)

| Field | Detail |
|-------|--------|
| **Publisher** | US Department of Transportation (USDOT) |
| **License** | Public domain (US federal) |
| **Role** | Foundational — primary address corpus |
| **Coverage** | ~47 states, 120,160,305 addresses |
| **Last sourced** | 2026-04-14 (r22 release) |
| **Next refresh** | ~Q3 2026 (r23 expected) |
| **Cadence** | Quarterly (USDOT releases ~4× per year) |
| **Download URL** | `https://data.transportation.gov/download/fc2s-wawr/application/x-zip-compressed` |
| **Format** | CSV, UTF-8 BOM, 60 columns, ~38 GB uncompressed (`NAD_r22.txt`) |
| **Pipeline** | Download on staging Render Shell → `overture-import.js` merges format → TSV export → chunked upload to prod `/data/nad.db` via `POST /v1/admin/upload-chunk` → `POST /v1/admin/merge` |
| **Import script** | `download.js` (download), `overture-import.js` (merge format) |

**Attributes extracted:**

| Attribute | NAD column | Notes |
|-----------|------------|-------|
| Street number | `Add_Number` | |
| Street name | `StreetName` + `StNamPre`, `StNamPosT` | |
| Unit | `Unit` | |
| Post city | `Post_City` | Preferred display city |
| Incorporated municipality | `Inc_Muni` | |
| Unincorporated community | `Uninc_Comm` | Fallback neighborhood |
| Neighborhood | `Nbrhd_Comm` | |
| State | `State` | 2-letter USPS code |
| ZIP code | `Zip_Code` | |
| ZIP+4 | `Plus4` | |
| County name | `County` | |
| Latitude | `Longitude` | NAD column is named inconsistently |
| Longitude | `Latitude` | |
| Placement accuracy | `Placement` | Rooftop / Parcel / Street / Interpolation / Unknown |
| Address type | `Addr_Type` | Residential / Commercial / etc. |
| Delivery type | `Deliver_Typ` | |
| Parcel source | `Parcel_Src` | |
| Parcel ID | `Parcel_Id` | |
| Anomaly flag | `Anomaly` | Penalises confidence score |
| Address authority | `Addr_Auth` | |
| State FIPS | derived from State | Used for FIPS field in responses |
| County FIPS | `County_FIPS` | |

**Computed from these attributes:**
- `confidence` score (0–100): placement accuracy + field completeness + anomaly penalties
- `residential` flag: `addr_type` + `deliver_typ` + unit/sub-address heuristics
- `timezone`: state + ZIP-specific multi-zone mapping table
- `display_city`: `post_city` preferred over `inc_muni`
- `fips`: 5-digit county FIPS = state_fips + county_fips
- `coverage`: "full" for NAD records

**Use cases powered:**
- `/api/address` — primary address search
- `/api/suggest` — autocomplete
- `/api/near` — proximity search
- All geographic hierarchy endpoints (state, county, city, ZIP lookups)
- Confidence scoring
- Residential/Commercial classification

**Refresh watch:** USDOT publishes NAD releases at `https://data.transportation.gov/stories/s/National-Address-Database-NAD-/v4ba-yrma`. Watch for r23. Typically drops Feb/May/Aug/Nov. Set a calendar reminder for **2026-07-15** to check.

---

## 2. Overture Maps Foundation Addresses

| Field | Detail |
|-------|--------|
| **Publisher** | Overture Maps Foundation (Linux Foundation project; Apple, Meta, Microsoft, Amazon contributors) |
| **License** | CDLA Permissive 2.0 (attribution required) |
| **Role** | Foundational — gap-fill for states missing or incomplete in NAD |
| **Coverage** | 64,900,000 US addresses (FL, MI, NJ, NV, NH, CA, PA, GA, SC, SD, HI, LA, MS + more) |
| **Last sourced** | 2026-04-14 (release `2026-02-18.0`) |
| **Next refresh** | Check Overture releases at overturemaps.org — new releases roughly every 2–3 months |
| **Cadence** | ~Quarterly; align with NAD refresh |
| **S3 path** | `s3://overturemaps-us-west-2/release/2026-02-18.0/theme=addresses/type=address` |
| **Format** | GeoParquet (.zstd.parquet, partitioned by bounding box) |
| **Pipeline** | DuckDB reads S3 parquet directly on staging Render Shell → `overture-import.js` → INSERT OR IGNORE into `nad.db` (dedup by `nad_uuid`) |
| **Import script** | `overture-import.js` |

**Attributes extracted:**

| Attribute | Overture field | Notes |
|-----------|---------------|-------|
| Street number | `number` | |
| Street name | `street` | |
| Unit | `unit` | |
| Postal city | `postal_city` → `addr_levels[1]` | |
| State/region | `addr_levels[0]` or `region` | |
| Postcode | `postcode` | |
| Latitude | from geometry centroid | |
| Longitude | from geometry centroid | |
| Bounding box | `xmin, xmax, ymin, ymax` | Stored as bbox, centroid derived |
| Overture ID | `id` | |
| Sources | `sources` | Multi-contributor attribution |
| Version | `version` | |

**After merge:**
- Total corpus: **198,657,535 addresses** (NAD 120M + Overture 64.9M after dedup)
- `coverage` field: "gap-fill" for Overture records
- Dedup key: `nad_uuid = 'OA:' + overture_id` — prevents double-counting on re-import

**Use cases powered:** Same as NAD — adds coverage in states NAD doesn't fully cover.

**Refresh watch:** Monitor `https://overturemaps.org/download/` for new releases. When a new release ships that covers states we have low confidence in, run a gap-fill re-import on staging.

---

## 3. US Census Bureau — TIGER/Line Geocoder

| Field | Detail |
|-------|--------|
| **Publisher** | US Census Bureau |
| **License** | Public domain (US federal) |
| **Role** | Enrichment (live) — census geography per lat/lon |
| **Coverage** | All US addresses |
| **Last sourced** | Live API (no local copy) |
| **Next refresh** | N/A — live |
| **Cadence** | Continuous (runtime API call); census vintage updated annually |
| **API endpoint** | `https://geocoding.geo.census.gov/geocoder/geographies/coordinates` |
| **Auth** | None — free, no API key |
| **Rate limit** | Not documented; in practice unlimited for standard usage |
| **SLA** | Best-effort (federal service); 99th percentile latency ~200–500ms |

**Attributes extracted:**

| Attribute | Response path | Notes |
|-----------|--------------|-------|
| Census tract | `result.geographies["Census Tracts"][0].TRACT` | 6-digit, formatted as `TRACT/STATE/COUNTY` |
| Census tract full | computed | e.g., `06037137000` |
| Block group | `result.geographies["Census Tracts"][0].BLKGRP` | |
| Block code | `result.geographies["Census Tracts"][0].BLOCK` | |
| State FIPS | `result.geographies["Census Tracts"][0].STATE` | |
| County FIPS | `result.geographies["Census Tracts"][0].COUNTY` | |
| GEOID | `result.geographies["Census Tracts"][0].GEOID` | 11-digit geographic identifier |

**Caching:** In-process LRU (~10,000 entries, keyed by rounded lat/lon to 3 decimal places). Reduces external calls by ~80% in typical usage patterns.

**Use cases powered:**
- `/api/enrich` — returns `census_tract`, `census_block_grp`, `census_geoid`
- HMDA (Home Mortgage Disclosure Act) compliance reporting
- CRA (Community Reinvestment Act) compliance
- Redlining risk assessment

**Refresh watch:** Census updates tract boundaries every 10 years (next: 2030 Census). Vintage changes annually (Current_Current) — no action needed, API auto-updates.

---

## 4. FEMA NFHL — National Flood Hazard Layer

| Field | Detail |
|-------|--------|
| **Publisher** | FEMA (Federal Emergency Management Agency) |
| **License** | Public domain (US federal) |
| **Role** | Enrichment (live) — flood zone per lat/lon |
| **Coverage** | All US addresses |
| **Last sourced** | Live API (no local copy) |
| **Next refresh** | N/A — live |
| **Cadence** | Continuous (runtime API call); FEMA updates NFHL continuously |
| **API endpoint** | `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query` |
| **Layer** | 28 — S_FLD_HAZ_AR (Special Flood Hazard Areas polygon layer) |
| **Auth** | None — free, no API key |
| **SLA** | FEMA ArcGIS service; typically 99.5%+ uptime |

**Attributes extracted:**

| Attribute | FEMA field | Notes |
|-----------|-----------|-------|
| Flood zone code | `FLD_ZONE` | X, AE, A, VE, AH, AO, D, etc. — 15+ codes |
| SFHA flag | derived | true if zone ≠ X or X500 |
| Community name | `COMM_NAME` | |
| DFIRM panel | `DFIRM_ID` | |
| Flood AR ID | `FLD_AR_ID` | |

**FEMA flood zone reference:**

| Zone | Meaning | SFHA? |
|------|---------|-------|
| X | Minimal / 500-year | No |
| AE | 100-year, base flood elevation established | Yes |
| A | 100-year, no BFE | Yes |
| VE | Coastal high-velocity, BFE established | Yes |
| AH | Shallow ponding | Yes |
| AO | Sheet flow, 1–3 ft depth | Yes |
| D | Undetermined risk | No |

**Caching:** In-process LRU (~10,000 entries, keyed by rounded lat/lon to 3 decimal places).

**Use cases powered:**
- `/api/enrich` — returns `flood_zone`, `flood_sfha`, `flood_community`
- Primary value prop for compliance customers (NFIP flood determination)
- Risk score `disaster` dimension
- Insurance underwriting, mortgage origination compliance

**Business note:** This is GeoClear's primary competitive differentiator. Manual flood determination costs $3–$15/address. We return it free in the API response. Protect this integration.

**Refresh watch:** FEMA updates NFHL panels continuously. No action needed — live API always returns current data.

---

## 5. USGS 3DEP — 3D Elevation Program (EPQS)

| Field | Detail |
|-------|--------|
| **Publisher** | US Geological Survey (USGS) |
| **License** | Public domain (US federal) |
| **Role** | Enrichment (live) — ground elevation per lat/lon |
| **Coverage** | All US addresses |
| **Last sourced** | Live API (no local copy) |
| **Next refresh** | N/A — live |
| **Cadence** | Continuous (runtime API call) |
| **API endpoint** | `https://epqs.nationalmap.gov/v1/json` |
| **Auth** | None — free, no API key |
| **Resolution** | 1m lidar (where available) or ~10m (1/3 arc-second) fallback |

**Attributes extracted:**

| Attribute | Response path | Notes |
|-----------|--------------|-------|
| Elevation (feet) | `value` | 1 decimal place |

**Caching:** In-process LRU (~10,000 entries).

**Use cases powered:**
- `/api/enrich` — returns `elevation_ft`
- Disaster risk context (flood elevation vs. nearby waterways)
- Insurance underwriting
- Construction/development compliance

**Refresh watch:** USGS updates 3DEP lidar coverage continuously but slowly. No action needed — live API returns current best-available data.

---

## 6. USFS / Esri — Wildfire Hazard Potential (WHP)

| Field | Detail |
|-------|--------|
| **Publisher** | US Forest Service (USFS) via Esri Living Atlas |
| **License** | Public domain (US federal) |
| **Role** | Enrichment (cached) — county-level wildfire risk |
| **Coverage** | 3,108 US counties |
| **Last sourced** | 2026-04-17 (import confirmed, 3,108 counties on prod `risk.db`) |
| **Next refresh** | Annual; USFS typically updates WHP in Q4. Set reminder: **2026-10-01** |
| **Cadence** | Annual |
| **API endpoint** | `https://services.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/USA_Wildfire_Hazard_Potential/FeatureServer/2/query` |
| **Layer** | 2 — county-level WHP |
| **Auth** | None — Esri Living Atlas public service |
| **Format** | ArcGIS FeatureServer JSON, 1,000-row pagination |
| **Pipeline** | `wildfire-import.js` → fetches all counties in batches → stores in `risk.db` table `county_wildfire` |
| **Import script** | `wildfire-import.js` |

**Attributes extracted:**

| Attribute | Esri field | Notes |
|-----------|-----------|-------|
| County FIPS (5-digit) | `ID` | |
| County name | `NAME` | |
| State abbreviation | `ST_ABBREV` | |
| WHP mean score | `MEAN` | Continuous score |
| WHP majority class | `MAJORITY` | 1–5: Very Low / Low / Moderate / High / Very High |
| WHP median | `MEDIAN` | |

**WHP class reference:**

| Class | Label |
|-------|-------|
| 1 | Very Low |
| 2 | Low |
| 3 | Moderate |
| 4 | High |
| 5 | Very High |

**Use cases powered:**
- `/v1/risk` — `data.wildfire` dimension in disaster risk score
- County-level wildfire risk for insurance underwriting, real estate disclosure, lender risk assessment
- Cross-referenced with CAL FIRE for California addresses (more granular)

---

## 7. NOAA — Storm Events Database

| Field | Detail |
|-------|--------|
| **Publisher** | NOAA National Centers for Environmental Information (NCEI) |
| **License** | Public domain (US federal) |
| **Role** | Enrichment (cached) — county-level 10-year storm history |
| **Coverage** | 3,257 US counties |
| **Last sourced** | 2026-04-17 (import confirmed, 3,257 counties on prod `risk.db`) |
| **Next refresh** | Annual (NOAA publishes updated CSVs ~2–3 months after each calendar year closes). Check in **2027-03-01** for 2026 data |
| **Cadence** | Annual; rolling 10-year window means stale data still relevant but refresh keeps recency |
| **Data index URL** | `https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/` |
| **File pattern** | `StormEvents_details-ftp_v1.0_d{YEAR}_c{YEAR+1}*.csv.gz` |
| **Format** | Gzipped CSV, streamed line by line |
| **Auth** | None — free |
| **Pipeline** | `storm-import.js` → downloads per-year gzip CSVs from NCEI index → aggregates by county FIPS → stores in `risk.db` table `county_storm` |
| **Import script** | `storm-import.js` |
| **Years covered** | 10-year rolling window (2015–2024 on current import) |

**Attributes extracted (aggregated per county per year then summed):**

| Attribute | Notes |
|-----------|-------|
| `event_count` | Total storm events |
| `tornado_count` | Tornado + Funnel Cloud + Waterspout |
| `hurricane_count` | Hurricane + Tropical Storm + Tropical Depression |
| `hail_count` | Hail + Marine Hail |
| `flood_count` | Flash Flood + Flood + Coastal Flood + Storm Surge/Tide + Lakeshore Flood |
| `years_covered` | Count of distinct years in dataset |
| County FIPS (5-digit) | Derived from `STATE_FIPS` + `CZ_FIPS` |
| State code | `STATE` |
| County name | `CZ_NAME` |

**Use cases powered:**
- `/v1/risk` — `data.storm` dimension in disaster risk score
- County-level storm frequency for insurance underwriting, property risk assessment, lender diligence

**Refresh watch:** When 2026 full-year data becomes available (~Q1 2027), drop the oldest year and add 2026 to maintain a 10-year window. Run `storm-import.js` on staging first.

---

## 8. CAL FIRE — Fire Hazard Severity Zones (FHSZ)

| Field | Detail |
|-------|--------|
| **Publisher** | California Department of Forestry and Fire Protection (CAL FIRE) |
| **License** | Public domain (California state) |
| **Role** | Enrichment (cached) — parcel-level fire hazard severity for California |
| **Coverage** | California only |
| **Last sourced** | 2026-04-17 (import attempted; ArcGIS endpoint returning errors — status: **PENDING FIX**) |
| **Next refresh** | When CAL FIRE re-issues FHSZ boundaries (typically every 3–5 years after major fire events) |
| **Cadence** | Ad hoc (triggered by CAL FIRE re-designation events) |
| **SRA endpoint** | `https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/FHSZ_SRA/FeatureServer/0/query` |
| **LRA endpoint** | `https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/FHSZ_LRA/FeatureServer/0/query` |
| **Auth** | None — CAL FIRE public ArcGIS service |
| **Format** | ArcGIS FeatureServer JSON with polygon geometry |
| **Pipeline** | `calfire-import.js` → fetches polygons → rasterizes to 0.001° × 0.001° (~100m × 100m) grid cells → stores in `risk.db` for O(1) lat/lon lookup |
| **Import script** | `calfire-import.js` |

**Attributes extracted:**

| Attribute | CAL FIRE field | Notes |
|-----------|---------------|-------|
| FHSZ class | `HAZ_CLASS` | Moderate / High / Very High |
| County | `COUNTY` | |
| Source | SRA or LRA | State Responsibility Area vs Local Responsibility Area |

**Use cases powered:**
- `/v1/risk` — `data.cal_fire` dimension for California addresses
- More granular than USFS WHP for CA (parcel-level vs county-level)
- California insurance underwriting, real estate disclosure (CA law requires FHSZ disclosure at sale)

**Known issue:** ArcGIS endpoint returning errors as of 2026-04-17. Add to QUEUE to debug and re-run import.

---

## 9. OpenAddresses (ODbL)

| Field | Detail |
|-------|--------|
| **Publisher** | OpenAddresses community (global contributors) |
| **License** | ODbL — Open Data Commons Open Database License (attribution + share-alike) |
| **Role** | Planned — additional gap-fill, ~50M US addresses not in NAD or Overture |
| **Coverage** | ~50M additional US addresses |
| **Last sourced** | Not yet imported to production |
| **Next refresh** | N/A — pending Phase 2 data expansion |
| **Cadence** | Continuous community updates; snapshot every ~6 months |
| **Collections index** | `https://batch.openaddresses.io/api/collections` |
| **File pattern** | Gzipped CSV per state or countrywide |
| **Format** | `LON,LAT,NUMBER,STREET,UNIT,CITY,DISTRICT,REGION,POSTCODE,ID,HASH` |
| **Auth** | None — free |
| **Import script** | `openaddresses-import.js` |

**Attributes extracted:**

| Attribute | OA field |
|-----------|---------|
| Longitude | `LON` |
| Latitude | `LAT` |
| Street number | `NUMBER` |
| Street name | `STREET` |
| Unit | `UNIT` |
| City | `CITY` |
| District | `DISTRICT` |
| State/Region | `REGION` |
| Postcode | `POSTCODE` |
| Source ID | `ID` |
| Dedup hash | `HASH` → `nad_uuid = 'OA:' + HASH` |

**Use cases (planned):**
- Expand coverage to ~250M total addresses
- Improve ZIP+4 coverage in rural areas

**Status:** BACKLOG — requires ODbL attribution review and legal sign-off before shipping. Do not import before confirming attribution obligations.

---

## 10. Derived / Computed Enrichments

These are not external data sources but computed fields derived from the above datasets. Documented here for completeness.

| Field | Source data | Logic |
|-------|------------|-------|
| `confidence` (0–100) | NAD placement, field completeness, anomaly flag | Rooftop=100, Parcel=85, Street=70, Interpolation=50, Unknown=30; deductions for missing city/ZIP/coords; anomaly −10 |
| `residential` (bool) | NAD `addr_type`, `deliver_typ`, unit patterns | True if residential address type + residential delivery |
| `timezone` (IANA string) | State + ZIP override table | 48-state mapping + ZIP-specific overrides for multi-zone states (IN, KY, TN, ID, ND, SD, NE, KS) |
| `display_city` | NAD `post_city`, `inc_muni` | `post_city` preferred; `inc_muni` fallback |
| `neighborhood` | NAD `nbrhd_comm`, `uninc_comm` | Best available community name |
| `coverage` | Source of record | "full" (NAD), "gap-fill" (Overture/OA) |
| `match_type` | Search query vs result fields | "exact", "number+street", "street+location", "street", "location" |
| `fips` (5-digit) | State + county codes | `state_fips` (2 digits) + `county_fips` (3 digits) |

---

## Refresh Calendar

| Month | Action |
|-------|--------|
| **2026-07-15** | Check USDOT for NAD r23 release |
| **2026-10-01** | Check USFS for updated WHP dataset (annual) |
| **2026-10-17** | CAL FIRE FHSZ endpoint debug + re-import (backlog item) |
| **2027-03-01** | NOAA Storm Events — check for 2026 annual data; re-run storm-import.js to roll 10-year window |
| **On new Overture release** | Check overturemaps.org; if new states or major address updates: re-run gap-fill import on staging |

---

## Data Quality Notes

| Dataset | Known Issues |
|---------|-------------|
| NAD r22 | ~3 states with incomplete coverage (rural areas); gap-filled by Overture |
| Overture 2026-02-18.0 | Some addresses missing unit/suite info vs NAD (parcel-level only) |
| FEMA NFHL | Latency spikes 300–800ms; LRU cache critical for /enrich performance |
| CAL FIRE FHSZ | ArcGIS endpoint broken as of 2026-04-17; import blocked |
| NOAA Storm | CZ_TYPE must be "C" (county) — zone-type events excluded to avoid double-counting |
| OpenAddresses | ODbL share-alike may complicate commercial API usage — needs legal review |

---

## Data Lineage Summary

```
USDOT NAD r22 ─────────────────────────────┐
                                           ├──► nad.db (91GB, prod /data) ──► /api/address
Overture Maps 2026-02-18.0 ────────────────┘                                    /api/suggest
                                                                                 /api/near
Census TIGER/Line Geocoder ─────────────────────────────────────────────────► /api/enrich
FEMA NFHL ──────────────────────────────────────────────────────────────────► /api/enrich
USGS 3DEP EPQS ─────────────────────────────────────────────────────────────► /api/enrich

USFS WHP ──────────────────┐
NOAA Storm Events ─────────├──► risk.db (prod) ──────────────────────────────► /v1/risk
CAL FIRE FHSZ ─────────────┘

OpenAddresses ──────────────────────────────────────────────────────────────► (planned)
```

---

_This catalog is the authoritative record of all data sources. Update it any time a new source is added, a refresh is completed, or a source is deprecated._
