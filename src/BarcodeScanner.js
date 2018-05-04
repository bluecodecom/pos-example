import Quagga from 'quagga'
import React, { Component } from 'react'
import './BarcodeScanner.css' 

const ALIPAY_PREFIX = '2868' 
const BLUE_CODE_PREFIX = '988'

/**
 * Unfortunately the barcode scanning is so error-prone we need to 
 * do what we can to check for the code's plausibility.
 * @param {String} barcode 
 */
function isBarcodePlausible(barcode) {
  return !!barcode 
    && barcode.length >= 18
    && barcode.length <= 20
    && (barcode.startsWith(BLUE_CODE_PREFIX) || barcode.startsWith(ALIPAY_PREFIX))
    && barcode.match(/^[0-9]+$/)
}

export class BarcodeScanner extends Component {
  scannerDomNode = React.createRef()

  state = {
    isLoading: true,
    isFuzzy: false
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

  componentWillUnmount() {
    Quagga.stop()
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

          let didAlreadyDetectBarcode = false
          
          Quagga.onDetected((result) => {
            if (didAlreadyDetectBarcode) {
              return
            }
            
            let barcode = result.codeResult && result.codeResult.code
            
            let maxError = Math.max(...result.codeResult.decodedCodes.map(x => x.error).filter(e => !!e))
            
            console.log('Barcode ' + barcode + ', plausible: ' + isBarcodePlausible(barcode) + ', error: ' + maxError)

            if (maxError < 0.1 && isBarcodePlausible(barcode)) {            
              // quagga keeps calling us, so block future calls
              didAlreadyDetectBarcode = true

              this.props.onBarcodeDetected(barcode)
            }
            else if (!this.state.isFuzzy) {
              this.setState({
                isFuzzy: true
              })

              setTimeout(() => {
                this.setState({
                  isFuzzy: false
                })
              }, 3000)
            }
          })
        }
      })
  }

  render() {
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
              this.state.isLoading ? 
                'Initializing camera...'
                :
                (
                  this.state.isFuzzy ?
                  'Closer, please. I can\'t read that.' :
                  'Show the camera a Blue Code or Alipay barcode.'
                )
            }
          </div>
        </div>
      </div>
    </div>
  }
}