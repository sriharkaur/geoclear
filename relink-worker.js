'use strict';
/**
 * relink-worker.js — populate FK columns for addresses with state_id IS NULL
 *
 * workerData: { dbPath }
 * Messages posted to parent:
 *   { type: 'progress', phase, updated, total }
 *   { type: 'done',     results: { state_id, county_id, city_id, zip_code_id } }
 *   { type: 'error',    message }
 */
const { workerData, parentPort } = require('worker_threads');
const Database = require('better-sqlite3');

const BATCH = 100_000;

function relinkColumn(db, colName, joinTable, joinCol, matchCol, addressCol) {
  // UPDATE addresses SET colName = (SELECT id FROM joinTable WHERE joinCol = addresses.addressCol)
  // WHERE colName IS NULL
  // Run in BATCH-sized loops until no rows remain.
  let total = 0;
  const stmt = db.prepare(`
    UPDATE addresses
    SET ${colName} = (
      SELECT id FROM ${joinTable} WHERE UPPER(${joinCol}) = UPPER(addresses.${addressCol})
      LIMIT 1
    )
    WHERE ${colName} IS NULL
      AND ${addressCol} IS NOT NULL
      AND rowid IN (
        SELECT rowid FROM addresses WHERE ${colName} IS NULL AND ${addressCol} IS NOT NULL LIMIT ${BATCH}
      )
  `);
  let changed = 1;
  while (changed > 0) {
    const info = stmt.run();
    changed = info.changes;
    total += changed;
    if (changed > 0) {
      parentPort.postMessage({ type: 'progress', phase: colName, updated: total });
    }
  }
  return total;
}

try {
  const db = new Database(workerData.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  const results = {};

  // Phase 1: state_id  (fastest — 56 states, exact code match)
  parentPort.postMessage({ type: 'progress', phase: 'state_id', updated: 0, message: 'Starting state_id relink...' });
  results.state_id = relinkColumn(db, 'state_id', 'states', 'code', 'state', 'state');
  parentPort.postMessage({ type: 'progress', phase: 'state_id', updated: results.state_id, message: `state_id done: ${results.state_id.toLocaleString()} rows linked` });

  // Phase 2: zip_code_id (zip_codes table, zip_code column)
  parentPort.postMessage({ type: 'progress', phase: 'zip_code_id', updated: 0, message: 'Starting zip_code_id relink...' });
  results.zip_code_id = relinkColumn(db, 'zip_code_id', 'zip_codes', 'zip_code', 'zip_code', 'zip_code');
  parentPort.postMessage({ type: 'progress', phase: 'zip_code_id', updated: results.zip_code_id, message: `zip_code_id done: ${results.zip_code_id.toLocaleString()} rows linked` });

  // Phase 3: county_id (counties table, name column + state_id match)
  // Simpler: match county name + state_id (state_id already relinked above)
  parentPort.postMessage({ type: 'progress', phase: 'county_id', updated: 0, message: 'Starting county_id relink...' });
  let countyTotal = 0;
  const countyStmt = db.prepare(`
    UPDATE addresses
    SET county_id = (
      SELECT c.id FROM counties c
      WHERE UPPER(c.name) = UPPER(addresses.county)
        AND c.state_id = addresses.state_id
      LIMIT 1
    )
    WHERE county_id IS NULL
      AND county IS NOT NULL
      AND state_id IS NOT NULL
      AND rowid IN (
        SELECT rowid FROM addresses WHERE county_id IS NULL AND county IS NOT NULL AND state_id IS NOT NULL LIMIT ${BATCH}
      )
  `);
  let changed = 1;
  while (changed > 0) {
    const info = countyStmt.run();
    changed = info.changes;
    countyTotal += changed;
    if (changed > 0) parentPort.postMessage({ type: 'progress', phase: 'county_id', updated: countyTotal });
  }
  results.county_id = countyTotal;
  parentPort.postMessage({ type: 'progress', phase: 'county_id', updated: countyTotal, message: `county_id done: ${countyTotal.toLocaleString()} rows linked` });

  // Phase 4: city_id (cities table, name + state_id)
  parentPort.postMessage({ type: 'progress', phase: 'city_id', updated: 0, message: 'Starting city_id relink...' });
  let cityTotal = 0;
  const cityStmt = db.prepare(`
    UPDATE addresses
    SET city_id = (
      SELECT ci.id FROM cities ci
      WHERE UPPER(ci.name) = UPPER(addresses.inc_muni)
        AND ci.state_id = addresses.state_id
      LIMIT 1
    )
    WHERE city_id IS NULL
      AND inc_muni IS NOT NULL
      AND state_id IS NOT NULL
      AND rowid IN (
        SELECT rowid FROM addresses WHERE city_id IS NULL AND inc_muni IS NOT NULL AND state_id IS NOT NULL LIMIT ${BATCH}
      )
  `);
  changed = 1;
  while (changed > 0) {
    const info = cityStmt.run();
    changed = info.changes;
    cityTotal += changed;
    if (changed > 0) parentPort.postMessage({ type: 'progress', phase: 'city_id', updated: cityTotal });
  }
  results.city_id = cityTotal;
  parentPort.postMessage({ type: 'progress', phase: 'city_id', updated: cityTotal, message: `city_id done: ${cityTotal.toLocaleString()} rows linked` });

  db.close();
  parentPort.postMessage({ type: 'done', results });
} catch (e) {
  parentPort.postMessage({ type: 'error', message: e.message });
}
