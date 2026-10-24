import {
  newLearning,
  validateLearning,
  validateTaskExtras,
} from './learning-model.mjs';
import { LocalisedError, validCivilDate } from './i18n.mjs';
import {
  newAcademic,
  validateAcademic,
  validateContext,
} from './academic-model.mjs';
export const LIMITS = Object.freeze({
  subjects: 100,
  tasks: 20000,
  sessions: 100000,
});
// Covers the maximum exported schema, including escaped 300-character task titles.
export const MAX_BACKUP_BYTES = 128 * 1024 * 1024;
export const COLORS = [
  '#9270d7',
  '#da9961',
  '#64998d',
  '#7198ca',
  '#cc7993',
  '#b2a24d',
];
export const uid = () => globalThis.crypto.randomUUID();
export const dayKey = (v = new Date()) => {
  const d = new Date(v);
  return `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const parseDay = (s) => new Date(`${s}T00:00:00`);
export const addDays = (v, n) => {
  const source = new Date(v),
    civil = new Date(0);
  civil.setUTCFullYear(
    source.getFullYear(),
    source.getMonth(),
    source.getDate() + n,
  );
  const result = new Date(source);
  result.setHours(0, 0, 0, 0);
  result.setFullYear(
    civil.getUTCFullYear(),
    civil.getUTCMonth(),
    civil.getUTCDate(),
  );
  result.setHours(0, 0, 0, 0);
  // A skipped civil day must not make backwards iteration repeat the same day.
  if (n < 0 && dayKey(result) === dayKey(source)) {
    civil.setUTCDate(civil.getUTCDate() - 1);
    result.setFullYear(
      civil.getUTCFullYear(),
      civil.getUTCMonth(),
      civil.getUTCDate(),
    );
    result.setHours(0, 0, 0, 0);
  }
  return result;
};
// Civil calendar slots retain a placeholder for dates skipped by a time-zone change.
export function calendarDays(v, count) {
  const source = new Date(v);
  return Array.from({ length: count }, (_, i) => {
    const civil = new Date(0);
    civil.setUTCFullYear(
      source.getFullYear(),
      source.getMonth(),
      source.getDate() + i,
    );
    const date = addDays(source, i);
    return date.getFullYear() === civil.getUTCFullYear() &&
      date.getMonth() === civil.getUTCMonth() &&
      date.getDate() === civil.getUTCDate()
      ? date
      : null;
  });
}
export const startWeek = (v) => {
  const d = parseDay(dayKey(v));
  return addDays(d, -((d.getDay() + 6) % 7));
};
export const clock = (ms) => {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
};
export const duration = (ms) => {
  const m = Math.floor(Math.max(0, ms) / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}j ${m % 60}m` : `${m}m`;
};
export const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export function mixHex(a, b, ratio) {
  const channels = (hex) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const first = channels(a),
    second = channels(b);
  return (
    '#' +
    first
      .map((v, i) =>
        Math.round(v * (1 - ratio) + second[i] * ratio)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
export function contrastRatio(a, b) {
  const luminance = (hex) =>
    [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function heatPalette(tokens) {
  const ratios = [0, 0.18, 0.4, 0.65, 1];
  return ratios.map((ratio, i) => {
    const background =
      i === 0
        ? mixHex(tokens.surfaceInput, tokens.textMain, 0.07)
        : mixHex(tokens.surfaceInput, tokens.accentMain, ratio);
    const text = [
      tokens.textMain,
      tokens.buttonStrongText,
      '#000000',
      '#ffffff',
    ].reduce((best, c) =>
      contrastRatio(c, background) > contrastRatio(best, background) ? c : best,
    );
    return { background, text };
  });
}
export function contributionRange(now = Date.now(), count = 90) {
  const today = parseDay(dayKey(now)),
    first = addDays(today, 1 - count),
    gridStart = startWeek(first);
  let weeks = 0;
  for (let d = gridStart; d <= today; d = addDays(d, 7)) weeks++;
  return { today, first, gridStart, weeks };
}
export function newState(now = Date.now()) {
  return {
    version: 3,
    subjects: [],
    tasks: [],
    sessions: [],
    timer: { subjectId: '', elapsedMs: 0, startedAt: null, runId: uid() },
    settings: {
      goal: 240,
      theme: 'light',
      themeKey: 'olive',
      interfaceStyle: 'studio',
    },
    academic: newAcademic(),
    learning: newLearning(),
    updatedAt: now,
  };
}
export function restoreLocalState(raw, now = Date.now()) {
  if (!raw) return { state: newState(now), reset: false };
  const saved = JSON.parse(raw);
  return { state: validateState(saved), reset: false };
}
export const elapsed = (s, now = Date.now()) =>
  s.timer.elapsedMs +
  (s.timer.startedAt !== null ? Math.max(0, now - s.timer.startedAt) : 0);
export const hasActiveSession = (s) =>
  s.timer.startedAt !== null || s.timer.elapsedMs > 0;
export function startTimer(s, now = Date.now()) {
  if (s.timer.startedAt !== null) return;
  if (!s.subjects.some((x) => x.id === s.timer.subjectId && !x.archived))
    throw new LocalisedError('error.chooseSubject');
  if (s.sessions.length >= LIMITS.sessions)
    throw new LocalisedError('error.sessionLimit');
  if (s.sessions.some((x) => x.end > now))
    throw new LocalisedError('error.clock');
  s.timer.startedAt = now;
}
export function pauseTimer(s, now = Date.now()) {
  if (s.timer.startedAt === null) return 0;
  const ms = Math.max(0, now - s.timer.startedAt);
  if (ms > 0 && s.sessions.length >= LIMITS.sessions)
    throw new LocalisedError('error.sessionLimitUnchanged');
  if (ms > 0)
    s.sessions.push({
      id: uid(),
      runId: s.timer.runId,
      subjectId: s.timer.subjectId,
      start: s.timer.startedAt,
      end: s.timer.startedAt + ms,
      durationMs: ms,
      ...(s.timer.context ? { context: structuredClone(s.timer.context) } : {}),
    });
  s.timer.elapsedMs += ms;
  s.timer.startedAt = null;
  return ms;
}
export function finishTimer(s, now = Date.now()) {
  pauseTimer(s, now);
  const ms = s.timer.elapsedMs;
  s.timer.elapsedMs = 0;
  s.timer.runId = uid();
  delete s.timer.context;
  return ms;
}
export function sessionParts(
  session,
  clipStart = -Infinity,
  clipEnd = Infinity,
) {
  const parts = [];
  let t = Math.max(session.start, clipStart),
    limit = Math.min(session.end, clipEnd);
  while (t < limit) {
    const next = addDays(t, 1);
    const end = Number.isFinite(+next) ? Math.min(limit, +next) : limit;
    parts.push({
      id: session.id,
      date: dayKey(t),
      ms: end - t,
      subjectId: session.subjectId,
      runId: session.runId,
      start: t,
      end,
    });
    t = end;
  }
  return parts;
}
export function allSessions(s, now = Date.now()) {
  return s.timer.startedAt !== null
    ? [
        ...s.sessions,
        {
          id: 'active:' + s.timer.runId,
          runId: s.timer.runId,
          subjectId: s.timer.subjectId,
          start: s.timer.startedAt,
          end: Math.max(s.timer.startedAt, now),
          durationMs: Math.max(0, now - s.timer.startedAt),
        },
      ]
    : s.sessions;
}
export function aggregate(s, from, to, now = Date.now()) {
  const clipStart = +parseDay(from),
    clipEnd = +addDays(parseDay(to), 1);
  const parts = allSessions(s, now).flatMap((x) =>
    sessionParts(x, clipStart, clipEnd),
  );
  const days = Object.create(null),
    subjects = Object.create(null),
    runs = Object.create(null),
    segments = Object.create(null);
  let total = 0;
  for (const p of parts) {
    total += p.ms;
    days[p.date] = (days[p.date] || 0) + p.ms;
    subjects[p.subjectId] = (subjects[p.subjectId] || 0) + p.ms;
    runs[p.runId] = (runs[p.runId] || 0) + p.ms;
    segments[p.id] = (segments[p.id] || 0) + p.ms;
  }
  return {
    total,
    days,
    subjects,
    parts,
    max: Object.values(segments).reduce((max, ms) => Math.max(max, ms), 0),
    count: Object.keys(runs).length,
  };
}
export function streak(s, now = Date.now()) {
  const a = aggregate(s, dayKey(0), dayKey(now), now);
  let d = parseDay(dayKey(now));
  if (!a.days[dayKey(d)]) d = addDays(d, -1);
  let n = 0;
  while (a.days[dayKey(d)]) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
export function validateState(v) {
  const fail = () => {
    throw new LocalisedError('error.backupFormat');
  };
  if (
    !v ||
    ![1, 2, 3].includes(v.version) ||
    !Array.isArray(v.subjects) ||
    !Array.isArray(v.tasks) ||
    !Array.isArray(v.sessions) ||
    !v.timer ||
    !v.settings
  )
    fail();
  if (v.version === 3 && !v.academic) fail();
  if (v.demo === true) throw new LocalisedError('error.demoBackup');
  if (
    v.subjects.length > LIMITS.subjects ||
    v.tasks.length > LIMITS.tasks ||
    v.sessions.length > LIMITS.sessions
  )
    fail();
  const validId = (id) =>
    typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(id);
  const validTime = (t) =>
    Number.isSafeInteger(t) && t >= 0 && t <= 8640000000000000;
  const ids = new Set();
  for (const x of v.subjects) {
    if (
      !x ||
      !validId(x.id) ||
      ids.has(x.id) ||
      typeof x.name !== 'string' ||
      !x.name.trim() ||
      x.name.length > 80 ||
      !/^#[0-9a-f]{6}$/i.test(x.color) ||
      (x.archived !== undefined && typeof x.archived !== 'boolean')
    )
      fail();
    ids.add(x.id);
  }
  const academic = validateAcademic(v.academic);
  if (Object.values(academic.subjectLinks).some((id) => !ids.has(id))) fail();
  const taskIds = new Set();
  for (const x of v.tasks) {
    if (
      !x ||
      !validId(x.id) ||
      taskIds.has(x.id) ||
      typeof x.title !== 'string' ||
      !x.title.trim() ||
      x.title.length > 300 ||
      typeof x.done !== 'boolean' ||
      !validCivilDate(x.date) ||
      (x.subjectId && !ids.has(x.subjectId))
    )
      fail();
    taskIds.add(x.id);
  }
  const sessionIds = new Set(),
    runSubjects = new Map();
  for (const x of v.sessions) {
    if (
      !x ||
      !validId(x.id) ||
      sessionIds.has(x.id) ||
      !validId(x.runId) ||
      !ids.has(x.subjectId) ||
      !validTime(x.start) ||
      !validTime(x.end) ||
      x.end < x.start ||
      !Number.isSafeInteger(x.durationMs) ||
      x.durationMs !== x.end - x.start
    )
      fail();
    if (runSubjects.has(x.runId) && runSubjects.get(x.runId) !== x.subjectId)
      fail();
    runSubjects.set(x.runId, x.subjectId);
    sessionIds.add(x.id);
  }
  if (
    !Number.isSafeInteger(v.timer.elapsedMs) ||
    v.timer.elapsedMs < 0 ||
    (v.timer.subjectId && !ids.has(v.timer.subjectId)) ||
    !validId(v.timer.runId) ||
    (v.timer.startedAt !== null &&
      (!validTime(v.timer.startedAt) || v.timer.startedAt > Date.now() + 60000))
  )
    fail();
  if (
    (v.timer.startedAt !== null || v.timer.elapsedMs > 0) &&
    (!v.timer.subjectId ||
      v.subjects.find((x) => x.id === v.timer.subjectId)?.archived)
  )
    fail();
  const savedElapsed = v.sessions
    .filter((x) => x.runId === v.timer.runId)
    .reduce((sum, x) => sum + x.durationMs, 0);
  if (
    savedElapsed !== v.timer.elapsedMs ||
    (runSubjects.has(v.timer.runId) &&
      runSubjects.get(v.timer.runId) !== v.timer.subjectId)
  )
    fail();
  // One stopwatch cannot record overlapping study intervals, including across subjects.
  const intervals = v.sessions
    .filter((x) => x.end > x.start)
    .map((x) => ({ start: x.start, end: x.end }));
  if (v.timer.startedAt !== null)
    intervals.push({ start: v.timer.startedAt, end: Infinity });
  intervals.sort((a, b) => a.start - b.start);
  let previousEnd = -Infinity;
  for (const x of intervals) {
    if (x.start < previousEnd) throw new LocalisedError('error.overlap');
    previousEnd = x.end;
  }
  if (
    !Number.isInteger(v.settings.goal) ||
    v.settings.goal < 15 ||
    v.settings.goal > 1440 ||
    !['light', 'dark', 'system'].includes(v.settings.theme) ||
    typeof v.settings.themeKey !== 'string' ||
    !/^[-a-z0-9]{1,100}$/.test(v.settings.themeKey) ||
    !['studio', 'opaline'].includes(v.settings.interfaceStyle)
  )
    fail();
  return {
    version: 3,
    academic,
    learning: validateLearning(v.learning, v.tasks),
    subjects: v.subjects.map((x) => ({
      id: x.id,
      name: x.name.trim(),
      color: x.color,
      archived: !!x.archived,
    })),
    tasks: v.tasks.map((x) => ({
      id: x.id,
      title: x.title.trim(),
      date: x.date,
      done: x.done,
      subjectId: x.subjectId || '',
      ...(x.context ? { context: validateContext(x.context) } : {}),
      ...validateTaskExtras(x),
    })),
    sessions: v.sessions.map((x) => ({
      id: x.id,
      runId: x.runId,
      subjectId: x.subjectId,
      start: x.start,
      end: x.end,
      durationMs: x.durationMs,
      ...(x.context ? { context: validateContext(x.context) } : {}),
    })),
    timer: {
      subjectId: v.timer.subjectId || '',
      elapsedMs: v.timer.elapsedMs,
      startedAt: v.timer.startedAt,
      runId: v.timer.runId,
      ...(v.timer.context ? { context: validateContext(v.timer.context) } : {}),
    },
    settings: {
      goal: v.settings.goal,
      theme: v.settings.theme,
      themeKey: v.settings.themeKey,
      interfaceStyle: v.settings.interfaceStyle,
    },
    updatedAt: Number.isFinite(v.updatedAt) ? v.updatedAt : Date.now(),
  };
}

export function backupState(s, now = Date.now()) {
  const copy = structuredClone(s);
  finishTimer(copy, now);
  return validateState(copy);
}
export function serializeBackup(s, now = Date.now()) {
  const text = JSON.stringify(backupState(s, now), null, 2);
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
    throw new LocalisedError('error.backupTooLarge');
  return text;
}
export function parseBackup(text) {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
    throw new LocalisedError('error.importTooLarge');
  try {
    return validateState(JSON.parse(text));
  } catch (error) {
    if (error instanceof LocalisedError) throw error;
    throw new LocalisedError('error.backupFormat');
  }
}
