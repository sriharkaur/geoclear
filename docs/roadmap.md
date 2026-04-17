# GeoClear — Migration Roadmap
_Created: 2026-04-17 | Tracks the SQLite → Xata (PostgreSQL 18 + PostGIS) transition_

---

## Phase 0 — Data Foundation (In Progress)

**Goal:** Move 150GB off SQLite into Xata. Lock the schema. No Render deploy changes yet.

| Task | Queue | Status |
|------|-------|--------|
| Clone risk.db + keys.db into Xata `main` branch via `xata-clone` | Q-161 | ⏳ running |
| Run `npx drizzle-kit introspect` → generate `src/db/schema.ts` | Q-166 | ⏳ waiting on Q-161 |
| Run `npx drizzle-kit generate` → create `drizzle/0001_init.sql` | Q-166 | ⏳ waiting on Q-161 |
| Validate row count parity: SQLite source vs Xata destination | Q-161 | ⏳ waiting on Q-161 |

**Gate:** Phase 1 does not start until `COUNT(*)` parity is confirmed in Xata.

---

## Phase 1 — Hono Migration + pg.Pool (Next)

**Goal:** Swap Express for Hono. Route all DB traffic through `pg.Pool` singleton. Verify prod performance.

| Task | Queue | Status |
|------|-------|--------|
| Migrate Express routes to Hono v1 (`src/api/v1/`) | Q-162 | pending |
| Wire `pool` from `src/db/client.ts` into `keys.js`, `risk-data.js`, `query.js` | Q-171 | pending |
| Vitest API contract tests (Hono testClient, no supertest) | Q-054 | pending |
| Set `DATABASE_URL` = `XATA_DATABASE_URL` in Render dashboard → test deploy | Q-162 | pending |

**Critical rule:** Never use Render Pre-deploy for migrations at 150GB. Always merge Xata branch first, then `git push`. Render auto-deploy finds the DB already ready.

---

## Phase 2 — PostGIS + /v2/proximity + Soda Core (Future)

**Goal:** Add spatial intelligence. First three Unique Joins that enterprise customers can't get anywhere else.

| Feature | Query | Queue |
|---------|-------|-------|
| PostGIS proximity search — `ST_DWithin` within radius | `GET /v2/proximity/search?lat=&lng=&radius_meters=` | Q-181 |
| Flood zone polygon lookup — `ST_Contains` against FEMA polygons | `GET /v2/flood-zone` | Q-182 |
| Risk cluster density — `ST_ClusterDBSCAN` | `GET /v2/risk-clusters` | Q-181 |
| Soda Core weekly data quality audit (GitHub Actions) | `.github/workflows/data-quality.yml` | Q-180 |

**Performance target:** All PostGIS queries < 50ms with GIST spatial index on `risk_data.geom`. Enable with `CREATE INDEX idx_risk_data_spatial ON risk_data USING GIST (geom)` on Xata feature branch first.

---

## Zero Lock-In Exit Policy

If we ever need to leave Xata:
1. All migration history in `/drizzle/*.sql` — replay on any Postgres host
2. Weekly `xata pull main` via GitHub Actions → schema in git history
3. `pg_dump` → S3 for full data portability
4. Spin up Coolify or any VPS, replay `/drizzle/*.sql` → live in < 1 hour
