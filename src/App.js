import React, { Component } from 'react'
import './App.css'
import { Order, OrderItem, Product, PRODUCTS } from './model'
import { OrderCard, ProductSelectionCard } from './ordering-components'
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
      order: new Order()
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
    return (
      <div className='App'>
        <ProductSelectionCard onProductSelect={ (product)=> this.addProductToOrder(product) } />
        <OrderCard order={ this.state.order } onClear={ () => this.setState({ order: new Order() }) }/>
      </div>
    );
  }

  async foo() {
    var client = new BlueCodeClient(ANDREAS_AUTH[0], ANDREAS_AUTH[1], BASE_URL_SANDBOX)

    var response = await client.pay(
      {
        barcode: MAGIC_PROCESS_FOR_15S,
        branchExtId: 'test',
        requestedAmount: 100
      }
    )

    console.log('payment response', response)
  }
}

export default App;
