import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import { setCredentials } from './credentials-components';

/** The CORS calls don't work on http so redirect to https if trying to access an insecure domain. */
function redirectToHttps() {
  const PRODUCTION_DOMAIN = 'pos-example.bluecode.com'
  const HEROKU_DOMAIN = 'bluecode-pos-example.herokuapp.com'
  
  if (document.location.host === HEROKU_DOMAIN 
      || (document.location.protocol === 'http:' 
        && document.location.host === PRODUCTION_DOMAIN)) {
    document.location = 'https://' + PRODUCTION_DOMAIN
  }
}

let element = document.getElementById('insert-js-pos-here')

if (element) {
  redirectToHttps()

  let username = element.getAttribute('username')
  let password = element.getAttribute('password')
  let branch = element.getAttribute('branch')
  let baseUrl = element.getAttribute('base-url')

  if (username || password || branch) {
    setCredentials(
      username,
      password,
      branch)
  }

  ReactDOM.render(<App baseUrl={ baseUrl } />, element);
  
  registerServiceWorker();
}
