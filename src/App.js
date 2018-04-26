import React, { Component } from 'react'
import './App.css'
import { Order } from './model'
import { OrderCard, ProductSelectionCard } from './ordering-components'
import { PaymentDialog, StatusDialog } from './payment-components'
import { ModalOverlay } from './util-components'
import { BlueCodeClient } from './BlueCodeClient'

const ANDREAS_AUTH = ['PORTAL-813eadd9-8f99-40d7-9cea-d13dd0ae9610', 'fc228542-4282-4637-ae91-dc36f5956752']

const MAGIC_SUCCESS        = '98802222100100123456'
const MAGIC_PROCESS_FOR_5S = '98802222999900305000'
const MAGIC_PROCESS_FOR_15S = '98802222999900314000'

const BASE_URL_PRODUCTION = 'https://merchant-api.bluecode.com/v4'
const BASE_URL_SANDBOX = 'https://merchant-api.bluecode.biz/v4'

/** 
 @typedef { Object } paymentStatus 
 @property { string[] } logEntries
 @property { string } status 
 @property { () => Promise } cancel
 */

class App extends Component {
  constructor() {
    super()

    this.state = {
      order: new Order(),
      isPaymentDialogOpen: false,
      // if present, a payment is in progress
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

  render() {
    let closePaymentDialog = () => 
      this.setState({ isPaymentDialogOpen: false })

    let closeStatusDialog = () => 
      this.setState({ paymentStatus: null })

      return (
      <div className='App'>
        <ProductSelectionCard 
          onProductSelect={ (product)=> 
            this.addProductToOrder(product) } />

        <OrderCard 
          order={ this.state.order }
          isPayEnabled={ !this.state.order.isEmpty() }
          onClear={ () => 
            this.setState({ order: new Order() }) }
          onPayment= { () => 
            this.setState({ isPaymentDialogOpen: true }) } />

        {
          (this.state.isPaymentDialogOpen ?
            <ModalOverlay 
                onClose={ closePaymentDialog }>

              <PaymentDialog
                order={ this.state.order } 
                onCancel={ closePaymentDialog }
                onConfirm={ (barcode) => { closePaymentDialog(); this.pay(barcode) } } />

            </ModalOverlay>
          : 
          [])
        }

        {
          (this.state.paymentStatus ?
            <ModalOverlay 
                onClose={ closeStatusDialog }>

              <StatusDialog
                logEntries={ this.state.paymentStatus.logEntries }
                status={ this.state.paymentStatus.status }
                onCancel={ this.state.paymentStatus.cancel }
                onClose={ closeStatusDialog } />

            </ModalOverlay>
          : 
          [])
        }
      </div>
    )
  }

  async pay(barcode) {
    let client = new BlueCodeClient(ANDREAS_AUTH[0], ANDREAS_AUTH[1], BASE_URL_SANDBOX)

    let updatePaymentStatus = (callback) => {
      setTimeout(() => {
        let paymentStatus = this.state.paymentStatus || { logEntries: [] }
    
        this.setState({
          paymentStatus: callback(paymentStatus)
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
          branchExtId: 'test',
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
