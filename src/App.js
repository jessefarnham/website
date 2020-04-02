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
              <Link to='/'>Home</Link>
            </Navbar.Brand>
            <Navbar.Toggle />
            <Navbar.Collapse>
                <Nav pullRight>
                    <LinkContainer to='/flightstatus'>
                        <Nav.Link>Flight Status</Nav.Link>
                    </LinkContainer>
                    <LinkContainer to='/contact'>
                        <Nav.Link>Contact</Nav.Link>
                    </LinkContainer>
                </Nav>
            </Navbar.Collapse>
        </Navbar>
        <Routes />
    </div>
  );
}

export default App;
