#!/usr/bin/env node
/**
 * USFS Wildfire Hazard Potential → risk.db Importer
 * ==================================================
 * Downloads county-level WHP (Wildfire Hazard Potential) data from the
 * USFS / Esri "USA Wildfire Hazard Potential with Demographics" feature service
 * and stores it in risk.db for use by the /v1/risk disaster dimension.
 *
 * Source: USFS / Esri Living Atlas
 *   Layer: County (layer 2) — ID = 5-digit county FIPS, MEAN/MAJORITY = WHP 1–5
 *   URL: https://services.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/
 *        USA_Wildfire_Hazard_Potential/FeatureServer/2
 *   Free, public, no API key required.
 *
 * WHP score scale (MAJORITY field):
 *   1 = Very Low, 2 = Low, 3 = Moderate, 4 = High, 5 = Very High
 *
 * Usage:
 *   node wildfire-import.js --db=/tmp/risk.db           # local
 *   node wildfire-import.js --db=/tmp/risk.db --limit=50  # test
 * Then upload: POST /v1/admin/stream-upload with X-Upload-Filename: risk.db
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

const BASE_URL = 'https://services.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/USA_Wildfire_Hazard_Potential/FeatureServer/2/query';
const WHP_LABELS = { 1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High' };

function httpGet(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'GeoClear/1.0 wildfire-importer' }, timeout: timeoutMs }, res => {
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

async function fetchBatch(offset = 0, batchSize = 1000) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'ID,NAME,ST_ABBREV,MEAN,MAJORITY,MEDIAN',
    returnGeometry: 'false',
    resultOffset: offset.toString(),
    resultRecordCount: batchSize.toString(),
    f: 'json',
  });
  return httpGet(`${BASE_URL}?${params}`, 30000);
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

async function main() {
  console.log(`[wildfire-import] DB: ${dbArg}${LIMIT ? ` (limit ${LIMIT})` : ''}`);
  const db = await initDb(dbArg);
  const upsert = db.prepare(`
    INSERT INTO wildfire_risk (county_fips, state, county_name, whp_score, whp_class)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(county_fips) DO UPDATE SET
      whp_score  = excluded.whp_score,
      whp_class  = excluded.whp_class,
      updated_at = datetime('now')
  `);

  let offset = 0;
  let total  = 0;
  const batchSize = 1000;

  while (true) {
    console.log(`[wildfire-import] Fetching offset ${offset}…`);
    let data;
    try {
      data = await fetchBatch(offset, batchSize);
    } catch (e) {
      console.error(`[wildfire-import] Fetch error: ${e.message}`);
      break;
    }

    const features = data?.features ?? [];
    if (!features.length) { console.log('[wildfire-import] No more records.'); break; }

    db.transaction(() => {
      for (const f of features) {
        const a = f.attributes;
        const fips  = (a.ID || '').toString().padStart(5, '0');
        if (fips.length !== 5 || fips === '00000') continue;
        const majority = a.MAJORITY || 0;
        const mean     = a.MEAN ?? null;
        // Use MAJORITY for class; fall back to round(MEAN) if MAJORITY=0
        const classNum = majority > 0 ? majority : (mean ? Math.round(mean) : 0);
        const label    = classNum > 0 ? (WHP_LABELS[classNum] || null) : null;
        upsert.run(fips, a.ST_ABBREV || '', a.NAME || null, mean, label);
        total++;
      }
    })();

    console.log(`[wildfire-import] ${total} counties inserted.`);
    if (LIMIT && total >= LIMIT) { console.log(`[wildfire-import] Hit limit ${LIMIT}.`); break; }
    if (!data.exceededTransferLimit) break;
    offset += batchSize;
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM wildfire_risk').get().n;
  console.log(`[wildfire-import] Done. Counties in DB: ${count}`);
  db.close();
}

main().catch(e => { console.error('[wildfire-import] Fatal:', e.message); process.exit(1); });
