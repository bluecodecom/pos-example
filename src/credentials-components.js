import React, { Component } from 'react'
import './credentials-components.css'
import { TextInput, Card, Button } from './util-components'
import { BlueCodeClient, BASE_URL_SANDBOX } from './client/BlueCodeClient'
import { generateMerchantTxId } from './util/client-util'
import { getLocalStorage } from './util/local-storage'
import { consoleProgress } from './client/console-progress';
import { getTerminalId } from './terminal-id';

const CREDENTIALS_KEY = 'credentials'
const CALLBACK_KEY = 'callbackUrl'

/**
 * @param {String} username 
 * @param {String} password 
 * @param {String} branch 
 */
export function setCredentials(username, password, branch) {
  getLocalStorage().setItem(CREDENTIALS_KEY, JSON.stringify([username, password, branch]))
}

/**
 * @returns string[] An array of user name, password and branch. undefined if no credentials.
 */
export function getCredentials() {
  let json = getLocalStorage().getItem(CREDENTIALS_KEY)

  if (json) {
    let credentials = JSON.parse(json)

    let isIterable = (obj) => typeof credentials[Symbol.iterator] === 'function'

    if (isIterable(credentials)) {
      return credentials
    }
  }
}

export function setCallbackUrl(callbackUrl) {
  getLocalStorage().setItem(CALLBACK_KEY, callbackUrl)
}

export function getCallbackUrl() {
  return getLocalStorage().getItem(CALLBACK_KEY)
}

export class CredentialsDialog extends Component {
  constructor() {
    super()

    let [username, password, branch] = getCredentials() || ['', '', '']
    let callbackUrl = getCallbackUrl() || ''

    this.state = {
      username: username,
      password: password,
      branch: branch,
      callbackUrl: callbackUrl,
      operator: '',
      isValidating: false
    }
  }

  async validateCredentials() {
    if (!this.state.username 
        || !this.state.password 
        || !this.state.branch) {
      return false
    }

    let baseUrl = this.props.baseUrl || BASE_URL_SANDBOX

    let client = new BlueCodeClient(this.state.username, this.state.password, baseUrl)

    let merchantTxId = generateMerchantTxId()

    this.setState({
      isValidating: true
    })

    try {
      await client.heartbeat(
        'ondemand',
        this.state.branch,
        getTerminalId(),
        consoleProgress)
    }
    catch (e) {
      let hostname = new URL(baseUrl).hostname

      if (e.code === 'BRANCH_NOT_FOUND') {
        this.setState({ error: 'Wrong branch. Check developer portal for right value.'})
        return false
      }

      if (e.code === 'UNAUTHORIZED') {
        this.setState({ error: 'Invalid credentials. ' + hostname + ' responds with UNAUTHORIZED.'})
        return false
      }

      if (e.code === 'TIMEOUT') {
        this.setState({ error: 'Timeout calling ' + hostname + 
          '. Does the server not allow connections from this domain (CORS)?'})

        return false
      }
    }
    finally {
      this.setState({
        isValidating: false
      })  
    }

    return true
  }

  render() {
    let inputField = (property, placeholder, label, autoComplete) => 
      <div className='field'>
        <TextInput 
          value={ this.state[property] }
          autoComplete={ autoComplete }
          onChange={ event => 
            this.setState({ [property]: event.target.value }) 
          }
          placeholder={ placeholder } 
          helper={ label } />
      </div>

    return <Card title='Credentials' className='credentials-dialog'>
      {
        this.state.error ? 
        <div className='error'>
          { this.state.error }
        </div>
        :
        []
      }
      { 
        inputField('username', 'Access ID', 'User name for API calls. See developer portal for credentials.', 'username') 
      }
      { 
        inputField('password', 'Access Secret Key (password)', 'Password for API calls.', 'current-password') 
      }
      { 
        inputField('branch', 'Branch', 'The branch identifier. See developer portal.', '') 
      }
      { 
        inputField('callbackUrl', 'Callback URL', <span>Optional. Webhook URL for QR Code transactions. Check out <a href="https://webhook.site">webhook.site</a></span>, '') 
      }

      <div className='button-bar'>
        {
          this.props.canCancel ?
            <Button 
              type='flat'
              onClick={ this.props.onCancel }>Cancel</Button>
            :
            []
        }

        <Button 
          type='flat'
          disabled={ this.state.isValidating || !this.state.username || !this.state.password || !this.state.branch }
          onClick={ async () => { 
            let isValid = await this.validateCredentials() 
            
            if (isValid) {
              setCredentials(this.state.username, this.state.password, this.state.branch)
              setCallbackUrl(this.state.callbackUrl)
              this.props.onDone()
            }
          } }>Save</Button>
      </div>
    </Card>
  }
}
