import React, { useState, useEffect} from "react";
import { API } from 'aws-amplify'
import MapContainer from '../components/Map';
import './FlightStatus.css';

export default function FlightStatus() {
    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function onLoad() {
            try {
                const status = await loadStatus();
                setStatus(status)
            }
            catch (e) {
                alert(e);
            }
            setIsLoading(false);
        }

        onLoad();
    }, []);

    function loadStatus() {
        return API.get('flight-info', '/flightinfo/active');
    }

    function renderFlightInfo(flightInfo) {
        return (
            <dl>
                <dt>Tail number</dt><dd>{flightInfo.tailNumber}</dd>
                <dt>Is flying</dt><dd>{JSON.stringify(flightInfo.isFlying)}</dd>
                <dt>Latitude</dt><dd>{flightInfo.lat}</dd>
                <dt>Longitude</dt><dd>{flightInfo.long}</dd>
            </dl>
        )
    }

    function renderMap(flightInfo) {
        return (
            <MapContainer flightInfo={flightInfo} />
        )
    }

    return (
        <div className='FlightStatus'>
            <div className='lander'>
                <h1>Flight Status</h1>
                <p>
                    {!isLoading && renderFlightInfo(status)}
                </p>
            </div>
            <div className={'map'}>
                {!isLoading && renderMap(status)}
            </div>
        </div>
    )
}
