# GeoClear Dev Session — 2026-04-18
> Session 34 | Picked up from session 33 (Q-186 + Q-187: MCP Phase 1 + x402 Phase 2)

---

## What Was Done This Session

### 1. MCP Server — `mcp.geoclear.io` DNS + `verify_address` Upgrade

**Problem:** `mcp.geoclear.io` didn't exist (DNS not set up). MCP server was already built inside `web-server.js` using `StreamableHTTPServerTransport` but only reachable at `geoclear.io/mcp`.

**Actions:**
- Added Cloudflare CNAME: `mcp.geoclear.io` → `geoclear.onrender.com` (DNS-only, via Cloudflare API, zone `b317a310f9b8908e12417c1662660cb1`)
- Registered `mcp.geoclear.io` as custom domain on Render service `srv-d7ep7bfavr4c73d46gng` — verified instantly
- Upgraded `verify_address` MCP tool in `web-server.js` (line ~1945) to return full schema:
  - `coverage.state_coverage`: normalised to spec enum `full | partial | sparse` (was returning `full | gap-fill | partial`)
  - `guidance.recommended_action`: `approved | hold | deny | refer` — decision signal for downstream agents
  - `guidance.reasoning`: human-readable explanation string
  - Logic: conf<30 → deny; conf<60 or interpolated match → hold; gap-fill state → refer; else → approved

**Commit:** `74b85b0` — "feat: add guidance block and state_coverage enum to verify_address MCP tool"

**Verified:** MCP initialize handshake confirmed live:
```
POST https://mcp.geoclear.io/mcp
→ protocolVersion: 2025-03-26, serverInfo: geoclear v1.0.0 ✅
```

**Claude Desktop config to use:**
```json
"geoclear": {
  "url": "https://mcp.geoclear.io/mcp",
  "headers": { "X-Api-Key": "your_geoclear_key" }
}
```

**x402 / Coinbase USDC:** Already wired in `web-server.js` (lines 2012–2080). `GEOCLEAR_USDC_WALLET` env var is set in Render. Unauthenticated agents get `402 Payment Required` with USDC payment spec — $0.004/call on Base mainnet. Facilitator: `x402.org/facilitator`.

---

### 2. USPS Data Gap Analysis

**Key finding:** GeoClear has 198.6M addresses vs USPS 168.6M — but they measure different things. GeoClear counts addressable parcels; USPS counts deliverable mail points. Actual overlap ~150–155M.

**Critical gaps discovered:**
| State | GeoClear count | Expected | Gap |
|---|---|---|---|
| Hawaii (HI) | **0** | ~560,000 | P2 — urgent |
| Puerto Rico (PR) | **0** | ~1,300,000 | P2 |
| South Dakota (SD) | 206,082 | ~400,000 | ~52% coverage |

**Decision:** Do NOT pursue USPS DSF2 licensing — compliance burden exceeds value. PO Boxes (~19M USPS-exclusive) don't enrich (no lat/lon, no flood zone).

**Fix sequence documented in:** `architecture/DATA-GAP-ANALYSIS-2026-04-18.md`

---

### 3. Queue Items Added (Q-188 → Q-197)

| Q# | Priority | Title | Effort |
|---|---|---|---|
| Q-188 | P2-DATA | Hawaii coverage — 0 addresses | 2–4 hrs |
| Q-189 | P2-DATA | Puerto Rico coverage — 0 addresses | 3–5 hrs |
| Q-190 | P3-FEAT | OpenAddresses full US import | 1 day |
| Q-191 | P3-FEAT | Run Microsoft Building Footprints on staging (script ready) | 4–6 hrs run |
| Q-192 | P3-FEAT | Quarterly Overture refresh cadence — July 2026 | 2 hrs docs |
| Q-193 | P3-FEAT | Store Overture GERS ID in address schema | 3–4 hrs |
| Q-194 | P3-FEAT | South Dakota targeted gap-fill | 2–3 hrs |
| Q-195 | P3-DIST | MCP directory listings — Anthropic, Cursor, Cline, Glama | 3–4 hrs |
| Q-196 | P3-DIST | Homepage "AI-native / MCP-ready" section | 2–3 hrs |
| Q-197 | P3-DIST | MCP launch post — HN + LinkedIn + Anthropic Discord | 2 hrs |

---

### 4. Marketing Assets Created

- `docs/ONE-PAGER.md` — product one-pager (markdown)
- `docs/geoclear-launch-pack.txt` — plain-text email file: one-pager + LinkedIn post + potential customer analysis

**Potential customer tiers (from analysis):**
- Tier 1 (highest leverage): P&C insurers/MGAs (Kin, Openly, Hippo), HELOC lenders (Figure, Spring EQ), drone delivery (Wing, Zipline), fraud platforms (Signifyd, Riskified)
- Tier 2: PropTech (Redfin, Opendoor, HouseCanary), title companies (First American, Spruce), solar (Sunrun, Aurora Solar), background screening (Checkr, Sterling)
- Tier 3: Direct mail, home health, CRE platforms, emergency management software

---

## State of Key Systems

| System | Status |
|---|---|
| `geoclear.io` | ✅ Live, auto-deploy on push |
| `mcp.geoclear.io` | ✅ Live as of this session — DNS + Render domain + MCP initialize verified |
| `geoclear.io/mcp` | ✅ Same endpoint, still works |
| x402 USDC payments | ✅ Wired — `GEOCLEAR_USDC_WALLET` set in Render |
| `verify_address` tool | ✅ Upgraded — `guidance` + `state_coverage` blocks live |
| Neon PostgreSQL | ✅ risk data (wildfire/storm/eq/drought/nri/calfire) + keys/usage |
| Staging | ✅ `srv-d7f6rh58nd3s73cve8dg`, autoDeploy OFF, 100GB disk |

---

## What to Pick Up Next Session

**Immediate (P2 — do before any P3):**
1. **Q-188 · Hawaii coverage** — run `node overture-import.js --db=/data/hi-overture.db --state=HI` on staging Render Shell. If yield ≥300K: upload-chunk → merge. Test: `GET /api/address?street=100+Paoakalani+Ave&city=Honolulu&state=HI` should return a result.
2. **Q-189 · Puerto Rico** — same pipeline with `--state=PR`.

**After P2 is clear:**
3. **Q-195 · MCP directory listings** — submit to Anthropic directory + Cursor + Cline + Glama. No code needed, just submissions.
4. **Q-196 · Homepage AI-native section** — ~40 lines in `public/landing.html`.
5. **Q-197 · MCP launch post** — HN Show HN + LinkedIn. Drafts in `docs/geoclear-launch-pack.txt`.

**Ongoing open P2 items (from prior sessions, not yet resolved):**
- Q-139: FEMA NFHL returning OUTSIDE for all prod addresses
- Q-140: CA Overture addresses missing county_fips (~29.5M affected)
- Q-141: CAL FIRE FHSZ not yet imported into risk.db

---

## Files Changed This Session

| File | Change |
|---|---|
| `web-server.js` | `verify_address` MCP tool — guidance block + state_coverage enum |
| `QUEUE.md` | Q-188–Q-197 added, header updated, INFRA table updated |
| `architecture/DATA-GAP-ANALYSIS-2026-04-18.md` | New — full USPS gap analysis |
| `docs/ONE-PAGER.md` | New — product one-pager |
| `docs/geoclear-launch-pack.txt` | New — email-ready launch pack |

---

## Commits This Session

```
74b85b0  feat: add guidance block and state_coverage enum to verify_address MCP tool
757f354  docs: Q-188–Q-197 — USPS/coverage gap analysis + MCP launch queue items
```

(Earlier commits in git log are from session 33.)
