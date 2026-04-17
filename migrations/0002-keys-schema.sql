-- API keys and operational tables schema
-- Migrated from keys.db (SQLite) to Neon PostgreSQL

CREATE TABLE IF NOT EXISTS api_keys (
  id                      SERIAL PRIMARY KEY,
  key                     TEXT    NOT NULL UNIQUE,
  tier                    TEXT    NOT NULL DEFAULT 'free',
  email                   TEXT,
  name                    TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at              TIMESTAMPTZ,
  notes                   TEXT,
  requests_today          INTEGER NOT NULL DEFAULT 0,
  requests_total          INTEGER NOT NULL DEFAULT 0,
  last_used_at            TIMESTAMPTZ,
  last_reset_at           DATE    NOT NULL DEFAULT CURRENT_DATE,
  key_hash                TEXT,
  key_prefix              TEXT,
  stripe_subscription_id  TEXT,
  stripe_customer_id      TEXT,
  metered_unreported      INTEGER NOT NULL DEFAULT 0,
  enrichment_calls_month  INTEGER NOT NULL DEFAULT 0,
  first_call_at           TIMESTAMPTZ,
  drip_sent               INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_keys_key    ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_keys_email  ON api_keys(email);
CREATE INDEX IF NOT EXISTS idx_keys_hash   ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS usage_log (
  id          SERIAL PRIMARY KEY,
  key_id      INTEGER NOT NULL REFERENCES api_keys(id),
  endpoint    TEXT,
  status      INTEGER,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_usage_key_ts ON usage_log(key_id, ts);

CREATE TABLE IF NOT EXISTS stripe_sessions (
  session_id  TEXT NOT NULL PRIMARY KEY,
  tier        TEXT NOT NULL,
  email       TEXT NOT NULL,
  api_key     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS address_signals (
  nad_uuid            TEXT    NOT NULL PRIMARY KEY,
  query_count         INTEGER NOT NULL DEFAULT 1,
  last_queried_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fraud_signal_count  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_signals_count ON address_signals(query_count DESC);

CREATE TABLE IF NOT EXISTS address_outcomes (
  id             SERIAL PRIMARY KEY,
  nad_uuid       TEXT    NOT NULL,
  key_id         INTEGER NOT NULL REFERENCES api_keys(id),
  outcome_type   TEXT    NOT NULL,
  outcome_value  REAL,
  metadata_json  JSONB,
  reported_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outcomes_uuid ON address_outcomes(nad_uuid);
CREATE INDEX IF NOT EXISTS idx_outcomes_key  ON address_outcomes(key_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_type ON address_outcomes(outcome_type, nad_uuid);

CREATE TABLE IF NOT EXISTS data_sources (
  id               SERIAL PRIMARY KEY,
  source_id        TEXT    NOT NULL UNIQUE,
  name             TEXT    NOT NULL,
  publisher        TEXT    NOT NULL,
  license          TEXT,
  role             TEXT    NOT NULL,
  description      TEXT,
  coverage         TEXT,
  api_url          TEXT,
  format           TEXT,
  auth_required    BOOLEAN NOT NULL DEFAULT FALSE,
  pipeline_script  TEXT,
  attributes_json  JSONB,
  use_cases        TEXT,
  last_sourced_at  TIMESTAMPTZ,
  next_refresh_at  TIMESTAMPTZ,
  refresh_cadence  TEXT,
  row_count        INTEGER,
  status           TEXT    NOT NULL DEFAULT 'active',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('0002') ON CONFLICT DO NOTHING;
