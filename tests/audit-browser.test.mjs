import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { newState } from '../study/core.mjs';
const { chromium } = await (process.argv[2]
  ? import(pathToFileURL(process.argv[2]).href)
  : import('@playwright/test'));
const server = spawn(process.execPath, ['dev-server.js'], {
  env: {
    ...process.env,
    PORT: '5201',
    AUTH_COOKIE_SECRET: 'isolated-audit-fixture-secret-only',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
await new Promise((resolve, reject) => {
  server.stdout.on('data', (c) => {
    if (c.toString().includes('5201')) resolve();
  });
  server.once('error', reject);
  server.once('exit', (code) => reject(Error('Server exited ' + code)));
});
let browser;
const failures = [];
try {
  browser = await chromium.launch({
    channel:
      process.env.PW_CHANNEL ||
      (process.platform === 'win32' ? 'msedge' : undefined),
    headless: true,
  });
  const url = 'http://127.0.0.1:5201',
    project = 'https://fixture.supabase.co',
    key = (id) => 'ruang.workspace.v3.fixture.supabase.co.' + id;
  async function fixture() {
    const context = await browser.newContext();
    let userId = 'A',
      offline = false;
    const doc = (id) => {
      const s = newState();
      s.locale = 'id-ID';
      s.academic.profile.name = 'Saved ' + id;
      s.academic.tryouts = [
        {
          id: 'exam',
          date: '2026-10-21',
          platform: 'Original',
          scores: Object.fromEntries(
            ['PU', 'PBM', 'PPU', 'PK', 'LBI', 'LBE', 'PM'].map((c) => [c, 650]),
          ),
        },
      ];
      return s;
    };
    const rows = new Map(
      ['A', 'B'].map((id) => [id, { data: doc(id), revision: 1 }]),
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
    await context.route('https://fonts.googleapis.com/**', (route) =>
      route.abort(),
    );
    await context.route('**/api/auth', (route) =>
      offline
        ? route.abort()
        : route.fulfill({
            json: {
              user: { id: userId, email: userId + '@example.invalid' },
              project,
              expiresAt: Date.now() + 86400000,
            },
          }),
    );
    await context.route('**/api/workspace', (route) => {
      if (offline) return route.abort();
      const body = route.request().postDataJSON(),
        identity = { project, userId };
      if (body.expectedUserId !== userId)
        return route.fulfill({
          status: 409,
          json: { code: 'ACCOUNT_CHANGED' },
        });
      if (body.action === 'save') {
        const current = rows.get(userId);
        if (current.revision !== body.revision)
          return route.fulfill({
            status: 409,
            json: { code: 'CLOUD_CONFLICT' },
          });
        rows.set(userId, { data: body.data, revision: current.revision + 1 });
        return route.fulfill({
          json: { revision: current.revision + 1, context: identity },
        });
      }
      return route.fulfill({
        json: { ...rows.get(userId), context: identity },
      });
    });
    return {
      context,
      rows,
      setUser: (id) => (userId = id),
      setOffline: () => (offline = true),
    };
  }
  async function check(name, fn) {
    try {
      await fn();
      console.log('PASS: ' + name);
    } catch (error) {
      failures.push(name);
      console.error('FAIL: ' + name + ' — ' + error.message);
    }
  }
  await check(
    'account switch discards private drafts from the previous account',
    async () => {
      const f = await fixture();
      try {
        const page = await f.context.newPage();
        await page.goto(url + '/pengaturan');
        await page.waitForFunction(
          () => document.querySelector('[name=name]')?.value === 'Saved A',
        );
        await page
          .locator('#academic-profile [name=name]')
          .fill('PRIVATE DRAFT A');
        f.setUser('B');
        await page.evaluate(async () =>
          window.dispatchEvent(new Event('focus')),
        );
        await page.waitForFunction(
          () =>
            JSON.parse(
              window.__workspaceStore.getItem(
                'ruang.workspace.v3.fixture.supabase.co.B',
              ),
            )?.academic.profile.name === 'Saved B' &&
            document.querySelector('[name=name]')?.value === 'Saved B',
        );
        assert.equal(
          await page.locator('#academic-profile [name=name]').inputValue(),
          'Saved B',
        );
      } finally {
        await f.context.close();
      }
    },
  );
  await check(
    "a stale tryout editor cannot overwrite another tab's same-field edit",
    async () => {
      const f = await fixture();
      try {
        const first = await f.context.newPage(),
          second = await f.context.newPage();
        await first.goto(url + '/tryout');
        await first.locator('[data-action=academic-edit-tryout]').waitFor();
        await first.locator('[data-action=academic-edit-tryout]').click();
        await first.locator('#academic-tryout [name=platform]').fill('LOCAL A');
        await second.goto(url + '/tryout');
        await second.locator('[data-action=academic-edit-tryout]').click();
        await second
          .locator('#academic-tryout [name=platform]')
          .fill('REMOTE B');
        await second.locator('#academic-tryout [type=submit]').click();
        await second.waitForFunction(
          () =>
            JSON.parse(
              window.__workspaceStore.getItem(
                'ruang.workspace.v3.fixture.supabase.co.A',
              ),
            ).academic.tryouts[0].platform === 'REMOTE B',
        );
        await first.locator('#academic-tryout [type=submit]').click();
        await first.waitForFunction(
          () => document.querySelector('#toast').textContent.length > 0,
        );
        const platform = await first.evaluate(
          async (k) =>
            JSON.parse(window.__workspaceStore.getItem(k)).academic.tryouts[0]
              .platform,
          key('A'),
        );
        assert.equal(platform, 'REMOTE B');
      } finally {
        await f.context.close();
      }
    },
  );
  await check(
    'cached account data can reopen when the auth request is offline',
    async () => {
      const f = await fixture();
      try {
        const page = await f.context.newPage();
        await page.goto(url + '/pengaturan');
        await page.waitForFunction(
          () => document.querySelector('[name=name]')?.value === 'Saved A',
        );
        f.setOffline();
        await page.reload();
        await page.locator('h1').waitFor();
        await page.waitForFunction(
          () => document.querySelector('[name=name]')?.value === 'Saved A',
        );
        assert.equal(
          await page.locator('#academic-profile [name=name]').inputValue(),
          'Saved A',
        );
      } finally {
        await f.context.close();
      }
    },
  );
  await check(
    "a stale profile editor cannot overwrite another tab's name change",
    async () => {
      const f = await fixture();
      try {
        const first = await f.context.newPage(),
          second = await f.context.newPage();
        await first.goto(url + '/pengaturan');
        await first.waitForFunction(
          () => document.querySelector('[name=name]')?.value === 'Saved A',
        );
        await first.locator('#academic-profile [name=name]').fill('LOCAL NAME');
        await second.goto(url + '/pengaturan');
        await second.waitForFunction(
          () => document.querySelector('[name=name]')?.value === 'Saved A',
        );
        await second
          .locator('#academic-profile [name=name]')
          .fill('REMOTE NAME');
        await second.locator('#academic-profile [type=submit]').click();
        await second.waitForFunction(
          () =>
            JSON.parse(
              window.__workspaceStore.getItem(
                'ruang.workspace.v3.fixture.supabase.co.A',
              ),
            ).academic.profile.name === 'REMOTE NAME',
        );
        await first.locator('#academic-profile [type=submit]').click();
        await first.waitForFunction(
          () => document.querySelector('#toast').textContent.length > 0,
        );
        assert.equal(
          await first.evaluate(
            async (k) =>
              JSON.parse(window.__workspaceStore.getItem(k)).academic.profile
                .name,
            key('A'),
          ),
          'REMOTE NAME',
        );
      } finally {
        await f.context.close();
      }
    },
  );
  await check(
    'a failed local save keeps its draft and never announces that it was saved',
    async () => {
      const f = await fixture();
      try {
        const page = await f.context.newPage();
        await page.goto(url + '/pengaturan');
        await page.waitForFunction(
          () => document.querySelector('[name=name]')?.value === 'Saved A',
        );
        await page
          .locator('#academic-profile [name=name]')
          .fill('Memory-only draft');
        await page.evaluate(async () => {
          const original = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function (value, key) {
            if (key === 'ruang.workspace.v3.fixture.supabase.co.A')
              throw new DOMException('Quota exceeded', 'QuotaExceededError');
            return original.call(this, value, key);
          };
        });
        await page.locator('#academic-profile [type=submit]').click();
        await page.waitForFunction(
          () => document.querySelector('#toast').textContent.length > 0,
        );
        assert.doesNotMatch(
          await page.locator('#toast').innerText(),
          /Perubahan disimpan/,
        );
        assert.equal(
          await page.locator('#academic-profile [name=name]').inputValue(),
          'Memory-only draft',
        );
        assert.equal(
          await page.evaluate(
            async (k) =>
              JSON.parse(window.__workspaceStore.getItem(k)).academic.profile
                .name,
            key('A'),
          ),
          'Saved A',
        );
      } finally {
        await f.context.close();
      }
    },
  );
  if (failures.length) process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
