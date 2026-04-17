#!/usr/bin/env node
/**
 * FEMA National Risk Index (NRI) → risk.db importer
 * ==================================================
 * Downloads the FEMA NRI bulk CSV (all 3,221 US counties) and imports into risk.db.
 * Self-contained — does not depend on wildfire_risk or any other table.
 *
 * Run on STAGING Render Shell (or locally for testing).
 *
 * Usage:
 *   node nri-import.js                   # full run — all 3,221 counties
 *   DATA_DIR=/data node nri-import.js    # explicit data dir
 *   node nri-import.js --limit=100       # test run
 *
 * Schema created in risk.db:
 *   nri_risk (county_fips, risk_score, risk_rating, heat_wave_score,
 *             hurricane_score, coastal_flood_score, riverine_flood_score,
 *             wildfire_score, earthquake_score, import_date)
 */

'use strict';

const https    = require('https');
const http     = require('http');
const path     = require('path');
const fs       = require('fs');
const zlib     = require('zlib');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const RISK_DB  = path.join(DATA_DIR, 'risk.db');
const args     = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const LIMIT    = args.limit ? parseInt(args.limit) : Infinity;

// FEMA NRI bulk CSV — all 3,221 counties, ~30MB zip
const NRI_CSV_URL = 'https://hazards.fema.gov/nri/Content/StaticDocuments/DataDownload/NRI_Table_Counties/NRI_Table_Counties.zip';

function download(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    if (redirects === 0) return reject(new Error('Too many redirects'));
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'geoclear-importer/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(download(res.headers.location, redirects - 1));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Download timeout')); });
  });
}

// Minimal ZIP parser — find first .csv entry and return its bytes
function unzipFirstCSV(buf) {
  // ZIP local file header signature: 0x04034b50
  let offset = 0;
  while (offset < buf.length - 30) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) { offset++; continue; }
    const compression = buf.readUInt16LE(offset + 8);
    const compSize    = buf.readUInt32LE(offset + 18);
    const uncompSize  = buf.readUInt32LE(offset + 22);
    const fnLen       = buf.readUInt16LE(offset + 26);
    const extraLen    = buf.readUInt16LE(offset + 28);
    const fname       = buf.slice(offset + 30, offset + 30 + fnLen).toString();
    const dataStart   = offset + 30 + fnLen + extraLen;
    if (fname.endsWith('.csv')) {
      const compressed = buf.slice(dataStart, dataStart + compSize);
      if (compression === 0) return compressed; // stored
      if (compression === 8) return zlib.inflateRawSync(compressed); // deflate
      throw new Error(`Unsupported compression ${compression} for ${fname}`);
    }
    offset = dataStart + compSize;
  }
  throw new Error('No CSV found in ZIP');
}

// Parse CSV into array of objects (handles quoted fields)
function parseCSV(text) {
  const lines = text.split('\n');
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, j) => { row[h] = vals[j] || ''; });
    rows.push(row);
  }
  return rows;
}

// NRI score → 0-1 normalized (NRI scores are 0–100 national percentile)
function norm(score) {
  if (score == null || score === '' || isNaN(score)) return null;
  return +(Math.min(100, Math.max(0, parseFloat(score))) / 100).toFixed(3);
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

  console.log(`Downloading FEMA NRI bulk CSV…`);
  const zipBuf = await download(NRI_CSV_URL);
  console.log(`Downloaded ${(zipBuf.length / 1024 / 1024).toFixed(1)} MB`);

  const csvBuf = unzipFirstCSV(zipBuf);
  const rows   = parseCSV(csvBuf.toString('utf8'));
  console.log(`Parsed ${rows.length} county rows from CSV`);

  const db = new Database(RISK_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  setupSchema(db);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO nri_risk
      (county_fips, risk_score, risk_rating, heat_wave_score, hurricane_score,
       coastal_flood_score, riverine_flood_score, wildfire_score, earthquake_score, import_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))
  `);

  const targets = rows.slice(0, Math.min(rows.length, LIMIT));
  const insertMany = db.transaction((batch) => {
    for (const r of batch) {
      // CSV column names from FEMA NRI data dictionary
      const fips = r['STCOFIPS'] || r['stcofips'] || r['FIPS'] || r['fips'];
      if (!fips || fips.length < 5) continue;
      insert.run(
        fips,
        norm(r['RISK_SCORE']  || r['RISK_SCORE_CMP']),
        r['RISK_RATNG'] || r['RISK_RATING'] || null,
        norm(r['HWAV_RISKS']),
        norm(r['HRCN_RISKS']),
        norm(r['CFLD_RISKS']),
        norm(r['RFLD_RISKS']),
        norm(r['WFIR_RISKS']),
        norm(r['ERQK_RISKS']),
      );
    }
  });

  // Insert in batches of 500
  let total = 0;
  for (let i = 0; i < targets.length; i += 500) {
    const batch = targets.slice(i, i + 500);
    insertMany(batch);
    total += batch.length;
    console.log(`  Inserted ${total}/${targets.length}`);
  }

  db.close();
  console.log(`\nNRI import complete. ${total} counties in nri_risk table.`);
  console.log('Next: upload risk.db to prod via POST /v1/admin/upload-chunk, then POST /v1/admin/merge');
}

main().catch(e => { console.error(e); process.exit(1); });
