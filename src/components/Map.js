import React, { Component } from 'react';
import { Map, TileLayer, Marker, Polyline, withLeaflet } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-polylinedecorator';

// Fix for default marker icon not showing in webpack builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const mapContainerStyle = {
  width: '75%',
  height: '400px',
  marginLeft: 'auto',
  marginRight: 'auto',
};

/**
 * Create a rotated arrow icon for showing aircraft heading
 * @param {number} heading - Aircraft heading in degrees
 * @returns {L.DivIcon} Leaflet DivIcon with rotated arrow
 */
function createArrowIcon(heading) {
  const arrowSvg = `
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2 L18 20 L12 16 L6 20 Z" 
            fill="red" 
            stroke="darkred" 
            stroke-width="1"
            transform="rotate(${heading}, 12, 12)"/>
    </svg>
  `;
  
  return L.divIcon({
    html: arrowSvg,
    className: 'aircraft-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

/**
 * Custom component to add directional arrows along a polyline
 * Uses leaflet-polylinedecorator plugin
 */
class PolylineDecoratorComponent extends Component {
  componentDidMount() {
    const { positions, leaflet } = this.props;
    const { map } = leaflet;
    
    if (positions && positions.length > 1) {
      // Create the decorator with arrow symbols
      this.decorator = L.polylineDecorator(positions, {
        patterns: [
          {
            offset: '5%',
            repeat: 100,  // Arrow every 100 pixels
            symbol: L.Symbol.arrowHead({
              pixelSize: 12,
              polygon: false,
              pathOptions: {
                color: 'darkred',
                weight: 2,
                opacity: 0.8
              }
            })
          }
        ]
      }).addTo(map);
    }
  }
  
  componentWillUnmount() {
    if (this.decorator) {
      this.decorator.remove();
    }
  }
  
  render() {
    return null;
  }
}

const PolylineDecorator = withLeaflet(PolylineDecoratorComponent);

class MapContainer extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    
    let lastTrack = [];
    let bounds = null;
    
    if (!this.props.flightInfo.isFlying && this.props.lastTrackInfo) {
      const trackData = this.props.lastTrackInfo.GetHistoricalTrackResult?.data || [];
      for (let i = 0; i < trackData.length; i++) {
        const rawObj = trackData[i];
        lastTrack.push([rawObj.latitude, rawObj.longitude]);
      }
      
      if (lastTrack.length > 0) {
        bounds = L.latLngBounds(lastTrack);
      }
    }
    
    this.state = { bounds, lastTrack };
  }

  componentDidMount() {
    // Fit bounds after map is ready
    if (this.state.bounds && this.mapRef.current) {
      const map = this.mapRef.current.leafletElement;
      map.fitBounds(this.state.bounds, { padding: [20, 20] });
    }
  }

  render() {
    const { flightInfo } = this.props;
    
    if (flightInfo.isFlying) {
      // Currently flying - show current position with heading arrow
      const position = [flightInfo.lat, flightInfo.long];
      const arrowIcon = createArrowIcon(flightInfo.heading || 0);
      
      return (
        <div style={mapContainerStyle}>
          <Map
            ref={this.mapRef}
            center={position}
            zoom={10}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={position} icon={arrowIcon} />
          </Map>
        </div>
      );
    } else {
      // Not flying - show last flight track as polyline
      const { lastTrack, bounds } = this.state;
      
      // Default center if no track data
      const defaultCenter = lastTrack.length > 0 ? lastTrack[0] : [42.3601, -71.0589];
      
      return (
        <div style={mapContainerStyle}>
          <Map
            ref={this.mapRef}
            center={defaultCenter}
            zoom={8}
            style={{ width: '100%', height: '100%' }}
            bounds={bounds}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {lastTrack.length > 0 && (
              <>
                <Polyline
                  positions={lastTrack}
                  color="red"
                  weight={2}
                  opacity={1}
                />
                <PolylineDecorator positions={lastTrack} />
              </>
            )}
          </Map>
        </div>
      );
    }
  }
}

export default MapContainer;
