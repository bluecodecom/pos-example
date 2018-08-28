import React from 'react'
import { getProducts } from './model'
import './ordering-components.css'
import { Card, Button } from './util-components'

/** 
 * These are the components involved in the ordering screen 
 * (product selection and order total display).
 */

/**
 * Number to string with two decimal places.
 * @param {number} number 
 * @returns string
 */
function formatNumber(number) {
  return Number(number).toLocaleString(undefined, 
    { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
}

/**
 * A clickable product image
 * @param {Object} props
 * @param {Product} props.product
 */
function ProductButton(props) {
  return <div className='product-button' onClick={ () => props.onProductSelect(props.product) }>
    <img src={ 'img/' + props.product.name + '.svg' } alt={ props.product.name } />
  </div>
}

/**
 * The card that shows the available products.
 * @param {Object} props
 * @param {(Product) => any} props.onProductSelect
 * @param {() => void} props.onOpenSettings
 */
export function ProductSelectionCard(props) {
  return (<Card 
      title='Product' 
      className='product-selection-card'
      actions={ [ 'ic_settings_white_24px' ] } 
      onAction={ props.onOpenSettings }>
    { getProducts().map(product =>
      <ProductButton 
        key={ product.name } 
        product={ product } 
        onProductSelect={ props.onProductSelect } 
        />) }
  </Card>)
}

/**
 * A single line in an order, showing product name, quantity and price.
 * @param {Object} props
 * @param {string} props.name
 * @param {number} props.price
 */
function OrderLine(props) {
  return <div key={ props.name } className='order-item'>
    <div className='name'>
      { props.name }
    </div>
    <div className='price'>
      { formatNumber(props.price) }
    </div>
  </div>
}

/**
 * Lists the items of an order.
 * @param {Object} props
 * @param {OrderItem[]} props.orderItems
 */
function OrderItemsPanel(props) {
  return <div className='order-items-panel'>{
    props.orderItems.map(orderItem => 
      <OrderLine 
        key={ orderItem.product.name }
        name={ (orderItem.quantity > 1 
          ? orderItem.quantity + ' ' + orderItem.product.pluralName 
          : orderItem.product.name) } 
        price={ formatNumber(orderItem.getPrice()) }>
      </OrderLine>)
  }</div>
}

/**
 * Shows the order subtotal, VAT and price.
 * @param {Object} props
 * @param {Order} props.order
 */
function OrderTotalPanel(props) {
  return <div className='order-total-panel'>
    <OrderLine name='Subtotal' price={ props.order.getSubtotal() }/>
    <OrderLine name='VAT' price={ props.order.getVat() }/>
    <OrderLine name='Total' price={ props.order.getTotal() }/>
  </div>
}

/**
 * Button bar showing buttons for the payment methods.
 * @param {Object} props
 * @param {() => void} props.onPayment
 * @param {boolean} props.isPayEnabled
 */
function PaymentPanel(props) {
  return <div className='payment-panel'>
    <Button 
      type='flat'
      disabled={ !props.isPayEnabled }
      onClick={ props.onRegister }>QR Code</Button>

    <Button 
      type='inverse' 
      disabled={ !props.isPayEnabled } 
      onClick={ props.onPayment }>Blue Code</Button>
  </div>
}

/**
 * The right-hand-side card that shows the order with buttons for initiating checkout.
 * @param {Object} props
 * @param {Order} props.order
 * @param {() => void} props.onClear
 * @param {() => void} props.onPayment
 * @param {boolean} props.isPayEnabled
 */
export function OrderCard(props) {
  return (
    <Card title='Order' 
        className='order-card' 
        actions={ [ 'ic_clear_white_24px' ] } 
        onAction={ props.onClear }>

      <OrderItemsPanel 
        orderItems={ props.order.orderItems }/>

      <OrderTotalPanel 
        order={ props.order }/>

      <PaymentPanel 
        isPayEnabled={ props.isPayEnabled }
        onPayment={ props.onPayment }
        onRegister={ props.onRegister }/>

    </Card>
  )
}
