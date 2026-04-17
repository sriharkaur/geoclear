'use strict';
/**
 * NAD Point Enrichment — Census + FEMA + Elevation + Structures + GNIS + NHD
 * ===========================================================================
 * Six free US Federal Government APIs called in parallel. No keys required.
 *
 * Census Bureau Geocoder (TIGER/Line):
 *   https://geocoding.geo.census.gov/geocoder/geographies/coordinates
 *
 * FEMA NFHL (National Flood Hazard Layer):
 *   https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query
 *
 * USGS 3DEP Elevation Point Query Service (EPQS):
 *   https://epqs.nationalmap.gov/v1/json?x={lon}&y={lat}&units=Feet
 *
 * USGS Structures (The National Map):
 *   https://carto.nationalmap.gov/arcgis/rest/services/structures/MapServer
 *   Layer 14 = Hospitals, Layer 16 = Fire Stations
 *
 * USGS GNIS Geographic Names (The National Map):
 *   https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer
 *   Layer 3 = Populated Places
 *
 * NHD+ High Resolution Hydrography (The National Map):
 *   https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer
 *   Layer 3 = NetworkNHDFlowline (named streams/rivers)
 */

const https = require('https');

// Simple in-memory LRU with ~10K entries (coordinates rounded to 4 decimals → ~11m grid)
const CACHE_MAX = 10_000;
const censusCache     = new Map();
const femaCache       = new Map();
const elevationCache  = new Map();
const structuresCache = new Map();
const gnisCache       = new Map();
const nhdCache        = new Map();
const calfireCache    = new Map();
const earthquakeCache = new Map();
const droughtCache    = new Map();

function pruneCache(map) {
  if (map.size > CACHE_MAX) {
    // Delete oldest 20% of entries
    const toDelete = Math.floor(CACHE_MAX * 0.2);
    let i = 0;
    for (const k of map.keys()) {
      map.delete(k);
      if (++i >= toDelete) break;
    }
  }
}

function cacheKey(lat, lon) {
  return `${Math.round(lat * 10000) / 10000}:${Math.round(lon * 10000) / 10000}`;
}

// ── HTTP helper (follows up to 3 redirects, browser UA) ──────────
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function httpGetText(url, timeoutMs = 8000, redirects = 3) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : require('http');
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      headers:  { 'User-Agent': BROWSER_UA },
      timeout:  timeoutMs,
    };
    const req = lib.get(opts, res => {
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)
          && res.headers.location && redirects > 0) {
        res.resume();
        const next = res.headers.location.startsWith('http')
          ? res.headers.location : new URL(res.headers.location, url).href;
        resolve(httpGetText(next, timeoutMs, redirects - 1));
        return;
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
    req.on('error', reject);
  });
}

function httpGet(url, timeoutMs = 8000, redirects = 3) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : require('http');
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      headers:  { 'User-Agent': BROWSER_UA, 'Accept': 'application/json' },
      timeout:  timeoutMs,
    };
    const req = lib.get(opts, res => {
      // Follow redirects
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)
          && res.headers.location && redirects > 0) {
        res.resume();
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        resolve(httpGet(next, timeoutMs, redirects - 1));
        return;
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
  });
}

// ── Census Bureau Geocoder ────────────────────────────────────────
/**
 * Returns census geography for a lat/lon point.
 * @returns {{ tract, block_group, block, geoid, state_fips, county_fips, full_geoid } | null}
 */
async function getCensusTract(lat, lon) {
  if (!lat || !lon) return null;
  const key = cacheKey(lat, lon);
  if (censusCache.has(key)) return censusCache.get(key);

  const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates` +
    `?x=${lon}&y=${lat}` +
    `&benchmark=Public_AR_Current&vintage=Current_Current` +
    `&layers=Census%20Tracts&format=json`;

  let result = null;
  try {
    const body = await httpGet(url, 6000);
    const geographies = body?.result?.geographies?.['Census Tracts'];
    if (geographies?.length) {
      const g = geographies[0];
      const tractNum  = g.TRACT  || g.TRACTCE  || '';
      const blockGrp  = g.BLKGRP || '';
      const stateFips = g.STATE  || '';
      const cntyFips  = g.COUNTY || '';
      result = {
        tract:       tractNum ? (parseInt(tractNum) / 100).toFixed(2) : null,
        tract_raw:   tractNum,
        block_group: blockGrp,
        geoid:       g.GEOID || (stateFips + cntyFips + tractNum),
        state_fips:  stateFips,
        county_fips: cntyFips,
      };
    }
  } catch (_) {
    // Network unavailable — return null gracefully
  }

  pruneCache(censusCache);
  censusCache.set(key, result);
  return result;
}

// ── FEMA NFHL Flood Zone ──────────────────────────────────────────
/**
 * Returns FEMA flood zone designation for a lat/lon point.
 * FLD_ZONE codes: X = minimal, AE = high risk, A = moderate, VE = coastal, etc.
 * @returns {{ flood_zone, sfha, community, panel } | null}
 */
async function getFEMAFloodZone(lat, lon) {
  if (!lat || !lon) return null;
  const key = cacheKey(lat, lon);
  if (femaCache.has(key)) return femaCache.get(key);

  // Layer 28 = S_FLD_HAZ_AR (flood hazard areas polygon layer)
  // FEMA requires JSON-encoded geometry (not bare lon,lat)
  const geomJson = encodeURIComponent(JSON.stringify({
    x: lon, y: lat, spatialReference: { wkid: 4326 }
  }));
  const url = `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query` +
    `?geometry=${geomJson}` +
    `&geometryType=esriGeometryPoint&inSR=4326` +
    `&spatialRel=esriSpatialRelIntersects` +
    `&outFields=FLD_ZONE,FLD_AR_ID,SFHA_TF,COMMUNITY,PANEL` +
    `&returnGeometry=false&f=json`;

  let result = null;
  try {
    const body = await httpGet(url, 6000);
    const features = body?.features;
    if (features?.length) {
      const attr = features[0].attributes;
      result = {
        flood_zone: attr.FLD_ZONE   || null,
        sfha:       attr.SFHA_TF === 'T',
        community:  attr.COMMUNITY  || null,
        panel:      attr.PANEL      || null,
      };
    } else {
      // No flood hazard area found — outside any NFHL polygon
      result = { flood_zone: 'OUTSIDE', sfha: false, community: null, panel: null };
    }
  } catch (_) {
    // Network unavailable — return null gracefully
  }

  pruneCache(femaCache);
  femaCache.set(key, result);
  return result;
}

/**
 * Returns ground elevation in feet for a lat/lon using USGS 3DEP EPQS.
 * Resolution: 1m lidar where available, 1/3 arc-second (~10m) elsewhere.
 * @returns {number|null}
 */
async function getElevation(lat, lon) {
  if (!lat || !lon) return null;
  const key = cacheKey(lat, lon);
  if (elevationCache.has(key)) return elevationCache.get(key);

  const url = `https://epqs.nationalmap.gov/v1/json?x=${lon}&y=${lat}&units=Feet&includeDate=false`;
  let result = null;
  try {
    const body = await httpGet(url, 6000);
    const val = body?.value ?? body?.result;
    if (val !== null && val !== undefined && val !== -1000000) {
      result = Math.round(parseFloat(val) * 10) / 10; // 1 decimal
    }
  } catch (_) {}

  pruneCache(elevationCache);
  elevationCache.set(key, result);
  return result;
}

// ── WGS84 ↔ Web Mercator (for services that require WKID 3857) ──
function toWebMercator(lat, lon) {
  return {
    x: lon * 20037508.34 / 180,
    y: Math.log(Math.tan((90 + lat) * Math.PI / 360)) * 20037508.34 / Math.PI,
  };
}

// ── ArcGIS spatial helpers ────────────────────────────────────────

function haversineMi(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)) * 10) / 10;
}

// Extract [lat, lon] from esriGeometryPoint, esriGeometryMultipoint, or esriGeometryPolyline
function geomLatLon(g) {
  if (!g) return null;
  if (g.x !== undefined && g.y !== undefined) return [g.y, g.x];         // Point
  if (g.points?.length)                        return [g.points[0][1], g.points[0][0]]; // Multipoint
  if (g.paths?.length && g.paths[0]?.length)   return [g.paths[0][0][1], g.paths[0][0][0]]; // Polyline
  return null;
}

async function arcgisBoxQuery(serviceUrl, layer, lat, lon, outFields, delta, where) {
  const env = encodeURIComponent(JSON.stringify({
    xmin: lon - delta, ymin: lat - delta,
    xmax: lon + delta, ymax: lat + delta,
    spatialReference: { wkid: 4326 },
  }));
  const whereClause = where ? `&where=${encodeURIComponent(where)}` : '';
  const url = `${serviceUrl}/${layer}/query` +
    `?geometry=${env}&geometryType=esriGeometryEnvelope` +
    `&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects` +
    `${whereClause}&outFields=${outFields}` +
    `&returnGeometry=true&f=json&resultRecordCount=20`;
  const body = await httpGet(url, 8000);
  return body?.features || [];
}

function findNearest(lat, lon, features, nameField) {
  let bestDist = Infinity;
  let bestName = null;
  for (const f of features) {
    const ll = geomLatLon(f.geometry);
    if (!ll) continue;
    const d = haversineMi(lat, lon, ll[0], ll[1]);
    if (d < bestDist) {
      bestDist = d;
      bestName = f.attributes?.[nameField] || null;
    }
  }
  return bestDist < Infinity ? { name: bestName, mi: bestDist } : null;
}

// ── USGS Structures — hospitals + fire stations ───────────────────

const STRUCTURES_BASE = 'https://carto.nationalmap.gov/arcgis/rest/services/structures/MapServer';

async function getNearestStructures(lat, lon) {
  if (!lat || !lon) return null;
  const key = cacheKey(lat, lon);
  if (structuresCache.has(key)) return structuresCache.get(key);

  let result = {
    nearest_hospital_name: null, nearest_hospital_mi: null,
    nearest_fire_station_name: null, nearest_fire_station_mi: null,
  };
  try {
    const [hosp, fire] = await Promise.allSettled([
      arcgisBoxQuery(STRUCTURES_BASE, 14, lat, lon, 'name', 0.5),
      arcgisBoxQuery(STRUCTURES_BASE, 16, lat, lon, 'name', 0.5),
    ]);
    if (hosp.status === 'fulfilled') {
      const h = findNearest(lat, lon, hosp.value, 'name');
      if (h) { result.nearest_hospital_name = h.name; result.nearest_hospital_mi = h.mi; }
    }
    if (fire.status === 'fulfilled') {
      const fs = findNearest(lat, lon, fire.value, 'name');
      if (fs) { result.nearest_fire_station_name = fs.name; result.nearest_fire_station_mi = fs.mi; }
    }
  } catch (_) {}

  pruneCache(structuresCache);
  structuresCache.set(key, result);
  return result;
}

// ── USGS GNIS Geographic Names ────────────────────────────────────

async function getNearestGNIS(lat, lon) {
  if (!lat || !lon) return null;
  const key = cacheKey(lat, lon);
  if (gnisCache.has(key)) return gnisCache.get(key);

  let result = { nearest_place_name: null, nearest_place_type: null, nearest_place_mi: null };
  try {
    const BASE = 'https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer';
    const features = await arcgisBoxQuery(BASE, 3, lat, lon, 'gaz_name,gaz_featureclass', 0.25);
    let bestDist = Infinity;
    for (const f of features) {
      const ll = geomLatLon(f.geometry);
      if (!ll) continue;
      const d = haversineMi(lat, lon, ll[0], ll[1]);
      if (d < bestDist) {
        bestDist = d;
        result.nearest_place_name = f.attributes?.gaz_name || null;
        result.nearest_place_type = f.attributes?.gaz_featureclass || null;
        result.nearest_place_mi   = d;
      }
    }
  } catch (_) {}

  pruneCache(gnisCache);
  gnisCache.set(key, result);
  return result;
}

// ── NHD Hydrography — nearest named waterway ─────────────────────

async function getNearestWaterway(lat, lon) {
  if (!lat || !lon) return null;
  const key = cacheKey(lat, lon);
  if (nhdCache.has(key)) return nhdCache.get(key);

  let result = { nearest_waterway_name: null, nearest_waterway_ftype: null, nearest_waterway_mi: null };
  try {
    const BASE = 'https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer';
    // ftype 428 = Pipeline — exclude non-hydrographic features; require a GNIS name
    const features = await arcgisBoxQuery(BASE, 3, lat, lon, 'gnis_name,ftype', 0.1,
      "gnis_name IS NOT NULL AND gnis_name <> '' AND ftype <> 428");
    let bestDist = Infinity;
    for (const f of features) {
      const ll = geomLatLon(f.geometry);
      if (!ll) continue;
      const d = haversineMi(lat, lon, ll[0], ll[1]);
      if (d < bestDist) {
        bestDist = d;
        result.nearest_waterway_name  = f.attributes?.gnis_name || null;
        result.nearest_waterway_ftype = f.attributes?.ftype ?? null;
        result.nearest_waterway_mi    = d;
      }
    }
  } catch (_) {}

  pruneCache(nhdCache);
  nhdCache.set(key, result);
  return result;
}

// ── CAL FIRE Fire Hazard Severity Zone ───────────────────────────
// Live polygon lookup — no import needed. CA-only; null outside California.
// FHSZ9 values: SRA_High, SRA_VeryHigh, LRA_High, LRA_VeryHigh, FRA_High, FRA_VeryHigh
// Moderate zones are NOT in this dataset; null = moderate, outside CA, or unclassified.
// Service requires Web Mercator geometry + envelope (point queries return 0 features).

async function getCALFireFHSZ(lat, lon) {
  if (!lat || !lon) return null;
  const key = cacheKey(lat, lon);
  if (calfireCache.has(key)) return calfireCache.get(key);

  let result = null;
  try {
    const { x, y } = toWebMercator(lat, lon);
    const D = 100; // ±100m bounding box in Web Mercator units
    const env = encodeURIComponent(JSON.stringify({
      xmin: x - D, ymin: y - D, xmax: x + D, ymax: y + D,
      spatialReference: { wkid: 3857 },
    }));
    const url = `https://egis.fire.ca.gov/arcgis/rest/services/FRAP/HHZ_ref_FHSZ/MapServer/0/query` +
      `?geometry=${env}&geometryType=esriGeometryEnvelope&inSR=3857` +
      `&spatialRel=esriSpatialRelEnvelopeIntersects` +
      `&outFields=FHSZ9&returnGeometry=false&f=json&resultRecordCount=1`;
    const body = await httpGet(url, 6000);
    if (body?.features?.length) {
      result = { fhsz_class: body.features[0].attributes?.FHSZ9 || null };
    }
  } catch (_) {}

  pruneCache(calfireCache);
  calfireCache.set(key, result);
  return result;
}

// ── Combined point enrichment ─────────────────────────────────────
/**
 * Calls all six APIs in parallel and returns merged enrichment object.
 * Never throws — missing APIs return null fields.
 */
async function enrichPoint(lat, lon) {
  const [census, fema, elev, structs, gnis, nhd, calfire] = await Promise.allSettled([
    getCensusTract(lat, lon),
    getFEMAFloodZone(lat, lon),
    getElevation(lat, lon),
    getNearestStructures(lat, lon),
    getNearestGNIS(lat, lon),
    getNearestWaterway(lat, lon),
    getCALFireFHSZ(lat, lon),
  ]);

  const c  = census.status  === 'fulfilled' ? census.value  : null;
  const f  = fema.status    === 'fulfilled' ? fema.value    : null;
  const e  = elev.status    === 'fulfilled' ? elev.value    : null;
  const s  = structs.status === 'fulfilled' ? structs.value : null;
  const g  = gnis.status    === 'fulfilled' ? gnis.value    : null;
  const w  = nhd.status     === 'fulfilled' ? nhd.value     : null;
  const cf = calfire.status === 'fulfilled' ? calfire.value : null;

  return {
    census_tract:              c?.tract        || null,
    census_tract_raw:          c?.tract_raw    || null,
    census_block_grp:          c?.block_group  || null,
    census_geoid:              c?.geoid        || null,
    flood_zone:                f?.flood_zone   || null,
    flood_sfha:                f?.sfha         ?? null,
    flood_community:           f?.community    || null,
    elevation_ft:              e,
    cal_fire_fhsz:             cf?.fhsz_class  || null,
    nearest_hospital_name:     s?.nearest_hospital_name      || null,
    nearest_hospital_mi:       s?.nearest_hospital_mi        ?? null,
    nearest_fire_station_name: s?.nearest_fire_station_name  || null,
    nearest_fire_station_mi:   s?.nearest_fire_station_mi    ?? null,
    nearest_place_name:        g?.nearest_place_name         || null,
    nearest_place_type:        g?.nearest_place_type         || null,
    nearest_place_mi:          g?.nearest_place_mi           ?? null,
    nearest_waterway_name:     w?.nearest_waterway_name      || null,
    nearest_waterway_ftype:    w?.nearest_waterway_ftype     ?? null,
    nearest_waterway_mi:       w?.nearest_waterway_mi        ?? null,
  };
}

/**
 * Earthquake risk via USGS ASCE 7-22 Seismic Design Maps.
 * Returns Modified Maximum Considered Earthquake PGA (pgam) + Seismic Design Category.
 * pgam normalized to 0–1: 0=negligible (<0.04g), 1=extreme (≥2.0g near major fault).
 * Source: https://earthquake.usgs.gov/ws/designmaps/asce7-22.json
 */
async function getEarthquakeRisk(lat, lon) {
  if (!lat || !lon) return null;
  const key = cacheKey(lat, lon);
  if (earthquakeCache.has(key)) return earthquakeCache.get(key);

  const url = `https://earthquake.usgs.gov/ws/designmaps/asce7-22.json` +
    `?latitude=${lat}&longitude=${lon}&riskCategory=III&siteClass=C&title=geoclear`;

  let result = null;
  try {
    const body = await httpGet(url, 15000);
    const data = body?.response?.data;
    if (data && data.pgam != null) {
      const pgam  = parseFloat(data.pgam);
      const sdc   = (data.sdc || '').toUpperCase();
      // Normalize pgam: 0g→0, 0.5g→0.29, 1g→0.5, 2g→0.75, ≥3g→1.0 (log scale)
      const score = Math.min(1, pgam > 0 ? (Math.log(1 + pgam * 10) / Math.log(31)) : 0);
      const SDC_LABEL = { A: 'Negligible', B: 'Low', C: 'Moderate', D: 'High', E: 'Very High', F: 'Extreme' };
      result = {
        pgam:        +pgam.toFixed(3),
        sdc,
        risk_score:  +score.toFixed(3),
        risk_label:  SDC_LABEL[sdc] || 'Unknown',
      };
    }
  } catch (_) {}

  pruneCache(earthquakeCache);
  earthquakeCache.set(key, result);
  return result;
}

/**
 * Drought intensity via USDA Drought Monitor county statistics.
 * Aggregates last 26 weeks of weekly area-percentage data (D0–D4) for a county FIPS.
 * risk_score = mean fraction of county area in severe drought (D2+D3+D4) over 26 weeks.
 * Source: https://usdmdataservices.unl.edu/api/CountyStatistics/
 */
async function getDroughtRisk(countyFips) {
  if (!countyFips) return null;
  const key = `drought:${countyFips}`;
  if (droughtCache.has(key)) return droughtCache.get(key);

  // Last 26 weeks
  const endDate   = new Date();
  const startDate = new Date(endDate - 26 * 7 * 24 * 3600 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const url = `https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByArea` +
    `?aoi=${countyFips}&startdate=${fmt(startDate)}&enddate=${fmt(endDate)}&statisticsType=1`;

  let result = null;
  try {
    const body = await httpGetText(url, 15000);
    // Response is CSV text: MapDate,FIPS,County,State,None,D0,D1,D2,D3,D4,...
    // CSV parser handles quoted fields (e.g. "4,078.02" in the None/area column)
    const parseCSVRow = (line) => {
      const out = []; let cur = ''; let inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
        else { cur += ch; }
      }
      out.push(cur);
      return out;
    };
    const lines = body.trim ? body.trim().split('\n') : [];
    if (lines.length > 1) {
      const header = parseCSVRow(lines[0]);
      const idxNone = header.indexOf('None');
      const idxD0   = header.indexOf('D0');
      const idxD1   = header.indexOf('D1');
      const idxD2   = header.indexOf('D2');
      const idxD3   = header.indexOf('D3');
      const idxD4   = header.indexOf('D4');
      const rows  = lines.slice(1).filter(l => l.trim());
      // Values are area in sq miles; normalize each row by its total area
      let sumRatio = 0;
      let currentLevel = 'None';
      for (const row of rows) {
        const cols  = parseCSVRow(row);
        const none  = parseFloat(cols[idxNone]) || 0;
        const d0    = parseFloat(cols[idxD0])   || 0;
        const d1    = parseFloat(cols[idxD1])   || 0;
        const d2    = parseFloat(cols[idxD2])   || 0;
        const d3    = parseFloat(cols[idxD3])   || 0;
        const d4    = parseFloat(cols[idxD4])   || 0;
        const total = none + d0 + d1 + d2 + d3 + d4;
        if (total > 0) sumRatio += (d2 + d3 + d4) / total;
        // Most recent week is first row after header
        if (row === rows[0]) {
          if (d4 > 0) currentLevel = 'D4';
          else if (d3 > 0) currentLevel = 'D3';
          else if (d2 > 0) currentLevel = 'D2';
          else if (d1 > 0) currentLevel = 'D1';
          else if (d0 > 0) currentLevel = 'D0';
          else currentLevel = 'None';
        }
      }
      const avgRatio = rows.length > 0 ? sumRatio / rows.length : 0;
      result = {
        risk_score:    +Math.min(1, avgRatio).toFixed(3),
        current_level: currentLevel,
        weeks_sampled: rows.length,
      };
    }
  } catch (_) {}

  // Cache for 24h (drought changes weekly)
  droughtCache.set(key, result);
  setTimeout(() => droughtCache.delete(key), 24 * 3600 * 1000);
  return result;
}

module.exports = {
  getCensusTract, getFEMAFloodZone, getElevation,
  getNearestStructures, getNearestGNIS, getNearestWaterway, getCALFireFHSZ,
  getEarthquakeRisk, getDroughtRisk,
  enrichPoint,
};
