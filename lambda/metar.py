"""
Lambda function to proxy METAR data from aviationweather.gov

This function fetches METAR data and returns it with proper CORS headers
to allow the frontend to access the data without CORS restrictions.
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
    Lambda handler for METAR proxy
    
    Query Parameters:
        icao (str): Airport ICAO code (e.g., 'KBOS', 'KJFK')
    
    Returns:
        dict: API Gateway response with METAR data or error
    """
    
    # Get query parameters with defaults
    query_params = event.get('queryStringParameters') or {}
    icao = query_params.get('icao', 'KBOS')
    
    # Normalize ICAO code to uppercase
    icao = icao.upper().strip()
    
    logger.info(f"Fetching METAR for: {icao}")
    
    # Basic validation - ICAO codes are typically 4 characters
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
    
    # Build URL to aviationweather.gov
    url = f'https://aviationweather.gov/api/data/metar?ids={icao}&format=raw'
    
    try:
        # Fetch data from aviationweather.gov
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Website-Weather-Proxy/1.0')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read().decode('utf-8')
            status_code = response.getcode()
        
        logger.info(f"Successfully fetched METAR data for {icao} (status: {status_code}, length: {len(data)})")
        
        # Return with CORS headers
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Content-Type': 'text/plain',
                'Cache-Control': 'max-age=300'  # Cache for 5 minutes
            },
            'body': data
        }
        
    except urllib.error.HTTPError as e:
        logger.error(f"HTTP error fetching METAR for {icao}: {e.code} {e.reason}")
        return {
            'statusCode': e.code,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Failed to fetch METAR data: HTTP {e.code} {e.reason}'
            })
        }
        
    except urllib.error.URLError as e:
        logger.error(f"URL error fetching METAR for {icao}: {e.reason}")
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
        logger.error(f"Unexpected error fetching METAR for {icao}: {str(e)}", exc_info=True)
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
