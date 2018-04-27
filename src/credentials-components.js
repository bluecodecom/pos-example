import React, { Component } from 'react'
import './credentials-components.css'
import { TextInput, Card, Button } from './util-components';
import { BlueCodeClient, BASE_URL_SANDBOX } from './BlueCodeClient';
import { generateMerchantTxId } from './client-util';

const CREDENTIALS_KEY = 'credentials'

export function setCredentials(username, password, branch) {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify([username, password, branch]))
}

/**
 * @returns string[] An array of user name, password and branch
 */
export function getCredentials() {
  let json = localStorage.getItem(CREDENTIALS_KEY)

  if (json) {
    return JSON.parse(json)
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

    let client = new BlueCodeClient(this.state.username, this.state.password, BASE_URL_SANDBOX)

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
      if (e.response.errorCode === 'BRANCH_NOT_FOUND') {
        this.setState({ error: 'Wrong branch. Check developer portal for right value.'})
        return false
      }

      if (e.response.errorCode === 'UNAUTHORIZED') {
        this.setState({ error: 'Invalid credentials. Sandbox responds with UNAUTHORIZED.'})
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
    let inputField = (property, placeholder, label) => 
      <div className='field'>
        <TextInput 
          value={ this.state[property] }
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
      { inputField('username', 'Access ID', 'User name for API calls. See developer portal for credentials.') }
      { inputField('password', 'Access Secret Key (password)', 'Password for API calls.') }
      { inputField('branch', 'Branch', 'The branch identifier. See developer portal.') }

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