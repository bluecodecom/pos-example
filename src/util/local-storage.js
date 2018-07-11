let localStorageFallback = {}
let didLogUnavailability = false

let storagePrefix = ''

/**
 * Returns a localStorage instance. If local storage is not available, it 
 * will return a non-persisted dummy instance instead of failing.
 */
export function getLocalStorage() {
  try {
    // this will throw an exception if local storage is missing
    let storage = localStorage

    // wrap localstorage to rewrite the key names to prepend prefix.
    return ({
      getItem: (key) => storage.getItem(storagePrefix + key),
      setItem: (key, value) => storage.setItem(storagePrefix + key, value),
      removeItem: (key) => storage.removeItem(storagePrefix + key),
      clear: () => storage.clear()
    })
  }
  catch (e) {
    if (!didLogUnavailability) {
      didLogUnavailability = true
      
      console.info(`Local storage not available (${e.message})`)
    }

    // fallback, e.g. when third-party cookies are denied and running in an iframe
    return {
      getItem: (key) => localStorageFallback[key] || null,
      setItem: (key, value) => localStorageFallback[key] = value,
      removeItem: (key) => delete localStorageFallback[key],
      clear: () => localStorageFallback = {}
    }
  }
}

/** the storage prefix is prepended to any keys set by this call. 
  * it thereby partitions local storage into independent spaces,
  * which is useful to keep e.g. the production credentials
  * independent of the sandbox ones.
  */
export function setStoragePrefix(newStoragePrefix) {
  storagePrefix = newStoragePrefix || ''
}
