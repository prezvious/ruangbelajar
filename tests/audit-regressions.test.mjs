import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { newState } from '../study/core.mjs';
import { mergeWorkspaces } from '../study/guest-import.mjs';
import { getThemeTokens } from '../study/themes.mjs';
import { createAcademicUI } from '../study/academic-ui.mjs';
import { applyAcademicDraft } from '../study/academic-model.mjs';

test('import preserves distinct long subject IDs when both collide with target records', () => {
  const target = newState(),
    source = newState(),
    ids = ['x'.repeat(99) + 'a', 'x'.repeat(99) + 'b'];
  target.subjects = ids.map((id, i) => ({
    id,
    name: 'Old ' + i,
    color: '#123456',
    archived: false,
  }));
  source.subjects = ids.map((id, i) => ({
    id,
    name: 'Imported ' + i,
    color: '#123456',
    archived: false,
  }));
  source.tasks = ids.map((subjectId, i) => ({
    id: 'task' + i,
    subjectId,
    title: 'Task ' + i,
    date: '2026-10-22',
    done: false,
  }));
  const result = mergeWorkspaces(target, source, 'a'.repeat(64));
  assert.equal(result.subjects.length, 4);
  assert.notEqual(result.tasks[0].subjectId, result.tasks[1].subjectId);
});
test('import preserves distinct long tryout IDs instead of dropping the second record', () => {
  const target = newState(),
    source = newState(),
    ids = ['x'.repeat(99) + 'a', 'x'.repeat(99) + 'b'];
  const record = (id, platform) => ({
    id,
    platform,
    date: '2026-10-22',
    scores: Object.fromEntries(
      ['PU', 'PBM', 'PPU', 'PK', 'LBI', 'LBE', 'PM'].map((c) => [c, 650]),
    ),
  });
  target.academic.tryouts = ids.map((id) => record(id, 'Old'));
  source.academic.tryouts = ids.map((id) => record(id, 'Imported'));
  assert.equal(
    mergeWorkspaces(target, source, 'a'.repeat(64)).academic.tryouts.length,
    4,
  );
});
test('generated import IDs never alias a different original subject or study run', () => {
  const target = newState(),
    source = newState(),
    prefix = 'import_aaaaaaaaaaaaaaaa_';
  target.subjects = [
    { id: 's', name: 'Existing', color: '#123456', archived: false },
  ];
  source.subjects = [
    { id: 's', name: 'Incoming', color: '#123456', archived: false },
    { id: prefix + 's', name: 'Incoming', color: '#123456', archived: false },
  ];
  assert.equal(
    mergeWorkspaces(target, source, 'a'.repeat(64)).subjects.length,
    3,
  );
  source.subjects = structuredClone(target.subjects);
  target.sessions = [
    {
      id: 'old',
      runId: 'run',
      subjectId: 's',
      start: 1000,
      end: 2000,
      durationMs: 1000,
    },
  ];
  source.sessions = [
    {
      id: 'first',
      runId: 'run',
      subjectId: 's',
      start: 3000,
      end: 4000,
      durationMs: 1000,
    },
    {
      id: 'second',
      runId: prefix + 'run',
      subjectId: 's',
      start: 5000,
      end: 6000,
      durationMs: 1000,
    },
  ];
  assert.equal(
    new Set(
      mergeWorkspaces(target, source, 'a'.repeat(64)).sessions.map(
        (x) => x.runId,
      ),
    ).size,
    3,
  );
});
test('planned civil dates are independent of skipped days in the device timezone', () => {
  const script =
    "import {civilDate,agendaDate,newAcademic} from './study/academic-model.mjs';const a=newAcademic();a.startDate='2011-12-29';console.log(JSON.stringify([civilDate('2011-12-30'),agendaDate(a,'1-1'),agendaDate(a,'1-2')]));";
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    { env: { ...process.env, TZ: 'Pacific/Apia' }, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [
    true,
    '2011-12-30',
    '2011-12-31',
  ]);
});
test('the chosen Ruang palette changes its accent in dark mode', () => {
  const colors = ['olive', 'ocean', 'terracotta', 'plum'].map(
    (key) => getThemeTokens(key, 'dark').accentMain,
  );
  assert.equal(new Set(colors).size, 4);
});
test('finite imported exam scores produce a finite average and valid SVG coordinates', () => {
  const state = newState();
  state.academic.tryouts = [
    {
      id: 'large',
      date: '2026-10-22',
      platform: 'Large',
      scores: Object.fromEntries(
        ['PU', 'PBM', 'PPU', 'PK', 'LBI', 'LBE', 'PM'].map((code) => [
          code,
          1e308,
        ]),
      ),
    },
  ];
  const original = globalThis.document;
  globalThis.document = { addEventListener() {} };
  try {
    const ui = createAcademicUI({ state: () => state, icon: () => '' });
    const html = ui.render('tryout');
    assert.doesNotMatch(html, /NaN|Infinity|∞/);
  } finally {
    if (original === undefined) delete globalThis.document;
    else globalThis.document = original;
  }
});
test('academic editors merge independent changes and reject same-field overwrites', () => {
  const original = { name: 'Old', major: 'Old major' },
    remote = { name: 'Old', major: 'New major' };
  assert.deepEqual(
    applyAcademicDraft(remote, original, {
      name: 'New name',
      major: 'Old major',
    }),
    { name: 'New name', major: 'New major' },
  );
  assert.throws(
    () => applyAcademicDraft({ name: 'Remote' }, original, { name: 'Local' }),
    (e) => e.key === 'error.tabConflict',
  );
  const before = { scores: { PK: 600, PM: 600 } },
    other = { scores: { PK: 600, PM: 700 } };
  assert.deepEqual(
    applyAcademicDraft(other, before, { scores: { PK: 650, PM: 600 } }),
    { scores: { PK: 650, PM: 700 } },
  );
});
test('sign-in cannot report success when the follow-up session is unauthenticated', async () => {
  const originalFetch = globalThis.fetch,
    originalStorage = globalThis.localStorage;
  const map = new Map();
  globalThis.localStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
  globalThis.fetch = async (path, options) =>
    Response.json(
      JSON.parse(options.body).action === 'sign-in'
        ? { user: { id: 'A', email: 'a@example.invalid' } }
        : { user: null, project: 'https://fixture.supabase.co' },
    );
  try {
    const cloud = await import('../study/cloud.mjs?audit-signin');
    await assert.rejects(
      cloud.authenticate('a@example.invalid', 'fixture-password', 'login'),
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});
test('large imports preserve ten thousand independent time records', () => {
  const source = newState();
  source.subjects = [
    { id: 'study', name: 'Study', color: '#123456', archived: false },
  ];
  source.sessions = Array.from({ length: 10000 }, (_, i) => ({
    id: 'session-' + i,
    runId: 'run-' + i,
    subjectId: 'study',
    start: 1600000000000 + i * 2000,
    end: 1600000000000 + i * 2000 + 1000,
    durationMs: 1000,
  }));
  const result = mergeWorkspaces(newState(), source, 'large-import');
  assert.equal(result.sessions.length, 10000);
  assert.equal(new Set(result.sessions.map((x) => x.runId)).size, 10000);
});
test('malformed auth responses do not silently sign out a cached account', async () => {
  const originalFetch = globalThis.fetch,
    originalStorage = globalThis.localStorage,
    map = new Map([
      [
        'ruang.account.identity.v1',
        JSON.stringify({
          user: { id: 'A', email: 'a@example.invalid' },
          project: 'https://fixture.supabase.co',
          expiresAt: Date.now() + 60000,
        }),
      ],
    ]);
  globalThis.localStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
  globalThis.fetch = async () => Response.json({});
  try {
    const cloud = await import('../study/cloud.mjs?audit-malformed');
    const first = await new Promise((resolve) => cloud.watchAuth(resolve));
    assert.equal(first.user?.id, 'A');
    assert.equal(first.event, 'CACHED_SESSION');
    assert.ok(map.has('ruang.account.identity.v1'));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});
test('offline identity hints expire and a confirmed sign-out clears them', async () => {
  const originalFetch = globalThis.fetch,
    originalStorage = globalThis.localStorage;
  try {
    for (const [variant, expiresAt] of [
      ['expired', Date.now() - 1000],
      ['signed-out', Date.now() + 60000],
    ]) {
      const map = new Map([
        [
          'ruang.account.identity.v1',
          JSON.stringify({
            user: { id: 'A' },
            project: 'https://fixture.supabase.co',
            expiresAt,
          }),
        ],
      ]);
      globalThis.localStorage = {
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, value) => map.set(key, value),
        removeItem: (key) => map.delete(key),
      };
      globalThis.fetch = async () => {
        if (variant === 'expired') throw TypeError('Offline fixture');
        return Response.json({
          user: null,
          project: 'https://fixture.supabase.co',
        });
      };
      const cloud = await import('../study/cloud.mjs?audit-hint-' + variant),
        first = await new Promise((resolve) => cloud.watchAuth(resolve));
      assert.equal(first.user, null);
      if (variant === 'signed-out')
        assert.equal(map.has('ruang.account.identity.v1'), false);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});
