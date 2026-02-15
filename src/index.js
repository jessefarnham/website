import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import {BrowserRouter as Router} from 'react-router-dom';
import Config from './config';
import { Amplify } from 'aws-amplify';

Amplify.configure({
    API: {
        endpoints: [
            {
                name: 'flight-info',
                endpoint: Config.apiGateway.URL,
                region: Config.apiGateway.REGION
            }
        ]
    }
});

ReactDOM.render(
    <Router>
        <App />
    </Router>,
    document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
