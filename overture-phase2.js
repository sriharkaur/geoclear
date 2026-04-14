#!/usr/bin/env node
/**
 * Overture Maps — Phase 2 only
 * Streams existing TSV files from overture_tmp/ into nad.db sequentially.
 * Safe to rerun — INSERT OR IGNORE skips duplicates.
 */
'use strict';

const path     = require('path');
const fs       = require('fs');
const readline = require('readline');
const Database = require('better-sqlite3');

const NAD_DB  = path.join(__dirname, 'data', 'nad.db');
const TMP_DIR = path.join(__dirname, 'data', 'overture_tmp');

const log  = (...a) => console.log(`[overture-p2]`, ...a);
const warn = (...a) => console.warn(`[overture-p2 WARN]`, ...a);

const argv   = process.argv.slice(2);
const STATES = argv.length ? argv.map(s => s.toUpperCase()) : ['FL', 'MI', 'NJ', 'NV', 'NH'];

(async () => {
  for (const state of STATES) {
    const tsvPath = path.join(TMP_DIR, `${state}.tsv`);
    if (!fs.existsSync(tsvPath)) {
      warn(`${state}: TSV not found at ${tsvPath} — skipping`);
      continue;
    }

    const stat = fs.statSync(tsvPath);
    log(`${state}: importing from ${tsvPath} (${(stat.size / 1e6).toFixed(0)} MB)`);

    const db = new Database(NAD_DB);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('busy_timeout = 60000');
    db.pragma('cache_size = -65536'); // 64 MB page cache

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO addresses
        (full_address, add_number, st_name, unit,
         post_city, inc_muni, state, zip_code,
         latitude, longitude,
         addr_type, placement,
         nad_source, nad_uuid,
         date_update, date_imported)
      VALUES (?,?,?,?, ?,?,?,?, ?,?, ?,?, ?,?, ?,?)
    `);
    const insertMany = db.transaction(rows => {
      for (const r of rows) stmt.run(r);
    });

    const BATCH = 25_000; // larger batch = faster
    let batch   = [];
    let total   = 0;
    let skipped = 0;
    let headers = null;
    const importedAt = new Date().toISOString();
    const t0 = Date.now();

    const rl = readline.createInterface({
      input: fs.createReadStream(tsvPath, 'utf8'),
      crlfDelay: Infinity,
    });

    await new Promise((resolve, reject) => {
      rl.on('line', line => {
        if (!line.trim()) { skipped++; return; }
        if (!headers) { headers = line.split('\t'); return; }

        const cols = line.split('\t');
        const lat = parseFloat(cols[7]);
        const lon = parseFloat(cols[8]);

        batch.push([
          cols[0] || null,   // full_address
          cols[1] || null,   // add_number
          cols[2] || null,   // st_name
          cols[3] || null,   // unit
          cols[4] || null,   // post_city
          cols[4] || null,   // inc_muni
          cols[5] || null,   // state
          cols[6] || null,   // zip_code
          isNaN(lat) ? null : lat,
          isNaN(lon) ? null : lon,
          'Point',
          'Structure',
          'Overture Maps',
          cols[9]  || null,  // nad_uuid
          cols[10] || null,  // date_update
          importedAt,
        ]);

        if (batch.length >= BATCH) {
          insertMany(batch);
          total += batch.length;
          batch = [];
          if (total % 500_000 === 0) {
            const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
            log(`  ${state}: ${total.toLocaleString()} rows (${elapsed}s)`);
          }
        }
      });

      rl.on('close', () => {
        if (batch.length) { insertMany(batch); total += batch.length; }
        resolve();
      });

      rl.on('error', reject);
    });

    db.close();

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    log(`${state}: ${total.toLocaleString()} rows inserted in ${elapsed}s`);
    log(`${state}: TSV retained at ${tsvPath} (delete manually when done)`);
  }

  log('All states complete.');

  // Quick summary from DB
  const db = new Database(NAD_DB, { readonly: true });
  const rows = db.prepare(`
    SELECT state, COUNT(*) AS cnt
    FROM addresses WHERE nad_source='Overture Maps'
    GROUP BY state ORDER BY cnt DESC
  `).all();
  db.close();
  console.log('\nOverture Maps coverage in nad.db:');
  for (const r of rows) {
    console.log(`  ${r.state}: ${r.cnt.toLocaleString()}`);
  }
})();
