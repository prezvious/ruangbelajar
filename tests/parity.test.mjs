import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { curriculum, trackerData } from '../study/catalog.mjs';
import { THEME_OPTIONS } from '../study/themes.mjs';
const root = new URL('../', import.meta.url);
function original(file, name) {
  const ctx = vm.createContext({});
  vm.runInContext(
    fs.readFileSync(new URL(file, root), 'utf8') + ';globalThis.result=' + name,
    ctx,
  );
  return JSON.parse(JSON.stringify(ctx.result));
}
assert.deepEqual(curriculum, original('data.js', 'curriculum'));
assert.deepEqual(trackerData, original('tracker-data.js', 'trackerData'));
assert.equal(curriculum.weeks.length, 12);
assert.equal(curriculum.weeks.flatMap((x) => x.sessions).length, 84);
assert.equal(trackerData.topics.length, 116);
assert.equal(
  trackerData.topics.filter(
    (x) => x.subjects.includes('PK') && x.subjects.includes('PM'),
  ).length,
  12,
);
assert.equal(THEME_OPTIONS.length, 63);
assert.equal(new Set(THEME_OPTIONS.map((x) => x.key)).size, 63);
const hashes = JSON.parse(
  fs.readFileSync(new URL('./vendor-hashes.json', import.meta.url), 'utf8'),
);
for (const [file, expected] of Object.entries(hashes))
  assert.equal(
    createHash('sha256')
      .update(fs.readFileSync(new URL('study/vendor/' + file, root)))
      .digest('hex'),
    expected,
    file + ' must retain the verified Sela source bytes',
  );
function modules(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? modules(path.join(dir, entry.name))
        : entry.name.endsWith('.mjs')
          ? [path.join(dir, entry.name)]
          : [],
    );
}
const studyRoot = fileURLToPath(new URL('../study/', import.meta.url));
for (const file of modules(studyRoot)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(
    /(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g,
  )) {
    const resolved = path.resolve(path.dirname(file), match[1]);
    assert.ok(
      resolved.startsWith(path.resolve(studyRoot) + path.sep),
      'Runtime import must stay in study/: ' + resolved,
    );
    assert.ok(fs.existsSync(resolved), 'Missing runtime import ' + resolved);
  }
}
console.log(
  'PASS: original curriculum/tracker content, 63 unique themes, unchanged Sela vendor hashes and self-contained runtime imports.',
);
