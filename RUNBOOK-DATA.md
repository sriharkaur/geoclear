# GeoClear — Data Operations Runbook

> **Operations on the 85GB `nad.db` SQLite file.**
> Read this before any data transfer, update, or migration.

---

## When to Use This Runbook

| Trigger | Section |
|---------|---------|
| First deploy to a new Render service | [Initial Full Transfer](#initial-full-transfer) |
| NAD quarterly release (every ~3 months) | [Quarterly Delta Update](#quarterly-delta-update) |
| Render service replaced / disk re-created | [Initial Full Transfer](#initial-full-transfer) |
| Disaster recovery (disk corruption/loss) | [Initial Full Transfer](#initial-full-transfer) |
| Overture gap-fill import completed locally | [Quarterly Delta Update](#quarterly-delta-update) |

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

```bash
rsync -avz --progress --partial \
  -e "ssh -o ProxyCommand=none -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no" \
  /Users/shaileshbhujbal/Projects/geoclear/data/nad.db \
  srv-d7ep7bfavr4c73d46gng@ssh.virginia.render.com:/data/nad.db
```

- Duration: ~35–45 minutes (85GB at 35–45 MB/s)
- `--partial` resumes interrupted transfers — safe to Ctrl-C and re-run
- Monitor progress: `cat /tmp/rsync-nad-progress.log` (if redirected)

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

curl https://geoclear.onrender.com/health
curl "https://geoclear.onrender.com/v1/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC"
```

---

## Quarterly Delta Update

Use when: NAD releases a new quarterly ZIP, or after Overture gap-fill import.

**Step 1 — Import locally first:**
```bash
# Download new NAD ZIP to geoclear/data/
node download.js

# Import (sample run first — always)
node init-db.js --limit 1000

# Full import if sample looks good
node init-db.js
```

**Step 2 — Delta rsync (only changed blocks transferred):**
```bash
rsync -avz --checksum --partial --progress \
  -e "ssh -o ProxyCommand=none -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no" \
  /Users/shaileshbhujbal/Projects/geoclear/data/nad.db \
  srv-d7ep7bfavr4c73d46gng@ssh.virginia.render.com:/data/nad.db
```

- `--checksum` compares file content block-by-block — only changed pages transfer
- Duration: ~5–15 minutes for a typical quarterly delta (~2–5GB changed)
- No service interruption — SQLite readers continue serving from the file while rsync writes; Render will briefly use the old pages until rsync completes

**Step 3 — Redeploy (same command as above)**

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
| nad.db size | ~85GB |
| Local source | `/Users/shaileshbhujbal/Projects/geoclear/data/nad.db` |
| SSH key | `~/.ssh/id_ed25519` (registered as `macbook-local`) |
| ProxyCommand | Must use `-o ProxyCommand=none` (NemoClaw proxy blocks external SSH) |

---

_Last updated: 2026-04-13_
