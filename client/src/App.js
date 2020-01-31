import React from 'react';
import { Link } from 'react-router-dom'
import { Navbar } from 'react-bootstrap'
import Routes from './Routes';
import './App.css';

function App(props) {
  return (
    <div className="App Container">
        <Navbar fluid collapseOnSelect>
            <Navbar.Brand>
              <Link to='/'>Scratch</Link>
            </Navbar.Brand>
        </Navbar>
        <Routes />
    </div>
  );
}

export default App;
