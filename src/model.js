import './typedefs'

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

export const PRODUCTS = [
  new Product('aubergine', 'aubergines', 1.50),
  new Product('avocado', 'avocados', 2.20),
  new Product('beetroot', 'beetroots', 2.70),
  new Product('broccoli', 'heads of broccoli', 3.20),
  new Product('corn', 'corn cobs', 1.20),
  new Product('cucumber', 'cucumbers', 1.30)
]
