import { LocalisedError } from './i18n.mjs';

const prefix = 'ruang.workspace.v3.';
let cache = new Map(),
  transaction = null,
  dbPromise = null,
  scopeProvider = null;
export function setRepositoryScope(provider) {
  scopeProvider = provider;
}
const channel =
  globalThis.BroadcastChannel && globalThis.window
    ? new BroadcastChannel('ruang.workspace.changed.v1')
    : null;
const pending = new Set();
let workingCache = null,
  commitCallbacks = [];
export function afterWorkspaceCommit(operation) {
  if (transaction) commitCallbacks.push(operation);
  else operation();
}
function database() {
  if (!dbPromise)
    dbPromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(new LocalisedError('error.storageUnavailable'));
        return;
      }
      const req = indexedDB.open('ruang-workspaces', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('workspaces');
        req.result
          .createObjectStore('history', { keyPath: 'id' })
          .createIndex('workspace', 'key');
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () =>
        reject(new LocalisedError('error.storageUnavailable'));
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  return dbPromise;
}
// Synchronous facade is valid only inside the IndexedDB mutation transaction.
// Reads outside a transaction are a view; every mutation reloads the durable record.
export const workspaceStorage = {
  getItem(key) {
    return key.startsWith(prefix)
      ? ((transaction ? workingCache : cache).get(key) ?? null)
      : globalThis.localStorage.getItem(key);
  },
  setItem(key, value) {
    if (!key.startsWith(prefix)) {
      globalThis.localStorage.setItem(key, value);
      return;
    }
    if (!transaction) throw new LocalisedError('error.lockFailed');
    transaction.objectStore('workspaces').put(String(value), key);
    workingCache.set(key, String(value));
    pending.add(key);
  },
  removeItem(key) {
    if (!key.startsWith(prefix)) {
      globalThis.localStorage.removeItem(key);
      return;
    }
    if (!transaction) throw new LocalisedError('error.lockFailed');
    transaction.objectStore('workspaces').delete(key);
    workingCache.delete(key);
    pending.add(key);
  },
  afterCommit: afterWorkspaceCommit,
};
async function transact(operation, requestedKeys) {
  const db = await database();
  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction(['workspaces', 'history'], 'readwrite', {
        durability: 'strict',
      });
    } catch {
      tx = db.transaction(['workspaces', 'history'], 'readwrite');
    }
    const store = tx.objectStore('workspaces');
    let keys,
      rows,
      result,
      failure,
      oldCache,
      localRemovals = [];
    const run = () => {
      if (!keys || !rows) return;
      oldCache = cache;
      workingCache = new Map(cache);
      for (let i = 0; i < keys.length; i++) {
        if (rows[i] === undefined) workingCache.delete(keys[i]);
        else workingCache.set(keys[i], rows[i]);
      }
      transaction = tx;
      pending.clear();
      commitCallbacks = [];
      try {
        // Import each legacy key once. A marker prevents a forgotten account from reappearing.
        if (!workingCache.has('_legacy-imported')) {
          const local = globalThis.localStorage;
          if (local)
            for (let i = 0; i < local.length; i++) {
              const key = local.key(i);
              if (key?.startsWith(prefix) && !workingCache.has(key)) {
                const value = local.getItem(key);
                workspaceStorage.setItem(key, value);
                localRemovals.push(key);
              }
            }
          store.put('1', '_legacy-imported');
          workingCache.set('_legacy-imported', '1');
        }
        result = operation();
        if (result?.then) throw new LocalisedError('error.lockSync');
      } catch (err) {
        failure = err;
        tx.abort();
      } finally {
        transaction = null;
      }
    };
    if (requestedKeys || scopeProvider) {
      keys = [
        ...new Set([...(requestedKeys || scopeProvider()), '_legacy-imported']),
      ];
      rows = new Array(keys.length);
      let remaining = keys.length;
      keys.forEach((key, i) => {
        const req = store.get(key);
        req.onsuccess = () => {
          rows[i] = req.result;
          if (--remaining === 0) run();
        };
      });
    } else {
      const read = store.getAllKeys(),
        values = store.getAll();
      read.onsuccess = () => {
        keys = read.result;
        run();
      };
      values.onsuccess = () => {
        rows = values.result;
        run();
      };
    }
    tx.oncomplete = () => {
      cache = workingCache;
      workingCache = null;
      for (const key of localRemovals)
        try {
          globalThis.localStorage.removeItem(key);
        } catch {}
      const changed = [...pending];
      pending.clear();
      if (changed.length) channel?.postMessage(changed);
      const callbacks = commitCallbacks;
      commitCallbacks = [];
      try {
        for (const callback of callbacks) callback();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    tx.onabort = () => {
      if (oldCache) cache = oldCache;
      transaction = null;
      workingCache = null;
      commitCallbacks = [];
      pending.clear();
      const error =
        failure || tx.error || new LocalisedError('error.storageFull');
      if (!failure && globalThis.window)
        window.dispatchEvent(
          new CustomEvent('workspace-storage-failure', { detail: error }),
        );
      reject(error);
    };
    tx.onerror = () => {}; // onabort is the definitive outcome; never acknowledge a request alone.
  });
}
let localTail = Promise.resolve();
export function withWorkspaceLock(operation, requestedKeys) {
  const run = () =>
    globalThis.navigator?.locks
      ? navigator.locks.request('ruang.workspace.write', () =>
          transact(operation, requestedKeys),
        )
      : transact(operation, requestedKeys);
  const result = localTail.then(run, run);
  localTail = result.catch(() => {});
  return result;
}
channel?.addEventListener('message', async (event) => {
  try {
    await withWorkspaceLock(() => {});
    for (const key of event.data)
      window.dispatchEvent(new StorageEvent('storage', { key }));
  } catch {}
});
export function snapshot(key, raw, reason = 'change') {
  if (!transaction || !raw) return;
  const store = transaction.objectStore('history'),
    id = crypto.randomUUID();
  store.put({ id, key, at: Date.now(), reason, raw });
  const req = store.index('workspace').getAll(key);
  req.onsuccess = () => {
    const rows = req.result
      .filter((x) => x.key === key)
      .sort((a, b) => b.at - a.at);
    for (const old of rows.slice(10)) store.delete(old.id);
  };
}
export async function snapshots(key) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction('history', 'readonly')
      .objectStore('history')
      .index('workspace')
      .getAll(key);
    req.onsuccess = () =>
      resolve(
        req.result.filter((x) => x.key === key).sort((a, b) => b.at - a.at),
      );
    req.onerror = () => reject(req.error);
  });
}
export async function forgetWorkspace(key, options = {}) {
  return withWorkspaceLock(() => {
    if (
      Object.hasOwn(options, 'expectedRaw') &&
      workspaceStorage.getItem(key) !== options.expectedRaw
    )
      throw new LocalisedError('error.tabConflict');
    workspaceStorage.removeItem(key);
    const store = transaction.objectStore('history'),
      req = store.index('workspace').getAll(key);
    req.onsuccess = () => {
      for (const row of req.result) if (row.key === key) store.delete(row.id);
    };
  }, [key]);
}
export async function storageEstimate() {
  const estimate = await globalThis.navigator?.storage?.estimate?.();
  return {
    usage: estimate?.usage ?? null,
    quota: estimate?.quota ?? null,
    persistent: (await globalThis.navigator?.storage?.persisted?.()) ?? false,
  };
}
