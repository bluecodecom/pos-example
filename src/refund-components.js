import React, { Component } from 'react'
import './refund-components.css'
import { TextInput, Card, Button } from './util-components';
import { BarcodeScanner, ScanBarcodeButton, ALIPAY_TRANSACTION_REGEX } from './BarcodeScanner';

export class RefundDialog extends Component {
  constructor() {
    super()

    this.state = {
      amount: '',
      acquirerTxId: '',
      isScannerOpen: false
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

    let openScanner = 
    () => this.setState({ isScannerOpen: true })
  
    let closeScanner = 
      () => this.setState({ isScannerOpen: false })

    let onBarcodeDetected = 
      (barcode) => {
        this.setState({ 
          acquirerTxId: barcode, 
          isScannerOpen: false 
        })
      }

    return <Card title='Refund' className='refund-dialog'>
      {
        this.state.isScannerOpen ?
          <BarcodeScanner 
            onBarcodeDetected={ onBarcodeDetected } 
            onCancel={ closeScanner } 
            matchRegexps={ [ ALIPAY_TRANSACTION_REGEX ] }
            barcodeTypeLabel='Alipay transaction'
            errorThreshold={ 0.12 }
            />
          :
          []
      }

      { 
        inputField(
          'amount', 
          'Amount', 
          'Leave empty for full refund.')
      }

      <ScanBarcodeButton 
          onClick={ openScanner }>
        { 
          inputField(
            'acquirerTxId', 
            'Acquirer Transaction ID', 
            'Transaction ID printed on the receipt.') 
        }
      </ScanBarcodeButton>

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
