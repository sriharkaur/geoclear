'use strict';
/**
 * NAD API Key Management
 * ======================
 * SQLite-backed key store. Generates, validates, and revokes API keys.
 * Each key tracks: tier, owner email, usage count, rate limits.
 *
 * Tiers:
 *   free       — 1K req/day, 10 req/min, no bulk, no enrichment
 *   starter    — 50K req/day, 100 req/min, bulk up to 100
 *   pro        — 500K req/day, 1K req/min, bulk up to 1000, +census/FEMA
 *   enterprise — unlimited, custom rate limits
 *
 * Usage:
 *   const keys = new KeyStore();
 *   const { key } = keys.generate({ email: 'user@co.com', tier: 'starter' });
 *   keys.validate(key);  // → { valid: true, tier: 'starter', ... }
 */

const path     = require('path');
const fs       = require('fs');
const Database = require('better-sqlite3');
const crypto   = require('crypto');

const DB_PATH = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'keys.db');

const TIERS = {
  free:           { req_per_day: 1_000,       req_per_min: 10,   bulk_max: 0,    enrichment: false, enrichment_monthly_limit: 0,    sla: false, price_usd: 0,    metered: false },
  starter:        { req_per_day: 50_000,      req_per_min: 100,  bulk_max: 100,  enrichment: true,  enrichment_monthly_limit: 500,  sla: false, price_usd: 49,   metered: false },
  pro:            { req_per_day: 500_000,     req_per_min: 1000, bulk_max: 1000, enrichment: true,  enrichment_monthly_limit: null, sla: false, price_usd: 249,  metered: false },
  pro_compliance: { req_per_day: 500_000,     req_per_min: 1000, bulk_max: 1000, enrichment: true,  enrichment_monthly_limit: null, sla: true,  price_usd: 499,  metered: false },
  metered:        { req_per_day: 999_999_999, req_per_min: 500,  bulk_max: 1000, enrichment: false, enrichment_monthly_limit: 0,    sla: false, price_usd: null, metered: true  },
  enterprise:     { req_per_day: 999_999_999, req_per_min: 9999, bulk_max: 1000, enrichment: true,  enrichment_monthly_limit: null, sla: true,  price_usd: null, metered: false },
};

class KeyStore {
  constructor(dbPath = DB_PATH) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this._init();
  }

  _init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        key          TEXT    NOT NULL UNIQUE,
        tier         TEXT    NOT NULL DEFAULT 'free',
        email        TEXT,
        name         TEXT,
        is_active    INTEGER NOT NULL DEFAULT 1,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
        revoked_at   TEXT,
        notes        TEXT,

        -- Usage tracking (resets daily)
        requests_today INTEGER NOT NULL DEFAULT 0,
        requests_total INTEGER NOT NULL DEFAULT 0,
        last_used_at   TEXT,
        last_reset_at  TEXT    NOT NULL DEFAULT (date('now'))
      );

      CREATE TABLE IF NOT EXISTS usage_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        key_id     INTEGER NOT NULL REFERENCES api_keys(id),
        endpoint   TEXT,
        status     INTEGER,
        ts         TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_keys_key      ON api_keys(key);
      CREATE INDEX IF NOT EXISTS idx_keys_email    ON api_keys(email);
      CREATE INDEX IF NOT EXISTS idx_usage_key_ts  ON usage_log(key_id, ts);

      CREATE TABLE IF NOT EXISTS stripe_sessions (
        session_id   TEXT NOT NULL PRIMARY KEY,
        tier         TEXT NOT NULL,
        email        TEXT NOT NULL,
        api_key      TEXT,
        created_at   TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS address_signals (
        nad_uuid            TEXT    NOT NULL PRIMARY KEY,
        query_count         INTEGER NOT NULL DEFAULT 1,
        last_queried_at     TEXT    NOT NULL DEFAULT (datetime('now')),
        fraud_signal_count  INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_signals_count ON address_signals(query_count DESC);

      CREATE TABLE IF NOT EXISTS address_outcomes (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        nad_uuid       TEXT    NOT NULL,
        key_id         INTEGER NOT NULL REFERENCES api_keys(id),
        outcome_type   TEXT    NOT NULL,
        outcome_value  REAL,
        metadata_json  TEXT,
        reported_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_outcomes_uuid ON address_outcomes(nad_uuid);
      CREATE INDEX IF NOT EXISTS idx_outcomes_key  ON address_outcomes(key_id);
      CREATE INDEX IF NOT EXISTS idx_outcomes_type ON address_outcomes(outcome_type, nad_uuid);

      CREATE TABLE IF NOT EXISTS data_sources (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id        TEXT    NOT NULL UNIQUE,
        name             TEXT    NOT NULL,
        publisher        TEXT    NOT NULL,
        license          TEXT,
        role             TEXT    NOT NULL,
        description      TEXT,
        coverage         TEXT,
        api_url          TEXT,
        format           TEXT,
        auth_required    INTEGER NOT NULL DEFAULT 0,
        pipeline_script  TEXT,
        attributes_json  TEXT,
        use_cases        TEXT,
        last_sourced_at  TEXT,
        next_refresh_at  TEXT,
        refresh_cadence  TEXT,
        row_count        INTEGER,
        status           TEXT    NOT NULL DEFAULT 'active',
        notes            TEXT,
        created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // ── Seed data_sources ─────────────────────────────────────────
    const seedSources = this.db.prepare(`
      INSERT OR IGNORE INTO data_sources
        (source_id, name, publisher, license, role, description, coverage, api_url, format,
         auth_required, pipeline_script, attributes_json, use_cases,
         last_sourced_at, next_refresh_at, refresh_cadence, row_count, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const seedTx = this.db.transaction(() => {
      seedSources.run(
        'nad', 'National Address Database (NAD r22)', 'US Department of Transportation (USDOT)',
        'Public domain', 'foundational',
        'Primary US address corpus. ~47 states, 120M+ addresses. Updated quarterly by USDOT.',
        '47 states, 120,160,305 addresses',
        'https://data.transportation.gov/download/fc2s-wawr/application/x-zip-compressed',
        'CSV, UTF-8 BOM, 60 columns (~38 GB uncompressed, NAD_r22.txt)',
        0, 'download.js',
        JSON.stringify(['add_number','st_name','unit','post_city','inc_muni','state','zip_code','plus4','county','latitude','longitude','placement','addr_type','deliver_typ','parcel_src','parcel_id','anom_status','add_auth']),
        'Address search (/api/address), autocomplete (/api/suggest), proximity (/api/near), geographic hierarchy, confidence scoring, residential classification',
        '2026-04-14', '2026-07-15', 'Quarterly (USDOT ~4x/year)', 120160305, 'active',
        'NAD r22. Next: r23 expected ~Q3 2026. Monitor data.transportation.gov.'
      );
      seedSources.run(
        'overture', 'Overture Maps Foundation Addresses (2026-02-18.0)', 'Overture Maps Foundation',
        'CDLA Permissive 2.0', 'foundational',
        'Open-source address gap-fill for states with incomplete NAD coverage. Apache 2.0 contributors: Apple, Meta, Microsoft, Amazon.',
        '16+ states, 64,900,000 addresses',
        's3://overturemaps-us-west-2/release/2026-02-18.0/theme=addresses/type=address',
        'GeoParquet (.zstd.parquet), partitioned by bounding box',
        0, 'overture-import.js',
        JSON.stringify(['id','number','street','unit','postal_city','region','postcode','latitude','longitude','bbox','sources','version']),
        'Gap-fill for FL, MI, NJ, NV, NH, CA, PA, GA and more. Combined corpus: 198,657,535 addresses.',
        '2026-04-14', null, 'Quarterly; align with NAD refresh', 64900000, 'active',
        'release 2026-02-18.0. Monitor overturemaps.org for new releases. Dedup key: nad_uuid = overture id.'
      );
      seedSources.run(
        'census_tiger', 'US Census Bureau TIGER/Line Geocoder', 'US Census Bureau',
        'Public domain', 'enrichment_live',
        'Federal geocoding API returning census geography (tracts, block groups, GEOIDs) for any lat/lon.',
        'All US addresses',
        'https://geocoding.geo.census.gov/geocoder/geographies/coordinates',
        'JSON REST API',
        0, null,
        JSON.stringify(['census_tract','census_block_grp','census_geoid','state_fips','county_fips','block_code']),
        '/api/enrich (census_tract, census_block_grp, census_geoid). HMDA and CRA compliance reporting.',
        null, null, 'Live API — no refresh needed; vintage updated annually by Census', null, 'active',
        'LRU cache ~10K entries. Census tract boundaries change every 10 years (next: 2030).'
      );
      seedSources.run(
        'fema_nfhl', 'FEMA National Flood Hazard Layer (NFHL)', 'FEMA',
        'Public domain', 'enrichment_live',
        'Authoritative FEMA flood hazard zones for insurance, lending, and NFIP compliance. Primary competitive differentiator for GeoClear.',
        'All US addresses',
        'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query',
        'ArcGIS FeatureServer JSON (layer 28: S_FLD_HAZ_AR)',
        0, null,
        JSON.stringify(['flood_zone','flood_sfha','community_name','dfirm_panel','flood_ar_id']),
        '/api/enrich (flood_zone, flood_sfha, flood_community). Risk score disaster dimension. NFIP compliance. Insurance underwriting. Mortgage origination.',
        null, null, 'Live API — FEMA updates NFHL continuously; no action needed', null, 'active',
        'Primary value prop. Manual flood determination = $3-$15/address; we return it free. LRU cache ~10K entries.'
      );
      seedSources.run(
        'usgs_3dep', 'USGS 3D Elevation Program (3DEP) EPQS', 'US Geological Survey (USGS)',
        'Public domain', 'enrichment_live',
        'Ground elevation data from 1m lidar (where available) or 10m fallback for any US lat/lon.',
        'All US addresses',
        'https://epqs.nationalmap.gov/v1/json',
        'JSON REST API',
        0, null,
        JSON.stringify(['elevation_ft']),
        '/api/enrich (elevation_ft). Disaster risk context. Insurance underwriting. Construction/development compliance.',
        null, null, 'Live API — USGS updates 3DEP lidar coverage continuously; no action needed', null, 'active',
        '1m lidar resolution where available, ~10m fallback. LRU cache ~10K entries.'
      );
      seedSources.run(
        'usfs_whp', 'USFS Wildfire Hazard Potential (WHP)', 'US Forest Service (USFS) via Esri Living Atlas',
        'Public domain', 'enrichment_cached',
        'County-level wildfire risk assessment on a 1-5 scale (Very Low to Very High). Imported into risk.db.',
        '3,108 US counties',
        'https://services.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/USA_Wildfire_Hazard_Potential/FeatureServer/2/query',
        'ArcGIS FeatureServer JSON, 1,000-row pagination',
        0, 'wildfire-import.js',
        JSON.stringify(['county_fips','county_name','state_abbrev','whp_class','whp_mean','whp_majority','whp_median']),
        '/v1/risk (data.wildfire dimension). County-level wildfire risk for insurance underwriting, real estate disclosure, lender risk.',
        '2026-04-17', '2026-10-01', 'Annual (USFS updates WHP ~Q4 each year)', 3108, 'active',
        'Stored in risk.db table county_wildfire. Next refresh: 2026-10-01. Cross-reference with CAL FIRE for CA addresses.'
      );
      seedSources.run(
        'noaa_storm', 'NOAA Storm Events Database', 'NOAA National Centers for Environmental Information (NCEI)',
        'Public domain', 'enrichment_cached',
        '10-year rolling aggregate of storm events (tornado, hurricane, hail, flood) by county. Imported into risk.db.',
        '3,257 US counties',
        'https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/',
        'Gzipped CSV per year (StormEvents_details-ftp_v1.0_d{YEAR}_c{YEAR+1}*.csv.gz)',
        0, 'storm-import.js',
        JSON.stringify(['county_fips','state_code','county_name','event_count','tornado_count','hurricane_count','hail_count','flood_count','years_covered']),
        '/v1/risk (data.storm dimension). County-level storm frequency for insurance underwriting, property risk, lender diligence.',
        '2026-04-17', '2027-03-01', 'Annual (NOAA publishes full-year data ~Q1 of following year)', 3257, 'active',
        '10-year window: 2015-2024. Stored in risk.db table county_storm. Next refresh 2027-03-01 for 2026 data. Roll window: drop oldest year, add new.'
      );
      seedSources.run(
        'calfire_fhsz', 'CAL FIRE Fire Hazard Severity Zones (FHSZ)', 'California Department of Forestry and Fire Protection (CAL FIRE)',
        'Public domain (California state)', 'enrichment_cached',
        'Parcel-level fire hazard severity zones for California. More granular than USFS WHP for CA addresses. Grid-rasterized for O(1) lat/lon lookup.',
        'California only',
        'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/FHSZ_SRA/FeatureServer/0/query',
        'ArcGIS FeatureServer JSON with polygon geometry (SRA + LRA layers)',
        0, 'calfire-import.js',
        JSON.stringify(['fhsz_class','county','source_type']),
        '/v1/risk (data.cal_fire dimension). California fire hazard risk for insurance, real estate disclosure (CA law requires FHSZ disclosure at sale).',
        null, null, 'Ad hoc — triggered by CAL FIRE re-designation events (every 3-5 years)', null, 'blocked',
        'BLOCKED: ArcGIS endpoint (services1.arcgis.com/jUJYIo9tSA7EHvfZ) returning Invalid URL as of 2026-04-17. Need updated URL from gis.data.ca.gov.'
      );
      seedSources.run(
        'openaddresses', 'OpenAddresses', 'OpenAddresses community (global contributors)',
        'ODbL — Open Data Commons Open Database License', 'planned',
        'Community-sourced address dataset covering ~50M additional US addresses not in NAD or Overture.',
        '~50M additional US addresses',
        'https://batch.openaddresses.io/api/collections',
        'Gzipped CSV per state (LON,LAT,NUMBER,STREET,UNIT,CITY,DISTRICT,REGION,POSTCODE,ID,HASH)',
        0, 'openaddresses-import.js',
        JSON.stringify(['longitude','latitude','number','street','unit','city','district','region','postcode','id','hash']),
        'Planned: expand corpus to ~250M total addresses. Improve rural ZIP+4 coverage.',
        null, null, 'Continuous community updates; snapshot every ~6 months', 50000000, 'planned',
        'PENDING: ODbL share-alike may complicate commercial API usage. Legal review required before import.'
      );
    });
    seedTx();

    // ── Migrations ────────────────────────────────────────────────
    try { this.db.exec(`ALTER TABLE api_keys ADD COLUMN stripe_subscription_id TEXT`); } catch (_) {}
    try { this.db.exec(`ALTER TABLE api_keys ADD COLUMN stripe_customer_id TEXT`); } catch (_) {}
    try { this.db.exec(`ALTER TABLE api_keys ADD COLUMN metered_unreported INTEGER NOT NULL DEFAULT 0`); } catch (_) {}
    try { this.db.exec(`CREATE INDEX IF NOT EXISTS idx_keys_sub ON api_keys(stripe_subscription_id)`); } catch (_) {}
    try { this.db.exec(`ALTER TABLE api_keys ADD COLUMN enrichment_calls_month INTEGER NOT NULL DEFAULT 0`); } catch (_) {}
    try { this.db.exec(`ALTER TABLE api_keys ADD COLUMN enrichment_month TEXT NOT NULL DEFAULT (strftime('%Y-%m', 'now'))`); } catch (_) {}
    try { this.db.exec(`ALTER TABLE api_keys ADD COLUMN first_call_at TEXT`); } catch (_) {}
    try { this.db.exec(`ALTER TABLE usage_log ADD COLUMN latency_ms INTEGER`); } catch (_) {}
    try { this.db.exec(`ALTER TABLE usage_log ADD COLUMN tier TEXT`); } catch (_) {}
    try { this.db.exec(`ALTER TABLE api_keys ADD COLUMN drip_sent TEXT NOT NULL DEFAULT ''`); } catch (_) {}

    // ── Security migration: hash existing plaintext keys ──────────
    // Add columns idempotently (SQLite has no IF NOT EXISTS for ADD COLUMN)
    try { this.db.exec(`ALTER TABLE api_keys ADD COLUMN key_hash   TEXT`); } catch (_) {}
    try { this.db.exec(`ALTER TABLE api_keys ADD COLUMN key_prefix TEXT`); } catch (_) {}
    try { this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_keys_hash ON api_keys(key_hash)`); } catch (_) {}

    // Backfill rows that pre-date hashing: hash the raw key, scrub it, store prefix
    const unhashed = this.db.prepare(`SELECT id, key FROM api_keys WHERE key_hash IS NULL`).all();
    if (unhashed.length > 0) {
      const upd = this.db.prepare(
        `UPDATE api_keys SET key_hash=?, key_prefix=?, key=? WHERE id=?`
      );
      this.db.transaction(() => {
        for (const row of unhashed) {
          const hash   = crypto.createHash('sha256').update(row.key).digest('hex');
          const prefix = row.key.slice(0, 24);
          upd.run(hash, prefix, prefix, row.id);
        }
      })();
    }

    // Seed a default dev key if none exist
    const count = this.db.prepare('SELECT COUNT(*) AS n FROM api_keys').get().n;
    if (count === 0) {
      this.generate({ email: 'dev@localhost', name: 'Dev Key', tier: 'pro', key: 'nad_dev_localtest' });
    }
  }

  /** Generate a new API key — raw key returned once, never stored plaintext */
  generate({ email = null, name = null, tier = 'free', notes = null, key = null } = {}) {
    const rawKey = key || `nad_${tier}_${crypto.randomBytes(16).toString('hex')}`;
    const hash   = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.slice(0, 24);
    this.db.prepare(`
      INSERT INTO api_keys (key, key_hash, key_prefix, tier, email, name, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(prefix, hash, prefix, tier, email, name, notes);
    return { key: rawKey, prefix, tier, email, name, limits: TIERS[tier] };
  }

  /** Validate a key — hashes input and compares to stored hash */
  validate(key) {
    if (!key) return null;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const row  = this.db.prepare(`
      SELECT id, key_prefix, tier, email, name, is_active,
             requests_today, requests_total, last_reset_at,
             last_used_at, created_at
      FROM api_keys WHERE key_hash = ?
    `).get(hash);

    if (!row || !row.is_active) return null;

    // Reset daily counter if day has changed
    const today = new Date().toISOString().slice(0, 10);
    if (row.last_reset_at !== today) {
      this.db.prepare(`
        UPDATE api_keys SET requests_today=0, last_reset_at=? WHERE id=?
      `).run(today, row.id);
      row.requests_today = 0;
    }

    const limits = TIERS[row.tier] || TIERS.free;
    return {
      valid:          true,
      key_id:         row.id,
      tier:           row.tier,
      email:          row.email,
      name:           row.name,
      limits,
      requests_today: row.requests_today,
      requests_total: row.requests_total,
      created_at:     row.created_at,
    };
  }

  /** Record a request for a key (non-blocking — fire-and-forget) */
  recordUsage(keyId, endpoint, status, latencyMs, tier) {
    try {
      this.db.prepare(`
        UPDATE api_keys
        SET requests_today    = requests_today + 1,
            requests_total    = requests_total + 1,
            metered_unreported = metered_unreported + CASE WHEN tier='metered' THEN 1 ELSE 0 END,
            last_used_at      = datetime('now'),
            first_call_at     = COALESCE(first_call_at, datetime('now'))
        WHERE id = ?
      `).run(keyId);
      // Log only non-200 or sampled 1-in-10 to keep log small
      if (status !== 200 || Math.random() < 0.1) {
        this.db.prepare(`
          INSERT INTO usage_log (key_id, endpoint, status, latency_ms, tier) VALUES (?, ?, ?, ?, ?)
        `).run(keyId, endpoint, status, latencyMs ?? null, tier ?? null);
      }
    } catch (_) { /* non-critical */ }
  }

  /** Revoke a key by its integer id (admin only) */
  revoke(keyId) {
    const info = this.db.prepare(
      `UPDATE api_keys SET is_active=0, revoked_at=datetime('now') WHERE id=?`
    ).run(parseInt(keyId, 10));
    return info.changes > 0;
  }

  /** Upgrade an existing key's tier (or create new if none exists for email) */
  upgradeTier(email, tier, subscriptionId = null, customerId = null) {
    const existing = this.findByEmail(email);
    if (existing) {
      this.db.prepare(
        `UPDATE api_keys SET tier=?, stripe_subscription_id=?, stripe_customer_id=COALESCE(?,stripe_customer_id) WHERE id=?`
      ).run(tier, subscriptionId, customerId, existing.id);
      return { upgraded: true, id: existing.id, tier };
    }
    return null;
  }

  /** Return daily request counts for the last N days for a key */
  getUsageHistory(keyId, days = 30) {
    return this.db.prepare(`
      SELECT date(ts, 'unixepoch') AS day, COUNT(*) AS requests
      FROM usage_log
      WHERE key_id = ?
        AND ts >= strftime('%s', 'now', ? || ' days')
      GROUP BY day
      ORDER BY day ASC
    `).all(keyId, `-${days}`);
  }

  /** Return all metered keys with unreported usage (for Stripe flush) */
  getMeteredKeysWithUsage() {
    return this.db.prepare(`
      SELECT id, email, stripe_customer_id, metered_unreported
      FROM api_keys
      WHERE tier='metered' AND is_active=1 AND metered_unreported > 0
    `).all();
  }

  /** Zero out unreported usage after successful Stripe flush */
  markMeteredFlushed(keyId, quantity) {
    this.db.prepare(`
      UPDATE api_keys SET metered_unreported = MAX(0, metered_unreported - ?) WHERE id=?
    `).run(quantity, keyId);
  }

  /** Downgrade key to free when Stripe subscription is cancelled */
  downgradeBySubscription(subscriptionId) {
    const info = this.db.prepare(
      `UPDATE api_keys SET tier='free', stripe_subscription_id=NULL WHERE stripe_subscription_id=? AND is_active=1`
    ).run(subscriptionId);
    return info.changes > 0;
  }

  /** Change tier when Stripe subscription plan changes (upgrade or downgrade) */
  changeSubscriptionTier(subscriptionId, newTier) {
    const row = this.db.prepare(
      `SELECT id, email, tier FROM api_keys WHERE stripe_subscription_id=? AND is_active=1`
    ).get(subscriptionId);
    if (!row) return null;
    this.db.prepare(`UPDATE api_keys SET tier=? WHERE id=?`).run(newTier, row.id);
    return { id: row.id, email: row.email, oldTier: row.tier, newTier };
  }

  /** Find active key by email (used to prevent duplicate free signups) */
  findByEmail(email) {
    return this.db.prepare(
      `SELECT id, key_prefix, tier, email, is_active FROM api_keys WHERE email=? AND is_active=1 ORDER BY created_at DESC LIMIT 1`
    ).get(email) || null;
  }

  /** List all keys (admin) */
  list({ includeRevoked = false } = {}) {
    const sql = includeRevoked
      ? `SELECT * FROM api_keys ORDER BY created_at DESC`
      : `SELECT * FROM api_keys WHERE is_active=1 ORDER BY created_at DESC`;
    return this.db.prepare(sql).all().map(row => ({
      ...row,
      limits: TIERS[row.tier] || TIERS.free,
    }));
  }

  /** Key stats */
  stats() {
    return {
      total:     this.db.prepare('SELECT COUNT(*) AS n FROM api_keys').get().n,
      active:    this.db.prepare('SELECT COUNT(*) AS n FROM api_keys WHERE is_active=1').get().n,
      by_tier:   this.db.prepare(`
        SELECT tier, COUNT(*) AS n FROM api_keys WHERE is_active=1 GROUP BY tier
      `).all(),
      requests_today: this.db.prepare(
        'SELECT SUM(requests_today) AS n FROM api_keys'
      ).get().n || 0,
      requests_total: this.db.prepare(
        'SELECT SUM(requests_total) AS n FROM api_keys'
      ).get().n || 0,
    };
  }
  /**
   * Check + increment enrichment call counter for metered enrichment tiers (starter).
   * Returns { allowed: bool, used: number, limit: number }
   */
  checkEnrichmentQuota(keyId, monthlyLimit) {
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const row = this.db.prepare(
      `SELECT enrichment_calls_month, enrichment_month FROM api_keys WHERE id = ?`
    ).get(keyId);
    if (!row) return { allowed: false, used: 0, limit: monthlyLimit };
    // Reset counter if month rolled over
    if (row.enrichment_month !== currentMonth) {
      this.db.prepare(
        `UPDATE api_keys SET enrichment_calls_month = 0, enrichment_month = ? WHERE id = ?`
      ).run(currentMonth, keyId);
      row.enrichment_calls_month = 0;
    }
    if (row.enrichment_calls_month >= monthlyLimit) {
      return { allowed: false, used: row.enrichment_calls_month, limit: monthlyLimit };
    }
    this.db.prepare(
      `UPDATE api_keys SET enrichment_calls_month = enrichment_calls_month + 1 WHERE id = ?`
    ).run(keyId);
    return { allowed: true, used: row.enrichment_calls_month + 1, limit: monthlyLimit };
  }

  /** Get keys eligible for Day 3 drip: active ≥3 days, has made ≥1 call, not yet sent */
  getDripDay3Candidates() {
    return this.db.prepare(`
      SELECT id, email, tier, requests_total, first_call_at
      FROM api_keys
      WHERE is_active = 1
        AND first_call_at IS NOT NULL
        AND created_at <= datetime('now', '-2 days')
        AND (drip_sent NOT LIKE '%d3%')
    `).all();
  }

  /** Get keys eligible for Day 7 drip: active ≥7 days, not yet sent */
  getDripDay7Candidates() {
    return this.db.prepare(`
      SELECT id, email, tier, requests_total
      FROM api_keys
      WHERE is_active = 1
        AND created_at <= datetime('now', '-6 days')
        AND (drip_sent NOT LIKE '%d7%')
    `).all();
  }

  /** Mark a drip email as sent for a key */
  markDripSent(keyId, code) {
    this.db.prepare(`
      UPDATE api_keys SET drip_sent = drip_sent || ? WHERE id = ?
    `).run(code, keyId);
  }

  /**
   * Record a query hit for Ground-Truth Graph.
   * Upsert: increment query_count + refresh last_queried_at.
   * Fire-and-forget — caller should not await or handle errors.
   */
  recordAddressQuery(nadUuid) {
    if (!nadUuid) return;
    try {
      this.db.prepare(`
        INSERT INTO address_signals (nad_uuid, query_count, last_queried_at)
        VALUES (?, 1, datetime('now'))
        ON CONFLICT(nad_uuid) DO UPDATE SET
          query_count       = query_count + 1,
          last_queried_at   = datetime('now')
      `).run(nadUuid);
    } catch (_) { /* non-critical */ }
  }

  /** Increment fraud_signal_count for an address (future: called by Risk Score v1) */
  recordFraudSignal(nadUuid) {
    if (!nadUuid) return;
    try {
      this.db.prepare(`
        INSERT INTO address_signals (nad_uuid, query_count, last_queried_at, fraud_signal_count)
        VALUES (?, 1, datetime('now'), 1)
        ON CONFLICT(nad_uuid) DO UPDATE SET
          fraud_signal_count = fraud_signal_count + 1,
          last_queried_at    = datetime('now')
      `).run(nadUuid);
    } catch (_) { /* non-critical */ }
  }

  /** Top queried addresses — useful for fraud/vacancy detection (admin) */
  getTopQueriedAddresses(limit = 100) {
    return this.db.prepare(`
      SELECT nad_uuid, query_count, last_queried_at, fraud_signal_count
      FROM address_signals
      ORDER BY query_count DESC
      LIMIT ?
    `).all(limit);
  }

  getDataSources(status = null) {
    const q = status
      ? `SELECT * FROM data_sources WHERE status = ? ORDER BY role, source_id`
      : `SELECT * FROM data_sources ORDER BY role, source_id`;
    const rows = status ? this.db.prepare(q).all(status) : this.db.prepare(q).all();
    return rows.map(r => ({ ...r, attributes_json: JSON.parse(r.attributes_json || '[]') }));
  }

  updateDataSource(sourceId, fields) {
    const allowed = ['last_sourced_at','next_refresh_at','row_count','status','notes'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
    if (!updates.length) return null;
    const set = updates.map(([k]) => `${k} = ?`).join(', ');
    const vals = [...updates.map(([, v]) => v), sourceId];
    return this.db.prepare(
      `UPDATE data_sources SET ${set}, updated_at = datetime('now') WHERE source_id = ?`
    ).run(...vals);
  }

  // ── Outcome feedback (Risk Score v2) ─────────────────────────────

  static VALID_OUTCOME_TYPES = new Set([
    'delivery_success', 'delivery_failed',
    'fraud_confirmed',  'fraud_cleared',
    'chargeback',       'claim_filed',
  ]);

  recordOutcome(keyId, nadUuid, outcomeType, outcomeValue = null, metadata = null) {
    this.db.prepare(`
      INSERT INTO address_outcomes (nad_uuid, key_id, outcome_type, outcome_value, metadata_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(nadUuid, keyId, outcomeType, outcomeValue, metadata ? JSON.stringify(metadata) : null);

    // Side-effects on address_signals for fraud/chargeback
    if (outcomeType === 'fraud_confirmed' || outcomeType === 'chargeback') {
      this.recordFraudSignal(nadUuid);
    }
  }

  // Returns aggregate outcome stats for one address — used by /v1/risk v2 scoring
  getOutcomeStats(nadUuid) {
    const rows = this.db.prepare(`
      SELECT outcome_type, COUNT(*) AS n
      FROM address_outcomes WHERE nad_uuid = ?
      GROUP BY outcome_type
    `).all(nadUuid);

    const counts = {};
    for (const r of rows) counts[r.outcome_type] = r.n;

    const deliveries = (counts.delivery_success || 0) + (counts.delivery_failed || 0);
    const fraudTotal = (counts.fraud_confirmed  || 0) + (counts.fraud_cleared   || 0);
    return {
      total_outcomes:    rows.reduce((s, r) => s + r.n, 0),
      delivery_success:  counts.delivery_success  || 0,
      delivery_failed:   counts.delivery_failed   || 0,
      fraud_confirmed:   counts.fraud_confirmed   || 0,
      fraud_cleared:     counts.fraud_cleared     || 0,
      chargeback:        counts.chargeback        || 0,
      claim_filed:       counts.claim_filed       || 0,
      delivery_rate:     deliveries > 0 ? (counts.delivery_success || 0) / deliveries : null,
      fraud_rate:        fraudTotal  > 0 ? (counts.fraud_confirmed  || 0) / fraudTotal  : null,
    };
  }

  // Admin: outcome volume by type + top addresses by outcome count
  getOutcomeSummary(limit = 50) {
    const byType = this.db.prepare(`
      SELECT outcome_type, COUNT(*) AS n
      FROM address_outcomes GROUP BY outcome_type ORDER BY n DESC
    `).all();

    const byKey = this.db.prepare(`
      SELECT k.key_prefix, k.email, k.tier, COUNT(o.id) AS submissions
      FROM address_outcomes o JOIN api_keys k ON k.id = o.key_id
      GROUP BY o.key_id ORDER BY submissions DESC LIMIT ?
    `).all(limit);

    const topAddresses = this.db.prepare(`
      SELECT nad_uuid, COUNT(*) AS total,
        SUM(CASE WHEN outcome_type='delivery_failed' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN outcome_type='fraud_confirmed'  THEN 1 ELSE 0 END) AS fraud
      FROM address_outcomes
      GROUP BY nad_uuid ORDER BY total DESC LIMIT ?
    `).all(limit);

    return { by_type: byType, by_key: byKey, top_addresses: topAddresses };
  }

  /** Store a Stripe Checkout session (pre-payment) */
  storeStripeSession(sessionId, tier, email) {
    this.db.prepare(
      `INSERT OR IGNORE INTO stripe_sessions (session_id, tier, email) VALUES (?, ?, ?)`
    ).run(sessionId, tier, email);
  }

  /** Associate a generated API key with a completed Stripe session */
  completeStripeSession(sessionId, apiKey) {
    this.db.prepare(
      `UPDATE stripe_sessions SET api_key = ? WHERE session_id = ?`
    ).run(apiKey, sessionId);
  }

  /** Retrieve a Stripe session record by session ID */
  getStripeSession(sessionId) {
    return this.db.prepare(
      `SELECT * FROM stripe_sessions WHERE session_id = ?`
    ).get(sessionId) || null;
  }
}

module.exports = { KeyStore, TIERS };
