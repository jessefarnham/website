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
            <Navbar.Brand>
              <Link to='/'>Scratch</Link>
            </Navbar.Brand>
            <Navbar.Toggle />
            <Navbar.Collapse>
                <Nav pullRight>
                    <LinkContainer to='/flightstatus'>
                        <Nav.Link>Flight Status</Nav.Link>
                    </LinkContainer>
                </Nav>
            </Navbar.Collapse>
        </Navbar>
        <Routes />
    </div>
  );
}

export default App;
