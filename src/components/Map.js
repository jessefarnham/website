import React, { Component } from 'react';
import { Map, GoogleApiWrapper, Marker, Polyline } from 'google-maps-react';

const googleApiKey = process.env.REACT_APP_GOOGLE_API_KEY;

const mapStyles = {
    width: '75%',
    height: '75%',
    "margin-left": 'auto',
    "margin-right": 'auto'
};

class MapContainer extends Component {

    render() {
        let mapElement;
        if (this.props.flightInfo.isFlying) {
            let locAttribute = {
                lat: this.props.flightInfo.lat,
                lng: this.props.flightInfo.long
            };
            let markerElement = (
                <Marker
                    position={locAttribute}
                    icon={{
                        path: this.props.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        rotation: this.props.flightInfo.heading,
                        scale: 5,
                        fillColor: 'red',
                        fillOpacity: 2,
                        strokeWeight: 2
                    }}
                />

            );
            mapElement = (
                <Map
                    google={this.props.google}
                    zoom={10}
                    style={mapStyles}
                    initialCenter={locAttribute}
                    center={locAttribute}
                >
                    {markerElement}
                </Map>
            );
        }
        else {
            let lastTrack = [];
            let boundsAttribute = new this.props.google.maps.LatLngBounds();
            for (let i = 0; i < this.props.lastTrackInfo.GetHistoricalTrackResult.data.length; i++) {
                const rawObj = this.props.lastTrackInfo.GetHistoricalTrackResult.data[i];
                const processedObj = {lat: rawObj.latitude, lng: rawObj.longitude};
                lastTrack.push(processedObj);
                boundsAttribute.extend(processedObj);
            }
            let polyLineElement = (
                <Polyline
                    path={lastTrack}
                    geodesic={true}
                    strokeColor={'red'}
                    strokeOpacity={1.0}
                    strokeWeight={2}
                />
            );
            mapElement = (
                <Map
                    google={this.props.google}
                    style={mapStyles}
                    initialCenter={lastTrack[0]}
                    bounds={boundsAttribute}
                >
                    {polyLineElement}
                </Map>
            )
        }
        return mapElement;
    }
}


export default GoogleApiWrapper({
    apiKey: googleApiKey
})(MapContainer);