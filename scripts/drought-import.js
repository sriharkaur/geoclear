#!/usr/bin/env node
/**
 * USDA Drought Monitor → risk.db Importer
 * =========================================
 * Fetches 26-week drought severity statistics for each US county from the
 * USDA Drought Monitor API and stores them in risk.db.
 *
 * Source: USDA National Drought Mitigation Center
 *   https://usdmdataservices.unl.edu/api/CountyStatistics/
 *   Free, public, no API key required.
 *
 * Outputs per county:
 *   risk_score     — 0-1, fraction of county area in D2+ drought (26-week avg)
 *   current_level  — latest week: None / D0 / D1 / D2 / D3 / D4
 *   weeks_sampled  — number of weekly observations
 *   import_date    — when this snapshot was taken
 *
 * Usage:
 *   node drought-import.js --db=/tmp/risk.db
 *   node drought-import.js --db=/data/risk.db --concurrency=10
 *   node drought-import.js --db=/data/risk.db --limit=50
 *
 * STAGING-FIRST: Run on staging Render shell, upload to prod via stream-upload.
 * Re-run monthly to keep drought data current (drought conditions change weekly).
 */

'use strict';

const https    = require('https');
const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const Database = require('better-sqlite3');

const argv        = process.argv.slice(2);
const dbArg       = argv.find(a => a.startsWith('--db='))?.split('=')[1]          ?? path.join(__dirname, 'data', 'risk.db');
const CONCURRENCY = parseInt(argv.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? '10');
const LIMIT       = parseInt(argv.find(a => a.startsWith('--limit='))?.split('=')[1]       ?? '0');

const CENSUS_URL = 'https://www2.census.gov/geo/docs/reference/cenpop2020/county/CenPop2020_Mean_CO.txt';
const DROUGHT_BASE = 'https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByArea';

function httpGetText(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'GeoClear/1.0 drought-importer' }, timeout: timeoutMs }, res => {
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

function parseCSVRow(line) {
  const out = []; let cur = ''; let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
    else { cur += ch; }
  }
  out.push(cur);
  return out;
}

function fmt(d) { return d.toISOString().slice(0, 10); }

async function fetchDrought(countyFips) {
  const endDate   = new Date();
  const startDate = new Date(endDate - 26 * 7 * 24 * 3600 * 1000);
  const url = `${DROUGHT_BASE}?aoi=${countyFips}&startdate=${fmt(startDate)}&enddate=${fmt(endDate)}&statisticsType=1`;
  const body = await httpGetText(url, 20000);

  const lines = body.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;

  const header  = parseCSVRow(lines[0]);
  const idxNone = header.indexOf('None');
  const idxD0   = header.indexOf('D0');
  const idxD1   = header.indexOf('D1');
  const idxD2   = header.indexOf('D2');
  const idxD3   = header.indexOf('D3');
  const idxD4   = header.indexOf('D4');

  if (idxNone < 0 || idxD0 < 0) return null;

  const rows = lines.slice(1);
  let sumRatio   = 0;
  let currentLevel = 'None';

  for (let i = 0; i < rows.length; i++) {
    const cols = parseCSVRow(rows[i]);
    const none  = parseFloat(cols[idxNone]) || 0;
    const d0    = parseFloat(cols[idxD0])   || 0;
    const d1    = parseFloat(cols[idxD1])   || 0;
    const d2    = parseFloat(cols[idxD2])   || 0;
    const d3    = parseFloat(cols[idxD3])   || 0;
    const d4    = parseFloat(cols[idxD4])   || 0;
    const total = none + d0 + d1 + d2 + d3 + d4;
    if (total > 0) sumRatio += (d2 + d3 + d4) / total;

    // Most-recent row = index 0 (API returns newest first)
    if (i === 0) {
      if (d4 > 0)      currentLevel = 'D4';
      else if (d3 > 0) currentLevel = 'D3';
      else if (d2 > 0) currentLevel = 'D2';
      else if (d1 > 0) currentLevel = 'D1';
      else if (d0 > 0) currentLevel = 'D0';
      else             currentLevel = 'None';
    }
  }

  const avgRatio = rows.length > 0 ? sumRatio / rows.length : 0;
  return {
    risk_score:    +Math.min(1, avgRatio).toFixed(4),
    current_level: currentLevel,
    weeks_sampled: rows.length,
  };
}

async function fetchCountyFips() {
  console.log('[drought-import] Fetching Census county FIPS list…');
  const text = await httpGetText(CENSUS_URL);
  const lines = text.trim().split('\n');
  const header = lines[0].split(',').map(h => h.trim().toUpperCase());
  const idxState  = header.indexOf('STATEFP');
  const idxCounty = header.indexOf('COUNTYFP');
  const idxName   = header.indexOf('COUNAME');
  const idxSt     = header.indexOf('STNAME');

  const counties = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols   = line.split(',').map(c => c.trim());
    const fips   = (cols[idxState]?.padStart(2, '0') ?? '') + (cols[idxCounty]?.padStart(3, '0') ?? '');
    if (fips.length !== 5) continue;
    counties.push({ fips, name: cols[idxName] ?? '', state: cols[idxSt] ?? '' });
  }
  console.log(`[drought-import] ${counties.length} counties loaded.`);
  return counties;
}

function initDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS drought_risk (
      county_fips   TEXT NOT NULL PRIMARY KEY,
      state_name    TEXT,
      county_name   TEXT,
      risk_score    REAL NOT NULL DEFAULT 0,
      current_level TEXT NOT NULL DEFAULT 'None',
      weeks_sampled INTEGER NOT NULL DEFAULT 0,
      import_date   TEXT NOT NULL,
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_drought_level ON drought_risk(current_level);
  `);
  return db;
}

async function processChunk(counties, upsert, importDate, stats) {
  await Promise.all(counties.map(async (c) => {
    try {
      const result = await fetchDrought(c.fips);
      if (result) {
        upsert.run(c.fips, c.state, c.name, result.risk_score, result.current_level, result.weeks_sampled, importDate);
        stats.ok++;
      } else {
        // No data (e.g. territories) — store zeros
        upsert.run(c.fips, c.state, c.name, 0, 'None', 0, importDate);
        stats.null++;
      }
    } catch (e) {
      stats.err++;
      if (stats.err <= 5) console.warn(`[drought-import] Error ${c.fips}: ${e.message}`);
      // Store zeros on error so county still has a row
      upsert.run(c.fips, c.state, c.name, 0, 'None', 0, importDate);
    }
  }));
}

async function main() {
  console.log(`[drought-import] DB: ${dbArg} | concurrency: ${CONCURRENCY}${LIMIT ? ` | limit: ${LIMIT}` : ''}`);
  let counties = await fetchCountyFips();
  if (LIMIT) counties = counties.slice(0, LIMIT);

  const db         = initDb(dbArg);
  const importDate = new Date().toISOString().slice(0, 10);

  const upsert = db.prepare(`
    INSERT INTO drought_risk (county_fips, state_name, county_name, risk_score, current_level, weeks_sampled, import_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(county_fips) DO UPDATE SET
      risk_score    = excluded.risk_score,
      current_level = excluded.current_level,
      weeks_sampled = excluded.weeks_sampled,
      import_date   = excluded.import_date,
      updated_at    = datetime('now')
  `);

  const stats = { ok: 0, null: 0, err: 0 };
  const total = counties.length;
  let processed = 0;

  for (let i = 0; i < counties.length; i += CONCURRENCY) {
    const chunk = counties.slice(i, i + CONCURRENCY);
    await processChunk(chunk, upsert, importDate, stats);
    processed += chunk.length;
    if (processed % 100 === 0 || processed === total) {
      console.log(`[drought-import] ${processed}/${total} (ok:${stats.ok} null:${stats.null} err:${stats.err})`);
    }
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM drought_risk').get().n;
  console.log(`[drought-import] Done. Counties in DB: ${count} | ok:${stats.ok} null:${stats.null} err:${stats.err}`);
  db.close();
}

main().catch(e => { console.error('[drought-import] Fatal:', e.message); process.exit(1); });
