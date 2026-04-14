# NAD Address Intelligence — Systems Guide
**Operations, Infrastructure, Maintenance & Integration Reference**

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CONSUMERS                            │
│  Claude Agents   Web UI   REST Clients   Node Projects  │
└────────┬──────────────┬─────────────┬────────────┬──────┘
         │              │             │            │
    MCP Server     Web Server    REST API    npm require
    port: stdio    port: 4001    port: 3847  (direct)
         │              │             │            │
└────────┴──────────────┴─────────────┴────────────┴──────┐
│                  NADQuery Class (query.js)               │
│               In-process LRU Cache (50K entries)        │
└─────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              SQLite Database (WAL mode)                  │
│              nad/data/nad.db  —  68 GB                  │
│              Read-only for all consumers                 │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure

```
nad/
├── schema.sql          ← Database schema (run once via init-db.js)
├── init-db.js          ← Initialize empty database
├── download.js         ← Download + bulk import pipeline
├── query.js            ← NADQuery class (shared by all layers)
├── mcp-server.js       ← MCP server (Layer 1 — Claude agents)
├── api-server.js       ← REST API (Layer 2 — HTTP clients)
├── web-server.js       ← Web UI + API (Layer 2b — browsers)
├── demo.js             ← Integration demo / smoke test
├── docs/
│   ├── user-guide.md
│   ├── systems-guide.md  ← this file
│   └── api-guide.md
├── public/
│   └── index.html      ← Web interface (served by web-server.js)
└── data/
    ├── nad.db          ← 68 GB SQLite database (git-ignored)
    ├── NAD_r22.txt     ← 38 GB source text (git-ignored)
    └── NAD_2026-04-12.zip ← 7.9 GB source ZIP (git-ignored)
```

---

## Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Disk (SSD) | 80 GB free | 150 GB free |
| RAM | 4 GB | 16 GB |
| CPU | 2 cores | 4+ cores |
| Node.js | 18.x | 20.x LTS |

**Disk breakdown:**
- `nad.db` — 68 GB (SQLite WAL + indexes)
- `NAD_r22.txt` — 38 GB (source, safe to delete after import)
- `NAD_*.zip` — 7.9 GB (source ZIP, safe to delete after import)
- WAL + SHM files — up to 2 GB during heavy writes

---

## Initial Setup

### Step 1 — Install dependencies
```bash
cd /Users/shaileshbhujbal/Projects/Syntheticdata
npm install
```

### Step 2 — Initialize database
```bash
node nad/init-db.js
# Creates nad/data/nad.db with schema, indexes, and US state seed data
```

### Step 3 — Download and import
```bash
# Dry run first (validates environment, no download)
node nad/download.js --dry-run

# Full download and import (~4–6 hours on SSD)
node nad/download.js
```

### Step 4 — Verify import
```bash
node nad/query.js --stats
# Expected: ~96,893,147 addresses, 47 states, 2,240 counties
```

### Step 5 — Start services
```bash
# REST API (port 3847)
npm run nad:api         # dev mode (no auth)
npm run nad:api:prod    # production (API key required)

# Web interface (port 4001)
node nad/web-server.js

# MCP server (auto-started by Claude Code via .mcp.json)
npm run nad:mcp
```

---

## Import Pipeline Details

The download.js import runs in 4 phases:

```
Phase 1: Drop all 15 indexes
         ↓
Phase 2: Raw CSV insert (batch 50,000 rows)
         - UTF-8 BOM strip
         - Comma delimiter (not tab)
         - NULL for empty fields
         - No FK resolution yet
         ↓
Phase 3: Bulk FK resolution via SQL
         - INSERT DISTINCT states/counties/cities/neighborhoods/zips
         - UPDATE state_id, county_id, city_id, neighborhood_id, zip_code_id
         ↓
Phase 4: Rebuild all 15 indexes (~45 minutes)
```

**Why this order matters:**
Maintaining indexes during a 96M-row insert degrades throughput from ~50K rows/sec to ~3K rows/sec
(a 15x slowdown, turning a 4-hour job into 9+ hours). Drop-then-rebuild is the correct pattern.

### Resume interrupted imports
```bash
node nad/download.js --resume
# Skips download if ZIP exists, skips import if row count > 0
```

### Import performance benchmarks
| Phase | Duration | Throughput |
|-------|----------|------------|
| Download | ~30 min | ~4 MB/s |
| ZIP extraction | ~20 min | I/O bound |
| Phase 1 (drop indexes) | < 1 min | — |
| Phase 2 (raw insert) | ~90 min | ~18K rows/sec |
| Phase 3 (FK resolution) | ~30 min | SQL bulk ops |
| Phase 4 (rebuild indexes) | ~45 min | I/O bound |
| **Total** | **~4–5 hours** | — |

---

## Database Schema

### Core Tables

```sql
countries (1 row)
states    (56 rows — 50 states + DC + territories)
counties  (2,240 rows)
cities    (14,723 rows)
neighborhoods (71,410 rows — Nbrhd_Comm + Uninc_Comm)
zip_codes (23,848 rows)
addresses (96,893,147 rows)
```

### Address Table Key Columns

```sql
-- Identity
nad_uuid        TEXT    -- USDOT stable identifier (survives quarterly updates)
add_number      TEXT    -- House number
st_pre_dir      TEXT    -- Pre-directional (N, S, E, W, NE, etc.)
st_name         TEXT    -- Street name
st_pos_typ      TEXT    -- Post type (St, Ave, Blvd, etc.)
st_pos_dir      TEXT    -- Post-directional
unit            TEXT    -- Unit/apartment number
full_address    TEXT    -- Complete formatted address string

-- Geographic (FK hierarchy)
state_id        INT     -- → states.id
county_id       INT     -- → counties.id
city_id         INT     -- → cities.id
neighborhood_id INT     -- → neighborhoods.id
zip_code_id     INT     -- → zip_codes.id

-- Raw geographic text (denormalized for speed)
state           TEXT    -- 2-letter code (TX, CA, DC)
county          TEXT
inc_muni        TEXT    -- Incorporated municipality
post_city       TEXT    -- Postal city name
nbrhd_comm      TEXT    -- Neighborhood name
zip_code        TEXT    -- 5-digit ZIP
plus_4          TEXT    -- ZIP+4 extension

-- Spatial
latitude        REAL
longitude       REAL
placement       TEXT    -- Rooftop | Parcel | Street

-- Classification
addr_type       TEXT    -- Building | Range | Site
addr_class      TEXT    -- Numbered Thoroughfare | Rural Route | etc.
add_auth        TEXT    -- Certifying authority

-- Provenance
date_update     TEXT    -- Last modified by authority
nad_source      TEXT    -- USDOT release identifier
```

### Key Indexes

```sql
idx_addresses_state         -- (state_id)
idx_addresses_county        -- (county_id)
idx_addresses_city          -- (city_id)
idx_addresses_neighborhood  -- (neighborhood_id)
idx_addresses_zip           -- (zip_code_id)
idx_addresses_zip_text      -- (zip_code)  ← raw text ZIP lookup
idx_addresses_street        -- (st_name)
idx_addresses_search        -- (add_number, st_name, state)
idx_addresses_coords        -- (latitude, longitude)  ← bounding box queries
```

---

## NADQuery Class Reference

All consumers go through `NADQuery`. It is the single access point.

```javascript
const { NADQuery } = require('./query.js');
const nad = new NADQuery('/path/to/nad.db');  // optional path override

// Address search
nad.findAddress({ streetName, addNumber, city, stateCode, zipCode, limit })

// ZIP lookup
nad.getZip(zip, stateCode)

// State/county/city hierarchy
nad.listStates()
nad.getState(stateCode)
nad.listCounties(stateCode)
nad.getCounty(name, stateCode)
nad.listCities(stateCode, county)
nad.searchCity(name, stateCode)
nad.listZips(stateCode, city)

// Spatial
nad.findNear(lat, lon, radiusDeg, limit)
nad.findByBBox(minLat, maxLat, minLon, maxLon, limit)

// Stats
nad.stats()

// Cleanup
nad.close()
```

---

## Service Configuration

### REST API (api-server.js)

| Config | Default | Override |
|--------|---------|---------|
| Port | 3847 | `--port 3848` |
| Auth | Required | `--no-auth` (dev) |
| API keys | `nad_dev_localtest` | `--api-keys "key1,key2"` |
| Rate limit | 1,000 req/min/IP | Hardcoded |
| Cache size | 50,000 entries | Hardcoded |
| Cache TTL | 24 hours | Hardcoded |

### Web Server (web-server.js)

| Config | Default | Override |
|--------|---------|---------|
| Port | 4001 | `--port 4002` |
| Auth | None (local use) | — |

### MCP Server (mcp-server.js)

Transport: stdio (no port — communicates via stdin/stdout)
Registered in: `.mcp.json` at project root

---

## Monitoring & Health Checks

```bash
# REST API health
curl http://localhost:3847/health
# Returns: { "status": "ok", "addresses": 96893147, "version": "1.0.0" }

# Database integrity
node -e "const {NADQuery} = require('./nad/query.js'); const n=new NADQuery(); console.log(n.stats()); n.close();"

# Check process is running
lsof -i :3847   # REST API
lsof -i :4001   # Web server
```

---

## Performance Tuning

### SQLite WAL Mode
The database is initialized in WAL (Write-Ahead Logging) mode for safe concurrent reads.
No tuning needed — better-sqlite3 handles this automatically.

### Query Performance

| Query Pattern | P50 | P99 | Optimization |
|---------------|-----|-----|--------------|
| ZIP lookup (cached) | < 1ms | < 1ms | LRU cache |
| ZIP lookup (DB) | 2–5ms | 10ms | idx_addresses_zip_text |
| Street + state search | 5–15ms | 30ms | idx_addresses_search |
| Radius/bounding box | 10–20ms | 50ms | idx_addresses_coords |
| Bulk 1,000 addresses | 500ms | 2s | Batch processing |

### Cache Configuration
The LRU cache in api-server.js holds 50,000 entries with 24-hour TTL.
For high-traffic deployments, increase via code:
```javascript
const cache = new LRUCache({ max: 200_000, ttl: 1000 * 60 * 60 * 24 });
```

---

## Quarterly Update Process

USDOT publishes full replacement files quarterly (not deltas).

```bash
# 1. Check if new release is available
#    https://www.transportation.gov/gis/national-address-database

# 2. Backup existing database (optional — 68 GB)
cp nad/data/nad.db nad/data/nad.db.bak

# 3. Re-import (drops and recreates all data)
node nad/download.js --resume

# 4. Verify new import
node nad/query.js --stats

# 5. Restart services
# (restart api-server, web-server — MCP auto-restarts)
```

### Delta tracking between releases
```sql
-- Find addresses modified since last quarter
SELECT COUNT(*) FROM addresses WHERE date_update > '2026-01-01';

-- Find new addresses (nad_uuid not in prior snapshot)
-- Requires keeping a prior backup for comparison
```

---

## Backup & Recovery

| Item | Size | Backup Frequency |
|------|------|-----------------|
| `nad.db` | 68 GB | Before each quarterly update |
| `nad/docs/` | < 1 MB | Git |
| `nad/*.js` | < 1 MB | Git |
| Source ZIP | 7.9 GB | Keep until import verified |

**Recovery:** If `nad.db` is corrupted, re-run `node nad/download.js --resume`.
The source ZIP is preserved until you manually delete it.

---

## Security Considerations

- **Read-only access:** All consumers open the DB with `readonly: true` — no write path exists
- **API keys:** Production deployments require `X-API-Key` header (see api-guide.md)
- **No PII:** NAD data contains no personal information — only physical address records
- **Local only:** Services bind to localhost by default; never expose port 3847 directly to the internet without a reverse proxy + TLS
- **Rate limiting:** 1,000 req/min per IP is enforced at the Express layer

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `SQLITE_CANTOPEN` | nad.db missing | Run `node nad/download.js` |
| Slow queries (>500ms) | Indexes not built | Run download.js to completion |
| `Cannot find module 'zod'` | npm install not run | `npm install` |
| MCP server not in Claude | .mcp.json missing | See project root `.mcp.json` |
| REST API returns 401 | Auth enabled, no key | Use `--no-auth` or pass `X-API-Key` header |
| Import hangs at Phase 2 | Disk full | Need 80+ GB free on import drive |
| Wrong column count error | Old schema | Run `node nad/init-db.js` to recreate schema |

---

*Systems Guide v1.0 · NAD Q1-2026 · 96,893,147 addresses*
