import React from 'react';
import { render, fireEvent, act, wait } from '@testing-library/react';
import FlightPlanner from './FlightPlanner';
import * as flightPlannerLib from '../lib/flightPlanner';

// Mock the flightPlanner library
jest.mock('../lib/flightPlanner');

describe('FlightPlanner', () => {
  beforeEach(() => {
    // Mock getAllAirports for autocomplete
    flightPlannerLib.getAllAirports.mockResolvedValue([
      { code: 'KBOS', name: 'Boston Logan International' },
      { code: 'KJFK', name: 'New York JFK International' },
    ]);

    // Mock calculateOptimalAltitude with realistic response
    flightPlannerLib.calculateOptimalAltitude.mockResolvedValue({
      route: {
        departure: { icao: 'KBOS', lat: 42.3643, lon: -71.0052, elevation: 19 },
        destination: { icao: 'KJFK', lat: 40.6413, lon: -73.7781, elevation: 13 },
        distance: 187.5,
        trueCourse: 232,
        magneticHeading: 247,
        magDeclination: -15
      },
      forecast: {
        region: 'bos',
        validTime: '151800',
        useFrom: '1400',
        useTo: '2100',
        warning: null
      },
      optimal: {
        theoretical: {
          altitude: 6000,
          avgGroundspeed: 115.3,
          estimatedTime: 1.63,
          segments: [
            {
              lat: 42.3643,
              lon: -71.0052,
              nearestAirport: 'BOS',
              wind: { direction: 270, speed: 20, temp: -5 },
              tas: 108,
              groundspeed: 118,
              windComponent: 12
            }
          ]
        },
        vfr: {
          altitude: 5500,
          avgGroundspeed: 112.8,
          estimatedTime: 1.66,
          segments: []
        }
      },
      allResults: {
        theoretical: [
          { altitude: 4000, avgGroundspeed: 105.2, estimatedTime: 1.78 },
          { altitude: 5000, avgGroundspeed: 110.5, estimatedTime: 1.70 },
          { altitude: 6000, avgGroundspeed: 115.3, estimatedTime: 1.63 },
        ],
        vfr: [
          { altitude: 4500, avgGroundspeed: 107.8, estimatedTime: 1.74 },
          { altitude: 5500, avgGroundspeed: 112.8, estimatedTime: 1.66 },
        ]
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the flight planner form', async () => {
    const { getByText, getByLabelText, getAllByText } = render(<FlightPlanner />);
    
    // Wait for component to mount and load airports
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(getByText('Flight Planner')).toBeInTheDocument();
    expect(getByLabelText(/Departure Airport/i)).toBeInTheDocument();
    expect(getByLabelText(/Destination Airport/i)).toBeInTheDocument();
    expect(getByLabelText(/Expected Indicated Airspeed/i)).toBeInTheDocument();
    // Check the Plan button exists
    const planButtons = getAllByText(/^Plan$/);
    expect(planButtons.length).toBeGreaterThan(0);
  });

  it('should calculate flight plan and display results without error', async () => {
    const { getByText, getByLabelText, queryByText } = render(<FlightPlanner />);
    
    // Wait for component to mount
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Fill in the form using fireEvent
    const departureInput = getByLabelText(/Departure Airport/i);
    const destinationInput = getByLabelText(/Destination Airport/i);
    const airspeedInput = getByLabelText(/Expected Indicated Airspeed/i);
    
    fireEvent.change(departureInput, { target: { value: 'KBOS' } });
    fireEvent.change(destinationInput, { target: { value: 'KJFK' } });
    fireEvent.change(airspeedInput, { target: { value: '100' } });
    
    // Click the Plan button
    const planButtons = document.querySelectorAll('button');
    const planButton = Array.from(planButtons).find(btn => btn.textContent.trim() === 'Plan');
    
    await act(async () => {
      fireEvent.click(planButton);
      // Wait for async calculation
      await new Promise(resolve => setTimeout(resolve, 500));
    });
    
    // Wait for results to appear
    await wait(() => {
      expect(getByText('Flight Plan Results')).toBeInTheDocument();
    });
    
    // Verify route information is displayed
    expect(getByText(/Route Information/i)).toBeInTheDocument();
    expect(getByText(/187\.5 nm/)).toBeInTheDocument();
    
    // Verify optimal altitudes are displayed
    expect(getByText(/Recommended Altitudes/i)).toBeInTheDocument();
    expect(getByText(/Theoretical Optimal/i)).toBeInTheDocument();
    expect(getByText(/6000 feet MSL/)).toBeInTheDocument();
    
    // Verify VFR optimal is displayed
    expect(getByText(/VFR-Compliant Optimal/i)).toBeInTheDocument();
    expect(getByText(/5500 feet MSL/)).toBeInTheDocument();
    
    // Verify no error alert is displayed
    expect(queryByText(/Error calculating/i)).not.toBeInTheDocument();
    
    // Verify calculateOptimalAltitude was called with correct params
    expect(flightPlannerLib.calculateOptimalAltitude).toHaveBeenCalledWith(
      expect.objectContaining({
        departureIcao: 'KBOS',
        destinationIcao: 'KJFK',
        indicatedAirspeed: 100,
      })
    );
  });

  it('should display error when calculation fails', async () => {
    // Mock a failure
    flightPlannerLib.calculateOptimalAltitude.mockRejectedValue(
      new Error('Airport KXYZ not found in FAA database')
    );
    
    const { getByText, getByLabelText } = render(<FlightPlanner />);
    
    // Wait for component to mount
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Fill in the form with invalid airport
    fireEvent.change(getByLabelText(/Departure Airport/i), { target: { value: 'KXYZ' } });
    fireEvent.change(getByLabelText(/Destination Airport/i), { target: { value: 'KJFK' } });
    
    // Click the Plan button
    const planButtons = document.querySelectorAll('button');
    const planButton = Array.from(planButtons).find(btn => btn.textContent.trim() === 'Plan');
    
    await act(async () => {
      fireEvent.click(planButton);
      await new Promise(resolve => setTimeout(resolve, 500));
    });
    
    // Wait for error to appear
    await wait(() => {
      expect(getByText(/Airport KXYZ not found/i)).toBeInTheDocument();
    });
  });
});
