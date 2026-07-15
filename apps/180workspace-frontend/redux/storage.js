import createWebStorage from "redux-persist/lib/storage/createWebStorage";

/**
 * SSR-safe storage for redux-persist.
 *
 * On the server (SSR), `localStorage` doesn't exist, so we return a noop
 * storage engine. On the client, we delegate to the real `localStorage`
 * via redux-persist's `createWebStorage`.
 *
 * This avoids the CJS/ESM interop crash that occurs when importing
 * `redux-persist/lib/storage` directly in Next.js 15's webpack.
 */
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

const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : createNoopStorage();

export default storage;
