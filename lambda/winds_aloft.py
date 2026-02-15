"""
Lambda function to proxy winds aloft data from aviationweather.gov

This function fetches winds aloft forecast data and returns it with proper CORS headers
to allow the frontend to access the data without CORS restrictions.

It also enriches the response with station coordinates to avoid additional API calls.
"""

import urllib.request
import urllib.error
import json
import logging
import re

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Cache for station coordinates (persists across Lambda invocations)
_station_coords_cache = {}


def extract_station_codes(raw_data):
    """
    Extract station codes from winds aloft raw data.
    Station codes are 3-letter codes at the start of data lines.
    """
    stations = set()
    lines = raw_data.split('\n')
    
    for line in lines:
        line = line.strip()
        # Skip header lines and empty lines
        if not line or line.startswith('(') or line.startswith('FD') or \
           line.startswith('DATA') or line.startswith('VALID') or \
           line.startswith('FT') or 'TEMPS NEG' in line:
            continue
        
        # Station code is first 3 characters
        parts = line.split()
        if parts and len(parts[0]) == 3 and parts[0].isalpha():
            stations.add(parts[0])
    
    return list(stations)


def fetch_station_coordinates(station_codes):
    """
    Fetch coordinates for multiple stations from aviationweather.gov.
    Uses cache to avoid repeated lookups.
    """
    global _station_coords_cache
    
    coords = {}
    codes_to_fetch = []
    
    # Check cache first
    for code in station_codes:
        if code in _station_coords_cache:
            if _station_coords_cache[code] is not None:
                coords[code] = _station_coords_cache[code]
        else:
            codes_to_fetch.append(code)
    
    if not codes_to_fetch:
        return coords
    
    # Fetch coordinates for uncached stations
    # Convert 3-letter FAA codes to ICAO (add K prefix)
    icao_codes = ['K' + code for code in codes_to_fetch]
    ids_param = ','.join(icao_codes)
    
    url = f'https://aviationweather.gov/api/data/stationinfo?ids={ids_param}&format=json'
    
    try:
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Website-Weather-Proxy/1.0')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read().decode('utf-8')
        
        if data:
            stations_data = json.loads(data)
            for station in stations_data:
                icao = station.get('icaoId', '')
                # Convert back to 3-letter code
                faa_code = icao[1:] if icao.startswith('K') and len(icao) == 4 else icao
                if faa_code in codes_to_fetch:
                    coord = {
                        'lat': station.get('lat'),
                        'lon': station.get('lon')
                    }
                    coords[faa_code] = coord
                    _station_coords_cache[faa_code] = coord
        
        # Mark stations not found as None in cache
        for code in codes_to_fetch:
            if code not in coords:
                _station_coords_cache[code] = None
                
    except Exception as e:
        logger.warning(f"Failed to fetch station coordinates: {e}")
        # Mark all as None in cache to avoid retrying
        for code in codes_to_fetch:
            _station_coords_cache[code] = None
    
    return coords


def handler(event, context):
    """
    Lambda handler for winds aloft proxy
    
    Query Parameters:
        region (str): Region code (e.g., 'bos', 'mia', 'chi')
        fcst (str): Forecast period (6, 12, or 24 hours)
    
    Returns:
        dict: API Gateway response with winds aloft data or error
    """
    
    # Get query parameters with defaults
    query_params = event.get('queryStringParameters') or {}
    region = query_params.get('region', 'bos')
    fcst = query_params.get('fcst', '6')
    
    logger.info(f"Fetching winds aloft: region={region}, fcst={fcst}")
    
    # Validate parameters
    valid_regions = ['bos', 'mia', 'chi', 'dfw', 'slc', 'sfo']
    valid_fcsts = ['6', '12', '24']
    
    if region not in valid_regions:
        logger.warning(f"Invalid region: {region}")
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Invalid region. Must be one of: {", ".join(valid_regions)}'
            })
        }
    
    if fcst not in valid_fcsts:
        logger.warning(f"Invalid forecast period: {fcst}")
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Invalid forecast period. Must be one of: {", ".join(valid_fcsts)}'
            })
        }
    
    # Build URL to aviationweather.gov
    url = f'https://aviationweather.gov/api/data/windtemp?region={region}&fcst={fcst}&level=low&format=raw'
    
    try:
        # Fetch data from aviationweather.gov
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Website-Weather-Proxy/1.0')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read().decode('utf-8')
            status_code = response.getcode()
        
        logger.info(f"Successfully fetched winds aloft data (status: {status_code}, length: {len(data)})")
        
        # Extract station codes and fetch their coordinates
        station_codes = extract_station_codes(data)
        logger.info(f"Found {len(station_codes)} stations: {station_codes}")
        
        station_coords = fetch_station_coordinates(station_codes)
        logger.info(f"Fetched coordinates for {len(station_coords)} stations")
        
        # Return JSON with both raw data and coordinates
        response_data = {
            'raw': data,
            'stationCoords': station_coords
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=1800'  # Cache for 30 minutes
            },
            'body': json.dumps(response_data)
        }
        
    except urllib.error.HTTPError as e:
        logger.error(f"HTTP error fetching winds aloft: {e.code} {e.reason}")
        return {
            'statusCode': e.code,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Failed to fetch winds aloft data: HTTP {e.code} {e.reason}'
            })
        }
        
    except urllib.error.URLError as e:
        logger.error(f"URL error fetching winds aloft: {e.reason}")
        return {
            'statusCode': 503,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Failed to connect to weather service: {str(e.reason)}'
            })
        }
        
    except Exception as e:
        logger.error(f"Unexpected error fetching winds aloft: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            })
        }
