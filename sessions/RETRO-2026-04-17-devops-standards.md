# DevOps Standards Retro — 2026-04-17

> **Trigger:** Full-day incident chain — ABI mismatch, missing env var, DB_NOT_READY, wrong risk.db path, silent 0-county NRI import, staging not a superset of prod, FEMA IP block.
> **Session:** 27–28 + coordination session
> **Outcome:** 10 distinct failure patterns identified → 16 standards items added to QUEUE (Q-144–Q-159)

---

## The 10 Incident Patterns

### P-1 · Runtime version not pinned → ABI mismatch crash
Render silently upgraded Node 20 → 25.9. `better-sqlite3` is a native addon compiled for a specific Node ABI. Mismatch = `ERR_DLOPEN_FAILED` on startup. Prod down ~45 min.
**Pattern:** External infrastructure drift breaking native dependencies with no warning.

### P-2 · Critical env var missing → silent DB path fallback
`DATA_DIR=/data` not set on prod service. Code fell back to `path.join(__dirname, 'data')`. The `data/ → /data` symlink was wiped by cache-clear rebuild. Server started, DB never opened, every request returned 503.
**Pattern:** Defensive fallbacks hiding configuration failures. The fallback looked valid but pointed at nothing.

### P-3 · Server bound before DB ready → traffic on unready instance
Old `app.listen()` fired immediately. Render routed traffic to new instance as soon as port bound — before nad.db (91GB) finished opening. Every request: `DB_NOT_READY`.
**Pattern:** Readiness and liveness conflated. Port open ≠ service ready.

### P-4 · Import scripts use `__dirname` not `DATA_DIR`
Scripts uploaded to `/data/` for execution: `__dirname = /data`. `path.join(__dirname, 'data', 'risk.db')` = `/data/data/risk.db`. Wildfire import ran successfully, exit 0, data written to wrong path. Silent.
**Pattern:** Relative path construction breaks when execution context changes.

### P-5 · Staging not a superset of prod before upload
Prod: wildfire + storm + earthquake + drought. Staging: partial storm + empty wildfire + empty nri + no earthquake + no drought. Upload would have wiped 2 prod tables. Caught manually — no automated gate.
**Pattern:** No canonical "what is in prod" manifest. No pre-upload verification.

### P-6 · NRI import got 0 counties, exit 0
Script read county list from `wildfire_risk` table. Staging wildfire_risk was empty → 0 FIPS → 0 API calls → printed "import complete. 0 counties." No assertion on input size. No exit 1.
**Pattern:** Silent success on degenerate input. Missing: assert(input.length > 0).

### P-7 · FEMA per-county API IP-blocked on Render
3,221 individual API calls returned empty from Render's datacenter IP. Script returned 0 rows, no error, exit 0. Discovered only when running the import. No prior monitoring.
**Pattern:** External API silently returning wrong/empty data detected only on manual inspection.

### P-8 · FEMA NFHL returns `OUTSIDE` for all prod addresses
Render IP gets wrong results from FEMA ArcGIS feature service. `flood_zone: OUTSIDE` for every address in prod — including confirmed AE/VE zone addresses. Silent wrong data, not null, not an error. No alert. Duration unknown.
**Pattern:** External dependency returning plausible-looking wrong data. System has no way to detect "this result is systematically wrong."

### P-9 · Two sessions diverged on same file
Both sessions independently rewrote `nri-import.js` with the same fix. By coincidence the logic converged. No session coordination protocol. If they'd diverged, one session's commit would have silently overwritten the other.
**Pattern:** No explicit multi-session coordination. Each session sees git log but not "what is the other session currently doing."

### P-10 · Hardcoded infrastructure path assumption
Runner script assumed `/home/render/project/src/node_modules`. Render's actual home is different. `MODULE_NOT_FOUND`, imports blocked.
**Pattern:** Any hardcoded absolute path to infrastructure is a future failure. Use `process.cwd()` or env vars.

---

## The Four Principles (permanent standards)

### 1. Prod never goes down
- Every external dependency has an explicit ready state
- Server bind only after all critical resources confirm ready
- Runtime versions are pinned at repo level, not left to host discretion
- Configuration is explicit (env vars), never fallback-based in prod
- External API failures return null + log, never plausible-looking wrong data

### 2. Path to push never blocked
- Code deploys and data updates are independent release tracks
- Import scripts are self-contained — no CWD assumption, no hardcoded paths
- Long-running imports run on staging only, never on prod or local
- Scripts accept explicit `--db=` path OR read `DATA_DIR` env var — never `__dirname`

### 3. Data lives at `/data`, code lives in the project directory. They never overlap.
- Every DB file path comes from an env var (`DATA_DIR`, `RISK_DB`, `NAD_DB`)
- Staging must be a verified superset of prod before any upload (automated check)
- A data manifest (table + row count + import date) is machine-readable at all times
- DB updates ship via admin pipeline (`stream-upload`), never via git

### 4. Data quality is the product — 100% diligence
- Every import validates its own output before exiting (row count, value ranges, null rate)
- A known-good address smoke test runs after every prod upload (all dimensions non-zero)
- External APIs are monitored for systematic wrong-data patterns, not just uptime
- Data freshness is tracked per table — stale data triggers an alert

---

## Implementation: Q-144 through Q-159
See QUEUE.md — DevOps Standards section.
