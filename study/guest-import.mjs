import { newLearning } from './learning-model.mjs';
import { validateState, backupState, hasActiveSession } from './core.mjs';
import { LocalisedError } from './i18n.mjs';
export async function importFingerprint(state) {
  const canonical = (value) =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((k) => [k, canonical(value[k])]),
          )
        : value;
  const data = { ...state };
  delete data.updatedAt;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(canonical(data))),
  );
  return Array.from(new Uint8Array(digest), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
}
export function mergeWorkspaces(
  target,
  source,
  fingerprint,
  { allowActive = false, now = Date.now() } = {},
) {
  const next = validateState(target),
    incoming = backupState(validateState(source), now);
  if (hasActiveSession(next) && !allowActive)
    throw new LocalisedError('error.finishImport');
  if (next.academic.imports.includes(fingerprint)) return next;
  const prefix = 'import_' + fingerprint.slice(0, 16) + '_',
    equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const uniqueId = (id, occupied, reserved = new Set()) => {
    const stem = prefix + id.slice(0, 65);
    let candidate = stem,
      index = 1;
    while (occupied.has(candidate) || reserved.has(candidate)) {
      const suffix = '_' + ++index;
      candidate = stem.slice(0, 100 - suffix.length) + suffix;
    }
    return candidate;
  };
  const subjects = new Map(next.subjects.map((x) => [x.id, x])),
    reservedSubjects = new Set(incoming.subjects.map((x) => x.id));
  const remap = new Map();
  for (const item of incoming.subjects) {
    let id = item.id;
    const existing = subjects.get(id);
    if (existing && !equal(existing, item))
      id = uniqueId(id, subjects, reservedSubjects);
    remap.set(item.id, id);
    if (!subjects.has(id)) {
      const record = { ...item, id };
      subjects.set(id, record);
      next.subjects.push(record);
    }
  }
  const groupRuns = (records) => {
    const groups = new Map();
    const mapping = new Map();
    for (const record of records) {
      if (!groups.has(record.runId)) groups.set(record.runId, new Map());
      groups.get(record.runId).set(record.id, record);
    }
    return groups;
  };
  const previousRuns = groupRuns(next.sessions),
    incomingRuns = groupRuns(
      incoming.sessions.map((x) => ({
        ...x,
        subjectId: remap.get(x.subjectId),
      })),
    ),
    occupiedRuns = new Set([
      ...previousRuns.keys(),
      ...incomingRuns.keys(),
      next.timer.runId,
    ]),
    runs = new Map();
  for (const [runId, after] of incomingRuns) {
    const before = previousRuns.get(runId);
    let id = runId;
    if (
      runId === next.timer.runId ||
      (before &&
        (before.size !== after.size ||
          [...after].some(([id, item]) => !equal(before.get(id), item))))
    )
      id = uniqueId(runId, occupiedRuns);
    runs.set(runId, id);
    occupiedRuns.add(id);
  }
  const append = (field, records) => {
    const map = new Map(next[field].map((x) => [x.id, x])),
      reserved = new Set(records.map((x) => x.id));
    const mapping = new Map();
    for (const record of records) {
      const existing = map.get(record.id);
      if (existing && equal(existing, record)) {
        mapping.set(record.id, record.id);
        continue;
      }
      const item = {
        ...record,
        id: existing ? uniqueId(record.id, map, reserved) : record.id,
      };
      map.set(item.id, item);
      next[field].push(item);
      mapping.set(record.id, item.id);
    }
    return mapping;
  };
  const importedTasks = append(
    'tasks',
    incoming.tasks.map((record) => ({
      ...record,
      subjectId: record.subjectId ? remap.get(record.subjectId) : '',
    })),
  );
  append(
    'sessions',
    incoming.sessions.map((record) => ({
      ...record,
      subjectId: remap.get(record.subjectId),
      runId: runs.get(record.runId),
    })),
  );
  const learningDefaults = newLearning();
  for (const field of ['planner', 'reminders', 'calendarId'])
    if (equal(next.learning[field], learningDefaults[field]))
      next.learning[field] = structuredClone(incoming.learning[field]);
  for (const field of ['notes', 'resources', 'timeEdits']) {
    const items = next.learning[field],
      occupied = new Map(items.map((x) => [x.id, x]));
    for (const record of incoming.learning[field]) {
      const previous = occupied.get(record.id);
      if (previous && equal(previous, record)) continue;
      const item = {
        ...record,
        id: previous
          ? uniqueId(
              record.id,
              occupied,
              new Set(incoming.learning[field].map((x) => x.id)),
            )
          : record.id,
      };
      items.push(item);
      occupied.set(item.id, item);
    }
  }
  next.learning.timeEdits = next.learning.timeEdits.slice(-500);
  for (const [key, value] of Object.entries(incoming.learning.occurrences)) {
    const at = key.lastIndexOf('@'),
      id = importedTasks.get(key.slice(0, at));
    if (id) next.learning.occurrences[id + key.slice(at)] = value;
  }
  const a = next.academic,
    b = incoming.academic;
  a.completed = [...new Set([...a.completed, ...b.completed])];
  for (const id of Object.keys(a.progress))
    a.progress[id] = a.progress[id].map(
      (value, i) => value || b.progress[id][i],
    );
  for (const key of Object.keys(a.profile))
    if (!a.profile[key]) a.profile[key] = b.profile[key] || a.profile[key];
  if (!a.startDate) a.startDate = b.startDate;
  for (const [id, date] of Object.entries(b.dates))
    if (!a.dates[id]) a.dates[id] = date;
  for (const [code, id] of Object.entries(b.subjectLinks))
    if (!a.subjectLinks[code]) a.subjectLinks[code] = remap.get(id) || id;
  const tryouts = new Map(a.tryouts.map((x) => [x.id, x])),
    reservedTryouts = new Set(b.tryouts.map((x) => x.id));
  for (const item of b.tryouts) {
    const existing = tryouts.get(item.id);
    if (existing && equal(existing, item)) continue;
    const record = {
      ...item,
      id: existing ? uniqueId(item.id, tryouts, reservedTryouts) : item.id,
    };
    tryouts.set(record.id, record);
    a.tryouts.push(record);
  }
  a.imports = [...new Set([...a.imports, ...b.imports, fingerprint])];
  next.updatedAt = now;
  // Full validation rejects overlapping time records and protects the current workspace.
  return validateState(next);
}
