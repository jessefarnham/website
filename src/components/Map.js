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
        const loc = {
            lat: this.props.flightInfo.lat,
            lng: this.props.flightInfo.long
        };
        let markerElement;
        let polyLineElement;
        if (this.props.flightInfo.isFlying) {
            markerElement = (
                <Marker
                    position={loc}
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
            polyLineElement = '';
        }
        else {
            markerElement = '';
            let lastTrack = [];
            for (let i = 0; i < this.props.lastTrackInfo.GetHistoricalTrackResult.data.length; i++) {
                const rawObj = this.props.lastTrackInfo.GetHistoricalTrackResult.data[i];
                lastTrack.push({lat: rawObj.latitude, lng: rawObj.longitude});
            }
            polyLineElement = (
                <Polyline
                    path={lastTrack}
                    geodesic={true}
                    strokeColor={'red'}
                    strokeOpacity={1.0}
                    strokeWeight={2}
                />
            );
        }

        return(
            <Map
                google={this.props.google}
                zoom={10}
                style={mapStyles}
                initialCenter={loc}
                center={loc}
            >
                {markerElement}
                {polyLineElement}
            </Map>
        );
    }
}


export default GoogleApiWrapper({
    apiKey: googleApiKey
})(MapContainer);