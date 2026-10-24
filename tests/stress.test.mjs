// Seeded model and timezone oracle adapted from Sela's source tests.
// Tests only this repository's modules; never reads Sela at runtime.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as core from '../study/core.mjs';
const NOW = Date.UTC(2026, 8, 29, 12),
  SEEDS = [0x5e1a2026, 0x0c10c0de, 0xdeadbeef];
const random = (seed) => {
  let value = seed >>> 0;
  return (max) => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) % max;
  };
};
const json = (value) => JSON.parse(JSON.stringify(value));
const task = (id, title = id) => ({
  id,
  title,
  date: '2026-09-29',
  done: false,
  subjectId: 'math',
});
function subjectState(now) {
  const s = core.newState(now);
  s.subjects = [{ id: 'math', name: 'Math', color: '#9270d7' }];
  s.timer.subjectId = 'math';
  return s;
}
function timerModel(seed) {
  const next = random(seed),
    s = core.newState(NOW);
  s.subjects = Array.from({ length: 3 }, (_, i) => ({
    id: `subject${i}`,
    name: `Subject ${i}`,
    color: core.COLORS[i],
  }));
  s.timer.subjectId = 'subject0';
  let now = NOW,
    started = null,
    accrued = 0,
    run = 0,
    currentSubject = 'subject0';
  const segments = [],
    runMap = new Map([[s.timer.runId, run]]),
    trace = [];
  const independentElapsed = () =>
    accrued + (started === null ? 0 : Math.max(0, now - started));
  const stop = () => {
    if (started !== null) {
      const duration = Math.max(0, now - started);
      if (duration > 0)
        segments.push({
          start: started,
          end: started + duration,
          subjectId: currentSubject,
          durationMs: duration,
          run,
        });
      accrued += duration;
      started = null;
    }
  };
  try {
    for (let i = 0; i < 600; i++) {
      const choice = next(8);
      trace.push({ i, choice, now });
      if (choice === 0) {
        const delta = [0, 1, 999, 60000, 3600000, -1, -60000][next(7)];
        now += delta;
      } else if (choice === 1 || choice === 2) {
        const clockBlocked =
          started === null && segments.some((x) => x.end > now);
        if (clockBlocked)
          assert.throws(
            () => core.startTimer(s, now),
            (e) => e.key === 'error.clock',
          );
        else {
          core.startTimer(s, now);
          if (started === null) started = now;
        }
      } else if (choice === 3) {
        const before = accrued;
        stop();
        assert.equal(core.pauseTimer(s, now), accrued - before);
      } else if (choice === 4) {
        stop();
        assert.equal(core.finishTimer(s, now), accrued);
        accrued = 0;
        run++;
        runMap.set(s.timer.runId, run);
      } else if (choice === 5 && started === null && accrued === 0) {
        currentSubject = `subject${next(3)}`;
        s.timer.subjectId = currentSubject;
      } else if (choice === 6) {
        const original = JSON.stringify(s),
          snapshot = core.parseBackup(core.serializeBackup(s, now));
        assert.equal(
          JSON.stringify(s),
          original,
          'backup must not mutate the running/paused timer',
        );
        assert.equal(
          snapshot.sessions.reduce((sum, x) => sum + x.durationMs, 0),
          segments.reduce((sum, x) => sum + x.durationMs, 0) +
            (started === null ? 0 : Math.max(0, now - started)),
        );
        assert.equal(snapshot.timer.startedAt, null);
        assert.equal(snapshot.timer.elapsedMs, 0);
      }
      assert.equal(core.elapsed(s, now), independentElapsed());
      assert.equal(core.hasActiveSession(s), started !== null || accrued > 0);
      assert.deepEqual(
        s.sessions.map((x) => ({
          start: x.start,
          end: x.end,
          subjectId: x.subjectId,
          durationMs: x.durationMs,
          run: runMap.get(x.runId),
        })),
        segments,
      );
      if (i % 17 === 0) {
        assert.deepEqual(core.validateState(s).sessions, s.sessions);
        const a = core.aggregate(s, '2026-09-01', '2026-10-31', now),
          expectedSegments = [...segments];
        if (started !== null && now > started)
          expectedSegments.push({
            durationMs: now - started,
            run,
            subjectId: currentSubject,
          });
        assert.equal(
          a.total,
          expectedSegments.reduce((sum, x) => sum + x.durationMs, 0),
        );
        assert.equal(a.count, new Set(expectedSegments.map((x) => x.run)).size);
        assert.equal(
          a.max,
          Math.max(0, ...expectedSegments.map((x) => x.durationMs)),
        );
        for (const subject of s.subjects)
          assert.equal(
            a.subjects[subject.id] || 0,
            expectedSegments
              .filter((x) => x.subjectId === subject.id)
              .reduce((sum, x) => sum + x.durationMs, 0),
          );
      }
    }
  } catch (error) {
    throw new Error(
      `${error.stack || error}\nReplay --seed=${seed}; final actions=${JSON.stringify(trace.slice(-25))}`,
      { cause: error },
    );
  }
}

function generatedBackups(seed) {
  const next = random(seed);
  const poison = ['__proto__', 'constructor', 'toString'];
  for (let caseId = 0; caseId < 48; caseId++) {
    const s = core.newState(NOW);
    s.subjects = Array.from({ length: 1 + next(6) }, (_, i) => ({
      id: poison[i] || `subject_${i}`,
      name: `A<&> "Ж ñ ${i}`,
      color: core.COLORS[i % 6],
      archived: i > 0 && next(2) === 0,
    }));
    s.timer.subjectId = s.subjects[0].id;
    s.settings.goal = 15 + next(1426);
    s.settings.theme = ['light', 'dark', 'system'][next(3)];
    s.tasks = Array.from({ length: next(50) }, (_, i) => ({
      id: `task_${i}`,
      title: `Title ${caseId}/${i}\u0001 <script>Ж😊</script>`,
      date: ['2024-02-29', '2026-09-29', '0001-01-01', '9999-12-31'][next(4)],
      done: !!next(2),
      subjectId: s.subjects[next(s.subjects.length)].id,
    }));
    let cursor = NOW - 7 * 86400000;
    const sessionCount = next(60);
    for (let i = 0; i < sessionCount; i++) {
      cursor += next(10000);
      const duration = next(600000),
        end = cursor + duration;
      s.sessions.push({
        id: `segment_${i}`,
        runId: `run_${i}`,
        subjectId: s.subjects[next(s.subjects.length)].id,
        start: cursor,
        end,
        durationMs: duration,
      });
      cursor = end;
    }
    const valid = core.validateState(s),
      snapshot = core.parseBackup(core.serializeBackup(valid, NOW));
    assert.deepEqual(snapshot.subjects, valid.subjects);
    assert.deepEqual(snapshot.tasks, valid.tasks);
    assert.deepEqual(snapshot.sessions, valid.sessions);
    assert.deepEqual(snapshot.settings, valid.settings);
    const duration = valid.sessions.reduce((sum, x) => sum + x.durationMs, 0);
    assert.equal(
      core.aggregate(snapshot, '2026-09-01', '2026-09-30', NOW).total,
      duration,
    );
    const corruptions = [
      (v) => v.subjects.push({ ...v.subjects[0] }),
      (v) => (v.subjects[0].id = 'id.invalid'),
      (v) => (v.subjects[0].name = ' '.repeat(80)),
      (v) => (v.subjects[0].color = 'expression(alert(1))'),
      (v) => (v.timer.elapsedMs = 1),
      (v) => (v.timer.startedAt = Number.NaN),
      (v) => (v.timer.runId = 'x'.repeat(101)),
      (v) => (v.settings.goal = 14),
      (v) => (v.settings.goal = 1441),
      (v) => (v.settings.goal = 20.5),
      (v) => v.tasks.push({ ...task('bad'), date: '2026-02-29' }),
      (v) => v.tasks.push({ ...task('bad'), subjectId: 'unknown' }),
      (v) => v.tasks.push({ ...task('bad'), title: 'x'.repeat(301) }),
      (v) => v.tasks.push({ ...task('bad'), done: 'false' }),
    ];
    if (valid.sessions.length)
      corruptions.push(
        (v) => v.sessions[0].durationMs++,
        (v) => v.sessions[0].end--,
      );
    const nonzero = valid.sessions.findIndex((x) => x.durationMs > 0);
    if (nonzero >= 0)
      corruptions.push((v) =>
        v.sessions.push({ ...v.sessions[nonzero], id: 'overlap' }),
      );
    for (const [index, change] of corruptions.entries()) {
      const bad = structuredClone(valid);
      change(bad);
      assert.throws(
        () => core.validateState(bad),
        undefined,
        `seed=${seed} case=${caseId} corruption=${index}`,
      );
    }
  }
  // Inclusive schema limits and safe timestamp/duration boundaries. No maximum-size strings.
  const s = core.newState(NOW);
  s.subjects = Array.from({ length: core.LIMITS.subjects }, (_, i) => ({
    id: `s${i}`,
    name: `S${i}`,
    color: '#abcdef',
  }));
  s.timer.subjectId = 's0';
  assert.equal(core.validateState(s).subjects.length, core.LIMITS.subjects);
  assert.throws(() =>
    core.validateState({
      ...s,
      subjects: [
        ...s.subjects,
        { id: 'overflow', name: 'Overflow', color: '#abcdef' },
      ],
    }),
  );
  s.tasks = Array.from({ length: core.LIMITS.tasks }, (_, i) => ({
    ...task(`t${i}`),
    subjectId: 's0',
  }));
  assert.equal(core.validateState(s).tasks.length, core.LIMITS.tasks);
  assert.throws(() =>
    core.validateState({
      ...s,
      tasks: [...s.tasks, { ...task('overflow'), subjectId: 's0' }],
    }),
  );
  for (const duration of [
    366 * 86400000 - 1,
    366 * 86400000,
    366 * 86400000 + 1,
    367 * 86400000,
  ]) {
    s.sessions = [
      {
        id: 'limit',
        runId: 'old',
        subjectId: 's0',
        start: 0,
        end: duration,
        durationMs: duration,
      },
    ];
    assert.equal(core.validateState(s).sessions[0].durationMs, duration);
  }
  s.sessions[0].end = 8640000000000001;
  s.sessions[0].durationMs = s.sessions[0].end;
  assert.throws(() => core.validateState(s));
}

for (const seed of SEEDS) {
  timerModel(seed);
  generatedBackups(seed);
}
for (const zone of [
  'UTC',
  'Asia/Singapore',
  'America/New_York',
  'Europe/Paris',
  'Australia/Lord_Howe',
  'Pacific/Apia',
  'America/Santiago',
]) {
  const result = spawnSync(
    process.execPath,
    [
      '--max-old-space-size=256',
      fileURLToPath(new URL('./stress-timezones.mjs', import.meta.url)),
      ...SEEDS.map(String),
    ],
    {
      env: { ...process.env, TZ: zone },
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    },
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);
  console.log(result.stdout.trim());
}
console.log(
  'PASS: 1,800 modelled timer actions, 144 generated backup/corruption cases and independent minute-counting oracles in seven timezones.',
);
