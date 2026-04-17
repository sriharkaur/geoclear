#!/usr/bin/env node
/**
 * FEMA National Risk Index (NRI) → risk.db importer
 * ==================================================
 * Run on STAGING Render Shell (or locally for testing).
 *
 * Source: FEMA NRI — free public dataset, no API key required.
 *   Bulk CSV: https://hazards.fema.gov/nri/Content/StaticDocuments/DataDownload/
 *             NRI_Table_Counties/NRI_Table_Counties.zip
 *   API docs: https://hazards.fema.gov/nri/api
 *
 * Covers all 3,221 US counties with:
 *   - Composite RISK_SCORE (0–100 national percentile)
 *   - HWAV  Heat Wave risk score
 *   - HRCN  Hurricane risk score
 *   - CFLD  Coastal Flooding risk score
 *   - RFLD  Riverine Flooding risk score (complements FEMA NFHL live lookup)
 *   - WFIR  Wildfire (cross-check vs USFS WHP already in risk.db)
 *   - ERQK  Earthquake (cross-check vs USGS NSHM already in risk.db)
 *
 * Usage:
 *   node nri-import.js                   # fetches all 3221 counties via FEMA API
 *   DATA_DIR=/data node nri-import.js    # prod/staging data dir
 *   node nri-import.js --limit=100       # test run
 *
 * Schema created in risk.db:
 *   nri_risk (county_fips, risk_score, risk_rating, heat_wave_score,
 *             hurricane_score, coastal_flood_score, riverine_flood_score,
 *             wildfire_score, earthquake_score, import_date)
 */

'use strict';

const https    = require('https');
const path     = require('path');
const fs       = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR  = process.env.DATA_DIR || path.join(__dirname, 'data');
const RISK_DB   = path.join(DATA_DIR, 'risk.db');
const args      = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const LIMIT     = args.limit ? parseInt(args.limit) : Infinity;
const BATCH     = 50; // counties per API call (NRI API supports up to 200)

// All 3,221 county FIPS — read from existing risk.db wildfire_risk table (already has all counties)
function getCountyFipsList(db) {
  try {
    return db.prepare('SELECT DISTINCT county_fips FROM wildfire_risk ORDER BY county_fips').all().map(r => r.county_fips);
  } catch (_) {
    // Fallback: generate all FIPS from state list
    const STATE_FIPS = ['01','02','04','05','06','08','09','10','11','12','13','15','16','17','18','19',
      '20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38',
      '39','40','41','42','44','45','46','47','48','49','50','51','53','54','55','56','72','78'];
    // Can't enumerate without a reference — this path means wildfire_risk table is empty
    throw new Error('wildfire_risk table is empty — run wildfire-import.js first');
  }
}

function httpGet(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); reject(new Error('Timeout')); }, timeoutMs);
    const req = https.get(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } }, res => {
      const chunks = [];
      res.on('error', () => {});
      res.on('data', d => chunks.push(d));
      res.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks).toString()); });
    });
    req.on('error', e => { clearTimeout(timer); if (e.name !== 'AbortError') reject(e); });
  });
}

// NRI score → 0-1 normalized (NRI scores are 0–100 national percentile)
function norm(score) {
  if (score == null || score === '' || isNaN(score)) return null;
  return +(Math.min(100, Math.max(0, parseFloat(score))) / 100).toFixed(3);
}

// NRI rating string → 0-1
const RATING_MAP = {
  'Very High': 0.9, 'High': 0.7, 'Relatively High': 0.6,
  'Relatively Moderate': 0.4, 'Moderate': 0.4,
  'Relatively Low': 0.2, 'Low': 0.1, 'Very Low': 0.05,
  'Insufficient Data': null, 'Not Applicable': null,
};

async function fetchNRIBatch(fipsList) {
  // FEMA NRI API: query by county FIPS (5-digit)
  // GET https://hazards.fema.gov/nri/rest/api/county?stateId=XX&countyId=YYY
  // Batch via comma-separated county IDs isn't supported — do individual calls
  // For bulk: use the county endpoint with FIPS split into stateId + countyId
  const results = [];
  for (const fips of fipsList) {
    const stateId  = fips.slice(0, 2);
    const countyId = fips.slice(2);
    try {
      const url = `https://hazards.fema.gov/nri/rest/api/county?stateId=${stateId}&countyId=${countyId}`;
      const body = await httpGet(url, 10000);
      const data = JSON.parse(body);
      // NRI API returns { county: { ... } } or { counties: [...] }
      const county = data.county || (data.counties && data.counties[0]) || data;
      if (!county || !county.STCOFIPS) {
        results.push(null);
        continue;
      }
      results.push({
        county_fips:          county.STCOFIPS,
        risk_score:           norm(county.RISK_SCORE),
        risk_rating:          county.RISK_RATNG || null,
        heat_wave_score:      norm(county.HWAV_RISKS),
        hurricane_score:      norm(county.HRCN_RISKS),
        coastal_flood_score:  norm(county.CFLD_RISKS),
        riverine_flood_score: norm(county.RFLD_RISKS),
        wildfire_score:       norm(county.WFIR_RISKS),
        earthquake_score:     norm(county.ERQK_RISKS),
      });
    } catch (e) {
      console.warn(`  [${fips}] API error: ${e.message}`);
      results.push(null);
    }
    // Respectful rate limit — 10 req/s
    await new Promise(r => setTimeout(r, 100));
  }
  return results.filter(Boolean);
}

function setupSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nri_risk (
      county_fips           TEXT PRIMARY KEY,
      risk_score            REAL,
      risk_rating           TEXT,
      heat_wave_score       REAL,
      hurricane_score       REAL,
      coastal_flood_score   REAL,
      riverine_flood_score  REAL,
      wildfire_score        REAL,
      earthquake_score      REAL,
      import_date           TEXT DEFAULT (date('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_nri_fips ON nri_risk(county_fips);
  `);
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`DATA_DIR ${DATA_DIR} does not exist.`);
    process.exit(1);
  }

  const db = new Database(RISK_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  setupSchema(db);

  const allFips = getCountyFipsList(db);
  const targets = allFips.slice(0, Math.min(allFips.length, LIMIT));
  console.log(`Importing NRI data for ${targets.length} counties…`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO nri_risk
      (county_fips, risk_score, risk_rating, heat_wave_score, hurricane_score,
       coastal_flood_score, riverine_flood_score, wildfire_score, earthquake_score, import_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))
  `);
  const insertMany = db.transaction((rows) => {
    for (const r of rows) {
      insert.run(r.county_fips, r.risk_score, r.risk_rating, r.heat_wave_score,
        r.hurricane_score, r.coastal_flood_score, r.riverine_flood_score,
        r.wildfire_score, r.earthquake_score);
    }
  });

  let total = 0;
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const rows  = await fetchNRIBatch(batch);
    if (rows.length > 0) {
      insertMany(rows);
      total += rows.length;
    }
    if ((i + BATCH) % 500 === 0 || i + BATCH >= targets.length) {
      console.log(`  Progress: ${Math.min(i + BATCH, targets.length)}/${targets.length} counties, ${total} rows inserted`);
    }
  }

  db.close();
  console.log(`\nNRI import complete. ${total} counties in nri_risk table.`);
  console.log('Next: upload risk.db to prod via POST /v1/admin/upload-chunk, then POST /v1/admin/merge');
}

main().catch(e => { console.error(e); process.exit(1); });
