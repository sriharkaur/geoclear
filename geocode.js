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

// ── Combined point enrichment ─────────────────────────────────────
/**
 * Calls all six APIs in parallel and returns merged enrichment object.
 * Never throws — missing APIs return null fields.
 */
async function enrichPoint(lat, lon) {
  const [census, fema, elev, structs, gnis, nhd] = await Promise.allSettled([
    getCensusTract(lat, lon),
    getFEMAFloodZone(lat, lon),
    getElevation(lat, lon),
    getNearestStructures(lat, lon),
    getNearestGNIS(lat, lon),
    getNearestWaterway(lat, lon),
  ]);

  const c  = census.status  === 'fulfilled' ? census.value  : null;
  const f  = fema.status    === 'fulfilled' ? fema.value    : null;
  const e  = elev.status    === 'fulfilled' ? elev.value    : null;
  const s  = structs.status === 'fulfilled' ? structs.value : null;
  const g  = gnis.status    === 'fulfilled' ? gnis.value    : null;
  const w  = nhd.status     === 'fulfilled' ? nhd.value     : null;

  return {
    census_tract:              c?.tract        || null,
    census_tract_raw:          c?.tract_raw    || null,
    census_block_grp:          c?.block_group  || null,
    census_geoid:              c?.geoid        || null,
    flood_zone:                f?.flood_zone   || null,
    flood_sfha:                f?.sfha         ?? null,
    flood_community:           f?.community    || null,
    elevation_ft:              e,
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

module.exports = {
  getCensusTract, getFEMAFloodZone, getElevation,
  getNearestStructures, getNearestGNIS, getNearestWaterway,
  enrichPoint,
};
