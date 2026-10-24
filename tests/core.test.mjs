import assert from 'node:assert/strict';
import { studyState } from './fixtures.mjs';
import {
  newState,
  startTimer,
  pauseTimer,
  finishTimer,
  elapsed,
  aggregate,
  dayKey,
  validateState,
  sessionParts,
} from '../study/core.mjs';
const t = new Date(2026, 8, 29, 23, 59, 30).getTime();
const s = studyState(t);
const math = s.subjects[0].id,
  english = s.subjects[1].id;
startTimer(s, t);
assert.equal(elapsed(s, t + 15000), 15000);
pauseTimer(s, t + 30000);
assert.equal(elapsed(s, t + 90000), 30000);
startTimer(s, t + 90000);
assert.equal(finishTimer(s, t + 120000), 60000);
assert.equal(aggregate(s, '2026-09-29', '2026-09-30', t + 120000).total, 60000);
assert.equal(aggregate(s, '2026-09-29', '2026-09-29', t + 120000).total, 30000);
assert.equal(aggregate(s, '2026-09-30', '2026-09-30', t + 120000).total, 30000);
s.timer.subjectId = english;
startTimer(s, t + 130000);
finishTimer(s, t + 190000);
const a = aggregate(s, '2026-09-29', '2026-09-30', t + 200000);
assert.equal(a.subjects[math], 60000);
assert.equal(a.subjects[english], 60000);
assert.equal(a.count, 2);
assert.equal(a.max, 60000);
assert.equal(
  sessionParts({ start: t, end: t + 60000, subjectId: math, runId: 'x' })
    .length,
  2,
);
assert.equal(validateState(JSON.parse(JSON.stringify(s))).sessions.length, 3);
assert.throws(() => validateState({ ...s, version: 4 }));
assert.throws(() =>
  validateState({ ...s, settings: { ...s.settings, goal: 0 } }),
);
assert.throws(() =>
  validateState({
    ...s,
    sessions: [{ ...s.sessions[0], subjectId: 'missing' }],
  }),
);
console.log(
  'PASS: pause/resume, no paused-time attribution, subject separation, midnight splitting, session grouping, JSON round-trip and invalid import rejection.',
);
