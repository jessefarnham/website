import React, { Component } from "react";
import { get } from 'aws-amplify/api'
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
        let flightStatus = await get({ apiName: 'flight-info', path: '/flightinfo/active' }).response.then(r => r.body.json());
        let lastTrackStatus = null;
        if (!flightStatus.isFlying) {
            lastTrackStatus = await get({ apiName: 'flight-info', path: '/flightinfo/lasttrack' }).response.then(r => r.body.json());
        }
        this.setState({time: new Date(), flightStatus: flightStatus,
                             lastTrackStatus: lastTrackStatus})
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
        let flightAwareUrl = 'https://www.flightaware.com/live/flight/' + this.state.flightStatus.tailNumber
        if (this.state.flightStatus.isFlying) {
            let stalenessParagraph;
            if (this.state.flightStatus.isStale) {
                stalenessParagraph = (<p><b>Flight information is outdated.</b> You are not currently
                seeing the most up-to-date information for the flight. This is most likely because {name} is
                landing.</p>)
            }
            else {
                stalenessParagraph = '';
            }
            return (
                <div>
                    <p>{name} is flying!</p>
                    {stalenessParagraph}
                    <dl>
                        <dt>Altitude</dt>
                        <dd>{JSON.stringify(this.state.flightStatus.altitude * 100)}</dd>
                        <dt>Groundspeed</dt>
                        <dd>{JSON.stringify(this.state.flightStatus.groundspeed)}</dd>
                        <dt>Heading</dt>
                        <dd>{JSON.stringify(this.state.flightStatus.heading)}</dd>
                        <dt>Last update</dt>
                        <dd>{this.state.time.toLocaleTimeString()}</dd>
                    </dl>
                    <p>This flight can be seen {" "} <a href={flightAwareUrl}>on FlightAware</a>,
                        which updates more quickly than this website. You may need a FlightAware account
                        to see it.</p>
                </div>
            )
        }
        else {
            return (
                <div>
                    <p>{name} is not flying right now. Come back later!</p>
                    <p>Information from recent flights may be visible {" "}
                        <a href={flightAwareUrl}>on FlightAware</a>. Some flights may not be visible without
                    a FlightAware account.</p>
                    <p>Below you can see the path of {name}'s last flight.</p>
                </div>

            )
        }
    }

    renderMap() {
        return (
           <div>
               <MapContainer
                    flightInfo={this.state.flightStatus}
                    lastTrackInfo={this.state.lastTrackStatus}
                />
          </div>
        )
    }

    renderFireflyImg() {
        if (this.state.flightStatus.isFlying) {
            return '';
        }
        else {
            return (
                <img src={FireflyInPA} className={'img-fluid'}
                     alt={"Jesse's airplane on the ground"}/>
            );
        }
    }

    render() {
        return (
            <div className='FlightStatus'>
                <div className='lander'>
                    <h1>Flight Status</h1>
                    <p>
                        {this.state.time ? this.renderFlightInfo() : 'Loading, please wait...'}
                    </p>
                </div>
                <div className={'map'}>
                    {this.state.time && this.renderMap()}
                </div>
            {/*<div className={'fireflyImg'}>
                    {this.state.time && this.renderFireflyImg()}
                </div>*/}
            </div>
        )
    }
}
