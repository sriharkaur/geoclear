#!/usr/bin/env node
/**
 * USFS Wildfire Hazard Potential → risk.db Importer
 * ==================================================
 * Downloads USFS Wildfire Hazard Potential (WHP) data by county FIPS and imports
 * into risk.db for use by the /v1/risk endpoint.
 *
 * Source: USFS Rocky Mountain Research Station
 *   https://www.fs.usda.gov/rds/archive/catalog/RDS-2020-0016-3
 *   County-level WHP summary CSV — free, no key required.
 *
 * Fallback source (simpler, always available):
 *   USDA FORSYS WHP by county via ArcGIS REST API:
 *   https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_WildlandUrbanInterface_01/MapServer/0/query
 *
 * WHP Classes:
 *   Very Low (1), Low (2), Moderate (3), High (4), Very High (5)
 *
 * Usage (run on Render staging shell):
 *   node wildfire-import.js --db=/data/risk.db
 *   node wildfire-import.js --db=/data/risk.db --limit=100   # test run
 *
 * STAGING-FIRST: Always run on staging Render shell, not locally.
 * After import: verify counts, then upload risk.db to prod via upload-chunk.
 */

'use strict';

const https    = require('https');
const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const Database = require('better-sqlite3');

const argv  = process.argv.slice(2);
const dbArg = argv.find(a => a.startsWith('--db='))?.split('=')[1] ?? path.join(__dirname, 'data', 'risk.db');
const LIMIT = parseInt(argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0');

// WHP class mapping: score → label
const WHP_CLASSES = { 1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High' };

function httpGet(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'GeoClear/1.0 risk-importer' }, timeout: timeoutMs }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(httpGet(res.headers.location, timeoutMs));
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(new Error(`Invalid JSON from ${url}: ${e.message}`)); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
    req.on('error', reject);
  });
}

async function initDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS wildfire_risk (
      county_fips TEXT NOT NULL PRIMARY KEY,
      state       TEXT NOT NULL,
      county_name TEXT,
      whp_score   REAL,
      whp_class   TEXT,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_wf_state ON wildfire_risk(state);
  `);
  return db;
}

async function fetchCountyWHP(offset = 0, batchSize = 1000) {
  // ArcGIS REST: USFS WUI / WHP by county (public, no key)
  const url = `https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_WildlandUrbanInterface_01/MapServer/0/query` +
    `?where=1%3D1&outFields=COUNTYFIPS,STATEABBR,COUNTYNAME,WHP_CLASS&returnGeometry=false` +
    `&resultOffset=${offset}&resultRecordCount=${batchSize}&f=json`;
  return httpGet(url, 30000);
}

async function main() {
  console.log(`[wildfire-import] Starting. DB: ${dbArg}${LIMIT ? ` (limit ${LIMIT})` : ''}`);
  const db = await initDb(dbArg);
  const upsert = db.prepare(`
    INSERT INTO wildfire_risk (county_fips, state, county_name, whp_score, whp_class)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(county_fips) DO UPDATE SET
      whp_score = excluded.whp_score,
      whp_class = excluded.whp_class,
      updated_at = datetime('now')
  `);

  let offset = 0;
  let total  = 0;
  const batchSize = 1000;

  while (true) {
    console.log(`[wildfire-import] Fetching offset ${offset}…`);
    let data;
    try {
      data = await fetchCountyWHP(offset, batchSize);
    } catch (e) {
      console.error(`[wildfire-import] Fetch error at offset ${offset}: ${e.message}`);
      break;
    }

    const features = data?.features ?? [];
    if (!features.length) { console.log('[wildfire-import] No more records.'); break; }

    db.transaction(() => {
      for (const f of features) {
        const a = f.attributes;
        const fips  = (a.COUNTYFIPS || '').toString().padStart(5, '0');
        const score = a.WHP_CLASS ? parseInt(a.WHP_CLASS) : null;
        const label = score ? (WHP_CLASSES[score] || null) : null;
        if (fips.length === 5) {
          upsert.run(fips, a.STATEABBR || '', a.COUNTYNAME || null, score, label);
          total++;
        }
      }
    })();

    console.log(`[wildfire-import] Inserted ${total} counties so far.`);
    if (LIMIT && total >= LIMIT) { console.log(`[wildfire-import] Hit limit ${LIMIT}.`); break; }
    if (features.length < batchSize) break;
    offset += batchSize;
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM wildfire_risk').get().n;
  console.log(`[wildfire-import] Done. Total counties in DB: ${count}`);
  db.close();
}

main().catch(e => { console.error('[wildfire-import] Fatal:', e.message); process.exit(1); });
