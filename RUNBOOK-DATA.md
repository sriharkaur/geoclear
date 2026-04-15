# GeoClear — Data Operations Runbook

> **Operations on the 91GB `nad.db` SQLite file.**
> Read this before any data transfer, update, or migration.

---

## When to Use This Runbook

| Trigger | Section |
|---------|---------|
| First deploy to a new Render service | [Initial Full Transfer](#initial-full-transfer) |
| NAD quarterly release (every ~3 months) | [Bulk Import — Staging Pipeline](#bulk-import--staging-pipeline) |
| New Overture / OpenAddresses data | [Bulk Import — Staging Pipeline](#bulk-import--staging-pipeline) |
| Render service replaced / disk re-created | [Initial Full Transfer](#initial-full-transfer) |
| Disaster recovery (disk corruption/loss) | [Initial Full Transfer](#initial-full-transfer) |

---

## Architecture

```
LOCAL (source of truth)                    RENDER PROD (serving)
/Users/shaileshbhujbal/Projects/
  geoclear/data/
    nad.db          ──── rsync ────▶   srv-d7ep7bfavr4c73d46gng
    keys.db                             @ssh.virginia.render.com
    NAD_r22.txt                         /data/nad.db
                                        /data/keys.db   (live, DO NOT overwrite)
```

**Critical**: Never rsync `keys.db` to Render — it contains live customer API keys.

---

## Prerequisites

SSH key `macbook-local` must be registered in Render Account Settings → SSH Keys.
Fingerprint: `SHA256:10NFGthdQ5GVvHj/ydIX5Fu0T3Op6kj/jPu+b6SVEWA`

```bash
# Verify SSH works (must bypass NemoClaw proxy)
ssh -o ProxyCommand=none -i ~/.ssh/id_ed25519 \
  srv-d7ep7bfavr4c73d46gng@ssh.virginia.render.com echo ok
# Expected output: ok
```

---

## Initial Full Transfer

Use when: first deploy, disk replacement, disaster recovery.

> **WARNING**: `rsync --append` stalls at high completion (~90%) because old server-side rsync processes pile up.
> Use the **python3 pipe method** below for the final stretch (or the whole transfer if rsync stalls).

**Step 1 — Start with rsync (fast for first 80%):**
```bash
rsync -av --progress --partial \
  -e "ssh -o ProxyCommand=none -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no" \
  /Users/shaileshbhujbal/Projects/geoclear/data/nad.db \
  srv-d7ep7bfavr4c73d46gng@ssh.virginia.render.com:/data/nad.db \
  > /tmp/rsync-nad-progress.log 2>&1 &
```

**Step 2 — If rsync stalls, kill all remote rsync procs and resume with python3 pipe:**
```bash
# Kill stale remote processes first
ssh -o ProxyCommand=none -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no \
  srv-d7ep7bfavr4c73d46gng@ssh.virginia.render.com \
  "pkill -9 -x rsync; ls -la /data/nad.db"

# Get REMOTE_SIZE from ls output above, then:
REMOTE_SIZE=<bytes shown by ls>
python3 -c "
import sys
with open('/Users/shaileshbhujbal/Projects/geoclear/data/nad.db', 'rb') as f:
    f.seek($REMOTE_SIZE)
    while True:
        chunk = f.read(1048576)
        if not chunk: break
        sys.stdout.buffer.write(chunk)
" | ssh -o ProxyCommand=none -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no \
  srv-d7ep7bfavr4c73d46gng@ssh.virginia.render.com "cat >> /data/nad.db"
```

- Duration: ~40–60 minutes total (91GB)
- Monitor remote file growth: `ssh ... "ls -la /data/nad.db"` every few minutes

**After transfer, redeploy:**
```bash
# Trigger redeploy so server picks up the newly available nad.db
curl -s -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clearCache":"do_not_clear"}' \
  https://api.render.com/v1/services/srv-d7ep7bfavr4c73d46gng/deploys
```

**Verify:**
```bash
ssh -o ProxyCommand=none -i ~/.ssh/id_ed25519 \
  srv-d7ep7bfavr4c73d46gng@ssh.virginia.render.com \
  "ls -lh /data/"

curl https://geoclear.onrender.com/api/health
curl "https://geoclear.onrender.com/api/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC"
```

---

## Bulk Import — Staging Pipeline

**Use for:** NAD quarterly update, Overture gap-fill, OpenAddresses, any new data source.
**Never run imports directly on prod or locally.** Staging has the 100GB disk; your Mac does not.

```
New data source
  → Download + import on staging Render Shell
  → Export as gzipped TSV
  → Chunked upload to prod /data via POST /v1/admin/upload-chunk
  → Import via POST /v1/admin/import-tsv-gz-cached (runs in worker_threads)
  → Verify count via GET /api/stats
```

### Step 1 — Run import on staging Render Shell

Open staging shell: Render dashboard → `geoclear-staging` → Shell

```bash
# Download new source data
node download.js           # NAD quarterly ZIP
# or
node overture-import.js --db=/data/overture-additions.db --state=FL

# Verify row count
sqlite3 /data/overture-additions.db "SELECT COUNT(*) FROM addresses;"
```

### Step 2 — Export to gzipped TSV (run on staging shell)

```bash
# Fast bulk export — avoids Node OOM on large datasets
python3 - <<'EOF'
import sqlite3, gzip

SRC  = '/data/overture-additions.db'
OUT  = '/data/overture.tsv.gz'
COLS = ['nad_uuid','add_number','st_name','unit','post_city','inc_muni','state',
        'zip_code','latitude','longitude','addr_type','placement','nad_source',
        'full_address','date_update','date_imported']

conn = sqlite3.connect(SRC)
cur  = conn.cursor()
cur.execute(f"SELECT {','.join(COLS)} FROM addresses")

written = 0
with gzip.open(OUT, 'wt', encoding='utf-8', compresslevel=6) as f:
    while True:
        rows = cur.fetchmany(50000)
        if not rows: break
        for row in rows:
            f.write('\t'.join('' if v is None else str(v) for v in row) + '\n')
            written += 1
        if written % 5000000 == 0:
            print(f'{written:,} rows written…', flush=True)

conn.close()
print(f'Done: {written:,} rows → {OUT}')
EOF
ls -lh /data/overture.tsv.gz
```

### Step 3 — Chunked upload to prod (run locally)

```bash
# Upload from staging /data to prod via chunked HTTP
# (each 500MB chunk ~60s — well under Render's 300s timeout)
source ~/.zshrc
SECRET=$(curl -s "https://api.render.com/v1/services/srv-d7ep7bfavr4c73d46gng/env-vars" \
  -H "Authorization: Bearer $RENDER_API_KEY" | \
  python3 -c "import json,sys; [print(i['envVar']['value']) for i in json.load(sys.stdin) if i['envVar']['key']=='NAD_ADMIN_SECRET']")

# First download the TSV from staging to local /tmp
# (or copy via: ssh staging-shell "cat /data/overture.tsv.gz" > /tmp/overture.tsv.gz)

python3 /tmp/chunked-upload.py "$SECRET" /tmp/overture.tsv.gz
```

### Step 4 — Trigger import on prod

```bash
curl -s -X POST https://geoclear.io/v1/admin/import-tsv-gz-cached \
  -H "X-Admin-Secret: $SECRET"
# → {"ok":true,"message":"Import started in worker thread..."}
```

The import runs in a `worker_threads` worker — prod stays responsive during the entire import.

### Step 5 — Monitor

```bash
# Count updates every ~1 hour (stats cache TTL)
watch -n 60 'curl -s https://geoclear.io/api/stats | python3 -c "import json,sys; print(json.load(sys.stdin)[\"data\"][\"addresses\"])"'
```

### Performance notes

| Approach | Rate | 64.9M rows |
|----------|------|-----------|
| INSERT with 14 indexes (current) | ~5K rows/sec | ~3.5 hours |
| DROP INDEX → INSERT → CREATE INDEX | ~100K rows/sec insert + ~20 min/index rebuild | ~30 min total |

**For future large imports (>10M rows):** drop indexes before bulk load, rebuild after.
Script template (run in Render Shell on prod, server stays up — WAL readers unaffected):

```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database('/data/nad.db');
db.pragma('journal_mode = WAL');

// 1. Drop secondary indexes (keep only PRIMARY KEY)
const idxs = db.prepare(\"SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='addresses' AND name NOT LIKE 'sqlite_%'\").all();
idxs.forEach(({name}) => { console.log('DROP', name); db.exec('DROP INDEX IF EXISTS ' + name); });

// 2. Bulk insert here (fast — no index overhead)
// ... import logic ...

// 3. Recreate indexes (one sequential pass each)
db.exec(\`
  CREATE INDEX IF NOT EXISTS idx_addr_state_id  ON addresses(state_id);
  CREATE INDEX IF NOT EXISTS idx_addr_state_txt ON addresses(state);
  -- ... add remaining indexes from schema.sql
\`);
console.log('Done');
"
```

---

## Safety Rules

1. **NEVER rsync `keys.db`** — contains live customer API keys
2. **NEVER `rm` or truncate `/data/nad.db` on Render** — disk is persistent, no recovery
3. **Always `--partial`** on large transfers — allows resume on disconnect
4. **Always `--checksum` on deltas** — mtime is unreliable across machines
5. **Always verify** file size on Render after transfer before redeploying

---

## Service Reference

| Item | Value |
|------|-------|
| Render Service ID | `srv-d7ep7bfavr4c73d46gng` |
| SSH host | `ssh.virginia.render.com` |
| SSH user | `srv-d7ep7bfavr4c73d46gng` |
| Disk mount | `/data` |
| nad.db size | ~91GB (91,679,145,984 bytes as of 2026-04-14) |
| Local source | `/Users/shaileshbhujbal/Projects/geoclear/data/nad.db` |
| SSH key | `~/.ssh/id_ed25519` (registered as `macbook-local`) |
| ProxyCommand | Must use `-o ProxyCommand=none` (NemoClaw proxy blocks external SSH) |

---

_Last updated: 2026-04-14_
