import {
  agendaItems,
  agendaDate,
  topicIds,
  agendaIds,
  civilDate,
} from './academic-model.mjs';
import { LocalisedError } from './i18n.mjs';

export const CLOUD_WORKSPACE_BYTES = 3 * 1024 * 1024;
export const TEXT_BYTES = 64 * 1024;
const idOK = (x) => typeof x === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(x);
const fail = (key = 'error.backupFormat') => {
  throw new LocalisedError(key);
};
const bytes = (s) => new TextEncoder().encode(s).byteLength;
const textOK = (s, n) =>
  typeof s === 'string' &&
  s.length <= n &&
  !s.includes('\0') &&
  (s.isWellFormed?.() ?? true);
const int = (n, a, b) => Number.isInteger(n) && n >= a && n <= b;
export function assertCloudCapacity(data) {
  if (bytes(JSON.stringify(data)) > CLOUD_WORKSPACE_BYTES)
    fail('learn.cloudCapacity');
}
export function newLearning() {
  return {
    version: 1,
    calendarId: '',
    planner: {
      weekdays: [1, 2, 3, 4, 5],
      minutesPerDay: 90,
      sessionMinutes: 45,
      estimates: {},
    },
    notes: [],
    resources: [],
    occurrences: {},
    timeEdits: [],
    reminders: { enabled: false, time: '09:00', minutesBefore: 30 },
  };
}
export function validateTaskExtras(task) {
  const out = {};
  if (task.recurrence) {
    const r = task.recurrence;
    if (
      !['daily', 'weekly', 'monthly'].includes(r.frequency) ||
      !int(r.interval, 1, 30) ||
      (r.until && (!civilDate(r.until) || r.until < task.date))
    )
      fail();
    out.recurrence = {
      frequency: r.frequency,
      interval: r.interval,
      until: r.until || '',
    };
  }
  if (task.minutes !== undefined) {
    if (!int(task.minutes, 1, 1440)) fail();
    out.minutes = task.minutes;
  }
  if (task.body !== undefined) {
    if (
      !textOK(task.body, TEXT_BYTES) ||
      bytes(task.body) > TEXT_BYTES ||
      !['md', 'txt'].includes(task.format)
    )
      fail();
    out.body = task.body;
    out.format = task.format;
  }
  return out;
}
export function validatePlanner(p) {
  if (
    !p ||
    !Array.isArray(p.weekdays) ||
    !p.weekdays.length ||
    p.weekdays.length > 7 ||
    p.weekdays.some((x) => !int(x, 0, 6)) ||
    !int(p.minutesPerDay, 1, 1440) ||
    !int(p.sessionMinutes, 1, 1440) ||
    !p.estimates ||
    typeof p.estimates !== 'object' ||
    Array.isArray(p.estimates)
  )
    fail();
  for (const [id, minutes] of Object.entries(p.estimates))
    if (!agendaIds.has(id) || !int(minutes, 1, 1440)) fail();
  return {
    weekdays: [...new Set(p.weekdays)].sort(),
    minutesPerDay: p.minutesPerDay,
    sessionMinutes: p.sessionMinutes,
    estimates: { ...p.estimates },
  };
}
export function validateLearning(value, tasks = []) {
  if (value === undefined) return newLearning();
  if (!value || value.version !== 1) fail();
  const out = newLearning();
  if (
    value.calendarId !== undefined &&
    value.calendarId !== '' &&
    !idOK(value.calendarId)
  )
    fail();
  out.calendarId = value.calendarId || '';
  out.planner = validatePlanner(value.planner);
  for (const field of ['notes', 'resources']) {
    if (!Array.isArray(value[field]) || value[field].length > 2000) fail();
    const ids = new Set();
    out[field] = value[field].map((x) => {
      if (
        !x ||
        !idOK(x.id) ||
        ids.has(x.id) ||
        !topicIds.has(x.topicId) ||
        !textOK(x.title, 160) ||
        !x.title.trim() ||
        !textOK(x.body, TEXT_BYTES) ||
        bytes(x.body) > TEXT_BYTES ||
        !['md', 'txt'].includes(x.format) ||
        !Number.isSafeInteger(x.updatedAt) ||
        x.updatedAt < 0
      )
        fail();
      ids.add(x.id);
      if (field === 'resources' && x.url) {
        if (!textOK(x.url, 2000)) fail();
        try {
          const url = new URL(x.url);
          if (
            !['http:', 'https:'].includes(url.protocol) ||
            x.url.length > 2000 ||
            url.username ||
            url.password
          )
            fail();
        } catch {
          fail();
        }
      }
      return {
        id: x.id,
        topicId: x.topicId,
        title: x.title.trim(),
        body: x.body,
        format: x.format,
        updatedAt: x.updatedAt,
        ...(field === 'resources' ? { url: x.url || '' } : {}),
      };
    });
  }
  if (
    !value.occurrences ||
    typeof value.occurrences !== 'object' ||
    Array.isArray(value.occurrences) ||
    Object.keys(value.occurrences).length > 50000
  )
    fail();
  const taskIds = new Set(tasks.map((x) => x.id));
  for (const [key, status] of Object.entries(value.occurrences)) {
    const split = key.lastIndexOf('@'),
      id = key.slice(0, split),
      date = key.slice(split + 1);
    if (
      !idOK(id) ||
      !civilDate(date) ||
      (typeof status !== 'boolean' && status !== 'skipped')
    )
      fail();
    // Deleted series do not leave an unbounded collection of orphan exceptions.
    if (taskIds.has(id)) out.occurrences[key] = status;
  }
  if (!Array.isArray(value.timeEdits) || value.timeEdits.length > 500) fail();
  const auditIds = new Set();
  out.timeEdits = value.timeEdits.map((x) => {
    if (
      !x ||
      !idOK(x.id) ||
      auditIds.has(x.id) ||
      !Number.isSafeInteger(x.at) ||
      x.at < 0 ||
      x.at > 8640000000000000 ||
      !textOK(x.reason, 300) ||
      !x.reason.trim()
    )
      fail();
    auditIds.add(x.id);
    for (const record of [x.before, x.after])
      if (
        record !== null &&
        (!record ||
          !idOK(record.id) ||
          !idOK(record.runId) ||
          !idOK(record.subjectId) ||
          !Number.isSafeInteger(record.start) ||
          !Number.isSafeInteger(record.end) ||
          record.start < 0 ||
          record.end < record.start ||
          record.durationMs !== record.end - record.start)
      )
        fail();
    if (!x.before && !x.after) fail();
    return {
      id: x.id,
      at: x.at,
      reason: x.reason.trim(),
      before: structuredClone(x.before),
      after: structuredClone(x.after),
    };
  });
  const r = value.reminders;
  if (
    !r ||
    typeof r.enabled !== 'boolean' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) ||
    !int(r.minutesBefore, 0, 10080)
  )
    fail();
  out.reminders = {
    enabled: r.enabled,
    time: r.time,
    minutesBefore: r.minutesBefore,
  };
  return out;
}
export function civilAdd(date, days) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  const result = d.toISOString().slice(0, 10);
  return civilDate(result) ? result : '';
}
export function occurrenceOn(task, date) {
  if (date < task.date || !civilDate(date)) return false;
  const r = task.recurrence;
  if (!r) return date === task.date;
  if (r.until && date > r.until) return false;
  const delta = Math.round(
    (Date.parse(date + 'T00:00:00Z') - Date.parse(task.date + 'T00:00:00Z')) /
      86400000,
  );
  if (r.frequency === 'daily') return delta % r.interval === 0;
  if (r.frequency === 'weekly') return delta % (7 * r.interval) === 0;
  const [y, m, d] = date.split('-').map(Number),
    [sy, sm, sd] = task.date.split('-').map(Number);
  // RFC 5545: invalid month dates are skipped, preserving the original anchor.
  return d === sd && ((y - sy) * 12 + m - sm) % r.interval === 0;
}
export function occurrenceDone(state, task, date) {
  return task.recurrence
    ? !!state.learning.occurrences[task.id + '@' + date]
    : task.done;
}
export function taskOccurrences(state, from, to, limit = 50000) {
  if (!civilDate(from) || !civilDate(to) || to < from) fail();
  if ((Date.parse(to) - Date.parse(from)) / 86400000 >= 366)
    fail('learn.calendarRange');
  const result = [];
  for (let d = from; d && d <= to; d = civilAdd(d, 1)) {
    for (const task of state.tasks) {
      if (occurrenceOn(task, d)) {
        if (result.length >= limit) fail('learn.calendarTooMany');
        result.push({ ...task, date: d, done: occurrenceDone(state, task, d) });
      }
    }
  }
  return result;
}
export function setOccurrence(state, id, date, done) {
  const task = state.tasks.find((x) => x.id === id);
  if (!task || !occurrenceOn(task, date)) fail('error.tabConflict');
  if (task.recurrence) state.learning.occurrences[id + '@' + date] = done;
  else task.done = done;
}
function firstPending(state, task, today) {
  if (!task.recurrence)
    return !task.done && task.date <= today ? task.date : '';
  // Jump arithmetically between occurrences. Monthly anchors skip invalid dates.
  const r = task.recurrence;
  let d = task.date,
    month = 0;
  for (let n = 0; n <= 50001 && d && d <= today; n++) {
    if (
      (!r.until || d <= r.until) &&
      !state.learning.occurrences[task.id + '@' + d]
    )
      return d;
    if (r.until && d >= r.until) return '';
    if (r.frequency !== 'monthly')
      d = civilAdd(d, r.interval * (r.frequency === 'weekly' ? 7 : 1));
    else {
      const original = new Date(task.date + 'T12:00:00Z');
      do {
        month += r.interval;
        const next = new Date(original);
        next.setUTCDate(1);
        next.setUTCMonth(original.getUTCMonth() + month);
        next.setUTCDate(original.getUTCDate());
        d = next.toISOString().slice(0, 10);
      } while (d <= today && !occurrenceOn(task, d));
    }
    if (r.frequency === 'monthly' && !occurrenceOn(task, d)) {
      n--;
      continue;
    }
  }
  return '';
}
export function dailyQueue(state, today) {
  const agenda = agendaItems
    .map((x) => ({ ...x, date: agendaDate(state.academic, x.id) }))
    .filter(
      (x) =>
        x.date && x.date <= today && !state.academic.completed.includes(x.id),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const tasks = [];
  for (const task of state.tasks) {
    const pending = firstPending(state, task, today);
    if (pending) tasks.push({ ...task, date: pending, done: false });
    if (
      task.recurrence &&
      pending !== today &&
      occurrenceOn(task, today) &&
      !occurrenceDone(state, task, today)
    )
      tasks.push({ ...task, date: today, done: false });
  }
  tasks.sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
  );
  return { agenda, tasks };
}
export function capacityPlan(state, options) {
  const p = validatePlanner(options),
    start = options.startDate;
  if (
    !civilDate(start) ||
    (options.targetDate && !civilDate(options.targetDate))
  )
    fail();
  const dates = {},
    loads = {},
    oversized = [];
  let day = start,
    finish = start;
  const remaining = agendaItems.filter(
    (x) => !state.academic.completed.includes(x.id),
  );
  const taskLoad = (d) =>
    state.tasks.reduce(
      (sum, t) =>
        sum +
        (occurrenceOn(t, d) && !occurrenceDone(state, t, d)
          ? t.minutes || 0
          : 0),
      0,
    );
  for (const item of remaining) {
    const minutes = p.estimates[item.id] || p.sessionMinutes;
    if (minutes > p.minutesPerDay) {
      oversized.push(item.id);
      continue;
    }
    let placed = false;
    for (let n = 0; n < 3660 && day; n++, day = civilAdd(day, 1)) {
      if (!p.weekdays.includes(new Date(day + 'T12:00:00Z').getUTCDay()))
        continue;
      const load = loads[day] ?? taskLoad(day);
      if (load + minutes > p.minutesPerDay) continue;
      loads[day] = load + minutes;
      dates[item.id] = day;
      finish = day;
      placed = true;
      break;
    }
    if (!placed) {
      oversized.push(item.id);
      break;
    }
  }
  return {
    dates,
    loads,
    finish,
    unscheduled: oversized,
    feasible:
      !oversized.length &&
      (!options.targetDate || finish <= options.targetDate),
    remaining: remaining.length,
  };
}
export function correctTime(
  state,
  { id = '', before = null, after, reason },
  now = Date.now(),
) {
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 300)
    fail('learn.reasonRequired');
  const existing = id ? state.sessions.find((x) => x.id === id) : null;
  if (id && (!existing || JSON.stringify(existing) !== JSON.stringify(before)))
    fail('error.tabConflict');
  if (existing?.runId === state.timer.runId) fail('learn.activeRun');
  let record = null;
  if (after) {
    if (
      !state.subjects.some((x) => x.id === after.subjectId) ||
      !Number.isSafeInteger(after.start) ||
      !Number.isSafeInteger(after.end) ||
      after.start < 0 ||
      after.end <= after.start ||
      after.end > now
    )
      fail('learn.invalidTime');
    if (
      state.sessions.some(
        (x) => x.id !== id && after.start < x.end && after.end > x.start,
      ) ||
      (state.timer.startedAt !== null && after.end > state.timer.startedAt)
    )
      fail('error.overlap');
    if (state.sessions.length >= 100000 && !existing)
      fail('error.sessionLimit');
    record = {
      id: existing?.id || crypto.randomUUID(),
      runId:
        existing && existing.subjectId === after.subjectId
          ? existing.runId
          : crypto.randomUUID(),
      subjectId: after.subjectId,
      start: after.start,
      end: after.end,
      durationMs: after.end - after.start,
      ...(after.context ? { context: structuredClone(after.context) } : {}),
    };
  } else if (!existing) fail();
  state.sessions = state.sessions.filter((x) => x.id !== id);
  if (record) state.sessions.push(record);
  state.learning.timeEdits.push({
    id: crypto.randomUUID(),
    at: now,
    reason: reason.trim(),
    before: existing ? structuredClone(existing) : null,
    after: record ? structuredClone(record) : null,
  });
  state.learning.timeEdits = state.learning.timeEdits.slice(-500);
  return record;
}
