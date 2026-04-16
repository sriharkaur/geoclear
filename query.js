#!/usr/bin/env node
/**
 * NAD Query API
 * =============
 * Provides query functions at every geographic level:
 *   country → state → county → city → zip (neighborhood) → address (local)
 *
 * Usage (CLI):
 *   node nad/query.js --level state
 *   node nad/query.js --level county --state TX
 *   node nad/query.js --level city --county "Travis County" --state TX
 *   node nad/query.js --level zip --city "Austin" --state TX
 *   node nad/query.js --level address --zip 78701
 *   node nad/query.js --level address --street "Congress Ave" --city "Austin" --state TX
 *   node nad/query.js --level address --near 30.27,-97.74 --radius 0.01
 *   node nad/query.js --stats
 */

'use strict';

// Coverage map: which states were supplemented by Overture Maps gap-fill
const OVERTURE_STATES = new Set([
  'CA','FL','NJ','MI','PA','MS','GA','LA','NV','SC','ID','MT','NH','WY','SD'
]);
const THIN_STATES = new Set(['AK','VI','AS','GU','MP','PR']);

const path     = require('path');
const Database = require('better-sqlite3');

const NAD_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DEFAULT_DB = path.join(NAD_DIR, 'nad.db');

// ---------------------------------------------------------------------------
// Query functions (importable as a module)
// ---------------------------------------------------------------------------

class NADQuery {
  constructor(dbPath = DEFAULT_DB) {
    try {
      this.db = new Database(dbPath, { readonly: true });
    } catch (err) {
      console.warn(`[NADQuery] DB not available at ${dbPath}: ${err.message}`);
      this.db = null;
    }
  }

  isReady() { return this.db !== null; }

  close() { if (this.db) this.db.close(); }

  _require() {
    if (!this.db) throw Object.assign(new Error('Database not yet available — run init-db or rsync nad.db to /data'), { code: 'DB_NOT_READY' });
  }

  // ---- Level 6: Country ----
  getCountry(code = 'US') {
    return this.db.prepare('SELECT * FROM countries WHERE code = ?').get(code);
  }

  listCountries() {
    return this.db.prepare('SELECT * FROM countries ORDER BY code').all();
  }

  // ---- Level 5: State ----
  listStates(countryCode = 'US') {
    return this.db.prepare(`
      SELECT s.*, c.code AS country_code
      FROM states s
      JOIN countries c ON c.id = s.country_id
      WHERE c.code = ?
      ORDER BY s.code
    `).all(countryCode);
  }

  getState(stateCode) {
    const row = this.db.prepare(`
      SELECT s.*, c.code AS country_code,
        (SELECT COUNT(*) FROM counties WHERE state_id = s.id)  AS county_count_live,
        (SELECT COUNT(*) FROM cities   WHERE state_id = s.id)  AS city_count_live,
        (SELECT COUNT(*) FROM zip_codes WHERE state_id = s.id) AS zip_count_live,
        (SELECT COUNT(*) FROM addresses WHERE state_id = s.id) AS address_count_live
      FROM states s JOIN countries c ON c.id = s.country_id
      WHERE s.code = ?
    `).get(stateCode.toUpperCase());
    if (row) {
      const code = row.code;
      row.coverage = OVERTURE_STATES.has(code) ? 'gap-fill'
        : THIN_STATES.has(code)                ? 'partial'
        : row.address_count_live === 0         ? 'none'
        :                                        'full';
      row.coverage_source = OVERTURE_STATES.has(code)
        ? 'NAD r22 + Overture Maps'
        : 'NAD r22';
    }
    return row;
  }

  // ---- Level 4: County ----
  listCounties(stateCode) {
    const q = stateCode
      ? `SELECT co.*, s.code AS state_code
         FROM counties co JOIN states s ON s.id = co.state_id
         WHERE s.code = ? ORDER BY co.name`
      : `SELECT co.*, s.code AS state_code
         FROM counties co JOIN states s ON s.id = co.state_id
         ORDER BY s.code, co.name`;
    return stateCode
      ? this.db.prepare(q).all(stateCode.toUpperCase())
      : this.db.prepare(q).all();
  }

  getCounty(countyName, stateCode) {
    return this.db.prepare(`
      SELECT co.*,
        s.code AS state_code,
        (SELECT COUNT(*) FROM cities    WHERE county_id = co.id) AS city_count,
        (SELECT COUNT(*) FROM zip_codes WHERE county_id = co.id) AS zip_count,
        (SELECT COUNT(*) FROM addresses WHERE county_id = co.id) AS address_count
      FROM counties co JOIN states s ON s.id = co.state_id
      WHERE UPPER(co.name) LIKE UPPER(?) AND s.code = ?
    `).get(`%${countyName}%`, stateCode.toUpperCase());
  }

  // ---- Level 3: City ----
  listCities(stateCode, countyName = null) {
    if (countyName) {
      return this.db.prepare(`
        SELECT ci.*, s.code AS state_code, co.name AS county_name
        FROM cities ci
        JOIN states  s  ON s.id  = ci.state_id
        JOIN counties co ON co.id = ci.county_id
        WHERE s.code = ? AND UPPER(co.name) LIKE UPPER(?)
        ORDER BY ci.name
      `).all(stateCode.toUpperCase(), `%${countyName}%`);
    }
    return stateCode
      ? this.db.prepare(`
          SELECT ci.*, s.code AS state_code, co.name AS county_name
          FROM cities ci
          JOIN states  s  ON s.id  = ci.state_id
          LEFT JOIN counties co ON co.id = ci.county_id
          WHERE s.code = ?
          ORDER BY ci.name
        `).all(stateCode.toUpperCase())
      : this.db.prepare(`
          SELECT ci.*, s.code AS state_code
          FROM cities ci JOIN states s ON s.id = ci.state_id
          ORDER BY s.code, ci.name
        `).all();
  }

  searchCity(nameLike, stateCode = null) {
    return stateCode
      ? this.db.prepare(`
          SELECT ci.*, s.code AS state_code
          FROM cities ci JOIN states s ON s.id = ci.state_id
          WHERE UPPER(ci.name) LIKE UPPER(?) AND s.code = ?
          ORDER BY ci.address_count DESC LIMIT 50
        `).all(`%${nameLike}%`, stateCode.toUpperCase())
      : this.db.prepare(`
          SELECT ci.*, s.code AS state_code
          FROM cities ci JOIN states s ON s.id = ci.state_id
          WHERE UPPER(ci.name) LIKE UPPER(?)
          ORDER BY ci.address_count DESC LIMIT 100
        `).all(`%${nameLike}%`);
  }

  // ---- Level 2: ZIP Code (neighborhood proxy) ----
  listZips(stateCode, cityName = null) {
    if (cityName) {
      return this.db.prepare(`
        SELECT z.*, s.code AS state_code, ci.name AS city_name
        FROM zip_codes z
        JOIN states  s  ON s.id  = z.state_id
        JOIN cities  ci ON ci.id = z.city_id
        WHERE s.code = ? AND UPPER(ci.name) LIKE UPPER(?)
        ORDER BY z.zip
      `).all(stateCode.toUpperCase(), `%${cityName}%`);
    }
    return stateCode
      ? this.db.prepare(`
          SELECT z.*, s.code AS state_code, ci.name AS city_name
          FROM zip_codes z
          JOIN states s ON s.id = z.state_id
          LEFT JOIN cities ci ON ci.id = z.city_id
          WHERE s.code = ? ORDER BY z.zip
        `).all(stateCode.toUpperCase())
      : this.db.prepare(`
          SELECT z.*, s.code AS state_code
          FROM zip_codes z JOIN states s ON s.id = z.state_id
          ORDER BY s.code, z.zip
        `).all();
  }

  getZip(zip, stateCode = null) {
    return stateCode
      ? this.db.prepare(`
          SELECT z.*, s.code AS state_code, ci.name AS city_name,
            (SELECT COUNT(*) FROM addresses WHERE zip_code_id = z.id) AS address_count
          FROM zip_codes z
          JOIN states s ON s.id = z.state_id
          LEFT JOIN cities ci ON ci.id = z.city_id
          WHERE z.zip = ? AND s.code = ?
        `).get(zip, stateCode.toUpperCase())
      : this.db.prepare(`
          SELECT z.*, s.code AS state_code, ci.name AS city_name,
            (SELECT COUNT(*) FROM addresses WHERE zip_code_id = z.id) AS address_count
          FROM zip_codes z
          JOIN states s ON s.id = z.state_id
          LEFT JOIN cities ci ON ci.id = z.city_id
          WHERE z.zip = ?
        `).get(zip);
  }

  // ---- Level 1: Address (local) ----

  /** Look up a specific address by ZIP + house number + street name */
  findAddress({ addNumber, streetName, zipCode, city, stateCode, limit = 20 } = {}) {
    const clauses = [];
    const params  = [];

    if (addNumber) { clauses.push('a.add_number = ?');          params.push(addNumber); }
    if (streetName) {
      clauses.push('UPPER(a.st_name) LIKE UPPER(?)');
      params.push(`%${streetName}%`);
    }
    if (zipCode)   { clauses.push('a.zip_code = ?');            params.push(zipCode); }
    if (city) {
      // Search both inc_muni (incorporated municipality) AND post_city (postal city).
      // They often differ — e.g. Gervais Dr has inc_muni=Fairfax County, post_city=Falls Church.
      clauses.push('(UPPER(a.inc_muni) LIKE UPPER(?) OR UPPER(a.post_city) LIKE UPPER(?))');
      params.push(`%${city}%`, `%${city}%`);
    }
    if (stateCode) { clauses.push('a.state = ?');               params.push(stateCode.toUpperCase()); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    // Fetch limit*3 rows so JS-side scoring has enough candidates to work with after sorting.
    const rows = this.db.prepare(`
      SELECT a.id, a.nad_uuid, a.full_address,
             a.add_number, a.st_pre_dir, a.st_name, a.st_pos_typ, a.st_pos_dir,
             a.unit,
             a.inc_muni, a.post_city, a.county, a.state, a.zip_code, a.plus4,
             a.latitude, a.longitude,
             a.addr_type, a.addr_class, a.placement,
             a.add_auth, a.date_update, a.nad_source, a.nad_uuid
      FROM addresses a ${where}
      ORDER BY a.state, a.inc_muni, a.st_name, a.add_number
      LIMIT ?
    `).all(...params, limit * 3);

    // ---- JS-side scoring & match_type ----------------------------------------

    const cityUpper = city ? city.toUpperCase() : null;

    const scored = rows.map(row => {
      let score = 0;

      // +3 exact zip match
      if (zipCode && row.zip_code === zipCode) score += 3;

      // +2 city exact-contains match (case-insensitive, not just partial — the DB already
      // filtered partial via LIKE, so here we re-check that the city token is actually
      // present as a whole word-level substring in the row's city fields).
      if (cityUpper) {
        const muniUpper  = (row.inc_muni  || '').toUpperCase();
        const postUpper  = (row.post_city || '').toUpperCase();
        if (muniUpper === cityUpper || postUpper === cityUpper ||
            muniUpper.includes(cityUpper) || postUpper.includes(cityUpper)) {
          score += 2;
        }
      }

      // +1 exact house number match
      if (addNumber && row.add_number === addNumber) score += 1;

      // +1 has coordinates
      if (row.latitude && row.longitude) score += 1;

      // +1 has county populated
      if (row.county) score += 1;

      // ---- match_type --------------------------------------------------------
      const hasNum    = !!(addNumber  && row.add_number === addNumber);
      const hasStreet = !!streetName;  // street was used as a filter — row passed it
      const hasZip    = !!(zipCode    && row.zip_code === zipCode);
      const hasCity   = !!(cityUpper  &&
                           ((row.inc_muni  || '').toUpperCase().includes(cityUpper) ||
                            (row.post_city || '').toUpperCase().includes(cityUpper)));
      const hasState  = !!stateCode;

      let match_type;
      if (hasNum && hasStreet && (hasZip || (hasCity && hasState))) {
        match_type = 'exact';
      } else if (hasNum && hasStreet) {
        match_type = 'number+street';
      } else if (hasStreet && (hasZip || hasCity || hasState)) {
        match_type = 'street+location';
      } else if (hasStreet) {
        match_type = 'street';
      } else {
        match_type = 'location';
      }

      return { ...row, match_type, _score: score };
    });

    // Sort: score desc, then st_name asc, then add_number asc (numeric)
    scored.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      const nameA = (a.st_name || '').toUpperCase();
      const nameB = (b.st_name || '').toUpperCase();
      if (nameA !== nameB) return nameA < nameB ? -1 : 1;
      return (parseInt(a.add_number, 10) || 0) - (parseInt(b.add_number, 10) || 0);
    });

    // Slice to requested limit and strip internal scoring field
    return scored.slice(0, limit).map(({ _score, ...row }) => row);
  }

  /**
   * Autocomplete/typeahead — returns up to `limit` address strings
   * that start with `q` (case-insensitive prefix match on full_address).
   * Optionally scoped to a state or ZIP.
   * Designed for live-as-you-type UX: fast prefix index scan, no joins.
   */
  suggest({ q, stateCode, zipCode, limit = 10 } = {}) {
    if (!q || q.trim().length < 2) return [];
    const prefix = q.toUpperCase().trim();
    const clauses = ["UPPER(a.full_address) LIKE ?"];
    const params  = [`${prefix}%`];
    if (stateCode) { clauses.push('a.state = ?'); params.push(stateCode.toUpperCase()); }
    if (zipCode)   { clauses.push('a.zip_code = ?'); params.push(zipCode); }
    return this.db.prepare(`
      SELECT a.full_address, a.zip_code, a.post_city, a.inc_muni, a.state
      FROM addresses a
      WHERE ${clauses.join(' AND ')}
      ORDER BY a.full_address
      LIMIT ?
    `).all(...params, Math.min(limit, 20));
  }

  /**
   * Fuzzy address search — tolerates typos and abbreviations.
   * Strategy: pull 500 candidates via relaxed LIKE, then rank JS-side
   * by Levenshtein distance on the street name token.
   */
  findAddressFuzzy({ addNumber, streetName, zipCode, city, stateCode, limit = 10 } = {}) {
    // Tokenise: remove common suffix words so "Main St" matches "Main Street"
    const normalize = s => (s || '')
      .toUpperCase()
      .replace(/\b(STREET|AVENUE|BOULEVARD|DRIVE|ROAD|LANE|COURT|PLACE|WAY|CIRCLE|TRAIL|TERRACE|RUN|LOOP|HIGHWAY|HWY|BLVD|AVE|ST|DR|RD|LN|CT|PL|CIR|TRL|TER|PKWY|PKY)\b/g, '')
      .replace(/[^A-Z0-9\s]/g, '')
      .trim();

    // Levenshtein distance (small strings only — O(n²) is fine for ≤30-char tokens)
    function lev(a, b) {
      if (!a) return b ? b.length : 0;
      if (!b) return a.length;
      const m = a.length, n = b.length;
      const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
      for (let j = 1; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          dp[i][j] = a[i-1] === b[j-1]
            ? dp[i-1][j-1]
            : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        }
      }
      return dp[m][n];
    }

    // Get initial candidates with loose prefix match
    const prefix = streetName ? streetName.toUpperCase().slice(0, 3) : null;
    const clauses = [];
    const params  = [];

    if (addNumber) { clauses.push('a.add_number = ?'); params.push(addNumber); }
    if (prefix)    { clauses.push("UPPER(a.st_name) LIKE ?"); params.push(`${prefix}%`); }
    if (zipCode)   { clauses.push('a.zip_code = ?'); params.push(zipCode); }
    if (city) {
      clauses.push('(UPPER(a.inc_muni) LIKE UPPER(?) OR UPPER(a.post_city) LIKE UPPER(?))');
      params.push(`%${city}%`, `%${city}%`);
    }
    if (stateCode) { clauses.push('a.state = ?'); params.push(stateCode.toUpperCase()); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const candidates = this.db.prepare(`
      SELECT a.id, a.nad_uuid, a.full_address,
             a.add_number, a.st_pre_dir, a.st_name, a.st_pos_typ, a.st_pos_dir,
             a.unit,
             a.inc_muni, a.post_city, a.county, a.state, a.zip_code, a.plus4,
             a.latitude, a.longitude,
             a.addr_type, a.addr_class, a.placement,
             a.add_auth, a.date_update, a.nad_source, a.nad_uuid
      FROM addresses a ${where}
      ORDER BY a.state, a.inc_muni, a.st_name, a.add_number
      LIMIT 500
    `).all(...params);

    if (!streetName) return candidates.slice(0, limit);

    const queryNorm = normalize(streetName);

    // Score each candidate
    const scored = candidates.map(row => {
      const rowNorm = normalize(row.st_name);
      const dist = lev(queryNorm, rowNorm);
      const maxLen = Math.max(queryNorm.length, rowNorm.length, 1);
      const similarity = 1 - dist / maxLen;
      return { row, similarity };
    });

    // Return top N sorted by similarity descending
    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => s.row);
  }

  /** Bounding-box spatial search */
  findByBBox(minLat, minLon, maxLat, maxLon, limit = 500) {
    return this.db.prepare(`
      SELECT id, nad_uuid, full_address,
             add_number, st_name, st_pos_typ,
             inc_muni AS city, county, state, zip_code,
             latitude, longitude, addr_type
      FROM addresses
      WHERE latitude  BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
      LIMIT ?
    `).all(minLat, maxLat, minLon, maxLon, limit);
  }

  /** Approximate radius search (degree-based, not true geodesic — good enough for <50 km) */
  findNear(lat, lon, radiusDeg = 0.01, limit = 100) {
    return this.findByBBox(
      lat - radiusDeg, lon - radiusDeg,
      lat + radiusDeg, lon + radiusDeg,
      limit
    );
  }

  // ---- Statistics ----
  stats() {
    const db = this.db;
    return {
      countries : db.prepare('SELECT COUNT(*) AS n FROM countries').get().n,
      states    : db.prepare('SELECT COUNT(*) AS n FROM states').get().n,
      counties  : db.prepare('SELECT COUNT(*) AS n FROM counties').get().n,
      cities    : db.prepare('SELECT COUNT(*) AS n FROM cities').get().n,
      zip_codes : db.prepare('SELECT COUNT(*) AS n FROM zip_codes').get().n,
      addresses : db.prepare('SELECT COUNT(*) AS n FROM addresses').get().n,
      lastImport: db.prepare(
        "SELECT run_date, rows_inserted, status FROM nad_import_log ORDER BY id DESC LIMIT 1"
      ).get(),
    };
  }
}

module.exports = { NADQuery };

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (require.main === module) {
  const argv = process.argv.slice(2);
  const get  = flag => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : (argv.find(a => a.startsWith(flag + '='))?.split('=')[1] ?? null);
  };

  const dbPath = get('--db') ?? DEFAULT_DB;

  let q;
  try {
    q = new NADQuery(dbPath);
  } catch (e) {
    console.error(`Cannot open NAD database at ${dbPath}`);
    console.error(`Run: node nad/download.js  (to download and import the dataset first)`);
    process.exit(1);
  }

  if (argv.includes('--stats')) {
    console.log('\nNAD Database Statistics');
    console.log('=======================');
    const s = q.stats();
    console.log(`  Countries : ${s.countries.toLocaleString()}`);
    console.log(`  States    : ${s.states.toLocaleString()}`);
    console.log(`  Counties  : ${s.counties.toLocaleString()}`);
    console.log(`  Cities    : ${s.cities.toLocaleString()}`);
    console.log(`  ZIP Codes : ${s.zip_codes.toLocaleString()}`);
    console.log(`  Addresses : ${s.addresses.toLocaleString()}`);
    if (s.lastImport) {
      console.log(`\n  Last import : ${s.lastImport.run_date}`);
      console.log(`    rows      : ${s.lastImport.rows_inserted?.toLocaleString()}`);
      console.log(`    status    : ${s.lastImport.status}`);
    }
    q.close();
    process.exit(0);
  }

  const level = get('--level') ?? 'state';
  const stateCode  = get('--state');
  const countyName = get('--county');
  const cityName   = get('--city');
  const zipCode    = get('--zip');
  const street     = get('--street');
  const addNum     = get('--number');
  const near       = get('--near');
  const radius     = parseFloat(get('--radius') ?? '0.01');
  const limit      = parseInt(get('--limit') ?? '50', 10);

  let results;

  switch (level.toLowerCase()) {
    case 'country':
      results = q.listCountries();
      break;
    case 'state':
      results = stateCode ? [q.getState(stateCode)] : q.listStates();
      break;
    case 'county':
      results = countyName && stateCode
        ? [q.getCounty(countyName, stateCode)]
        : q.listCounties(stateCode);
      break;
    case 'city':
      results = cityName
        ? q.searchCity(cityName, stateCode)
        : q.listCities(stateCode, countyName);
      break;
    case 'zip':
    case 'neighborhood':
      results = zipCode
        ? [q.getZip(zipCode, stateCode)]
        : q.listZips(stateCode, cityName);
      break;
    case 'address':
    case 'local':
      if (near) {
        const [lat, lon] = near.split(',').map(Number);
        results = q.findNear(lat, lon, radius, limit);
      } else {
        results = q.findAddress({ addNumber: addNum, streetName: street, zipCode, city: cityName, stateCode, limit });
      }
      break;
    default:
      console.error(`Unknown level: ${level}`);
      console.error('Valid levels: country, state, county, city, zip, address');
      process.exit(1);
  }

  console.log(JSON.stringify(results, null, 2));
  q.close();
}
