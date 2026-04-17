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
    `);

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
