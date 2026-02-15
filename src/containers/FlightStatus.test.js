import React from 'react';
import { render, wait } from '@testing-library/react';
import FlightStatus from './FlightStatus';
import { Amplify } from 'aws-amplify';
import Config from '../config';

// Configure Amplify before tests (same as index.js)
Amplify.configure({
  API: {
    REST: {
      'flight-info': {
        endpoint: Config.apiGateway.URL,
        region: Config.apiGateway.REGION
      }
    }
  }
});

// Mock Leaflet to avoid DOM errors in tests
jest.mock('../components/Map', () => {
  return function MockMapContainer() {
    return <div data-testid="mock-map">Map</div>;
  };
});

// Mock the aws-amplify/api module
jest.mock('aws-amplify/api', () => ({
  get: jest.fn()
}));

const { get } = require('aws-amplify/api');

describe('FlightStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    // Mock the API to never resolve (to test loading state)
    get.mockReturnValue({
      response: new Promise(() => {})
    });

    const { getByText } = render(<FlightStatus />);
    expect(getByText('Loading, please wait...')).toBeInTheDocument();
  });

  it('should call API with correct apiName and path', async () => {
    // Mock API response for not flying
    const mockFlightStatus = {
      isFlying: false,
      tailNumber: 'N76616'
    };
    const mockLastTrack = {
      GetHistoricalTrackResult: {
        data: [
          { latitude: 42.36, longitude: -71.00 },
          { latitude: 42.40, longitude: -71.10 }
        ]
      }
    };

    get.mockImplementation(({ apiName, path }) => {
      // Verify apiName is correct
      expect(apiName).toBe('flight-info');
      
      if (path === '/flightinfo/active') {
        return {
          response: Promise.resolve({
            body: { json: () => Promise.resolve(mockFlightStatus) }
          })
        };
      } else if (path === '/flightinfo/lasttrack') {
        return {
          response: Promise.resolve({
            body: { json: () => Promise.resolve(mockLastTrack) }
          })
        };
      }
    });

    const { getByText } = render(<FlightStatus />);

    // Wait for the component to load data
    await wait(() => {
      expect(getByText(/not flying right now/)).toBeInTheDocument();
    });

    // Verify API was called with correct parameters
    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({
        apiName: 'flight-info',
        path: '/flightinfo/active'
      })
    );
  });

  it('should display flight info when flying', async () => {
    const mockFlightStatus = {
      isFlying: true,
      tailNumber: 'N76616',
      altitude: 55, // In hundreds of feet
      groundspeed: 95,
      heading: 270,
      lat: 42.3643,
      long: -71.0052,
      isStale: false
    };

    get.mockImplementation(({ path }) => {
      if (path === '/flightinfo/active') {
        return {
          response: Promise.resolve({
            body: { json: () => Promise.resolve(mockFlightStatus) }
          })
        };
      }
    });

    const { getByText } = render(<FlightStatus />);

    await wait(() => {
      expect(getByText(/is flying!/)).toBeInTheDocument();
    });

    // Verify flight details are displayed
    expect(getByText('5500')).toBeInTheDocument(); // altitude * 100
    expect(getByText('95')).toBeInTheDocument(); // groundspeed
    expect(getByText('270')).toBeInTheDocument(); // heading
  });

  it('should handle API errors gracefully', async () => {
    // Mock API to throw an error
    get.mockImplementation(() => {
      return {
        response: Promise.reject(new Error('API name is invalid'))
      };
    });

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(<FlightStatus />);

    // Wait for error state to be displayed
    await wait(() => {
      expect(getByText(/Error loading flight status/)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});
