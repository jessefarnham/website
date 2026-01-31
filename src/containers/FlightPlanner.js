import React, { Component } from 'react';
import { Form, Button, Alert, Table, Spinner } from 'react-bootstrap';
import { calculateOptimalAltitude, getAllAirports } from '../lib/flightPlanner';
import './FlightPlanner.css';

export default class FlightPlanner extends Component {
  constructor(props) {
    super(props);
    
    const now = new Date();
    // Round to next hour
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    now.setSeconds(0);
    
    this.state = {
      // Input fields
      departureAirport: '',
      destinationAirport: '',
      indicatedAirspeed: 100,
      departureDateTime: this.formatDateTimeLocal(now),
      minAltitude: 2000,
      maxAltitude: 10000,
      resolutionNM: 50,
      vfrAltitudes: true,
      
      // UI state
      airports: [],
      isCalculating: false,
      showComputations: false,
      
      // Results
      results: null,
      error: null
    };
  }
  
  async componentDidMount() {
    try {
      const airports = await getAllAirports();
      this.setState({ airports });
    } catch (error) {
      console.error('Failed to load airports:', error);
    }
  }
  
  formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  
  handleInputChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    this.setState({ [field]: value, results: null, error: null });
  }
  
  isFormValid = () => {
    const { departureAirport, destinationAirport, indicatedAirspeed, 
            departureDateTime, minAltitude, maxAltitude } = this.state;
    
    return departureAirport && 
           destinationAirport && 
           indicatedAirspeed > 0 && 
           departureDateTime &&
           minAltitude < maxAltitude;
  }
  
  handlePlan = async () => {
    if (!this.isFormValid()) {
      this.setState({ error: 'Please fill in all required fields correctly' });
      return;
    }
    
    const { departureAirport, destinationAirport, indicatedAirspeed,
            departureDateTime, minAltitude, maxAltitude, resolutionNM, vfrAltitudes } = this.state;
    
    this.setState({ isCalculating: true, error: null, results: null });
    
    try {
      const departureTime = new Date(departureDateTime);
      
      const results = await calculateOptimalAltitude({
        departureIcao: departureAirport,
        destinationIcao: destinationAirport,
        indicatedAirspeed: parseFloat(indicatedAirspeed),
        departureTime,
        minAltitude: parseInt(minAltitude),
        maxAltitude: parseInt(maxAltitude),
        resolutionNM: parseFloat(resolutionNM),
        includeVFR: vfrAltitudes
      });
      
      this.setState({ results, isCalculating: false });
    } catch (error) {
      console.error('Flight planning error:', error);
      this.setState({ 
        error: `Error calculating flight plan: ${error.message}`,
        isCalculating: false 
      });
    }
  }
  
  formatTime(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }
  
  formatWindComponent(component) {
    if (component > 0) {
      return `${component.toFixed(1)} kt tailwind`;
    } else if (component < 0) {
      return `${Math.abs(component).toFixed(1)} kt headwind`;
    } else {
      return '0 kt (crosswind)';
    }
  }
  
  renderResults() {
    const { results, showComputations } = this.state;
    
    if (!results) return null;
    
    const { route, forecast, optimal, allResults } = results;
    
    return (
      <div className="results">
        <h2>Flight Plan Results</h2>
        
        {/* Route Information */}
        <div className="route-info">
          <h3>Route Information</h3>
          <dl>
            <dt>Distance</dt>
            <dd>{route.distance.toFixed(1)} nm</dd>
            <dt>True Course</dt>
            <dd>{route.trueCourse.toFixed(0)}°</dd>
            <dt>Magnetic Heading</dt>
            <dd>{route.magneticHeading.toFixed(0)}° (declination: {route.magDeclination.toFixed(1)}°)</dd>
          </dl>
        </div>
        
        {/* Forecast Information */}
        {forecast.warning && (
          <Alert variant="warning">{forecast.warning}</Alert>
        )}
        
        <div className="forecast-info">
          <h3>Forecast</h3>
          <p>Region: {forecast.region.toUpperCase()}, Valid: {forecast.validTime}, Use: {forecast.useFrom}-{forecast.useTo}Z</p>
        </div>
        
        {/* Optimal Altitudes */}
        <div className="optimal-altitudes">
          <h3>Recommended Altitudes</h3>
          
          <div className="altitude-recommendation">
            <h4>Theoretical Optimal</h4>
            <p className="altitude-value">{optimal.theoretical.altitude} feet MSL</p>
            <dl>
              <dt>Average Groundspeed</dt>
              <dd>{optimal.theoretical.avgGroundspeed.toFixed(1)} knots</dd>
              <dt>Estimated Flight Time</dt>
              <dd>{this.formatTime(optimal.theoretical.estimatedTime)}</dd>
            </dl>
          </div>
          
          {optimal.vfr && (
            <div className="altitude-recommendation">
              <h4>VFR-Compliant Optimal</h4>
              <p className="altitude-value">{optimal.vfr.altitude} feet MSL</p>
              <dl>
                <dt>Average Groundspeed</dt>
                <dd>{optimal.vfr.avgGroundspeed.toFixed(1)} knots</dd>
                <dt>Estimated Flight Time</dt>
                <dd>{this.formatTime(optimal.vfr.estimatedTime)}</dd>
              </dl>
            </div>
          )}
        </div>
        
        {/* Comparison Table */}
        <div className="altitude-comparison">
          <h3>All Candidate Altitudes</h3>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Altitude (ft)</th>
                <th>Avg Groundspeed (kt)</th>
                <th>Est. Time</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {allResults.theoretical.map(result => (
                <tr key={`theo-${result.altitude}`} 
                    className={result.altitude === optimal.theoretical.altitude ? 'optimal' : ''}>
                  <td>{result.altitude}</td>
                  <td>{result.avgGroundspeed.toFixed(1)}</td>
                  <td>{this.formatTime(result.estimatedTime)}</td>
                  <td>Theoretical</td>
                </tr>
              ))}
              {allResults.vfr.map(result => (
                <tr key={`vfr-${result.altitude}`}
                    className={optimal.vfr && result.altitude === optimal.vfr.altitude ? 'optimal' : ''}>
                  <td>{result.altitude}</td>
                  <td>{result.avgGroundspeed.toFixed(1)}</td>
                  <td>{this.formatTime(result.estimatedTime)}</td>
                  <td>VFR</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        
        {/* Detailed Computations */}
        {showComputations && this.renderComputations()}
      </div>
    );
  }
  
  renderComputations() {
    const { results } = this.state;
    const { optimal } = results;
    
    return (
      <div className="computations">
        <h3>Detailed Computations (Theoretical Optimal)</h3>
        <p>Showing calculations for {optimal.theoretical.altitude} ft MSL</p>
        
        <Table striped bordered size="sm">
          <thead>
            <tr>
              <th>Segment</th>
              <th>Position</th>
              <th>Nearest Airport</th>
              <th>Wind</th>
              <th>Temp</th>
              <th>TAS</th>
              <th>Groundspeed</th>
              <th>Wind Component</th>
            </tr>
          </thead>
          <tbody>
            {optimal.theoretical.segments.map((seg, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{seg.lat.toFixed(2)}°, {seg.lon.toFixed(2)}°</td>
                <td>{seg.nearestAirport}</td>
                <td>{seg.wind.direction.toFixed(0)}° @ {seg.wind.speed.toFixed(0)} kt</td>
                <td>{seg.wind.temp !== null ? seg.wind.temp.toFixed(0) + '°C' : 'N/A'}</td>
                <td>{seg.tas.toFixed(1)} kt</td>
                <td>{seg.groundspeed.toFixed(1)} kt</td>
                <td>{this.formatWindComponent(seg.windComponent)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  }
  
  render() {
    const { departureAirport, destinationAirport, indicatedAirspeed, departureDateTime,
            minAltitude, maxAltitude, resolutionNM, vfrAltitudes, airports, 
            isCalculating, showComputations, results, error } = this.state;
    
    return (
      <div className="FlightPlanner">
        <div className="lander">
          <h1>Flight Planner</h1>
          <p>Plan your optimal altitude based on winds aloft forecasts</p>
        </div>
        
        <div className="planner-form">
          <Form>
            <Form.Group controlId="departureAirport">
              <Form.Label>Departure Airport (ICAO)</Form.Label>
              <Form.Control 
                type="text"
                value={departureAirport}
                onChange={this.handleInputChange('departureAirport')}
                placeholder="e.g., KBOS"
                list="airports-list"
              />
            </Form.Group>
            
            <Form.Group controlId="destinationAirport">
              <Form.Label>Destination Airport (ICAO)</Form.Label>
              <Form.Control 
                type="text"
                value={destinationAirport}
                onChange={this.handleInputChange('destinationAirport')}
                placeholder="e.g., KJFK"
                list="airports-list"
              />
            </Form.Group>
            
            <datalist id="airports-list">
              {airports.map(airport => (
                <option key={airport.code} value={airport.code}>
                  {airport.name}
                </option>
              ))}
            </datalist>
            
            <Form.Group controlId="indicatedAirspeed">
              <Form.Label>Expected Indicated Airspeed (knots)</Form.Label>
              <Form.Control 
                type="number"
                value={indicatedAirspeed}
                onChange={this.handleInputChange('indicatedAirspeed')}
                min="40"
                max="250"
              />
            </Form.Group>
            
            <Form.Group controlId="departureDateTime">
              <Form.Label>Departure Date & Time (Local)</Form.Label>
              <Form.Control 
                type="datetime-local"
                value={departureDateTime}
                onChange={this.handleInputChange('departureDateTime')}
              />
            </Form.Group>
            
            <Form.Group controlId="minAltitude">
              <Form.Label>Minimum Altitude (feet MSL)</Form.Label>
              <Form.Control 
                type="number"
                value={minAltitude}
                onChange={this.handleInputChange('minAltitude')}
                min="0"
                max="18000"
                step="500"
              />
            </Form.Group>
            
            <Form.Group controlId="maxAltitude">
              <Form.Label>Maximum Altitude (feet MSL)</Form.Label>
              <Form.Control 
                type="number"
                value={maxAltitude}
                onChange={this.handleInputChange('maxAltitude')}
                min="0"
                max="18000"
                step="500"
              />
            </Form.Group>
            
            <Form.Group controlId="resolutionNM">
              <Form.Label>Resolution (nautical miles)</Form.Label>
              <Form.Control 
                type="number"
                value={resolutionNM}
                onChange={this.handleInputChange('resolutionNM')}
                min="10"
                max="200"
                step="10"
              />
              <Form.Text className="text-muted">
                Distance between route segments for wind sampling
              </Form.Text>
            </Form.Group>
            
            <Form.Group controlId="vfrAltitudes">
              <Form.Check 
                type="checkbox"
                label="Calculate VFR-compliant altitudes"
                checked={vfrAltitudes}
                onChange={this.handleInputChange('vfrAltitudes')}
              />
            </Form.Group>
            
            <Button 
              variant="primary" 
              onClick={this.handlePlan}
              disabled={!this.isFormValid() || isCalculating}
              block
            >
              {isCalculating ? (
                <>
                  <Spinner animation="border" size="sm" /> Calculating...
                </>
              ) : (
                'Plan'
              )}
            </Button>
          </Form>
          
          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
            </Alert>
          )}
        </div>
        
        {results && (
          <>
            <div className="show-computations">
              <Form.Check 
                type="checkbox"
                label="Show detailed computations"
                checked={showComputations}
                onChange={this.handleInputChange('showComputations')}
              />
            </div>
            {this.renderResults()}
          </>
        )}
      </div>
    );
  }
}
