// Invoked in an isolated process by stress.test.mjs. No browser storage or network.
import assert from 'node:assert/strict';
import {
  aggregate,
  newState,
  sessionParts,
  validateState,
} from '../study/core.mjs';

const seeds = process.argv.slice(2).map(Number);
const zone = process.env.TZ;
const format = new Intl.DateTimeFormat('en-CA', {
  timeZone: zone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const label = (t) => {
  const p = Object.fromEntries(
    format.formatToParts(t).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
};
const random = (seed) => {
  let value = seed >>> 0;
  return (max) => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) % max;
  };
};
const MINUTE = 60000;
let samples = 0,
  cases = 0;

// The input intervals are aligned to UTC minutes. Every tested zone's modern
// offset and date boundary is minute-aligned. Counting these disjoint minutes
// through Intl is independent of core's local-midnight boundary calculation.
function oracle(start, end, from = '0001-01-01', to = '9999-12-31') {
  const days = {};
  let total = 0;
  for (let t = start; t < end; t += MINUTE) {
    const key = label(t),
      ms = Math.min(MINUTE, end - t);
    samples++;
    if (key >= from && key <= to) {
      days[key] = (days[key] || 0) + ms;
      total += ms;
    }
  }
  return { days, total };
}
function fixture(start, end) {
  const s = newState(Date.UTC(2026, 0, 1));
  s.subjects = [{ id: 'fixture', name: 'Timezone fixture', color: '#abcdef' }];
  s.timer.subjectId = 'fixture';
  s.sessions = [
    {
      id: 'segment',
      runId: 'run',
      subjectId: 'fixture',
      start,
      end,
      durationMs: end - start,
    },
  ];
  return s;
}
function verify(start, end, description) {
  cases++;
  const expected = oracle(start, end),
    s = fixture(start, end),
    dates = Object.keys(expected.days).sort();
  assert.ok(dates.length, description);
  assert.equal(validateState(s).sessions.length, 1);
  const parts = sessionParts(s.sessions[0]);
  let previous = start;
  for (const p of parts) {
    assert.equal(p.start, previous, description);
    assert.ok(p.end > p.start, description);
    assert.equal(p.ms, p.end - p.start, description);
    assert.equal(p.date, label(p.start), description);
    assert.equal(p.date, label(p.end - 1), description);
    previous = p.end;
  }
  assert.equal(previous, end, description);
  const combined = aggregate(s, dates[0], dates.at(-1), end);
  assert.equal(combined.total, end - start, description);
  assert.deepEqual({ ...combined.days }, expected.days, description);
  assert.equal(combined.count, 1, description);
  assert.equal(combined.max, end - start, description);
  let dailyTotal = 0;
  for (const date of dates) {
    const daily = aggregate(s, date, date, end);
    assert.equal(daily.total, expected.days[date], `${description}: ${date}`);
    assert.equal(daily.max, daily.total, description);
    dailyTotal += daily.total;
  }
  assert.equal(
    dailyTotal,
    combined.total,
    `${description}: disjoint daily ranges must conserve time`,
  );
  // Metamorphic clipping: the whole interval equals its two disjoint halves.
  const middle = start + Math.floor((end - start) / MINUTE / 2) * MINUTE;
  const clipped = [
    ...sessionParts(s.sessions[0], start, middle),
    ...sessionParts(s.sessions[0], middle, end),
  ];
  assert.equal(
    clipped.reduce((sum, p) => sum + p.ms, 0),
    end - start,
    description,
  );
}

const transitions = {
  UTC: [['2026-02-28T23:00:00Z', '2026-03-01T02:00:00Z']],
  'Asia/Singapore': [['2026-12-31T15:00:00Z', '2026-12-31T17:00:00Z']],
  'America/New_York': [
    ['2026-03-08T05:00:00Z', '2026-03-09T04:00:00Z'],
    ['2026-11-01T04:00:00Z', '2026-11-02T05:00:00Z'],
  ],
  'Europe/Paris': [
    ['2026-03-28T23:00:00Z', '2026-03-29T22:00:00Z'],
    ['2026-10-24T22:00:00Z', '2026-10-25T23:00:00Z'],
  ],
  'Australia/Lord_Howe': [
    ['2026-04-04T13:00:00Z', '2026-04-05T14:00:00Z'],
    ['2026-10-03T13:00:00Z', '2026-10-04T14:00:00Z'],
  ],
  'Pacific/Apia': [
    ['2026-01-01T10:00:00Z', '2026-01-02T12:00:00Z'],
    ['2011-12-29T10:00:00Z', '2011-12-31T10:00:00Z'],
  ],
  'America/Santiago': [
    ['2026-09-07T02:30:00Z', '2026-09-07T03:30:00Z'],
    ['2026-09-06T03:00:00Z', '2026-09-07T05:00:00Z'],
  ],
};
for (const [start, end] of transitions[zone] || [])
  verify(Date.parse(start), Date.parse(end), `${zone}: ${start}..${end}`);
for (const seed of seeds) {
  const next = random(seed);
  const anchors = [
    Date.UTC(2024, 1, 28),
    Date.UTC(2026, 2, 7),
    Date.UTC(2026, 8, 5),
    Date.UTC(2026, 9, 24),
    Date.UTC(2026, 11, 30),
  ];
  for (let i = 0; i < 12; i++) {
    const start = anchors[next(anchors.length)] + next(4320) * MINUTE,
      end = start + (1 + next(2880)) * MINUTE;
    verify(
      start,
      end,
      `${zone}: seed=${seed} case=${i} start=${start} end=${end}`,
    );
  }
}
console.log(
  JSON.stringify({
    result: 'PASS',
    zone,
    seeds,
    cases,
    oracleMinutes: samples,
  }),
);
