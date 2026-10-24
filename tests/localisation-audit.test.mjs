import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { decodeImport } from '../study/migration.mjs';
import { LocalisedError, LANGUAGES, setLocale, t } from '../study/i18n.mjs';
import { requestJSON } from '../study/http.mjs';
import { validateForm } from '../study/forms.mjs';

assert.throws(
  () => decodeImport('{'),
  (error) => error instanceof LocalisedError,
  'Malformed imports must show a translated message',
);

process.env.AUTH_COOKIE_SECRET = 'localisation-audit-fixture-secret-123456789';
const require = createRequire(import.meta.url),
  auth = require('../api/auth.js');
async function request(body) {
  const req = {
    method: 'POST',
    headers: {
      host: 'localhost:9999',
      origin: 'http://localhost:9999',
      'content-type': 'application/json',
    },
    body,
  };
  const res = {
    setHeader() {},
    end(value) {
      this.body = JSON.parse(value);
    },
  };
  await auth(req, res);
  return res;
}
globalThis.fetch = async () =>
  Response.json({ code: 'invalid_credentials' }, { status: 400 });
assert.equal(
  (
    await request({
      action: 'sign-in',
      email: 'a@example.invalid',
      password: 'fixture',
    })
  ).body.key,
  'error.authCredentials',
  'API errors must carry a stable translation key',
);
assert.equal(
  (await request('{')).body.key,
  'http.invalid',
  'Malformed JSON must be reported as invalid input',
);
assert.equal(
  (await request({ action: 'sign-in', email: 'invalid', password: 'fixture' }))
    .body.key,
  'http.email',
);
console.log(
  'PASS: account errors carry translation keys, including invalid JSON and invalid fields.',
);

for (const { code } of LANGUAGES) {
  setLocale(code, { persist: false });
  globalThis.fetch = async () =>
    Response.json(
      {
        error: 'Email atau kata sandi tidak sesuai.',
        key: 'error.authCredentials',
      },
      { status: 400 },
    );
  await assert.rejects(
    requestJSON('/api/auth', {}),
    (error) => error.message === t('error.authCredentials'),
  );
  globalThis.fetch = async () =>
    Response.json(
      { error: 'Raw server failure', key: 'unknown' },
      { status: 503 },
    );
  await assert.rejects(
    requestJSON('/api/auth', {}),
    (error) => error.message === t('http.request'),
  );
  globalThis.fetch = async () => {
    throw Error('Raw network failure');
  };
  await assert.rejects(
    requestJSON('/api/auth', {}),
    (error) => error.message === t('error.cloudNetwork'),
  );
  const field = {
    tagName: 'INPUT',
    name: 'date',
    value: '',
    type: 'text',
    required: false,
    minLength: -1,
    maxLength: -1,
    matches: () => true,
    removeAttribute() {},
  };
  assert.doesNotThrow(
    () => validateForm({ elements: [field] }),
    'An empty optional date is allowed',
  );
  Object.assign(field, {
    name: 'score-PU',
    type: 'number',
    value: '-1',
    matches: () => false,
    validity: { rangeUnderflow: true },
    setAttribute() {},
    focus() {},
  });
  assert.throws(
    () => validateForm({ elements: [field] }),
    (error) => error.message === t('validation.number'),
  );
}
console.log(
  'PASS: translated API/network/import errors and optional-date/number validation in all six locales.',
);
