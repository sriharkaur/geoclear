# NAD Address Intelligence — API Reference Guide
**REST API · 96M US Addresses · Port 3847**

---

## Base URL

```
http://localhost:3847        (development)
https://nad.yourdomain.com  (production)
```

---

## Authentication

### Development (no auth)
```bash
node nad/api-server.js --no-auth
```
No header required — all endpoints are open.

### Production
Pass your API key in every request:
```
X-API-Key: nad_live_xxxxxxxxxxxx
```
Or via query parameter (less secure):
```
?key=nad_live_xxxxxxxxxxxx
```

Default development key: `nad_dev_localtest`

### Error Response (401)
```json
{
  "ok": false,
  "error": "Invalid or missing API key. Pass X-API-Key header."
}
```

---

## Response Envelope

All endpoints return a consistent JSON envelope:

```json
{
  "ok": true,
  "count": 3,
  "data": [ ... ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | `true` = success, `false` = error |
| `count` | number | Number of results (collection endpoints) |
| `data` | object/array | The payload |
| `error` | string | Error message (only when `ok: false`) |

---

## Rate Limits

| Tier | Limit |
|------|-------|
| Default (dev) | 1,000 requests/minute per IP |

When exceeded:
```json
{
  "error": "Rate limit exceeded. Slow down.",
  "retry_after": "60s"
}
```

---

## Endpoints

---

### `GET /health`
Health check. No authentication required.

**Response**
```json
{
  "status": "ok",
  "addresses": 96893147,
  "version": "1.0.0"
}
```

**Example**
```bash
curl http://localhost:3847/health
```

---

### `GET /v1/stats`
Database coverage statistics. No authentication required.

**Response**
```json
{
  "ok": true,
  "data": {
    "addresses": 96893147,
    "states": 47,
    "counties": 2240,
    "cities": 14723,
    "zip_codes": 23848,
    "lastImport": "2026-04-12T00:00:00.000Z"
  }
}
```

**Example**
```bash
curl http://localhost:3847/v1/stats
```

---

### `GET /v1/address`
Search and verify a US address. Returns enriched address objects.

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `street` | string | one of three* | Street name (e.g. `Pennsylvania`) |
| `number` | string | optional | House/building number (e.g. `935`) |
| `city` | string | optional | City name (e.g. `Washington`) |
| `state` | string | optional | 2-letter state code (e.g. `DC`) |
| `zip` | string | one of three* | 5-digit ZIP code |
| `limit` | number | optional | Max results (default: 10, max: 50) |

\* At least one of `street`, `zip`, or `number` is required.

**Response**
```json
{
  "ok": true,
  "count": 1,
  "data": [
    {
      "verified": true,
      "full_address": "935 Pennsylvania Avenue Northwest",
      "components": {
        "number": "935",
        "pre_dir": null,
        "street": "Pennsylvania",
        "post_type": "Ave",
        "post_dir": "NW",
        "unit": null
      },
      "jurisdiction": {
        "neighborhood": "Penn Quarter",
        "city": "Washington",
        "post_city": "Washington",
        "county": "District of Columbia",
        "state": "DC",
        "zip": "20535",
        "plus4": "0001",
        "country": "US"
      },
      "coordinates": {
        "latitude": 38.8947,
        "longitude": -77.0251
      },
      "metadata": {
        "addr_type": "Building",
        "addr_class": "Numbered Thoroughfare Address",
        "placement": "Rooftop",
        "authority": "DC Office of the Chief Technology Officer",
        "date_update": "3/8/2023",
        "nad_source": "USDOT_NAD_Q1_2026",
        "nad_uuid": "550e8400-e29b-41d4-a716-446655440000"
      }
    }
  ]
}
```

**Examples**
```bash
# Full address
curl "http://localhost:3847/v1/address?number=935&street=Pennsylvania&state=DC" \
  -H "X-API-Key: nad_dev_localtest"

# Street + city
curl "http://localhost:3847/v1/address?street=Main&city=Austin&state=TX&limit=5"

# ZIP only
curl "http://localhost:3847/v1/address?zip=90210&limit=10"

# Partial street name
curl "http://localhost:3847/v1/address?street=Penn&state=DC&limit=20"
```

**Error: 400 Bad Request**
```json
{ "ok": false, "error": "Provide at least one of: street, zip, number" }
```

**Error: 404 Not Found**
```json
{ "ok": false, "error": "No addresses found matching those criteria." }
```

---

### `POST /v1/address/bulk`
Batch verify up to 1,000 addresses in a single request.

**Request Body**
```json
[
  { "number": "935", "street": "Pennsylvania", "state": "DC" },
  { "street": "Sunset", "city": "Los Angeles", "state": "CA" },
  { "zip": "10001", "number": "350" }
]
```

Each item supports: `street`, `number`, `city`, `state`, `zip`

**Response**
```json
{
  "ok": true,
  "count": 3,
  "data": [
    {
      "verified": true,
      "full_address": "935 Pennsylvania Avenue Northwest",
      ...
    },
    {
      "verified": true,
      "full_address": "8952 Sunset Boulevard",
      ...
    },
    {
      "verified": false,
      "input": { "zip": "10001", "number": "350" }
    }
  ]
}
```

Unverified addresses return `{ "verified": false, "input": { ... } }`.

**Example**
```bash
curl -X POST http://localhost:3847/v1/address/bulk \
  -H "Content-Type: application/json" \
  -H "X-API-Key: nad_dev_localtest" \
  -d '[{"street":"Pennsylvania","number":"935","state":"DC"},{"zip":"90210"}]'
```

**Limits**
- Max 1,000 addresses per request
- Returns one result per input (preserves order)
- No partial failures — every input gets a result (verified or not)

---

### `GET /v1/zip/:zip`
ZIP code metadata and address count.

**Path Parameter**

| Parameter | Description |
|-----------|-------------|
| `zip` | 5-digit ZIP code |

**Query Parameter**

| Parameter | Description |
|-----------|-------------|
| `state` | 2-letter state code (disambiguates ZIPs that cross state lines) |

**Response**
```json
{
  "ok": true,
  "data": {
    "zip": "90210",
    "post_city": "Beverly Hills",
    "city_name": "Beverly Hills",
    "county": "Los Angeles County",
    "state": "CA",
    "address_count": 4821
  }
}
```

**Examples**
```bash
curl "http://localhost:3847/v1/zip/90210"
curl "http://localhost:3847/v1/zip/78701?state=TX"
```

**Error: 404**
```json
{ "ok": false, "error": "ZIP 99999 not found." }
```

---

### `GET /v1/state/:code`
Full summary for a US state.

**Path Parameter**

| Parameter | Description |
|-----------|-------------|
| `code` | 2-letter state code (e.g. `TX`) |

**Response**
```json
{
  "ok": true,
  "data": {
    "code": "TX",
    "name": "Texas",
    "address_count": 11203847,
    "county_count": 254,
    "city_count": 1214,
    "zip_count": 1962
  }
}
```

**Example**
```bash
curl "http://localhost:3847/v1/state/TX" -H "X-API-Key: nad_dev_localtest"
```

---

### `GET /v1/county`
List or search counties in a state.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `state` | yes | 2-letter state code |
| `name` | no | Filter to specific county name |
| `limit` | no | Max results (default: 100) |

**Response**
```json
{
  "ok": true,
  "count": 254,
  "data": [
    { "name": "Harris County", "state": "TX", "address_count": 1847203 },
    { "name": "Dallas County", "state": "TX", "address_count": 1203847 }
  ]
}
```

**Examples**
```bash
# All counties in Texas
curl "http://localhost:3847/v1/county?state=TX"

# Specific county
curl "http://localhost:3847/v1/county?state=TX&name=Travis+County"
```

---

### `GET /v1/city`
Search cities in a state or by name.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `state` | one of | 2-letter state code |
| `name` | one of | City name (partial match) |
| `county` | no | Filter by county name |
| `limit` | no | Max results (default: 100) |

**Response**
```json
{
  "ok": true,
  "count": 5,
  "data": [
    { "name": "Austin", "county": "Travis County", "state": "TX", "address_count": 387240 },
    { "name": "Houston", "county": "Harris County", "state": "TX", "address_count": 982340 }
  ]
}
```

**Examples**
```bash
# All cities in Texas
curl "http://localhost:3847/v1/city?state=TX&limit=20"

# Search by city name
curl "http://localhost:3847/v1/city?name=Austin"

# Cities in a county
curl "http://localhost:3847/v1/city?state=TX&county=Travis+County"
```

---

### `GET /v1/neighborhood`
List neighborhoods in a city and state.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `state` | yes | 2-letter state code |
| `city` | no | City name filter |
| `limit` | no | Max results (default: 50) |

**Response**
```json
{
  "ok": true,
  "count": 8,
  "data": [
    { "name": "Lincoln Park", "type": "Nbrhd_Comm", "address_count": 12847, "city_name": "Chicago", "state_code": "IL" },
    { "name": "Wicker Park", "type": "Nbrhd_Comm", "address_count": 8203, "city_name": "Chicago", "state_code": "IL" }
  ]
}
```

**Example**
```bash
curl "http://localhost:3847/v1/neighborhood?state=IL&city=Chicago&limit=10"
```

---

### `GET /v1/zips`
List ZIP codes in a state or city.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `state` | yes | 2-letter state code |
| `city` | no | City name filter |
| `limit` | no | Max results (default: 50) |

**Response**
```json
{
  "ok": true,
  "count": 10,
  "data": [
    { "zip": "78701", "city": "Austin", "state": "TX", "address_count": 4821 },
    { "zip": "78702", "city": "Austin", "state": "TX", "address_count": 7203 }
  ]
}
```

**Example**
```bash
curl "http://localhost:3847/v1/zips?state=TX&city=Austin"
```

---

### `GET /v1/near`
Find addresses near a GPS coordinate within a radius.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `lat` | yes | Latitude in decimal degrees (e.g. `40.758`) |
| `lon` | yes | Longitude in decimal degrees (e.g. `-73.9855`) |
| `radius_km` | no | Search radius in kilometers (default: 0.5) |
| `limit` | no | Max results (default: 20, max: 100) |

**Response**
```json
{
  "ok": true,
  "count": 5,
  "data": [
    {
      "verified": true,
      "full_address": "1560 Broadway",
      "jurisdiction": {
        "neighborhood": "Theater District",
        "city": "New York",
        "county": "New York County",
        "state": "NY",
        "zip": "10036",
        "country": "US"
      },
      "coordinates": { "latitude": 40.7578, "longitude": -73.9855 },
      "metadata": { "addr_type": "Building", "placement": "Rooftop" }
    }
  ]
}
```

**Examples**
```bash
# Times Square area
curl "http://localhost:3847/v1/near?lat=40.758&lon=-73.9855&radius_km=0.3&limit=10"

# Golden Gate Bridge area
curl "http://localhost:3847/v1/near?lat=37.8199&lon=-122.4783&radius_km=1.0"
```

**Error: 404**
```json
{ "ok": false, "error": "No addresses found within 0.5 km." }
```

---

## Code Examples

### JavaScript / Node.js
```javascript
const BASE = 'http://localhost:3847';
const KEY  = 'nad_dev_localtest';

async function verifyAddress(street, city, state) {
  const res = await fetch(
    `${BASE}/v1/address?street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}&state=${state}&limit=1`,
    { headers: { 'X-API-Key': KEY } }
  );
  const { ok, data } = await res.json();
  return ok && data.length > 0 ? data[0] : null;
}

// Usage
const address = await verifyAddress('Pennsylvania', 'Washington', 'DC');
console.log(address?.jurisdiction.neighborhood); // "Penn Quarter"
```

### Python
```python
import requests

BASE = 'http://localhost:3847'
KEY  = 'nad_dev_localtest'

def verify_address(street, city, state, number=None):
    params = {'street': street, 'city': city, 'state': state, 'limit': 1}
    if number:
        params['number'] = number
    r = requests.get(f'{BASE}/v1/address', params=params,
                     headers={'X-API-Key': KEY})
    result = r.json()
    return result['data'][0] if result['ok'] and result['data'] else None

# Bulk verify
def bulk_verify(addresses):
    r = requests.post(f'{BASE}/v1/address/bulk', json=addresses,
                      headers={'X-API-Key': KEY, 'Content-Type': 'application/json'})
    return r.json()['data']
```

### curl (shell script)
```bash
#!/bin/bash
NAD_KEY="nad_dev_localtest"
NAD_URL="http://localhost:3847"

verify() {
  curl -s "${NAD_URL}/v1/address?street=${1}&city=${2}&state=${3}" \
    -H "X-API-Key: ${NAD_KEY}" | jq '.data[0].verified'
}

verify "Main" "Austin" "TX"   # → true
```

### Direct npm module (zero HTTP overhead)
```javascript
const { NADQuery } = require('./nad/query.js');
const nad = new NADQuery();

// Same results, no HTTP round-trip
const results = nad.findAddress({ streetName: 'Pennsylvania', stateCode: 'DC', addNumber: '935' });
nad.close();
```

---

## MCP Tool Reference (Claude Agents)

When the NAD MCP server is active, these tools are available directly in Claude conversations:

| Tool | Parameters | Description |
|------|-----------|-------------|
| `nad_stats` | none | Database coverage summary |
| `nad_search_address` | `street_name`, `add_number`, `city`, `state`, `zip_code`, `limit` | Find/verify an address |
| `nad_lookup_zip` | `zip`, `state` | ZIP code metadata |
| `nad_list_counties` | `state` | Counties in a state |
| `nad_list_cities` | `state`, `county`, `limit` | Cities in a state |
| `nad_list_neighborhoods` | `state`, `city`, `limit` | Neighborhoods in a city |
| `nad_list_zips` | `state`, `city`, `limit` | ZIP codes in a state/city |
| `nad_find_near` | `latitude`, `longitude`, `radius_km`, `limit` | Addresses near a coordinate |
| `nad_state_summary` | `state` | Full state summary with top counties |

---

## Error Reference

| HTTP Status | Meaning | Common Cause |
|-------------|---------|-------------|
| 200 | Success | — |
| 400 | Bad Request | Missing required parameter |
| 401 | Unauthorized | Missing or invalid API key |
| 404 | Not Found | No results match query |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | DB connection issue |

---

*API Guide v1.0 · NAD Q1-2026 · 96,893,147 addresses*
