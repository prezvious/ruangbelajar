import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
const map = new Map([['ruang.workspace.v3.guest', 'legacy']]);
globalThis.localStorage = {
  get length() {
    return map.size;
  },
  key: (i) => [...map.keys()][i],
  getItem: (k) => map.get(k) ?? null,
  setItem: (k, v) => map.set(k, v),
  removeItem: (k) => map.delete(k),
};
const {
  workspaceStorage: store,
  withWorkspaceLock: lock,
  snapshot,
  snapshots,
  forgetWorkspace,
  afterWorkspaceCommit,
} = await import('../study/repository.mjs');
await assert.rejects(
  lock(() => {
    throw Error('migration interrupted');
  }),
);
assert.equal(map.get('ruang.workspace.v3.guest'), 'legacy');
await lock(() =>
  assert.equal(store.getItem('ruang.workspace.v3.guest'), 'legacy'),
);
assert.equal(map.has('ruang.workspace.v3.guest'), false);
await assert.rejects(
  lock(() => {
    store.setItem('ruang.workspace.v3.guest', 'lost');
    throw Error('abort');
  }),
);
assert.equal(store.getItem('ruang.workspace.v3.guest'), 'legacy');
let acknowledged = false;
const originalPut = IDBObjectStore.prototype.put;
IDBObjectStore.prototype.put = function (value, key) {
  const req = originalPut.call(this, value, key);
  if (key === 'ruang.workspace.v3.guest')
    queueMicrotask(() => this.transaction.abort());
  return req;
};
await assert.rejects(
  lock(() => {
    store.setItem('ruang.workspace.v3.guest', 'uncommitted');
    afterWorkspaceCommit(() => {
      acknowledged = true;
    });
  }),
);
IDBObjectStore.prototype.put = originalPut;
assert.equal(acknowledged, false);
assert.equal(store.getItem('ruang.workspace.v3.guest'), 'legacy');
await Promise.all(
  Array.from({ length: 20 }, () =>
    lock(() => {
      const n = Number(store.getItem('ruang.workspace.v3.counter') || 0);
      store.setItem('ruang.workspace.v3.counter', String(n + 1));
    }),
  ),
);
assert.equal(store.getItem('ruang.workspace.v3.counter'), '20');
Object.defineProperty(globalThis, 'navigator', {
  value: {},
  configurable: true,
});
const other = await import('../study/repository.mjs?second-client');
await Promise.all(
  Array.from({ length: 20 }, (_, i) => {
    const repo =
      i % 2 ? { withWorkspaceLock: lock, workspaceStorage: store } : other;
    return repo.withWorkspaceLock(() =>
      repo.workspaceStorage.setItem(
        'ruang.workspace.v3.counter',
        String(
          Number(repo.workspaceStorage.getItem('ruang.workspace.v3.counter')) +
            1,
        ),
      ),
    );
  }),
);
await lock(() =>
  assert.equal(store.getItem('ruang.workspace.v3.counter'), '40'),
);
for (let i = 0; i < 12; i++)
  await lock(() => snapshot('ruang.workspace.v3.guest', 'version' + i, 'edit'));
assert.equal((await snapshots('ruang.workspace.v3.guest')).length, 10);
assert.equal((await snapshots('ruang.workspace.v3.other')).length, 0);
await assert.rejects(() =>
  forgetWorkspace('ruang.workspace.v3.guest', { expectedRaw: 'stale' }),
);
assert.equal((await snapshots('ruang.workspace.v3.guest')).length, 10);
await forgetWorkspace('ruang.workspace.v3.guest', { expectedRaw: 'legacy' });
assert.equal((await snapshots('ruang.workspace.v3.guest')).length, 0);
await lock(() => assert.equal(store.getItem('ruang.workspace.v3.guest'), null));
console.log(
  'PASS: committed IndexedDB migration, abort rollback, concurrent writes, bounded snapshots and account forgetting.',
);
