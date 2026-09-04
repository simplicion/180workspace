// SSR-safe storage for redux-persist without fragile CJS imports
const createNoopStorage = () => ({
  getItem(_key) {
    return Promise.resolve(null);
  },
  setItem(_key, value) {
    return Promise.resolve(value);
  },
  removeItem(_key) {
    return Promise.resolve();
  },
});

const createLocalStorage = () => ({
  getItem(key) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return Promise.resolve(window.localStorage.getItem(key));
      }
    } catch {
      // Ignore security errors / private mode
    }
    return Promise.resolve(null);
  },
  setItem(key, value) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore quota errors
    }
    return Promise.resolve(value);
  },
  removeItem(key) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore errors
    }
    return Promise.resolve();
  },
});

const storage = typeof window !== "undefined" ? createLocalStorage() : createNoopStorage();

export default storage;
