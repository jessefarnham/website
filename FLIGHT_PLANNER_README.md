# Flight Planner Implementation

## Overview
The Flight Planner feature has been successfully implemented! This tool helps pilots select the optimal altitude for cross-country flights based on winds aloft forecasts and aircraft performance.

## Installation Requirements

### Required Dependency
The Flight Planner uses the `geomag` library for accurate magnetic declination calculations. You need to install it:

```bash
npm install geomag
```

If npm is not in your PATH, you may need to configure your shell or use the full path to npm.

## Features Implemented

### User Interface
- **Input Fields:**
  - Departure airport (ICAO code with autocomplete)
  - Destination airport (ICAO code with autocomplete)
  - Expected indicated airspeed (knots)
  - Departure date/time picker
  - Minimum altitude (default: 2000 ft)
  - Maximum altitude (default: 10000 ft)
  - Resolution for route segmentation (default: 50 nm)
  - VFR altitudes checkbox (default: checked)

- **Results Display:**
  - Route information (distance, true course, magnetic heading)
  - Forecast validity period and warnings
  - Theoretical optimal altitude with groundspeed and flight time
  - VFR-compliant optimal altitude (if enabled)
  - Comparison table of all candidate altitudes
  - Detailed computations toggle for debugging

### Backend Calculations
All calculations are in `src/lib/flightPlanner.js`:

1. **Navigation:**
   - Great circle distance calculation
   - True course bearing
   - Route segmentation into waypoints
   - Intermediate point calculation

2. **Weather Data:**
   - Fetches winds aloft from aviationweather.gov for all 3 forecast periods (6hr, 12hr, 24hr)
   - Selects appropriate forecast based on departure time
   - Fetches METAR data for altimeter and temperature
   - Parses wind direction, speed, and temperature at various altitudes
   - Linear interpolation for altitudes between reported levels

3. **Atmospheric Physics:**
   - IAS to TAS conversion using ISA model
   - Accounts for pressure altitude, temperature, and density
   - Wind triangle solver for groundspeed calculation
   - Wind component analysis (headwind/tailwind)

4. **Magnetic Declination:**
   - Uses NOAA World Magnetic Model via geomag library
   - Fallback approximation if library not installed
   - Determines VFR cruising altitude rules based on magnetic heading

5. **Optimization:**
   - Generates candidate altitudes in 1000 ft increments
   - Generates VFR altitudes (odd thousands + 500 for 0-179° mag, even thousands + 500 for 180-359° mag)
   - Calculates average groundspeed for each altitude
   - Selects altitude with maximum groundspeed

## Current Limitations & TODOs

### Airport Database
Currently using mock data for only 6 airports (KBOS, KJFK, KLGA, KEWR, KPHL, KDCA). You should:

1. **Option A:** Bundle a local JSON file with airport data
   - Download from OurAirports: https://ourairports.com/data/
   - Parse the CSV and include lat/lon/elevation
   - Import in `getAirportData()` function

2. **Option B:** Use a third-party API
   - AviationAPI or similar service
   - Requires API key management

3. **Recommended:** Use FAA airport database
   - More comprehensive for US airports
   - Publicly available

### Winds Aloft Airport Coordinates
The `findNearestWindsAloftAirport()` function currently returns the first available airport. To properly find the nearest:

1. Parse airport codes from winds aloft data
2. Look up their coordinates (from FAA station location data)
3. Calculate distance to segment waypoint
4. Return closest airport

### Testing
The implementation needs testing with:
- Various route combinations
- Different times of day (to test forecast selection)
- Edge cases (min > max altitude, invalid airports, etc.)
- Different wind conditions
- VFR vs non-VFR altitudes

## How It Works

### User Flow
1. User enters departure/destination airports
2. User specifies aircraft performance (IAS)
3. User sets altitude constraints and departure time
4. Clicks "Plan" button
5. System:
   - Calculates route (distance, bearing)
   - Fetches current winds aloft forecasts
   - Selects appropriate forecast for departure time
   - Segments route into waypoints
   - For each waypoint, finds nearest weather reporting station
   - For each candidate altitude:
     - Interpolates winds at that altitude
     - Converts IAS to TAS using temperature/pressure
     - Calculates groundspeed using wind triangle
     - Averages groundspeed across route
   - Finds altitude with best average groundspeed
6. Displays results with:
   - Recommended altitude (theoretical + VFR)
   - Expected flight time
   - Forecast warnings if applicable
   - Comparison of all altitudes
   - Optional detailed segment-by-segment computations

### Calculation Example
For a flight from KBOS to KJFK at 5500 ft:
1. Distance: ~185 nm, True Course: ~225°
2. Magnetic declination at KBOS: ~-14°, Magnetic heading: ~239°
3. VFR rule: 180-359° magnetic = even thousands + 500 ✓
4. At KBOS region, 6hr forecast shows 260° @ 25kt at 6000 ft
5. Interpolate to 5500 ft: ~260° @ 24kt, temp -10°C
6. Convert 100 IAS to TAS: ~107 kt (using temp and pressure altitude)
7. Wind triangle: 25kt tailwind component → ~120 kt groundspeed
8. Repeat for other segments and altitudes
9. Compare: 5500 ft has best groundspeed for VFR altitudes

## Files Created

- `src/lib/flightPlanner.js` - All calculation logic (~800 lines)
- `src/containers/FlightPlanner.js` - React UI component (~420 lines)
- `src/containers/FlightPlanner.css` - Styling (~150 lines)
- Updated `src/App.js` - Added navigation link
- Updated `src/Routes.js` - Added route

## Next Steps

1. **Install geomag:** Run `npm install geomag`
2. **Expand airport database:** Replace mock data with real airport coordinates
3. **Add winds aloft station coordinates:** For proper nearest-airport selection
4. **Test thoroughly:** Various routes, times, and conditions
5. **Optional enhancements:**
   - Add map visualization of route and segments
   - Export flight plan to file
   - Save/load flight plans
   - Add aircraft profiles (different IAS for different aircraft)
   - Account for fuel burn and weight changes
   - Add terrain avoidance warnings
   - Include oxygen requirements above 12,500 ft

## Aviation Data Sources Used

- **Winds Aloft:** https://aviationweather.gov/api/data/windtemp
- **METAR:** https://aviationweather.gov/api/data/metar
- **Magnetic Declination:** NOAA World Magnetic Model (via geomag library)
- **Airport Data:** Currently mock, should use FAA or OurAirports database

## Notes

- All calculations use nautical miles, knots, and feet MSL
- True north is used for all bearing calculations, converted to magnetic for VFR rules
- ISA (International Standard Atmosphere) model is used for TAS calculations
- Linear interpolation is used for winds between reported altitude levels
- VFR cruising altitude rules: 0-179° mag = odd + 500, 180-359° mag = even + 500
- The "theoretical optimal" ignores VFR rules and finds absolute best altitude
- The "VFR optimal" only considers altitudes that comply with hemispheric VFR rules

## Validation

To validate calculations, you can:
1. Compare distance/bearing with SkyVector or ForeFlight
2. Verify magnetic declination with NOAA magnetic declination calculator
3. Cross-check winds aloft with aviationweather.gov website
4. Validate TAS conversion with E6B or online calculators
5. Confirm groundspeed with manual wind triangle calculation

The "Show detailed computations" toggle displays all intermediate values for verification.
