import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import { setCredentials } from './credentials-components';

let element = document.getElementById('insert-js-pos-here')

if (element) {
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
