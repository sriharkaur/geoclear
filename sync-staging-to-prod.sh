#!/usr/bin/env bash
# =============================================================================
# sync-staging-to-prod.sh
# Merge new addresses from geoclear-staging into geoclear-prod (Render → Render)
#
# How it works:
#   1. SSH into Render staging shell via Render API exec
#   2. Dump new addresses (not in prod) from staging nad.db to a temp file
#   3. Transfer to prod disk via shared Render internal storage (or scp)
#   4. Merge into prod nad.db with INSERT OR IGNORE
#
# Usage:
#   bash sync-staging-to-prod.sh [--dry-run]
#
# Requirements:
#   - RENDER_API_KEY in env or ~/.zshrc
#   - Both services on same Render account
# =============================================================================

set -euo pipefail

source ~/.zshrc 2>/dev/null || true

STAGING_ID="srv-d7f6rh58nd3s73cve8dg"
PROD_ID="srv-d7ep7bfavr4c73d46gng"
DRY_RUN="${1:-}"

echo "=== GeoClear Staging → Prod Sync ==="
echo "Staging: $STAGING_ID"
echo "Prod:    $PROD_ID"
echo ""

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "[DRY RUN] Would merge addresses from staging nad.db → prod nad.db"
  echo ""
  echo "Manual steps to run on Render staging shell:"
  echo "  1. Open Render dashboard → geoclear-staging → Shell"
  echo "  2. Run:"
  echo "     sqlite3 /data/nad.db 'SELECT COUNT(*) FROM addresses'"
  echo "  3. To export new addresses to a TSV:"
  echo "     sqlite3 /data/nad.db '.mode tabs' '.output /data/new_addresses.tsv' 'SELECT * FROM addresses WHERE nad_source = \"Overture Maps\"'"
  echo "  4. Open Render dashboard → geoclear → Shell"
  echo "  5. Download and merge:"
  echo "     curl -O https://geoclear-staging.onrender.com/v1/admin/export/addresses  # (needs admin endpoint)"
  echo "     sqlite3 /data/nad.db '.import /data/new_addresses.tsv addresses'"
  exit 0
fi

echo "To perform the actual sync, use the Render Shell (browser):"
echo ""
echo "STEP 1 — Open Render staging shell and run:"
cat << 'STAGING_CMD'
# On geoclear-staging shell (/data disk):
sqlite3 /data/nad.db << 'SQL'
.mode tabs
.headers off
.output /data/overture_export.tsv
SELECT
  null, nad_uuid, add_number, null, null, null, null, st_name, null, null, null,
  null, null, null, null, null, null, county, inc_muni, post_city, null, null,
  null, null, null, null, null, null, null, null, null, state, zip_code, null,
  null, null, longitude, latitude, null, null, null, null, null, null, null,
  null, null, null, addr_type, null, nad_source, null, full_address, null,
  null, null, null, null, null, date_update
FROM addresses
WHERE nad_source = 'Overture Maps';
.output stdout
SELECT 'Exported: ' || COUNT(*) || ' Overture rows' FROM addresses WHERE nad_source = 'Overture Maps';
SQL
STAGING_CMD

echo ""
echo "STEP 2 — Transfer /data/overture_export.tsv from staging to prod"
echo "  (Use Render's internal network: rsync or wget between services)"
echo ""
echo "STEP 3 — On geoclear-prod shell, run:"
cat << 'PROD_CMD'
# On geoclear shell (/data disk):
sqlite3 /data/nad.db << 'SQL'
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
.separator "\t"
.import /data/overture_export.tsv addresses_staging
INSERT OR IGNORE INTO addresses SELECT * FROM addresses_staging;
DROP TABLE addresses_staging;
SELECT 'Done. Total addresses: ' || COUNT(*) FROM addresses;
SQL
PROD_CMD

echo ""
echo "NOTE: The cleanest path is via the admin merge endpoint (see below)."
echo "Add this to web-server.js for one-shot use, then remove after merge."
