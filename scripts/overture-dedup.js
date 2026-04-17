#!/usr/bin/env node
/**
 * Overture Maps — Deduplicate
 * For each Overture row, keep the first inserted (min rowid) per nad_uuid.
 * Removes the ~8M dupes caused by the parallel + sequential double-import.
 */
'use strict';

const path     = require('path');
const Database = require('better-sqlite3');

const NAD_DB = path.join(__dirname, 'data', 'nad.db');
const log    = (...a) => console.log(`[dedup]`, ...a);

const db = new Database(NAD_DB);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 60000');
db.pragma('cache_size = -131072'); // 128 MB

// States that may have dupes (the ones that ran multiple times)
const DEDUP_STATES = ['FL', 'NJ', 'NH'];

for (const state of DEDUP_STATES) {
  const before = db.prepare(
    "SELECT COUNT(*) AS c FROM addresses WHERE nad_source='Overture Maps' AND state=?"
  ).get(state).c;

  log(`${state}: ${before.toLocaleString()} rows before dedup`);

  const t0 = Date.now();

  // Delete all overture rows for this state where rowid is not the minimum for that nad_uuid
  const result = db.prepare(`
    DELETE FROM addresses
    WHERE nad_source = 'Overture Maps'
      AND state = ?
      AND rowid NOT IN (
        SELECT MIN(rowid)
        FROM addresses
        WHERE nad_source = 'Overture Maps'
          AND state = ?
        GROUP BY nad_uuid
      )
  `).run(state, state);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const after = before - result.changes;
  log(`${state}: removed ${result.changes.toLocaleString()} dupes → ${after.toLocaleString()} unique rows (${elapsed}s)`);
}

log('Running VACUUM to reclaim space…');
const t0 = Date.now();
db.prepare('VACUUM').run();
log(`VACUUM done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
db.close();

// Final summary
const db2 = new Database(NAD_DB, { readonly: true });
const total = db2.prepare('SELECT COUNT(*) AS c FROM addresses').get().c;
const rows  = db2.prepare(
  "SELECT state, COUNT(*) AS cnt FROM addresses WHERE nad_source='Overture Maps' GROUP BY state ORDER BY cnt DESC"
).all();
db2.close();

console.log(`\nTotal addresses: ${total.toLocaleString()}`);
console.log('Overture Maps coverage:');
rows.filter(r => r.state && r.state.length === 2).forEach(r =>
  console.log(`  ${r.state}: ${r.cnt.toLocaleString()}`)
);
