import React, { Component } from 'react'
import './App.css'
import { Order } from './model'
import { OrderCard, ProductSelectionCard } from './ordering-components'
import { PaymentDialog } from './payment-components'
import { ModalOverlay } from './util-components'
import { BlueCodeClient } from './BlueCodeClient'

const ANDREAS_AUTH = ['PORTAL-813eadd9-8f99-40d7-9cea-d13dd0ae9610', 'fc228542-4282-4637-ae91-dc36f5956752']

const MAGIC_SUCCESS        = '98802222100100123456'
const MAGIC_PROCESS_FOR_5S = '98802222999900305000'
const MAGIC_PROCESS_FOR_15S = '98802222999900314000'

const BASE_URL_PRODUCTION = 'https://merchant-api.bluecode.com/v4'
const BASE_URL_SANDBOX = 'https://merchant-api.bluecode.biz/v4'

class App extends Component {
  constructor() {
    super()

    this.state = {
      order: new Order(),
      isPaymentDialogOpen: false
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

    return (
      <div className='App'>
        <ProductSelectionCard 
          onProductSelect={ (product)=> 
            this.addProductToOrder(product) } />

        <OrderCard 
          order={ this.state.order }
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
      </div>
    )
  }

  async pay(barcode) {
    let client = new BlueCodeClient(ANDREAS_AUTH[0], ANDREAS_AUTH[1], BASE_URL_SANDBOX)

    let response = await client.pay(
      {
        barcode: barcode,
        branchExtId: 'test',
        requestedAmount: 100
      }
    )

    console.log('payment response', response)
  }
}

export default App;
