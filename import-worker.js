'use strict';
/**
 * import-worker.js — worker_threads module for bulk TSV import into nad.db
 *
 * Runs in a separate thread so the main Node.js event loop is never blocked.
 * Spawned by the POST /v1/admin/import-tsv-gz-cached endpoint.
 *
 * workerData: { dbPath, cachePath }
 * Messages sent to parent:
 *   { type: 'progress', lineCount, inserted }   — every 1M lines
 *   { type: 'done',     lineCount, inserted }    — on completion
 *   { type: 'error',    message }                — on fatal error
 */
const { workerData, parentPort } = require('worker_threads');
const Database = require('better-sqlite3');
const zlib     = require('zlib');
const readline = require('readline');
const fs       = require('fs');

const { dbPath, cachePath } = workerData;

const COLS = [
  'nad_uuid','add_number','st_name','unit','post_city','inc_muni','state',
  'zip_code','latitude','longitude','addr_type','placement','nad_source',
  'full_address','date_update','date_imported',
];

let db;
try {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -65536');  // 64MB page cache in this worker
} catch (e) {
  parentPort.postMessage({ type: 'error', message: `DB open failed: ${e.message}` });
  process.exit(1);
}

const stmt = db.prepare(`
  INSERT OR IGNORE INTO addresses
    (nad_uuid,add_number,st_name,unit,post_city,inc_muni,state,zip_code,
     latitude,longitude,addr_type,placement,nad_source,full_address,date_update,date_imported)
  VALUES (${COLS.map(() => '?').join(',')})
`);

const insertBatch = db.transaction(rows => {
  let n = 0;
  for (const r of rows) { n += stmt.run(...r).changes; }
  return n;
});

let inserted = 0, lineCount = 0, skipped = 0, batch = [];
const BATCH = 10000;

const gunzip = zlib.createGunzip();
const rl = readline.createInterface({ input: gunzip, crlfDelay: Infinity });

fs.createReadStream(cachePath).pipe(gunzip);

rl.on('line', line => {
  if (!line.trim()) return;
  const parts = line.split('\t');
  if (parts.length < COLS.length) { skipped++; return; }
  batch.push(parts.slice(0, COLS.length).map(v => v === '' ? null : v));
  if (++lineCount % 1000000 === 0) {
    parentPort.postMessage({ type: 'progress', lineCount, inserted, skipped });
  }
  if (batch.length >= BATCH) {
    try { inserted += insertBatch(batch); } catch (e) {
      parentPort.postMessage({ type: 'error', message: `batch at line ${lineCount}: ${e.message}` });
    }
    batch = [];
  }
});

rl.on('close', () => {
  try { if (batch.length) inserted += insertBatch(batch); } catch (e) {
    parentPort.postMessage({ type: 'error', message: `final batch: ${e.message}` });
  }
  db.pragma('synchronous = FULL');
  db.close();
  parentPort.postMessage({ type: 'done', lineCount, inserted, skipped });
});

rl.on('error', e => parentPort.postMessage({ type: 'error', message: `readline: ${e.message}` }));
gunzip.on('error', e => parentPort.postMessage({ type: 'error', message: `gunzip: ${e.message}` }));
