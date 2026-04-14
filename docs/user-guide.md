# NAD Address Intelligence — User Guide
**96 Million Verified US Addresses · Free · No Rate Limits · Government Certified**

---

## What Is This?

The National Address Database (NAD) is a US Department of Transportation dataset containing
**96,893,147 verified US addresses**, covering 47 states, 2,240 counties, 14,723 cities, and
71,410 neighborhoods. Every address is certified by a local government authority and includes
rooftop-level GPS coordinates.

This guide covers how to use the NAD tools as an end user.

---

## Quick Start

### Option 1 — Web Interface (Easiest)
Open your browser and go to:
```
http://localhost:4001
```
No setup required. Search addresses, explore neighborhoods, look up ZIP codes.

### Option 2 — Command Line
```bash
# Search an address
node nad/query.js --find "935 Pennsylvania Ave" --state DC

# Look up a ZIP code
node nad/query.js --zip 90210

# Find addresses near a location
node nad/query.js --near "40.758,-73.9855" --radius 0.5

# Get database stats
node nad/query.js --stats

# Browse addresses in a state
node nad/query.js --state TX --limit 10
```

### Option 3 — REST API
```bash
# Verify an address
curl "http://localhost:3847/v1/address?street=Pennsylvania&state=DC&number=935"

# ZIP code info
curl "http://localhost:3847/v1/zip/90210"

# Addresses near Times Square
curl "http://localhost:3847/v1/near?lat=40.758&lon=-73.9855&radius_km=0.3"
```

---

## Address Search

### What You Can Search By

| Field | Example | Notes |
|-------|---------|-------|
| Street name | `Pennsylvania` | Partial match works |
| House number | `935` | Use with street name |
| City | `Austin` | Use with state |
| State | `TX` | 2-letter code |
| ZIP code | `78701` | 5-digit |
| Coordinates | `40.758, -73.9855` | Latitude, Longitude |
| Neighborhood | `Penn Quarter` | Official name |

### Understanding Results

Each address result contains:

```
935 Pennsylvania Avenue Northwest
├── Unit          : (none)
├── Neighborhood  : Penn Quarter
├── City          : Washington
├── County        : District of Columbia
├── State         : DC
├── ZIP           : 20535
├── Coordinates   : 38.894700, -77.025100
├── Address Type  : Building
├── Placement     : Rooftop
└── Authority     : DC Office of the Chief Technology Officer
```

### Address Types Explained

| Type | Meaning |
|------|---------|
| **Building** | Physical structure with a door — most common |
| **Range** | Address range (e.g. 100–199 Main St) |
| **Site** | Named site without a street number |

### Placement Accuracy

| Placement | Accuracy |
|-----------|----------|
| **Rooftop** | Coordinate is on the building roof — most precise |
| **Parcel** | Coordinate is on the property parcel |
| **Street** | Coordinate is on the street centerline — least precise |

---

## ZIP Code Lookup

ZIP lookup returns:
- Primary city name for that ZIP
- Postal city name
- County and state
- Total number of addresses in that ZIP

```bash
node nad/query.js --zip 10001
# Returns: New York, NY · New York County · 12,847 addresses
```

---

## Proximity Search (Find Near Me)

Search for all verified addresses within a radius of any GPS coordinate.

```bash
# Find addresses within 0.5 km of Times Square
node nad/query.js --near "40.7580,-73.9855" --radius 0.5

# Find addresses within 1 km of the Golden Gate Bridge
node nad/query.js --near "37.8199,-122.4783" --radius 1.0
```

**Tip:** Get your current coordinates from Google Maps by right-clicking any location.

---

## Geographic Hierarchy

The database is organized in 6 levels:

```
United States
└── State (e.g. Texas)
    └── County (e.g. Travis County)
        └── City (e.g. Austin)
            └── Neighborhood (e.g. Downtown Austin)
                └── ZIP Code (e.g. 78701)
                    └── Address (e.g. 100 Congress Ave)
```

You can explore any level:
```bash
# All counties in Texas
node nad/query.js --counties TX

# All cities in Travis County, TX
node nad/query.js --cities TX --county "Travis County"

# Neighborhoods in Chicago
node nad/query.js --neighborhoods IL --city Chicago
```

---

## Common Use Cases

### Verifying a Rental Listing
1. Copy the address from the listing
2. Search at `http://localhost:4001` or via API
3. Confirmed = government-certified address exists
4. Check placement = "Rooftop" means the coordinates are accurate
5. Check authority = which local government certified it

### Finding Addresses for a Delivery Route
1. Use proximity search around your hub address
2. Filter by ZIP code or neighborhood
3. Export results for route planning

### Checking a Business Address
1. Search by street name + city + state
2. Verify address type = "Building" (not "Range")
3. Confirm unit number if applicable

### Exploring a New Neighborhood
1. Look up the neighborhood name in the search
2. See address count = density indicator
3. Compare neighborhoods side by side

---

## Data Coverage

| Item | Count |
|------|-------|
| Total Addresses | 96,893,147 |
| States Covered | 47 |
| Counties | 2,240 |
| Cities | 14,723 |
| Neighborhoods | 71,410 |
| ZIP Codes | 23,848 |
| Source | USDOT NAD Q1-2026 |
| Last Updated | March 2026 |

### States Not Covered
Mississippi, Montana, and Hawaii have limited coverage in the Q1-2026 release.
All other 47 states + DC have full coverage.

---

## Tips & Tricks

- **Partial street names work** — search `Penn` to find Pennsylvania Ave
- **Omit house numbers** to browse all addresses on a street
- **Use ZIP alone** to see all addresses in a postal area
- **Combine city + state** for faster results than state alone
- **Rooftop placement** = coordinates accurate to within ~5 meters
- **Rural Route addresses** are included — ideal for rural delivery routing

---

## FAQ

**Q: Is this data free?**
A: Yes. The USDOT NAD is public domain. No licensing fees, no restrictions.

**Q: How current is the data?**
A: Q1-2026 (released March 2026). USDOT updates quarterly.

**Q: Does it include apartment unit numbers?**
A: Yes, where provided by the local authority. Coverage varies by city.

**Q: Can I use this for commercial purposes?**
A: Yes. Public domain data has no restrictions on commercial use.

**Q: Why is my address not found?**
A: Possible reasons: (1) address is in a state with limited NAD coverage, (2) new construction
not yet in Q1-2026 release, (3) address uses unofficial name. Try searching by ZIP code only.

**Q: How accurate are the coordinates?**
A: Rooftop-placed addresses are accurate to ~5 meters. Parcel-placed to ~20 meters.
Street-placed to the nearest road centerline (~50–100 meters).

---

*User Guide v1.0 · NAD Q1-2026 · 96,893,147 addresses*
