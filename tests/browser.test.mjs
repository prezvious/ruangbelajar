import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { newState } from '../study/core.mjs';
const { chromium } = await (process.argv[2]
  ? import(pathToFileURL(process.argv[2]).href)
  : import('@playwright/test'));
const server = spawn(process.execPath, ['dev-server.js'], {
  env: {
    ...process.env,
    PORT: '5197',
    AUTH_COOKIE_SECRET: 'isolated-browser-fixture-secret-only',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
await new Promise((resolve, reject) => {
  server.stdout.on('data', (chunk) => {
    if (chunk.toString().includes('5197')) resolve();
  });
  server.once('error', reject);
  server.once('exit', (code) => reject(Error('Test server exited ' + code)));
});
let browser;
try {
  browser = await chromium.launch({
    channel:
      process.argv[3] ||
      process.env.PW_CHANNEL ||
      (process.platform === 'win32' ? 'msedge' : undefined),
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const errors = [];
  context.on('page', (page) =>
    page.on('pageerror', (error) => errors.push(error.message)),
  );
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
  await context.route('**/api/auth', (route) =>
    route.fulfill({
      json: { user: null, project: 'https://ojltoroezahhqgktvygp.supabase.co' },
    }),
  );
  await context.route('https://fonts.googleapis.com/**', (route) =>
    route.abort(),
  );
  const page = await context.newPage(),
    url = 'http://127.0.0.1:5197';
  await page.goto(url);
  await page.locator('h1').waitFor();
  assert.equal(await page.locator('h1').innerText(), 'Agenda belajar');
  await page.locator('.schedule-editor summary').click();
  await page.locator('[name=startDate]').fill('2026-12-28');
  await page.locator('#academic-schedule [type=submit]').click();
  await page.locator('[data-action=academic-week][data-id="1"]').click();
  await page.waitForFunction(() =>
    document
      .querySelector('.agenda-list')
      .textContent.includes('28 Desember 2026'),
  );
  assert.ok(
    (await page.locator('.agenda-list').innerText()).includes(
      '28 Desember 2026',
    ),
  );
  await page.locator('[data-agenda="1-0"]').check();
  await page.waitForFunction(() =>
    JSON.parse(
      window.__workspaceStore.getItem('ruang.workspace.v3.guest'),
    ).academic.completed.includes('1-0'),
  );
  await page
    .locator('[data-action=academic-start][data-agenda-id="1-0"]')
    .click();
  await page.waitForURL('**/belajar');
  let saved = await page.evaluate(async () =>
    JSON.parse(window.__workspaceStore.getItem('ruang.workspace.v3.guest')),
  );
  assert.equal(saved.timer.context.agendaId, '1-0');
  assert.notEqual(saved.timer.startedAt, null);
  await page.locator('a[href="/tracker"]').first().click();
  assert.equal(await page.locator('.persistent-timer').count(), 1);
  await page
    .locator('[data-action=academic-stage][data-id="math-4"][data-stage="0"]')
    .click();
  await page.waitForFunction(
    () =>
      JSON.parse(window.__workspaceStore.getItem('ruang.workspace.v3.guest'))
        .academic.progress['math-4'][0],
  );
  await page.reload();
  await page.locator('h1').waitFor();
  saved = await page.evaluate(async () =>
    JSON.parse(window.__workspaceStore.getItem('ruang.workspace.v3.guest')),
  );
  assert.equal(saved.academic.progress['math-4'][0], true);
  assert.equal(saved.timer.context.agendaId, '1-0');
  await page.locator('.persistent-timer [data-action=toggle-timer]').click();
  await page.waitForFunction(
    () =>
      JSON.parse(window.__workspaceStore.getItem('ruang.workspace.v3.guest'))
        .timer.startedAt === null,
  );
  saved = await page.evaluate(async () =>
    JSON.parse(window.__workspaceStore.getItem('ruang.workspace.v3.guest')),
  );
  assert.equal(saved.timer.startedAt, null);
  assert.ok(saved.timer.elapsedMs > 0);
  await page.locator('.persistent-timer [data-action=finish]').click();
  await page.waitForFunction(
    () => !document.querySelector('.persistent-timer'),
  );
  await page.locator('a[href="/dasbor"]').first().click();
  assert.deepEqual(await page.locator('.view-content h2').allTextContents(), [
    'Profil & target',
  ]);
  assert.equal(await page.locator('.view-content form').count(), 0);
  assert.equal(await page.locator('.profile-summary dd').count(), 4);
  assert.equal(
    await page
      .locator('.breadcrumb, [aria-label="Breadcrumb Navigation"]')
      .count(),
    0,
  );
  await page.locator('a[href="/pengaturan"]').first().click();
  await page.locator('#academic-profile [name=name]').fill('Pengguna uji');
  await page
    .locator('#academic-profile [name=university]')
    .fill('Universitas uji');
  await page
    .locator('#academic-profile [name=major]')
    .fill('Teknik Informatika');
  await page.locator('#academic-target-date').fill('01/07/2027');
  await page.locator('#academic-profile [type=submit]').click();
  await page.waitForFunction(
    () =>
      JSON.parse(window.__workspaceStore.getItem('ruang.workspace.v3.guest'))
        .academic.profile.name === 'Pengguna uji',
  );
  await page.locator('a[href="/dasbor"]').first().click();
  assert.deepEqual(
    await page.locator('.profile-summary dd').allTextContents(),
    ['Pengguna uji', 'Universitas uji', 'Teknik Informatika', '1 Juli 2027'],
  );
  await page.reload();
  await page.locator('.profile-summary').waitFor();
  assert.equal(
    await page.locator('.profile-summary dd').first().innerText(),
    'Pengguna uji',
  );
  await page.locator('a[href="/tryout"]').first().click();
  await page.locator('[name=platform]').fill('Uji integrasi');
  for (const code of ['PU', 'PBM', 'PPU', 'PK', 'LBI', 'LBE', 'PM'])
    await page.locator('[name=score-' + code + ']').fill('650');
  await page.locator('#academic-tryout [type=submit]').click();
  try {
    await page.locator('.tryout-record').waitFor({ timeout: 5000 });
  } catch (error) {
    const diagnostic = await page.evaluate(async () => {
      const form = document.querySelector('#academic-tryout');
      return {
        toast: document.querySelector('#toast').textContent,
        formValid: form.checkValidity(),
        inputs: [...form.querySelectorAll('input')].map((x) => ({
          name: x.name,
          value: x.value,
          valid: x.checkValidity(),
          message: x.validationMessage,
        })),
        stored: JSON.parse(
          window.__workspaceStore.getItem('ruang.workspace.v3.guest'),
        ).academic.tryouts,
      };
    });
    console.error(JSON.stringify({ errors, diagnostic }, null, 2));
    throw error;
  }
  assert.equal(await page.locator('.tryout-record').count(), 1);
  await page.locator('a[href="/kalender"]').first().click();
  await page.locator('#academic-plan-date').fill('2026-12-28');
  await page.locator('#academic-plan-date').press('Tab');
  await page.waitForFunction(() =>
    document
      .querySelector('.planned-section')
      .textContent.includes('Learning How to Learn'),
  );
  assert.ok(
    (await page.locator('.planned-section').innerText()).includes(
      'Learning How to Learn',
    ),
  );
  await page.locator('a[href="/belajar"]').first().click();
  await page.locator('[data-action=add-task]').click();
  await page.locator('#modal [name=title]').fill('Tugas uji');
  await page.locator('#modal [type=submit]').click();
  await page.locator('.task input[type=checkbox]').check();
  await page.locator('a[href="/pengaturan"]').first().click();
  assert.equal(await page.locator('#theme-select option').count(), 63);
  await page.locator('#theme-select').selectOption('ocean');
  await page.locator('[data-action=theme][data-value=dark]').click();
  await page.waitForFunction(
    () => document.body.dataset.resolvedMode === 'dark',
  );
  assert.equal(
    await page.locator('body').getAttribute('data-resolved-mode'),
    'dark',
  );
  await page.locator('[data-action=theme][data-value=light]').click();
  await page.waitForFunction(
    () => document.body.dataset.resolvedMode === 'light',
  );
  const routes = [
    '/',
    '/dasbor',
    '/materi',
    '/tracker?subject=PK',
    '/tryout',
    '/panduan',
    '/belajar',
    '/statistik',
    '/kalender',
    '/mata-pelajaran',
    '/pengaturan',
    '/akun',
    '/migrasi',
  ];
  for (const locale of ['id-ID', 'en-GB', 'en-US', 'es-ES', 'fr-FR', 'ru-RU']) {
    await page.locator('#header-language-select').selectOption(locale);
    for (const path of routes) {
      await page.goto(url + path);
      await page.locator('h1').waitFor();
      assert.ok((await page.locator('h1').innerText()).length > 0);
      assert.equal(
        await page.evaluate(
          async () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        'Overflow at ' + locale + ' ' + path,
      );
    }
  }
  console.log(
    'PASS: 13 routes in six locales, dated agenda, progress, timer navigation/reload/pause, profile, tryout, calendar, tasks, 63 themes and dark/light mode.',
  );
  await page.locator('#header-language-select').selectOption('id-ID');
  await page.goto(url + '/migrasi');
  await page.locator('[data-action=academic-merge-file]').click();
  const source = newState();
  source.version = 2;
  delete source.academic;
  source.subjects = [
    {
      id: 'sela-math',
      name: 'Matematika Sela',
      color: '#123456',
      archived: false,
    },
  ];
  source.tasks = [
    {
      id: 'sela-task',
      title: 'Tugas Sela',
      date: '2026-10-21',
      done: false,
      subjectId: 'sela-math',
    },
  ];
  source.sessions = [
    {
      id: 'sela-session',
      runId: 'sela-run',
      subjectId: 'sela-math',
      start: 1600000000000,
      end: 1600000060000,
      durationMs: 60000,
    },
  ];
  await page.locator('#academic-merge-file').setInputFiles({
    name: 'sela-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(source)),
  });
  await page.locator('#modal [type=submit]').waitFor();
  const download = page.waitForEvent('download');
  await page.locator('#modal [type=submit]').click();
  await download;
  await page.waitForFunction(() => !document.querySelector('#modal').open);
  saved = await page.evaluate(async () =>
    JSON.parse(window.__workspaceStore.getItem('ruang.workspace.v3.guest')),
  );
  assert.equal(saved.academic.profile.name, 'Pengguna uji');
  assert.ok(saved.tasks.some((x) => x.id === 'sela-task'));
  assert.ok(saved.sessions.some((x) => x.id === 'sela-session'));
  const before = saved.sessions.length;
  await page.locator('#academic-merge-file').setInputFiles({
    name: 'sela-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(source)),
  });
  await page.waitForFunction(() =>
    document.querySelector('#toast').textContent.includes('sudah pernah'),
  );
  saved = await page.evaluate(async () =>
    JSON.parse(window.__workspaceStore.getItem('ruang.workspace.v3.guest')),
  );
  assert.equal(saved.sessions.length, before);
  console.log(
    'PASS: browser merge preview, automatic backup download, Sela version-2 import, preserved Ruang data and duplicate-import protection.',
  );
  await fs.mkdir('outputs', { recursive: true });
  for (const [name, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [path, selector] of [
      ['/dasbor', '.dashboard-profile'],
      ['/pengaturan', '.profile-settings'],
    ]) {
      await page.goto(url + path);
      await page.locator(selector).waitFor();
      assert.equal(
        await page.locator(selector).evaluate((el) => {
          const style = getComputedStyle(el);
          return (
            style.borderTopWidth === '0px' && style.borderBottomWidth === '0px'
          );
        }),
        true,
        'Profile section should have no divider lines',
      );
      await page.screenshot({
        path: `outputs/profile-${path.slice(1)}-${name}.png`,
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.locator('h1').waitFor();
  await page.screenshot({
    path: 'outputs/consolidation-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of routes) {
    await page.goto(url + path);
    await page.locator('h1').waitFor();
    assert.equal(
      await page.evaluate(
        async () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      'Mobile overflow ' + path,
    );
  }
  await page.goto(url);
  await page.locator('h1').waitFor();
  await page.screenshot({
    path: 'outputs/consolidation-mobile.png',
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    'PASS: all routes at 390px, no page errors, desktop/mobile screenshots saved.',
  );
} finally {
  await browser?.close();
  server.kill();
}
