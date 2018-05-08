import Quagga from 'quagga'
import React, { Component } from 'react'
import './BarcodeScanner.css' 
import { Button } from './util-components';

export const ALIPAY_REGEX = /^(25|26|27|28|29|30)[0-9]{14,22}$/
export const BLUE_CODE_REGEX = /^988[0-9]{17}$/

/**
 * The barcode the consumer sees in the Alipay transaction history. 
 * This is the acquirer transaction ID for Alipay transactions.
 */
export const ALIPAY_TRANSACTION_REGEX = /^[0-9A-Z]{26}$/

/**
 * The button next to an input field for triggering barcode scanning.
 * @param {Object} props 
 * @param {() => void} props.onClick
 */
export function ScanBarcodeButton(props) {
  return <div className='scan-barcode-button'>
    <div>
      { props.children }
    </div>
    <div className='button-container'>
      <Button
          type='flat' 
          onClick={ props.onClick }>
        <img 
          src='img/ic_photo_camera_black_24px.svg'
          alt='Scan barcode'/>
      </Button>
    </div>          
  </div>
}

export class BarcodeScanner extends Component {
  scannerDomNode = React.createRef()
  didAlreadyDetectBarcode = false

  /**
   * @property { ({}) => void }
   */
  onDetectedListener = null

  state = {
    isLoading: true,
    isBarcodeVisible: false,
    isFuzzy: false,
    isAlipay: false,
  }

  constructor() {
    super()

    this.onDetectedListener = (result) => this.onDetected(result) 
  }
    
  /**
   * Unfortunately, the barcode scanning is so error-prone we need to 
   * do what we can to check for the code's plausibility.
   * @param {String} barcode 
   */
  isBarcodePlausible(barcode) {
    let regexps = this.props.matchRegexps || [
      ALIPAY_TRANSACTION_REGEX,
      ALIPAY_REGEX,
      BLUE_CODE_REGEX
    ]

    return !!barcode 
      && !!regexps.find(regexp => barcode.match(regexp)) 
  }

  /** 
    * Used in various messages to describe the barcode. Can be e.g. 'Alipay payment'
    */
  getBarcodeTypeLabel() {
    return this.props.barcodeTypeLabel || ''
  }

  /**
   * The maximum error we accept during scanning.
   */
  getErrorThreshold() {
    return this.props.errorThreshold || 0.11
  }

  onDetected(result) {
    if (this.didAlreadyDetectBarcode) {
      return
    }
    
    this.clearLabelTimer()

    let barcode = result.codeResult && result.codeResult.code
    
    let maxError = Math.max(...result.codeResult.decodedCodes.map(x => x.error).filter(e => !!e))
    
    let isPlausible = this.isBarcodePlausible(barcode)
    let isFuzzy = maxError >= this.getErrorThreshold()

    console.log('Barcode ' + barcode + ', plausible: ' + isPlausible + ', error: ' + maxError)

    if (!isFuzzy && isPlausible) {
      // quagga keeps calling us, so block future calls
      this.didAlreadyDetectBarcode = true

      this.props.onBarcodeDetected(barcode)
    }
    else {
      this.setState({
        isFuzzy: isFuzzy,
        isAlipay: barcode.match(ALIPAY_REGEX) 
          || barcode.match(ALIPAY_TRANSACTION_REGEX),
        isPlausible: isPlausible,
        isBarcodeVisible: true
      })

      this.setLabelTimer()
    }
  }

  /** Clear any message about the barcode after a certain time elapses. 
    */
  setLabelTimer() {
    this.labelTimer = setTimeout(() => {
      this.setState({
        isFuzzy: false,
        isBarcodeVisible: false
      })
    }, 3000)
  }

  clearLabelTimer() {
    if (this.labelTimer) {
      clearTimeout(this.labelTimer)
    }
  }

  getQuaggaParameters() {
    return {
      inputStream: {
        type: "LiveStream",
        constraints: {
          width: {min: 1280},
          height: {min: 720},
          facingMode: "environment",
          aspectRatio: { min: 1, max: 2 }
        },
        target: this.scannerDomNode.current
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      numOfWorkers: 4,
      frequency: 10,
      decoder: {
        readers: [{
          format: "code_128_reader",
          config: {}
        }]
      },
      locate: true
    }
  }  

  componentDidMount() {
    Quagga.init(
      this.getQuaggaParameters(), 
      (err) => {
        if (err) {
          this.props.onCancel()

          console.error(err)

          // wait for the empty video panel to close
          setTimeout(() =>
            alert('While trying to access camera: ' + err.message), 50)
        }
        else {
          this.setState({ isLoading: false })
          Quagga.start()
          Quagga.onDetected(this.onDetectedListener)
        }
      })
  }

  componentWillUnmount() {
    Quagga.offDetected(this.onDetectedListener)
    Quagga.stop()
    this.clearLabelTimer()
  }

  render() {
    let label =              
      `Show the camera a ${ this.getBarcodeTypeLabel() } barcode.`

    if (this.state.isLoading) {
      label = 'Initializing camera...'
    }
    else if (this.state.isBarcodeVisible) {
      if (this.state.isFuzzy) {
        if (this.state.isAlipay) {
          label = 'Closer, please. Open the barcode in fullscreen.'
        }
        else {
          label = 'Closer, please. I can\'t read that.'
        }
      }
      else if (!this.state.isPlausible) {
        label = `That does not seem like a valid ${ this.getBarcodeTypeLabel() } barcode.`
      }
    }

    return <div className='barcode-scanner'>
      <div 
        ref={ this.scannerDomNode  } 
        className='video-container'
        onClick={ this.props.onCancel }>

        <div className='close'>
          <img src='img/ic_clear_white_24px.svg' alt='Close' />
        </div>
        
        <div className='label-container'>
          <div className='label'>
            {
              label
            }
          </div>
        </div>
      </div>
    </div>
  }
}