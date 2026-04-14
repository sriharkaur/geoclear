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
const Database = require('better-sqlite3');
const crypto   = require('crypto');

const DB_PATH = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'keys.db');

const TIERS = {
  free:       { req_per_day: 1_000,       req_per_min: 10,   bulk_max: 0,    enrichment: false, price_usd: 0    },
  starter:    { req_per_day: 50_000,      req_per_min: 100,  bulk_max: 100,  enrichment: false, price_usd: 49   },
  pro:        { req_per_day: 500_000,     req_per_min: 1000, bulk_max: 1000, enrichment: true,  price_usd: 249  },
  enterprise: { req_per_day: 999_999_999, req_per_min: 9999, bulk_max: 1000, enrichment: true,  price_usd: null },
};

class KeyStore {
  constructor(dbPath = DB_PATH) {
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
    `);

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
  recordUsage(keyId, endpoint, status) {
    try {
      this.db.prepare(`
        UPDATE api_keys
        SET requests_today = requests_today + 1,
            requests_total = requests_total + 1,
            last_used_at   = datetime('now')
        WHERE id = ?
      `).run(keyId);
      // Log only non-200 or sampled 1-in-10 to keep log small
      if (status !== 200 || Math.random() < 0.1) {
        this.db.prepare(`
          INSERT INTO usage_log (key_id, endpoint, status) VALUES (?, ?, ?)
        `).run(keyId, endpoint, status);
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
