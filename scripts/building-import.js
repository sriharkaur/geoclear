#!/usr/bin/env node
/**
 * Microsoft Building Footprints → risk.db importer
 * =================================================
 * Run on STAGING Render Shell (100GB disk). Never run locally.
 *
 * Source: Microsoft USBuildingFootprints (MIT license)
 *   https://github.com/microsoft/USBuildingFootprints
 *   Azure hosted: state-by-state GeoJSON.gz files
 *
 * Pipeline:
 *   1. Download per-state GeoJSON.gz from Azure
 *   2. Stream-parse features (each = one building polygon)
 *   3. Compute centroid lat/lon + area_sqm from polygon coordinates
 *   4. Insert into risk.db `building_footprints` table
 *
 * Usage:
 *   node building-import.js                        # all 50 states
 *   node building-import.js --state=CA             # single state
 *   node building-import.js --limit=10000          # test run
 *   DATA_DIR=/data node building-import.js
 *
 * Schema (auto-created in risk.db if absent):
 *   CREATE TABLE building_footprints (
 *     id INTEGER PRIMARY KEY,
 *     lat REAL NOT NULL,
 *     lon REAL NOT NULL,
 *     area_sqm REAL,
 *     building_type TEXT
 *   );
 *   CREATE INDEX idx_bf_latlon ON building_footprints(lat, lon);
 */

'use strict';

const https    = require('https');
const zlib     = require('zlib');
const path     = require('path');
const fs       = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR    = process.env.DATA_DIR || path.join(__dirname, 'data');
const RISK_DB     = path.join(DATA_DIR, 'risk.db');
const BATCH_SIZE  = 5000;

const args       = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const SINGLE_STATE = args.state ? args.state.toUpperCase() : null;
const LIMIT        = args.limit ? parseInt(args.limit) : Infinity;

// All 50 states + DC. MS uses full state names as file names.
const STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','DistrictofColumbia'],
  ['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],
  ['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],
  ['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],
  ['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],
  ['NH','NewHampshire'],['NJ','NewJersey'],['NM','NewMexico'],['NY','NewYork'],
  ['NC','NorthCarolina'],['ND','NorthDakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],
  ['PA','Pennsylvania'],['RI','RhodeIsland'],['SC','SouthCarolina'],['SD','SouthDakota'],
  ['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],
  ['WA','Washington'],['WV','WestVirginia'],['WI','Wisconsin'],['WY','Wyoming'],
];

function getAzureUrl(stateName) {
  return `https://usbuildingdatasets.blob.core.windows.net/us-buildings/${stateName}.geojson.zip`;
}

/**
 * Compute centroid and approximate area of a polygon.
 * coords = [[lon, lat], ...] (GeoJSON order)
 */
function polygonStats(coords) {
  if (!coords || coords.length < 3) return { lat: null, lon: null, area_sqm: null };
  let sumLon = 0, sumLat = 0;
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    sumLon += x1;
    sumLat += y1;
    area += x1 * y2 - x2 * y1;
  }
  const centLon = sumLon / (n - 1);
  const centLat = sumLat / (n - 1);
  // Shoelace area in degrees², convert to sqm using ~111,000m/degree at mid-latitudes
  const areaDeg2 = Math.abs(area) / 2;
  const cosLat   = Math.cos(centLat * Math.PI / 180);
  const area_sqm = areaDeg2 * 111000 * 111000 * cosLat;
  return { lat: centLat, lon: centLon, area_sqm: Math.round(area_sqm) };
}

function setupSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS building_footprints (
      id            INTEGER PRIMARY KEY,
      lat           REAL NOT NULL,
      lon           REAL NOT NULL,
      area_sqm      REAL,
      building_type TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_bf_latlon ON building_footprints(lat, lon);
  `);
}

async function downloadAndImport(db, stateCode, stateName) {
  const url = getAzureUrl(stateName);
  console.log(`[${stateCode}] Downloading ${url}`);

  return new Promise((resolve, reject) => {
    const insert = db.prepare(
      `INSERT OR IGNORE INTO building_footprints (lat, lon, area_sqm, building_type) VALUES (?, ?, ?, ?)`
    );
    const insertMany = db.transaction((rows) => {
      for (const r of rows) insert.run(r.lat, r.lon, r.area_sqm, r.type);
    });

    let total = 0;
    let batch = [];
    let buf   = '';

    const req = https.get(url, res => {
      if (res.statusCode === 404) {
        console.warn(`[${stateCode}] Not found (404) — skipping`);
        res.resume();
        return resolve(0);
      }
      const gunzip = zlib.createGunzip();
      res.pipe(gunzip);

      gunzip.on('data', chunk => {
        buf += chunk.toString();
        // Stream-parse: look for complete feature objects
        let idx;
        while ((idx = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          try {
            // MS GeoJSON is one feature per line (newline-delimited)
            // But the file may also be a FeatureCollection — handle both
            const obj = line.startsWith('{') ? JSON.parse(line) : null;
            if (!obj) continue;
            const feature = obj.type === 'Feature' ? obj : (obj.features ? null : null);
            if (!feature) continue;
            const geom = feature.geometry;
            if (!geom || geom.type !== 'Polygon' || !geom.coordinates?.[0]) continue;
            const { lat, lon, area_sqm } = polygonStats(geom.coordinates[0]);
            if (!lat || !lon) continue;
            batch.push({ lat, lon, area_sqm, type: feature.properties?.type || null });
            total++;
            if (total >= LIMIT) {
              gunzip.destroy();
              res.destroy();
              break;
            }
            if (batch.length >= BATCH_SIZE) {
              insertMany(batch);
              batch = [];
              if (total % 100000 === 0) console.log(`[${stateCode}] ${total.toLocaleString()} buildings`);
            }
          } catch (_) {}
        }
      });

      gunzip.on('end', () => {
        if (batch.length > 0) insertMany(batch);
        console.log(`[${stateCode}] Done — ${total.toLocaleString()} buildings inserted`);
        resolve(total);
      });

      gunzip.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error(`${stateCode} request timeout`)); });
  });
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`DATA_DIR ${DATA_DIR} does not exist. Run on staging with /data mounted.`);
    process.exit(1);
  }

  const db = new Database(RISK_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  setupSchema(db);

  // Drop index before bulk load for speed; rebuild after
  try { db.exec('DROP INDEX IF EXISTS idx_bf_latlon'); } catch (_) {}

  const targets = SINGLE_STATE
    ? STATES.filter(([code]) => code === SINGLE_STATE)
    : STATES;

  let grandTotal = 0;
  for (const [code, name] of targets) {
    try {
      grandTotal += await downloadAndImport(db, code, name);
    } catch (e) {
      console.error(`[${code}] Error: ${e.message}`);
    }
  }

  console.log('Rebuilding lat/lon index…');
  db.exec('CREATE INDEX IF NOT EXISTS idx_bf_latlon ON building_footprints(lat, lon)');
  db.close();
  console.log(`\nComplete. Total: ${grandTotal.toLocaleString()} buildings in risk.db`);
}

main().catch(e => { console.error(e); process.exit(1); });
