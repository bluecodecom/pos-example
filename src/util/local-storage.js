let localStorageFallback = {}
let didLogUnavailability = false

export function getLocalStorage() {
  try {
    return localStorage
  }
  catch (e) {
    if (!didLogUnavailability) {
      console.info(`Local storage not available (${e.message})`)

      didLogUnavailability = true
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
