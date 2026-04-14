-- =============================================================================
-- National Address Database (NAD) — SQLite Schema
-- Source: U.S. Department of Transportation, USDOT NAD
-- File format: NAD_r22.txt — CSV, UTF-8 BOM, 60 columns
-- ~89 million address records, updated quarterly
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA synchronous  = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA temp_store   = MEMORY;
PRAGMA cache_size   = -128000;   -- 128 MB page cache

-- ---------------------------------------------------------------------------
-- GEOGRAPHIC HIERARCHY
-- Levels: country → state → county → city → neighborhood → zip_code → address
-- ---------------------------------------------------------------------------

-- Level 7: Country
CREATE TABLE IF NOT EXISTS countries (
    id          INTEGER PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,   -- 'US'
    name        TEXT NOT NULL           -- 'United States'
);

-- Level 6: State / Territory
CREATE TABLE IF NOT EXISTS states (
    id              INTEGER PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,   -- 'CA', 'TX', 'DC' …
    name            TEXT NOT NULL,          -- 'California'
    fips            TEXT,                   -- 2-digit FIPS '06'
    country_id      INTEGER NOT NULL REFERENCES countries(id),
    address_count   INTEGER DEFAULT 0,
    county_count    INTEGER DEFAULT 0,
    city_count      INTEGER DEFAULT 0,
    zip_count       INTEGER DEFAULT 0,
    last_refreshed  TEXT
);

-- Level 5: County
CREATE TABLE IF NOT EXISTS counties (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    fips            TEXT,                   -- 5-digit county FIPS '06037'
    state_id        INTEGER NOT NULL REFERENCES states(id),
    address_count   INTEGER DEFAULT 0,
    last_refreshed  TEXT,
    UNIQUE (name, state_id)
);

-- Level 4: City  (Inc_Muni — incorporated municipality)
CREATE TABLE IF NOT EXISTS cities (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    post_name       TEXT,                   -- Post_City if different
    county_id       INTEGER REFERENCES counties(id),
    state_id        INTEGER NOT NULL REFERENCES states(id),
    address_count   INTEGER DEFAULT 0,
    last_refreshed  TEXT,
    UNIQUE (name, state_id)
);

-- Level 3: Neighborhood  (Nbrhd_Comm — NAD native field)
-- Also covers: Uninc_Comm (unincorporated community), Census_Plc, Urbnztn_PR
CREATE TABLE IF NOT EXISTS neighborhoods (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,          -- Nbrhd_Comm value
    type            TEXT,                   -- 'neighborhood', 'uninc_community', 'census_place', 'urban'
    city_id         INTEGER REFERENCES cities(id),
    county_id       INTEGER REFERENCES counties(id),
    state_id        INTEGER NOT NULL REFERENCES states(id),
    address_count   INTEGER DEFAULT 0,
    last_refreshed  TEXT,
    UNIQUE (name, state_id, type)
);

-- Level 2: ZIP Code
CREATE TABLE IF NOT EXISTS zip_codes (
    id              INTEGER PRIMARY KEY,
    zip             TEXT NOT NULL,
    post_city       TEXT,
    city_id         INTEGER REFERENCES cities(id),
    county_id       INTEGER REFERENCES counties(id),
    state_id        INTEGER NOT NULL REFERENCES states(id),
    address_count   INTEGER DEFAULT 0,
    last_refreshed  TEXT,
    UNIQUE (zip, state_id)
);

-- ---------------------------------------------------------------------------
-- CORE ADDRESS TABLE  (Level 1 — individual address point)
-- All 60 columns from NAD_r22.txt are stored.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS addresses (
    -- Internal keys
    id              INTEGER PRIMARY KEY,
    nad_uuid        TEXT,                   -- NAD UUID  (may be null in source)

    -- Address number components (cols 1-4)
    add_num_pre     TEXT,                   -- AddNum_Pre
    add_number      TEXT,                   -- Add_Number  e.g. '123'
    add_num_suf     TEXT,                   -- AddNum_Suf  e.g. '1/2'
    add_no_full     TEXT,                   -- AddNo_Full  assembled number

    -- Street name components (cols 5-13)
    st_pre_mod      TEXT,                   -- St_PreMod
    st_pre_dir      TEXT,                   -- St_PreDir   e.g. 'N', 'SW'
    st_pre_typ      TEXT,                   -- St_PreTyp
    st_pre_sep      TEXT,                   -- St_PreSep
    st_name         TEXT,                   -- St_Name     e.g. 'Main'
    st_pos_typ      TEXT,                   -- St_PosTyp   e.g. 'St', 'Ave'
    st_pos_dir      TEXT,                   -- St_PosDir
    st_pos_mod      TEXT,                   -- St_PosMod
    stnam_full      TEXT,                   -- StNam_Full  full assembled street

    -- Sub-address / building (cols 14-20)
    building        TEXT,                   -- Building name
    floor           TEXT,                   -- Floor
    unit            TEXT,                   -- Unit (apt/suite/unit number)
    room            TEXT,                   -- Room
    seat            TEXT,                   -- Seat
    addtl_loc       TEXT,                   -- Addtl_Loc
    sub_address     TEXT,                   -- SubAddress  full sub-address string

    -- Landmark (col 21)
    landmark_name   TEXT,                   -- LandmkName

    -- Jurisdiction text fields (cols 22-32) — raw from source
    county          TEXT,                   -- County
    inc_muni        TEXT,                   -- Inc_Muni (incorporated municipality)
    post_city       TEXT,                   -- Post_City
    census_plc      TEXT,                   -- Census_Plc
    uninc_comm      TEXT,                   -- Uninc_Comm (unincorporated community)
    nbrhd_comm      TEXT,                   -- Nbrhd_Comm ← NEIGHBORHOOD
    nat_am_area     TEXT,                   -- NatAmArea
    nat_am_sub      TEXT,                   -- NatAmSub
    urbnztn_pr      TEXT,                   -- Urbnztn_PR
    place_other     TEXT,                   -- PlaceOther
    place_nm_typ    TEXT,                   -- PlaceNmTyp

    -- State / ZIP (cols 33-35)
    state           TEXT,                   -- State  2-char code
    zip_code        TEXT,                   -- Zip_Code  5-digit
    plus4           TEXT,                   -- Plus_4

    -- Identifiers (col 36-37)
    addr_ref_sys    TEXT,                   -- AddrRefSys

    -- Geospatial (cols 38-42)
    longitude       REAL,                   -- Longitude WGS84
    latitude        REAL,                   -- Latitude  WGS84
    nat_grid        TEXT,                   -- NatGrid USNG coordinate
    elevation       REAL,                   -- Elevation (metres)
    addr_point      TEXT,                   -- AddrPoint  "lon lat" text

    -- Address classification (cols 43-49)
    placement       TEXT,                   -- Placement method
    related_id      TEXT,                   -- Related_ID
    relate_type     TEXT,                   -- RelateType
    parcel_src      TEXT,                   -- ParcelSrc
    parcel_id       TEXT,                   -- Parcel_ID
    addr_class      TEXT,                   -- AddrClass
    lifecycle       TEXT,                   -- Lifecycle

    -- Dates (cols 50-52)
    effective       TEXT,                   -- Effective date
    expire          TEXT,                   -- Expire date
    date_update     TEXT,                   -- DateUpdate

    -- Quality / type (cols 53-58)
    anom_status     TEXT,                   -- AnomStatus
    locatn_desc     TEXT,                   -- LocatnDesc
    addr_type       TEXT,                   -- Addr_Type
    deliver_typ     TEXT,                   -- DeliverTyp
    nad_source      TEXT,                   -- NAD_Source
    dataset_id      TEXT,                   -- DataSet_ID

    -- Provenance
    add_auth        TEXT,                   -- AddAuth (address authority)

    -- Denormalized full address (built at import time)
    full_address    TEXT,

    -- Foreign key links to hierarchy tables
    country_id      INTEGER REFERENCES countries(id),
    state_id        INTEGER REFERENCES states(id),
    county_id       INTEGER REFERENCES counties(id),
    city_id         INTEGER REFERENCES cities(id),
    neighborhood_id INTEGER REFERENCES neighborhoods(id),
    zip_code_id     INTEGER REFERENCES zip_codes(id),

    date_imported   TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_addr_state_id      ON addresses(state_id);
CREATE INDEX IF NOT EXISTS idx_addr_county_id     ON addresses(county_id);
CREATE INDEX IF NOT EXISTS idx_addr_city_id       ON addresses(city_id);
CREATE INDEX IF NOT EXISTS idx_addr_nbrhd_id      ON addresses(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_addr_zip_id        ON addresses(zip_code_id);

CREATE INDEX IF NOT EXISTS idx_addr_state_txt     ON addresses(state);
CREATE INDEX IF NOT EXISTS idx_addr_county_txt    ON addresses(county, state);
CREATE INDEX IF NOT EXISTS idx_addr_city_txt      ON addresses(inc_muni, state);
CREATE INDEX IF NOT EXISTS idx_addr_zip_txt       ON addresses(zip_code);
CREATE INDEX IF NOT EXISTS idx_addr_nbrhd_txt     ON addresses(nbrhd_comm, state);

CREATE INDEX IF NOT EXISTS idx_addr_st_name       ON addresses(st_name);
CREATE INDEX IF NOT EXISTS idx_addr_add_number    ON addresses(add_number, st_name, state);
CREATE INDEX IF NOT EXISTS idx_addr_full          ON addresses(full_address);
CREATE INDEX IF NOT EXISTS idx_addr_latlon        ON addresses(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_addr_lat           ON addresses(latitude);
CREATE INDEX IF NOT EXISTS idx_addr_lon           ON addresses(longitude);

CREATE INDEX IF NOT EXISTS idx_county_state       ON counties(state_id);
CREATE INDEX IF NOT EXISTS idx_city_state         ON cities(state_id);
CREATE INDEX IF NOT EXISTS idx_city_county        ON cities(county_id);
CREATE INDEX IF NOT EXISTS idx_nbrhd_state        ON neighborhoods(state_id);
CREATE INDEX IF NOT EXISTS idx_nbrhd_city         ON neighborhoods(city_id);
CREATE INDEX IF NOT EXISTS idx_zip_state          ON zip_codes(state_id);
CREATE INDEX IF NOT EXISTS idx_zip_city           ON zip_codes(city_id);

-- ---------------------------------------------------------------------------
-- VIEWS — per geographic level
-- ---------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS v_address_full AS
SELECT
    a.id,
    a.nad_uuid,
    TRIM(
        COALESCE(a.add_number,'') || ' ' ||
        COALESCE(a.st_pre_dir||' ','') ||
        COALESCE(a.st_name,'') ||
        COALESCE(' '||a.st_pos_typ,'') ||
        COALESCE(' '||a.st_pos_dir,'') ||
        COALESCE(', '||a.unit,'')
    ) AS formatted_address,
    a.nbrhd_comm    AS neighborhood,
    a.zip_code,
    a.inc_muni      AS city,
    a.post_city,
    a.county,
    a.state,
    a.latitude,
    a.longitude,
    a.addr_type,
    a.addr_class,
    a.placement,
    a.add_auth,
    a.date_update
FROM addresses a;

CREATE VIEW IF NOT EXISTS v_by_neighborhood AS
SELECT
    n.name          AS neighborhood,
    ci.name         AS city,
    s.code          AS state,
    COUNT(a.id)     AS address_count
FROM neighborhoods n
JOIN states  s  ON s.id  = n.state_id
LEFT JOIN cities ci ON ci.id = n.city_id
LEFT JOIN addresses a ON a.neighborhood_id = n.id
GROUP BY n.id;

CREATE VIEW IF NOT EXISTS v_by_zip AS
SELECT
    z.zip,
    z.post_city,
    s.code          AS state,
    COUNT(a.id)     AS address_count
FROM zip_codes z
JOIN states s ON s.id = z.state_id
LEFT JOIN addresses a ON a.zip_code_id = z.id
GROUP BY z.id;

CREATE VIEW IF NOT EXISTS v_by_city AS
SELECT
    ci.name         AS city,
    co.name         AS county,
    s.code          AS state,
    COUNT(a.id)     AS address_count
FROM cities ci
JOIN states   s  ON s.id  = ci.state_id
LEFT JOIN counties co ON co.id = ci.county_id
LEFT JOIN addresses a ON a.city_id = ci.id
GROUP BY ci.id;

CREATE VIEW IF NOT EXISTS v_by_county AS
SELECT
    co.name         AS county,
    s.code          AS state,
    COUNT(a.id)         AS address_count,
    COUNT(DISTINCT a.city_id)   AS city_count,
    COUNT(DISTINCT a.zip_code_id) AS zip_count
FROM counties co
JOIN states s ON s.id = co.state_id
LEFT JOIN addresses a ON a.county_id = co.id
GROUP BY co.id;

CREATE VIEW IF NOT EXISTS v_by_state AS
SELECT
    s.code          AS state,
    s.name          AS state_name,
    s.fips          AS state_fips,
    COUNT(a.id)             AS address_count,
    COUNT(DISTINCT a.county_id)       AS county_count,
    COUNT(DISTINCT a.city_id)         AS city_count,
    COUNT(DISTINCT a.neighborhood_id) AS neighborhood_count,
    COUNT(DISTINCT a.zip_code_id)     AS zip_count
FROM states s
LEFT JOIN addresses a ON a.state_id = s.id
GROUP BY s.id;

-- ---------------------------------------------------------------------------
-- IMPORT TRACKING
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS nad_import_log (
    id              INTEGER PRIMARY KEY,
    run_date        TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    source_url      TEXT,
    file_name       TEXT,
    file_size_bytes INTEGER,
    rows_processed  INTEGER,
    rows_inserted   INTEGER,
    rows_skipped    INTEGER,
    duration_secs   REAL,
    status          TEXT,
    notes           TEXT
);

-- ---------------------------------------------------------------------------
-- STATIC SEED: US states / territories
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO countries (code, name) VALUES ('US', 'United States');

INSERT OR IGNORE INTO states (code, name, fips, country_id) VALUES
  ('AL','Alabama','01',1),('AK','Alaska','02',1),('AZ','Arizona','04',1),
  ('AR','Arkansas','05',1),('CA','California','06',1),('CO','Colorado','08',1),
  ('CT','Connecticut','09',1),('DE','Delaware','10',1),('DC','District of Columbia','11',1),
  ('FL','Florida','12',1),('GA','Georgia','13',1),('HI','Hawaii','15',1),
  ('ID','Idaho','16',1),('IL','Illinois','17',1),('IN','Indiana','18',1),
  ('IA','Iowa','19',1),('KS','Kansas','20',1),('KY','Kentucky','21',1),
  ('LA','Louisiana','22',1),('ME','Maine','23',1),('MD','Maryland','24',1),
  ('MA','Massachusetts','25',1),('MI','Michigan','26',1),('MN','Minnesota','27',1),
  ('MS','Mississippi','28',1),('MO','Missouri','29',1),('MT','Montana','30',1),
  ('NE','Nebraska','31',1),('NV','Nevada','32',1),('NH','New Hampshire','33',1),
  ('NJ','New Jersey','34',1),('NM','New Mexico','35',1),('NY','New York','36',1),
  ('NC','North Carolina','37',1),('ND','North Dakota','38',1),('OH','Ohio','39',1),
  ('OK','Oklahoma','40',1),('OR','Oregon','41',1),('PA','Pennsylvania','42',1),
  ('RI','Rhode Island','44',1),('SC','South Carolina','45',1),('SD','South Dakota','46',1),
  ('TN','Tennessee','47',1),('TX','Texas','48',1),('UT','Utah','49',1),
  ('VT','Vermont','50',1),('VA','Virginia','51',1),('WA','Washington','53',1),
  ('WV','West Virginia','54',1),('WI','Wisconsin','55',1),('WY','Wyoming','56',1),
  ('AS','American Samoa','60',1),('GU','Guam','66',1),('MP','Northern Mariana Islands','69',1),
  ('PR','Puerto Rico','72',1),('VI','U.S. Virgin Islands','78',1);
