import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import { setCredentials } from './credentials-components';
import { setStoragePrefix } from './util/local-storage';
import { setInflation } from './model';

/** The CORS calls don't work over http, so redirect to https if trying to access an insecure domain. */
function redirectToHttps() {
  const PRODUCTION_DOMAIN = 'pos-example.bluecode.com'
  const HEROKU_DOMAIN = 'bluecode-pos-example.herokuapp.com'
  
  if (document.location.host === HEROKU_DOMAIN 
      || (document.location.protocol === 'http:' 
        && document.location.host === PRODUCTION_DOMAIN)) {
    document.location = 'https://' + PRODUCTION_DOMAIN
  }
}

/**
  * We allow different ways of parametrizing the app; either by setting attributes
  * on the div or by passing a key as query parameter denoting a "preset", so 
  * e.g. adding "?production" to the URL will option the "production" preset.
  */
const getParameter = (() => {
  const PRESETS = {
    'production': {
      'base-url': 'https://merchant-api.bluecode.com/v4',
      'storage-key': 'production.',
      // on production we're dealing with real money, so set
      // very low prices
      'inflation': '0.015'
    },
    'staging': {
      'base-url': 'https://merchant-api.bluecode.biz/v4',
      'storage-key': 'staging.'
    }
  }

  let presetParameters = {}

  for (let key of Object.keys(PRESETS)) {
    if (document.location.href.endsWith('?' + key)) {
      presetParameters = PRESETS[key]
    }
  }

  function getParameter(key) {
    return presetParameters[key] || element.getAttribute(key)
  }

  return getParameter
})()

let element = document.getElementById('insert-js-pos-here')

if (element) {
  redirectToHttps()

  let storageKey = getParameter('storage-key')

  setStoragePrefix(storageKey)

  let inflation = parseFloat(getParameter('inflation') || '1') || 1.0

  setInflation(inflation)

  let username = getParameter('username')
  let password = getParameter('password')
  let branch = getParameter('branch')
  let baseUrl = getParameter('base-url')

  if (username || password || branch) {
    setCredentials(
      username,
      password,
      branch)
  }

  ReactDOM.render(<App baseUrl={ baseUrl } />, element)
  
  registerServiceWorker()
}
