import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { newState } from '../study/core.mjs';
process.env.AUTH_COOKIE_SECRET = 'isolated-api-audit-fixture-secret-only';
const require = createRequire(import.meta.url),
  auth = require('../api/auth.js'),
  workspace = require('../api/workspace.js'),
  id = '11111111-1111-4111-8111-111111111111';
let mode = 'valid';
globalThis.fetch = async (url) => {
  if (url.includes('/auth/v1/token'))
    return Response.json({
      access_token: 'fixture',
      refresh_token: 'fixture-refresh',
      expires_in: 3600,
      user: { id, email: 'fixture@example.invalid' },
    });
  if (url.includes('/auth/v1/user'))
    return Response.json({ id, email: 'fixture@example.invalid' });
  if (url.includes('/rpc/'))
    return Response.json(mode === 'invalid-write' ? null : 1);
  return Response.json(mode === 'invalid-read' ? null : []);
};
async function request(handler, body, cookie = '') {
  const headers = {},
    req = {
      method: 'POST',
      headers: {
        host: '127.0.0.1:9999',
        origin: 'http://127.0.0.1:9999',
        'content-type': 'application/json',
        cookie,
      },
      body,
    },
    res = {
      statusCode: 200,
      setHeader: (k, v) => (headers[k] = v),
      end: (value) => (res.body = JSON.parse(value)),
    };
  await handler(req, res);
  return { ...res, headers };
}
const login = await request(auth, {
    action: 'sign-in',
    email: 'fixture@example.invalid',
    password: 'fixture-password',
  }),
  cookie = login.headers['Set-Cookie'].split(';')[0];
test('workspace calls require the intended account even with a valid cookie', async () => {
  const response = await request(
    workspace,
    { action: 'save', revision: 0, data: newState() },
    cookie,
  );
  assert.equal(response.statusCode, 409);
  assert.equal(response.body.code, 'ACCOUNT_CHANGED');
});
test('an invalid successful read is not treated as a missing cloud workspace', async () => {
  mode = 'invalid-read';
  const response = await request(
    workspace,
    { action: 'read', expectedUserId: id },
    cookie,
  );
  assert.equal(response.statusCode, 502);
});
test('an invalid successful RPC result is not reported as an acknowledged save', async () => {
  mode = 'invalid-write';
  const response = await request(
    workspace,
    { action: 'save', revision: 0, data: newState(), expectedUserId: id },
    cookie,
  );
  assert.equal(response.statusCode, 502);
});
