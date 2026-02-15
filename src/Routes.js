import React from 'react';
import {Route, Switch} from 'react-router-dom';
import Home from './containers/Home';
import FlightStatus from './containers/FlightStatus';
import Contact from './containers/Contact';
import ReadingList from './containers/ReadingList';
import FlightPlanner from './containers/FlightPlanner';
import NotFound from './containers/NotFound';

export default function Routes() {
    return (
        <Switch>
            <Route path='/' exact component={Home} />
            <Route path='/flightstatus' exact component={FlightStatus} />
            <Route path='/contact' exact component={Contact} />
            <Route path='/readinglist' exact component={ReadingList} />
            <Route path='/flightplanner' exact component={FlightPlanner} />
            <Route component={NotFound} />
        </Switch>
    );
}
