#!/usr/bin/env node
/**
 * NOAA Storm Events → risk.db Importer
 * =====================================
 * Downloads NOAA Storm Events Database CSV files and aggregates event counts
 * by county FIPS into risk.db for the /v1/risk disaster dimension.
 *
 * Source: NOAA National Centers for Environmental Information (NCEI)
 *   https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/
 *   Free, no API key required. Files are gzipped CSV.
 *
 * Aggregates 10 years of events (current year - 10) by county:
 *   - Total events
 *   - Tornado count
 *   - Hurricane / Tropical Storm count
 *   - Hail count
 *   - Flash flood / Flood count
 *
 * Usage (run on Render staging shell):
 *   node storm-import.js --db=/data/risk.db
 *   node storm-import.js --db=/data/risk.db --years=5     # last 5 years only
 *   node storm-import.js --db=/data/risk.db --year=2023   # single year test
 *
 * STAGING-FIRST: Always run on staging Render shell, not locally.
 */

'use strict';

const https    = require('https');
const http     = require('http');
const zlib     = require('zlib');
const readline = require('readline');
const fs       = require('fs');
const path     = require('path');
const Database = require('better-sqlite3');

const argv   = process.argv.slice(2);
const dbArg  = argv.find(a => a.startsWith('--db='))?.split('=')[1] ?? path.join(__dirname, 'data', 'risk.db');
const YEARS  = parseInt(argv.find(a => a.startsWith('--years='))?.split('=')[1] ?? '10');
const SINGLE = argv.find(a => a.startsWith('--year='))?.split('=')[1] ?? null;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_RANGE   = SINGLE
  ? [parseInt(SINGLE)]
  : Array.from({ length: YEARS }, (_, i) => CURRENT_YEAR - YEARS + i + 1);

// Event types that contribute to each risk category
const TORNADO_TYPES    = new Set(['Tornado', 'Funnel Cloud', 'Waterspout']);
const HURRICANE_TYPES  = new Set(['Hurricane', 'Hurricane (Typhoon)', 'Tropical Storm', 'Tropical Depression']);
const HAIL_TYPES       = new Set(['Hail', 'Marine Hail']);
const FLOOD_TYPES      = new Set(['Flash Flood', 'Flood', 'Coastal Flood', 'Storm Surge/Tide', 'Lakeshore Flood']);

function streamGzipCsv(url, onRow) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'GeoClear/1.0 storm-importer' }, timeout: 120000 }, res => {
      if (res.statusCode === 404) { res.resume(); return resolve(0); }
      if (res.statusCode >= 400) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}: ${url}`)); }

      const gunzip = zlib.createGunzip();
      const rl = readline.createInterface({ input: res.pipe(gunzip), crlfDelay: Infinity });

      let header = null;
      let count  = 0;
      rl.on('line', line => {
        if (!header) { header = line.split(',').map(h => h.replace(/"/g, '').trim()); return; }
        const cols = line.split(',').map(c => c.replace(/"/g, '').trim());
        const row  = Object.fromEntries(header.map((h, i) => [h, cols[i] ?? '']));
        onRow(row);
        count++;
      });
      rl.on('close', () => resolve(count));
      rl.on('error', reject);
      gunzip.on('error', reject);
    }).on('error', reject);
  });
}

async function initDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS storm_risk (
      county_fips    TEXT NOT NULL PRIMARY KEY,
      state          TEXT NOT NULL,
      county_name    TEXT,
      event_count    INTEGER NOT NULL DEFAULT 0,
      tornado_count  INTEGER NOT NULL DEFAULT 0,
      hurricane_count INTEGER NOT NULL DEFAULT 0,
      hail_count     INTEGER NOT NULL DEFAULT 0,
      flood_count    INTEGER NOT NULL DEFAULT 0,
      years_covered  INTEGER NOT NULL DEFAULT 0,
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_storm_state ON storm_risk(state);
  `);
  return db;
}

async function main() {
  console.log(`[storm-import] Years: ${YEAR_RANGE.join(', ')}. DB: ${dbArg}`);
  const db = await initDb(dbArg);

  // Accumulate in memory, then bulk upsert
  const counts = new Map(); // fips → { state, county_name, event, tornado, hurricane, hail, flood }

  for (const year of YEAR_RANGE) {
    // NOAA file naming convention: StormEvents_details-ftp_v1.0_dYYYY*.csv.gz
    // Index page lists the actual filenames — we try the most common pattern
    const url = `https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d${year}_c${year + 1}*.csv.gz`;

    // List the directory to find the right filename
    const indexUrl = `https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/`;
    console.log(`[storm-import] Processing year ${year}…`);

    // Fetch directory index as text to find the actual filename
    let filename = null;
    try {
      await new Promise((resolve, reject) => {
        https.get(indexUrl, { headers: { 'User-Agent': 'GeoClear/1.0' } }, res => {
          const chunks = [];
          res.on('data', d => chunks.push(d));
          res.on('end', () => {
            const html  = Buffer.concat(chunks).toString();
            const match = html.match(new RegExp(`StormEvents_details-ftp_v1\\.0_d${year}_c\\d+\\.csv\\.gz`));
            if (match) filename = match[0];
            resolve();
          });
        }).on('error', reject);
      });
    } catch (e) {
      console.warn(`[storm-import] Could not list index for ${year}: ${e.message}`);
      continue;
    }

    if (!filename) { console.warn(`[storm-import] No file found for ${year} — skipping.`); continue; }

    const fileUrl = `${indexUrl}${filename}`;
    console.log(`[storm-import] Downloading ${filename}…`);

    let rowCount = 0;
    try {
      rowCount = await streamGzipCsv(fileUrl, row => {
        // NOAA CSV columns: BEGIN_YEARMONTH, STATE_FIPS, CZ_FIPS, CZ_TYPE, EVENT_TYPE, ...
        const czType = (row.CZ_TYPE || '').toUpperCase();
        if (czType !== 'C') return; // Only county-level events (not zone-level)

        const stateFips  = (row.STATE_FIPS || '').padStart(2, '0');
        const countyFips3 = (row.CZ_FIPS    || '').padStart(3, '0');
        const fips       = stateFips + countyFips3;
        if (fips.length !== 5 || fips === '00000') return;

        if (!counts.has(fips)) {
          counts.set(fips, {
            state: row.STATE || '',
            county_name: row.CZ_NAME || '',
            event: 0, tornado: 0, hurricane: 0, hail: 0, flood: 0,
          });
        }
        const c = counts.get(fips);
        c.event++;
        const et = row.EVENT_TYPE || '';
        if (TORNADO_TYPES.has(et))   c.tornado++;
        if (HURRICANE_TYPES.has(et)) c.hurricane++;
        if (HAIL_TYPES.has(et))      c.hail++;
        if (FLOOD_TYPES.has(et))     c.flood++;
      });
    } catch (e) {
      console.warn(`[storm-import] Error processing ${year}: ${e.message}`);
      continue;
    }
    console.log(`[storm-import] Year ${year}: ${rowCount.toLocaleString()} event rows processed.`);
  }

  console.log(`[storm-import] Upserting ${counts.size} counties…`);
  const upsert = db.prepare(`
    INSERT INTO storm_risk (county_fips, state, county_name, event_count, tornado_count, hurricane_count, hail_count, flood_count, years_covered)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(county_fips) DO UPDATE SET
      event_count     = event_count + excluded.event_count,
      tornado_count   = tornado_count + excluded.tornado_count,
      hurricane_count = hurricane_count + excluded.hurricane_count,
      hail_count      = hail_count + excluded.hail_count,
      flood_count     = flood_count + excluded.flood_count,
      years_covered   = excluded.years_covered,
      updated_at      = datetime('now')
  `);

  db.transaction(() => {
    for (const [fips, c] of counts) {
      upsert.run(fips, c.state, c.county_name, c.event, c.tornado, c.hurricane, c.hail, c.flood, YEAR_RANGE.length);
    }
  })();

  const count = db.prepare('SELECT COUNT(*) AS n FROM storm_risk').get().n;
  console.log(`[storm-import] Done. Counties in DB: ${count}`);
  db.close();
}

main().catch(e => { console.error('[storm-import] Fatal:', e.message); process.exit(1); });
