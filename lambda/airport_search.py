"""
Lambda function to search airports from aviationweather.gov stations API

This function fetches all US airports and filters by search query.
Results are cached in Lambda memory for performance.
"""

import urllib.request
import urllib.error
import json
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Cache for airport data (persists across Lambda invocations in same container)
_airport_cache = None


def fetch_all_airports():
    """Fetch all US airports from OurAirports open data"""
    global _airport_cache
    
    if _airport_cache is not None:
        logger.info("Using cached airport data")
        return _airport_cache
    
    logger.info("Fetching airports from OurAirports")
    
    # OurAirports provides free, open airport data
    url = 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv'
    
    try:
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Website-Airport-Search/1.0')
        
        with urllib.request.urlopen(req, timeout=30) as response:
            data = response.read().decode('utf-8')
        
        # Parse CSV data
        import csv
        from io import StringIO
        
        reader = csv.DictReader(StringIO(data))
        airports = []
        
        for row in reader:
            # Only include US airports with valid ICAO codes
            if row.get('iso_country') != 'US':
                continue
            
            # Use ident as primary identifier, prefer icao_code if available
            icao = row.get('icao_code') or row.get('ident', '')
            if not icao or len(icao) < 3:
                continue
            
            # Only include airports (not heliports, seaplanes bases, etc.) for cleaner results
            airport_type = row.get('type', '')
            if airport_type not in ('large_airport', 'medium_airport', 'small_airport'):
                continue
            
            try:
                lat = float(row.get('latitude_deg', 0))
                lon = float(row.get('longitude_deg', 0))
            except (ValueError, TypeError):
                continue
            
            # Extract state from iso_region (format: US-XX)
            iso_region = row.get('iso_region', '')
            state = iso_region.split('-')[1] if '-' in iso_region else ''
            
            airports.append({
                'icao': icao.upper(),
                'name': row.get('name', 'Unknown'),
                'state': state,
                'lat': lat,
                'lon': lon
            })
        
        # Sort by ICAO code for consistent results
        airports.sort(key=lambda x: x['icao'])
        
        logger.info(f"Loaded {len(airports)} US airports")
        _airport_cache = airports
        return airports
        
    except Exception as e:
        logger.error(f"Failed to fetch airports: {str(e)}")
        return []


def search_airports(query, limit=15):
    """Search airports by ICAO code or name"""
    airports = fetch_all_airports()
    
    if not query:
        return []
    
    query_upper = query.upper().strip()
    query_lower = query.lower().strip()
    
    results = []
    
    # First pass: exact ICAO prefix matches (highest priority)
    for airport in airports:
        if airport['icao'].startswith(query_upper):
            results.append(airport)
            if len(results) >= limit:
                return results
    
    # Second pass: name contains query (if we need more results)
    if len(results) < limit:
        seen_icaos = {a['icao'] for a in results}
        for airport in airports:
            if airport['icao'] not in seen_icaos:
                name_lower = airport['name'].lower()
                if query_lower in name_lower:
                    results.append(airport)
                    if len(results) >= limit:
                        break
    
    return results


def handler(event, context):
    """
    Lambda handler for airport search
    
    Query Parameters:
        q (str): Search query (ICAO prefix or name substring)
        limit (int): Maximum results to return (default 15)
    
    Returns:
        dict: API Gateway response with matching airports
    """
    
    # Get query parameters
    query_params = event.get('queryStringParameters') or {}
    query = query_params.get('q', '')
    
    try:
        limit = int(query_params.get('limit', '15'))
        limit = min(max(limit, 1), 50)  # Clamp between 1 and 50
    except ValueError:
        limit = 15
    
    logger.info(f"Searching airports for: '{query}' (limit: {limit})")
    
    # Require at least 2 characters for search
    if len(query) < 2:
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Content-Type': 'application/json'
            },
            'body': json.dumps([])
        }
    
    try:
        results = search_airports(query, limit)
        
        logger.info(f"Found {len(results)} airports matching '{query}'")
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=3600'  # Cache for 1 hour
            },
            'body': json.dumps(results)
        }
        
    except Exception as e:
        logger.error(f"Error searching airports: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Failed to search airports: {str(e)}'
            })
        }
