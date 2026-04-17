#!/usr/bin/env node
/**
 * USGS ASCE7-22 Seismic Hazard → risk.db Importer
 * =================================================
 * Fetches seismic design parameters for each US county centroid using the
 * USGS Design Maps API, then stores them in risk.db.
 *
 * Source: USGS Earthquake Hazards Program
 *   https://earthquake.usgs.gov/ws/designmaps/asce7-22.json
 *   Free, public, no API key required.
 *
 * County centroids: US Census Bureau CenPop2020 (population-weighted centroids)
 *   https://www2.census.gov/geo/docs/reference/cenpop2020/county/CenPop2020_Mean_CO.txt
 *
 * Outputs per county:
 *   pgam  — peak ground acceleration (modified), g
 *   sdc   — seismic design category A-F
 *   risk_score — 0-1 normalized (log scale on pgam)
 *   risk_label — Negligible / Low / Moderate / High / Very High / Extreme
 *
 * Usage:
 *   node earthquake-import.js --db=/tmp/risk.db           # local test
 *   node earthquake-import.js --db=/data/risk.db          # staging Render shell
 *   node earthquake-import.js --db=/data/risk.db --concurrency=5
 *   node earthquake-import.js --db=/data/risk.db --limit=50  # sample run
 *
 * STAGING-FIRST: Run on staging Render shell, upload to prod via stream-upload.
 */

'use strict';

const https    = require('https');
const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const Database = require('better-sqlite3');

const argv        = process.argv.slice(2);
const dbArg       = argv.find(a => a.startsWith('--db='))?.split('=')[1]          ?? path.join(__dirname, 'data', 'risk.db');
const CONCURRENCY = parseInt(argv.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? '5');
const LIMIT       = parseInt(argv.find(a => a.startsWith('--limit='))?.split('=')[1]       ?? '0');

const CENSUS_URL  = 'https://www2.census.gov/geo/docs/reference/cenpop2020/county/CenPop2020_Mean_CO.txt';
const USGS_BASE   = 'https://earthquake.usgs.gov/ws/designmaps/asce7-22.json';
const SDC_LABEL   = { A: 'Negligible', B: 'Low', C: 'Moderate', D: 'High', E: 'Very High', F: 'Extreme' };

function httpGetText(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'GeoClear/1.0 earthquake-importer' }, timeout: timeoutMs }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(httpGetText(res.headers.location, timeoutMs));
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
    req.on('error', reject);
  });
}

function httpGetJson(url, timeoutMs = 20000) {
  return httpGetText(url, timeoutMs).then(text => JSON.parse(text));
}

async function fetchCountyCentroids() {
  console.log('[earthquake-import] Fetching Census county centroids…');
  const text = await httpGetText(CENSUS_URL);
  const lines = text.trim().split('\n');
  // Header: STATEFP,COUNTYFP,COUNAME,STNAME,POPULATION,LATITUDE,LONGITUDE
  const header = lines[0].split(',').map(h => h.trim().toUpperCase());
  const idxState  = header.indexOf('STATEFP');
  const idxCounty = header.indexOf('COUNTYFP');
  const idxLat    = header.indexOf('LATITUDE');
  const idxLon    = header.indexOf('LONGITUDE');
  const idxName   = header.indexOf('COUNAME');
  const idxSt     = header.indexOf('STNAME');

  const counties = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(',').map(c => c.trim());
    const stateFp  = cols[idxState]?.padStart(2, '0')  ?? '';
    const countyFp = cols[idxCounty]?.padStart(3, '0') ?? '';
    const fips     = stateFp + countyFp;
    const lat      = parseFloat(cols[idxLat]);
    const lon      = parseFloat(cols[idxLon]);
    if (fips.length !== 5 || isNaN(lat) || isNaN(lon)) continue;
    counties.push({ fips, lat, lon, name: cols[idxName] ?? '', state: cols[idxSt] ?? '' });
  }
  console.log(`[earthquake-import] ${counties.length} county centroids loaded.`);
  return counties;
}

async function fetchSeismic(lat, lon) {
  const url = `${USGS_BASE}?latitude=${lat}&longitude=${lon}&riskCategory=III&siteClass=C&title=geoclear`;
  const body = await httpGetJson(url, 20000);
  const data = body?.response?.data;
  if (!data || data.pgam == null) return null;
  const pgam  = parseFloat(data.pgam);
  const sdc   = (data.sdc || '').toUpperCase();
  const score = Math.min(1, pgam > 0 ? (Math.log(1 + pgam * 10) / Math.log(31)) : 0);
  return {
    pgam:       +pgam.toFixed(4),
    sdc,
    risk_score: +score.toFixed(4),
    risk_label: SDC_LABEL[sdc] || 'Unknown',
  };
}

function initDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS earthquake_risk (
      county_fips TEXT NOT NULL PRIMARY KEY,
      state_name  TEXT,
      county_name TEXT,
      lat         REAL NOT NULL,
      lon         REAL NOT NULL,
      pgam        REAL,
      sdc         TEXT,
      risk_score  REAL,
      risk_label  TEXT,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_eq_sdc ON earthquake_risk(sdc);
  `);
  return db;
}

async function processChunk(counties, upsert, stats) {
  await Promise.all(counties.map(async (c) => {
    try {
      const result = await fetchSeismic(c.lat, c.lon);
      if (result) {
        upsert.run(c.fips, c.state, c.name, c.lat, c.lon,
          result.pgam, result.sdc, result.risk_score, result.risk_label);
        stats.ok++;
      } else {
        stats.null++;
      }
    } catch (e) {
      stats.err++;
      if (stats.err <= 5) console.warn(`[earthquake-import] Error ${c.fips}: ${e.message}`);
    }
  }));
}

async function main() {
  console.log(`[earthquake-import] DB: ${dbArg} | concurrency: ${CONCURRENCY}${LIMIT ? ` | limit: ${LIMIT}` : ''}`);
  let counties = await fetchCountyCentroids();
  if (LIMIT) counties = counties.slice(0, LIMIT);

  const db = initDb(dbArg);
  const upsert = db.prepare(`
    INSERT INTO earthquake_risk (county_fips, state_name, county_name, lat, lon, pgam, sdc, risk_score, risk_label)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(county_fips) DO UPDATE SET
      pgam       = excluded.pgam,
      sdc        = excluded.sdc,
      risk_score = excluded.risk_score,
      risk_label = excluded.risk_label,
      updated_at = datetime('now')
  `);

  const stats = { ok: 0, null: 0, err: 0 };
  const total = counties.length;
  let processed = 0;

  for (let i = 0; i < counties.length; i += CONCURRENCY) {
    const chunk = counties.slice(i, i + CONCURRENCY);
    await processChunk(chunk, upsert, stats);
    processed += chunk.length;
    if (processed % 100 === 0 || processed === total) {
      console.log(`[earthquake-import] ${processed}/${total} (ok:${stats.ok} null:${stats.null} err:${stats.err})`);
    }
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM earthquake_risk').get().n;
  console.log(`[earthquake-import] Done. Counties in DB: ${count} | ok:${stats.ok} null:${stats.null} err:${stats.err}`);
  db.close();
}

main().catch(e => { console.error('[earthquake-import] Fatal:', e.message); process.exit(1); });
