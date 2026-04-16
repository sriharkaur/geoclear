#!/usr/bin/env node
/**
 * OpenAddresses → NAD Importer
 * ============================
 * Downloads US address data from OpenAddresses (openaddresses.io, ODbL license)
 * and imports it into the NAD SQLite database via INSERT OR IGNORE dedup on nad_uuid.
 *
 * OpenAddresses publishes gzipped CSV files per state and as a US countrywide roll-up.
 * Index API: https://batch.openaddresses.io/api/collections
 *
 * CSV columns (after header row):
 *   LON, LAT, NUMBER, STREET, UNIT, CITY, DISTRICT, REGION, POSTCODE, ID, HASH
 *
 * Dedup key: nad_uuid = 'OA:' + HASH
 *
 * Usage:
 *   # Single state, test run
 *   node openaddresses-import.js --db=/data/nad.db --state=TX --limit=1000
 *
 *   # Full state import
 *   node openaddresses-import.js --db=/data/nad.db --state=TX
 *
 *   # All US states (countrywide collection)
 *   node openaddresses-import.js --db=/data/nad.db
 *
 *   # List available state URLs and exit
 *   node openaddresses-import.js --list
 */

'use strict';

const https    = require('https');
const http     = require('http');
const zlib     = require('zlib');
const readline = require('readline');
const fs       = require('fs');
const path     = require('path');
const Database = require('better-sqlite3');

// ── CLI args ───────────────────────────────────────────────────────────────────
const argv   = process.argv.slice(2);

const dbArg  = argv.find(a => a.startsWith('--db='))?.split('=')[1]
            ?? (argv.indexOf('--db') >= 0 ? argv[argv.indexOf('--db') + 1] : null);
const NAD_DB = dbArg ?? path.join(__dirname, 'data', 'nad.db');

const stateArg = argv.find(a => a.startsWith('--state='))?.split('=')[1]
              ?? (argv.indexOf('--state') >= 0 ? argv[argv.indexOf('--state') + 1] : null);
const STATE  = stateArg ? stateArg.toUpperCase() : null;

const limitArg = argv.find(a => a.startsWith('--limit='))?.split('=')[1]
              ?? (argv.indexOf('--limit') >= 0 ? argv[argv.indexOf('--limit') + 1] : null);
const LIMIT  = limitArg ? parseInt(limitArg, 10) : null;

const LIST_ONLY = argv.includes('--list');

// ── Constants ──────────────────────────────────────────────────────────────────
const OA_COLLECTIONS_API = 'https://batch.openaddresses.io/api/collections';
const BATCH_SIZE         = 10_000;
const PROGRESS_EVERY     = 100_000;
const SOURCE_NAME        = 'OpenAddresses';

// ── Helpers ────────────────────────────────────────────────────────────────────
const log  = (...a) => console.log(`[openaddresses-import]`, ...a);
const warn = (...a) => console.warn(`[openaddresses-import WARN]`, ...a);

/**
 * Fetch a URL and return the response body as a string.
 * Follows HTTP redirects.
 */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'geoclear-importer/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end',  () => resolve(body));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Stream a gzip URL line-by-line.
 * Calls onLine(line) for each CSV line (including header).
 * Follows HTTP redirects.
 * Returns a promise that resolves when the stream ends.
 */
function streamGzipLines(url, onLine) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'geoclear-importer/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return streamGzipLines(res.headers.location, onLine).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      const gunzip = zlib.createGunzip();
      const rl = readline.createInterface({ input: gunzip, crlfDelay: Infinity });

      res.pipe(gunzip);

      rl.on('line',  line => onLine(line));
      rl.on('close', resolve);
      rl.on('error', reject);
      gunzip.on('error', reject);
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Parse the OpenAddresses collections API response.
 * Returns an array of { name, state, url } objects for US data.
 *
 * Collection names follow the pattern:
 *   "us"              → countrywide
 *   "us/tx"           → Texas
 *   "us/ca"           → California
 *   etc.
 *
 * Each collection has a `downloads` array; we want the item with
 * type === 'gzip' or a .csv.gz URL.
 */
function parseCollections(json) {
  const collections = [];

  for (const col of json) {
    const name = (col.name || col.id || '').toLowerCase();
    if (!name.startsWith('us')) continue;

    // Determine state code from name:  "us/tx" → "TX",  "us" → "US" (countrywide)
    const parts = name.split('/');
    let stateCode;
    if (parts.length === 1 && parts[0] === 'us') {
      stateCode = 'US';  // countrywide
    } else if (parts.length === 2) {
      stateCode = parts[1].toUpperCase();
    } else {
      // Deeper paths (county-level) — skip for now
      continue;
    }

    // Find the download URL — prefer .csv.gz, fall back to any gzip link
    let dlUrl = null;

    if (Array.isArray(col.downloads)) {
      const gzipEntry = col.downloads.find(d =>
        d.url && (d.url.endsWith('.csv.gz') || d.type === 'gzip' || d.type === 'csv')
      );
      if (gzipEntry) dlUrl = gzipEntry.url;
    }

    // Fallback: some collections expose a top-level `url` field
    if (!dlUrl && col.url && (col.url.endsWith('.csv.gz') || col.url.endsWith('.gz'))) {
      dlUrl = col.url;
    }

    if (!dlUrl) continue;

    collections.push({ name, stateCode, url: dlUrl });
  }

  return collections;
}

/**
 * Parse a single CSV line using the OpenAddresses column order.
 * Returns null if the line is invalid or missing required fields.
 *
 * OA columns: LON, LAT, NUMBER, STREET, UNIT, CITY, DISTRICT, REGION, POSTCODE, ID, HASH
 * Index:       0    1    2       3       4     5     6         7       8         9   10
 */
function parseLine(line, colIndex) {
  // Simple CSV split — OA files are plain comma-separated, values rarely quoted
  // Handle quoted fields (minimal RFC 4180 compliance)
  const cols = splitCSV(line);

  if (!colIndex) return null;  // header not yet parsed

  const get = name => {
    const i = colIndex[name];
    return i !== undefined ? (cols[i] || '').trim() : '';
  };

  const lon    = get('LON');
  const lat    = get('LAT');
  const number = get('NUMBER');
  const street = get('STREET');
  const unit   = get('UNIT');
  const city   = get('CITY');
  const region = get('REGION');
  const post   = get('POSTCODE');
  const hash   = get('HASH');

  // Skip rows missing lat/lon or street
  if (!lat || !lon || !street) return null;

  const latF = parseFloat(lat);
  const lonF = parseFloat(lon);
  if (isNaN(latF) || isNaN(lonF)) return null;

  // Build full_address
  const unitPart = unit ? ` #${unit}` : '';
  const parts = [number, street + unitPart, city, region, post].filter(Boolean);
  const fullAddress = parts.join(' ').trim();

  // Dedup key: 'OA:' + HASH; fall back to a composite key if HASH is absent
  const nadUuid = hash
    ? `OA:${hash}`
    : `OA:${[number, street, city, region, post, lat, lon].join('|')}`;

  const today = new Date().toISOString();

  return [
    nadUuid,                        // nad_uuid
    number   || null,               // add_number
    street   || null,               // st_name
    unit     || null,               // unit
    city     || null,               // post_city
    city     || null,               // inc_muni (best approximation available)
    region   || null,               // state
    post     || null,               // zip_code
    latF,                           // latitude
    lonF,                           // longitude
    'Point',                        // addr_type
    'Centroid',                     // placement
    SOURCE_NAME,                    // nad_source
    fullAddress || null,            // full_address
    today.slice(0, 10),             // date_update
    today,                          // date_imported
  ];
}

/**
 * Minimal CSV field splitter — handles double-quoted fields with embedded commas.
 */
function splitCSV(line) {
  const result = [];
  let cur = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }  // escaped quote
        else inQuote = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"')  { inQuote = true; }
      else if (ch === ',') { result.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  result.push(cur);
  return result;
}

/**
 * Build a column index map from the header line.
 * Returns { LON: 0, LAT: 1, NUMBER: 2, ... } etc.
 */
function buildColIndex(headerLine) {
  const cols = splitCSV(headerLine);
  const index = {};
  cols.forEach((name, i) => { index[name.trim().toUpperCase()] = i; });
  return index;
}

// ── DB setup ───────────────────────────────────────────────────────────────────

function openDB(dbPath) {
  if (!fs.existsSync(dbPath)) {
    if (dbArg) {
      // Auto-create schema for custom DB path
      log(`Creating new DB at ${dbPath}…`);
      const { execFileSync } = require('child_process');
      execFileSync(process.execPath, [path.join(__dirname, 'init-db.js'), '--db', dbPath]);
    } else {
      console.error(`NAD database not found at ${dbPath}`);
      console.error(`Run: node init-db.js  (to create an empty DB first)`);
      process.exit(1);
    }
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 60000');
  db.pragma('cache_size = -65536');  // 64 MB page cache
  return db;
}

function buildInsertStmt(db) {
  return db.prepare(`
    INSERT OR IGNORE INTO addresses
      (nad_uuid, add_number, st_name, unit,
       post_city, inc_muni, state, zip_code,
       latitude, longitude,
       addr_type, placement,
       nad_source, full_address,
       date_update, date_imported)
    VALUES (?,?,?,?, ?,?,?,?, ?,?, ?,?, ?,?, ?,?)
  `);
}

// ── Import one collection ──────────────────────────────────────────────────────

async function importCollection(col, db, stmt) {
  const insertMany = db.transaction(rows => {
    let n = 0;
    for (const r of rows) n += stmt.run(...r).changes;
    return n;
  });

  const startTime = Date.now();
  let processed = 0;
  let inserted  = 0;
  let skipped   = 0;
  let batch     = [];
  let colIndex  = null;
  let headerSeen = false;
  let done = false;

  log(`Starting ${col.stateCode} → ${col.url}`);

  try {
    await streamGzipLines(col.url, line => {
      if (done) return;
      if (!line.trim()) return;

      if (!headerSeen) {
        colIndex   = buildColIndex(line);
        headerSeen = true;
        return;
      }

      // Enforce --limit per file
      if (LIMIT !== null && processed >= LIMIT) {
        done = true;
        return;
      }

      const row = parseLine(line, colIndex);
      if (!row) { skipped++; return; }

      // Filter to requested state if --state given and this is a countrywide file
      if (STATE && col.stateCode === 'US') {
        const rowState = row[6];  // state column
        if (!rowState || rowState.toUpperCase() !== STATE) { skipped++; return; }
      }

      batch.push(row);
      processed++;

      if (batch.length >= BATCH_SIZE) {
        inserted += insertMany(batch);
        batch = [];
        if (processed % PROGRESS_EVERY === 0) {
          log(`${processed.toLocaleString()} rows processed, ${inserted.toLocaleString()} inserted, ${(processed - inserted).toLocaleString()} skipped`);
        }
      }
    });
  } catch (e) {
    warn(`Stream error for ${col.stateCode}: ${e.message}`);
    // Flush any partial batch before returning
    if (batch.length) {
      try { inserted += insertMany(batch); } catch {}
      batch = [];
    }
    return { processed, inserted, skipped: processed - inserted, error: e.message };
  }

  // Flush final batch
  if (batch.length) {
    inserted += insertMany(batch);
    batch = [];
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`${col.stateCode}: ${processed.toLocaleString()} processed, ${inserted.toLocaleString()} inserted, ${(processed - inserted).toLocaleString()} skipped — ${elapsed}s`);

  return { processed, inserted, skipped: processed - inserted, elapsed: parseFloat(elapsed) };
}

// ── Log import result to nad_import_log ───────────────────────────────────────

function logImport(db, col, result, url) {
  try {
    db.prepare(`
      INSERT INTO nad_import_log
        (source_url, file_name, rows_processed, rows_inserted, rows_skipped, duration_secs, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      url,
      col.name,
      result.processed  ?? 0,
      result.inserted   ?? 0,
      result.skipped    ?? 0,
      result.elapsed    ?? null,
      result.error ? 'error' : 'ok',
      result.error ?? null,
    );
  } catch (e) {
    warn(`Could not write to nad_import_log: ${e.message}`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

(async () => {
  log(`OpenAddresses → NAD importer`);
  log(`Fetching collection index from ${OA_COLLECTIONS_API}…`);

  let collections;
  try {
    const body = await fetchText(OA_COLLECTIONS_API);
    const json = JSON.parse(body);
    collections = parseCollections(Array.isArray(json) ? json : (json.collections ?? json.data ?? []));
  } catch (e) {
    console.error(`[openaddresses-import] ERROR: Failed to fetch collection index: ${e.message}`);
    console.error(`Check https://batch.openaddresses.io/api/collections — the API may have changed.`);
    process.exit(1);
  }

  if (collections.length === 0) {
    console.error(`[openaddresses-import] ERROR: No US collections found in the index response.`);
    process.exit(1);
  }

  // --list: print available collections and exit
  if (LIST_ONLY) {
    log(`Available US collections (${collections.length}):`);
    for (const col of collections) {
      console.log(`  ${col.stateCode.padEnd(4)} ${col.name.padEnd(20)} ${col.url}`);
    }
    process.exit(0);
  }

  // Determine which collections to process
  let targets;
  if (STATE) {
    // --state=TX: prefer a state-level collection; fall back to countrywide
    targets = collections.filter(c => c.stateCode === STATE);
    if (targets.length === 0) {
      const cw = collections.find(c => c.stateCode === 'US');
      if (cw) {
        log(`No dedicated collection for ${STATE} — will filter countrywide collection.`);
        targets = [cw];
      } else {
        console.error(`[openaddresses-import] ERROR: No collection found for state ${STATE}.`);
        process.exit(1);
      }
    }
  } else {
    // No --state: import all state-level collections; skip countrywide (redundant)
    targets = collections.filter(c => c.stateCode !== 'US');
    if (targets.length === 0) {
      // Only countrywide available
      targets = collections;
    }
  }

  log(`Targets: ${targets.map(c => c.stateCode).join(', ')}`);
  if (LIMIT) log(`Limit: ${LIMIT.toLocaleString()} rows per file`);
  log(`NAD target: ${NAD_DB}`);

  const db   = openDB(NAD_DB);
  const stmt = buildInsertStmt(db);

  let totalProcessed = 0;
  let totalInserted  = 0;
  let totalSkipped   = 0;
  const overallStart = Date.now();

  for (const col of targets) {
    const result = await importCollection(col, db, stmt);
    logImport(db, col, result, col.url);
    totalProcessed += result.processed ?? 0;
    totalInserted  += result.inserted  ?? 0;
    totalSkipped   += result.skipped   ?? 0;
  }

  db.pragma('synchronous = FULL');
  db.close();

  const totalElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);
  log(`Done. Total: ${totalProcessed.toLocaleString()} processed, ${totalInserted.toLocaleString()} inserted, ${totalSkipped.toLocaleString()} skipped — ${totalElapsed}s`);
})();
