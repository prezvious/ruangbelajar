import assert from 'node:assert/strict';
import {
  CATALOGUES,
  LANGUAGES,
  setLocale,
  t,
  messageText,
  LocalisedError,
  formatDateInput,
  parseDateInput,
  formatNumber,
  formatTime,
  formatDuration,
  firstWeekday,
  localeWeekStart,
  weekdayNames,
} from '../study/i18n.mjs';
import { THEME_OPTIONS } from '../study/themes.mjs';
const params = (text) =>
  [
    ...new Set([...text.matchAll(/\{([a-zA-Z][\w]*)\}/g)].map((m) => m[1])),
  ].sort();
const base = CATALOGUES['en-GB'],
  keys = Object.keys(base).sort();
let checked = 0;
for (const { code } of LANGUAGES) {
  const catalogue = CATALOGUES[code];
  assert.deepEqual(Object.keys(catalogue).sort(), keys);
  setLocale(code, { persist: false });
  for (const [key, value] of Object.entries(catalogue)) {
    const expected = params(
        typeof base[key] === 'string' ? base[key] : base[key].other,
      ),
      forms = typeof value === 'string' ? [value] : Object.values(value);
    if (typeof value === 'object') {
      assert.ok(value.other, key);
      for (const category of new Intl.PluralRules(code).resolvedOptions()
        .pluralCategories)
        assert.ok(value[category], `${code}/${key}/${category}`);
    }
    for (const form of forms) {
      assert.ok(form.trim());
      assert.deepEqual(params(form), expected, `${code}/${key}`);
    }
    const values = Object.fromEntries(
      expected.map((p) => [p, p === 'count' ? 22 : 'test']),
    );
    assert.ok(t(key, values));
    checked++;
  }
  for (const theme of THEME_OPTIONS) assert.ok(catalogue['theme.' + theme.key]);
  const input = formatDateInput('2026-10-01');
  assert.equal(parseDateInput(input), '2026-10-01');
  assert.equal(parseDateInput(formatDateInput('0001-01-01')), '0001-01-01');
  assert.equal(parseDateInput('2024-02-29'), '2024-02-29');
  assert.throws(() => parseDateInput('2026-02-29'), LocalisedError);
  assert.throws(() => parseDateInput('2026-04-31'), LocalisedError);
  assert.throws(() => parseDateInput('2026-00-01'), LocalisedError);
  assert.throws(() => parseDateInput('2026-01-00'), LocalisedError);
  assert.equal(firstWeekday(), code === 'en-US' ? 0 : 1);
  assert.equal(localeWeekStart(new Date(2026, 9, 1)).getDay(), firstWeekday());
  assert.equal(weekdayNames().length, 7);
  assert.ok(formatDuration(3720000).length > 0);
  assert.ok(formatTime(new Date(2026, 9, 1, 14, 5)).length > 0);
}
setLocale('en-GB', { persist: false });
assert.equal(formatDateInput('2026-10-01'), '01/10/2026');
assert.equal(parseDateInput('01/10/2026'), '2026-10-01');
assert.ok(t('form.subjectExample').includes('Maths'));
assert.equal(t('form.colour'), 'Colour');
assert.ok(!/PM/.test(formatTime(new Date(2026, 9, 1, 14, 5))));
const existingError = new LocalisedError('error.nameUsed');
setLocale('en-US', { persist: false });
assert.equal(formatDateInput('2026-10-01'), '10/01/2026');
assert.equal(parseDateInput('01/10/2026'), '2026-01-10');
assert.ok(t('form.subjectExample').includes('Math'));
assert.equal(t('form.colour'), 'Color');
assert.ok(/PM/.test(formatTime(new Date(2026, 9, 1, 14, 5))));
let dateError;
try {
  parseDateInput('invalid');
} catch (error) {
  dateError = error;
}
assert.ok(dateError.message.includes('MM/DD/YYYY'));
setLocale('fr-FR', { persist: false });
assert.ok(dateError.message.includes('JJ/MM/AAAA'));
assert.ok(!dateError.message.includes('MM/DD/YYYY'));
setLocale('ru-RU', { persist: false });
assert.equal(formatDateInput('2026-10-01'), '01.10.2026');
assert.notEqual(existingError.message, base['error.nameUsed']);
for (const [count, ending] of [
  [0, 'занятий'],
  [1, 'занятие'],
  [2, 'занятия'],
  [5, 'занятий'],
  [11, 'занятий'],
  [21, 'занятие'],
  [22, 'занятия'],
  [25, 'занятий'],
])
  assert.equal(t('count.sessions', { count }), `${count} ${ending}`);
setLocale('fr-FR', { persist: false });
assert.ok(formatNumber(1.5).includes(','));
assert.throws(() => setLocale('xx-XX'));
assert.throws(() => t('missing'));
assert.throws(() => t('form.importText'));

assert.equal(THEME_OPTIONS.length, 63);
console.log(
  'PASS: ' +
    checked +
    ' messages, placeholders, plural categories, 63 theme labels, UK/US dates and clocks, Russian plurals and date validation in six locales.',
);
