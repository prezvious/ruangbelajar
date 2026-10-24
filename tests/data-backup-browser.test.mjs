import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { newState, parseBackup } from '../study/core.mjs';

const port = 5206;
const server = spawn(process.execPath, ['dev-server.js'], {
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (s) => {
      if (s.toString().includes(String(port))) resolve();
    });
    server.once('error', reject);
    server.once('exit', (code) => reject(Error('server ' + code)));
  });
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PW_CHANNEL
      ? { channel: process.env.PW_CHANNEL }
      : process.platform === 'win32'
        ? { channel: 'msedge' }
        : {}),
  });
  const context = await browser.newContext({ acceptDownloads: true });
  await context.route('**/api/auth', (r) =>
    r.fulfill({ json: { user: null, project: 'https://fixture.supabase.co' } }),
  );
  await context.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const seed = newState();
  seed.academic.profile.name = 'Pemilik cadangan';
  seed.academic.progress['math-4'] = [true, false, true];
  seed.subjects = [
    { id: 'math', name: 'Matematika', color: '#123456', archived: false },
  ];
  seed.tasks = [
    {
      id: 'task',
      title: 'Tugas tersimpan',
      subjectId: 'math',
      date: '2026-10-24',
      done: false,
    },
  ];
  await context.addInitScript((state) => {
    if (!localStorage.getItem('backup-fixture-seeded')) {
      localStorage.setItem('ruang.workspace.v3.guest', JSON.stringify(state));
      localStorage.setItem('backup-fixture-seeded', '1');
    }
  }, seed);
  const page = await context.newPage(),
    url = `http://127.0.0.1:${port}`,
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const path of ['/migrasi', '/MIGRATION.md', '/study/migration.mjs']) {
    const response = await page.goto(url + path);
    assert.equal(response.status(), 404, 'Removed migration resource: ' + path);
  }
  for (const path of ['/', '/akun', '/panduan', '/pengaturan']) {
    await page.goto(url + path);
    await page.locator('.main-header h1').waitFor();
    assert.equal(
      await page
        .locator(
          'a[href*="migrasi"], a[href*="MIGRATION"], #migration, #academic-merge-file, [data-action="academic-merge-file"]',
        )
        .count(),
      0,
    );
  }
  await page.locator('.section-nav a[href="/pengaturan?tab=data"]').click();
  const data = page.locator('.panel:has([data-action="export"])');
  assert.equal(await data.locator('h2').innerText(), 'Data & cadangan');
  assert.equal(await data.locator('[data-action="import"]').count(), 1);
  const exported = page.waitForEvent('download');
  await data.locator('[data-action="export"]').click();
  const backupText = await fs.readFile(await (await exported).path(), 'utf8');
  const backup = parseBackup(backupText);
  assert.equal(backup.academic.profile.name, seed.academic.profile.name);
  assert.deepEqual(backup.academic.progress, seed.academic.progress);
  assert.deepEqual(backup.tasks, seed.tasks);
  await page.locator('.section-nav a[href="/pengaturan"]').click();
  await page
    .locator('#academic-profile [name="name"]')
    .fill('Perubahan sesudah cadangan');
  await page.locator('#academic-profile [type="submit"]').click();
  await page.waitForFunction(() =>
    document.querySelector('#toast').textContent.includes('disimpan'),
  );
  await page.locator('.section-nav a[href="/pengaturan?tab=data"]').click();
  await page.locator('#import-file').setInputFiles({
    name: 'cadangan.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backupText),
  });
  await page.locator('#modal[open] [type="submit"]').waitFor();
  const beforeRestore = page.waitForEvent('download');
  await page.locator('#modal [type="submit"]').click();
  const previous = parseBackup(
    await fs.readFile(await (await beforeRestore).path(), 'utf8'),
  );
  assert.equal(previous.academic.profile.name, 'Perubahan sesudah cadangan');
  await page.locator('.section-nav a[href="/pengaturan"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector('#academic-profile [name="name"]')?.value ===
      'Pemilik cadangan',
  );
  await page.reload();
  await page.locator('#academic-profile').waitFor();
  assert.equal(
    await page.locator('#academic-profile [name="name"]').inputValue(),
    'Pemilik cadangan',
  );
  await page.locator('.section-nav a[href="/pengaturan?tab=data"]').click();
  const restoredDownload = page.waitForEvent('download');
  await data.locator('[data-action="export"]').click();
  const restored = parseBackup(
    await fs.readFile(await (await restoredDownload).path(), 'utf8'),
  );
  assert.deepEqual(restored.tasks, seed.tasks);
  assert.deepEqual(restored.academic.progress, seed.academic.progress);
  await fs.mkdir('outputs', { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await data.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `outputs/data-backup-${width}.png` });
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: migration routes/resources/navigation removed; Settings backup export, automatic safety copy, restore and reload preserve profile, tasks and progress on desktop/mobile.',
  );
} finally {
  await browser?.close();
  server.kill();
}
