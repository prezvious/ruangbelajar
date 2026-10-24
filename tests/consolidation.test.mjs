import assert from 'node:assert/strict';
import {
  newState,
  validateState,
  startTimer,
  pauseTimer,
  finishTimer,
  serializeBackup,
  parseBackup,
} from '../study/core.mjs';
import { agendaDate, materialStats } from '../study/academic-model.mjs';
import { mergeWorkspaces, importFingerprint } from '../study/guest-import.mjs';

const state = newState();
assert.equal(
  state.version,
  3,
  'The unified workspace must preserve academic data in schema 3',
);
state.academic.profile.name = 'Pelajar';
state.academic.progress['math-4'] = [true, false, true];
const restored = parseBackup(serializeBackup(state));
assert.equal(restored.academic.profile.name, 'Pelajar');
assert.deepEqual(restored.academic.progress['math-4'], [true, false, true]);
const legacy = { ...newState(), version: 2 };
delete legacy.academic;
assert.equal(validateState(legacy).version, 3);
assert.throws(() => validateState({ ...legacy, version: 3 }));
assert.throws(() =>
  validateState({ ...newState(), academic: { profile: 'damaged' } }),
);
const orphan = newState();
orphan.academic.subjectLinks.PK = 'missing';
assert.throws(() => validateState(orphan));
state.academic.startDate = '2026-12-28';
assert.equal(agendaDate(state.academic, '1-6'), '2027-01-03');
state.academic.dates['1-6'] = '2027-01-10';
assert.equal(agendaDate(state.academic, '1-6'), '2027-01-10');
assert.equal(materialStats(state.academic).topics, 116);
assert.equal(materialStats(state.academic, 'PK').stages, 2);
assert.equal(materialStats(state.academic, 'PM').stages, 2);
assert.equal(materialStats(state.academic).stages, 2);
const source = newState();
source.subjects = [
  { id: 'pk', name: 'Matematika', color: '#123456', archived: false },
];
source.timer.subjectId = 'pk';
source.timer.context = { topicId: 'math-4', stage: 1 };
startTimer(source, 1000);
pauseTimer(source, 61000);
const fingerprint = await importFingerprint(source),
  merged = mergeWorkspaces(state, source, fingerprint, { now: 62000 });
assert.equal(merged.sessions.length, 1);
assert.equal(merged.academic.profile.name, 'Pelajar');
assert.equal(merged.sessions[0].context.topicId, 'math-4');
assert.deepEqual(mergeWorkspaces(merged, source, fingerprint), merged);
const target = newState();
target.subjects = [
  { id: 'pk', name: 'Fisika', color: '#123456', archived: false },
];
const collision = mergeWorkspaces(target, source, fingerprint, { now: 62000 });
assert.equal(collision.subjects.length, 2);
assert.notEqual(collision.sessions[0].subjectId, 'pk');
assert.throws(() =>
  mergeWorkspaces(
    merged,
    {
      ...source,
      sessions: source.sessions.map((x) => ({
        ...x,
        id: 'different',
        runId: 'different',
      })),
      timer: {
        subjectId: 'pk',
        runId: 'different2',
        elapsedMs: 0,
        startedAt: null,
      },
    },
    'different',
    { now: 62000 },
  ),
);
console.log('PASS: workspace schema and backup compatibility.');
console.log(
  'PASS: dates across years, explicit rescheduling, unique PK/PM progress, idempotent guest import, ID remapping, timer context and overlap rejection.',
);

const ended = structuredClone(source);
finishTimer(ended, 62000);
assert.equal(ended.timer.context, undefined);
assert.equal(ended.sessions[0].context.topicId, 'math-4');
console.log(
  'PASS: finishing keeps recorded context and clears it for the next generic session.',
);
