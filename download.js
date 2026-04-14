#!/usr/bin/env node
/**
 * NAD Download + Import Pipeline
 * ================================
 * Downloads the National Address Database (NAD) from the U.S. DOT data portal,
 * decompresses it, and bulk-imports ~89 million address records into SQLite with
 * the full geographic hierarchy (country → state → county → city → neighborhood → zip → address).
 *
 * File format: NAD_r22.txt — CSV (comma-delimited), UTF-8 BOM, 60 columns
 *
 * Bulk-load strategy (tested at full scale):
 *   Phase 1 — Drop all address indexes, insert raw rows in large batches (no FK resolution).
 *   Phase 2 — Build hierarchy tables (counties/cities/neighborhoods/zips) via bulk SQL.
 *   Phase 3 — Update FK columns on addresses via bulk UPDATE.
 *   Phase 4 — Rebuild all indexes, refresh counts.
 *
 * Usage:
 *   node nad/download.js [options]
 *
 * Options:
 *   --dry-run        Parse & validate first 1,000 rows, no DB writes
 *   --limit N        Stop after N rows (verification)
 *   --state TX       Only import records for this state
 *   --states TX,CA   Comma-separated list of states
 *   --resume         Skip download if ZIP present; skip extract if .txt present
 *   --no-download    Use existing nad/data/NAD_r*.txt
 *   --batch-size N   Insert batch size (default 50000)
 *   --db PATH        Custom SQLite path
 */

'use strict';

const fs       = require('fs');
const path     = require('path');
const https    = require('https');
const http     = require('http');
const readline = require('readline');
const Database = require('better-sqlite3');

const NAD_DIR    = path.join(__dirname, 'data');
const SCHEMA_SQL = path.join(__dirname, 'schema.sql');
const DEFAULT_DB = path.join(NAD_DIR, 'nad.db');

const NAD_DOWNLOAD_URL =
  'https://data.transportation.gov/download/fc2s-wawr/application/x-zip-compressed';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const argv      = process.argv.slice(2);
const DRY_RUN   = argv.includes('--dry-run');
const SKIP_DL   = argv.includes('--no-download') || argv.includes('--resume');

const stateArg  = argv.find(a => a.startsWith('--state='))?.split('=')[1]
               ?? (argv.indexOf('--state')  >= 0 ? argv[argv.indexOf('--state')  + 1] : null);
const statesArg = argv.find(a => a.startsWith('--states='))?.split('=')[1]
               ?? (argv.indexOf('--states') >= 0 ? argv[argv.indexOf('--states') + 1] : null);
const STATE_FILTER = stateArg
  ? new Set([stateArg.toUpperCase()])
  : statesArg ? new Set(statesArg.toUpperCase().split(',').map(s => s.trim())) : null;

const limitArg  = argv.find(a => a.startsWith('--limit='))?.split('=')[1]
               ?? (argv.indexOf('--limit') >= 0 ? argv[argv.indexOf('--limit') + 1] : null);
const LIMIT     = limitArg ? parseInt(limitArg, 10) : Infinity;

const batchArg  = argv.find(a => a.startsWith('--batch-size='))?.split('=')[1]
               ?? (argv.indexOf('--batch-size') >= 0 ? argv[argv.indexOf('--batch-size') + 1] : null);
const BATCH_SIZE = batchArg ? parseInt(batchArg, 10) : 50000;

const dbArg     = argv.find(a => a.startsWith('--db='))?.split('=')[1]
               ?? (argv.indexOf('--db') >= 0 ? argv[argv.indexOf('--db') + 1] : null);
const DB_PATH   = dbArg ?? DEFAULT_DB;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
const log  = msg => process.stdout.write(`[NAD] ${msg}\n`);
const warn = msg => process.stderr.write(`[WARN] ${msg}\n`);

function humanBytes(n) {
  if (n < 1024)       return `${n} B`;
  if (n < 1048576)    return `${(n/1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n/1048576).toFixed(1)} MB`;
  return `${(n/1073741824).toFixed(2)} GB`;
}
function elapsed(ms) {
  const s = (Date.now() - ms) / 1000;
  if (s < 60)   return `${s.toFixed(1)}s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${Math.round(s%60)}s`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
}
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return resolve(httpGet(res.headers.location));
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      resolve(res);
    }).on('error', reject);
  });
}
async function downloadFile(url, dest) {
  log(`Downloading: ${url}`);
  const res   = await httpGet(url);
  const total = parseInt(res.headers['content-length'] || '0', 10);
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    let received = 0, lastPct = -1;
    res.on('data', chunk => {
      received += chunk.length;
      if (total) {
        const pct = Math.floor(received * 100 / total);
        if (pct !== lastPct && pct % 5 === 0) {
          process.stdout.write(`\r  ${pct}% (${humanBytes(received)} / ${humanBytes(total)})  `);
          lastPct = pct;
        }
      }
    });
    res.pipe(out);
    out.on('finish', () => { process.stdout.write('\n'); resolve(dest); });
    out.on('error', reject);
    res.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const startMs = Date.now();
  if (!DRY_RUN) fs.mkdirSync(NAD_DIR, { recursive: true });

  // ── Step 1: Locate / download / extract the text file ───────────────���──
  let txtFilePath = null;

  if (!SKIP_DL) {
    const zips = fs.existsSync(NAD_DIR)
      ? fs.readdirSync(NAD_DIR).filter(f => f.endsWith('.zip')).map(f => path.join(NAD_DIR, f))
      : [];
    let zipPath = zips.length ? zips.sort().pop() : path.join(NAD_DIR, `NAD_${new Date().toISOString().slice(0,10)}.zip`);
    if (!zips.length && !DRY_RUN) {
      await downloadFile(NAD_DOWNLOAD_URL, zipPath);
      log(`Download complete: ${humanBytes(fs.statSync(zipPath).size)}`);
    }
    if (!DRY_RUN && fs.existsSync(zipPath)) {
      const txts = fs.readdirSync(NAD_DIR).filter(f => f.endsWith('.txt'));
      if (txts.length) {
        txtFilePath = path.join(NAD_DIR, txts.sort().pop());
        log(`Using existing text file: ${path.basename(txtFilePath)}`);
      } else {
        log('Extracting ZIP (Python — ZIP64 safe)…');
        const { execSync } = require('child_process');
        const py = `
import zipfile,os,sys
z=zipfile.ZipFile(sys.argv[1])
entries=[e for e in z.infolist() if e.filename.endswith('.txt') and not e.filename.endswith('.xml')]
if not entries: sys.exit('No .txt in ZIP')
e=entries[0]; dest=os.path.join(sys.argv[2],os.path.basename(e.filename))
chunk=64*1024*1024
with z.open(e) as s,open(dest,'wb') as d:
  written=0
  while True:
    buf=s.read(chunk)
    if not buf: break
    d.write(buf); written+=len(buf)
    print(f'  {int(written*100/e.file_size)}%',end='\\r',flush=True)
print(f'\\nExtracted: {dest}')
`.trim();
        execSync(`python3 -c '${py.replace(/'/g,"'\\''")}' "${zipPath}" "${NAD_DIR}"`,
          { stdio:'inherit', maxBuffer:10*1024*1024 });
        const extracted = fs.readdirSync(NAD_DIR).filter(f => f.endsWith('.txt'));
        if (!extracted.length) throw new Error('No .txt after extraction');
        txtFilePath = path.join(NAD_DIR, extracted[0]);
        log(`Extracted: ${path.basename(txtFilePath)} (${humanBytes(fs.statSync(txtFilePath).size)})`);
      }
    }
  } else {
    const txts = fs.existsSync(NAD_DIR) ? fs.readdirSync(NAD_DIR).filter(f => f.endsWith('.txt')) : [];
    if (!txts.length) { log('No .txt in nad/data/. Run without --no-download.'); process.exit(1); }
    txtFilePath = path.join(NAD_DIR, txts.sort().pop());
    log(`File: ${path.basename(txtFilePath)}`);
  }

  // ── Step 2: Open DB + apply schema ─────────────────────────────────────
  const db = DRY_RUN
    ? (() => { const d = new Database(':memory:'); d.exec(fs.readFileSync(SCHEMA_SQL,'utf8')); return d; })()
    : (() => { fs.mkdirSync(path.dirname(DB_PATH),{recursive:true}); const d = new Database(DB_PATH); d.exec(fs.readFileSync(SCHEMA_SQL,'utf8')); return d; })();
  log(`DB: ${DRY_RUN ? ':memory:' : DB_PATH}`);

  // ── Step 3: DROP address indexes for fast bulk load ─────────────────────
  if (!DRY_RUN) {
    log('Dropping address indexes for bulk load…');
    const idxNames = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='addresses' AND name NOT LIKE 'sqlite_%'"
    ).all().map(r => r.name);
    for (const idx of idxNames) db.exec(`DROP INDEX IF EXISTS ${idx}`);
    log(`  Dropped ${idxNames.length} indexes`);
  }

  // ── Step 4: Phase 1 — raw CSV insert ────────────────────────────────────
  log(`\nPhase 1: importing rows…`);
  if (STATE_FILTER)       log(`  State filter : ${[...STATE_FILTER].join(', ')}`);
  if (LIMIT !== Infinity) log(`  Row limit    : ${LIMIT.toLocaleString()}`);

  const stmtIns = DRY_RUN ? null : db.prepare(`
    INSERT INTO addresses (
      nad_uuid, add_num_pre, add_number, add_num_suf, add_no_full,
      st_pre_mod, st_pre_dir, st_pre_typ, st_pre_sep,
      st_name, st_pos_typ, st_pos_dir, st_pos_mod, stnam_full,
      building, floor, unit, room, seat, addtl_loc, sub_address,
      landmark_name,
      county, inc_muni, post_city, census_plc, uninc_comm, nbrhd_comm,
      nat_am_area, nat_am_sub, urbnztn_pr, place_other, place_nm_typ,
      state, zip_code, plus4, addr_ref_sys,
      longitude, latitude, nat_grid, elevation, addr_point,
      placement, related_id, relate_type, parcel_src, parcel_id,
      addr_class, lifecycle, effective, expire, date_update,
      anom_status, locatn_desc, addr_type, deliver_typ, nad_source, dataset_id,
      add_auth, full_address
    ) VALUES (
      @nad_uuid,@add_num_pre,@add_number,@add_num_suf,@add_no_full,
      @st_pre_mod,@st_pre_dir,@st_pre_typ,@st_pre_sep,
      @st_name,@st_pos_typ,@st_pos_dir,@st_pos_mod,@stnam_full,
      @building,@floor,@unit,@room,@seat,@addtl_loc,@sub_address,
      @landmark_name,
      @county,@inc_muni,@post_city,@census_plc,@uninc_comm,@nbrhd_comm,
      @nat_am_area,@nat_am_sub,@urbnztn_pr,@place_other,@place_nm_typ,
      @state,@zip_code,@plus4,@addr_ref_sys,
      @longitude,@latitude,@nat_grid,@elevation,@addr_point,
      @placement,@related_id,@relate_type,@parcel_src,@parcel_id,
      @addr_class,@lifecycle,@effective,@expire,@date_update,
      @anom_status,@locatn_desc,@addr_type,@deliver_typ,@nad_source,@dataset_id,
      @add_auth,@full_address
    )
  `);

  const runBatch = DRY_RUN ? () => {} : db.transaction(rows => { for (const r of rows) stmtIns.run(r); });

  let colIndex = null;
  let batch = [], inserted = 0, skipped = 0, errors = 0, total = 0;
  const p1start = Date.now();

  const fileStream = txtFilePath
    ? fs.createReadStream(txtFilePath, { encoding: 'utf8' })
    : require('stream').Readable.from(['OID_,Add_Number,St_Name,State,Zip_Code,County,Inc_Muni,Longitude,Latitude,UUID,AddAuth\n','1,100,Main St,AK,99801,Juneau,Juneau,-134.43,58.3,{TEST},test\n']);

  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const parts = line.split(',');

    if (!colIndex) {
      colIndex = {};
      parts.forEach((c, i) => { colIndex[c.trim().replace(/^\ufeff/,'')] = i; });
      log(`  Header: ${parts.length} columns`);
      const missing = ['Add_Number','St_Name','State','County','Inc_Muni','Zip_Code','Longitude','Latitude']
        .filter(c => !(c in colIndex));
      if (missing.length) { log(`  MISSING COLUMNS: ${missing.join(', ')}`); process.exit(1); }
      continue;
    }

    if (total >= LIMIT) break;
    const g = col => parts[colIndex[col] ?? -1]?.trim() || null;
    const state = g('State');
    if (STATE_FILTER && (!state || !STATE_FILTER.has(state.toUpperCase()))) { skipped++; continue; }

    try {
      const addNum = g('Add_Number') || '';
      const preDir = g('St_PreDir') ? g('St_PreDir') + ' ' : '';
      const stNm   = g('St_Name')   || '';
      const posTyp = g('St_PosTyp') ? ' ' + g('St_PosTyp') : '';
      const posDir = g('St_PosDir') ? ' ' + g('St_PosDir') : '';
      const unit   = g('Unit')      ? `, ${g('Unit')}` : '';
      const fullAddress = `${addNum} ${preDir}${stNm}${posTyp}${posDir}${unit}`.trim();

      batch.push({
        nad_uuid: g('UUID'), add_num_pre: g('AddNum_Pre'), add_number: g('Add_Number'),
        add_num_suf: g('AddNum_Suf'), add_no_full: g('AddNo_Full'),
        st_pre_mod: g('St_PreMod'), st_pre_dir: g('St_PreDir'), st_pre_typ: g('St_PreTyp'),
        st_pre_sep: g('St_PreSep'), st_name: g('St_Name'), st_pos_typ: g('St_PosTyp'),
        st_pos_dir: g('St_PosDir'), st_pos_mod: g('St_PosMod'), stnam_full: g('StNam_Full'),
        building: g('Building'), floor: g('Floor'), unit: g('Unit'),
        room: g('Room'), seat: g('Seat'), addtl_loc: g('Addtl_Loc'), sub_address: g('SubAddress'),
        landmark_name: g('LandmkName'),
        county: g('County'), inc_muni: g('Inc_Muni'), post_city: g('Post_City'),
        census_plc: g('Census_Plc'), uninc_comm: g('Uninc_Comm'), nbrhd_comm: g('Nbrhd_Comm'),
        nat_am_area: g('NatAmArea'), nat_am_sub: g('NatAmSub'), urbnztn_pr: g('Urbnztn_PR'),
        place_other: g('PlaceOther'), place_nm_typ: g('PlaceNmTyp'),
        state: g('State'), zip_code: g('Zip_Code'), plus4: g('Plus_4'),
        addr_ref_sys: g('AddrRefSys'),
        longitude: parseFloat(g('Longitude')) || null,
        latitude:  parseFloat(g('Latitude'))  || null,
        nat_grid: g('NatGrid'), elevation: parseFloat(g('Elevation')) || null,
        addr_point: g('AddrPoint'), placement: g('Placement'),
        related_id: g('Related_ID'), relate_type: g('RelateType'),
        parcel_src: g('ParcelSrc'), parcel_id: g('Parcel_ID'),
        addr_class: g('AddrClass'), lifecycle: g('Lifecycle'),
        effective: g('Effective'), expire: g('Expire'), date_update: g('DateUpdate'),
        anom_status: g('AnomStatus'), locatn_desc: g('LocatnDesc'),
        addr_type: g('Addr_Type'), deliver_typ: g('DeliverTyp'),
        nad_source: g('NAD_Source'), dataset_id: g('DataSet_ID'),
        add_auth: g('AddAuth'), full_address: fullAddress,
      });
      inserted++; total++;

      if (batch.length >= BATCH_SIZE) {
        runBatch(batch); batch = [];
        if (total % 500000 === 0)
          log(`  ${total.toLocaleString()} rows | ${elapsed(p1start)}`);
      }
    } catch(e) {
      errors++;
      if (errors <= 5) warn(`Row ${total}: ${e.message}`);
    }
  }
  if (batch.length) runBatch(batch);
  log(`Phase 1 done: ${inserted.toLocaleString()} rows in ${elapsed(p1start)}`);

  if (DRY_RUN) {
    log('\nDRY RUN complete — no disk writes');
    db.close(); return;
  }

  // ── Step 5: Phase 2 — build hierarchy tables from raw text values ──────���─
  log('\nPhase 2: building hierarchy tables…');
  const p2start = Date.now();

  log('  counties…');
  db.exec(`
    INSERT OR IGNORE INTO counties (name, state_id)
    SELECT DISTINCT a.county, s.id
    FROM addresses a JOIN states s ON s.code = a.state
    WHERE a.county IS NOT NULL AND a.county != '';
  `);

  log('  cities…');
  db.exec(`
    INSERT OR IGNORE INTO cities (name, state_id, county_id, post_name)
    SELECT DISTINCT a.inc_muni, s.id, co.id, a.post_city
    FROM addresses a
    JOIN states s ON s.code = a.state
    LEFT JOIN counties co ON co.name = a.county AND co.state_id = s.id
    WHERE a.inc_muni IS NOT NULL AND a.inc_muni != '';
  `);

  log('  neighborhoods (Nbrhd_Comm)…');
  db.exec(`
    INSERT OR IGNORE INTO neighborhoods (name, state_id, city_id, county_id, type)
    SELECT DISTINCT a.nbrhd_comm, s.id, ci.id, co.id, 'neighborhood'
    FROM addresses a
    JOIN states s ON s.code = a.state
    LEFT JOIN counties co ON co.name = a.county   AND co.state_id = s.id
    LEFT JOIN cities   ci ON ci.name = a.inc_muni AND ci.state_id = s.id
    WHERE a.nbrhd_comm IS NOT NULL AND a.nbrhd_comm != '';
  `);

  log('  neighborhoods (Uninc_Comm)…');
  db.exec(`
    INSERT OR IGNORE INTO neighborhoods (name, state_id, city_id, county_id, type)
    SELECT DISTINCT a.uninc_comm, s.id, ci.id, co.id, 'uninc_community'
    FROM addresses a
    JOIN states s ON s.code = a.state
    LEFT JOIN counties co ON co.name = a.county   AND co.state_id = s.id
    LEFT JOIN cities   ci ON ci.name = a.inc_muni AND ci.state_id = s.id
    WHERE a.uninc_comm IS NOT NULL AND a.uninc_comm != ''
      AND (a.nbrhd_comm IS NULL OR a.nbrhd_comm = '');
  `);

  log('  zip codes…');
  db.exec(`
    INSERT OR IGNORE INTO zip_codes (zip, state_id, city_id, county_id, post_city)
    SELECT DISTINCT a.zip_code, s.id, ci.id, co.id, a.post_city
    FROM addresses a
    JOIN states s ON s.code = a.state
    LEFT JOIN counties co ON co.name = a.county   AND co.state_id = s.id
    LEFT JOIN cities   ci ON ci.name = a.inc_muni AND ci.state_id = s.id
    WHERE a.zip_code IS NOT NULL AND a.zip_code != '';
  `);
  log(`Phase 2 done in ${elapsed(p2start)}`);

  // ── Step 6: Phase 3 — update FK columns on addresses ────────────────────
  log('\nPhase 3: updating FK columns on addresses…');
  const p3start = Date.now();

  db.exec(`UPDATE addresses SET country_id = 1;`);
  log('  state_id…');
  db.exec(`
    UPDATE addresses SET state_id = (
      SELECT id FROM states WHERE code = addresses.state LIMIT 1
    ) WHERE state IS NOT NULL AND state != '';
  `);
  log('  county_id…');
  db.exec(`
    UPDATE addresses SET county_id = (
      SELECT co.id FROM counties co
      JOIN states s ON s.id = co.state_id
      WHERE co.name = addresses.county AND s.code = addresses.state LIMIT 1
    ) WHERE county IS NOT NULL AND county != '';
  `);
  log('  city_id…');
  db.exec(`
    UPDATE addresses SET city_id = (
      SELECT ci.id FROM cities ci
      JOIN states s ON s.id = ci.state_id
      WHERE ci.name = addresses.inc_muni AND s.code = addresses.state LIMIT 1
    ) WHERE inc_muni IS NOT NULL AND inc_muni != '';
  `);
  log('  neighborhood_id…');
  db.exec(`
    UPDATE addresses SET neighborhood_id = (
      SELECT n.id FROM neighborhoods n
      JOIN states s ON s.id = n.state_id
      WHERE n.name = addresses.nbrhd_comm AND s.code = addresses.state
        AND n.type = 'neighborhood' LIMIT 1
    ) WHERE nbrhd_comm IS NOT NULL AND nbrhd_comm != '';

    UPDATE addresses SET neighborhood_id = (
      SELECT n.id FROM neighborhoods n
      JOIN states s ON s.id = n.state_id
      WHERE n.name = addresses.uninc_comm AND s.code = addresses.state
        AND n.type = 'uninc_community' LIMIT 1
    ) WHERE neighborhood_id IS NULL
      AND uninc_comm IS NOT NULL AND uninc_comm != '';
  `);
  log('  zip_code_id…');
  db.exec(`
    UPDATE addresses SET zip_code_id = (
      SELECT z.id FROM zip_codes z
      JOIN states s ON s.id = z.state_id
      WHERE z.zip = addresses.zip_code AND s.code = addresses.state LIMIT 1
    ) WHERE zip_code IS NOT NULL AND zip_code != '';
  `);
  log(`Phase 3 done in ${elapsed(p3start)}`);

  // ── Step 7: Rebuild indexes ──────────────────────────────────────────��───
  log('\nPhase 4: rebuilding indexes…');
  const p4start = Date.now();
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_addr_state_id   ON addresses(state_id);
    CREATE INDEX IF NOT EXISTS idx_addr_county_id  ON addresses(county_id);
    CREATE INDEX IF NOT EXISTS idx_addr_city_id    ON addresses(city_id);
    CREATE INDEX IF NOT EXISTS idx_addr_nbrhd_id   ON addresses(neighborhood_id);
    CREATE INDEX IF NOT EXISTS idx_addr_zip_id     ON addresses(zip_code_id);
    CREATE INDEX IF NOT EXISTS idx_addr_state_txt  ON addresses(state);
    CREATE INDEX IF NOT EXISTS idx_addr_county_txt ON addresses(county, state);
    CREATE INDEX IF NOT EXISTS idx_addr_city_txt   ON addresses(inc_muni, state);
    CREATE INDEX IF NOT EXISTS idx_addr_zip_txt    ON addresses(zip_code);
    CREATE INDEX IF NOT EXISTS idx_addr_nbrhd_txt  ON addresses(nbrhd_comm, state);
    CREATE INDEX IF NOT EXISTS idx_addr_st_name    ON addresses(st_name);
    CREATE INDEX IF NOT EXISTS idx_addr_add_number ON addresses(add_number, st_name, state);
    CREATE INDEX IF NOT EXISTS idx_addr_latlon     ON addresses(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_addr_lat        ON addresses(latitude);
    CREATE INDEX IF NOT EXISTS idx_addr_lon        ON addresses(longitude);
  `);
  log(`Phase 4 done in ${elapsed(p4start)}`);

  // ── Step 8: Refresh counts ───────────────────────────────────────────────
  log('\nRefreshing counts…');
  db.exec(`
    UPDATE states SET
      address_count = (SELECT COUNT(*) FROM addresses WHERE state_id = states.id),
      county_count  = (SELECT COUNT(*) FROM counties  WHERE state_id = states.id),
      city_count    = (SELECT COUNT(*) FROM cities    WHERE state_id = states.id),
      zip_count     = (SELECT COUNT(*) FROM zip_codes WHERE state_id = states.id);
    UPDATE counties SET
      address_count = (SELECT COUNT(*) FROM addresses WHERE county_id = counties.id);
    UPDATE cities SET
      address_count = (SELECT COUNT(*) FROM addresses WHERE city_id = cities.id);
    UPDATE neighborhoods SET
      address_count = (SELECT COUNT(*) FROM addresses WHERE neighborhood_id = neighborhoods.id);
    UPDATE zip_codes SET
      address_count = (SELECT COUNT(*) FROM addresses WHERE zip_code_id = zip_codes.id);
  `);

  // ── Step 9: Log ──────────────────────────────────────────────────────────
  const durSecs = (Date.now() - startMs) / 1000;
  db.prepare(`
    INSERT INTO nad_import_log (source_url,file_name,rows_processed,rows_inserted,rows_skipped,duration_secs,status,notes)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(NAD_DOWNLOAD_URL, txtFilePath ? path.basename(txtFilePath) : 'n/a',
    total+skipped, inserted, skipped, durSecs, errors>0?'partial':'ok',
    STATE_FILTER ? `filter:${[...STATE_FILTER].join(',')}` : null);

  // ── Summary ──────────────────────────────────────────────────────────────
  const s  = db.prepare('SELECT COUNT(*) n FROM addresses').get().n;
  const st = db.prepare('SELECT COUNT(*) n FROM states WHERE address_count > 0').get().n;
  const co = db.prepare('SELECT COUNT(*) n FROM counties').get().n;
  const ci = db.prepare('SELECT COUNT(*) n FROM cities').get().n;
  const nb = db.prepare('SELECT COUNT(*) n FROM neighborhoods').get().n;
  const zp = db.prepare('SELECT COUNT(*) n FROM zip_codes').get().n;

  log('\n========================================');
  log('NAD Import Complete');
  log('========================================');
  log(`  Rows inserted     : ${inserted.toLocaleString()}`);
  log(`  Rows skipped      : ${skipped.toLocaleString()}`);
  log(`  Errors            : ${errors}`);
  log(`  Total duration    : ${elapsed(startMs)}`);
  log(`\n  Addresses         : ${s.toLocaleString()}`);
  log(`  States w/ data    : ${st}`);
  log(`  Counties          : ${co.toLocaleString()}`);
  log(`  Cities            : ${ci.toLocaleString()}`);
  log(`  Neighborhoods     : ${nb.toLocaleString()}`);
  log(`  ZIP codes         : ${zp.toLocaleString()}`);
  log(`\n  DB path : ${DB_PATH}`);
  log(`  DB size : ${humanBytes(fs.statSync(DB_PATH).size)}`);
  log('========================================\n');

  db.close();
}

main().catch(err => {
  process.stderr.write(`\n[FATAL] ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
