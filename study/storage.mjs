import { LocalisedError } from './i18n.mjs';
// Every study-state read/change/write uses the same origin-wide lock.
// The IndexedDB transaction is a mutex fallback, not a second data store.
export function withStudyLock(operation) {
  if (globalThis.navigator?.locks)
    return navigator.locks.request('ruang.workspace.write', operation);
  return indexedDbLock(operation);
}
function indexedDbLock(operation) {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new LocalisedError('error.lockUnsupported'));
      return;
    }
    const request = indexedDB.open('ruang-workspace-lock', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('mutex');
    request.onerror = () => reject(new LocalisedError('error.lockUnavailable'));
    request.onsuccess = () => {
      const db = request.result;
      let result, failure;
      db.onversionchange = () => db.close();
      let transaction;
      try {
        transaction = db.transaction('mutex', 'readwrite');
      } catch (err) {
        db.close();
        reject(err);
        return;
      }
      transaction.oncomplete = () => {
        db.close();
        resolve(result);
      };
      transaction.onabort = transaction.onerror = () => {
        db.close();
        reject(failure || new LocalisedError('error.lockFailed'));
      };
      const store = transaction.objectStore('mutex');
      store.get('study').onsuccess = () => {
        try {
          result = operation();
          if (result?.then) throw new LocalisedError('error.lockSync');
        } catch (err) {
          failure = err;
          transaction.abort();
        }
      };
    };
  });
}
