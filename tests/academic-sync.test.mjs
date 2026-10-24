import assert from 'node:assert/strict';
import { newState } from '../study/core.mjs';
import { documentOf, mergeDocuments } from '../study/sync.mjs';
const base = documentOf(newState(), 'id-ID'),
  a = structuredClone(base),
  b = structuredClone(base);
a.academic.progress['math-4'][0] = true;
b.academic.progress['math-4'][2] = true;
a.academic.profile.name = 'Nama';
b.academic.profile.major = 'Jurusan';
a.academic.completed.push('2-0');
b.academic.completed.push('2-1');
a.academic.dates['2-0'] = '2026-10-21';
b.academic.dates['2-1'] = '2026-10-22';
const merged = mergeDocuments(base, a, b);
assert.deepEqual(merged.academic.progress['math-4'], [true, false, true]);
assert.equal(merged.academic.profile.name, 'Nama');
assert.equal(merged.academic.profile.major, 'Jurusan');
assert.deepEqual(new Set(merged.academic.completed), new Set(['2-0', '2-1']));
assert.equal(merged.academic.dates['2-1'], '2026-10-22');
const c = structuredClone(base),
  d = structuredClone(base);
c.academic.startDate = '2026-10-21';
d.academic.startDate = '2026-10-22';
assert.throws(
  () => mergeDocuments(base, c, d),
  (error) => error.key === 'sync.conflict',
);
const score = (id) => ({
  id,
  date: '2026-10-21',
  platform: 'Platform',
  scores: Object.fromEntries(
    ['PU', 'PBM', 'PPU', 'PK', 'LBI', 'LBE', 'PM'].map((c) => [c, 650]),
  ),
});
const e = structuredClone(base),
  f = structuredClone(base);
e.academic.tryouts.push(score('first'));
f.academic.tryouts.push(score('second'));
assert.equal(mergeDocuments(base, e, f).academic.tryouts.length, 2);
const g = structuredClone(base);
g.academic.tryouts.push(score('first'));
const h = structuredClone(g),
  i = structuredClone(g);
h.academic.tryouts = [];
i.academic.tryouts[0].platform = 'Changed';
assert.throws(() => mergeDocuments(g, h, i));
console.log(
  'PASS: independent material stages, profile fields, completions, dates and tryouts merge; same-field changes and delete/edit races require a conflict choice.',
);
