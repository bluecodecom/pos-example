import React, { Component } from 'react'
import './App.css'
import { Order } from './model'
import { OrderCard, ProductSelectionCard } from './ordering-components'
import { PaymentDialog, StatusDialog } from './payment-components'
import { ModalOverlay, Button } from './util-components'
import { BlueCodeClient, BASE_URL_SANDBOX } from './BlueCodeClient'
import { CredentialsDialog, getCredentials } from './credentials-components';
import { RefundDialog } from './refund-components';

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
     * @property { string } paymentStatus.operationName
     * @property { string[] } paymentStatus.logEntries
     * @property { () => void } paymentStatus.cancel
     */
    this.state = {
      order: new Order(),
      isPaymentDialogOpen: false,
      isRefundDialogOpen: false,
      isCredentialsDialogOpen: !getCredentials(),
      // if present, a payment is in progress 
      // and we show the payment status dialog
      paymentStatus: null, 
      lastTransactionAcquirerTxId: null
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

    let paymentStatus = this.state.paymentStatus

    return <ModalOverlay 
      onClose={ close }>

      <StatusDialog
        title={ paymentStatus.operationName + ' Status'}
        logEntries={ paymentStatus.logEntries }
        status={ paymentStatus.status }
        onCancel={ paymentStatus.cancel }
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

  renderRefundDialog() {
    let close = () => 
      this.setState({ 
        isRefundDialogOpen: null 
      })

    return <ModalOverlay 
      onClose={ close }>

      <RefundDialog
        acquirerTxId={ this.state.lastTransactionAcquirerTxId }
        onRefund={ 
          (acquirerTransactionId, amount, reason) => {
            this.setState({ 
              isRefundDialogOpen: false
            })

            this.refund(acquirerTransactionId, amount, reason) 
          }
        }
        onCancel={ close } 
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

    let refund = () => {
      this.setState({ 
        isRefundDialogOpen: true 
      })
    }
    
    let selectProduct = (product)=> 
      this.addProductToOrder(product) 
  
    return (
      <div className='App'>
        <div className='cards'>
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

          {
            (this.state.isRefundDialogOpen ?
              this.renderRefundDialog()
            : 
            [])
          }
        </div>

        <div className='refund-button'>
          <Button 
            type='inverse' 
            onClick={ refund }>Refund</Button>
        </div>
      </div>
    )
  }

  /** @returns {progress} */
  getProgressLogger(operationName) {
    this.setState({ 
      paymentStatus: { 
        logEntries: [],
        operationName 
      } 
    })

    let updatePaymentStatus = (callback) => {
      setTimeout(() => {    
        this.setState({
          paymentStatus: callback(this.state.paymentStatus)
        })
      })
    }

    return {
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
  }

  async refund(acquirerTransactionId, amount, reason) {
    let [username, password] = getCredentials()

    let client = new BlueCodeClient(username, password, BASE_URL_SANDBOX)

    try {
      await client.refund(
        acquirerTransactionId,
        amount,
        null,
        this.getProgressLogger('Refund')
      )
    }
    catch (e) {
      console.error(e)
    }
  }

  async pay(barcode) {
    let [username, password, branch] = getCredentials()

    let client = new BlueCodeClient(username, password, BASE_URL_SANDBOX)

    try {
      let response = await client.pay(
        {
          barcode: barcode,
          branchExtId: branch,
          requestedAmount: Math.round(this.state.order.getTotal() * 100)
        },
        this.getProgressLogger('Payment')
      )

      this.setState({
        lastTransactionAcquirerTxId: response.acquirerTxId
      })
    }
    catch (e) {
      console.error(e)
    }
  }
}

export default App;
