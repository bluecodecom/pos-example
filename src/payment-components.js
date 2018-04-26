import React, { Component } from 'react'
import './payment-components.css'
import { Card, Button, TextInput } from './util-components'
import { STATUS_PROCESSING, STATUS_CONNECTING } from './BlueCodeClient';

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
  new MagicBarcode('98802222999900315000', 'Timeout after 15s'),
  new MagicBarcode('98888888888888888888', 'Invalid barcode'),
  new MagicBarcode('98804444000000402006', 'INVALID_STATE'),
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
      MAGIC_BARCODES.map(magicBarcode => 
        <div 
            className='barcode' 
            key={ magicBarcode.barcode } 
            onClick={() => props.onSelect(magicBarcode) }>
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
 */

/**
 * Dialog for entering bar code and showing status.
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

/**
 * A clickable product image
 * @param {Object} props
 * @param {string[]} props.logEntries
 */
export class LogPanel extends Component {
  render() {
    let logEntries = this.props.logEntries || []
    
    return <div className='log-panel'>
      {
        logEntries.map((entry, i) => 
          <div className='entry' key={ i.toString() }>{ entry }</div>)
      }
      <div style={{ float:"left", clear: "both" }}
            ref={(el) => { this.messagesEnd = el; }}>
      </div> 
    </div>
  }

  scrollToBottom = () => {
    this.messagesEnd.scrollIntoView({ behavior: "smooth" });
  }
  
  componentDidUpdate() {
    this.scrollToBottom();
  }
}

/**
 * Dialog for showing payment progress.
 * @param {Object} props
 * @param {string[]} props.logEntries
 * @param {string[]} props.status
 * @param { () => void } props.onClose
 * @param { () => void } props.onCancel
 */
export function StatusDialog(props) {
  return <Card title='Payment Status' className='status-dialog'>
    <LogPanel logEntries={ props.logEntries } />
    <div className='button-bar'>
      {
        props.status == STATUS_CONNECTING || props.status == STATUS_PROCESSING ?
          <Button
              type='flat' 
              onClick={ props.onCancel }>
            Cancel
          </Button>
        :
        <Button 
            type='flat' 
            onClick={ props.onClose }>
          Close
        </Button>
      }
    </div>
  </Card>
}