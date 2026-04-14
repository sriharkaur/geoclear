#!/usr/bin/env node
/**
 * Creates data/dev.db — a lightweight development database.
 * Samples 20K addresses per state from nad.db (~1.1M total, ~1-2GB).
 * Use this for local development instead of the full 85GB nad.db.
 */
'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const SRC = path.join(__dirname, 'data', 'nad.db');
const DST = path.join(__dirname, 'data', 'dev.db');
const PER_STATE = 20000;

if (!fs.existsSync(SRC)) { console.error('nad.db not found at', SRC); process.exit(1); }
if (fs.existsSync(DST)) { fs.unlinkSync(DST); console.log('Removed existing dev.db'); }

const src = new Database(SRC, { readonly: true });
const dst = new Database(DST);

dst.pragma('journal_mode = WAL');
dst.pragma('synchronous = NORMAL');
dst.pragma('cache_size = -65536');

// Copy schema (tables, indexes, views)
console.log('Copying schema...');
const schema = src.prepare(`
  SELECT sql FROM sqlite_master
  WHERE sql IS NOT NULL AND type IN ('table','index','view')
  ORDER BY rootpage
`).all();
for (const { sql } of schema) {
  try { dst.exec(sql); } catch (_) {}
}

// Seed static lookup tables
console.log('Seeding countries and states...');
const countries = src.prepare('SELECT * FROM countries').all();
const states    = src.prepare('SELECT * FROM states').all();
const iCountry  = dst.prepare('INSERT OR IGNORE INTO countries (id,code,name) VALUES (?,?,?)');
const iState    = dst.prepare('INSERT OR IGNORE INTO states (id,code,name,fips,country_id,address_count,county_count,city_count,zip_count) VALUES (?,?,?,?,?,?,?,?,?)');
for (const r of countries) iCountry.run(r.id, r.code, r.name);
for (const r of states)    iState.run(r.id, r.code, r.name, r.fips, r.country_id, r.address_count, r.county_count, r.city_count, r.zip_count);

// Sample addresses per state
const stateList = src.prepare('SELECT code FROM states').all().map(r => r.code);
const iAddr = dst.prepare(`INSERT OR IGNORE INTO addresses
  (id,nad_uuid,add_number,st_pre_dir,st_name,st_pos_typ,st_pos_dir,unit,
   county,inc_muni,post_city,state,zip_code,plus4,latitude,longitude,
   addr_type,addr_class,placement,add_auth,date_update,nad_source,full_address,date_imported)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insertBatch = dst.transaction(rows => {
  for (const r of rows) {
    iAddr.run(r.id,r.nad_uuid,r.add_number,r.st_pre_dir,r.st_name,r.st_pos_typ,r.st_pos_dir,r.unit,
      r.county,r.inc_muni,r.post_city,r.state,r.zip_code,r.plus4,r.latitude,r.longitude,
      r.addr_type,r.addr_class,r.placement,r.add_auth,r.date_update,r.nad_source,r.full_address,r.date_imported);
  }
});

console.log(`Sampling ${PER_STATE.toLocaleString()} addresses per state...`);
let total = 0;
for (const code of stateList) {
  const rows = src.prepare('SELECT * FROM addresses WHERE state = ? LIMIT ?').all(code, PER_STATE);
  if (rows.length) { insertBatch(rows); total += rows.length; }
  process.stdout.write(`${code}(${rows.length}) `);
}
console.log(`\nTotal: ${total.toLocaleString()} addresses`);

console.log('Running WAL checkpoint...');
dst.exec('PRAGMA wal_checkpoint(TRUNCATE)');
dst.close();
src.close();

const size = (fs.statSync(DST).size / 1e9).toFixed(1);
console.log(`dev.db created: ${DST} (${size}GB)`);
console.log('Set NAD_DB=data/dev.db in your shell for local development.');
