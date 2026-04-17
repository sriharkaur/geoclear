#!/usr/bin/env node
/**
 * CAL FIRE FHSZ → risk.db Importer
 * ==================================
 * Downloads California Fire Hazard Severity Zone (FHSZ) data from CA DOF (CAL FIRE)
 * and stores a bounding-box grid into risk.db for spatial lookups by lat/lon.
 *
 * Source: CA Department of Forestry and Fire Protection (CAL FIRE)
 *   State Responsibility Area (SRA): https://egis.fire.ca.gov/FHSZ
 *   Local Responsibility Area (LRA): same portal
 *   GeoJSON download (free, no key):
 *     https://opendata.arcgis.com/datasets/[dataset-id]/FeatureServer/0/query
 *
 * FHSZ Classes:
 *   Moderate, High, Very High (SRA)
 *   High, Very High (LRA — State-designated LRA zones)
 *
 * Storage: bounding-box grid cells (0.001° × 0.001° ≈ 100m × 100m)
 * Spatial query: find cell containing lat/lon (sub-millisecond SQLite lookup)
 *
 * Usage (run on Render staging shell):
 *   node calfire-import.js --db=/data/risk.db
 *   node calfire-import.js --db=/data/risk.db --limit=500   # test run (500 features)
 *   node calfire-import.js --db=/data/risk.db --source=sra  # SRA only
 *   node calfire-import.js --db=/data/risk.db --source=lra  # LRA only
 *
 * STAGING-FIRST: Always run on staging Render shell, not locally.
 * CA addresses: ~15M. FHSZ covers ~31M acres.
 */

'use strict';

const https    = require('https');
const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const Database = require('better-sqlite3');

const argv   = process.argv.slice(2);
const dbArg  = argv.find(a => a.startsWith('--db='))?.split('=')[1] ?? path.join(__dirname, 'data', 'risk.db');
const LIMIT  = parseInt(argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0');
const SOURCE = argv.find(a => a.startsWith('--source='))?.split('=')[1] ?? 'both'; // sra | lra | both

// CAL FIRE FHSZ ArcGIS Feature Service endpoints (public, no key)
const SOURCES = {
  sra: {
    label: 'SRA (State Responsibility Area)',
    // ArcGIS REST: CAL FIRE SRA FHSZ — state-managed lands
    url: 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/FHSZ_SRA/FeatureServer/0/query',
    classField: 'HAZ_CLASS',
  },
  lra: {
    label: 'LRA (Local Responsibility Area)',
    url: 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/FHSZ_LRA/FeatureServer/0/query',
    classField: 'HAZ_CLASS',
  },
};

const GRID_RES = 0.001; // ~100m resolution bounding boxes

function httpGet(url, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'GeoClear/1.0 calfire-importer' }, timeout: timeoutMs }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(httpGet(res.headers.location, timeoutMs));
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(new Error(`Invalid JSON: ${e.message}`)); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
    req.on('error', reject);
  });
}

async function fetchFeatures(baseUrl, classField, offset = 0, batchSize = 500) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: `${classField},COUNTY,Shape_Area`,
    returnGeometry: 'true',
    geometryType: 'esriGeometryPolygon',
    outSR: '4326',
    resultOffset: offset.toString(),
    resultRecordCount: batchSize.toString(),
    f: 'json',
  });
  return httpGet(`${baseUrl}?${params}`, 60000);
}

/**
 * Decompose a polygon ring into a set of bounding-box grid cells.
 * Returns an array of { min_lat, max_lat, min_lon, max_lon } cells.
 */
function polygonToCells(rings) {
  const cells = new Set();
  for (const ring of rings) {
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const [lon, lat] of ring) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
    // Grid cells covering this polygon's bounding box
    for (let lat = Math.floor(minLat / GRID_RES) * GRID_RES; lat < maxLat; lat = Math.round((lat + GRID_RES) * 10000) / 10000) {
      for (let lon = Math.floor(minLon / GRID_RES) * GRID_RES; lon < maxLon; lon = Math.round((lon + GRID_RES) * 10000) / 10000) {
        cells.add(`${lat.toFixed(3)}:${lon.toFixed(3)}`);
      }
    }
  }
  return [...cells].map(key => {
    const [lat, lon] = key.split(':').map(Number);
    return { min_lat: lat, max_lat: lat + GRID_RES, min_lon: lon, max_lon: lon + GRID_RES };
  });
}

async function initDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS calfire_fhsz (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      min_lat    REAL NOT NULL,
      max_lat    REAL NOT NULL,
      min_lon    REAL NOT NULL,
      max_lon    REAL NOT NULL,
      fhsz_class TEXT NOT NULL,
      fhsz_label TEXT NOT NULL,
      county     TEXT,
      source     TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_cf_bbox ON calfire_fhsz(min_lat, max_lat, min_lon, max_lon);
  `);
  return db;
}

async function importSource(db, sourceKey) {
  const { label, url, classField } = SOURCES[sourceKey];
  console.log(`[calfire-import] Source: ${label}`);

  const insert = db.prepare(`
    INSERT INTO calfire_fhsz (min_lat, max_lat, min_lon, max_lon, fhsz_class, fhsz_label, county, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const CLASS_LABELS = { 1: 'Moderate', 2: 'High', 3: 'Very High', Moderate: 'Moderate', High: 'High', 'Very High': 'Very High' };

  let offset = 0;
  let totalFeatures = 0;
  let totalCells = 0;
  const batchSize = 500;

  while (true) {
    console.log(`[calfire-import] Fetching offset ${offset}…`);
    let data;
    try {
      data = await fetchFeatures(url, classField, offset, batchSize);
    } catch (e) {
      console.error(`[calfire-import] Fetch error: ${e.message}`);
      break;
    }

    const features = data?.features ?? [];
    if (!features.length) { console.log('[calfire-import] No more features.'); break; }

    db.transaction(() => {
      for (const f of features) {
        const hazClass = f.attributes?.[classField] || '';
        const county   = f.attributes?.COUNTY || null;
        const label2   = CLASS_LABELS[hazClass] || hazClass;
        const rings    = f.geometry?.rings ?? [];

        const cells = polygonToCells(rings);
        for (const cell of cells) {
          insert.run(cell.min_lat, cell.max_lat, cell.min_lon, cell.max_lon, hazClass, label2, county, sourceKey);
          totalCells++;
        }
        totalFeatures++;
      }
    })();

    console.log(`[calfire-import] ${totalFeatures} features → ${totalCells.toLocaleString()} grid cells`);
    if (LIMIT && totalFeatures >= LIMIT) { console.log(`[calfire-import] Hit limit ${LIMIT}.`); break; }
    if (features.length < batchSize) break;
    offset += batchSize;
  }

  return { features: totalFeatures, cells: totalCells };
}

async function main() {
  console.log(`[calfire-import] DB: ${dbArg}, source: ${SOURCE}${LIMIT ? `, limit: ${LIMIT}` : ''}`);
  const db = await initDb(dbArg);

  const sources = SOURCE === 'both' ? ['sra', 'lra'] : [SOURCE];
  for (const s of sources) {
    const result = await importSource(db, s);
    console.log(`[calfire-import] ${s.toUpperCase()}: ${result.features} features, ${result.cells.toLocaleString()} grid cells`);
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM calfire_fhsz').get().n;
  console.log(`[calfire-import] Done. Total grid cells: ${count.toLocaleString()}`);
  db.close();
}

main().catch(e => { console.error('[calfire-import] Fatal:', e.message); process.exit(1); });
