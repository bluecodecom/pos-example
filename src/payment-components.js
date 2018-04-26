import React, { Component } from 'react'
import './payment-components.css'
import { Card, Button, TextInput } from './util-components'

class MagicBarcode {
  /**
   * @param {string} barcode 
   * @param {string} name 
   */
  constructor(barcode, name) {
    this.barcode = barcode
    this.name = name
  }
}

const MAGIC_BARCODES = [
  new MagicBarcode('98802222100100123456', 'Immediate Success'),
  new MagicBarcode('98802222999900301000', 'Success after 5s'),
  new MagicBarcode('98802222999900315000', 'Success after 15s'),
  new MagicBarcode('98802222998800305000', 'Failure after 5s'),
  new MagicBarcode('98802222998800315000', 'Failure after 15s'),
  new MagicBarcode('98804444000000402005', 'INVALID_STATE'),
  new MagicBarcode('98804444000000402007', 'LIMIT_EXCEEDED'),
  new MagicBarcode('98802222999900500500', 'SYSTEM_FAILURE'),
]

/**
 * The list of magic barcodes
 * @param {Object} props
 * @param {(Barcode) => void} props.onSelect
 */
function MagicBarcodesList(props) {
  return <div className='magic-barcodes-list'>
    {
      MAGIC_BARCODES.map(magicBarcode => <div className='barcode' onClick={() => props.onSelect(magicBarcode) }>
        <div className='logo'>
          <img src='img/barcode.png'/>
        </div>
        <div className='name'>{
          magicBarcode.name
        }</div>
      </div>)
    }
  </div>
}

/** 
 * These are the components involved in the payment workflow
 * (entering bar code and showing status).
 */
export class PaymentDialog extends Component {
  constructor() {
    super()

    this.state = {
      barcode: ''
    }
  }

  render() {
    return <Card title='Blue Code Payment' className='payment-dialog'>
      <TextInput 
        value={ this.state.barcode }
        onChange={ event => 
          this.setState({ barcode: event.target.value }) }
        placeholder='Enter barcode' />
  
      <div className='barcode-label'>
        Magic barcodes
      </div>

      <MagicBarcodesList onSelect={ (barcode) => this.setState({ barcode: barcode.barcode }) }/>

      <div className='button-bar'>
        <Button 
            type='flat' 
            onClick={ this.props.onCancel }>
          Cancel
        </Button>

        <Button 
            type='flat' 
            onClick={ () => this.props.onConfirm(this.state.barcode) }>
          Pay
        </Button>
      </div>
    </Card>
  }
}