'use strict';
/**
 * NAD API Key Management — Neon PostgreSQL backend
 * Schema lives in migrations/0002-keys-schema.sql (applied once to Neon).
 * All methods are async.
 */

const { Pool } = require('pg');
const crypto   = require('crypto');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL_POOLED || process.env.NEON_DATABASE_URL,
  max: 20,
});

const TIERS = {
  free:           { req_per_day: 1_000,       req_per_min: 10,   bulk_max: 0,    enrichment: false, enrichment_monthly_limit: 0,    sla: false, price_usd: 0,    metered: false },
  starter:        { req_per_day: 50_000,      req_per_min: 100,  bulk_max: 100,  enrichment: true,  enrichment_monthly_limit: 500,  sla: false, price_usd: 49,   metered: false },
  pro:            { req_per_day: 500_000,     req_per_min: 1000, bulk_max: 1000, enrichment: true,  enrichment_monthly_limit: null, sla: false, price_usd: 249,  metered: false },
  pro_compliance: { req_per_day: 500_000,     req_per_min: 1000, bulk_max: 1000, enrichment: true,  enrichment_monthly_limit: null, sla: true,  price_usd: 499,  metered: false },
  metered:        { req_per_day: 999_999_999, req_per_min: 500,  bulk_max: 1000, enrichment: false, enrichment_monthly_limit: 0,    sla: false, price_usd: null, metered: true  },
  enterprise:     { req_per_day: 999_999_999, req_per_min: 9999, bulk_max: 1000, enrichment: true,  enrichment_monthly_limit: null, sla: true,  price_usd: null, metered: false },
};

class KeyStore {
  /** Generate a new API key — raw key returned once, never stored plaintext */
  async generate({ email = null, name = null, tier = 'free', notes = null, key = null } = {}) {
    const rawKey = key || `nad_${tier}_${crypto.randomBytes(16).toString('hex')}`;
    const hash   = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.slice(0, 24);
    await pool.query(
      `INSERT INTO api_keys (key, key_hash, key_prefix, tier, email, name, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [prefix, hash, prefix, tier, email, name, notes]
    );
    return { key: rawKey, prefix, tier, email, name, limits: TIERS[tier] };
  }

  /** Validate a key — hashes input and compares to stored hash */
  async validate(key) {
    if (!key) return null;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const { rows } = await pool.query(
      `SELECT id, key_prefix, tier, email, name, is_active,
              requests_today, requests_total, last_reset_at,
              last_used_at, created_at
       FROM api_keys WHERE key_hash = $1`,
      [hash]
    );
    const row = rows[0];
    if (!row || !row.is_active) return null;

    const today = new Date().toISOString().slice(0, 10);
    // last_reset_at comes back as a Date object from pg
    const lastReset = row.last_reset_at instanceof Date
      ? row.last_reset_at.toISOString().slice(0, 10)
      : String(row.last_reset_at).slice(0, 10);

    if (lastReset !== today) {
      await pool.query(
        `UPDATE api_keys SET requests_today=0, last_reset_at=$1 WHERE id=$2`,
        [today, row.id]
      );
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

  /** Record a request for a key (fire-and-forget — do not await in hot path) */
  recordUsage(keyId, endpoint, status, latencyMs, tier) {
    pool.query(
      `UPDATE api_keys
       SET requests_today     = requests_today + 1,
           requests_total     = requests_total + 1,
           metered_unreported = metered_unreported + CASE WHEN tier='metered' THEN 1 ELSE 0 END,
           last_used_at       = NOW(),
           first_call_at      = COALESCE(first_call_at, NOW())
       WHERE id = $1`,
      [keyId]
    ).catch(() => {});
    if (status !== 200 || Math.random() < 0.1) {
      pool.query(
        `INSERT INTO usage_log (key_id, endpoint, status, latency_ms) VALUES ($1, $2, $3, $4)`,
        [keyId, endpoint, status, latencyMs ?? null]
      ).catch(() => {});
    }
  }

  /** Revoke a key by its integer id (admin only) */
  async revoke(keyId) {
    const { rowCount } = await pool.query(
      `UPDATE api_keys SET is_active=false, revoked_at=NOW() WHERE id=$1`,
      [parseInt(keyId, 10)]
    );
    return rowCount > 0;
  }

  /** Upgrade an existing key's tier */
  async upgradeTier(email, tier, subscriptionId = null, customerId = null) {
    const existing = await this.findByEmail(email);
    if (existing) {
      await pool.query(
        `UPDATE api_keys SET tier=$1, stripe_subscription_id=$2,
         stripe_customer_id=COALESCE($3, stripe_customer_id) WHERE id=$4`,
        [tier, subscriptionId, customerId, existing.id]
      );
      return { upgraded: true, id: existing.id, tier };
    }
    return null;
  }

  /** Return daily request counts for the last N days for a key */
  async getUsageHistory(keyId, days = 30) {
    const { rows } = await pool.query(
      `SELECT ts::DATE AS day, COUNT(*) AS requests
       FROM usage_log
       WHERE key_id = $1 AND ts >= NOW() - ($2 * INTERVAL '1 day')
       GROUP BY ts::DATE
       ORDER BY day ASC`,
      [keyId, days]
    );
    return rows;
  }

  /** Return all metered keys with unreported usage (for Stripe flush) */
  async getMeteredKeysWithUsage() {
    const { rows } = await pool.query(
      `SELECT id, email, stripe_customer_id, metered_unreported
       FROM api_keys WHERE tier='metered' AND is_active=true AND metered_unreported > 0`
    );
    return rows;
  }

  /** Zero out unreported usage after successful Stripe flush */
  markMeteredFlushed(keyId, quantity) {
    pool.query(
      `UPDATE api_keys SET metered_unreported = GREATEST(0, metered_unreported - $1) WHERE id=$2`,
      [quantity, keyId]
    ).catch(() => {});
  }

  /** Downgrade key to free when Stripe subscription is cancelled */
  async downgradeBySubscription(subscriptionId) {
    const { rowCount } = await pool.query(
      `UPDATE api_keys SET tier='free', stripe_subscription_id=NULL
       WHERE stripe_subscription_id=$1 AND is_active=true`,
      [subscriptionId]
    );
    return rowCount > 0;
  }

  /** Change tier when Stripe subscription plan changes */
  async changeSubscriptionTier(subscriptionId, newTier) {
    const { rows } = await pool.query(
      `SELECT id, email, tier FROM api_keys WHERE stripe_subscription_id=$1 AND is_active=true`,
      [subscriptionId]
    );
    const row = rows[0];
    if (!row) return null;
    await pool.query(`UPDATE api_keys SET tier=$1 WHERE id=$2`, [newTier, row.id]);
    return { id: row.id, email: row.email, oldTier: row.tier, newTier };
  }

  /** Find active key by email */
  async findByEmail(email) {
    const { rows } = await pool.query(
      `SELECT id, key_prefix, tier, email, is_active FROM api_keys
       WHERE email=$1 AND is_active=true ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  }

  /** List all keys (admin) */
  async list({ includeRevoked = false } = {}) {
    const sql = includeRevoked
      ? `SELECT * FROM api_keys ORDER BY created_at DESC`
      : `SELECT * FROM api_keys WHERE is_active=true ORDER BY created_at DESC`;
    const { rows } = await pool.query(sql);
    return rows.map(row => ({ ...row, limits: TIERS[row.tier] || TIERS.free }));
  }

  /** Key stats */
  async stats() {
    const [total, active, byTier, today, total_req] = await Promise.all([
      pool.query('SELECT COUNT(*) AS n FROM api_keys'),
      pool.query('SELECT COUNT(*) AS n FROM api_keys WHERE is_active=true'),
      pool.query('SELECT tier, COUNT(*) AS n FROM api_keys WHERE is_active=true GROUP BY tier'),
      pool.query('SELECT COALESCE(SUM(requests_today),0) AS n FROM api_keys'),
      pool.query('SELECT COALESCE(SUM(requests_total),0) AS n FROM api_keys'),
    ]);
    return {
      total:          parseInt(total.rows[0].n, 10),
      active:         parseInt(active.rows[0].n, 10),
      by_tier:        byTier.rows.map(r => ({ tier: r.tier, n: parseInt(r.n, 10) })),
      requests_today: parseInt(today.rows[0].n, 10),
      requests_total: parseInt(total_req.rows[0].n, 10),
    };
  }

  /** Check + increment enrichment call counter (monthly, starter tier) */
  async checkEnrichmentQuota(keyId, monthlyLimit) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { rows } = await pool.query(
      `SELECT enrichment_calls_month, enrichment_month FROM api_keys WHERE id = $1`,
      [keyId]
    );
    const row = rows[0];
    if (!row) return { allowed: false, used: 0, limit: monthlyLimit };

    if (row.enrichment_month !== currentMonth) {
      await pool.query(
        `UPDATE api_keys SET enrichment_calls_month=0, enrichment_month=$1 WHERE id=$2`,
        [currentMonth, keyId]
      );
      row.enrichment_calls_month = 0;
    }
    if (row.enrichment_calls_month >= monthlyLimit) {
      return { allowed: false, used: row.enrichment_calls_month, limit: monthlyLimit };
    }
    await pool.query(
      `UPDATE api_keys SET enrichment_calls_month = enrichment_calls_month + 1 WHERE id=$1`,
      [keyId]
    );
    return { allowed: true, used: row.enrichment_calls_month + 1, limit: monthlyLimit };
  }

  /** Get keys eligible for Day 3 drip */
  async getDripDay3Candidates() {
    const { rows } = await pool.query(
      `SELECT id, email, tier, requests_total, first_call_at FROM api_keys
       WHERE is_active=true
         AND first_call_at IS NOT NULL
         AND created_at <= NOW() - INTERVAL '2 days'
         AND drip_sent NOT LIKE '%d3%'`
    );
    return rows;
  }

  /** Get keys eligible for Day 7 drip */
  async getDripDay7Candidates() {
    const { rows } = await pool.query(
      `SELECT id, email, tier, requests_total FROM api_keys
       WHERE is_active=true
         AND created_at <= NOW() - INTERVAL '6 days'
         AND drip_sent NOT LIKE '%d7%'`
    );
    return rows;
  }

  /** Mark a drip email as sent for a key */
  markDripSent(keyId, code) {
    pool.query(
      `UPDATE api_keys SET drip_sent = drip_sent || $1 WHERE id=$2`,
      [code, keyId]
    ).catch(() => {});
  }

  /** Upsert query hit for Ground-Truth Graph (fire-and-forget) */
  recordAddressQuery(nadUuid) {
    if (!nadUuid) return;
    pool.query(
      `INSERT INTO address_signals (nad_uuid, query_count, last_queried_at)
       VALUES ($1, 1, NOW())
       ON CONFLICT(nad_uuid) DO UPDATE SET
         query_count     = address_signals.query_count + 1,
         last_queried_at = NOW()`,
      [nadUuid]
    ).catch(() => {});
  }

  /** Increment fraud_signal_count for an address */
  recordFraudSignal(nadUuid) {
    if (!nadUuid) return;
    pool.query(
      `INSERT INTO address_signals (nad_uuid, query_count, last_queried_at, fraud_signal_count)
       VALUES ($1, 1, NOW(), 1)
       ON CONFLICT(nad_uuid) DO UPDATE SET
         fraud_signal_count = address_signals.fraud_signal_count + 1,
         last_queried_at    = NOW()`,
      [nadUuid]
    ).catch(() => {});
  }

  /** Top queried addresses (admin) */
  async getTopQueriedAddresses(limit = 100) {
    const { rows } = await pool.query(
      `SELECT nad_uuid, query_count, last_queried_at, fraud_signal_count
       FROM address_signals ORDER BY query_count DESC LIMIT $1`,
      [limit]
    );
    return rows;
  }

  /** Signal row for a single address (for /v1/risk) */
  async getAddressSignal(nadUuid) {
    if (!nadUuid) return { query_count: 0, fraud_signal_count: 0 };
    const { rows } = await pool.query(
      `SELECT query_count, fraud_signal_count FROM address_signals WHERE nad_uuid = $1`,
      [nadUuid]
    );
    return rows[0] || { query_count: 0, fraud_signal_count: 0 };
  }

  /** Count distinct API keys that queried /api/address in last 24h (velocity signal) */
  async getAddressQueryVelocity() {
    const { rows } = await pool.query(
      `SELECT COUNT(DISTINCT key_id) AS n FROM usage_log
       WHERE endpoint = '/api/address' AND ts >= NOW() - INTERVAL '1 day'`
    );
    return rows[0] || { n: 0 };
  }

  /** Address signal totals (for /v1/admin/signals) */
  async getSignalTotals() {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS n, COALESCE(SUM(query_count), 0) AS hits FROM address_signals`
    );
    return rows[0];
  }

  /** Per-key outcome submission count today (for rate limiting) */
  async getOutcomeDailyCount(keyId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS n FROM address_outcomes
       WHERE key_id = $1 AND reported_at >= CURRENT_DATE`,
      [keyId]
    );
    return parseInt(rows[0].n, 10);
  }

  async getDataSources(status = null) {
    const { rows } = status
      ? await pool.query(`SELECT * FROM data_sources WHERE status=$1 ORDER BY role, source_id`, [status])
      : await pool.query(`SELECT * FROM data_sources ORDER BY role, source_id`);
    return rows.map(r => ({
      ...r,
      attributes_json: Array.isArray(r.attributes_json)
        ? r.attributes_json
        : (typeof r.attributes_json === 'string' ? JSON.parse(r.attributes_json || '[]') : r.attributes_json || []),
    }));
  }

  async updateDataSource(sourceId, fields) {
    const allowed = ['last_sourced_at', 'next_refresh_at', 'row_count', 'status', 'notes'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
    if (!updates.length) return null;
    const set  = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const vals = [...updates.map(([, v]) => v), sourceId];
    const { rowCount } = await pool.query(
      `UPDATE data_sources SET ${set}, updated_at=NOW() WHERE source_id = $${vals.length}`,
      vals
    );
    return { changes: rowCount };
  }

  // ── Outcome feedback ─────────────────────────────────────────────

  static VALID_OUTCOME_TYPES = new Set([
    'delivery_success', 'delivery_failed',
    'fraud_confirmed',  'fraud_cleared',
    'chargeback',       'claim_filed',
  ]);

  recordOutcome(keyId, nadUuid, outcomeType, outcomeValue = null, metadata = null) {
    pool.query(
      `INSERT INTO address_outcomes (nad_uuid, key_id, outcome_type, outcome_value, metadata_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [nadUuid, keyId, outcomeType, outcomeValue, metadata ? JSON.stringify(metadata) : null]
    ).catch(() => {});
    if (outcomeType === 'fraud_confirmed' || outcomeType === 'chargeback') {
      this.recordFraudSignal(nadUuid);
    }
  }

  async getOutcomeStats(nadUuid) {
    const { rows } = await pool.query(
      `SELECT outcome_type, COUNT(*) AS n FROM address_outcomes WHERE nad_uuid=$1 GROUP BY outcome_type`,
      [nadUuid]
    );
    const counts = {};
    for (const r of rows) counts[r.outcome_type] = parseInt(r.n, 10);
    const deliveries = (counts.delivery_success || 0) + (counts.delivery_failed || 0);
    const fraudTotal = (counts.fraud_confirmed  || 0) + (counts.fraud_cleared   || 0);
    return {
      total_outcomes:   rows.reduce((s, r) => s + parseInt(r.n, 10), 0),
      delivery_success: counts.delivery_success || 0,
      delivery_failed:  counts.delivery_failed  || 0,
      fraud_confirmed:  counts.fraud_confirmed  || 0,
      fraud_cleared:    counts.fraud_cleared    || 0,
      chargeback:       counts.chargeback       || 0,
      claim_filed:      counts.claim_filed      || 0,
      delivery_rate:    deliveries > 0 ? (counts.delivery_success || 0) / deliveries : null,
      fraud_rate:       fraudTotal  > 0 ? (counts.fraud_confirmed  || 0) / fraudTotal  : null,
    };
  }

  async getOutcomeSummary(limit = 50) {
    const [byType, byKey, topAddresses] = await Promise.all([
      pool.query(
        `SELECT outcome_type, COUNT(*) AS n FROM address_outcomes GROUP BY outcome_type ORDER BY n DESC`
      ),
      pool.query(
        `SELECT k.key_prefix, k.email, k.tier, COUNT(o.id) AS submissions
         FROM address_outcomes o JOIN api_keys k ON k.id=o.key_id
         GROUP BY o.key_id, k.key_prefix, k.email, k.tier ORDER BY submissions DESC LIMIT $1`,
        [limit]
      ),
      pool.query(
        `SELECT nad_uuid, COUNT(*) AS total,
                SUM(CASE WHEN outcome_type='delivery_failed' THEN 1 ELSE 0 END) AS failed,
                SUM(CASE WHEN outcome_type='fraud_confirmed'  THEN 1 ELSE 0 END) AS fraud
         FROM address_outcomes GROUP BY nad_uuid ORDER BY total DESC LIMIT $1`,
        [limit]
      ),
    ]);
    return {
      by_type:       byType.rows,
      by_key:        byKey.rows,
      top_addresses: topAddresses.rows,
    };
  }

  async storeStripeSession(sessionId, tier, email) {
    await pool.query(
      `INSERT INTO stripe_sessions (session_id, tier, email) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [sessionId, tier, email]
    );
  }

  async completeStripeSession(sessionId, apiKey) {
    await pool.query(
      `UPDATE stripe_sessions SET api_key=$1 WHERE session_id=$2`,
      [apiKey, sessionId]
    );
  }

  async getStripeSession(sessionId) {
    const { rows } = await pool.query(
      `SELECT * FROM stripe_sessions WHERE session_id=$1`,
      [sessionId]
    );
    return rows[0] || null;
  }

  // ── Analytics (admin) ────────────────────────────────────────────

  async getAnalytics(days = 30) {
    const [byDay, topKeys, tierBreakdown, errorRate, newSignups, avgLatency] = await Promise.all([
      pool.query(
        `SELECT ts::DATE AS day, COUNT(*) AS requests, COUNT(DISTINCT key_id) AS active_keys
         FROM usage_log WHERE ts >= NOW() - ($1 * INTERVAL '1 day')
         GROUP BY ts::DATE ORDER BY day DESC`,
        [days]
      ),
      pool.query(
        `SELECT email, tier, requests_total, requests_today, last_used_at, first_call_at
         FROM api_keys WHERE is_active=true ORDER BY requests_total DESC LIMIT 10`
      ),
      pool.query(
        `SELECT tier, COUNT(*) AS keys, SUM(requests_total) AS total_requests
         FROM api_keys WHERE is_active=true GROUP BY tier ORDER BY total_requests DESC`
      ),
      pool.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors
         FROM usage_log WHERE ts >= NOW() - ($1 * INTERVAL '1 day')`,
        [days]
      ),
      pool.query(
        `SELECT created_at::DATE AS day, COUNT(*) AS signups, tier
         FROM api_keys WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
         GROUP BY created_at::DATE, tier ORDER BY day DESC`,
        [days]
      ),
      pool.query(
        `SELECT ROUND(AVG(latency_ms)::NUMERIC, 1) AS avg_latency_ms, endpoint
         FROM usage_log
         WHERE ts >= NOW() - ($1 * INTERVAL '1 day') AND latency_ms IS NOT NULL
         GROUP BY endpoint ORDER BY avg_latency_ms DESC`,
        [days]
      ),
    ]);
    const er = errorRate.rows[0];
    return {
      requests_by_day:        byDay.rows,
      top_keys_by_volume:     topKeys.rows,
      tier_breakdown:         tierBreakdown.rows,
      error_rate: {
        total:    parseInt(er.total, 10),
        errors:   parseInt(er.errors || 0, 10),
        rate_pct: er.total > 0 ? ((er.errors / er.total) * 100).toFixed(2) : '0.00',
      },
      new_signups_by_day:     newSignups.rows,
      avg_latency_by_endpoint: avgLatency.rows,
    };
  }
}

module.exports = { KeyStore, TIERS };
