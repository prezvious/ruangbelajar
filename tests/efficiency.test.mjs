import assert from 'node:assert/strict';
import { newState } from '../study/core.mjs';
import { documentOf, createSync } from '../study/sync.mjs';
import { pollWorkspace } from '../study/poll.mjs';
const userId = '11111111-1111-4111-8111-111111111111',
  project = 'https://fixture.supabase.co';
let revision = 4,
  reads = 0,
  probes = 0;
const data = { ...newState(), locale: 'id-ID' };
globalThis.fetch = async (path, options) => {
  const body = JSON.parse(options.body);
  if (path === '/api/auth')
    return Response.json({ user: { id: userId }, project });
  if (body.action === 'revision') {
    probes++;
    return Response.json({ revision, context: { userId, project } });
  }
  reads++;
  return Response.json({ data, revision, context: { userId, project } });
};
const cloud = await import('../study/cloud.mjs');
await cloud.refreshAuth();
assert.equal((await cloud.load(4)).notModified, true);
assert.equal(reads, 0);
assert.equal(probes, 1);
revision = 5;
const changed = await cloud.load(4);
assert.ok(changed.data);
assert.equal(reads, 1);
await assert.rejects(
  () => cloud.save({ large: 'a'.repeat(3 * 1024 * 1024) }, 5, changed.context),
  (e) => e.key === 'learn.cloudCapacity',
);
assert.equal(reads, 1);
const map = new Map();
let writes = 0;
const storage = {
  getItem: (k) => map.get(k) || null,
  setItem: (k, v) => {
    writes++;
    map.set(k, v);
  },
};
const context = { userId, project };
let current = 0;
const sync = createSync({
  cloud: {
    getConfig: () => ({ url: project }),
    assertCurrentContext: () => {},
    load: async (known) =>
      known === current
        ? { notModified: true, revision: current, context }
        : {
            data: current ? documentOf(data, 'id-ID') : null,
            revision: current,
            context,
          },
    save: async () => ++current,
  },
  storage,
  lock: async (fn) => fn(),
  onWorkspace: () => {},
  onStatus: () => {},
  delay: () => 0,
  cancel: () => {},
});
await sync.attach({ id: userId }, project);
const count = writes;
await sync.flush();
assert.equal(writes, count);
const raw = [...map.values()][0],
  record = JSON.parse(raw);
assert.equal(record._sync.baseIsDoc, true);
assert.equal(record._sync.base, null);
sync.dispose();
let polls = 0,
  stamp = 100000;
const options = {
  storage,
  locks: { request: async (name, opts, fn) => fn({ name }) },
  now: () => stamp,
};
await pollWorkspace('A', () => polls++, options);
await pollWorkspace('A', () => polls++, options);
assert.equal(polls, 1);
await pollWorkspace('B', () => polls++, options);
assert.equal(polls, 2);
stamp += 60000;
await pollWorkspace('A', () => polls++, options);
assert.equal(polls, 3);
console.log(
  'PASS: revision-only unchanged reads, full pull only after revision changes, canonical cloud preflight, no unchanged cache rewrite, and deduplicated synced base.',
);
