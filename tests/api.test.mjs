import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { newState } from '../study/core.mjs';
process.env.AUTH_COOKIE_SECRET = 'fixture-secret-for-isolated-api-tests-only';
const require = createRequire(import.meta.url),
  auth = require('../api/auth.js'),
  workspace = require('../api/workspace.js');
let currentId = '11111111-1111-4111-8111-111111111111',
  revision = 0,
  doc = null,
  conflict = false;
const paths = [];
globalThis.fetch = async (url, options) => {
  paths.push({ url, options });
  if (url.includes('/auth/v1/token'))
    return Response.json({
      access_token: 'fixture-access',
      refresh_token: 'fixture-refresh',
      expires_in: 3600,
      user: { id: currentId, email: 'fixture@example.invalid' },
    });
  if (url.includes('/auth/v1/user'))
    return Response.json({ id: currentId, email: 'fixture@example.invalid' });
  if (url.includes('/rpc/')) {
    if (conflict)
      return Response.json({ message: 'CLOUD_CONFLICT' }, { status: 409 });
    const body = JSON.parse(options.body);
    doc = body.p_data;
    revision++;
    assert.equal(body.p_expected_user_id, currentId);
    return Response.json(revision);
  }
  return Response.json(
    doc ? [{ data: doc, revision, updated_at: '2026-10-21T00:00:00Z' }] : [],
  );
};
async function request(
  handler,
  body,
  { cookie = '', origin = 'http://127.0.0.1:9999', method = 'POST' } = {},
) {
  const headers = {},
    req = {
      method,
      headers: {
        host: '127.0.0.1:9999',
        origin,
        'content-type': 'application/json',
        cookie,
      },
      body: JSON.stringify(body),
    },
    res = {
      statusCode: 200,
      setHeader: (k, v) => (headers[k] = v),
      end: (value) => (res.body = JSON.parse(value)),
    };
  await handler(req, res);
  return { ...res, headers };
}
assert.equal((await request(workspace, { action: 'read' })).statusCode, 401);
assert.equal(
  (
    await request(
      workspace,
      { action: 'read' },
      { origin: 'https://other.invalid' },
    )
  ).statusCode,
  403,
);
const login = await request(auth, {
  action: 'sign-in',
  email: 'fixture@example.invalid',
  password: 'fixture-password',
});
assert.equal(login.statusCode, 200);
const cookie = login.headers['Set-Cookie'].split(';')[0];
assert.ok(login.headers['Set-Cookie'].includes('HttpOnly'));
assert.ok(!JSON.stringify(login.body).includes('fixture-access'));
const read = await request(
  workspace,
  { action: 'read', expectedUserId: currentId },
  { cookie },
);
assert.equal(read.body.revision, 0);
assert.equal(read.body.context.userId, currentId);
assert.ok(
  paths.at(-1).url.includes('ruang_workspaces?user_id=eq.' + currentId),
);
const saved = await request(
  workspace,
  { action: 'save', data: newState(), revision: 0, expectedUserId: currentId },
  { cookie },
);
assert.equal(saved.body.revision, 1);
assert.equal(doc.version, 3);
assert.equal(doc.academic.completed.length, 0);
assert.equal(
  (
    await request(
      workspace,
      {
        action: 'save',
        data: { version: 3 },
        revision: 1,
        expectedUserId: currentId,
      },
      { cookie },
    )
  ).statusCode,
  400,
);
const legacyClient = newState();
delete legacyClient.learning;
const rejectedLegacy = await request(
  workspace,
  {
    action: 'save',
    data: legacyClient,
    revision: 1,
    expectedUserId: currentId,
  },
  { cookie },
);
assert.equal(rejectedLegacy.statusCode, 409);
assert.equal(rejectedLegacy.body.key, 'learn.updateRequired');
const probe = await request(
  workspace,
  { action: 'revision', expectedUserId: currentId },
  { cookie },
);
assert.equal(probe.body.revision, 1);
assert.equal(probe.body.data, undefined);
assert.ok(paths.at(-1).url.endsWith('select=revision'));
conflict = true;
const raced = await request(
  workspace,
  { action: 'save', data: newState(), revision: 1, expectedUserId: currentId },
  { cookie },
);
assert.equal(raced.statusCode, 409);
assert.equal(raced.body.code, 'CLOUD_CONFLICT');
conflict = false;
const wrong = await request(
  workspace,
  { action: 'read', expectedUserId: 'another-account' },
  { cookie },
);
assert.equal(wrong.statusCode, 409);
assert.equal(wrong.body.code, 'ACCOUNT_CHANGED');
assert.equal(
  (await request(workspace, { action: 'read' }, { cookie: cookie + 'broken' }))
    .statusCode,
  401,
);
assert.equal(
  (
    await request(
      workspace,
      { action: 'save', revision: 0, data: 'x'.repeat(4 * 1024 * 1024) },
      { cookie },
    )
  ).statusCode,
  413,
);
console.log(
  'PASS: HttpOnly auth, no exposed tokens, server account isolation, origin guard, validated v3 saves, revision conflicts, tampered cookies and 4 MiB cloud limit.',
);
