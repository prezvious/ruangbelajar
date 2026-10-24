import { assertCloudCapacity } from './learning-model.mjs';
import { newState, validateState } from './core.mjs';
import { LANGUAGES, LocalisedError } from './i18n.mjs';
import { mergeWorkspaces, importFingerprint } from './guest-import.mjs';

export const GUEST_KEY = 'ruang.workspace.v3.guest';
export const workspaceKey = (project, userId) =>
  'ruang.workspace.v3.' + new URL(project).hostname + '.' + userId;
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const copy = (value) => structuredClone(value);
export function documentOf(state, locale) {
  return {
    ...validateState(state),
    locale: LANGUAGES.some((x) => x.code === locale) ? locale : 'id-ID',
  };
}
export function sameDocument(a, b) {
  if (!a || !b) return a === b;
  const { updatedAt: aa, ...av } = a,
    { updatedAt: bb, ...bv } = b;
  return equal(av, bv);
}

// Three-way merge: deletion is a change; concurrent edits to one field need a choice.
export function mergeDocuments(base, local, remote) {
  if (sameDocument(local, base)) return copy(remote);
  if (sameDocument(remote, base) || sameDocument(local, remote))
    return copy(local);
  if (!base) throw new LocalisedError('sync.conflict');
  const field = (b, l, r) => {
    if (equal(l, b)) return copy(r);
    if (equal(r, b) || equal(l, r)) return copy(l);
    throw new LocalisedError('sync.conflict');
  };
  const records = (name) => {
    const bm = new Map(base[name].map((x) => [x.id, x])),
      lm = new Map(local[name].map((x) => [x.id, x])),
      rm = new Map(remote[name].map((x) => [x.id, x]));
    const result = [];
    for (const id of new Set([...rm.keys(), ...lm.keys()])) {
      const b = bm.get(id),
        l = lm.get(id),
        r = rm.get(id);
      let value;
      if (!b || !l || !r) value = field(b, l, r);
      else {
        value = {};
        for (const key of new Set([
          ...Object.keys(b),
          ...Object.keys(l),
          ...Object.keys(r),
        ]))
          value[key] = field(b[key], l[key], r[key]);
      }
      if (value) result.push(value);
    }
    return result;
  };
  const settings = {};
  for (const key of Object.keys(remote.settings))
    settings[key] = field(
      base.settings[key],
      local.settings[key],
      remote.settings[key],
    );
  const nested = (b, l, r, path = '') => {
    if (equal(l, b)) return copy(r);
    if (equal(r, b) || equal(l, r)) return copy(l);
    if (path === 'completed' || path === 'imports')
      return [...new Set([...b, ...l, ...r])].filter((id) =>
        field(b.includes(id), l.includes(id), r.includes(id)),
      );
    if (
      path.startsWith('progress.') &&
      Array.isArray(b) &&
      Array.isArray(l) &&
      Array.isArray(r)
    )
      return b.map((x, i) => field(x, l[i], r[i]));
    if (['tryouts', 'notes', 'resources', 'timeEdits'].includes(path)) {
      const result = [];
      for (const id of new Set([...l, ...r].map((x) => x.id))) {
        const value = nested(
          b.find((x) => x.id === id),
          l.find((x) => x.id === id),
          r.find((x) => x.id === id),
          'tryout',
        );
        if (value) result.push(value);
      }
      return path === 'timeEdits'
        ? result.sort((a, b) => a.at - b.at).slice(-500)
        : result;
    }
    if (
      b &&
      l &&
      r &&
      typeof b === 'object' &&
      typeof l === 'object' &&
      typeof r === 'object' &&
      !Array.isArray(b) &&
      !Array.isArray(l) &&
      !Array.isArray(r)
    )
      return Object.fromEntries(
        [...new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)])]
          .map((key) => [
            key,
            nested(b[key], l[key], r[key], path ? path + '.' + key : key),
          ])
          .filter(([, value]) => value !== undefined),
      );
    return field(b, l, r);
  };
  const value = {
    version: 3,
    academic: nested(base.academic, local.academic, remote.academic),
    learning: nested(base.learning, local.learning, remote.learning),
    subjects: records('subjects'),
    tasks: records('tasks'),
    sessions: records('sessions'),
    settings,
    timer: field(base.timer, local.timer, remote.timer),
    locale: field(base.locale, local.locale, remote.locale),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  };
  try {
    return documentOf(value, value.locale);
  } catch {
    throw new LocalisedError('sync.conflict');
  }
}

// Metadata and the local workspace share one storage write, protected by the app's lock.
export function readWorkspace(storage, key) {
  return parseWorkspace(storage.getItem(key));
}
export function parseWorkspace(raw) {
  if (!raw) return null;
  const value = JSON.parse(raw),
    doc = documentOf(value, value.locale);
  const meta = value._sync;
  if (meta && (!Number.isSafeInteger(meta.revision) || meta.revision < 0))
    throw new LocalisedError('error.backupFormat');
  return {
    doc,
    base: meta?.baseIsDoc
      ? copy(doc)
      : meta?.base
        ? documentOf(meta.base, meta.base.locale)
        : null,
    revision: meta?.revision || 0,
    seed: meta?.seed ? documentOf(meta.seed, meta.seed.locale) : null,
  };
}
function storeWorkspace(storage, key, record) {
  storage.setItem(
    key,
    JSON.stringify({
      ...record.doc,
      _sync: {
        base: sameDocument(record.doc, record.base) ? null : record.base,
        baseIsDoc: sameDocument(record.doc, record.base),
        revision: record.revision,
        seed: record.seed || null,
      },
    }),
  );
}

export function createSync({
  cloud,
  storage,
  lock,
  onWorkspace,
  onStatus,
  initialLocale = () => 'id-ID',
  available = () => true,
  online = () => true,
  delay = (fn) => setTimeout(fn, 700),
  cancel = (id) => clearTimeout(id),
}) {
  let account = null,
    key = GUEST_KEY,
    generation = 0,
    loading = false,
    task = null,
    timer = null,
    retryAt = 0,
    failures = 0,
    conflict = null,
    publishedDoc = null;
  const status = (phase, error = null) =>
    onStatus({ phase, error, account, key, loading, conflict });
  const read = () => readWorkspace(storage, key);
  const valid = (epoch, scope) => epoch === generation && scope === key;
  function publishWorkspace(record) {
    publishedDoc = record ? copy(record.doc) : null;
    const scope = key,
      epoch = generation,
      identity = account;
    const publish = () => {
      if (valid(epoch, scope))
        onWorkspace({ key: scope, account: identity, record });
    };
    if (storage.afterCommit) storage.afterCommit(publish);
    else publish();
  }
  function schedule() {
    cancel(timer);
    timer = delay(() => {
      timer = null;
      flush().catch(() => {});
    });
  }
  function write(state, locale) {
    if (!account) return false;
    if (loading) throw new LocalisedError('sync.loading');
    const record = read();
    if (!record) throw new LocalisedError('sync.loading');
    const doc = documentOf(state, locale);
    storeWorkspace(storage, key, { ...record, doc });
    publishedDoc = copy(doc);
    status(conflict ? 'conflict' : online() ? 'pending' : 'offline');
    schedule();
    return true;
  }
  async function attach(user, project) {
    const nextKey = user ? workspaceKey(project, user.id) : GUEST_KEY;
    if (nextKey === key && account?.id === user?.id) {
      account = user;
      if (user) schedule();
      return;
    }
    generation++;
    cancel(timer);
    timer = null;
    task = null;
    conflict = null;
    retryAt = 0;
    failures = 0;
    publishedDoc = null;
    account = user;
    key = nextKey;
    loading = !!user;
    status(user ? 'loading' : 'guest');
    if (!user) {
      const epoch = generation,
        scope = key;
      await lock(() => {
        if (valid(epoch, scope)) publishWorkspace(null);
      });
      return;
    }
    const epoch = generation,
      scope = key;
    try {
      await lock(() => {
        if (!valid(epoch, scope)) return;
        let record = read();
        if (!record) {
          const doc = documentOf(newState(), initialLocale());
          record = { doc, base: null, revision: 0, seed: doc };
          storeWorkspace(storage, key, record);
        }
        publishWorkspace(record);
      });
      if (valid(epoch, scope)) await flush();
    } catch (error) {
      if (valid(epoch, scope)) {
        loading = false;
        publishWorkspace(null);
        status('error', error);
      }
    }
  }
  async function flush({ force = false } = {}) {
    if (!account) return;
    if (task) return task;
    if (!available()) {
      status('error', new LocalisedError('error.storageFull'));
      return;
    }
    if (!online()) {
      loading = false;
      status(conflict ? 'conflict' : 'offline');
      return;
    }
    if (!force && Date.now() < retryAt) return;
    const epoch = generation,
      scope = key;
    task = Promise.resolve().then(async () => {
      try {
        if (!valid(epoch, scope)) return;
        const cached = read();
        if (conflict && !force) {
          if (
            cached &&
            (cached.revision > conflict.revision ||
              (cached.revision === conflict.revision &&
                sameDocument(cached.base, conflict.remote)))
          )
            conflict = null;
          else {
            status('conflict');
            return;
          }
        }
        if (
          loading ||
          force ||
          !cached ||
          !sameDocument(cached.doc, cached.base)
        )
          status('syncing');
        // Reconcile against an authoritative read before every save, including first login.
        const remote = await cloud.load(
          cached?.base ? cached.revision : undefined,
        );
        if (!valid(epoch, scope)) return;
        if (
          remote.context.project !==
            new URL(cloud.getConfig().url).href.replace(/\/$/, '') ||
          remote.context.userId !== account.id
        )
          throw new LocalisedError('error.accountChanged');
        if (
          remote.notModified &&
          cached &&
          sameDocument(cached.doc, cached.base)
        ) {
          cloud.assertCurrentContext(remote.context);
          failures = 0;
          retryAt = 0;
          loading = false;
          status('synced');
          return;
        }
        const remoteDoc = remote.notModified
          ? cached?.base
          : remote.data
            ? documentOf(remote.data, remote.data.locale)
            : null;
        let snapshot,
          revision = remote.revision;
        await lock(() => {
          if (!valid(epoch, scope)) return;
          cloud.assertCurrentContext(remote.context);
          const record = read();
          if (!record) throw new LocalisedError('error.backupFormat');
          if (remoteDoc && remote.revision < record.revision) {
            status('pending');
            schedule();
            return;
          }
          let merged;
          // A brand-new empty cache adopts the account, even if its random timer ID differs.
          const untouched =
            !record.base &&
            record.revision === 0 &&
            record.seed &&
            sameDocument(record.doc, record.seed);
          if (remoteDoc) {
            try {
              merged = untouched
                ? remoteDoc
                : mergeDocuments(record.base, record.doc, remoteDoc);
            } catch (error) {
              loading = false;
              conflict = { remote: remoteDoc, revision: remote.revision };
              status('conflict', error);
              return;
            }
          } else if (record.base) {
            loading = false;
            conflict = {
              remote: documentOf(newState(), record.doc.locale),
              revision: 0,
            };
            status('conflict');
            return;
          } else merged = record.doc;
          if (!available()) throw new LocalisedError('error.storageFull');
          const next = {
            doc: merged,
            base: remoteDoc,
            revision,
            seed: remoteDoc ? null : record.seed,
          };
          storeWorkspace(storage, key, next);
          snapshot = copy(merged);
          conflict = null;
          if (!sameDocument(publishedDoc, merged)) publishWorkspace(next);
        });
        if (!snapshot || !valid(epoch, scope)) return;
        loading = false;
        if (!remoteDoc || !sameDocument(snapshot, remoteDoc)) {
          const nextRevision = await cloud.save(
            snapshot,
            revision,
            remote.context,
          );
          if (!valid(epoch, scope)) return;
          await lock(() => {
            if (!valid(epoch, scope)) return;
            cloud.assertCurrentContext(remote.context);
            const latest = read();
            if (!latest) return;
            // Another tab can acknowledge a later revision while this request completes.
            if (latest.revision > nextRevision) return;
            const next = { ...latest, base: snapshot, revision: nextRevision };
            storeWorkspace(storage, key, next);
          });
        }
        if (!valid(epoch, scope)) return;
        if (!available()) {
          status('error', new LocalisedError('error.storageFull'));
          return;
        }
        failures = 0;
        retryAt = 0;
        const latest = read(),
          dirty = !sameDocument(latest.doc, latest.base);
        status(dirty ? 'pending' : 'synced');
        if (dirty) schedule();
      } catch (error) {
        if (!valid(epoch, scope)) return;
        if (error.key === 'error.cloudConflict') {
          status('pending');
          schedule();
        } else {
          loading = false;
          failures++;
          retryAt =
            Date.now() + Math.min(60000, 1000 * 2 ** Math.min(failures, 6));
          status(online() ? 'error' : 'offline', error);
        }
      } finally {
        if (valid(epoch, scope)) {
          loading = false;
          task = null;
        }
      }
    });
    return task;
  }
  async function resolve(choice) {
    if (!conflict) return;
    const epoch = generation,
      scope = key;
    await lock(() => {
      if (!valid(epoch, scope)) return;
      const record = read();
      if (!record) return;
      const next = {
        doc: choice === 'remote' ? conflict.remote : record.doc,
        base: conflict.remote,
        revision: conflict.revision,
      };
      storeWorkspace(storage, key, next);
      conflict = null;
      publishWorkspace(next);
      status('pending');
    });
    return flush({ force: true });
  }
  async function importGuest(guest, locale) {
    if (!account || loading || conflict)
      throw new LocalisedError('sync.loading');
    const epoch = generation,
      scope = key,
      fingerprint = await importFingerprint(guest);
    await lock(() => {
      if (!valid(epoch, scope))
        throw new LocalisedError('error.accountChanged');
      const record = read();
      const doc = documentOf(
          mergeWorkspaces(record.doc, guest, fingerprint, {
            allowActive: true,
          }),
          record.doc.locale,
        ),
        next = { ...record, doc };
      assertCloudCapacity(doc);
      storeWorkspace(storage, key, next);
      publishWorkspace(next);
      status('pending');
      schedule();
    });
  }
  function resetCache(
    state,
    locale,
    expectedRaw,
    { preserveLocal = false } = {},
  ) {
    if (storage.getItem(key) !== expectedRaw)
      throw new LocalisedError('error.tabConflict');
    const doc = documentOf(state, locale);
    storeWorkspace(storage, key, {
      doc,
      base: null,
      revision: 0,
      seed: preserveLocal ? null : doc,
    });
    publishedDoc = copy(doc);
    loading = false;
    conflict = null;
  }
  return {
    attach,
    write,
    flush,
    resolve,
    importGuest,
    resetCache,
    get key() {
      return key;
    },
    get account() {
      return account;
    },
    get loading() {
      return loading;
    },
    get conflict() {
      return conflict;
    },
    dispose() {
      generation++;
      cancel(timer);
      account = null;
    },
  };
}
