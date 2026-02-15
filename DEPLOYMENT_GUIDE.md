# Weather Proxy Deployment Guide

This guide walks you through deploying the weather proxy Lambda functions to AWS.

## Prerequisites

✅ Serverless Framework - Already installed
✅ AWS CLI - Already installed
❌ AWS Credentials - Need to configure

## Step 1: Configure AWS Credentials

You need AWS credentials to deploy. Since you already have an API Gateway running at `https://jguz7puem3.execute-api.us-east-1.amazonaws.com/dev`, you should have credentials somewhere.

### Option A: If you have an AWS Access Key

Run:
```bash
aws configure
```

You'll be prompted for:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

### Option B: If you use AWS SSO

Check if you have AWS SSO configured elsewhere or need to set it up.

### Option C: Find existing credentials

Your credentials might be in:
- IAM Console: https://console.aws.amazon.com/iam/
- Look for existing access keys or create new ones

## Step 2: Test AWS Connection

Verify your credentials work:
```bash
aws sts get-caller-identity
```

This should return your AWS account information.

## Step 3: Deploy the Weather Proxy

Navigate to the website directory and deploy:
```bash
cd /Users/jessefarnham/dev/website
serverless deploy --config serverless-weather-proxy.yml
```

The deployment will:
1. Create two Lambda functions (winds-aloft and metar)
2. Create API Gateway endpoints
3. Configure CORS automatically
4. Output the API endpoint URL

## Step 4: Note the API Endpoint

After deployment, you'll see output like:
```
Service Information
service: website-weather-proxy
stage: dev
region: us-east-1
api keys:
  None
endpoints:
  GET - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/weather/winds-aloft
  GET - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/weather/metar
functions:
  windsAloft: website-weather-proxy-dev-windsAloft
  metar: website-weather-proxy-dev-metar
```

**IMPORTANT:** Copy the base URL (e.g., `https://xxxxx.execute-api.us-east-1.amazonaws.com/dev`)

## Step 5: Update Frontend Configuration

### Option A: Use the same API Gateway endpoint

If you want to use your existing API Gateway (`https://jguz7puem3.execute-api.us-east-1.amazonaws.com/dev`), you would need to:
1. Add these Lambda functions to that API Gateway manually in AWS Console
2. OR merge the serverless config with your existing backend

### Option B: Use the new endpoint (Recommended for testing)

Update `src/lib/flightPlanner.js`:

1. Add import at the top:
```javascript
import Config from '../config';
```

2. In `fetchWindsAloft()` function (around line 347):
```javascript
// Replace:
const url = `https://aviationweather.gov/api/data/windtemp?region=${region}&fcst=${fcst}&level=low&format=raw`;

// With (using your new endpoint):
const url = `https://YOUR_NEW_ENDPOINT.execute-api.us-east-1.amazonaws.com/dev/weather/winds-aloft?region=${region}&fcst=${fcst}`;
```

3. In `fetchMetar()` function (around line 476):
```javascript
// Replace:
const url = `https://aviationweather.gov/api/data/metar?ids=${icaoCode}&format=raw`;

// With:
const url = `https://YOUR_NEW_ENDPOINT.execute-api.us-east-1.amazonaws.com/dev/weather/metar?icao=${icaoCode}`;
```

## Step 6: Test the Flight Planner

1. Start the dev server:
```bash
npm start
```

2. Navigate to the flight planner page
3. Try creating a flight plan from KBOS to KJFK
4. Check the browser console for any errors

## Step 7: Verify Lambda Logs (if issues occur)

View logs for debugging:
```bash
# Winds aloft logs
serverless logs -f windsAloft --config serverless-weather-proxy.yml --tail

# METAR logs
serverless logs -f metar --config serverless-weather-proxy.yml --tail
```

## Testing the Endpoints Directly

You can test the endpoints with curl:

```bash
# Test winds aloft
curl "https://YOUR_ENDPOINT.execute-api.us-east-1.amazonaws.com/dev/weather/winds-aloft?region=bos&fcst=6"

# Test METAR
curl "https://YOUR_ENDPOINT.execute-api.us-east-1.amazonaws.com/dev/weather/metar?icao=KBOS"
```

## Troubleshooting

### Error: "Unable to resolve credentials"
- Run `aws configure` and enter your credentials
- Or check ~/.aws/credentials file exists and has valid keys

### Error: "CREATE_FAILED: User is not authorized"
- Your AWS user needs IAM permissions to create Lambda functions and API Gateway
- Required permissions: lambda:*, apigateway:*, iam:CreateRole, logs:*

### Error: "Stack already exists"
- A stack with this name already exists
- Either remove it: `serverless remove --config serverless-weather-proxy.yml`
- Or deploy with a different stage: `serverless deploy --config serverless-weather-proxy.yml --stage prod`

### CORS errors in browser
- Check that API Gateway has CORS enabled (it should be automatic with serverless config)
- Verify the Lambda functions are returning proper CORS headers
- Check browser console for specific error messages

## Cost Considerations

These Lambda functions fall well within AWS free tier:
- 1M requests/month free
- 400,000 GB-seconds compute time free
- Weather data calls are typically cached for 5-30 minutes
- Expected cost: $0/month for typical usage

## Cleanup (if needed)

To remove the deployment:
```bash
serverless remove --config serverless-weather-proxy.yml
```

This will delete:
- Both Lambda functions
- API Gateway endpoints
- CloudWatch log groups
- IAM roles

## Next Steps

After successful deployment:
1. Update the frontend to use the new endpoints
2. Test thoroughly
3. Consider adding CloudWatch alarms for errors
4. Consider adding API Gateway usage plans for rate limiting
5. Update your existing API Gateway config if you want to consolidate endpoints
