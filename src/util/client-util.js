
/** Utility functions used by the blue code client. */

export function randomString() {
  let A = 'a'.charCodeAt(0)

  return '            '
    .split('')
    .map(() => String.fromCharCode(Math.round(Math.random()*25) + A))
    .join('')
}

/**
 * The merchant transaction ID needs to be unique. This generates a random, default ID if
 * the caller did not provide any other ID.
 */
export function generateMerchantTxId() {
  return randomString()
}

/**
 * Recursively maps the keys of an object according to a map function. 
 * Used for converting JSON (snake case) to camel case and vice versa.
 * @param {{}} object 
 * @param {(string) => string} mapFunction 
 */
export function mapKeys(object, mapFunction) {
  if (object == null) {
    return object
  }
  else {
    return Object.keys(object)
      .reduce((newObject, key) => {
        let value = object[key]

        if (typeof value === 'object') {
          value = mapKeys(value, mapFunction)
        }

        newObject[mapFunction(key)] = value

        return newObject 
      }, Array.isArray(object) ? [] : {})
  }
}

export function camelCaseToSnakeCase(camelCaseString) {
  return camelCaseString
    .replace(/([A-Z])/g, (x, upperCaseChar) => '_' + upperCaseChar.toLowerCase())
}

export function snakeCaseToCamelCase(snakeCaseString) {
  return snakeCaseString
    .replace(/_([a-z])/g, (x, lowerCaseChar) => lowerCaseChar.toUpperCase())
}

export function dateToString(date) {
  let dateWithMillis = date.toISOString()
  
  let dateWithoutMillis = dateWithMillis.slice(0, - '.000Z'.length) + 'Z'

  return dateWithoutMillis
}

export function requireAttribute(json, attribute) {
  if (json[attribute] === null || json[attribute] === undefined) {
    throw new Error('Missing attribute "' + attribute + '" in ' + JSON.stringify(json))
  }
}
