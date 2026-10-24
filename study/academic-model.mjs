import { curriculum, trackerData } from './catalog.mjs';
import { validCivilDate, LocalisedError } from './i18n.mjs';

export const agendaItems = curriculum.weeks.flatMap((w) =>
  w.sessions.map((s, i) => ({ ...s, week: w.number, day: i })),
);
export const agendaIds = new Set(agendaItems.map((x) => x.id));
export const topicIds = new Set(trackerData.topics.map((x) => x.id));
export const subjectCodes = trackerData.subjects.map((x) => x.code);
export function civilDate(value) {
  return validCivilDate(value);
}
export function newAcademic() {
  return {
    profile: { name: '', university: '', major: '', targetDate: '' },
    progress: Object.fromEntries(
      trackerData.topics.map((x) => [x.id, [false, false, false]]),
    ),
    completed: [],
    week: 1,
    startDate: '',
    dates: {},
    tryouts: [],
    subjectLinks: {},
    imports: [],
  };
}
export function validateContext(value) {
  if (!value) return null;
  if (typeof value !== 'object' || Array.isArray(value))
    throw new LocalisedError('error.backupFormat');
  if (
    (value.agendaId && !agendaIds.has(value.agendaId)) ||
    (value.topicId && !topicIds.has(value.topicId)) ||
    (value.stage !== undefined &&
      (!Number.isInteger(value.stage) || value.stage < 0 || value.stage > 2))
  )
    throw new LocalisedError('error.backupFormat');
  return {
    ...(value.agendaId ? { agendaId: value.agendaId } : {}),
    ...(value.topicId ? { topicId: value.topicId } : {}),
    ...(value.stage !== undefined ? { stage: value.stage } : {}),
  };
}
export function validateAcademic(value) {
  if (value === undefined) return newAcademic();
  const fail = () => {
    throw new LocalisedError('error.backupFormat');
  };
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  for (const key of ['profile', 'progress', 'dates', 'subjectLinks'])
    if (
      value[key] !== undefined &&
      (!value[key] ||
        typeof value[key] !== 'object' ||
        Array.isArray(value[key]))
    )
      fail();
  const base = newAcademic(),
    profile = value.profile || {};
  for (const key of ['name', 'university', 'major']) {
    if (
      profile[key] !== undefined &&
      (typeof profile[key] !== 'string' || profile[key].length > 120)
    )
      fail();
    base.profile[key] = profile[key] || '';
  }
  if (profile.targetDate && !civilDate(profile.targetDate)) fail();
  base.profile.targetDate = profile.targetDate || '';
  for (const [id, flags] of Object.entries(value.progress || {})) {
    if (
      !topicIds.has(id) ||
      !Array.isArray(flags) ||
      flags.length !== 3 ||
      flags.some((x) => typeof x !== 'boolean')
    )
      fail();
    base.progress[id] = [...flags];
  }
  if (
    value.completed !== undefined &&
    (!Array.isArray(value.completed) ||
      value.completed.some((id) => !agendaIds.has(id)))
  )
    fail();
  base.completed = [...new Set(value.completed || [])];
  if (
    value.week !== undefined &&
    (!Number.isInteger(value.week) || value.week < 1 || value.week > 12)
  )
    fail();
  base.week = value.week || 1;
  if (value.startDate && !civilDate(value.startDate)) fail();
  base.startDate = value.startDate || '';
  for (const [id, date] of Object.entries(value.dates || {})) {
    if (!agendaIds.has(id) || !civilDate(date)) fail();
    base.dates[id] = date;
  }
  if (
    value.tryouts !== undefined &&
    (!Array.isArray(value.tryouts) || value.tryouts.length > 20000)
  )
    fail();
  const ids = new Set();
  base.tryouts = (value.tryouts || []).map((x) => {
    if (
      !x ||
      typeof x.id !== 'string' ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(x.id) ||
      ids.has(x.id) ||
      !civilDate(x.date) ||
      typeof x.platform !== 'string' ||
      !x.platform.trim() ||
      x.platform.length > 120 ||
      !x.scores ||
      subjectCodes.some((c) => !Number.isFinite(x.scores[c]) || x.scores[c] < 0)
    )
      fail();
    ids.add(x.id);
    return {
      id: x.id,
      date: x.date,
      platform: x.platform.trim(),
      scores: Object.fromEntries(subjectCodes.map((c) => [c, x.scores[c]])),
    };
  });
  for (const [code, id] of Object.entries(value.subjectLinks || {})) {
    if (
      ![...subjectCodes, 'AWAL'].includes(code) ||
      typeof id !== 'string' ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(id)
    )
      fail();
    base.subjectLinks[code] = id;
  }
  if (
    value.imports !== undefined &&
    (!Array.isArray(value.imports) ||
      value.imports.some((x) => typeof x !== 'string' || x.length > 160))
  )
    fail();
  base.imports = [...new Set(value.imports || [])];
  return base;
}
export function agendaDate(academic, id) {
  if (academic.dates[id]) return academic.dates[id];
  if (!academic.startDate) return '';
  const index = agendaItems.findIndex((x) => x.id === id);
  if (index < 0) return '';
  const date = new Date(academic.startDate + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + index);
  const result = `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  return civilDate(result) ? result : '';
}
export function materialStats(academic, code = 'all') {
  const topics = trackerData.topics.filter(
    (x) => code === 'all' || x.subjects.includes(code),
  );
  const done = topics.filter((x) =>
      academic.progress[x.id].every(Boolean),
    ).length,
    stages = topics.reduce(
      (sum, x) => sum + academic.progress[x.id].filter(Boolean).length,
      0,
    );
  return {
    topics: topics.length,
    done,
    stages,
    percent: topics.length
      ? Math.round((stages / (topics.length * 3)) * 100)
      : 0,
  };
}
export function applyAcademicDraft(current, original, values) {
  if (!current || !original) throw new LocalisedError('error.tabConflict');
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b),
    next = { ...current };
  for (const [key, value] of Object.entries(values)) {
    if (equal(value, original[key])) continue;
    if (
      value &&
      original[key] &&
      current[key] &&
      typeof value === 'object' &&
      !Array.isArray(value)
    )
      next[key] = applyAcademicDraft(current[key], original[key], value);
    else {
      if (!equal(current[key], original[key]) && !equal(current[key], value))
        throw new LocalisedError('error.tabConflict');
      next[key] = structuredClone(value);
    }
  }
  return next;
}
