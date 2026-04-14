'use strict';
/**
 * NAD Point Enrichment — Census Tract + FEMA Flood Zone
 * ======================================================
 * Calls two free public APIs to enrich any lat/lon point.
 * Both are US Federal Government APIs — no key, no rate limit contract,
 * but cache aggressively to be polite.
 *
 * Census Bureau Geocoder (TIGER/Line):
 *   https://geocoding.geo.census.gov/geocoder/geographies/coordinates
 *   Returns: census tract, block group, block code, GEOID, county FIPS
 *
 * FEMA NFHL (National Flood Hazard Layer):
 *   https://msc.fema.gov/arcgis/rest/services/NFHL/Current_NFHL_API/FeatureServer/28/query
 *   Returns: flood zone code (AE, X, AH…), SFHA flag, community name
 *
 * Usage:
 *   const { getCensusTract, getFEMAFloodZone, enrichPoint } = require('./geocode.js');
 *   const result = await enrichPoint(38.878, -77.175);
 *   // { tract:'4518.01', block_group:'1', block:'1002', geoid:'51059451801',
 *   //   flood_zone:'X', sfha:false, flood_community:'FAIRFAX COUNTY' }
 */

const https = require('https');

// Simple in-memory LRU with ~10K entries (coordinates rounded to 4 decimals → ~11m grid)
const CACHE_MAX = 10_000;
const censusCache = new Map();
const femaCache   = new Map();

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

// ── Combined point enrichment ─────────────────────────────────────
/**
 * Calls both APIs in parallel and returns merged enrichment object.
 * Never throws — missing APIs return null fields.
 */
async function enrichPoint(lat, lon) {
  const [census, fema] = await Promise.allSettled([
    getCensusTract(lat, lon),
    getFEMAFloodZone(lat, lon),
  ]);

  const c = census.status === 'fulfilled' ? census.value : null;
  const f = fema.status   === 'fulfilled' ? fema.value   : null;

  return {
    census_tract:     c?.tract     || null,
    census_tract_raw: c?.tract_raw || null,
    census_block_grp: c?.block_group || null,
    census_geoid:     c?.geoid     || null,
    flood_zone:       f?.flood_zone || null,
    flood_sfha:       f?.sfha ?? null,
    flood_community:  f?.community  || null,
  };
}

module.exports = { getCensusTract, getFEMAFloodZone, enrichPoint };
