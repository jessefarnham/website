"""
Lambda function to fetch airport data from aviationweather.gov stations API

This function fetches airport/station data and returns it with proper CORS headers.
"""

import urllib.request
import urllib.error
import json
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    """
    Lambda handler for airport data lookup
    
    Query Parameters:
        icao (str): Airport ICAO code (e.g., 'KBOS', 'KJFK')
    
    Returns:
        dict: API Gateway response with airport data or error
    """
    
    # Get query parameters
    query_params = event.get('queryStringParameters') or {}
    icao = query_params.get('icao', '')
    
    # Normalize ICAO code to uppercase
    icao = icao.upper().strip()
    
    logger.info(f"Fetching airport data for: {icao}")
    
    # Basic validation
    if not icao or len(icao) < 3 or len(icao) > 4:
        logger.warning(f"Invalid ICAO code: {icao}")
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': 'Invalid ICAO code. Must be 3-4 characters (e.g., KBOS, KJFK)'
            })
        }
    
    # Build URL to aviationweather.gov stations API
    url = f'https://aviationweather.gov/api/data/stationinfo?ids={icao}&format=json'
    
    try:
        # Fetch data from aviationweather.gov
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Website-Airport-Proxy/1.0')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read().decode('utf-8')
            status_code = response.getcode()
        
        # Parse the JSON response (empty string means no results)
        if not data or data.strip() == '':
            logger.warning(f"Airport not found: {icao}")
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': f'Airport {icao} not found in FAA database'
                })
            }
        
        stations = json.loads(data)
        
        if not stations or len(stations) == 0:
            logger.warning(f"Airport not found: {icao}")
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': f'Airport {icao} not found in FAA database'
                })
            }
        
        # Extract the first station (should be exact match)
        station = stations[0]
        
        # Build response with relevant fields
        airport_data = {
            'icao': station.get('icaoId', icao),
            'name': station.get('site', 'Unknown'),  # 'site' field contains the name
            'lat': station.get('lat'),
            'lon': station.get('lon'),
            'elevation': station.get('elev'),  # in meters from API
            'state': station.get('state', ''),
            'country': station.get('country', '')
        }
        
        # Convert elevation from meters to feet if present
        if airport_data['elevation'] is not None:
            airport_data['elevation'] = round(airport_data['elevation'] * 3.28084)
        
        logger.info(f"Successfully fetched airport data for {icao}: {airport_data}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=86400'  # Cache for 24 hours (airport data rarely changes)
            },
            'body': json.dumps(airport_data)
        }
        
    except urllib.error.HTTPError as e:
        logger.error(f"HTTP error fetching airport {icao}: {e.code} {e.reason}")
        return {
            'statusCode': e.code,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Failed to fetch airport data: HTTP {e.code} {e.reason}'
            })
        }
        
    except urllib.error.URLError as e:
        logger.error(f"URL error fetching airport {icao}: {e.reason}")
        return {
            'statusCode': 503,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Failed to connect to aviation service: {str(e.reason)}'
            })
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error for airport {icao}: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': 'Invalid response from aviation service'
            })
        }
        
    except Exception as e:
        logger.error(f"Unexpected error fetching airport {icao}: {str(e)}", exc_info=True)
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
