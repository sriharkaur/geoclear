#!/usr/bin/env node
/**
 * Overture Maps → NAD Gap Filler
 * ================================
 * Downloads US address data from Overture Maps Foundation (Apache 2.0)
 * for states with zero or minimal coverage in the NAD dataset.
 *
 * Overture data fills the critical gaps:
 *   FL — 0 addresses in NAD (4.7M expected)
 *   MI — 0 addresses in NAD (2.2M expected)
 *   NJ — 0 addresses in NAD (1.8M expected)
 *   NV — 0 addresses in NAD (400K expected)
 *   NH — 0 addresses in NAD (200K expected)
 *
 * Data Source:
 *   Overture Maps Foundation — https://overturemaps.org
 *   Theme: addresses, type: address
 *   Format: GeoParquet (partitioned by bbox)
 *   License: CDLA Permissive 2.0 (use freely, attribution required)
 *
 * Requirements:
 *   DuckDB CLI — https://duckdb.org/docs/installation/
 *   OR: npm install duckdb  (Node.js binding)
 *
 * Usage:
 *   # Download + import all gap states
 *   node nad/overture-import.js
 *
 *   # Single state
 *   node nad/overture-import.js --state FL
 *
 *   # Dry run (show record counts, no DB write)
 *   node nad/overture-import.js --state FL --dry-run
 *
 *   # Custom bounding box (faster for testing)
 *   node nad/overture-import.js --bbox "-80.2,25.7,-80.1,25.8"
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const path     = require('path');
const fs       = require('fs');
const Database = require('better-sqlite3');

const NAD_DB  = path.join(__dirname, 'data', 'nad.db');
const TMP_DIR = path.join(__dirname, 'data', 'overture_tmp');

// ── State bounding boxes (for targeted downloads) ──────────────────
const STATE_BBOX = {
  FL: '-87.63,24.39,-79.97,31.0',
  MI: '-90.42,41.7,-82.1,48.3',
  NJ: '-75.56,38.9,-73.88,41.36',
  NV: '-120.0,35.0,-114.0,42.0',
  NH: '-72.56,42.7,-70.7,45.3',
  // Secondary gaps (low coverage)
  ID: '-117.24,41.99,-111.04,49.0',
  WY: '-111.05,40.99,-104.05,45.01',
  MT: '-116.05,44.35,-104.04,49.0',
};

// Gap states to process when no --state flag given
const GAP_STATES = ['FL', 'MI', 'NJ', 'NV', 'NH'];

// Overture Maps S3 path (latest release — 2026-02-18.0)
// Files are flat .zstd.parquet (not hive-partitioned subdirs)
// See: https://docs.overturemaps.org/getting-data/amazon-s3/
const OVERTURE_RELEASE = '2026-02-18.0';
const OVERTURE_S3 = `s3://overturemaps-us-west-2/release/${OVERTURE_RELEASE}/theme=addresses/type=address`;

// ── Helpers ────────────────────────────────────────────────────────
const log  = (...a) => console.log(`[overture]`, ...a);
const warn = (...a) => console.warn(`[overture WARN]`, ...a);

function checkDuckDB() {
  const r = spawnSync('duckdb', ['--version'], { encoding: 'utf8' });
  if (r.status === 0) return 'cli';
  // Try Node.js binding
  try {
    require('duckdb');
    return 'node';
  } catch (_) {
    return null;
  }
}

function runDuckDB(sql) {
  const result = spawnSync('duckdb', ['-c', sql], {
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr || 'DuckDB failed');
  return result.stdout;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Column mapper — Overture → NAD schema ──────────────────────────
// Overture addresses schema (2026-02-18.0):
//   id, geometry, bbox{xmin,xmax,ymin,ymax}, country, postcode,
//   street, number, unit, address_levels[{value}], postal_city,
//   version, sources, theme, type
//
// Spatial filter uses bbox struct (fast, no geometry parsing):
//   bbox.xmin >= minLon AND bbox.xmax <= maxLon AND
//   bbox.ymin >= minLat AND bbox.ymax <= maxLat

/**
 * Build SQL that writes Overture data to a CSV file.
 * We avoid ATTACH to SQLite because DuckDB's scanner fails on SQLite's
 * strftime() column defaults. Instead: DuckDB → CSV → better-sqlite3 INSERT.
 */
function buildExtractSQL(stateCode, csvPath) {
  const s3_glob  = `${OVERTURE_S3}/*.zstd.parquet`;
  const bbox     = STATE_BBOX[stateCode];
  if (!bbox) throw new Error(`No bounding box for state: ${stateCode}`);
  const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number);
  const today    = new Date().toISOString().slice(0, 10);
  const csvEsc   = csvPath.replace(/'/g, "''");

  return `
INSTALL spatial; LOAD spatial;
INSTALL httpfs;  LOAD httpfs;
SET s3_region='us-west-2';

COPY (
  SELECT
    CONCAT_WS(' ', number, street)
      || CASE WHEN unit IS NOT NULL AND TRIM(unit) != '' THEN ' ' || unit ELSE '' END
      || ', '
      || COALESCE(postal_city,
           CASE WHEN len(address_levels) > 0 THEN address_levels[len(address_levels)].value ELSE NULL END,
           '')
      || ', ${stateCode} ' || COALESCE(postcode, '')   AS full_address,
    number                                               AS add_number,
    street                                               AS st_name,
    NULLIF(TRIM(COALESCE(unit,'')), '')                 AS unit,
    COALESCE(postal_city,
      CASE WHEN len(address_levels) > 0 THEN address_levels[len(address_levels)].value ELSE NULL END,
      '')                                                AS post_city,
    '${stateCode}'                                       AS state,
    COALESCE(postcode, '')                               AS zip_code,
    ROUND(ST_Y(geometry), 7)                             AS latitude,
    ROUND(ST_X(geometry), 7)                             AS longitude,
    id                                                   AS nad_uuid,
    '${today}'                                           AS date_update
  FROM read_parquet('${s3_glob}')
  WHERE  country = 'US'
    AND  bbox.xmin >= ${minLon} AND bbox.xmax <= ${maxLon}
    AND  bbox.ymin >= ${minLat} AND bbox.ymax <= ${maxLat}
) TO '${csvEsc}' (FORMAT CSV, HEADER TRUE, DELIMITER '\t');

SELECT 'Extracted rows for ${stateCode} to CSV' AS status;
`;
}

function buildCountSQL(stateCode) {
  const s3_glob = `${OVERTURE_S3}/*.zstd.parquet`;
  const bbox    = STATE_BBOX[stateCode];
  const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number);
  return `
INSTALL httpfs; LOAD httpfs;
SET s3_region='us-west-2';
SELECT COUNT(*) AS count
FROM read_parquet('${s3_glob}')
WHERE country='US'
  AND bbox.xmin >= ${minLon} AND bbox.xmax <= ${maxLon}
  AND bbox.ymin >= ${minLat} AND bbox.ymax <= ${maxLat};
`;
}

// ── Main ───────────────────────────────────────────────────────────
const argv    = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const STATE   = argv.find(a => a.startsWith('--state='))?.split('=')[1]
             ?? (argv.indexOf('--state') >= 0 ? argv[argv.indexOf('--state')+1] : null);

const targets = STATE ? [STATE.toUpperCase()] : GAP_STATES;

log(`Overture Maps → NAD importer`);
log(`Targets: ${targets.join(', ')}`);
log(`Mode: ${DRY_RUN ? 'DRY RUN (count only)' : 'LIVE IMPORT'}`);

// Check for DuckDB
const duckdbMode = checkDuckDB();
if (!duckdbMode) {
  console.error(`
ERROR: DuckDB is required to read Overture Maps Parquet files.

Install DuckDB CLI:
  Mac:   brew install duckdb
  Linux: curl -L https://github.com/duckdb/duckdb/releases/latest/download/duckdb_cli-linux-amd64.zip -o duckdb.zip && unzip duckdb.zip

Or install the Node.js binding:
  npm install duckdb

Then re-run this script.
`);
  process.exit(1);
}

log(`DuckDB found (${duckdbMode} mode)`);
log(`Overture source: ${OVERTURE_S3}`);
log(`NAD target: ${NAD_DB}`);

if (!fs.existsSync(NAD_DB)) {
  console.error(`NAD database not found at ${NAD_DB}`);
  console.error(`Run: node nad/download.js  (to import the NAD dataset first)`);
  process.exit(1);
}

ensureDir(TMP_DIR);

(async () => {
  for (const state of targets) {
    if (!STATE_BBOX[state]) {
      warn(`No bounding box for ${state} — skipping`);
      continue;
    }

    try {
      if (DRY_RUN) {
        log(`Counting Overture addresses for ${state}…`);
        const sql = buildCountSQL(state);
        // Pass SQL via stdin to duckdb :memory:
        const result = spawnSync('duckdb', [':memory:'], {
          input: sql,
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
        });
        if (result.status !== 0) {
          warn(`Count failed for ${state}: ${result.stderr?.slice(0, 200)}`);
        } else {
          const match = result.stdout.match(/\d[\d,]+/g)?.find(m => m.replace(/,/g,'').length > 2);
          log(`${state}: ~${match || '?'} addresses available in Overture Maps`);
        }
      } else {
        // Two-phase import:
        // Phase 1: DuckDB streams S3 parquet → local TSV
        // Phase 2: Node.js/better-sqlite3 streams TSV → nad.db (no strftime conflict)
        const csvPath = path.join(TMP_DIR, `${state}.tsv`);
        log(`Phase 1: Extracting ${state} from S3 to ${csvPath}…`);
        const extractSQL = buildExtractSQL(state, csvPath);
        const extract = spawnSync('duckdb', [':memory:'], {
          input: extractSQL,
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024,
          timeout: 60 * 60 * 1000,
        });
        if (extract.status !== 0) {
          warn(`Phase 1 failed for ${state}: ${extract.stderr?.slice(0, 400)}`);
          continue;
        }
        log(`Phase 1 complete. Phase 2: Inserting into nad.db…`);

        // Phase 2: stream TSV into SQLite via better-sqlite3
        const readline = require('readline');
        const db = new Database(NAD_DB);
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('busy_timeout = 60000'); // wait up to 60s if DB is locked

        const stmt = db.prepare(`
          INSERT OR IGNORE INTO addresses
            (full_address, add_number, st_name, unit,
             post_city, inc_muni, state, zip_code,
             latitude, longitude,
             addr_type, placement,
             nad_source, nad_uuid,
             date_update, date_imported)
          VALUES (?,?,?,?, ?,?,?,?, ?,?, ?,?, ?,?, ?,?)
        `);
        const insertMany = db.transaction(rows => {
          for (const r of rows) stmt.run(r);
        });

        const BATCH = 10_000;
        let batch = [];
        let total = 0;
        let headers = null;

        const rl = readline.createInterface({
          input: fs.createReadStream(csvPath, 'utf8'),
          crlfDelay: Infinity,
        });

        await new Promise((resolve, reject) => {
          rl.on('line', line => {
            if (!headers) { headers = line.split('\t'); return; }
            const cols = line.split('\t');
            const row = [
              cols[0] || null,   // full_address
              cols[1] || null,   // add_number
              cols[2] || null,   // st_name
              cols[3] || null,   // unit
              cols[4] || null,   // post_city
              cols[4] || null,   // inc_muni (same as post_city)
              cols[5] || null,   // state
              cols[6] || null,   // zip_code
              parseFloat(cols[7]) || null, // latitude
              parseFloat(cols[8]) || null, // longitude
              'Point',           // addr_type
              'Structure',       // placement
              'Overture Maps',   // nad_source
              cols[9] || null,   // nad_uuid
              cols[10] || null,  // date_update
              new Date().toISOString(), // date_imported (bypass default)
            ];
            batch.push(row);
            if (batch.length >= BATCH) {
              insertMany(batch);
              total += batch.length;
              batch = [];
              if (total % 500_000 === 0) log(`  ${state}: ${total.toLocaleString()} inserted…`);
            }
          });
          rl.on('close', () => {
            if (batch.length) { insertMany(batch); total += batch.length; }
            resolve();
          });
          rl.on('error', reject);
        });

        db.close();
        fs.unlinkSync(csvPath);
        log(`${state}: inserted ${total.toLocaleString()} addresses`);
      }
    } catch (e) {
      warn(`Failed for ${state}: ${e.message}`);
    }
  }

  log('Done.');
  if (DRY_RUN) {
    log('Re-run without --dry-run to import into nad.db');
  }
})();
