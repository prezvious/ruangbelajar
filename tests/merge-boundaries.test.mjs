import assert from 'node:assert/strict';
import { newState, validateState } from '../study/core.mjs';
import { mergeWorkspaces } from '../study/migration.mjs';

const target = newState();
target.subjects = [{ id: 'subject', name: 'Math', color: '#abcdef' }];
target.timer.subjectId = 'subject';
target.timer.runId = 'shared-next-run';
const incoming = structuredClone(target);
incoming.timer.runId = 'source-next-run';
incoming.sessions = [
  {
    id: 'completed',
    runId: target.timer.runId,
    subjectId: 'subject',
    start: 1000,
    end: 2000,
    durationMs: 1000,
  },
];
validateState(target);
validateState(incoming);
const result = mergeWorkspaces(target, incoming, 'timer-boundary-fingerprint');
assert.equal(result.sessions.length, 1);
assert.notEqual(
  result.sessions[0].runId,
  result.timer.runId,
  'An incoming finished run must not alias the destination’s unused next timer run',
);
assert.equal(result.timer.elapsedMs, 0);
assert.equal(target.sessions.length, 0);
console.log(
  'PASS: importing a finished run that shares the destination’s next timer ID preserves both identities and time.',
);
