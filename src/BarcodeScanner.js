import Quagga from 'quagga'
import React, { Component } from 'react'
import './BarcodeScanner.css' 

const ALIPAY_REGEX = /^(25|26|27|28|29|30)[0-9]{14,22}$/
const BLUE_CODE_REGEX = /^988[0-9]{17}$/

/**
 * Unfortunately, the barcode scanning is so error-prone we need to 
 * do what we can to check for the code's plausibility.
 * @param {String} barcode 
 */
function isBarcodePlausible(barcode) {
  return !!barcode 
    && barcode.length >= 18
    && barcode.length <= 20
    && (barcode.match(ALIPAY_REGEX) 
      || barcode.match(BLUE_CODE_REGEX))
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
    isFuzzy: false,
    isAlipay: false,
  }

  constructor() {
    super()

    this.onDetectedListener = (result) => this.onDetected(result) 
  }
  
  onDetected(result) {
    if (this.didAlreadyDetectBarcode) {
      return
    }
    
    let barcode = result.codeResult && result.codeResult.code
    
    let maxError = Math.max(...result.codeResult.decodedCodes.map(x => x.error).filter(e => !!e))
    
    console.log('Barcode ' + barcode + ', plausible: ' + isBarcodePlausible(barcode) + ', error: ' + maxError)

    if (maxError < 0.11 && isBarcodePlausible(barcode)) {
      // quagga keeps calling us, so block future calls
      this.didAlreadyDetectBarcode = true

      this.props.onBarcodeDetected(barcode)
    }
    else if (!this.state.isFuzzy) {
      this.setState({
        isFuzzy: true,
        isAlipay: barcode.match(ALIPAY_REGEX),
        isPlausible: isBarcodePlausible(barcode)
      })

      setTimeout(() => {
        this.setState({
          isFuzzy: false
        })
      }, 3000)
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
  }

  render() {
    let label =              
      'Show the camera a Blue Code or Alipay barcode.'

    if (this.state.isLoading) {
      label = 'Initializing camera...'
    }
    else if (this.state.isFuzzy) {
      if (this.state.isAlipay) {
        label = 'Closer, please. Open the barcode in fullscreen.'
      }
      else if (!this.state.isPlausible) {
        label = 'That does not seem like a correct barcode.'
      }
      else {
        label = 'Closer, please. I can\'t read that.'
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