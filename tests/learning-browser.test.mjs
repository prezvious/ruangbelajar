import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { newState } from '../study/core.mjs';
const port = 5205;
const server = spawn(process.execPath, ['dev-server.js'], {
  env: {
    ...process.env,
    PORT: String(port),
    AUTH_COOKIE_SECRET: 'isolated-learning-browser-fixture-secret',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
await new Promise((resolve, reject) => {
  server.stdout.on('data', (s) => {
    if (s.toString().includes(String(port))) resolve();
  });
  server.once('error', reject);
  server.once('exit', (code) => reject(Error('server ' + code)));
});
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PW_CHANNEL
      ? { channel: process.env.PW_CHANNEL }
      : process.platform === 'win32'
        ? { channel: 'msedge' }
        : {}),
  });
  const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  context.on('page', (p) => p.on('pageerror', (e) => errors.push(e.message)));
  await context.route('**/api/auth', (r) =>
    r.fulfill({ json: { user: null, project: 'https://fixture.supabase.co' } }),
  );
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/hari-ini`);
  await page.locator('.main-header h1').waitFor();
  const s = newState(),
    now = Date.now(),
    d = new Date(),
    today = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
  s.subjects = [
    {
      id: 'math',
      name: 'Matematika pribadi',
      color: '#123456',
      archived: false,
    },
  ];
  s.tasks = [
    {
      id: 'old',
      title: 'Tugas tertinggal',
      date: '2026-01-01',
      done: false,
      subjectId: 'math',
    },
    {
      id: 'routine',
      title: 'Ulang setiap hari',
      date: today,
      done: false,
      subjectId: 'math',
      recurrence: { frequency: 'daily', interval: 1, until: '' },
    },
  ];
  s.sessions = [
    {
      id: 'time',
      runId: 'old-run',
      subjectId: 'math',
      start: now - 7200000,
      end: now - 5400000,
      durationMs: 1800000,
    },
  ];
  await page.evaluate(async (data) => {
    const r = await import('/study/repository.mjs');
    await r.withWorkspaceLock(() =>
      r.workspaceStorage.setItem(
        'ruang.workspace.v3.guest',
        JSON.stringify(data),
      ),
    );
  }, s);
  await page.reload();
  await page.getByText('Tugas tertinggal', { exact: true }).waitFor();
  assert.ok(await page.getByText('Tertinggal', { exact: false }).count());
  await page
    .locator('[data-action="learn-task-done"][data-id="routine"]')
    .first()
    .click();
  await page
    .getByRole('link', { name: 'Catatan dan sumber', exact: true })
    .click();
  await page.locator('[data-action="learn-note"]').click();
  const dialog = page.locator('dialog');
  await dialog.locator('[name="title"]').fill('Catatan aman');
  await dialog.locator('#learn-text-import').setInputFiles({
    name: 'catatan.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      '# Rangkuman\n**Materi penting**\n<script>window.pwned=true</script>\n![remote](https://example.invalid/pixel)\n[buruk](javascript:alert(1))\nHalo 世界',
    ),
  });
  await dialog.locator('textarea').waitFor();
  await page.waitForFunction(() =>
    document.querySelector('dialog textarea')?.value.includes('世界'),
  );
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
  await page.getByText('Catatan aman', { exact: true }).waitFor();
  assert.equal(
    await page.locator('.markdown-preview strong').textContent(),
    'Materi penting',
  );
  assert.equal(
    await page
      .locator(
        '.markdown-preview script,.markdown-preview img,.markdown-preview [href^="javascript:"]',
      )
      .count(),
    0,
  );
  assert.equal(await page.evaluate(() => window.pwned), undefined);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-action="learn-text-export"]').click();
  const dl = await downloadPromise;
  assert.equal(dl.suggestedFilename(), 'Catatan aman.md');
  assert.ok((await fs.readFile(await dl.path(), 'utf8')).includes('世界'));
  await page.locator('[data-action="learn-resource"]').click();
  await dialog.locator('[name="title"]').fill('Sumber TXT');
  await dialog.locator('[name="url"]').fill('https://example.org/reading');
  await dialog.locator('#learn-text-import').setInputFiles({
    name: 'bacaan.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('<b>Teks literal</b> 世界'),
  });
  await page.waitForFunction(() =>
    document.querySelector('dialog textarea')?.value.includes('literal'),
  );
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
  await page.getByText('<b>Teks literal</b> 世界', { exact: true }).waitFor();
  await page
    .getByRole('link', { name: 'Rencana kapasitas', exact: true })
    .click();
  await page.locator('#learn-weekday-2').uncheck();
  await page.locator('#learn-weekday-0').check();
  await page.locator('#header-language-select').selectOption('en-GB');
  assert.equal(await page.locator('#learn-weekday-2').isChecked(), false);
  assert.equal(await page.locator('#learn-weekday-0').isChecked(), true);
  await page.locator('#header-language-select').selectOption('id-ID');
  await page.locator('#learn-planner button[type=submit]').click();
  assert.equal(await page.locator('#learn-weekday-2').isChecked(), false);
  assert.equal(await page.locator('#learn-weekday-0').isChecked(), true);
  assert.equal(
    await page
      .locator('[name=weekdays]')
      .evaluateAll((nodes) => new Set(nodes.map((x) => x.value)).size),
    7,
  );
  await page.locator('[data-action="learn-apply-plan"]').waitFor();
  await page.locator('[data-action="learn-apply-plan"]').click();
  await page.getByRole('link', { name: 'Catatan waktu', exact: true }).click();
  await page.locator('[data-action="learn-time"][data-id="time"]').click();
  await dialog.locator('[name="reason"]').fill('Koreksi tes browser');
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
  await page
    .getByText('Koreksi tes browser', { exact: false })
    .waitFor({ state: 'attached' });
  await page
    .locator('[data-action="learn-time-delete"][data-id="time"]')
    .click();
  await dialog.locator('[name="reason"]').fill('Hapus interval tes');
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
  await page.locator('[data-action="learn-recovery"]').click();
  await dialog.locator('[data-action="learn-restore"]').first().waitFor();
  await dialog.locator('[data-action="learn-restore"]').first().click();
  await dialog.locator('button[type=submit]').click();
  await page.locator('[data-action="learn-time"][data-id="time"]').waitFor();
  await page.locator('[data-action="learn-archive"]').click();
  const tomorrow = await page.evaluate(async () => {
    const { civilAdd } = await import('/study/learning-model.mjs');
    const { dayKey } = await import('/study/core.mjs');
    const { formatDateInput } = await import('/study/i18n.mjs');
    return formatDateInput(civilAdd(dayKey(), 1));
  });
  await dialog.locator('[name="before"]').fill(tomorrow);
  const archiveDownload = page.waitForEvent('download');
  await dialog.locator('button[type=submit]').click();
  const archived = JSON.parse(
    await fs.readFile(await (await archiveDownload).path(), 'utf8'),
  );
  assert.equal(archived.sessions.length, 1);
  await page
    .locator('[data-action="learn-time"][data-id="time"]')
    .waitFor({ state: 'detached' });

  await page.goto(`http://127.0.0.1:${port}/hari-ini`);
  await page.locator('[data-action="learn-reminders"]').click();
  await dialog.locator('[name="enabled"]').check();
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
  await page.locator('[data-action="learn-reminders"]').click();
  await dialog.locator('[data-action="learn-ics"]').click();
  const icsPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
  const ics = await icsPromise;
  assert.ok(
    (await fs.readFile(await ics.path(), 'utf8')).includes('BEGIN:VALARM'),
  );
  for (const locale of ['id-ID', 'en-GB', 'en-US', 'es-ES', 'fr-FR', 'ru-RU']) {
    for (const route of [
      '/hari-ini',
      '/rencana',
      '/catatan',
      '/catatan-waktu',
    ]) {
      await page.goto(`http://127.0.0.1:${port}${route}`);
      await page.locator('#header-language-select').selectOption(locale);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        locale + route,
      );
      assert.ok(
        !(await page.locator('.main-header h1').textContent()).includes('nav.'),
      );
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await fs.mkdir('outputs', { recursive: true });
  await page.goto(`http://127.0.0.1:${port}/catatan`);
  await page.locator('.main-header h1').waitFor();
  await page.locator('#header-language-select').selectOption('id-ID');
  await page.screenshot({
    path: 'outputs/learning-notes-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'outputs/learning-notes-mobile.png',
    fullPage: true,
  });
  const large = newState();
  large.subjects = s.subjects;
  large.sessions = Array.from({ length: 20000 }, (_, i) => ({
    id: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    subjectId: 'math',
    start: 1000000 + i * 60000,
    end: 1060000 + i * 60000,
    durationMs: 60000,
  }));
  await page.evaluate(async (data) => {
    const r = await import('/study/repository.mjs');
    await r.withWorkspaceLock(() =>
      r.workspaceStorage.setItem(
        'ruang.workspace.v3.guest',
        JSON.stringify(data),
      ),
    );
  }, large);
  await page.reload();
  await page.locator('.main-header h1').waitFor();
  assert.deepEqual(
    await page.evaluate(async () => {
      const r = await import('/study/repository.mjs');
      return JSON.parse(r.workspaceStorage.getItem('ruang.workspace.v3.guest'))
        .sessions;
    }),
    large.sessions,
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: real browser queue, recurring completion, Markdown/TXT import/export and XSS rejection, planner application, audited edits/deletion/recovery, ICS alarms, four routes in six locales at 390px, 20,000-record IndexedDB reload.',
  );
  await context.close();
} finally {
  await browser?.close();
  server.kill();
}
