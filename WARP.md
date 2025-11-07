# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a personal website for Jesse Farnham built with Create React App. The site features:
- A home page with professional overview and biography
- A flight status tracker that displays real-time location data for a Cessna 140 aircraft
- Contact and reading list pages

The application integrates with AWS services (AWS Amplify and API Gateway) to fetch flight tracking data from FlightAware and displays it on an interactive Google Maps interface.

## Development Commands

### Starting Development Server
```bash
npm start
```
Launches the app at http://localhost:3000 with hot reloading enabled.

### Running Tests
```bash
npm test
```
Launches the test runner in interactive watch mode. Uses React Testing Library and Jest (via react-scripts).

### Building for Production
```bash
npm build
```
Creates an optimized production build in the `build/` directory.

## Architecture and Key Patterns

### Application Structure
- **Entry point**: `src/index.js` - Configures AWS Amplify with API Gateway endpoint and renders the React app with routing
- **Root component**: `src/App.js` - Contains the navigation bar and renders the Routes component
- **Routing**: `src/Routes.js` - Defines all application routes using react-router-dom
- **Configuration**: `src/config.js` - Contains AWS API Gateway settings and tail number configuration

### Component Organization
- **containers/**: Page-level components that handle data fetching and business logic
  - `Home.js` - Static biographical content
  - `FlightStatus.js` - Fetches and displays real-time flight data, polls API every 60 seconds
  - `Contact.js` - Contact information page
  - `ReadingList.js` - Engineering reading list
  - `NotFound.js` - 404 handler
- **components/**: Reusable UI components
  - `Map.js` - Google Maps integration using google-maps-react; displays either current position with directional marker or last flight path as polyline

### Data Flow for Flight Tracking
1. `FlightStatus` component mounts and calls `loadStatus()` immediately
2. `loadStatus()` makes API calls via AWS Amplify to fetch active flight status
3. If not flying, fetches last track data from `/flightinfo/lasttrack`
4. Component re-fetches data every 60 seconds via `setInterval`
5. Flight data is passed to `MapContainer` component which renders appropriate map view

### External Service Integration
- **AWS Amplify**: Configured to use API Gateway endpoint at `https://jguz7puem3.execute-api.us-east-1.amazonaws.com/dev`
- **Google Maps API**: Requires `REACT_APP_GOOGLE_API_KEY` environment variable
- **FlightAware**: Backend API integration (not visible in frontend code)

## Environment Variables

- `REACT_APP_GOOGLE_API_KEY`: Required for Google Maps functionality in `components/Map.js`

## Key Dependencies

- `react` & `react-dom`: v16.12.0
- `react-router-dom`: Client-side routing
- `react-bootstrap`: UI components (using v1.0.0-beta.16)
- `aws-amplify`: AWS service integration for API calls
- `google-maps-react`: Google Maps integration

## Important Notes

- This is a Create React App project - do not run `npm run eject` unless absolutely necessary
- The flight status feature expects specific API response formats from the backend (GetHistoricalTrackResult structure)
- The Map component constructs bounds automatically for historical track data to fit all points in view
- Component lifecycle: `FlightStatus` uses class component pattern with `componentDidMount` and `componentWillUnmount` for interval management
