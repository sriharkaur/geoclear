# NAD Address Intelligence — System Architecture
**96M US Addresses | 6-Level Geographic Hierarchy | Multi-Consumer Exposure**

---

## Overview

Three-layer exposure model designed to serve every consumer type — AI agents, web apps, mobile, scripts — from a single 68 GB SQLite source of truth.

```
┌──────────────────────────────────────────────────────────────────┐
│                        CONSUMERS                                 │
│                                                                  │
│  Claude Agents    Web Apps    Mobile Apps    Node.js Projects    │
│  (riTara, DGN)   (React/Next) (iOS/Android)  (SyntheticData)    │
└──────┬───────────────┬──────────────┬──────────────┬────────────┘
       │               │              │              │
  MCP Server       REST API       REST API      npm module
  (Layer 1)        (Layer 2)      (Layer 2)     (Layer 3)
       │               │              │              │
└──────┴───────────────┴──────────────┴──────────────┴────────────┐
│                    Cache Layer (LRU in-memory)                   │
│          50K entries · ZIP/city/county hot paths                 │
│          ~80% cache hit rate · sub-1ms response                  │
└──────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                  NAD SQLite Database                             │
│                  nad/data/nad.db  (68 GB)                        │
│                  WAL mode · read-only replicas safe              │
│                                                                  │
│  Hierarchy: country → state → county → city →                   │
│             neighborhood → zip_code → address                    │
│                                                                  │
│  96,893,147 addresses · 47 states · 2,240 counties               │
│  14,723 cities · 71,410 neighborhoods · 23,848 ZIPs              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: MCP Server
**Consumer:** Claude agents (Claude Code, Claude API, any MCP-compatible client)

### Why MCP First
- All current projects (riTara, DGN, SyntheticData) use Claude
- Zero network overhead — direct tool call, no HTTP round-trip
- Claude can compose address lookups natively in multi-step reasoning
- Enables: "validate all borrower addresses in this loan package" as a single agent task

### File
```
nad/mcp-server.js
```

### Tools Exposed
```
search_address       — street + city + state → verified address + enrichment
lookup_zip           — ZIP code → city, county, state, address count
list_cities          — state → all cities with address counts
list_neighborhoods   — city + state → all neighborhoods
find_near            — lat/lon + radius → nearby addresses
get_stats            — database coverage summary
validate_address     — boolean: does this address exist in NAD?
```

### Usage (Claude Code)
```json
// .claude/settings.json
{
  "mcpServers": {
    "nad": {
      "command": "node",
      "args": ["/Users/shaileshbhujbal/Projects/Syntheticdata/nad/mcp-server.js"]
    }
  }
}
```

### Connection Pattern
```
Claude Agent
    │
    ├─ Tool: search_address("935 Pennsylvania Ave NW, DC")
    │
    └─ NADQuery.findAddress() → SQLite → result
```

---

## Layer 2: REST API
**Consumer:** Web apps, mobile apps, third-party integrations, non-Claude services

### Why REST (not GraphQL, not gRPC)
- **Not GraphQL:** Address lookup is simple point queries, not graph traversal. GraphQL adds schema complexity for zero benefit here.
- **Not gRPC:** Worth it at Google-scale multi-datacenter. Overkill for <10K RPS. Adds proto compilation to every consumer.
- **REST wins:** Universal. Works from curl, Postman, any language, any framework, Zapier, n8n, RapidAPI.

### File
```
nad/api-server.js  (Express, default port 3847)
```

### Endpoints

```
GET  /v1/address                    Search / verify address
POST /v1/address/bulk               Batch verify up to 1,000 addresses
GET  /v1/zip/:zip                   ZIP code metadata
GET  /v1/neighborhood               Neighborhood search
GET  /v1/city                       City search
GET  /v1/county                     County search
GET  /v1/state/:code                State summary
GET  /v1/near                       Radius search by lat/lon
GET  /v1/stats                      DB coverage stats
GET  /health                        Health check
```

### Auth
```
X-API-Key: nad_live_xxxxxxxxxxxx
```

### Rate Limiting
```
Free tier:    100 req/min
Starter:      1,000 req/min
Growth:       5,000 req/min
Enterprise:   Custom
```

### Caching Strategy
```
L1: In-process LRU (node-lru-cache)
    - Size: 50,000 entries
    - TTL: 24 hours (address data changes quarterly)
    - Hit rate: ~80% for ZIP/city queries

L2: HTTP cache headers
    - Cache-Control: public, max-age=86400
    - ETag on /v1/stats and /v1/state responses

No Redis needed at current scale.
Add Redis when: > 3 API server instances needed.
```

### Response Format
```json
{
  "verified": true,
  "full_address": "935 Pennsylvania Avenue Northwest",
  "components": {
    "number": "935",
    "street": "Pennsylvania Avenue Northwest",
    "unit": null
  },
  "jurisdiction": {
    "city": "Washington",
    "neighborhood": "Penn Quarter",
    "county": "District of Columbia",
    "state": "DC",
    "zip": "20535",
    "country": "US"
  },
  "coordinates": {
    "latitude": 38.8947,
    "longitude": -77.0251
  },
  "metadata": {
    "addr_type": "Building",
    "addr_class": "Numbered Thoroughfare Address",
    "placement": "Rooftop",
    "source": "USDOT NAD Q1-2026",
    "date_update": "3/8/2023"
  }
}
```

### Deployment
```
Development:  node nad/api-server.js
Production:   Render.com (persistent disk for nad.db) — $25/mo
              OR same Render instance as ritara-ultimate3
```

---

## Layer 3: npm Module (Direct Import)
**Consumer:** Node.js projects in the same monorepo — zero network overhead

### Why
- SyntheticData, ritara-ultimate3, and any future Node.js project can import directly
- Sub-millisecond queries — SQLite reads from local disk
- No server to start, no auth, no HTTP overhead
- Works today with zero additional code

### Usage
```javascript
// From any sibling project:
const { NADQuery } = require('../Syntheticdata/nad/query.js');

const nad = new NADQuery('/Users/shaileshbhujbal/Projects/Syntheticdata/nad/data/nad.db');

// Verify a borrower address (riTara use case)
const result = nad.findAddress({
  addNumber: '935',
  streetName: 'Pennsylvania',
  stateCode: 'DC'
});

// Find all addresses in a ZIP (SyntheticData use case)
const addresses = nad.getZip('78701', 'TX');

// Proximity search (DGN use case — company HQ lookup)
const nearby = nad.findNear(37.7749, -122.4194, 0.01);

nad.close();
```

### Current Status
✅ **Works today** — `nad/query.js` already exports `NADQuery`

---

## Data Layer

### Database
```
Engine:     SQLite 3 (better-sqlite3)
Mode:       WAL (Write-Ahead Logging) — safe for concurrent readers
Access:     Read-only for all API/MCP/module consumers
Size:       68 GB
Location:   nad/data/nad.db
```

### Geographic Hierarchy (6 levels)
```
Level 6: countries     (1 row)
Level 5: states        (56 rows — 50 states + DC + territories)
Level 4: counties      (2,240 rows)
Level 3: cities        (14,723 rows)
Level 2: neighborhoods (71,410 rows — Nbrhd_Comm + Uninc_Comm)
Level 1: zip_codes     (23,848 rows)
Level 0: addresses     (96,893,147 rows)
```

### Key Indexes
```sql
addresses(state_id)                    -- state-level filtering
addresses(county_id)                   -- county-level filtering
addresses(city_id)                     -- city-level filtering
addresses(neighborhood_id)             -- neighborhood filtering
addresses(zip_code_id)                 -- ZIP lookup
addresses(st_name)                     -- street name search
addresses(add_number, st_name, state)  -- address search
addresses(latitude, longitude)         -- spatial bounding box
addresses(zip_code)                    -- raw ZIP text lookup
```

### Update Cadence

**USDOT publishes full replacement files quarterly — no deltas are published.**
Each release is a complete re-download (~7.9 GB ZIP, ~38 GB extracted, ~4–6 hour re-import).

```bash
# Full re-import when new release is available
node nad/download.js --resume   # downloads new ZIP, re-imports
```

**Delta workaround — built into the data itself:**
Every address record has a `date_update` column (set by the local certifying authority).
After a full re-import, filter on this to find only changed records:
```sql
SELECT * FROM addresses WHERE date_update > '2026-01-01'
```
The `nad_uuid` field is a stable identifier per address across releases — use it to
track record lifecycle (created → updated → decommissioned) without comparing all 96M rows.

**Recommended update frequency by use case:**

| Use Case | Cadence |
|----------|---------|
| 911 / Insurance / Fraud detection | Every quarter — mandatory |
| Mortgage / PropTech / Address verification | Every quarter |
| Analytics / Market research | Every 6 months |
| Historical / Genealogy / Low-stakes | Annual or less |

**What changes between releases (~2–5% of records per quarter):**
- New construction assigned official addresses
- Rural Route / Range Road addresses gain rooftop coordinates
- Incorporated municipality boundary changes (city annexations)
- Neighborhood Nbrhd_Comm names updated by local governments
- Address decommissions (demolished buildings, rural consolidations)

---

## Performance Characteristics

| Query Type | Latency (p50) | Latency (p99) |
|---|---|---|
| ZIP lookup (cached) | < 1ms | < 1ms |
| ZIP lookup (DB) | 2–5ms | 10ms |
| Address search by street+state | 5–15ms | 30ms |
| Radius search (lat/lon bbox) | 10–20ms | 50ms |
| Full-text address | 20–50ms | 100ms |
| Bulk 1,000 addresses | 500ms | 2s |

---

## Scaling Thresholds

| Scale | Action Needed |
|---|---|
| < 500 RPS | Current SQLite setup handles it |
| 500–5K RPS | Add LRU cache + connection pool |
| 5K–50K RPS | Add Redis, read replicas, consider DuckDB |
| > 50K RPS | Migrate to PostgreSQL with PostGIS |

**Current realistic need:** < 100 RPS across all consumers. SQLite is the right choice.

---

## Build Priority

| Priority | Component | Effort | Value |
|---|---|---|---|
| ✅ Done | SQLite DB + query module | — | Foundation |
| 1 | npm module integration test | 30 min | Immediate use in riTara |
| 2 | REST API server | 2 hours | External consumers |
| 3 | MCP server | 2 hours | Claude agent access |
| 4 | API key auth + Stripe | 4 hours | Monetization |
| 5 | Landing page | 1 day | GTM |

---

## File Map

```
nad/
├── schema.sql          ← Database schema (6-level hierarchy)
├── download.js         ← Download + bulk import pipeline
├── init-db.js          ← Initialize empty database
├── query.js            ← NADQuery class (npm module — Layer 3)
├── api-server.js       ← REST API (Layer 2) — TODO
├── mcp-server.js       ← MCP server (Layer 1) — TODO
└── data/
    ├── nad.db          ← 68 GB SQLite database
    ├── NAD_r22.txt     ← 38 GB source text file
    └── NAD_2026-04-12.zip ← 7.9 GB original ZIP
```
