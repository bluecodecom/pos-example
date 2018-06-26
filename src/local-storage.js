let localStorageFallback = {}

export function getLocalStorage() {
  try {
    return localStorage
  }
  catch (e) {
    console.error(e)

    // fallback, e.g. when third-party cookies are denied and running in an iframe
    return {
      getItem: (key) => localStorageFallback[key],
      setItem: (key, value) => localStorageFallback[key] = value,
      removeItem: (key) => localStorageFallback[key] = null
    }
  }
}
