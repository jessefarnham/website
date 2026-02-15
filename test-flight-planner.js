/**
 * Manual test script for flight planner
 * Run with: node test-flight-planner.js
 * 
 * This tests the flight planner with real API calls to verify it works in production.
 */

// Use node-fetch for Node.js environment
global.fetch = require('node-fetch');

// Import the flight planner functions
const {
  calculateOptimalAltitude,
  fetchWindsAloft,
  calculateMagneticDeclination,
} = require('./src/lib/flightPlanner.js');

async function testFlightPlanner() {
  console.log('=== Flight Planner Manual Test ===\n');
  
  // Test 1: Magnetic declination
  console.log('Test 1: Calculating magnetic declination for Boston...');
  try {
    const declination = calculateMagneticDeclination(42.3643, -71.0052, 0, new Date());
    console.log(`✓ Boston magnetic declination: ${declination.toFixed(2)}°\n`);
  } catch (error) {
    console.error('✗ Failed:', error.message, '\n');
  }
  
  // Test 2: Fetch winds aloft
  console.log('Test 2: Fetching winds aloft for BOS region...');
  try {
    const forecasts = await fetchWindsAloft('bos');
    console.log(`✓ Fetched ${forecasts.length} forecast periods`);
    if (forecasts.length > 0) {
      console.log(`  First forecast: ${forecasts[0].forecastHour}hr, valid ${forecasts[0].useFrom}-${forecasts[0].useTo}Z`);
      console.log(`  Airports in forecast: ${Object.keys(forecasts[0].airports).length}`);
      console.log(`  Sample airports: ${Object.keys(forecasts[0].airports).slice(0, 5).join(', ')}\n`);
    }
  } catch (error) {
    console.error('✗ Failed:', error.message, '\n');
  }
  
  // Test 3: Full flight plan calculation
  console.log('Test 3: Calculating flight plan from KBOS to KJFK...');
  try {
    const params = {
      departureIcao: 'KBOS',
      destinationIcao: 'KJFK',
      indicatedAirspeed: 100,
      departureTime: new Date(),
      minAltitude: 3000,
      maxAltitude: 8000,
      resolutionNM: 25,
      includeVFR: true
    };
    
    const result = await calculateOptimalAltitude(params);
    
    console.log('✓ Flight plan calculated successfully!\n');
    console.log('Route Information:');
    console.log(`  Distance: ${result.route.distance.toFixed(1)} NM`);
    console.log(`  True Course: ${result.route.trueCourse.toFixed(1)}°`);
    console.log(`  Magnetic Heading: ${result.route.magneticHeading.toFixed(1)}°`);
    console.log(`  Magnetic Declination: ${result.route.magDeclination.toFixed(1)}°\n`);
    
    console.log('Forecast Information:');
    console.log(`  Region: ${result.forecast.region.toUpperCase()}`);
    console.log(`  Valid time: ${result.forecast.validTime}`);
    console.log(`  Use from: ${result.forecast.useFrom}Z to ${result.forecast.useTo}Z`);
    if (result.forecast.warning) {
      console.log(`  Warning: ${result.forecast.warning}`);
    }
    console.log();
    
    if (result.optimal.theoretical) {
      console.log('Optimal Theoretical Altitude:');
      console.log(`  Altitude: ${result.optimal.theoretical.altitude} ft`);
      console.log(`  Average Groundspeed: ${result.optimal.theoretical.avgGroundspeed.toFixed(1)} kts`);
      console.log(`  Estimated Time: ${(result.optimal.theoretical.estimatedTime * 60).toFixed(1)} minutes\n`);
    }
    
    if (result.optimal.vfr) {
      console.log('Optimal VFR Altitude:');
      console.log(`  Altitude: ${result.optimal.vfr.altitude} ft`);
      console.log(`  Average Groundspeed: ${result.optimal.vfr.avgGroundspeed.toFixed(1)} kts`);
      console.log(`  Estimated Time: ${(result.optimal.vfr.estimatedTime * 60).toFixed(1)} minutes\n`);
    }
    
    console.log('All Theoretical Altitudes:');
    result.allResults.theoretical.forEach(alt => {
      console.log(`  ${alt.altitude} ft: ${alt.avgGroundspeed.toFixed(1)} kts GS, ${(alt.estimatedTime * 60).toFixed(1)} min`);
    });
    console.log();
    
    if (result.allResults.vfr.length > 0) {
      console.log('All VFR Altitudes:');
      result.allResults.vfr.forEach(alt => {
        console.log(`  ${alt.altitude} ft: ${alt.avgGroundspeed.toFixed(1)} kts GS, ${(alt.estimatedTime * 60).toFixed(1)} min`);
      });
      console.log();
    }
    
    console.log('=== ALL TESTS PASSED ===');
    
  } catch (error) {
    console.error('✗ Failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the tests
testFlightPlanner().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
