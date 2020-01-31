import React, { Component } from 'react';
import { Map, GoogleApiWrapper, Marker } from 'google-maps-react';

const mapStyles = {
    width: '100%',
    height: '100%'
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
            >
                <Marker position={loc} />
            </Map>
        );
    }
}



export default GoogleApiWrapper({
    apiKey: 'AIzaSyD8vtUcp3pgvFda1T0-bO6PG6cLTOGoruw'
})(MapContainer);