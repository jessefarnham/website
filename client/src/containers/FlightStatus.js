import React, { Component } from "react";
import { API } from 'aws-amplify'
import MapContainer from '../components/Map';
import './FlightStatus.css';

const updateIntervalSeconds = 60;

export default class FlightStatus extends Component {

    constructor(props) {
        super(props);
        this.state = {time: null, flightStatus: null};
        this.loadStatus = this.loadStatus.bind(this);
        this.loadStatus()
    }

    async loadStatus() {
        let flightStatus =  await API.get('flight-info', '/flightinfo/active');
        this.setState({time: new Date(), flightStatus: flightStatus})
    }

    componentDidMount(){
        this.interval = setInterval(this.loadStatus, updateIntervalSeconds * 1000)
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    renderFlightInfo() {
        return (
            <dl>
                <dt>Tail number</dt><dd>{this.state.flightStatus.tailNumber}</dd>
                <dt>Is flying</dt><dd>{JSON.stringify(this.state.flightStatus.isFlying)}</dd>
                <dt>Latitude</dt><dd>{this.state.flightStatus.lat}</dd>
                <dt>Longitude</dt><dd>{this.state.flightStatus.long}</dd>
                <dt>Last update</dt><dd>{this.state.time.toLocaleTimeString()}</dd>
            </dl>
        )
    }

    renderMap() {
        return (
            <MapContainer flightInfo={this.state.flightStatus} />
        )
    }

    render() {
        return (
            <div className='FlightStatus'>
                <div className='lander'>
                    <h1>Flight Status</h1>
                    <p>
                        {this.state.time && this.renderFlightInfo()}
                    </p>
                </div>
                <div className={'map'}>
                    {this.state.time && this.renderMap()}
                </div>
            </div>
        )
    }
}
