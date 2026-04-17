'use strict';
/**
 * Risk Data Module
 * ================
 * Reads from risk.db — a separate SQLite DB that lives alongside nad.db on /data.
 * Populated by: wildfire-import.js, storm-import.js, calfire-import.js,
 *               earthquake-import.js, drought-import.js
 *
 * If risk.db doesn't exist yet (pre-import), all methods return null gracefully.
 * The /v1/risk endpoint uses data_coverage flags to signal which dimensions are live.
 *
 * Usage:
 *   const riskData = new RiskData();
 *   riskData.getWildfireRisk('48201')          // by county FIPS
 *   riskData.getStormRisk('48201')             // by county FIPS
 *   riskData.getCalFireFHSZ(37.774, -122.419)  // by lat/lon (CA only)
 */

const path     = require('path');
const fs       = require('fs');
const Database = require('better-sqlite3');

const RISK_DB_PATH = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'risk.db');

class RiskData {
  constructor(dbPath = RISK_DB_PATH) {
    if (fs.existsSync(dbPath)) {
      try {
        this.db = new Database(dbPath, { readonly: true });
      } catch (_) {
        this.db = null;
      }
    } else {
      this.db = null;
    }
  }

  isReady() { return this.db !== null; }

  /** Wildfire Hazard Potential by county FIPS (from USFS FSIM national assessment) */
  getWildfireRisk(countyFips) {
    if (!this.db || !countyFips) return null;
    try {
      return this.db.prepare(
        `SELECT county_fips, whp_class, whp_score, state FROM wildfire_risk WHERE county_fips = ?`
      ).get(countyFips) || null;
    } catch (_) { return null; }
  }

  /** Storm risk by county FIPS (from NOAA Storm Events Database, 10-year aggregate) */
  getStormRisk(countyFips) {
    if (!this.db || !countyFips) return null;
    try {
      return this.db.prepare(
        `SELECT county_fips, event_count, tornado_count, hurricane_count, hail_count,
                flood_count, years_covered FROM storm_risk WHERE county_fips = ?`
      ).get(countyFips) || null;
    } catch (_) { return null; }
  }

  /** CAL FIRE Fire Hazard Severity Zone by lat/lon (California only) */
  getCalFireFHSZ(lat, lon) {
    if (!this.db || !lat || !lon) return null;
    try {
      // Stored as bounding-box grid: find the cell containing this point
      return this.db.prepare(
        `SELECT fhsz_class, fhsz_label, county FROM calfire_fhsz
         WHERE min_lat <= ? AND max_lat >= ? AND min_lon <= ? AND max_lon >= ?
         ORDER BY (max_lat - min_lat) * (max_lon - min_lon) ASC
         LIMIT 1`
      ).get(lat, lat, lon, lon) || null;
    } catch (_) { return null; }
  }

  /** Seismic risk by county FIPS (from USGS ASCE7-22 at county centroid) */
  getEarthquakeRisk(countyFips) {
    if (!this.db || !countyFips) return null;
    try {
      return this.db.prepare(
        `SELECT county_fips, pgam, sdc, risk_score, risk_label FROM earthquake_risk WHERE county_fips = ?`
      ).get(countyFips) || null;
    } catch (_) { return null; }
  }

  /** Drought risk by county FIPS (from USDA Drought Monitor, 26-week avg) */
  getDroughtRisk(countyFips) {
    if (!this.db || !countyFips) return null;
    try {
      return this.db.prepare(
        `SELECT county_fips, risk_score, current_level, weeks_sampled, import_date FROM drought_risk WHERE county_fips = ?`
      ).get(countyFips) || null;
    } catch (_) { return null; }
  }

  /**
   * FEMA National Risk Index — composite + heat wave + hurricane + coastal/riverine flood.
   * Populated by: nri-import.js (run on staging, then upload-chunk → merge to prod).
   * Returns null gracefully if nri_risk table not yet populated.
   */
  getNRIRisk(countyFips) {
    if (!this.db || !countyFips) return null;
    try {
      return this.db.prepare(
        `SELECT county_fips, risk_score, risk_rating,
                heat_wave_score, hurricane_score,
                coastal_flood_score, riverine_flood_score,
                wildfire_score, earthquake_score
         FROM nri_risk WHERE county_fips = ?`
      ).get(countyFips) || null;
    } catch (_) { return null; }
  }

  /**
   * Nearest Microsoft Building Footprint within ~100m of a lat/lon.
   * Returns { area_sqm, building_type } or null if table not populated yet.
   * Populated by: building-import.js (staging pipeline).
   */
  getBuildingFootprint(lat, lon) {
    if (!this.db || !lat || !lon) return null;
    try {
      const delta = 0.001; // ~111m bounding box
      return this.db.prepare(
        `SELECT area_sqm, building_type,
                (lat - ?) * (lat - ?) + (lon - ?) * (lon - ?) AS dist2
         FROM building_footprints
         WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
         ORDER BY dist2
         LIMIT 1`
      ).get(lat, lat, lon, lon, lat - delta, lat + delta, lon - delta, lon + delta) || null;
    } catch (_) { return null; }
  }

  /** Check which tables are populated (for data_coverage response field) */
  coverage() {
    if (!this.db) return { wildfire: false, storm: false, cal_fire: false, earthquake: false, drought: false };
    const check = (table) => {
      try {
        return this.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n > 0;
      } catch (_) { return false; }
    };
    return {
      wildfire:             check('wildfire_risk'),
      storm:                check('storm_risk'),
      cal_fire:             check('calfire_fhsz'),
      earthquake:           check('earthquake_risk'),
      drought:              check('drought_risk'),
      nri:                  check('nri_risk'),
      building_footprints:  check('building_footprints'),
    };
  }
}

module.exports = { RiskData };
