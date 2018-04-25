import React, { Component } from 'react'
import { PRODUCTS } from './model'
import './ordering-components.css'

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
 * A material design-style button.
 * @param {Object} props
 * @param {string} props.type Either 'flat' or 'inverse' (for white-on-dark button)
 */
function Button(props) {
  return <button className={ props.type }>Cash</button>
}

/**
 * A material design-style card.
 * @param {Object} props
 * @param {string} props.title Title at the top of the card.
 * @param {string[]} props.actions An optional array of actions. They values are strings 
 *                                 that must correspond to images in the img directory.
 * @param {(string) => void} props.onAction
 */
function Card(props) {
  return <div className={'card ' + props.className}>
    <div className='title'>
      <div class='name'>
        { props.title }
      </div>

      {
        (props.actions || []).map(action => 
          <div class='action' key={ action } onClick={ () => props.onAction(action) }>
            <img src={ 'img/' + action + '.svg' }/>
          </div>
        )
      }
    </div>
    <div className='body'>
      { props.children }
    </div>
  </div>
}

/**
 * A clickable product image
 * @param {Object} props
 * @param {Product} props.product
 */
function ProductButton(props) {
  return <div className='product-button' onClick={ () => props.onProductSelect(props.product) }>
    <img src={ 'img/' + props.product.name + '.svg' }/>
  </div>
}

/**
 * The card that shows the available products.
 * @param {Object} props
 * @param {(Product) => any} props.onProductSelect
 */
export function ProductSelectionCard(props) {
  return (<Card title='Product' className='product-selection-card'>
    { PRODUCTS.map(product =>
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
      <OrderLine name={ 
          (orderItem.quantity > 1 ? orderItem.quantity + ' ' + orderItem.product.pluralName : orderItem.product.name) 
        } price={ formatNumber(orderItem.getPrice()) }>
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
 */
function PaymentPanel(props) {
  return <div className='payment-panel'>
    <Button type='flat'>Cash</Button>
    <Button type='inverse'>Blue Code</Button>
  </div>
}

/**
 * The right-hand-side card that shows the order with buttons for initiating checkout.
 * @param {Object} props
 * @param {Order} props.order
 * @param {() => void} props.onClear
 */
export function OrderCard(props) {
  return (
    <Card title='Order' className='order-card' actions={ [ 'ic_clear_white_24px' ] } onAction={ ()=> props.onClear() }>
      <OrderItemsPanel orderItems={ props.order.orderItems }/>
      <OrderTotalPanel order={ props.order }/>
      <PaymentPanel/>
    </Card>
  )
}
