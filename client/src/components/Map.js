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
                zoom={14}
                style={mapStyles}
                initialCenter={loc}
                center={loc}
            >
                <Marker position={loc} />
            </Map>
        );
    }
}


export default GoogleApiWrapper({
    apiKey: Auth.google
})(MapContainer);