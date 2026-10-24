import assert from 'node:assert/strict';
import {
  LIMITS,
  MAX_BACKUP_BYTES,
  newState,
  startTimer,
  pauseTimer,
  finishTimer,
  aggregate,
  validateState,
  serializeBackup,
  parseBackup,
} from '../study/core.mjs';
const now = Date.now(),
  s = newState(now);
s.subjects = [{ id: 'math', name: 'Math', color: '#9270d7' }];
s.timer.subjectId = 'math';
const base = now - 100000 * 1000,
  fixed = '12345678-1234-1234-1234-123456789012';
s.subjects[0].id = fixed;
s.timer.subjectId = fixed;
s.sessions = Array.from({ length: LIMITS.sessions }, (_, i) => ({
  id: i.toString().padStart(8, '0') + '-1234-1234-1234-123456789012',
  runId: i.toString().padStart(8, '0') + '-2345-2345-2345-234567890123',
  subjectId: fixed,
  start: base + i * 1000,
  end: base + (i + 1) * 1000,
  durationMs: 1000,
}));
const text = serializeBackup(s),
  bytes = Buffer.byteLength(text);
assert.ok(bytes > 20000000);
assert.equal(parseBackup(text).sessions.length, LIMITS.sessions);
assert.equal(
  aggregate(parseBackup(text), '2000-01-01', '2099-12-31').total,
  100000000,
);
const previous = JSON.stringify(s);
assert.throws(() => startTimer(s, now), /100.000/);
assert.equal(JSON.stringify(s), previous);
// Maximum schema field lengths, control-character escaping, and 16-digit timestamps.
const worst = newState(now),
  id = (i) => String(i).padStart(100, '0');
worst.subjects = Array.from({ length: LIMITS.subjects }, (_, i) => ({
  id: id(i),
  name: '\u0001'.repeat(80),
  color: '#abcdef',
  archived: false,
}));
worst.timer.subjectId = id(0);
worst.settings.themeKey = 'a'.repeat(100);
worst.tasks = Array.from({ length: LIMITS.tasks }, (_, i) => ({
  id: id(i),
  title: '\u0001'.repeat(300),
  date: '2026-09-30',
  done: false,
  subjectId: id(0),
}));
worst.sessions = Array.from({ length: LIMITS.sessions }, (_, i) => ({
  id: id(i),
  runId: id(i),
  subjectId: id(0),
  start: 8640000000000000 - 200000 + 2 * i,
  end: 8640000000000000 - 200000 + 2 * i + 1,
  durationMs: 1,
}));
const largest = serializeBackup(worst),
  largestBytes = Buffer.byteLength(largest);
assert.ok(largestBytes < MAX_BACKUP_BYTES);
assert.equal(parseBackup(largest).tasks.length, LIMITS.tasks);
// Reject overlaps across different runs/subjects, nesting, duplicates and active intervals; adjacency is valid.
function pair(start2, end2) {
  const v = newState(now);
  v.subjects = [
    { id: 'a', name: 'A', color: '#abcdef' },
    { id: 'b', name: 'B', color: '#abcdef' },
  ];
  v.timer.subjectId = 'a';
  v.sessions = [
    {
      id: '1',
      runId: '1',
      subjectId: 'a',
      start: base,
      end: base + 3600000,
      durationMs: 3600000,
    },
    {
      id: '2',
      runId: '2',
      subjectId: 'b',
      start: start2,
      end: end2,
      durationMs: end2 - start2,
    },
  ];
  return v;
}
for (const v of [
  pair(base, base + 3600000),
  pair(base + 1000, base + 2000),
  pair(base + 3599000, base + 7200000),
])
  assert.throws(() => validateState(v), /bertumpang tindih/);
const adjacent = pair(base + 3600000, base + 7200000);
assert.equal(validateState(adjacent).sessions.length, 2);
adjacent.sessions.reverse();
assert.equal(validateState(adjacent).sessions.length, 2);
const active = pair(base + 3600000, base + 7200000);
active.timer.startedAt = base + 1000;
assert.throws(() => validateState(active), /bertumpang tindih/);
const clockBack = pair(base + 3600000, base + 7200000);
assert.throws(() => startTimer(clockBack, base + 7199000), /Jam perangkat/);
assert.equal(clockBack.timer.startedAt, null);
const normal = newState(now);
normal.subjects = [{ id: 'a', name: 'A', color: '#abcdef' }];
normal.timer.subjectId = 'a';
startTimer(normal, now - 2000);
pauseTimer(normal, now - 1000);
startTimer(normal, now - 1000);
finishTimer(normal, now);
assert.equal(validateState(normal).sessions.length, 2);
const activeExport = newState(now);
activeExport.subjects = normal.subjects;
activeExport.timer.subjectId = 'a';
startTimer(activeExport, now - 65000);
const exported = parseBackup(serializeBackup(activeExport, now));
assert.equal(exported.sessions[0].durationMs, 65000);
assert.equal(exported.timer.elapsedMs, 0);
assert.equal(exported.timer.startedAt, null);
assert.equal(activeExport.timer.startedAt, now - 65000);
console.log(
  JSON.stringify({
    result: 'PASS',
    case: 'large export/import and overlap boundaries',
    regularBytes: bytes,
    maximumFieldsBytes: largestBytes,
    importLimitBytes: MAX_BACKUP_BYTES,
  }),
);
