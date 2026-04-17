#!/usr/bin/env node
'use strict';
/**
 * One-time migration: SQLite risk.db + keys.db → Neon PostgreSQL
 * Run from project root: node scripts/migrate-to-neon.js
 */

const path     = require('path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');

const NEON_URL  = process.env.NEON_DATABASE_URL ||
  'postgresql://neondb_owner:npg_eoCR6EwJT8VZ@ep-crimson-water-an5zvi9z.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
const DATA_DIR  = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const RISK_DB   = path.join(DATA_DIR, 'risk.db');
const KEYS_DB   = path.join(DATA_DIR, 'keys.db');

const pool = new Pool({ connectionString: NEON_URL });

async function migrateTable(pgClient, sqliteDb, table, columns, pgTable = table) {
  const rows = sqliteDb.prepare(`SELECT ${columns.join(', ')} FROM ${table}`).all();
  if (!rows.length) { console.log(`  ${table}: 0 rows — skipped`); return; }

  const placeholders = rows[0] && columns.map((_, i) => `$${i + 1}`).join(', ');
  await pgClient.query(`TRUNCATE ${pgTable} RESTART IDENTITY CASCADE`);
  let count = 0;
  for (const row of rows) {
    await pgClient.query(
      `INSERT INTO ${pgTable} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      columns.map(c => row[c] ?? null)
    );
    count++;
  }
  console.log(`  ${table}: ${count} rows migrated`);
}

async function main() {
  const client = await pool.connect();
  try {
    // ── risk.db ────────────────────────────────────────────────────
    const riskDb = new Database(RISK_DB, { readonly: true });
    console.log('\nMigrating risk.db...');

    await migrateTable(client, riskDb, 'wildfire_risk',
      ['county_fips', 'whp_class', 'whp_score', 'state']);
    await migrateTable(client, riskDb, 'storm_risk',
      ['county_fips', 'event_count', 'tornado_count', 'hurricane_count', 'hail_count', 'flood_count', 'years_covered']);
    await migrateTable(client, riskDb, 'earthquake_risk',
      ['county_fips', 'pgam', 'sdc', 'risk_score', 'risk_label']);
    await migrateTable(client, riskDb, 'drought_risk',
      ['county_fips', 'risk_score', 'current_level', 'weeks_sampled', 'import_date']);
    // nri_risk only exists on staging/prod — migrate separately via nri-import-neon.js
    riskDb.close();

    // ── keys.db ────────────────────────────────────────────────────
    const keysDb = new Database(KEYS_DB, { readonly: true });
    console.log('\nMigrating keys.db...');

    await migrateTable(client, keysDb, 'api_keys',
      ['key', 'tier', 'email', 'name', 'is_active', 'created_at', 'revoked_at', 'notes',
       'requests_today', 'requests_total', 'last_used_at', 'last_reset_at', 'key_hash', 'key_prefix',
       'stripe_subscription_id', 'stripe_customer_id', 'metered_unreported',
       'enrichment_calls_month', 'first_call_at', 'drip_sent']);
    await migrateTable(client, keysDb, 'usage_log',
      ['key_id', 'endpoint', 'status', 'ts', 'latency_ms']);
    await migrateTable(client, keysDb, 'stripe_sessions',
      ['session_id', 'tier', 'email', 'api_key', 'created_at']);
    await migrateTable(client, keysDb, 'address_signals',
      ['nad_uuid', 'query_count', 'last_queried_at', 'fraud_signal_count']);
    await migrateTable(client, keysDb, 'address_outcomes',
      ['nad_uuid', 'key_id', 'outcome_type', 'outcome_value', 'metadata_json', 'reported_at']);
    await migrateTable(client, keysDb, 'data_sources',
      ['source_id', 'name', 'publisher', 'license', 'role', 'description', 'coverage', 'api_url',
       'format', 'auth_required', 'pipeline_script', 'attributes_json', 'use_cases',
       'last_sourced_at', 'next_refresh_at', 'refresh_cadence', 'row_count', 'status', 'notes',
       'created_at', 'updated_at']);
    keysDb.close();

    // ── Verify ─────────────────────────────────────────────────────
    console.log('\nVerification:');
    const tables = ['wildfire_risk','storm_risk','earthquake_risk','drought_risk','nri_risk',
                    'api_keys','usage_log','stripe_sessions','data_sources'];
    for (const t of tables) {
      const r = await client.query(`SELECT COUNT(*) as n FROM ${t}`);
      console.log(`  ${t}: ${r.rows[0].n} rows`);
    }
    console.log('\nMigration complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
