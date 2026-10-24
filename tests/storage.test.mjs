import {
  LocalisedError,
  message,
  messageText,
  setLocale,
} from '../study/i18n.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs
  .readFileSync(new URL('../study/storage.mjs', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replaceAll('export ', '');
const context = (options) => {
  const c = vm.createContext({ LocalisedError, message, ...options });
  vm.runInContext(source + '\nglobalThis.lock=withStudyLock;', c);
  return c;
};
let changed = false;
const unsupported = context({});
await assert.rejects(
  unsupported.lock(() => (changed = true)),
  /Browser tidak mendukung/,
);
assert.equal(changed, false);
const denied = context({
  navigator: { locks: { request: () => Promise.reject(Error('Lock denied')) } },
});
await assert.rejects(
  denied.lock(() => (changed = true)),
  /Lock denied/,
);
assert.equal(changed, false);
// Event-driven transaction double models readwrite exclusion; callbacks must execute inside it.
let tail = Promise.resolve(),
  reads = 0,
  closed = 0;
const indexedDB = {
  open() {
    const r = {};
    queueMicrotask(() => {
      r.result = {
        close() {
          closed++;
        },
        transaction(name, mode) {
          assert.equal(name, 'mutex');
          assert.equal(mode, 'readwrite');
          const tx = {};
          let release;
          const done = new Promise((resolve) => (release = resolve)),
            previous = tail;
          tail = done;
          tx.objectStore = () => ({
            get() {
              const request = {};
              previous.then(() =>
                queueMicrotask(() => {
                  reads++;
                  request.onsuccess();
                  if (!tx.aborted)
                    queueMicrotask(() => {
                      tx.oncomplete();
                      release();
                    });
                }),
              );
              return request;
            },
          });
          tx.abort = () => {
            tx.aborted = true;
            queueMicrotask(() => {
              tx.onabort();
              release();
            });
          };
          return tx;
        },
      };
      r.onsuccess();
    });
    return r;
  },
};
const fallback = context({ indexedDB });
let counter = 0;
const results = await Promise.all(
  Array.from({ length: 12 }, () => fallback.lock(() => ++counter)),
);
assert.deepEqual(
  results,
  Array.from({ length: 12 }, (_, i) => i + 1),
);
assert.equal(counter, 12);
await assert.rejects(
  fallback.lock(() => {
    throw Error('Invalid edit');
  }),
  /Invalid edit/,
);
assert.equal(await fallback.lock(() => ++counter), 13);
assert.equal(reads, 14);
assert.equal(closed, 14);
console.log(
  'PASS: lock API failure leaves data intact; IndexedDB fallback serializes transactions, releases after rejected edits, and closes connections (transaction double).',
);
