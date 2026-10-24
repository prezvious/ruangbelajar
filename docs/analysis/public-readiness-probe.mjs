// Isolated synthetic probes for the public-readiness analysis. No production data.
import fs from 'node:fs/promises';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { newState, validateState } from '../../study/core.mjs';
import { documentOf } from '../../study/sync.mjs';
import { createAcademicUI } from '../../study/academic-ui.mjs';
import { agendaItems, agendaDate } from '../../study/academic-model.mjs';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const now = Date.now(),
  subjectId = '10000000-1000-4000-8000-000000000000';
const server = http.createServer((_req, res) =>
  res
    .writeHead(200, { 'Content-Type': 'text/html' })
    .end('<!doctype html><title>Isolated storage probe</title>'),
);
await new Promise((resolve) => server.listen(5204, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5204/');
  const storage = [];
  for (const count of [1000, 10000, 20000, 30000, 100000]) {
    const state = newState(now);
    state.subjects = [
      { id: subjectId, name: 'Matematika', color: '#4d5d3c', archived: false },
    ];
    state.timer.subjectId = subjectId;
    state.sessions = Array.from({ length: count }, (_, i) => ({
      id: String(i).padStart(8, '0') + '-1000-4000-8000-000000000000',
      runId: String(i).padStart(8, '0') + '-2000-4000-8000-000000000000',
      subjectId,
      start: now - (count - i) * 60000,
      end: now - (count - i - 1) * 60000,
      durationMs: 60000,
    }));
    const doc = documentOf(validateState(state), 'id-ID'),
      docText = JSON.stringify(doc);
    const cacheText = JSON.stringify({
      ...doc,
      _sync: { base: doc, revision: 1, seed: null },
    });
    const requestBytes = Buffer.byteLength(
      JSON.stringify({
        action: 'save',
        data: doc,
        revision: 1,
        expectedUserId: 'fixture-account',
      }),
    );
    const browserResult = await page.evaluate((text) => {
      localStorage.clear();
      try {
        localStorage.setItem('isolated-account-cache', text);
        return { saved: true, characters: text.length };
      } catch (error) {
        return { saved: false, error: error.name, characters: text.length };
      }
    }, cacheText);
    storage.push({
      intervals: count,
      documentBytes: Buffer.byteLength(docText),
      requestBytes,
      cacheBytesUTF8: Buffer.byteLength(cacheText),
      cloudLimitExceeded: requestBytes > 4 * 1024 ** 2,
      pollDocumentBytesPerHour: Buffer.byteLength(docText) * 360,
      browser: browserResult,
    });
  }
  const priorDocument = globalThis.document,
    priorLocation = globalThis.location;
  let schedule, orphanEvidence;
  try {
    globalThis.document = { addEventListener() {} };
    globalThis.location = { search: '' };
    const state = newState();
    state.academic.startDate = '2026-10-22';
    const ui = createAcademicUI({ state: () => state, icon: () => '' });
    const before = ui.render('agenda');
    const firstWeek = state.academic.week;
    const firstDay = agendaItems.filter(
      (x) => agendaDate(state.academic, x.id) === '2026-10-22',
    );
    schedule = {
      defaultSelectedWeek: firstWeek,
      dayOneActualWeeks: firstDay.map((x) => x.week),
      dayOneSessionIds: firstDay.map((x) => x.id),
      agendaHTMLShowsWeekTwo: before.includes(
        'data-id="2" aria-pressed="true"',
      ),
    };
    const copy = structuredClone(state);
    copy.academic.progress['not-in-current-catalog'] = [true, false, false];
    try {
      validateState(copy);
      orphanEvidence = { accepted: true };
    } catch (error) {
      orphanEvidence = { accepted: false, errorKey: error.key };
    }
  } finally {
    if (priorDocument === undefined) delete globalThis.document;
    else globalThis.document = priorDocument;
    if (priorLocation === undefined) delete globalThis.location;
    else globalThis.location = priorLocation;
  }
  const report = {
    fixture:
      'synthetic ASCII UUID interval records; one subject; no personal data',
    browserVersion: browser.version(),
    storage,
    schedule,
    unknownCatalogTopic: orphanEvidence,
  };
  await fs.writeFile(
    'outputs/public-analysis-evidence.json',
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
