import React, { Component } from 'react'
import './payment-components.css'
import { Card, Button, TextInput } from './util-components'
import { STATUS_PROCESSING, STATUS_CONNECTING } from './error-messages';
import { BarcodeScanner, ScanBarcodeButton, ALIPAY_REGEX, BLUE_CODE_REGEX } from './BarcodeScanner';
import { MESSAGES } from './error-messages' 

/** 
 * These are the components involved in the payment workflow
 */

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
            <img src='img/barcode.png' alt=''/>
          </div>
          <div className='name'>{
            magicBarcode.name
          }</div>
        </div>)
    }
  </div>
}

/**
 * Dialog for entering bar code and showing status.
 */
export class PaymentDialog extends Component {
  state = {
    barcode: '',
    isScannerOpen: false,
    isFuzzy: false
  }

  render() {
    let openScanner = 
      () => this.setState({ isScannerOpen: true })
    
    let closeScanner = 
      () => this.setState({ isScannerOpen: false })

    let onBarcodeDetected = (barcode) => {
      this.setState({ 
        barcode: barcode,
        isScannerOpen: false
      })
      
      this.props.onConfirm(barcode)
    }

    return <Card title='Blue Code Payment' className='payment-dialog'>
      {
        this.state.isScannerOpen ?
          <BarcodeScanner 
            onBarcodeDetected={ onBarcodeDetected } 
            onCancel={ closeScanner } 
            matchRegexps={ [ ALIPAY_REGEX, BLUE_CODE_REGEX ] }
            barcodeTypeLabel='(Blue Code or Alipay) payment'
            />
          :
          []
      }
      <ScanBarcodeButton
          onClick={ openScanner }>
        <TextInput 
          value={ this.state.barcode }
          onChange={ event => 
            this.setState({ barcode: event.target.value }) }
          placeholder='Enter barcode' />
      </ScanBarcodeButton>
  
      <div className='barcode-label'>
        Magic barcodes
      </div>

      <MagicBarcodesList onSelect={ 
        (barcode) => this.setState({ barcode: barcode.barcode }) 
      }/>

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
  let isStillWorking = 
    props.status === STATUS_CONNECTING 
    || props.status === STATUS_PROCESSING

  return <Card title={ props.title } className='status-dialog'>
    <Spinner status={ isStillWorking ? '' : MESSAGES.en[props.status] || props.status } />
    <LogPanel logEntries={ props.logEntries } />
    <div className='button-bar'>
      {
        isStillWorking ?
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

/**
 * Spinner showing an animated bar code unless the `status` property is set, in which case it shows as status.
 */
export class Spinner extends Component {
  // the sizes of the bars in the animated bar code, normalized to a scale of 0..1
  BARS = [
    { x: 0, w: 30 },
    { x: 55, w: 45 },
    { x: 123, w: 27 },
    { x: 191, w: 30 },
    { x: 258, w: 18 },
    { x: 310, w: 30 },
    { x: 382, w: 27 },
    { x: 434, w: 45 },
    { x: 502, w: 30 }
  ]
  .map(rect => ({
    x: (rect.x / 532), w: (rect.w / 532)
  }))
  
  PAUSE_BETWEEN_BARS = 300
  PAUSE_BETWEEN_ITERATIONS = 500
  ANIMATION_DURATION = 500
  BARCODE_WIDTH = 200
  CANVAS_WIDTH = 1000
  CANVAS_HEIGHT = this.CANVAS_WIDTH/10

  constructor() {
    super()

    this.state = {
      isFallingFromRight: false,
      currentlyFalling: 0,
      iteration: 1
    }
  }

  startFalling() {
    if (this.props.status) {
      return
    }
    
    for (let idx = 0; idx < this.BARS.length; idx++) {
      let i = idx

      setTimeout(() => {
        this.setState({ 
          currentlyFalling: i+1
        })
      }, i * this.PAUSE_BETWEEN_BARS)
    }
  }

  fallFromOtherSide() {
    this.setState({ 
      isFallingFromRight: !this.state.isFallingFromRight,
      currentlyFalling: 0,
      iteration: this.state.iteration+1,
      className: null
    })
    
    setTimeout(
      () => this.startFalling(), 
      this.PAUSE_BETWEEN_ITERATIONS)
  }

  componentWillUnmount() {
    clearInterval(this.timer)
  }

  componentDidMount() {
    this.startFalling()

    this.timer = setInterval(
      () => this.fallFromOtherSide(), 
      this.PAUSE_BETWEEN_ITERATIONS 
      + this.BARS.length * this.PAUSE_BETWEEN_BARS 
      + this.ANIMATION_DURATION)
  }

  render() {
    if (this.props.status) {
      return <div className='spinner status'>
        <div>{ this.props.status }</div>
      </div>
    }
    else {
      let state = this.state
      let canvasOffsetX = (state.className === 'right' ? this.CANVAS_WIDTH : 0)
      let barOffsetX = (state.isFallingFromRight ? 500 - this.BARCODE_WIDTH / 2 : -this.BARCODE_WIDTH)

      return <svg viewBox={ `${ canvasOffsetX } 0 ${this.CANVAS_WIDTH} ${this.CANVAS_HEIGHT}` } className='spinner'>
      {
        this.BARS.map((rect, i) =>
          <svg 
            x={ rect.x * this.BARCODE_WIDTH + barOffsetX }
            key={ state.iteration + '' + i } 
            >
            <rect 
              x={ 500 + this.BARCODE_WIDTH / 2 } 
              y='0' 
              className={ i < state.currentlyFalling ? 'animate' : '' }
              width={ rect.w * this.BARCODE_WIDTH } 
              height={ this.CANVAS_HEIGHT } 
              fill='#000000' />
          </svg>
        )
      }
      </svg>
    }
  }
}