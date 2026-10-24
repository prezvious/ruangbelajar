import assert from 'node:assert/strict';
import { newState, validateState } from '../study/core.mjs';
import { agendaItems, agendaDate } from '../study/academic-model.mjs';
import {
  newLearning,
  taskOccurrences,
  dailyQueue,
  capacityPlan,
  correctTime,
} from '../study/learning-model.mjs';
import { calendarExport } from '../study/calendar-export.mjs';
import { mergeWorkspaces } from '../study/guest-import.mjs';
import { documentOf, mergeDocuments } from '../study/sync.mjs';

const s = newState();
assert.deepEqual(validateState(s).learning, newLearning());
const task = {
  id: 'r',
  title: 'Review',
  date: '2026-01-31',
  done: false,
  subjectId: '',
  recurrence: { frequency: 'monthly', interval: 1, until: '' },
};
s.tasks.push(task);
assert.deepEqual(
  taskOccurrences(s, '2026-01-01', '2026-04-30').map((x) => x.date),
  ['2026-01-31', '2026-03-31'],
);
s.tasks[0].recurrence.frequency = 'daily';
s.learning.occurrences['r@2026-01-31'] = true;
assert.equal(dailyQueue(s, '2026-02-02').tasks[0].date, '2026-02-01');
assert.equal(dailyQueue(s, '2026-02-02').tasks.length, 2);
assert.equal(s.tasks.length, 1);
s.academic.startDate = '2026-10-23';
const plan = capacityPlan(s, {
  startDate: '2026-10-23',
  weekdays: [1, 3, 5],
  minutesPerDay: 90,
  sessionMinutes: 45,
  estimates: {},
  targetDate: '2026-10-23',
});
assert.equal(plan.dates[agendaItems[0].id], '2026-10-23');
assert.equal(plan.dates[agendaItems[2].id], '2026-10-26');
assert.equal(plan.feasible, false);
assert.equal(Object.keys(plan.dates).length, agendaItems.length);
s.subjects = [{ id: 'math', name: 'Math', color: '#123456', archived: false }];
const input = { subjectId: 'math', start: 1000, end: 61000 };
correctTime(s, { after: input, reason: 'Forgot timer' }, 100000);
assert.equal(s.sessions[0].durationMs, 60000);
assert.equal(s.learning.timeEdits.length, 1);
assert.throws(
  () => correctTime(s, { after: input, reason: 'overlap' }, 100000),
  /tumpang|overlap/i,
);
assert.throws(() =>
  correctTime(
    s,
    { after: { ...input, start: 62000, end: 63000 }, reason: '' },
    100000,
  ),
);
const before = structuredClone(s.sessions[0]);
correctTime(
  s,
  {
    id: before.id,
    before,
    after: { ...before, end: 31000 },
    reason: 'Corrected end',
  },
  100000,
);
assert.equal(s.sessions[0].durationMs, 30000);
assert.throws(() =>
  correctTime(
    s,
    { id: before.id, before, after: before, reason: 'stale' },
    100000,
  ),
);
s.timer.runId = s.sessions[0].runId;
s.timer.elapsedMs = 30000;
s.timer.subjectId = 'math';
assert.throws(() =>
  correctTime(
    s,
    {
      id: s.sessions[0].id,
      before: s.sessions[0],
      after: null,
      reason: 'delete active',
    },
    100000,
  ),
);
const txt = 'Rencana, belajar; aman\nBEGIN:VEVENT';
s.tasks = [
  {
    ...task,
    title: txt,
    recurrence: { frequency: 'weekly', interval: 1, until: '' },
  },
];
s.learning.calendarId = 'fixture-calendar';
const ics = calendarExport(s, '2026-01-01', '2026-04-30', 0);
assert.ok(ics.includes('BEGIN:VALARM\r\n'));
assert.ok(ics.includes('Rencana\\, belajar\\; aman\\nBEGIN:VEVENT'));
assert.equal(ics.split('\r\n').filter((x) => x === 'BEGIN:VEVENT').length, 12);
for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
assert.equal(agendaDate(s.academic, agendaItems[0].id), '2026-10-23');
const monthly = newState();
monthly.tasks = [
  { ...task, recurrence: { frequency: 'monthly', interval: 1, until: '' } },
];
monthly.learning.occurrences['r@2026-01-31'] = true;
assert.equal(dailyQueue(monthly, '2026-04-01').tasks[0].date, '2026-03-31');
const note = {
  id: 'note',
  topicId: 'math-4',
  title: 'Note',
  body: '**World** 世界',
  format: 'md',
  updatedAt: 1,
};
const base = documentOf(newState(), 'id-ID'),
  local = structuredClone(base),
  remote = structuredClone(base);
local.learning.notes.push(note);
remote.learning.resources.push({
  ...note,
  id: 'source',
  url: 'https://example.org',
});
const merged = mergeDocuments(base, local, remote);
assert.equal(merged.learning.notes.length, 1);
assert.equal(merged.learning.resources.length, 1);
assert.equal(
  mergeWorkspaces(local, remote, 'source-test').learning.resources.length,
  1,
);
assert.throws(() =>
  validateState({ ...local, learning: { ...local.learning, version: 999 } }),
);
assert.throws(() =>
  validateState({
    ...local,
    learning: {
      ...local.learning,
      notes: [{ ...note, body: '世'.repeat(30000) }],
    },
  }),
);
const load = newState();
load.tasks = [
  {
    id: 'personal',
    title: 'Personal',
    date: '2026-10-23',
    subjectId: '',
    done: false,
    minutes: 90,
  },
];
const loadedPlan = capacityPlan(load, {
  startDate: '2026-10-23',
  weekdays: [5],
  minutesPerDay: 90,
  sessionMinutes: 90,
  estimates: {},
});
assert.equal(loadedPlan.dates[agendaItems[0].id], '2026-10-30');
console.log(
  'PASS: learning defaults, recurrence, overdue queue, capacity preview, audited/stale/overlapping time edits and safe ICS.',
);

const zero = newState();
zero.subjects = [{ id: 'm', name: 'M', color: '#123456', archived: false }];
zero.sessions = [
  {
    id: 'zero',
    runId: 'zero-run',
    subjectId: 'm',
    start: 1,
    end: 1,
    durationMs: 0,
  },
];
correctTime(
  zero,
  {
    id: 'zero',
    before: zero.sessions[0],
    after: null,
    reason: 'Remove zero interval',
  },
  100,
);
assert.equal(validateState(zero).sessions.length, 0);

const stable = newState();
stable.learning.calendarId = 'unique-workspace';
stable.tasks = [
  {
    id: 'single',
    title: 'Single',
    date: '2026-10-23',
    done: false,
    subjectId: '',
  },
];
const firstUID = calendarExport(stable, '2026-10-01', '2026-11-30')
  .split('\r\n')
  .find((x) => x.startsWith('UID:'));
stable.tasks[0].date = '2026-11-23';
assert.equal(
  calendarExport(stable, '2026-10-01', '2026-11-30')
    .split('\r\n')
    .find((x) => x.startsWith('UID:')),
  firstUID,
);
