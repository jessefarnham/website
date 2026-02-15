# Backend Weather API Proxy Implementation

## Problem
The flight planner needs to fetch weather data from aviationweather.gov, but browser CORS policies block direct requests from the frontend to external APIs.

## Solution
Add proxy endpoints to your existing AWS Lambda backend that fetch the data server-side and return it to the frontend with proper CORS headers.

## Required Backend Changes

### 1. Winds Aloft Proxy Lambda

**Endpoint:** `GET /weather/winds-aloft`

**Query Parameters:**
- `region` - Region code (e.g., 'bos', 'mia', 'chi')
- `fcst` - Forecast period (6, 12, or 24 hours)

**Python Lambda Handler:**
```python
import urllib.request
import json

def lambda_handler(event, context):
    """Proxy winds aloft data from aviationweather.gov"""
    
    # Get query parameters
    region = event.get('queryStringParameters', {}).get('region', 'bos')
    fcst = event.get('queryStringParameters', {}).get('fcst', '6')
    
    # Build URL to aviationweather.gov
    url = f'https://aviationweather.gov/api/data/windtemp?region={region}&fcst={fcst}&level=low&format=raw'
    
    try:
        # Fetch data from aviationweather.gov
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read().decode('utf-8')
        
        # Return with CORS headers
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Content-Type': 'text/plain'
            },
            'body': data
        }
    except urllib.error.HTTPError as e:
        return {
            'statusCode': e.code,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'HTTP {e.code}: {e.reason}'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
```

**Node.js Lambda Handler (alternative):**
```javascript
const https = require('https');

exports.handler = async (event) => {
    const region = event.queryStringParameters?.region || 'bos';
    const fcst = event.queryStringParameters?.fcst || '6';
    
    const url = `https://aviationweather.gov/api/data/windtemp?region=${region}&fcst=${fcst}&level=low&format=raw`;
    
    try {
        const data = await new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Content-Type': 'text/plain'
            },
            body: data
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {'Access-Control-Allow-Origin': '*'},
            body: JSON.stringify({error: error.message})
        };
    }
};
```

### 2. METAR Proxy Lambda

**Endpoint:** `GET /weather/metar`

**Query Parameters:**
- `icao` - Airport ICAO code (e.g., 'KBOS')

**Python Lambda Handler:**
```python
import urllib.request
import json

def lambda_handler(event, context):
    """Proxy METAR data from aviationweather.gov"""
    
    # Get query parameter
    icao = event.get('queryStringParameters', {}).get('icao', 'KBOS')
    
    # Build URL to aviationweather.gov
    url = f'https://aviationweather.gov/api/data/metar?ids={icao}&format=raw'
    
    try:
        # Fetch data from aviationweather.gov
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read().decode('utf-8')
        
        # Return with CORS headers
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Content-Type': 'text/plain'
            },
            'body': data
        }
    except urllib.error.HTTPError as e:
        return {
            'statusCode': e.code,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'HTTP {e.code}: {e.reason}'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
```

### 3. API Gateway Configuration

Add the following routes to your API Gateway:
- `GET /weather/winds-aloft` → Winds Aloft Lambda
- `GET /weather/metar` → METAR Lambda

Make sure to enable CORS on these routes in API Gateway settings.

## Frontend Changes

Once the backend is deployed, update `src/lib/flightPlanner.js`:

### In `fetchWindsAloft()` function (around line 343):
```javascript
// Change from:
const url = `https://aviationweather.gov/api/data/windtemp?region=${region}&fcst=${fcst}&level=low&format=raw`;

// To:
import Config from '../config';
const url = `${Config.apiGateway.URL}/weather/winds-aloft?region=${region}&fcst=${fcst}`;
```

### In `fetchMetar()` function (around line 472):
```javascript
// Change from:
const url = `https://aviationweather.gov/api/data/metar?ids=${icaoCode}&format=raw`;

// To:
import Config from '../config';
const url = `${Config.apiGateway.URL}/weather/metar?icao=${icaoCode}`;
```

## Testing

1. Deploy the Lambda functions to AWS
2. Update API Gateway with the new routes
3. Update the frontend code to use the new endpoints
4. Test with: `npm start` and try creating a flight plan

## Why This Approach?

1. **CORS Compliance:** Your backend can make requests to any API without browser restrictions
2. **Security:** You can add rate limiting, authentication, and caching at the backend level
3. **Reliability:** You can implement retry logic and fallbacks server-side
4. **Caching:** Cache weather data in Lambda/DynamoDB to reduce API calls and improve performance
5. **Cost Control:** Monitor and limit external API usage

## Alternative: Serverless Framework

If using Serverless Framework, add to `serverless.yml`:

```yaml
functions:
  windsAloft:
    handler: weather/winds-aloft.handler
    events:
      - http:
          path: weather/winds-aloft
          method: get
          cors: true
  
  metar:
    handler: weather/metar.handler
    events:
      - http:
          path: weather/metar
          method: get
          cors: true
```
