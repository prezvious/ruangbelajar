import assert from 'node:assert/strict';
import {
  newState,
  startTimer,
  pauseTimer,
  finishTimer,
  validateState,
} from '../study/core.mjs';
import {
  documentOf,
  mergeDocuments,
  sameDocument,
  createSync,
  readWorkspace,
  workspaceKey,
} from '../study/sync.mjs';
import { LocalisedError } from '../study/i18n.mjs';

const clone = structuredClone,
  project = 'https://fixture.supabase.co',
  now = Date.now() - 60000;
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
function workspace() {
  const state = newState(now);
  state.subjects = [{ id: 'math', name: 'Math', color: '#9270d7' }];
  state.timer.subjectId = 'math';
  return documentOf(state, 'en-GB');
}
const task = (id, title = id) => ({
  id,
  title,
  date: '2026-10-02',
  subjectId: 'math',
  done: false,
});
function server(doc = workspace()) {
  return {
    rows: new Map([['A', { data: clone(doc), revision: 1 }]]),
    writes: [],
  };
}
function device(backend, { cache = null, user = 'A', sharedMap = null } = {}) {
  const map = sharedMap || new Map(),
    storage = {
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, v),
    },
    statuses = [],
    workspaces = [],
    reads = [];
  let state = null,
    identity = user,
    identityRevision = 0,
    online = true,
    available = true,
    loadError = null,
    loadGate = null,
    saveGate = null;
  let loadStarted = deferred(),
    saveStarted = deferred();
  if (cache) map.set(workspaceKey(project, user), JSON.stringify(cache));
  const cloud = {
    getConfig: () => ({ url: project }),
    assertCurrentContext(context) {
      if (context.userId !== identity || context.epoch !== identityRevision)
        throw new LocalisedError('error.accountChanged');
    },
    async load() {
      reads.push(identity);
      if (loadError) throw loadError;
      const context = { project, userId: identity, epoch: identityRevision },
        snapshot = clone(
          backend.rows.get(identity) || { data: null, revision: 0 },
        );
      loadStarted.resolve();
      if (loadGate) await loadGate;
      cloud.assertCurrentContext(context);
      return { ...snapshot, context };
    },
    async save(data, revision, context) {
      saveStarted.resolve();
      if (saveGate) await saveGate;
      cloud.assertCurrentContext(context);
      const row = backend.rows.get(identity);
      if ((row?.revision || 0) !== revision)
        throw new LocalisedError('error.cloudConflict');
      backend.rows.set(identity, { data: clone(data), revision: revision + 1 });
      backend.writes.push({ user: identity, data: clone(data) });
      return revision + 1;
    },
  };
  const sync = createSync({
    cloud,
    storage,
    lock: async (fn) => fn(),
    available: () => available,
    online: () => online,
    delay: () => 1,
    cancel: () => {},
    onStatus: (value) => statuses.push(value),
    onWorkspace: (value) => {
      workspaces.push(value);
      state = value.record ? clone(value.record.doc) : null;
    },
  });
  return {
    sync,
    map,
    statuses,
    workspaces,
    reads,
    get state() {
      return state;
    },
    edit(fn) {
      const next = clone(state);
      fn(next);
      sync.write(next, next.locale);
      state = next;
    },
    record: () => readWorkspace(storage, sync.key),
    setOnline: (value) => (online = value),
    setAvailable: (value) => (available = value),
    setLoadError: (value) => (loadError = value),
    async attach(id = 'A') {
      if (identity !== id) {
        identity = id;
        identityRevision++;
      }
      return sync.attach(
        id ? { id, email: id + '@example.invalid' } : null,
        project,
      );
    },
    gateLoad(gate) {
      loadGate = gate;
      loadStarted = deferred();
    },
    loadStarted: () => loadStarted.promise,
    gateSave(gate) {
      saveGate = gate;
      saveStarted = deferred();
    },
    saveStarted: () => saveStarted.promise,
  };
}

// First sign-in adopts server data; independent changes and deletions merge by field.
{
  const base = workspace();
  base.tasks = [task('existing')];
  const local = clone(base),
    remote = clone(base);
  local.tasks[0].done = true;
  remote.tasks[0].title = 'Renamed';
  local.tasks.push(task('local'));
  remote.tasks.push(task('remote'));
  const merged = mergeDocuments(base, local, remote);
  assert.equal(merged.tasks.length, 3);
  assert.equal(merged.tasks[0].done, true);
  assert.equal(merged.tasks[0].title, 'Renamed');
  local.tasks = [];
  remote.tasks = [task('existing'), task('new')];
  assert.deepEqual(
    mergeDocuments(base, local, remote).tasks.map((t) => t.id),
    ['new'],
  );
  remote.tasks[0].title = 'Changed while deleted';
  assert.throws(
    () => mergeDocuments(base, local, remote),
    (e) => e.key === 'sync.conflict',
  );
  const a = clone(base),
    b = clone(base);
  a.settings.goal = 60;
  b.locale = 'fr-FR';
  b.settings.theme = 'dark';
  const preferences = mergeDocuments(base, a, b);
  assert.equal(preferences.locale, 'fr-FR');
  assert.equal(preferences.settings.goal, 60);
  assert.equal(preferences.settings.theme, 'dark');
  a.tasks[0].title = 'A';
  b.tasks[0].title = 'B';
  assert.throws(
    () => mergeDocuments(base, a, b),
    (e) => e.key === 'sync.conflict',
  );
  assert.ok(sameDocument(base, { ...base, updatedAt: base.updatedAt + 1000 }));
}
{
  const backend = server(),
    d = device(backend);
  await d.attach();
  assert.deepEqual(d.state, backend.rows.get('A').data);
  assert.equal(backend.writes.length, 0);
  assert.equal(d.statuses.at(-1).phase, 'synced');
  d.edit((s) => {
    s.tasks.push(task('made'));
    s.locale = 'ru-RU';
    s.settings.goal = 30;
  });
  await d.sync.flush();
  assert.equal(backend.rows.get('A').data.tasks[0].id, 'made');
  assert.equal(backend.rows.get('A').data.locale, 'ru-RU');
  assert.equal(d.statuses.at(-1).phase, 'synced');
  const other = device(backend);
  await other.attach();
  assert.deepEqual(other.state, backend.rows.get('A').data);
  await other.sync.flush();
  assert.equal(backend.writes.length, 1, 'unchanged data does not loop saves');
}
// New account gets one server row. A previous guest workspace cannot overwrite an account.
{
  const backend = server(),
    d = device(backend);
  d.map.set(
    'ruang.workspace.v3.guest',
    JSON.stringify({ ...workspace(), tasks: [task('guest')] }),
  );
  await d.attach('B');
  assert.equal(backend.rows.get('B').data.tasks.length, 0);
  assert.equal(backend.rows.get('A').revision, 1);
  assert.equal(backend.writes.length, 1);
}
// Device edits during a delayed save remain pending and are subsequently acknowledged.
{
  const backend = server(),
    d = device(backend);
  await d.attach();
  d.edit((s) => s.tasks.push(task('first')));
  const gate = deferred();
  d.gateSave(gate.promise);
  const saving = d.sync.flush();
  await d.saveStarted();
  d.edit((s) => s.tasks.push(task('second')));
  gate.resolve();
  await saving;
  assert.deepEqual(
    d.record().doc.tasks.map((t) => t.id),
    ['first', 'second'],
  );
  assert.equal(d.statuses.at(-1).phase, 'pending');
  assert.equal(backend.rows.get('A').data.tasks.length, 1);
  d.gateSave(null);
  await d.sync.flush();
  assert.equal(backend.rows.get('A').data.tasks.length, 2);
  assert.equal(d.statuses.at(-1).phase, 'synced');
}
// A stale revision refetches and merges independent changes instead of overwriting them.
{
  const backend = server(),
    a = device(backend),
    b = device(backend);
  await a.attach();
  await b.attach();
  a.edit((s) => s.tasks.push(task('A')));
  b.edit((s) => s.tasks.push(task('B')));
  const gate = deferred();
  a.gateSave(gate.promise);
  const pending = a.sync.flush();
  await a.saveStarted();
  await b.sync.flush();
  gate.resolve();
  await pending;
  assert.equal(a.statuses.at(-1).phase, 'pending');
  a.gateSave(null);
  await a.sync.flush();
  await b.sync.flush();
  assert.deepEqual(
    new Set(a.state.tasks.map((t) => t.id)),
    new Set(['A', 'B']),
  );
  assert.deepEqual(a.state, b.state);
}
// Same-field conflicts preserve local and remote versions until an explicit choice.
for (const choice of ['local', 'remote']) {
  const source = workspace();
  source.tasks = [task('one')];
  const backend = server(source),
    a = device(backend),
    b = device(backend);
  await a.attach();
  await b.attach();
  a.edit((s) => (s.tasks[0].title = 'From A'));
  b.edit((s) => (s.tasks[0].title = 'From B'));
  await b.sync.flush();
  await a.sync.flush();
  assert.equal(a.statuses.at(-1).phase, 'conflict');
  assert.equal(a.record().doc.tasks[0].title, 'From A');
  assert.equal(a.sync.conflict.remote.tasks[0].title, 'From B');
  await a.sync.resolve(choice);
  assert.equal(
    a.record().doc.tasks[0].title,
    choice === 'local' ? 'From A' : 'From B',
  );
  assert.equal(a.sync.conflict, null);
}
// Offline edits survive reload; reconnect merges remote edits and synchronises preferences.
{
  const backend = server(),
    a = device(backend),
    b = device(backend);
  await a.attach();
  await b.attach();
  a.setOnline(false);
  a.edit((s) => {
    s.tasks.push(task('offline'));
    s.locale = 'es-ES';
  });
  await a.sync.flush();
  assert.equal(a.statuses.at(-1).phase, 'offline');
  const cache = JSON.parse(a.map.get(a.sync.key)),
    reloaded = device(backend, { cache });
  reloaded.setOnline(false);
  await reloaded.attach();
  assert.equal(reloaded.state.tasks[0].id, 'offline');
  b.edit((s) => s.tasks.push(task('online')));
  await b.sync.flush();
  reloaded.setOnline(true);
  await reloaded.sync.flush({ force: true });
  assert.equal(backend.rows.get('A').data.tasks.length, 2);
  assert.equal(backend.rows.get('A').data.locale, 'es-ES');
}
// Active timer moves between devices without snapshotting extra intervals.
{
  const backend = server(),
    a = device(backend),
    b = device(backend);
  await a.attach();
  await b.attach();
  a.edit((s) => startTimer(s, now + 1000));
  await a.sync.flush();
  await b.sync.flush();
  assert.equal(b.state.timer.startedAt, now + 1000);
  assert.equal(b.state.sessions.length, 0);
  b.edit((s) => pauseTimer(s, now + 11000));
  await b.sync.flush();
  await a.sync.flush();
  assert.equal(a.state.timer.startedAt, null);
  assert.equal(a.state.timer.elapsedMs, 10000);
  assert.equal(a.state.sessions.length, 1);
  a.edit((s) => finishTimer(s, now + 12000));
  await a.sync.flush();
  await b.sync.flush();
  assert.equal(b.state.timer.elapsedMs, 0);
  assert.equal(b.state.sessions.length, 1);
  validateState(b.state);
}
// Concurrent timer intervals cannot merge into invalid overlapping study time.
{
  const base = workspace(),
    a = clone(base),
    b = clone(base);
  startTimer(a, now + 1000);
  pauseTimer(a, now + 12000);
  startTimer(b, now + 2000);
  pauseTimer(b, now + 13000);
  assert.throws(
    () => mergeDocuments(base, a, b),
    (e) => e.key === 'sync.conflict',
  );
}
// Sign-out/account changes invalidate delayed reads and acknowledgements.
for (const phase of ['read', 'save']) {
  const backend = server(),
    a = device(backend);
  await a.attach();
  a.edit((s) => s.tasks.push(task('pendingA')));
  const gate = deferred();
  phase === 'read' ? a.gateLoad(gate.promise) : a.gateSave(gate.promise);
  const pending = a.sync.flush();
  await (phase === 'read' ? a.loadStarted() : a.saveStarted());
  a.gateLoad(null);
  a.gateSave(null);
  await a.attach('B');
  gate.resolve();
  await pending;
  assert.equal(a.sync.account.id, 'B');
  assert.equal(a.state.tasks.length, 0);
  assert.equal(backend.rows.get('B').data.tasks.length, 0);
  assert.equal(
    JSON.parse(a.map.get(workspaceKey(project, 'A'))).tasks[0].id,
    'pendingA',
  );
  await a.attach(null);
  assert.equal(a.sync.key, 'ruang.workspace.v3.guest');
  await a.attach('A');
  assert.equal(a.state.tasks[0].id, 'pendingA');
}
// Guest import adds completed records without changing account preferences or timer.
{
  const backend = server(),
    d = device(backend);
  await d.attach();
  const guest = workspace();
  guest.tasks = [task('guestTask')];
  guest.settings.goal = 45;
  await d.sync.importGuest(guest, 'fr-FR');
  await d.sync.flush();
  assert.equal(d.record().doc.tasks[0].id, 'guestTask');
  assert.equal(d.record().doc.settings.goal, 240);
  assert.equal(d.record().doc.locale, 'en-GB');
}
console.log(
  'PASS: account isolation, first/new account, three-way fields/deletions, preferences, offline reload/reconnect, edits during save, revision races, conflict choices, timer transfer/overlaps, delayed account switches and guest import.',
);

// A first read failure must not silently discard preference-only edits after reconnect.
{
  const backend = server(),
    d = device(backend);
  d.setLoadError(new LocalisedError('error.cloudNetwork'));
  await d.attach();
  d.edit((s) => {
    s.settings.goal = 45;
    s.locale = 'fr-FR';
  });
  d.setLoadError(null);
  await d.sync.flush({ force: true });
  assert.equal(d.statuses.at(-1).phase, 'conflict');
  assert.equal(d.record().doc.settings.goal, 45);
  assert.equal(d.record().doc.locale, 'fr-FR');
  assert.equal(backend.rows.get('A').data.settings.goal, 240);
}
// Storage failure stops an in-flight pull before it can replace memory-only edits.
{
  const backend = server(),
    d = device(backend);
  await d.attach();
  backend.rows.get('A').data.tasks = [task('remote')];
  const gate = deferred();
  d.gateLoad(gate.promise);
  const pulling = d.sync.flush();
  await d.loadStarted();
  d.setAvailable(false);
  gate.resolve();
  await pulling;
  assert.equal(d.state.tasks.length, 0);
  assert.equal(d.statuses.at(-1).phase, 'error');
  assert.equal(d.statuses.at(-1).error.key, 'error.storageFull');
  d.setAvailable(true);
  d.gateLoad(null);
  await d.sync.flush({ force: true });
  assert.equal(d.state.tasks.length, 1);
}
console.log(
  'PASS: preference-only edits after a failed first read and storage-failure protection during a delayed pull.',
);

// A stale read in one tab cannot roll back a newer revision acknowledged by another tab.
{
  const backend = server(),
    a = device(backend);
  await a.attach();
  const b = device(backend, { sharedMap: a.map });
  await b.attach();
  const gate = deferred();
  a.gateLoad(gate.promise);
  const stale = a.sync.flush();
  await a.loadStarted();
  b.edit((s) => s.tasks.push(task('newerTab')));
  await b.sync.flush();
  const acknowledged = b.record().revision;
  gate.resolve();
  await stale;
  assert.equal(a.record().revision, acknowledged);
  assert.equal(a.record().doc.tasks[0].id, 'newerTab');
  a.gateLoad(null);
  await a.sync.flush();
  assert.equal(a.state.tasks[0].id, 'newerTab');
}
console.log(
  'PASS: delayed cross-tab reads preserve the newest acknowledged cloud revision.',
);

// A failure before the first await must release the task and allow forced retry.
{
  const backend = server(),
    map = new Map(),
    originalGet = map.get.bind(map);
  let denyRead = false;
  map.get = (key) => {
    if (denyRead) throw Error('temporary storage read denial');
    return originalGet(key);
  };
  const d = device(backend, { sharedMap: map });
  await d.attach();
  denyRead = true;
  await d.sync.flush();
  assert.equal(d.statuses.at(-1).phase, 'error');
  denyRead = false;
  backend.rows.get('A').data.tasks = [task('after-read-failure')];
  backend.rows.get('A').revision = 2;
  await d.sync.flush({ force: true });
  assert.equal(d.state.tasks[0].id, 'after-read-failure');
  assert.equal(d.record().revision, 2);
  assert.equal(d.statuses.at(-1).phase, 'synced');
}
// Clean polls do not repeatedly publish the same workspace; real edits still do.
{
  const backend = server(),
    d = device(backend);
  await d.attach();
  const count = d.workspaces.length;
  await d.sync.flush();
  await d.sync.flush({ force: true });
  assert.equal(d.workspaces.length, count);
  backend.rows.get('A').data.tasks = [task('remote-edit')];
  backend.rows.get('A').revision++;
  await d.sync.flush();
  assert.equal(d.workspaces.length, count + 1);
  assert.equal(d.state.tasks[0].id, 'remote-edit');
}
// A queued flush must become inert if the account changes before its body starts.
{
  const backend = server(),
    d = device(backend);
  await d.attach();
  const count = d.reads.length;
  const queued = d.sync.flush(),
    switched = d.attach('B');
  await Promise.all([queued, switched]);
  assert.deepEqual(d.reads.slice(count), ['B']);
  assert.equal(d.sync.account.id, 'B');
  assert.equal(d.statuses.at(-1).phase, 'synced');
}
// Authoritative reconciliation and another tab's resolution clear stale conflicts.
{
  const base = workspace();
  base.tasks = [task('one')];
  const backend = server(base),
    a = device(backend),
    b = device(backend);
  await a.attach();
  await b.attach();
  a.edit((s) => (s.tasks[0].title = 'From A'));
  b.edit((s) => (s.tasks[0].title = 'From B'));
  await b.sync.flush();
  await a.sync.flush();
  assert.ok(a.sync.conflict);
  b.edit((s) => (s.tasks[0].title = 'From A'));
  await b.sync.flush();
  await a.sync.flush({ force: true });
  assert.equal(a.sync.conflict, null);
  await a.sync.flush();
  assert.equal(a.statuses.at(-1).phase, 'synced');
}
{
  const base = workspace();
  base.tasks = [task('one')];
  const backend = server(base),
    a = device(backend);
  await a.attach();
  a.edit((s) => (s.tasks[0].title = 'Local'));
  backend.rows.get('A').data.tasks[0].title = 'Remote';
  backend.rows.get('A').revision++;
  await a.sync.flush();
  assert.ok(a.sync.conflict);
  const b = device(backend, { sharedMap: a.map });
  await b.attach();
  assert.ok(b.sync.conflict);
  await b.sync.resolve('remote');
  await a.sync.flush();
  assert.equal(a.sync.conflict, null);
  assert.equal(a.state.tasks[0].title, 'Remote');
  assert.equal(a.statuses.at(-1).phase, 'synced');
}
// Repairing metadata preserves records and requires a choice if cloud data differs.
{
  const backend = server(),
    d = device(backend);
  await d.attach();
  const local = workspace();
  local.tasks = [task('preserved')];
  const corrupt = JSON.stringify({
    ...local,
    _sync: { revision: -1, base: null },
  });
  d.map.set(d.sync.key, corrupt);
  d.sync.resetCache(local, local.locale, corrupt, { preserveLocal: true });
  await d.sync.flush({ force: true });
  assert.equal(d.record().doc.tasks[0].id, 'preserved');
  assert.ok(d.sync.conflict);
  assert.equal(backend.rows.get('A').data.tasks.length, 0);
  await d.sync.resolve('local');
  assert.equal(backend.rows.get('A').data.tasks[0].id, 'preserved');
}
console.log(
  'PASS: retry after synchronous read failure, unchanged-poll suppression, resolved/other-tab conflicts and record-preserving cache repair.',
);
