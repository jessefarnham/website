import React from 'react';
import { Link } from 'react-router-dom'
import { Nav, Navbar } from 'react-bootstrap'
import Routes from './Routes';
import { LinkContainer } from 'react-router-bootstrap';
import './App.css';

function App(props) {
  return (
    <div className="App Container">
        <Navbar fluid collapseOnSelect>
          <Link to='/'>Home</Link>
            <LinkContainer to='/flightstatus'>
                <Nav.Link>Flight Status</Nav.Link>
            </LinkContainer>
            <LinkContainer to='/contact'>
                <Nav.Link>Contact</Nav.Link>
            </LinkContainer>
            <LinkContainer to='/readinglist'>
                <Nav.Link>Engineering Reading List</Nav.Link>
            </LinkContainer>
            <LinkContainer to='/flightplanner'>
                <Nav.Link>Flight Planner</Nav.Link>
            </LinkContainer>
        </Navbar>
        <Routes />
    </div>
  );
}

export default App;
