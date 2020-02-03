import React, { Component } from 'react';
import { Map, GoogleApiWrapper, Marker } from 'google-maps-react';
import Auth from '../auth';

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
        return(
            <Map
                google={this.props.google}
                zoom={10}
                style={mapStyles}
                initialCenter={loc}
                center={loc}
            >
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
            </Map>
        );
    }
}


export default GoogleApiWrapper({
    apiKey: Auth.google
})(MapContainer);