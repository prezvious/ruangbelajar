import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';

const server = spawn(
  process.execPath,
  [
    '--import',
    new URL('./http-fixture.mjs', import.meta.url).href,
    'dev-server.js',
  ],
  {
    env: {
      ...process.env,
      PORT: '5203',
      AUTH_COOKIE_SECRET: 'isolated-http-fixture-secret-only',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  },
);
let stderr = '';
server.stderr.on('data', (chunk) => (stderr += chunk));
try {
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('5203')) resolve();
    });
    server.once('error', reject);
    server.once('exit', (code) =>
      reject(Error('Test server exited ' + code + ': ' + stderr)),
    );
  });
  for (const name of ['Élodie Martin', 'Anna 😊 Smith']) {
    const body = Buffer.from(
      JSON.stringify({
        action: 'sign-up',
        email: 'fixture@example.invalid',
        password: 'fixture-password',
        fullName: name,
      }),
    );
    const split =
      body.indexOf(Buffer.from(name.includes('😊') ? '😊' : 'É')) + 1;
    const result = await new Promise((resolve, reject) => {
      const req = http.request(
        'http://127.0.0.1:5203/api/auth',
        {
          method: 'POST',
          headers: {
            Origin: 'http://127.0.0.1:5203',
            'Content-Type': 'application/json',
            'Content-Length': body.length,
          },
        },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () =>
            resolve({ status: res.statusCode, body: JSON.parse(data) }),
          );
        },
      );
      req.on('error', reject);
      req.flushHeaders();
      req.write(body.subarray(0, split));
      setTimeout(() => req.end(body.subarray(split)), 100);
    });
    assert.equal(result.status, 200);
    assert.equal(
      result.body.user.fullName,
      name,
      'UTF-8 characters split across network chunks must be preserved',
    );
  }
  async function rawRequest(body) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        'http://127.0.0.1:5203/api/auth',
        {
          method: 'POST',
          headers: {
            Origin: 'http://127.0.0.1:5203',
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => (text += chunk));
          res.on('end', () =>
            resolve({ status: res.statusCode, body: JSON.parse(text) }),
          );
        },
      );
      req.on('error', reject);
      req.end(body);
    });
  }
  const invalid = await rawRequest(Buffer.from([0xff]));
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.key, 'http.invalid');
  await new Promise((resolve) => {
    const req = http.request('http://127.0.0.1:5203/api/auth', {
      method: 'POST',
      headers: {
        Origin: 'http://127.0.0.1:5203',
        'Content-Type': 'application/json',
        'Content-Length': 10000,
      },
    });
    req.on('error', () => resolve());
    req.on('close', resolve);
    req.write('{');
    setTimeout(() => req.destroy(), 100);
  });
  assert.equal(
    (await rawRequest('{"action":"session"}')).status,
    200,
    'An interrupted upload must not terminate the server',
  );
  console.log(
    'PASS: split UTF-8 names are preserved, malformed encoding is rejected, and the local HTTP server survives interrupted uploads.',
  );
} finally {
  server.kill();
}
