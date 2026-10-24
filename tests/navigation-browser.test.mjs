import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const port = 5213;
const server = spawn(process.execPath, ['dev-server.js'], {
  env: {
    ...process.env,
    PORT: String(port),
    AUTH_COOKIE_SECRET: 'isolated-navigation-fixture-secret-only',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
await new Promise((resolve, reject) => {
  server.stdout.on('data', (chunk) => {
    if (chunk.toString().includes(String(port))) resolve();
  });
  server.once('error', reject);
  server.once('exit', (code) =>
    reject(Error('Navigation server exited ' + code)),
  );
});
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const origin = `http://127.0.0.1:${port}`;
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url === origin + '/api/auth')
      return route.fulfill({ json: { user: null } });
    return url.startsWith(origin + '/') ? route.continue() : route.abort();
  });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin + '/hari-ini');
  await page.locator('main h1').waitFor();
  assert.deepEqual(
    await page.locator('.sidebar > nav .nav-item').allTextContents(),
    ['Hari ini', 'Jadwal', 'Materi', 'Tryout', 'Statistik'],
  );
  assert.deepEqual(
    await page.locator('.sidebar-bottom .nav-item').allTextContents(),
    ['Panduan', 'Pengaturan'],
  );
  assert.equal(await page.locator('#timer-heading').count(), 1);
  assert.equal(await page.locator('.persistent-timer').count(), 0);

  for (const [route, parent] of [
    ['/', 'Jadwal'],
    ['/jadwal', 'Jadwal'],
    ['/kalender', 'Jadwal'],
    ['/rencana', 'Jadwal'],
    ['/tracker?subject=PK', 'Materi'],
    ['/materi', 'Materi'],
    ['/catatan', 'Materi'],
    ['/belajar', 'Hari ini'],
    ['/catatan-waktu', 'Statistik'],
    ['/dasbor', 'Pengaturan'],
    ['/mata-pelajaran', 'Pengaturan'],
  ]) {
    await page.goto(origin + route);
    await page.locator('main h1').waitFor();
    assert.equal(
      await page.locator('.sidebar .nav-item.active').textContent(),
      parent,
      route,
    );
    assert.equal(await page.locator('.sidebar .nav-item').count(), 7);
    assert.equal((await page.locator('#academic-search').count()) <= 1, true);
  }
  await page.goto(origin + '/tracker?subject=PK');
  assert.equal(
    await page
      .locator('[data-action=academic-subject][data-id=PK]')
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.locator('.section-nav a[href="/catatan"]').click();
  await page.goBack();
  assert.equal(new URL(page.url()).searchParams.get('subject'), 'PK');
  await page.goForward();
  assert.equal(new URL(page.url()).pathname, '/catatan');

  await page.goto(origin + '/jadwal');
  await page.locator('[data-action=academic-start]').first().click();
  await page.waitForURL('**/belajar');
  assert.equal(await page.locator('[data-live=timer]').count(), 1);
  await page.locator('.sidebar a[href="/statistik"]').click();
  assert.equal(await page.locator('.persistent-timer').count(), 1);
  assert.equal(await page.locator('.history-panel').count(), 1);
  await page.locator('.sidebar .nav-item[href="/hari-ini"]').click();
  assert.equal(await page.locator('[data-live=timer]').count(), 1);
  await page.locator('[data-action=finish]').click();
  await page.locator('.sidebar a[href="/statistik"]').click();
  await page.locator('[data-action=learn-time][data-id]').first().waitFor();
  const saved = await page.evaluate(async () => {
    const { workspaceStorage } = await import('/study/repository.mjs');
    return JSON.parse(workspaceStorage.getItem('ruang.workspace.v3.guest'));
  });
  assert.deepEqual(saved.academic.completed, []);
  assert.ok(
    Object.values(saved.academic.progress).every((stages) =>
      stages.every((value) => value === false),
    ),
  );

  await page.locator('.sidebar .nav-item[href="/hari-ini"]').click();
  await page.locator('[data-action=learn-task]').first().click();
  await page.locator('#modal [name=title]').fill('Rutinitas navigasi');
  await page
    .locator('#modal [name=subjectId]')
    .selectOption(saved.subjects[0].id);
  await page.locator('#modal [name=frequency]').selectOption('weekly');
  await page.locator('#modal [name=minutes]').fill('35');
  await page.locator('#modal [type=submit]').click();
  await page.locator('#modal').waitFor({ state: 'hidden' });
  const task = await page.evaluate(async () => {
    const { workspaceStorage } = await import('/study/repository.mjs');
    return JSON.parse(workspaceStorage.getItem('ruang.workspace.v3.guest'))
      .tasks[0];
  });
  assert.equal(task.subjectId, saved.subjects[0].id);
  assert.equal(task.minutes, 35);
  assert.deepEqual(task.recurrence, {
    frequency: 'weekly',
    interval: 1,
    until: '',
  });

  await fs.mkdir('outputs', { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/hari-ini',
      '/jadwal',
      '/tracker',
      '/catatan',
      '/statistik',
      '/pengaturan',
      '/mata-pelajaran',
    ]) {
      await page.goto(origin + route);
      await page.locator('main h1').waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `${width} ${route}`,
      );
      if (
        ['/hari-ini', '/jadwal', '/statistik', '/pengaturan'].includes(route)
      ) {
        await page.screenshot({
          path: `outputs/navigation-${route.slice(1)}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
  for (const locale of ['id-ID', 'en-GB', 'en-US', 'es-ES', 'fr-FR', 'ru-RU']) {
    await page.locator('#header-language-select').selectOption(locale);
    assert.equal(
      await page
        .locator('.sidebar > nav')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
      'All five mobile links fit: ' + locale,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: consolidated sidebar, legacy sections, subject deep links, history, Back/Forward, one live timer, desktop/mobile widths.',
  );
} finally {
  await browser?.close();
  server.kill();
}
