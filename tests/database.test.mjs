import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { newState } from '../study/core.mjs';
const db = new PGlite();
await db.exec(
  `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`,
);
const a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222',
  c = '33333333-3333-4333-8333-333333333333';
await db.query('insert into auth.users values ($1),($2),($3)', [a, b, c]);
const legacyRow = newState();
delete legacyRow.learning;
await db.exec(
  'create table public.ruang_workspaces(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb not null,revision bigint not null default 1 check(revision>0),updated_at timestamptz not null default now())',
);
await db.query(
  'insert into public.ruang_workspaces(user_id,data) values($1,$2::jsonb)',
  [c, JSON.stringify(legacyRow)],
);
const sql = await fs.readFile(
  new URL('../supabase-schema.sql', import.meta.url),
  'utf8',
);
await db.exec(sql);
await db.exec(sql);
const asUser = async (id, role = 'authenticated') => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role ' + role);
};
const save = (data, rev, user = a) =>
  db.query(
    'select public.save_ruang_workspace($1::jsonb,$2::bigint,$3::uuid) as revision',
    [JSON.stringify(data), rev, user],
  );
await asUser(c);
assert.equal(
  (await db.query('select data from public.ruang_workspaces')).rows[0].data
    .learning,
  undefined,
);
await assert.rejects(() => save(legacyRow, 1, c), /INVALID_DATA/);
assert.equal((await save(newState(), 1, c)).rows[0].revision, 2);
await asUser(a);
const state = newState();
assert.equal((await save(state, 0)).rows[0].revision, 1);
await assert.rejects(
  () => db.query('update public.ruang_workspaces set revision=99'),
  /permission denied/,
);
await assert.rejects(
  () =>
    db.query(
      'insert into public.ruang_workspaces(user_id,data) values ($1,$2)',
      [b, '{}'],
    ),
  /permission denied/,
);
await assert.rejects(() => save(state, 0), /CLOUD_CONFLICT/);
await assert.rejects(() => save(state, 1, b), /ACCOUNT_CHANGED/);
await assert.rejects(() => save({ ...state, tasks: {} }, 1), /INVALID_DATA/);
await assert.rejects(
  () =>
    save(
      {
        ...state,
        learning: { ...state.learning, notes: Array(2001).fill({}) },
      },
      1,
    ),
  /INVALID_DATA/,
);
await assert.rejects(
  () => save({ ...state, large: 'x'.repeat(4 * 1024 * 1024) }, 1),
  /CAPACITY/,
);
assert.equal((await save(state, 1)).rows[0].revision, 2);
const race = await Promise.allSettled([save(state, 2), save(state, 2)]);
assert.equal(race.filter((x) => x.status === 'fulfilled').length, 1);
await asUser(b);
assert.equal(
  (await db.query('select * from public.ruang_workspaces')).rows.length,
  0,
);
assert.equal((await save(state, 0, b)).rows[0].revision, 1);
await asUser(a);
assert.equal(
  (await db.query('select revision from public.ruang_workspaces')).rows[0]
    .revision,
  3,
);
await asUser('', 'anon');
await assert.rejects(
  () => db.query('select * from public.ruang_workspaces'),
  /permission denied/,
);
await assert.rejects(() => save(state, 2), /permission denied/);
await asUser('');
await assert.rejects(() => save(state, 2), /AUTH_REQUIRED/);
await db.close();
console.log(
  'PASS: PostgreSQL migration rerun, two-account RLS, anonymous/direct-write denial, ownership, CAS and shape/capacity guards. Supabase provider/JWT transport is not part of this embedded test.',
);
