import React from 'react';
import {Route, Switch} from 'react-router-dom';
import Home from './containers/Home';
import FlightStatus from './containers/FlightStatus';
import Contact from './containers/Contact';
import NotFound from './containers/NotFound';

export default function Routes() {
    return (
        <Switch>
            <Route path='/' exact component={Home} />
            <Route path='/flightstatus' exact component={FlightStatus} />
            <Route path='/contact' exact component={Contact} />
            <Route component={NotFound} />
        </Switch>
    );
}
