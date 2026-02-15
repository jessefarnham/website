"""
Lambda function to proxy winds aloft data from aviationweather.gov

This function fetches winds aloft forecast data and returns it with proper CORS headers
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
        
        # Return with CORS headers
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Content-Type': 'text/plain',
                'Cache-Control': 'max-age=1800'  # Cache for 30 minutes
            },
            'body': data
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
