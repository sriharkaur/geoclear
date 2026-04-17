-- Risk data schema — county-level hazard tables
-- Migrated from risk.db (SQLite) to Neon PostgreSQL
-- Source data: USFS WHP, NOAA NCEI, USGS NSHM, USDA Drought Monitor, FEMA NRI

CREATE TABLE IF NOT EXISTS wildfire_risk (
  county_fips  TEXT PRIMARY KEY,
  whp_class    TEXT,
  whp_score    REAL,
  state        TEXT,
  import_date  DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS storm_risk (
  county_fips      TEXT PRIMARY KEY,
  event_count      INTEGER,
  tornado_count    INTEGER,
  hurricane_count  INTEGER,
  hail_count       INTEGER,
  flood_count      INTEGER,
  years_covered    INTEGER,
  import_date      DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS earthquake_risk (
  county_fips  TEXT PRIMARY KEY,
  pgam         REAL,
  sdc          TEXT,
  risk_score   REAL,
  risk_label   TEXT,
  import_date  DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS drought_risk (
  county_fips    TEXT PRIMARY KEY,
  risk_score     REAL,
  current_level  TEXT,
  weeks_sampled  INTEGER,
  import_date    DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS nri_risk (
  county_fips           TEXT PRIMARY KEY,
  risk_score            REAL,
  risk_rating           TEXT,
  heat_wave_score       REAL,
  hurricane_score       REAL,
  coastal_flood_score   REAL,
  riverine_flood_score  REAL,
  wildfire_score        REAL,
  earthquake_score      REAL,
  import_date           DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS calfire_fhsz (
  id          SERIAL PRIMARY KEY,
  fhsz_class  TEXT,
  fhsz_label  TEXT,
  county      TEXT,
  min_lat     REAL,
  max_lat     REAL,
  min_lon     REAL,
  max_lon     REAL
);
CREATE INDEX IF NOT EXISTS idx_calfire_bbox ON calfire_fhsz (min_lat, max_lat, min_lon, max_lon);

CREATE TABLE IF NOT EXISTS building_footprints (
  id            SERIAL PRIMARY KEY,
  lat           REAL NOT NULL,
  lon           REAL NOT NULL,
  area_sqm      REAL,
  building_type TEXT
);
CREATE INDEX IF NOT EXISTS idx_buildings_latlon ON building_footprints (lat, lon);

-- Track schema version
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO schema_migrations (version) VALUES ('0001') ON CONFLICT DO NOTHING;
