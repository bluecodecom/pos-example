import React, { Component } from 'react'
import './App.css'
import { Order } from './model'
import { OrderCard, ProductSelectionCard } from './ordering-components'
import { PaymentDialog, StatusDialog } from './payment-components'
import { ModalOverlay, Button } from './util-components'
import { BlueCodeClient, BASE_URL_SANDBOX } from './client/BlueCodeClient'
import { CredentialsDialog, getCredentials } from './credentials-components';
import { RefundDialog } from './refund-components';
import { MESSAGES, ERROR_NON_CANCELED_TIMEOUTS, ERROR_SYSTEM_FAILURE } from './util/error-messages' 
import * as progress from './client/console-progress'  // eslint-disable-line no-unused-vars
import { Exception } from 'handlebars';
import { rewardedPayment } from './client/rewarded-payment';
import { ErrorResponse } from './client/ErrorResponse';
import { heartbeat } from './client/heartbeat';
import { getTerminalId } from './terminal-id';

const CENTS_PER_EURO = 100

/**
 * Converts from the amounts entered in the UI - which are in euros - to those
 * sent to the API - which are in cents (i.e. the minor currency unit).
 * @param {number} amountInMajorUnit 
 */
function toMinorCurrencyUnit(amountInMajorUnit) {
  return Math.round(amountInMajorUnit * CENTS_PER_EURO)
}

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

  stopHeartbeat = () => {}

  /**
   * Starts the "heartbeat" process that informs BlueCode that the POS is online.
   * @see https://bluecodepayment.readme.io/v4/reference#heartbeat
   */
  restartHeartbeat() {
    this.stopHeartbeat()

    let [name, password, branchExtId] = getCredentials()

    // the heartbeat process returns a callback that should be
    // called when shutting down to send the shutdown event. 
    this.stopHeartbeat = heartbeat(this.getClient(), branchExtId, getTerminalId())
  }

  componentDidMount() {
    if (getCredentials()) {      
      this.getClient().nonCanceledTimeouts.retryPersisted()

      this.restartHeartbeat()
    }

    window.addEventListener('beforeunload', () => this.stopHeartbeat())
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
    let close = () => {
      getCredentials() 
      
      this.restartHeartbeat()
      
      this.setState({ 
        isCredentialsDialogOpen: null 
      })
    }

    return <ModalOverlay 
      onClose={ close }>

      <CredentialsDialog
        baseUrl={ this.getBaseUrl() }
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

            this.refund(acquirerTransactionId, toMinorCurrencyUnit(amount), reason) 
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
      // there are still transactions that timed out and where were 
      // are unable to call cancel because that call also times out.
      // disallow transactions to prevent long queues of cancelations
      // from building up.
      if (this.getClient().nonCanceledTimeouts.isStillCanceling()) {
        alert(MESSAGES.en[ERROR_NON_CANCELED_TIMEOUTS])
      }
      else {
        this.setState({ 
          isPaymentDialogOpen: true 
        })
      }
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

  /** @returns {progress.Progress} */
  getProgress(operationName) {
    let id = new Date().getTime()

    let paymentStatus = {
      logEntries: [],
      id,
      operationName 
    }

    this.setState({ paymentStatus })

    let updatePaymentStatus = (callback) => {
      // the progress window has already been closed (paymentStatus is null)
      // or a new, different progress window has been opened (paymentStatus.id is a different id)
      if (!this.state.paymentStatus || this.state.paymentStatus.id !== id) {
        return
      }

      setTimeout(() => { 
        this.setState({
          paymentStatus: callback(this.state.paymentStatus)
        })
      })
    }

    return {
      /**
       * @param status One of the STATUS_ or ERROR_ constants defined in error-messages.js.
       */
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

  getClient() {
    let credentials = getCredentials()

    if (!credentials) {
      throw new Exception('No credentials.')
    }

    let [username, password] = credentials

    return new BlueCodeClient(username, password, this.getBaseUrl())
  }

  getBaseUrl() {
    return this.props.baseUrl || BASE_URL_SANDBOX
  }

  async refund(acquirerTransactionId, amount, reason) {
    let client = this.getClient()

    try {
      await client.refund(
        acquirerTransactionId,
        amount,
        null,
        this.getProgress('Refund')
      )
    }
    catch (e) {
      console.error(e)
    }
  }

  async pay(barcode) {
    let [username, password, branch] = getCredentials() // eslint-disable-line no-unused-vars

    let client = this.getClient()

    let progress = this.getProgress('Payment')

    try {
      let isRewardApplicable = (reward) => true

      let getDiscountedAmount = (originalAmount, rewards) => {
        // just to show the principle of discounts we give 50% discount for one reward, 66% for two etc...
        let discountedAmount = Math.round(originalAmount / (rewards.length+1))

        if (rewards.length) {
          progress.onProgress(`Awarding ${ Math.round(100 * rewards.length / (rewards.length+1)) }% discount. New total ${ discountedAmount }.`)
        }

        return discountedAmount
      }
      
      let getPaymentOptions = 
        (rewards) => {
          let totalAmount = toMinorCurrencyUnit(this.state.order.getTotal())
          let requestedAmount = getDiscountedAmount(totalAmount, rewards)
    
          return {
            barcode: barcode,
            branchExtId: branch,
            discountAmount: totalAmount - requestedAmount,
            paymentAmount: totalAmount,
            requestedAmount: requestedAmount
          }
        }
  
      let response = await rewardedPayment(
        barcode,
        isRewardApplicable,
        getPaymentOptions,
        client,
        progress
      )

      this.setState({
        lastTransactionAcquirerTxId: response.acquirerTxId
      })
    }
    catch (e) {
      if (!(e instanceof ErrorResponse)) {
        progress.onProgress('Client exception ' + e, ERROR_SYSTEM_FAILURE)
      }

      console.error(e)
    }
  }
}

export default App;
