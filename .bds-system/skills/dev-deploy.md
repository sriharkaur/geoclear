# /dev-deploy — Deploy Phase

Trigger deployment, monitor until live, handle failures. Never declare deploy done until status is confirmed live.

---

## Step 1 — Load context

Read `CLAUDE.md` for:
- Deploy platform (Render / Vercel / other)
- Service IDs and URLs
- Whether CI must pass before deploy
- Staging environment (exists / does not exist)
- Any manual steps required (migrations, cache clear, seed data)

Retrieve API keys from `~/.zshrc` if needed for Render API calls.

---

## Step 2 — Pre-deploy gate

Confirm before triggering:
- [ ] Tests passed (`/dev-test` ran and was green)
- [ ] Code committed and pushed to main (or CI branch)
- [ ] No uncommitted changes: `git status` is clean
- [ ] If schema change: migration file exists, applied on staging, verified — see DB Migration Protocol below
- [ ] If large file (>100MB): used SSH pipe or chunked upload — NOT git — see Large File Protocol below
- [ ] If data operation (>5GB): staging-first rule followed — see Data Operations Protocol below

If any check fails: do not deploy. Fix first.

---

## Step 3 — Trigger deployment

**Render auto-deploy (push to main triggers it):**
- Already triggered by `git push` in `/dev-commit`
- Skip to Step 4 (monitor)

**Render manual trigger via API:**
```bash
RENDER_API_KEY=$(grep RENDER_API_KEY ~/.zshrc | cut -d'"' -f2 | head -1)
SERVICE_ID=<from CLAUDE.md>
curl -s -X POST "https://api.render.com/v1/services/${SERVICE_ID}/deploys" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": false}'
```

**GitHub Actions CI (before deploy):**
```bash
# Poll for CI run on latest commit
gh run list --limit 1 --json status,conclusion,url
gh run watch <run-id>    # stream CI output
```
CI must reach `conclusion: success` before proceeding. If CI fails: read logs, report.

**Vercel:**
```bash
vercel --prod    # if Vercel CLI configured
```

---

## Step 4 — Monitor until live

Poll deploy status. Do not move to `/dev-verify` until confirmed live.

**Render API polling:**
```bash
RENDER_API_KEY=$(grep RENDER_API_KEY ~/.zshrc | cut -d'"' -f2 | head -1)
curl -s "https://api.render.com/v1/services/${SERVICE_ID}/deploys?limit=1" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" | jq '.[0] | {status, finishedAt}'
```

Poll every 30 seconds. Stop when `status` is `live` or `failed`.
Timeout: 10 minutes. If not live in 10 min: retrieve deploy logs and report.

**Simple health-check polling (fallback):**
```bash
for i in {1..20}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" <prod-health-url>)
  echo "Attempt $i: HTTP $STATUS"
  [ "$STATUS" = "200" ] && break
  sleep 30
done
```

---

## Step 5 — Handle failures

If deploy failed:
1. Retrieve logs: `curl "https://api.render.com/v1/services/${SERVICE_ID}/deploys/<deploy-id>/logs"`
2. Read the error — common causes:
   - Build failure (npm install, pip install, compile error)
   - Start failure (port conflict, missing env var, DB connection)
   - Crash loop (unhandled exception on startup)
3. Report the specific error with the relevant log lines
4. Do not attempt to fix blind — read the actual error first

**Rollback if needed (explicit user approval required):**
```bash
# Render: re-deploy the previous commit
git revert HEAD && git push origin main
```
Do not rollback without user approval.

---

## Step 6 — Report

```
Deploy: LIVE  (or FAILED — with error)
Platform: <Render | Vercel | other>
Service: <service-id or URL>
Deploy time: <seconds>
CI: <PASS | SKIP — no CI configured | FAIL — error>
Next: run /dev-verify
```

---

## PROTOCOL A — Large File Deployment (>100MB)

Git has a hard 100MB file size limit. Never commit large files (databases, compiled assets, model weights, archives) to git. Use these methods instead.

### Decision tree

```
File size < 100MB   → git is fine
File size 100MB–2GB → chunked upload API (if service exposes one) OR ssh pipe
File size > 2GB     → ssh pipe with seek-offset resume; never rsync entire DB
File is a database  → always ssh pipe or chunked API, never git, never rsync entire file
```

### Method 1 — Chunked upload API (preferred for services with an upload endpoint)

```bash
# Split file into 50MB chunks and upload sequentially
PROD_URL=https://geoclear.io
ADMIN_SECRET=$(grep NAD_ADMIN_SECRET ~/.zshrc | cut -d'"' -f2)
FILE=local-additions.db
CHUNK_SIZE=$((50 * 1024 * 1024))  # 50MB
OFFSET=0
PART=0

while [ $OFFSET -lt $(wc -c < $FILE) ]; do
  dd if=$FILE bs=1 skip=$OFFSET count=$CHUNK_SIZE 2>/dev/null | \
    curl -s -X POST "$PROD_URL/v1/admin/upload-chunk" \
      -H "X-Admin-Secret: $ADMIN_SECRET" \
      -H "X-Chunk-Part: $PART" \
      -H "X-Chunk-Offset: $OFFSET" \
      --data-binary @-
  OFFSET=$((OFFSET + CHUNK_SIZE))
  PART=$((PART + 1))
  echo "Uploaded part $PART, offset $OFFSET"
done
```

### Method 2 — SSH pipe (Render Shell or any SSH target)

```bash
# Stream a file to a remote path via SSH — no rsync, no SCP, no temp file on sender
# This method supports seek-offset resume on failure

REMOTE_PATH=/data/additions.db
LOCAL_FILE=./additions.db
OFFSET=0   # set to bytes already transferred if resuming

# Full transfer
ssh render-shell "cat > $REMOTE_PATH" < $LOCAL_FILE

# Resume from offset (if previous transfer stalled)
ssh render-shell "dd of=$REMOTE_PATH bs=1 seek=$OFFSET conv=notrunc" < \
  <(dd if=$LOCAL_FILE bs=1 skip=$OFFSET)
```

**Why not rsync:** rsync stalls on files >86GB on Render (discovered in production — see memory). Use ssh pipe with seek offset instead.

### Method 3 — Direct Render Shell upload (small-medium files via curl to S3 intermediate)

```bash
# Upload to S3 first, then pull from Render Shell
aws s3 cp large-file.db s3://bucket/large-file.db
# Then in Render Shell:
# aws s3 cp s3://bucket/large-file.db /data/large-file.db
```

---

## PROTOCOL B — DB Migration Strategy

All schema changes must follow a numbered migration pattern. Never apply schema changes directly to prod without staging verification.

### Migration file format

```
migrations/
  0001-init-schema.sql
  0002-add-api-keys-table.sql
  0003-add-usage-logs-index.sql
  0004-add-flood-zone-column.sql
```

**Each migration file header:**
```sql
-- Migration: 0004-add-flood-zone-column.sql
-- Date: 2026-04-15
-- Description: Add nullable flood_zone column to addresses table
-- Rollback: ALTER TABLE addresses DROP COLUMN flood_zone;
-- Estimated duration on 120M rows: ~45 minutes (column add is instant in SQLite, backfill is slow)
-- Staging verified: YES (2026-04-14)

ALTER TABLE addresses ADD COLUMN flood_zone TEXT;
```

### Migration execution order

```
1. Write migration file (migrations/NNNN-description.sql)
2. Apply on staging Render Shell first
   sqlite3 /data/nad.db < migrations/NNNN-description.sql
3. Verify:
   - Table schema correct: sqlite3 /data/nad.db ".schema addresses"
   - Row counts unchanged: SELECT COUNT(*) FROM addresses
   - Sample query returns expected shape
4. Apply on prod ONLY after staging verified
5. Add migration to startup auto-apply script (if project uses one)
```

### Large schema changes (new column on >10M rows, index rebuild)

```
Strategy: minimize lock time, never block reads

Step 1 — Add column as nullable first (instant, no rewrite)
  ALTER TABLE addresses ADD COLUMN flood_zone TEXT;

Step 2 — Backfill in batches (keeps reads alive)
  UPDATE addresses SET flood_zone = lookup_fema(lat, lon)
  WHERE rowid BETWEEN ? AND ?
  LIMIT 10000;
  -- Repeat with LIMIT/OFFSET, yield between batches

Step 3 — Add NOT NULL constraint only after backfill complete
  -- SQLite: create new table with constraint, copy data, rename
  -- PostgreSQL: ALTER TABLE addresses ALTER COLUMN flood_zone SET NOT NULL;

Step 4 — Rebuild indexes after large backfill
  DROP INDEX IF EXISTS idx_addresses_flood_zone;
  CREATE INDEX idx_addresses_flood_zone ON addresses(flood_zone);
  -- See DROP INDEX pattern for bulk inserts: ~20x speedup
```

### DROP INDEX pattern for bulk inserts (>10M rows)

```bash
# Before bulk insert
sqlite3 /data/nad.db "DROP INDEX IF EXISTS idx_addr_zip;"
sqlite3 /data/nad.db "DROP INDEX IF EXISTS idx_addr_state;"

# Run bulk insert (60-100M rows/hr without indexes vs 3M rows/hr with)

# Rebuild after insert (~20 min per index, WAL keeps reads live)
sqlite3 /data/nad.db "CREATE INDEX idx_addr_zip ON addresses(zip);"
sqlite3 /data/nad.db "CREATE INDEX idx_addr_state ON addresses(state);"
```

---

## PROTOCOL C — Data Operations & Staging-First Rule

### Size thresholds

| Data size | Where to process | Method |
|-----------|-----------------|--------|
| < 0.5 GB | Local (dev.db) | Direct — local dev only |
| 0.5 GB – 5 GB | Staging Render Shell | Import on staging → verify → upload-chunk to prod |
| > 5 GB | Staging Render Shell | Import on staging → verify → SSH pipe to prod |
| > 50 GB | Staging Render Shell | Full pipeline — TSV export → chunked upload → merge → verify |

**Local dev is code-only. Never run large imports locally.**
**Staging has 100GB disk. Prod disk is for live nad.db only.**

### Full data pipeline (>5GB)

```
Source (S3 parquet / NAD quarterly / OpenAddresses)
  ↓ Download directly to Render Staging Shell
  ↓ Run import script on staging
  ↓ Verify: row counts, sample queries, schema integrity
  ↓ TSV export of new/changed rows
  ↓ Upload-chunk to prod via POST /v1/admin/upload-chunk (resumable)
  ↓ Merge on prod via POST /v1/admin/merge (INSERT OR IGNORE)
  ↓ Verify: SELECT COUNT(*) on prod, sample address lookup
  ↓ Rebuild indexes if needed
```

### Checkpoint/resume for long imports

Long imports must be restartable without re-processing data already imported:

```javascript
// Pattern: track progress in a checkpoint file
// /data/import-checkpoint.json: { "lastProcessedOffset": 12345678, "rowsImported": 4500000 }

// On start: read checkpoint, skip already-processed rows
// On each batch: write checkpoint after successful commit
// On restart: resume from checkpoint offset
```

### Verification after any data operation

```bash
# Row count (must match expected range, never decrease)
sqlite3 /data/nad.db "SELECT COUNT(*) FROM addresses"

# Sample lookup (must return valid address)
curl -s "https://geoclear.io/v1/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC" \
  -H "X-Api-Key: $TEST_KEY"

# Stats endpoint
curl -s https://geoclear.io/api/stats

# No schema corruption
sqlite3 /data/nad.db "PRAGMA integrity_check" | head -5
```
