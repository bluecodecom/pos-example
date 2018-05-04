import React, { Component } from 'react'
import './refund-components.css'
import { TextInput, Card, Button } from './util-components';

export class RefundDialog extends Component {
  constructor() {
    super()

    this.state = {
      amount: '',
      acquirerTxId: '',
    }
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.acquirerTxId !== prevState.acquirerTxId) {
      return { 
        acquirerTxId: nextProps.acquirerTxId 
      }
    }
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

    let refund = () => {
      if (this.state.acquirerTxId) {
        // null if empty
        let amount = parseFloat(this.state.amount) || null
  
        this.props.onRefund(this.state.acquirerTxId, amount, '') 
      }
    }

    return <Card title='Refund' className='refund-dialog'>
      { inputField('amount', 'Amount', 'Leave empty for full refund.') }
      { inputField('acquirerTxId', 'Acquirer Transaction ID', 'Transaction ID printed on the receipt.') }

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
          disabled={ !this.state.acquirerTxId }
          onClick={ refund }>
          Refund 
        </Button>
      </div>
    </Card>
  }
}
