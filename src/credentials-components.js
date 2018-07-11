import React, { Component } from 'react'
import './credentials-components.css'
import { TextInput, Card, Button } from './util-components'
import { BlueCodeClient, BASE_URL_SANDBOX } from './client/BlueCodeClient'
import { generateMerchantTxId } from './client/client-util'
import { getLocalStorage } from './util/local-storage'

const CREDENTIALS_KEY = 'credentials'

/**
 * @param {String} username 
 * @param {String} password 
 * @param {String} branch 
 */
export function setCredentials(username, password, branch) {
  getLocalStorage().setItem(CREDENTIALS_KEY, JSON.stringify([username, password, branch]))
}

/**
 * @returns string[] An array of user name, password and branch
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

export class CredentialsDialog extends Component {
  constructor() {
    super()

    let [username, password, branch] = getCredentials() || ['', '', '']

    this.state = {
      username: username,
      password: password,
      branch: branch,
      operator: '',
      isValidating: false
    }
  }

  async verifyCredentials() {
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
      await client.pay(
        {
          barcode: '98802222100100123456',
          branchExtId: this.state.branch,
          merchantTxId: merchantTxId,
          requestedAmount: 100
        }
      )
  
      client.cancel(merchantTxId)
        .catch(e => console.error(e))
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
            let isValid = await this.verifyCredentials() 
            
            if (isValid) {
              setCredentials(this.state.username, this.state.password, this.state.branch)
              this.props.onDone()
            }
          } }>Save</Button>
      </div>
    </Card>
  }
}
