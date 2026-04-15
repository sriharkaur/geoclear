'use strict';
/**
 * import-worker.js — worker_threads module for bulk TSV import into nad.db
 *
 * Restart-safe: saves a line-position checkpoint to /data/import-checkpoint.txt
 * every 500K lines. On restart, skips already-processed lines and resumes.
 * Deletes the checkpoint file on successful completion.
 *
 * Runs in a separate thread so the main Node.js event loop is never blocked.
 * Spawned by POST /v1/admin/import-tsv-gz-cached.
 *
 * workerData: { dbPath, cachePath, checkpointPath }
 * Messages to parent:
 *   { type: 'progress', totalLines, lineCount, inserted, skipped }  every 500K lines
 *   { type: 'done',     totalLines, lineCount, inserted, skipped }  on completion
 *   { type: 'error',    message }                                    on fatal error
 */
const { workerData, parentPort } = require('worker_threads');
const Database = require('better-sqlite3');
const zlib     = require('zlib');
const readline = require('readline');
const fs       = require('fs');

const { dbPath, cachePath, checkpointPath } = workerData;

// ── Checkpoint (restart-safe) ────────────────────────────────────────────────
// Stores total raw lines read from the gzip. On resume, skip that many lines.
let resumeFrom = 0;
if (fs.existsSync(checkpointPath)) {
  resumeFrom = parseInt(fs.readFileSync(checkpointPath, 'utf8').trim()) || 0;
  if (resumeFrom > 0)
    parentPort.postMessage({ type: 'progress', message: `Resuming from line ${resumeFrom.toLocaleString()}`, totalLines: resumeFrom, lineCount: 0, inserted: 0, skipped: 0 });
}

// ── DB ───────────────────────────────────────────────────────────────────────
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
  db.pragma('cache_size = -65536');  // 64 MB page cache
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

// ── Stream ───────────────────────────────────────────────────────────────────
let totalLines = 0;   // every line from gzip file (used for checkpointing)
let lineCount  = 0;   // valid lines processed (for progress reporting)
let inserted   = 0;
let skipped    = 0;
let batch      = [];
const BATCH      = 10000;
const CHECKPOINT_EVERY = 500000;  // save position every 500K raw lines (~50 batches)

const gunzip = zlib.createGunzip();
const rl     = readline.createInterface({ input: gunzip, crlfDelay: Infinity });

fs.createReadStream(cachePath).pipe(gunzip);

rl.on('line', line => {
  totalLines++;

  // Skip lines already processed in a previous run
  if (totalLines <= resumeFrom) return;

  if (!line.trim()) return;
  const parts = line.split('\t');
  if (parts.length < COLS.length) { skipped++; return; }

  batch.push(parts.slice(0, COLS.length).map(v => v === '' ? null : v));
  lineCount++;

  // Save checkpoint and report progress every 500K raw lines
  if (totalLines % CHECKPOINT_EVERY === 0) {
    fs.writeFileSync(checkpointPath, String(totalLines));
    parentPort.postMessage({ type: 'progress', totalLines, lineCount, inserted, skipped });
  }

  if (batch.length >= BATCH) {
    try { inserted += insertBatch(batch); } catch (e) {
      parentPort.postMessage({ type: 'error', message: `batch at line ${totalLines}: ${e.message}` });
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

  // Clean up checkpoint — import completed successfully
  try { fs.unlinkSync(checkpointPath); } catch {}

  parentPort.postMessage({ type: 'done', totalLines, lineCount, inserted, skipped });
});

rl.on('error',   e => parentPort.postMessage({ type: 'error', message: `readline: ${e.message}` }));
gunzip.on('error', e => parentPort.postMessage({ type: 'error', message: `gunzip: ${e.message}` }));
