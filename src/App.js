import React, { Component } from 'react'
import './App.css'
import { Order } from './model'
import { OrderCard, ProductSelectionCard } from './ordering-components'
import { PaymentDialog, StatusDialog, Spinner } from './payment-components'
import { ModalOverlay } from './util-components'
import { BlueCodeClient, BASE_URL_SANDBOX } from './BlueCodeClient'
import { CredentialsDialog, getCredentials } from './credentials-components';

const MAGIC_SUCCESS        = '98802222100100123456'
const MAGIC_PROCESS_FOR_5S = '98802222999900305000'
const MAGIC_PROCESS_FOR_15S = '98802222999900314000'

/** 
 @typedef { Object } paymentStatus 
 @property { string[] } logEntries
 @property { string } status 
 @property { () => Promise } cancel
 */

class App extends Component {
  constructor() {
    super()

    /**
     * @property { string[] } paymentStatus.logEntries
     * @property { () => void } paymentStatus.cancel
     */
    this.state = {
      order: new Order(),
      isPaymentDialogOpen: false,
      isCredentialsDialogOpen: !getCredentials(),
      // if present, a payment is in progress 
      // and we show the payment status dialog
      paymentStatus: null, 
    }
  }

  /**
   * @param {Product} product 
   */
  addProductToOrder(product) {
    this.setState({
      order: this.state.order.add(product)
    })
  }

  renderPaymentDialog() {
    let close = () => 
      this.setState({ isPaymentDialogOpen: false })

    return <ModalOverlay 
      onClose={ close }>

      <PaymentDialog
        order={ this.state.order } 
        onCancel={ close }
        onConfirm={ 
          (barcode) => { 
            close()
            this.pay(barcode) 
          } 
        } />

    </ModalOverlay>
  }

  renderPaymentStatus() {
    let close = () => 
      this.setState({ paymentStatus: null })

    return <ModalOverlay 
      onClose={ close }>

      <StatusDialog
        logEntries={ this.state.paymentStatus.logEntries }
        status={ this.state.paymentStatus.status }
        onCancel={ this.state.paymentStatus.cancel }
        onClose={ close } />

    </ModalOverlay>
  }

  renderCredentialsDialog() {
    let close = () => 
      this.setState({ 
        isCredentialsDialogOpen: null 
      })

    return <ModalOverlay 
      onClose={ close }>

      <CredentialsDialog
        onCancel={ close } 
        onDone={ close }
        canCancel={ !!getCredentials() }
      />

    </ModalOverlay>
  }

  render() {
    let openSettings = () => 
      this.setState({ 
        isCredentialsDialogOpen: true
      }) 

    let clear = () => 
      this.setState({ 
        order: new Order() 
      })
    
    let pay = () => {
      this.setState({ 
        isPaymentDialogOpen: true 
      })
    }
    
    let selectProduct = (product)=> 
      this.addProductToOrder(product) 
  
    return (
      <div className='App'>
        <ProductSelectionCard 
          onOpenSettings={ openSettings }
          onProductSelect={ selectProduct } />

        <OrderCard 
          order={ this.state.order }
          isPayEnabled={ !this.state.order.isEmpty() }
          onClear={ clear }
          onPayment= { pay } />

        {
          (this.state.isPaymentDialogOpen ?
            this.renderPaymentDialog()
          : 
          [])
        }

        {
          (this.state.paymentStatus ?
            this.renderPaymentStatus()
          : 
          [])
        }

        {
          (this.state.isCredentialsDialogOpen ?
            this.renderCredentialsDialog()
          : 
          [])
        }
      </div>
    )
  }

  async pay(barcode) {
    let [username, password, branch] = getCredentials()

    let client = new BlueCodeClient(username, password, BASE_URL_SANDBOX)

    this.setState({ paymentStatus: { logEntries: [] } })

    let updatePaymentStatus = (callback) => {
      setTimeout(() => {    
        this.setState({
          paymentStatus: callback(this.state.paymentStatus)
        })
      })
    }

    let progress = {
      onProgress: (message, status) => 
        updatePaymentStatus(paymentStatus => ({
          ...paymentStatus,
          logEntries: (paymentStatus.logEntries || []).concat(message ? message : []),
          status: status || paymentStatus.status
        })),
      onCancellable: (cancel) => 
        updatePaymentStatus(paymentStatus => ({
          ...paymentStatus,
          cancel
        }))
    }

    try {
      let response = await client.pay(
        {
          barcode: barcode,
          branchExtId: branch,
          requestedAmount: Math.round(this.state.order.getTotal() * 100)
        },
        progress
      )
    }
    catch (e) {
      console.error(e)
    }
  }
}

export default App;
