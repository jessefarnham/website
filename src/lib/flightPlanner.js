/**
 * Flight Planner Service Library
 * 
 * Provides functions for:
 * - Airport data lookup
 * - Magnetic declination calculation
 * - Weather data fetching (winds aloft, METARs)
 * - Navigation calculations (great circle, bearing, segmentation)
 * - Atmospheric calculations (IAS to TAS conversion)
 * - Wind triangle solving
 * - Altitude optimization
 */

// Try to import geomag, fall back to inline calculation if not available
let geomag;
try {
  geomag = require('geomag');
} catch (e) {
  console.warn('geomag library not found, using fallback calculation');
  geomag = null;
}

// Constants
const EARTH_RADIUS_NM = 3440.065; // Earth radius in nautical miles
const KNOTS_TO_MPS = 0.514444; // Conversion factor
const FEET_TO_METERS = 0.3048;
const STANDARD_TEMP_KELVIN = 288.15; // ISA sea level temperature in Kelvin
const TEMP_LAPSE_RATE = 0.0065; // K/m
const GAS_CONSTANT = 287.05; // J/(kg·K)
const SEA_LEVEL_DENSITY = 1.225; // kg/m³

// Airport database cache
let airportCache = null;
let windsAloftAirports = null;

/**
 * Degrees to radians conversion
 */
function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Radians to degrees conversion
 */
function toDegrees(radians) {
  return radians * 180 / Math.PI;
}

/**
 * Calculate great circle distance between two points
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lon1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lon2 - Longitude of point 2 in degrees
 * @returns {number} Distance in nautical miles
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_NM * c;
}

/**
 * Calculate initial bearing (true course) from point 1 to point 2
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lon1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lon2 - Longitude of point 2 in degrees
 * @returns {number} Initial bearing in degrees (0-360)
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return (toDegrees(θ) + 360) % 360;
}

/**
 * Calculate intermediate point along great circle route
 * @param {number} lat1 - Start latitude in degrees
 * @param {number} lon1 - Start longitude in degrees
 * @param {number} lat2 - End latitude in degrees
 * @param {number} lon2 - End longitude in degrees
 * @param {number} fraction - Fraction of distance along route (0-1)
 * @returns {object} {lat, lon} of intermediate point
 */
export function intermediatePoint(lat1, lon1, lat2, lon2, fraction) {
  const φ1 = toRadians(lat1);
  const λ1 = toRadians(lon1);
  const φ2 = toRadians(lat2);
  const λ2 = toRadians(lon2);

  const Δφ = φ2 - φ1;
  const Δλ = λ2 - λ1;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const δ = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const A = Math.sin((1 - fraction) * δ) / Math.sin(δ);
  const B = Math.sin(fraction * δ) / Math.sin(δ);

  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);

  const φ3 = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λ3 = Math.atan2(y, x);

  return {
    lat: toDegrees(φ3),
    lon: toDegrees(λ3)
  };
}

/**
 * Segment a route into equal-distance waypoints
 * @param {number} lat1 - Start latitude
 * @param {number} lon1 - Start longitude
 * @param {number} lat2 - End latitude
 * @param {number} lon2 - End longitude
 * @param {number} segmentDistanceNM - Distance between segments in NM
 * @returns {Array} Array of {lat, lon, distance} waypoints
 */
export function segmentRoute(lat1, lon1, lat2, lon2, segmentDistanceNM) {
  const totalDistance = calculateDistance(lat1, lon1, lat2, lon2);
  const numSegments = Math.ceil(totalDistance / segmentDistanceNM);
  const segments = [];

  for (let i = 0; i <= numSegments; i++) {
    const fraction = i / numSegments;
    const point = intermediatePoint(lat1, lon1, lat2, lon2, fraction);
    segments.push({
      lat: point.lat,
      lon: point.lon,
      distance: fraction * totalDistance
    });
  }

  return segments;
}

/**
 * Calculate magnetic declination using geomag library or fallback
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {number} altitudeMeters - Altitude in meters
 * @param {Date} date - Date for calculation
 * @returns {number} Magnetic declination in degrees (positive = east)
 */
export function calculateMagneticDeclination(lat, lon, altitudeMeters = 0, date = new Date()) {
  if (geomag) {
    const mag = geomag.model().point([lat, lon, altitudeMeters / 1000]); // geomag expects km
    return mag.decl;
  } else {
    // Fallback: use simple approximation based on IGRF-13 coefficients
    // This is a very rough approximation and should be replaced with proper geomag
    // For now, return a placeholder that indicates we need the library
    console.warn('Using approximate magnetic declination - install geomag for accuracy');
    // Very rough approximation for continental US: varies from -20° (west) to +20° (east)
    // Eastern US: ~-15° to -10°, Western US: ~10° to 20°
    const approxDeclination = (lon + 100) / 10; // Very rough estimate
    return Math.max(-20, Math.min(20, approxDeclination));
  }
}

/**
 * Fetch airport data from OurAirports or FAA database
 * For now, returns a mock implementation - should be replaced with actual data fetch
 * @param {string} icaoCode - ICAO airport code
 * @returns {Promise<object>} Airport data with {icao, lat, lon, elevation}
 */
export async function getAirportData(icaoCode) {
  // TODO: Replace with actual airport database fetch
  // Options:
  // 1. Bundle a local JSON file with airport data
  // 2. Fetch from OurAirports CSV: https://ourairports.com/data/
  // 3. Fetch from FAA airport database
  
  // For now, return mock data for testing
  // This should be replaced with actual implementation
  const mockAirports = {
    'KBOS': { icao: 'KBOS', lat: 42.3643, lon: -71.0052, elevation: 19 },
    'KJFK': { icao: 'KJFK', lat: 40.6413, lon: -73.7781, elevation: 13 },
    'KLGA': { icao: 'KLGA', lat: 40.7769, lon: -73.8740, elevation: 21 },
    'KEWR': { icao: 'KEWR', lat: 40.6925, lon: -74.1687, elevation: 18 },
    'KPHL': { icao: 'KPHL', lat: 39.8729, lon: -75.2437, elevation: 36 },
    'KDCA': { icao: 'KDCA', lat: 38.8521, lon: -77.0377, elevation: 15 },
  };

  const airport = mockAirports[icaoCode.toUpperCase()];
  if (!airport) {
    throw new Error(`Airport ${icaoCode} not found in database`);
  }
  
  return airport;
}

/**
 * Get list of all airports for autocomplete
 * @returns {Promise<Array>} List of airport codes and names
 */
export async function getAllAirports() {
  // TODO: Return full airport list for autocomplete
  // For now, return limited mock list
  return [
    { code: 'KBOS', name: 'Boston Logan International' },
    { code: 'KJFK', name: 'New York JFK International' },
    { code: 'KLGA', name: 'New York LaGuardia' },
    { code: 'KEWR', name: 'Newark Liberty International' },
    { code: 'KPHL', name: 'Philadelphia International' },
    { code: 'KDCA', name: 'Washington Reagan National' },
  ];
}

/**
 * Parse winds aloft forecast data
 * @param {string} rawData - Raw text from aviationweather.gov API
 * @returns {object} Parsed forecast data
 */
export function parseWindsAloft(rawData) {
  const lines = rawData.split('\n');
  
  // Parse header info
  const validLine = lines.find(l => l.includes('VALID'));
  const tempNegLine = lines.find(l => l.includes('TEMPS NEG ABV'));
  
  let validTime = null;
  let useFrom = null;
  let useTo = null;
  let tempsNegativeAbove = 24000;
  
  if (validLine) {
    const validMatch = validLine.match(/VALID\s+(\d{6})Z\s+FOR USE\s+(\d{4})-(\d{4})Z/);
    if (validMatch) {
      validTime = validMatch[1];
      useFrom = validMatch[2];
      useTo = validMatch[3];
    }
  }
  
  if (tempNegLine) {
    const tempMatch = tempNegLine.match(/TEMPS NEG ABV\s+(\d+)/);
    if (tempMatch) {
      tempsNegativeAbove = parseInt(tempMatch[1]);
    }
  }
  
  // Parse altitude levels
  const ftLine = lines.find(l => l.trim().startsWith('FT'));
  let altitudes = [];
  if (ftLine) {
    const matches = ftLine.match(/\d+/g);
    altitudes = matches ? matches.map(Number) : [];
  }
  
  // Parse airport data
  const airports = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('(') || line.startsWith('FD') || 
        line.startsWith('DATA') || line.startsWith('VALID') || 
        line.startsWith('FT') || line.includes('TEMPS NEG')) {
      continue;
    }
    
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const airportCode = parts[0];
      const windData = parts.slice(1);
      
      const airportWinds = {};
      altitudes.forEach((alt, idx) => {
        if (idx < windData.length && windData[idx] !== '9900') {
          const data = windData[idx];
          let direction = null;
          let speed = null;
          let temp = null;
          
          if (data.length === 4) {
            // Format: DDSS (e.g., 3315 = 330° at 15kt)
            direction = parseInt(data.substring(0, 2)) * 10;
            speed = parseInt(data.substring(2, 4));
          } else if (data.length >= 6) {
            // Format: DDSSTT or DDSSMTT (e.g., 2613-17 = 260° at 13kt, -17°C)
            const match = data.match(/(\d{2})(\d{2})([+-]?\d{2})/);
            if (match) {
              direction = parseInt(match[1]) * 10;
              speed = parseInt(match[2]);
              temp = parseInt(match[3]);
              // Apply negative temperature rule if above threshold
              if (alt >= tempsNegativeAbove && temp > 0) {
                temp = -temp;
              }
            }
          }
          
          if (direction !== null && speed !== null) {
            airportWinds[alt] = { direction, speed, temp };
          }
        }
      });
      
      if (Object.keys(airportWinds).length > 0) {
        airports[airportCode] = airportWinds;
      }
    }
  }
  
  return {
    validTime,
    useFrom,
    useTo,
    tempsNegativeAbove,
    altitudes,
    airports
  };
}

/**
 * Fetch winds aloft data for all forecast periods
 * @param {string} region - Region code (e.g., 'bos', 'mia', 'chi')
 * @returns {Promise<Array>} Array of forecast objects for 6hr, 12hr, 24hr
 */
export async function fetchWindsAloft(region) {
  const forecasts = [];
  
  for (const fcst of [6, 12, 24]) {
    try {
      const url = `https://aviationweather.gov/api/data/windtemp?region=${region}&fcst=${fcst}&level=low&format=raw`;
      const response = await fetch(url);
      const rawData = await response.text();
      const parsed = parseWindsAloft(rawData);
      parsed.forecastHour = fcst;
      forecasts.push(parsed);
    } catch (error) {
      console.error(`Failed to fetch ${fcst}hr forecast:`, error);
    }
  }
  
  return forecasts;
}

/**
 * Select appropriate forecast based on departure time
 * @param {Array} forecasts - Array of forecast objects
 * @param {Date} departureTime - Planned departure time
 * @returns {object} Selected forecast with warning if applicable
 */
export function selectForecast(forecasts, departureTime) {
  const departureUTC = departureTime.getUTCHours() * 100 + departureTime.getUTCMinutes();
  
  for (const forecast of forecasts) {
    if (forecast.useFrom && forecast.useTo) {
      let useFrom = parseInt(forecast.useFrom);
      let useTo = parseInt(forecast.useTo);
      
      // Handle wrap-around midnight
      if (useTo < useFrom) {
        if (departureUTC >= useFrom || departureUTC <= useTo) {
          return { forecast, warning: null };
        }
      } else {
        if (departureUTC >= useFrom && departureUTC <= useTo) {
          return { forecast, warning: null };
        }
      }
    }
  }
  
  // No exact match - use closest available
  const lastForecast = forecasts[forecasts.length - 1];
  const warning = `Departure time ${departureTime.toISOString()} is outside forecast validity. Using ${lastForecast.forecastHour}hr forecast (valid ${lastForecast.useFrom}-${lastForecast.useTo}Z).`;
  
  return { forecast: lastForecast, warning };
}

/**
 * Determine region code from latitude/longitude
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string} Region code for winds aloft
 */
export function determineRegion(lat, lon) {
  // Simplified region determination for CONUS
  // Northeast: BOS, Southeast: MIA, Northcentral: CHI, Southcentral: DFW
  // Rocky Mountains: SLC, Pacific Coast: SFO
  
  if (lat > 38) {
    if (lon > -85) return 'bos'; // Northeast
    else if (lon > -105) return 'chi'; // Northcentral
    else return 'slc'; // Rocky Mountains
  } else {
    if (lon > -90) return 'mia'; // Southeast
    else if (lon > -105) return 'dfw'; // Southcentral
    else return 'sfo'; // Pacific Coast
  }
}

/**
 * Find nearest airport from winds aloft data
 * @param {number} lat - Latitude to search near
 * @param {number} lon - Longitude to search near
 * @param {object} windsAloftData - Parsed winds aloft data
 * @returns {string} Nearest airport code
 */
export async function findNearestWindsAloftAirport(lat, lon, windsAloftData) {
  // TODO: Load actual coordinates for winds aloft airports
  // For now, just return first available airport
  const airports = Object.keys(windsAloftData.airports);
  return airports.length > 0 ? airports[0] : null;
}

/**
 * Parse METAR data
 * @param {string} rawMetar - Raw METAR text
 * @returns {object} Parsed METAR with altimeter, temp, etc.
 */
export function parseMetar(rawMetar) {
  // Basic METAR parsing
  const altimeterMatch = rawMetar.match(/A(\d{4})/);
  const tempMatch = rawMetar.match(/\s(M?\d{2})\/(M?\d{2})\s/);
  
  let altimeter = 29.92; // Standard
  let tempC = 15; // ISA standard
  
  if (altimeterMatch) {
    altimeter = parseInt(altimeterMatch[1]) / 100;
  }
  
  if (tempMatch) {
    const tempStr = tempMatch[1];
    tempC = tempStr.startsWith('M') ? -parseInt(tempStr.substring(1)) : parseInt(tempStr);
  }
  
  return { altimeter, tempC };
}

/**
 * Fetch METAR data for airport
 * @param {string} icaoCode - Airport ICAO code
 * @returns {Promise<object>} Parsed METAR data
 */
export async function fetchMetar(icaoCode) {
  try {
    const url = `https://aviationweather.gov/api/data/metar?ids=${icaoCode}&format=raw`;
    const response = await fetch(url);
    const rawData = await response.text();
    return parseMetar(rawData);
  } catch (error) {
    console.error(`Failed to fetch METAR for ${icaoCode}:`, error);
    // Return standard atmosphere as fallback
    return { altimeter: 29.92, tempC: 15 };
  }
}

/**
 * Interpolate wind data for a given altitude
 * @param {object} airportWinds - Wind data for airport at different altitudes
 * @param {number} altitude - Target altitude in feet
 * @returns {object} Interpolated {direction, speed, temp}
 */
export function interpolateWind(airportWinds, altitude) {
  const altitudes = Object.keys(airportWinds).map(Number).sort((a, b) => a - b);
  
  if (altitudes.length === 0) {
    return { direction: 0, speed: 0, temp: 15 };
  }
  
  // Find bounding altitudes
  let lowerAlt = altitudes[0];
  let upperAlt = altitudes[altitudes.length - 1];
  
  for (let i = 0; i < altitudes.length - 1; i++) {
    if (altitudes[i] <= altitude && altitudes[i + 1] >= altitude) {
      lowerAlt = altitudes[i];
      upperAlt = altitudes[i + 1];
      break;
    }
  }
  
  // If altitude is outside range, use nearest
  if (altitude <= lowerAlt) {
    return airportWinds[lowerAlt];
  }
  if (altitude >= upperAlt) {
    return airportWinds[upperAlt];
  }
  
  // Linear interpolation
  const lowerData = airportWinds[lowerAlt];
  const upperData = airportWinds[upperAlt];
  const fraction = (altitude - lowerAlt) / (upperAlt - lowerAlt);
  
  // For wind direction, need to handle wraparound
  let dir1 = lowerData.direction;
  let dir2 = upperData.direction;
  if (Math.abs(dir2 - dir1) > 180) {
    if (dir2 > dir1) dir1 += 360;
    else dir2 += 360;
  }
  
  const direction = ((dir1 + (dir2 - dir1) * fraction) + 360) % 360;
  const speed = lowerData.speed + (upperData.speed - lowerData.speed) * fraction;
  
  let temp = null;
  if (lowerData.temp !== null && upperData.temp !== null) {
    temp = lowerData.temp + (upperData.temp - lowerData.temp) * fraction;
  }
  
  return { direction, speed, temp };
}

/**
 * Convert IAS to TAS using ISA model
 * @param {number} ias - Indicated airspeed in knots
 * @param {number} altitudeFeet - Pressure altitude in feet
 * @param {number} tempC - Temperature in Celsius
 * @param {number} altimeterInHg - Altimeter setting in inHg
 * @returns {number} True airspeed in knots
 */
export function iasToTas(ias, altitudeFeet, tempC, altimeterInHg = 29.92) {
  // Convert altitude to pressure altitude
  const pressureAltitude = altitudeFeet + (29.92 - altimeterInHg) * 1000;
  const altitudeMeters = pressureAltitude * FEET_TO_METERS;
  
  // ISA temperature at altitude
  const isaTemp = STANDARD_TEMP_KELVIN - TEMP_LAPSE_RATE * altitudeMeters;
  const actualTemp = tempC + 273.15; // Convert to Kelvin
  
  // Density ratio
  const densityRatio = Math.pow(1 - (TEMP_LAPSE_RATE * altitudeMeters / STANDARD_TEMP_KELVIN), 4.256);
  const tempRatio = actualTemp / isaTemp;
  
  // TAS = IAS * sqrt(1/density_ratio) * sqrt(temp_ratio)
  const tas = ias * Math.sqrt(1 / densityRatio) * Math.sqrt(tempRatio);
  
  return tas;
}

/**
 * Calculate groundspeed using wind triangle
 * @param {number} tas - True airspeed in knots
 * @param {number} trueCourse - True course in degrees
 * @param {number} windDirection - Wind direction (from) in degrees
 * @param {number} windSpeed - Wind speed in knots
 * @returns {object} {groundspeed, trueHeading, windComponent}
 */
export function calculateGroundspeed(tas, trueCourse, windDirection, windSpeed) {
  // Convert to radians
  const courseRad = toRadians(trueCourse);
  const windDirRad = toRadians(windDirection);
  
  // Wind vector components (from direction, so add 180°)
  const windFromRad = windDirRad + Math.PI;
  const windNorth = windSpeed * Math.cos(windFromRad);
  const windEast = windSpeed * Math.sin(windFromRad);
  
  // Aircraft velocity components (no wind)
  const acNorth = tas * Math.cos(courseRad);
  const acEast = tas * Math.sin(courseRad);
  
  // Ground velocity components
  const gsNorth = acNorth + windNorth;
  const gsEast = acEast + windEast;
  
  // Calculate groundspeed and true heading
  const groundspeed = Math.sqrt(gsNorth * gsNorth + gsEast * gsEast);
  const trueHeading = (toDegrees(Math.atan2(gsEast, gsNorth)) + 360) % 360;
  
  // Wind component (positive = tailwind, negative = headwind)
  const windComponent = windSpeed * Math.cos(windFromRad - courseRad);
  
  return { groundspeed, trueHeading, windComponent };
}

/**
 * Generate candidate altitudes
 * @param {number} minAlt - Minimum altitude in feet
 * @param {number} maxAlt - Maximum altitude in feet
 * @param {number} magneticHeading - Initial magnetic heading
 * @param {boolean} includeVFR - Include VFR-specific altitudes
 * @returns {object} {theoretical: [], vfr: []}
 */
export function generateCandidateAltitudes(minAlt, maxAlt, magneticHeading, includeVFR) {
  const theoretical = [];
  const vfr = [];
  
  // Generate theoretical altitudes (every 1000 feet)
  for (let alt = Math.ceil(minAlt / 1000) * 1000; alt <= maxAlt; alt += 1000) {
    theoretical.push(alt);
  }
  
  // Generate VFR altitudes if requested
  if (includeVFR) {
    // VFR: 0-179° magnetic = odd thousands + 500, 180-359° = even thousands + 500
    const useOdd = magneticHeading >= 0 && magneticHeading < 180;
    
    for (let alt = Math.ceil(minAlt / 1000) * 1000; alt <= maxAlt; alt += 1000) {
      const isOdd = (alt / 1000) % 2 === 1;
      if ((useOdd && isOdd) || (!useOdd && !isOdd)) {
        const vfrAlt = alt + 500;
        if (vfrAlt <= maxAlt) {
          vfr.push(vfrAlt);
        }
      }
    }
  }
  
  return { theoretical, vfr };
}

/**
 * Calculate optimal altitude for a route
 * @param {object} params - Flight parameters
 * @returns {Promise<object>} Results with optimal altitudes and details
 */
export async function calculateOptimalAltitude(params) {
  const {
    departureIcao,
    destinationIcao,
    indicatedAirspeed,
    departureTime,
    minAltitude,
    maxAltitude,
    resolutionNM,
    includeVFR
  } = params;
  
  // Get airport data
  const depAirport = await getAirportData(departureIcao);
  const destAirport = await getAirportData(destinationIcao);
  
  // Calculate route information
  const distance = calculateDistance(
    depAirport.lat, depAirport.lon,
    destAirport.lat, destAirport.lon
  );
  const trueCourse = calculateBearing(
    depAirport.lat, depAirport.lon,
    destAirport.lat, destAirport.lon
  );
  
  // Calculate magnetic declination and heading
  const magDeclination = calculateMagneticDeclination(
    depAirport.lat, depAirport.lon, 0, departureTime
  );
  const magneticHeading = (trueCourse - magDeclination + 360) % 360;
  
  // Generate route segments
  const segments = segmentRoute(
    depAirport.lat, depAirport.lon,
    destAirport.lat, destAirport.lon,
    resolutionNM
  );
  
  // Determine region and fetch winds aloft
  const region = determineRegion(depAirport.lat, depAirport.lon);
  const forecasts = await fetchWindsAloft(region);
  const { forecast, warning } = selectForecast(forecasts, departureTime);
  
  // Generate candidate altitudes
  const altitudes = generateCandidateAltitudes(
    minAltitude, maxAltitude, magneticHeading, includeVFR
  );
  
  // Calculate groundspeed for each altitude
  const results = {
    theoretical: [],
    vfr: []
  };
  
  for (const altType of ['theoretical', 'vfr']) {
    for (const altitude of altitudes[altType]) {
      let totalGroundspeed = 0;
      const segmentDetails = [];
      
      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        
        // Find nearest winds aloft airport
        const nearestAirport = await findNearestWindsAloftAirport(
          segment.lat, segment.lon, forecast
        );
        
        // Get wind data for this segment
        const airportWinds = forecast.airports[nearestAirport] || {};
        const wind = interpolateWind(airportWinds, altitude);
        
        // Get METAR data (use departure airport for now as proxy)
        const metar = await fetchMetar(departureIcao);
        
        // Calculate TAS
        const tas = iasToTas(
          indicatedAirspeed,
          altitude,
          wind.temp !== null ? wind.temp : metar.tempC,
          metar.altimeter
        );
        
        // Calculate groundspeed
        const gs = calculateGroundspeed(
          tas, trueCourse, wind.direction, wind.speed
        );
        
        totalGroundspeed += gs.groundspeed;
        segmentDetails.push({
          lat: segment.lat,
          lon: segment.lon,
          nearestAirport,
          wind,
          tas,
          groundspeed: gs.groundspeed,
          windComponent: gs.windComponent
        });
      }
      
      const avgGroundspeed = totalGroundspeed / (segments.length - 1);
      const estimatedTime = distance / avgGroundspeed; // hours
      
      results[altType].push({
        altitude,
        avgGroundspeed,
        estimatedTime,
        segments: segmentDetails
      });
    }
  }
  
  // Find optimal altitudes
  const optimalTheoretical = results.theoretical.reduce((best, curr) =>
    curr.avgGroundspeed > best.avgGroundspeed ? curr : best
  );
  
  const optimalVFR = results.vfr.length > 0 ? results.vfr.reduce((best, curr) =>
    curr.avgGroundspeed > best.avgGroundspeed ? curr : best
  ) : null;
  
  return {
    route: {
      departure: depAirport,
      destination: destAirport,
      distance,
      trueCourse,
      magneticHeading,
      magDeclination
    },
    forecast: {
      region,
      validTime: forecast.validTime,
      useFrom: forecast.useFrom,
      useTo: forecast.useTo,
      warning
    },
    optimal: {
      theoretical: optimalTheoretical,
      vfr: optimalVFR
    },
    allResults: results
  };
}
