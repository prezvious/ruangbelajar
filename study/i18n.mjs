import { learningCatalogues } from './learning-locales.mjs';
import id from './locales/id-ID.mjs';
import gb from './locales/en-GB.mjs';
import us from './locales/en-US.mjs';
import es from './locales/es-ES.mjs';
import fr from './locales/fr-FR.mjs';
import ru from './locales/ru-RU.mjs';
import { academicCatalogues } from './academic-locales.mjs';
import { supportCatalogues } from './support-locales.mjs';

export const CATALOGUES = Object.freeze(
  Object.fromEntries(
    Object.entries({
      'id-ID': id,
      'en-GB': gb,
      'en-US': us,
      'es-ES': es,
      'fr-FR': fr,
      'ru-RU': ru,
    }).map(([locale, catalogue]) => [
      locale,
      {
        ...catalogue,
        ...academicCatalogues[locale],
        ...supportCatalogues[locale],
        ...learningCatalogues[locale],
      },
    ]),
  ),
);
export const LANGUAGES = Object.freeze([
  { code: 'id-ID', name: 'Bahasa Indonesia' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Español' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'ru-RU', name: 'Русский' },
]);
export const LOCALE_KEY = 'ruang.locale.v1';
let currentLocale = 'id-ID';
const localeListeners = new Set(),
  intlCache = new Map();
function savedLocale() {
  try {
    const value = globalThis.localStorage?.getItem(LOCALE_KEY);
    return Object.hasOwn(CATALOGUES, value) ? value : 'id-ID';
  } catch {
    return currentLocale;
  }
}
currentLocale = savedLocale();
export const getLocale = () => currentLocale;
function intl(kind, options = {}) {
  const key = kind + currentLocale + JSON.stringify(options);
  if (!intlCache.has(key))
    intlCache.set(key, new Intl[kind](currentLocale, options));
  return intlCache.get(key);
}
export function formatNumber(value, options = {}) {
  return intl('NumberFormat', options).format(value);
}
export function formatPercent(value) {
  return formatNumber(value, { style: 'percent', maximumFractionDigits: 0 });
}
export function t(key, params = {}) {
  let value = CATALOGUES[currentLocale][key];
  if (value === undefined) throw Error('Missing localisation key: ' + key);
  if (typeof value === 'object') {
    const category = intl('PluralRules').select(params.count);
    value = value[category] || value.other;
    if (!value) throw Error('Missing plural form: ' + key);
  }
  return value.replace(/\{([a-zA-Z][\w]*)\}/g, (_, name) => {
    if (!Object.hasOwn(params, name))
      throw Error('Missing localisation parameter: ' + key + '.' + name);
    const parameter = params[name];
    return typeof parameter === 'number'
      ? formatNumber(parameter)
      : parameter?.key
        ? t(parameter.key, parameter.params || {})
        : String(parameter);
  });
}
export const message = (key, params = {}) => ({ key, params });
export class LocalisedError extends Error {
  constructor(key, params = {}) {
    super();
    this.name = 'LocalisedError';
    this.key = key;
    this.params = params;
    Object.defineProperty(this, 'message', {
      get: () => t(this.key, this.params),
      configurable: true,
    });
  }
}
export function messageText(value, fallback = 'error.generic') {
  if (value?.key && Object.hasOwn(CATALOGUES[currentLocale], value.key))
    return t(value.key, value.params || {});
  if (typeof value === 'string') return value;
  if (value instanceof Error && value.message) return value.message;
  return t(fallback);
}
export function setLocale(locale, { persist = true } = {}) {
  if (!Object.hasOwn(CATALOGUES, locale))
    throw Error('Unsupported locale: ' + locale);
  if (persist)
    try {
      globalThis.localStorage?.setItem(LOCALE_KEY, locale);
    } catch {}
  if (locale === currentLocale) return;
  currentLocale = locale;
  for (const listener of localeListeners) listener(locale);
}
export function onLocaleChange(listener) {
  localeListeners.add(listener);
  return () => localeListeners.delete(listener);
}
globalThis.window?.addEventListener('storage', (event) => {
  if (event.key === LOCALE_KEY || event.key === null)
    setLocale(savedLocale(), { persist: false });
});
export function formatDate(
  value,
  options = { day: 'numeric', month: 'long', year: 'numeric' },
) {
  return intl('DateTimeFormat', options).format(new Date(value));
}
export function formatDateRange(from, to) {
  return intl('DateTimeFormat', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatRange(new Date(from), new Date(to));
}
export function formatTime(value) {
  return intl('DateTimeFormat', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );
}
export function formatClock(ms) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ]
    .map((n) =>
      formatNumber(n, { minimumIntegerDigits: 2, useGrouping: false }),
    )
    .join(':');
}
export function formatDuration(ms, { long = false } = {}) {
  const minutes = Math.floor(Math.max(0, ms) / 60000),
    hours = Math.floor(minutes / 60);
  if (currentLocale === 'id-ID' && !long)
    return hours ? hours + 'j ' + (minutes % 60) + 'm' : minutes + 'm';
  const unitDisplay = long ? 'long' : 'short',
    parts = [];
  if (hours)
    parts.push(
      formatNumber(hours, { style: 'unit', unit: 'hour', unitDisplay }),
    );
  parts.push(
    formatNumber(minutes % 60, { style: 'unit', unit: 'minute', unitDisplay }),
  );
  return intl('ListFormat', {
    type: 'unit',
    style: long ? 'long' : 'narrow',
  }).format(parts);
}
export function formatHours(hours) {
  return formatNumber(hours, {
    style: 'unit',
    unit: 'hour',
    unitDisplay: 'narrow',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
export const firstWeekday = () => (currentLocale === 'en-US' ? 0 : 1);
export function localeWeekStart(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - firstWeekday() + 7) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}
export function weekdayNames(width = 'short') {
  const sunday = new Date(2026, 0, 4);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + firstWeekday() + i);
    return formatDate(date, { weekday: width });
  });
}
export function validCivilDate(iso) {
  if (
    typeof iso !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(iso) ||
    iso.startsWith('0000-')
  )
    return false;
  const date = new Date(iso + 'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === iso;
}
export function formatCivilDate(
  iso,
  options = { day: 'numeric', month: 'long', year: 'numeric' },
) {
  return intl('DateTimeFormat', { ...options, timeZone: 'UTC' }).format(
    new Date(iso + 'T00:00:00Z'),
  );
}
export function formatDateInput(iso) {
  return intl('DateTimeFormat', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .formatToParts(new Date(iso + 'T00:00:00Z'))
    .map((part) =>
      part.type === 'year' ? part.value.padStart(4, '0') : part.value,
    )
    .join('');
}
export function parseDateInput(text) {
  text = String(text).trim();
  let year, month, day;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text))
    [year, month, day] = text.split('-').map(Number);
  else {
    const parts = intl('DateTimeFormat', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).formatToParts(new Date(2026, 10, 23)),
      types = parts
        .filter((p) => ['day', 'month', 'year'].includes(p.type))
        .map((p) => p.type);
    const pattern = parts
      .map((p) =>
        ['day', 'month', 'year'].includes(p.type)
          ? p.type === 'year'
            ? '(\\d{4})'
            : '(\\d{1,2})'
          : p.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      )
      .join('');
    const match = text.match(new RegExp('^' + pattern + '$'));
    if (!match)
      throw new LocalisedError('validation.date', {
        format: message('date.format'),
      });
    const values = Object.fromEntries(
      types.map((type, i) => [type, Number(match[i + 1])]),
    );
    ({ year, month, day } = values);
  }
  const iso =
    String(year).padStart(4, '0') +
    '-' +
    String(month).padStart(2, '0') +
    '-' +
    String(day).padStart(2, '0');
  if (!validCivilDate(iso))
    throw new LocalisedError('validation.date', {
      format: message('date.format'),
    });
  return iso;
}
export function applyDocumentLocale(document = globalThis.document) {
  if (!document) return;
  document.documentElement.lang = currentLocale;
  document.documentElement.dir = 'ltr';
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = t('meta.description');
}
