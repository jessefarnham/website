import React, { Component } from "react";
import { API } from 'aws-amplify'
import MapContainer from '../components/Map';
import './FlightStatus.css';
import Config from '../config';
import FireflyInPA from './fireflyInPA.jpg';

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
        let name;
        if (this.state.flightStatus.tailNumber === Config.jesseTailNumber) {
            name = "Jesse";
        }
        else {
            name = this.state.flightStatus.tailNumber;
        }
        if (this.state.flightStatus.isFlying) {
            return (
                <div>
                    <p>{name} is flying!</p>
                    <dl>
                        <dt>Tail number</dt>
                        <dd>{this.state.flightStatus.tailNumber}</dd>
                        <dt>Is flying</dt>
                        <dd>{JSON.stringify(this.state.flightStatus.isFlying)}</dd>
                        <dt>Altitude</dt>
                        <dd>{JSON.stringify(this.state.flightStatus.altitude * 100)}</dd>
                        <dt>Groundspeed</dt>
                        <dd>{JSON.stringify(this.state.flightStatus.groundspeed)}</dd>
                        <dt>Heading</dt>
                        <dd>{JSON.stringify(this.state.flightStatus.heading)}</dd>
                        <dt>Latitude</dt>
                        <dd>{this.state.flightStatus.lat}</dd>
                        <dt>Longitude</dt>
                        <dd>{this.state.flightStatus.long}</dd>
                        <dt>Last update</dt>
                        <dd>{this.state.time.toLocaleTimeString()}</dd>
                    </dl>
                </div>
            )
        }
        else {
            return (
                <div>
                    <p>{name} is not flying right now. Come back later!</p>
                    <img src={FireflyInPA} class={'img-fluid'} alt={"Jesse's airplane on the ground"} />
                </div>

            )
        }
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
                    {this.state.time && this.state.flightStatus.isFlying && this.renderMap()}
                </div>
            </div>
        )
    }
}
