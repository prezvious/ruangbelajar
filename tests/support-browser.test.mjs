import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { CATALOGUES, LANGUAGES } from '../study/i18n.mjs';
const { chromium } = await (process.argv[2]
  ? import(pathToFileURL(process.argv[2]).href)
  : import('@playwright/test'));
const server = spawn(process.execPath, ['dev-server.js'], {
  env: {
    ...process.env,
    PORT: '5202',
    AUTH_COOKIE_SECRET: 'isolated-support-page-fixture-secret-only',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
await new Promise((resolve, reject) => {
  server.stdout.on('data', (chunk) => {
    if (chunk.toString().includes('5202')) resolve();
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
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    errors = [],
    requests = [];
  context.on('page', (page) =>
    page.on('pageerror', (error) => errors.push(error.message)),
  );
  await context.route('https://fonts.googleapis.com/**', (route) =>
    route.abort(),
  );
  await context.route('https://fonts.gstatic.com/**', (route) => route.abort());
  let failVerify = false;
  await context.route('**/api/auth', async (route) => {
    const body = route.request().postDataJSON();
    requests.push(body);
    if (body.action === 'verify')
      return route.fulfill({
        status: failVerify ? 400 : 200,
        json: failVerify
          ? { key: 'verify.rejected', error: 'Indonesian fallback' }
          : {
              user: { id: 'fixture-account', email: 'fixture@example.invalid' },
            },
      });
    if (['resend', 'request-reset'].includes(body.action))
      return route.fulfill({ json: { sent: true } });
    return route.fulfill({
      json: { user: null, project: 'https://example.supabase.co' },
    });
  });
  const page = await context.newPage(),
    url = 'http://127.0.0.1:5202';
  await page.goto(url + '/auth/verify?sent=1');
  await page.locator('#support-language').waitFor();
  for (const { code } of LANGUAGES) {
    await page.locator('#support-language').selectOption(code);
    assert.equal(
      await page.locator('h1').innerText(),
      CATALOGUES[code]['verify.checkTitle'],
    );
    await page.locator('[name=email]').fill('preserved@example.invalid');
    await page.reload();
    await page.locator('#support-language').waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), code);
    const notFound = await page.goto(url + '/not-a-real-page');
    assert.equal(notFound.status(), 404);
    await page.locator('#support-language').waitFor();
    assert.equal(
      await page.locator('h1').innerText(),
      CATALOGUES[code]['errorPage.title404'],
    );
    const forbidden = await page.goto(url + '/403.html');
    assert.equal(forbidden.status(), 403);
    await page.locator('#support-language').waitFor();
    assert.equal(
      await page.locator('h1').innerText(),
      CATALOGUES[code]['errorPage.title403'],
    );
    await page.goto(url + '/panduan');
    await page.locator('#migration').waitFor();
    assert.ok(
      (await page.locator('#sync-guide').innerText()).includes('IndexedDB'),
    );
    assert.ok(
      !(await page.locator('#sync-guide').innerText()).includes('study_data'),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      'Guide overflow ' + code,
    );
    await page.goto(url + '/auth/verify?sent=1');
    await page.locator('#support-language').waitFor();
  }
  await page.locator('[name=email]').fill('draft@example.invalid');
  await page.locator('#support-language').focus();
  await page.locator('#support-language').selectOption('fr-FR');
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    'support-language',
  );
  assert.equal(
    await page.locator('[name=email]').inputValue(),
    'draft@example.invalid',
  );
  await page.locator('[name=email]').fill('');
  await page.locator('[type=submit]').click();
  assert.equal(
    await page.locator('#support-message').innerText(),
    CATALOGUES['fr-FR']['validation.required'],
  );
  assert.equal(
    await page.locator('[name=email]').getAttribute('aria-invalid'),
    'true',
  );
  assert.equal(await page.evaluate(() => document.activeElement.name), 'email');
  await page.goto(url + '/404.html');
  await page.goto(
    url + '/auth/verify#access_token=fixture&refresh_token=fixture&type=signup',
  );
  await page
    .getByRole('heading', {
      name: CATALOGUES['fr-FR']['verify.successTitle'],
      exact: true,
    })
    .waitFor();
  assert.equal(new URL(page.url()).hash, '');
  await page.screenshot({
    path: 'outputs/verification-mobile.png',
    fullPage: true,
  });
  assert.ok(
    !(await page.locator('body').innerText()).includes('tidak menyinkronkan'),
  );
  failVerify = true;
  await page.goto(url + '/auth/verify?token_hash=fixture&type=recovery');
  await page
    .getByRole('heading', {
      name: CATALOGUES['fr-FR']['verify.failedTitle'],
      exact: true,
    })
    .waitFor();
  await page.locator('[name=email]').fill('recovery@example.invalid');
  await page.locator('[type=submit]').click();
  await page
    .getByText(CATALOGUES['fr-FR']['account.resetSent'], { exact: true })
    .waitFor();
  assert.equal(requests.at(-1).action, 'request-reset');
  await page.goto(url + '/tryout');
  await page.locator('#academic-tryout').waitFor();
  assert.equal(
    await page.locator('#academic-tryout').getAttribute('novalidate'),
    '',
  );
  await page.locator('#academic-tryout [type=submit]').click();
  await page.locator('#toast.show').waitFor();
  assert.equal(
    await page.locator('#toast').innerText(),
    CATALOGUES['fr-FR']['validation.required'],
  );
  assert.deepEqual(errors, []);
  await page.screenshot({ path: 'outputs/support-mobile.png', fullPage: true });
  console.log(
    'PASS: six-language verification, true HTTP 403/404, current sync/migration guide, mobile layout, email draft preservation, localised validation, verified fragment cleanup and recovery-link resend.',
  );
} finally {
  await browser?.close();
  server.kill();
}
