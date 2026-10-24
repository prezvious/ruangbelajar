import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const { chromium } = await (process.argv[2]
  ? import(pathToFileURL(process.argv[2]).href)
  : import('@playwright/test'));
const server = spawn(process.execPath, ['dev-server.js'], {
  env: {
    ...process.env,
    PORT: '5198',
    AUTH_COOKIE_SECRET: 'isolated-account-fixture-secret-only',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
await new Promise((resolve, reject) => {
  server.stdout.on('data', (chunk) => {
    if (chunk.toString().includes('5198')) resolve();
  });
  server.once('error', reject);
  server.once('exit', (code) => reject(Error('Test server exited ' + code)));
});
let browser;
try {
  browser = await chromium.launch({
    channel:
      process.env.PW_CHANNEL ||
      (process.platform === 'win32' ? 'msedge' : undefined),
    headless: true,
  });
  const context = await browser.newContext(),
    errors = [];
  let user = null,
    row = null,
    signupFields;
  await context.addInitScript(() => {
    addEventListener(
      'DOMContentLoaded',
      () => {
        if (!['http:', 'https:'].includes(location.protocol)) return;
        import('/study/repository.mjs').then((m) => {
          window.__workspaceStore = m.workspaceStorage;
        });
      },
      { once: true },
    );
  });
  await context.route('https://fonts.googleapis.com/**', (route) =>
    route.abort(),
  );
  await context.route('**/api/auth', async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === 'sign-up') {
      signupFields = body;
      return route.fulfill({ json: { confirmationRequired: true } });
    }
    if (body.action === 'sign-in')
      user = { id: 'fixture-account', email: 'fixture@example.invalid' };
    if (body.action === 'sign-out') user = null;
    return route.fulfill({
      json: { user, project: 'https://ojltoroezahhqgktvygp.supabase.co' },
    });
  });
  await context.route('**/api/workspace', async (route) => {
    const body = route.request().postDataJSON(),
      context = {
        project: 'https://ojltoroezahhqgktvygp.supabase.co',
        userId: user?.id,
      };
    assert.equal(body.expectedUserId, user?.id);
    if (body.action === 'save') {
      if (body.revision !== (row?.revision || 0))
        return route.fulfill({ status: 409, json: { code: 'CLOUD_CONFLICT' } });
      row = { data: body.data, revision: (row?.revision || 0) + 1 };
      return route.fulfill({ json: { revision: row.revision, context } });
    }
    return route.fulfill({
      json: { ...(row || { data: null, revision: 0 }), context },
    });
  });
  await context.addInitScript(() => {
    if (!localStorage.getItem('fixture-seeded')) {
      localStorage.setItem(
        'ruang-belajar-v1',
        JSON.stringify({ week: 4, completed: ['2-0'] }),
      );
      localStorage.setItem(
        'ruang-belajar-tracker-v1',
        JSON.stringify({
          profile: { name: 'Pemilik data tamu' },
          progress: { 'math-4': [true, false, false] },
          tryouts: [],
        }),
      );
      localStorage.setItem('fixture-seeded', '1');
    }
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const url = 'http://127.0.0.1:5198';
  await page.goto(url + '/tracker?subject=PK');
  await page
    .locator('[data-action=academic-subject][data-id=PK][aria-pressed=true]')
    .waitFor();
  await page.locator('a[href="/tracker"]').first().click();
  await page
    .locator('[data-action=academic-subject][data-id=all][aria-pressed=true]')
    .waitFor();
  await page.goBack();
  await page
    .locator('[data-action=academic-subject][data-id=PK][aria-pressed=true]')
    .waitFor();
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  assert.equal(
    await page.evaluate(async () => document.activeElement.id),
    'main-content',
  );
  assert.equal(new URL(page.url()).hash, '');
  await page.goto(url + '/sign-up');
  await page.locator('#cloud-auth [name=fullName]').fill('Fixture User');
  await page
    .locator('#cloud-auth [name=email]')
    .fill('fixture@example.invalid');
  await page.locator('#cloud-auth [name=password]').fill('fixture-password');
  await page
    .locator('#cloud-auth [name=confirmation]')
    .fill('fixture-password');
  await page.locator('#cloud-auth [name=remember]').check();
  await page.locator('#header-language-select').selectOption('en-GB');
  assert.equal(
    await page.locator('#cloud-auth [name=remember]').isChecked(),
    true,
  );
  assert.equal(
    await page.locator('#cloud-auth [name=fullName]').inputValue(),
    'Fixture User',
  );
  await page.locator('#cloud-auth [type=submit]').click();
  await page.waitForFunction(() =>
    document
      .querySelector('#toast')
      .textContent.toLowerCase()
      .includes('email'),
  );
  assert.equal(signupFields.fullName, 'Fixture User');
  assert.equal(signupFields.remember, true);
  await page.goto(url + '/sign-in');
  await page
    .locator('#cloud-auth [name=email]')
    .fill('fixture@example.invalid');
  await page.locator('#cloud-auth [name=password]').fill('fixture-password');
  await page.locator('#cloud-auth [type=submit]').click();
  await page.waitForFunction(
    () =>
      document.querySelector('.account-email')?.textContent ===
      'fixture@example.invalid',
  );
  await page.waitForFunction(() =>
    document
      .querySelector('.sync-detail')
      ?.textContent.toLowerCase()
      .includes('saved'),
  );
  assert.equal(row.data.academic.profile.name, '');
  assert.equal(
    row.data.academic.completed.length,
    0,
    'Guest data must require explicit import',
  );
  await page.locator('[data-action=account-import]').click();
  await page.locator('#modal [type=submit]').click();
  await page.waitForFunction(
    () =>
      JSON.parse(
        window.__workspaceStore.getItem(
          'ruang.workspace.v3.ojltoroezahhqgktvygp.supabase.co.fixture-account',
        ),
      ).academic.profile.name === 'Pemilik data tamu',
  );
  await page.locator('[data-action=sync-now]').click();
  await page.waitForFunction(() =>
    document
      .querySelector('.sync-detail')
      ?.textContent.toLowerCase()
      .includes('saved'),
  );
  assert.equal(row.data.academic.profile.name, 'Pemilik data tamu');
  assert.deepEqual(row.data.academic.progress['math-4'], [true, false, false]);
  await page.locator('[data-action=cloud-out]').click();
  await page.locator('#cloud-auth').waitFor();
  const guest = await page.evaluate(async () =>
    JSON.parse(window.__workspaceStore.getItem('ruang.workspace.v3.guest')),
  );
  assert.equal(guest.academic.profile.name, 'Pemilik data tamu');
  await page.goto(url + '/sign-in');
  await page
    .locator('#cloud-auth [name=email]')
    .fill('fixture@example.invalid');
  await page.locator('#cloud-auth [name=password]').fill('fixture-password');
  await page.locator('#cloud-auth [type=submit]').click();
  await page.waitForFunction(() =>
    document
      .querySelector('.sync-detail')
      ?.textContent.toLowerCase()
      .includes('saved'),
  );
  await page.goto(url + '/pengaturan');
  await page.locator('[data-action="learn-storage"]').click();
  await page.locator('#modal [data-action="learn-forget"]').waitFor();
  await page.locator('#modal [data-action="learn-forget"]').click();
  await page.locator('#modal button[type=submit]').click();
  await page.waitForFunction(
    () =>
      window.__workspaceStore.getItem(
        'ruang.workspace.v3.ojltoroezahhqgktvygp.supabase.co.fixture-account',
      ) === null,
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: real-browser legacy Ruang migration, localised signup with full name/remember drafts, sign-in, HttpOnly transport fixtures, explicit academic guest import, cloud save, sign-out isolation and guarded device-data removal.',
  );
} finally {
  await browser?.close();
  server.kill();
}
