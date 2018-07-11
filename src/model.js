const VAT_RATE = 0.17

export class Product {
  /**
   * @param {string} name 
   * @param {number} price 
   */
  constructor(name, pluralName, price) {
    this.name = name
    this.pluralName = pluralName
    this.price = price
  }
}

export class OrderItem {
  /**
   * @param {Product} product 
   * @param {number} quantity 
   */
  constructor(product, quantity) {
    this.product = product
    this.quantity = quantity || 1
  }

  getPrice() {
    return this.product.price * this.quantity
  }

  increaseCount() {
    return new OrderItem(this.product, this.quantity+1)
  }
}

export class Order {
  /**
   * @param {OrderItem[]} orderItems 
   */
  constructor(orderItems) {
    this.orderItems = orderItems || []
  }

  /**
   * @param {Product} product 
   */
  add(product) {
    let newItems = this.orderItems.map(
      item => item.product === product ? item.increaseCount() : item)

    let orderItem = newItems.find(item => item.product === product) 
  
    if (!orderItem) {
      newItems.push(new OrderItem(product, 0))
    }
  
    return new Order(newItems)
  }

  isEmpty() {
    return !this.orderItems.length
  }

  getTotal() {
    return this.getSubtotal() + this.getVat()
  }

  getSubtotal() {
    return this.orderItems.reduce((total, item) => total + item.getPrice(), 0)
  }

  getVat() {
    return VAT_RATE * this.getSubtotal()
  }
}

let inflation = 1.0

/**
 * This creatively named variables is a scaling factor for prices.
 * We use it to be able to set extremely low prices when testing in 
 * production where we're using real money.
 */
export function setInflation(newInflation) {
  inflation = newInflation
}

function inflate(price) {
  return Math.round(price * inflation * 100) / 100
}

export function getProducts() {
  return [
    new Product('aubergine', 'aubergines', inflate(1.50)),
    new Product('avocado', 'avocados', inflate(2.20)),
    new Product('broccoli', 'heads of broccoli', inflate(3.20)),
    new Product('corn', 'corn cobs', inflate(1.20)),
    new Product('beetroot', 'beetroots', inflate(2.70)),
    new Product('cucumber', 'cucumbers', inflate(1.30))
  ]
}
