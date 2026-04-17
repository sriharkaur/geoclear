'use strict';
/**
 * Risk Data Module — Neon PostgreSQL backend
 * All methods are async. Pool uses NEON_DATABASE_URL_POOLED for app traffic.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.XATA_DATABASE_URL || process.env.NEON_DATABASE_URL,
  max: 10,
});

// Coverage cache — avoids 7 DB queries per health check
let _coverageCache    = null;
let _coverageCacheAt  = 0;
const COVERAGE_TTL_MS = 5 * 60 * 1000;

class RiskData {
  isReady() { return true; }

  async getWildfireRisk(countyFips) {
    if (!countyFips) return null;
    try {
      const { rows } = await pool.query(
        `SELECT county_fips, whp_class, whp_score, state FROM wildfire_risk WHERE county_fips = $1`,
        [countyFips]
      );
      return rows[0] || null;
    } catch (_) { return null; }
  }

  async getStormRisk(countyFips) {
    if (!countyFips) return null;
    try {
      const { rows } = await pool.query(
        `SELECT county_fips, event_count, tornado_count, hurricane_count, hail_count,
                flood_count, years_covered FROM storm_risk WHERE county_fips = $1`,
        [countyFips]
      );
      return rows[0] || null;
    } catch (_) { return null; }
  }

  async getCalFireFHSZ(lat, lon) {
    if (!lat || !lon) return null;
    try {
      const { rows } = await pool.query(
        `SELECT fhsz_class, fhsz_label, county FROM calfire_fhsz
         WHERE min_lat <= $1 AND max_lat >= $2 AND min_lon <= $3 AND max_lon >= $4
         ORDER BY (max_lat - min_lat) * (max_lon - min_lon) ASC
         LIMIT 1`,
        [lat, lat, lon, lon]
      );
      return rows[0] || null;
    } catch (_) { return null; }
  }

  async getEarthquakeRisk(countyFips) {
    if (!countyFips) return null;
    try {
      const { rows } = await pool.query(
        `SELECT county_fips, pgam, sdc, risk_score, risk_label FROM earthquake_risk WHERE county_fips = $1`,
        [countyFips]
      );
      return rows[0] || null;
    } catch (_) { return null; }
  }

  async getDroughtRisk(countyFips) {
    if (!countyFips) return null;
    try {
      const { rows } = await pool.query(
        `SELECT county_fips, risk_score, current_level, weeks_sampled, import_date FROM drought_risk WHERE county_fips = $1`,
        [countyFips]
      );
      return rows[0] || null;
    } catch (_) { return null; }
  }

  async getNRIRisk(countyFips) {
    if (!countyFips) return null;
    try {
      const { rows } = await pool.query(
        `SELECT county_fips, risk_score, risk_rating,
                heat_wave_score, hurricane_score,
                coastal_flood_score, riverine_flood_score,
                wildfire_score, earthquake_score
         FROM nri_risk WHERE county_fips = $1`,
        [countyFips]
      );
      return rows[0] || null;
    } catch (_) { return null; }
  }

  async getBuildingFootprint(lat, lon) {
    if (!lat || !lon) return null;
    try {
      const delta = 0.001;
      const { rows } = await pool.query(
        `SELECT area_sqm, building_type,
                ($1 - lat) * ($2 - lat) + ($3 - lon) * ($4 - lon) AS dist2
         FROM building_footprints
         WHERE lat BETWEEN $5 AND $6 AND lon BETWEEN $7 AND $8
         ORDER BY dist2
         LIMIT 1`,
        [lat, lat, lon, lon, lat - delta, lat + delta, lon - delta, lon + delta]
      );
      return rows[0] || null;
    } catch (_) { return null; }
  }

  async coverage() {
    if (_coverageCache && (Date.now() - _coverageCacheAt) < COVERAGE_TTL_MS) {
      return _coverageCache;
    }
    const check = async (table) => {
      try {
        const { rows } = await pool.query(`SELECT COUNT(*) AS n FROM ${table}`);
        return parseInt(rows[0].n, 10) > 0;
      } catch (_) { return false; }
    };
    const [wildfire, storm, cal_fire, earthquake, drought, nri, building_footprints] = await Promise.all([
      check('wildfire_risk'),
      check('storm_risk'),
      check('calfire_fhsz'),
      check('earthquake_risk'),
      check('drought_risk'),
      check('nri_risk'),
      check('building_footprints'),
    ]);
    _coverageCache   = { wildfire, storm, cal_fire, earthquake, drought, nri, building_footprints };
    _coverageCacheAt = Date.now();
    return _coverageCache;
  }
}

module.exports = { RiskData };
