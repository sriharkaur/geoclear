'use strict';
/**
 * Risk Data Module
 * ================
 * Reads from risk.db — a separate SQLite DB that lives alongside nad.db on /data.
 * Populated by: wildfire-import.js, storm-import.js, calfire-import.js
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

  /** Check which tables are populated (for data_coverage response field) */
  coverage() {
    if (!this.db) return { wildfire: false, storm: false, cal_fire: false };
    const check = (table) => {
      try {
        return this.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n > 0;
      } catch (_) { return false; }
    };
    return {
      wildfire: check('wildfire_risk'),
      storm:    check('storm_risk'),
      cal_fire: check('calfire_fhsz'),
    };
  }
}

module.exports = { RiskData };
