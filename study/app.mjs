import { pollWorkspace } from './poll.mjs';
import {
  setOccurrence,
  taskOccurrences,
  occurrenceOn,
  assertCloudCapacity,
} from './learning-model.mjs';
import { validateForm } from './forms.mjs';
import {
  t,
  message,
  messageText,
  LocalisedError,
  LANGUAGES,
  getLocale,
  setLocale,
  onLocaleChange,
  applyDocumentLocale,
  formatDate,
  formatCivilDate,
  formatDateRange,
  formatTime,
  formatNumber,
  formatPercent,
  formatClock,
  formatDuration,
  formatHours,
  firstWeekday,
  localeWeekStart,
  weekdayNames,
  formatDateInput,
  parseDateInput,
} from './i18n.mjs';
import {
  dateField,
  closeDatePicker,
  captureDatePicker,
  restoreDatePicker,
  initDateInputs,
} from './date-input.mjs';
import {
  COLORS,
  uid,
  dayKey,
  parseDay,
  addDays,
  calendarDays,
  esc,
  newState,
  elapsed,
  startTimer,
  pauseTimer,
  finishTimer,
  aggregate,
  streak,
  validateState,
  allSessions,
  hasActiveSession,
  heatPalette,
  restoreLocalState,
  LIMITS,
  MAX_BACKUP_BYTES,
  backupState,
  serializeBackup,
  parseBackup,
} from './core.mjs';
import {
  withWorkspaceLock as withStudyLock,
  workspaceStorage,
  afterWorkspaceCommit,
  setRepositoryScope,
  snapshot,
  snapshots,
  forgetWorkspace,
  storageEstimate,
} from './repository.mjs';
import { createLearningUI } from './learning-ui.mjs';
import { THEME_OPTIONS, getThemeByKey, getThemeTokens } from './themes.mjs';
import * as cloud from './cloud.mjs';
import {
  createSync,
  GUEST_KEY,
  parseWorkspace,
  documentOf,
  sameDocument,
} from './sync.mjs';
import { migrateLocalRuang } from './migration.mjs';
import { createAcademicUI } from './academic-ui.mjs';
import { createProfileSettings } from './profile-settings.mjs';
import { iconSet } from './icons.mjs';
import { materialStats, agendaDate, agendaItems } from './academic-model.mjs';

const routes = {
  agenda: '/',
  today: '/hari-ini',
  planner: '/rencana',
  notes: '/catatan',
  records: '/catatan-waktu',
  dasbor: '/dasbor',
  materi: '/materi',
  tracker: '/tracker',
  tryout: '/tryout',
  panduan: '/panduan',
  study: '/belajar',
  stats: '/statistik',
  calendar: '/kalender',
  subjects: '/mata-pelajaran',
  settings: '/pengaturan',
  account: '/akun',
  migrasi: '/migrasi',
};
const viewFromPath = () =>
  ['/sign-in', '/sign-up'].includes(location.pathname)
    ? 'account'
    : Object.entries(routes).find(
        ([, path]) => path === location.pathname,
      )?.[0] || 'agenda';
function navigate(next) {
  view = next;
  history.pushState(null, '', routes[next] || '/');
  focused = false;
  render();
  window.scrollTo({ top: 0, behavior: 'auto' });
}
if (
  location.hash.startsWith('#') &&
  routes[location.hash.slice(1).split('?')[0]]
) {
  const [old, query] = location.hash.slice(1).split('?');
  history.replaceState(null, '', routes[old] + (query ? '?' + query : ''));
}
let syncEngine = null,
  accountUser = null,
  accountMode = location.pathname === '/sign-up' ? 'signup' : 'login',
  accountMessage = null,
  syncState = { phase: 'guest' },
  applyingAccount = false,
  recoveryMode = false;
let memoryOnly = false,
  needsReset = false,
  cloudStatus = '',
  authPending = false,
  cloudPending = '',
  renderedView = '',
  uiEpoch = 0,
  modalOpener = '',
  importEpoch = 0,
  recoverableCache = null;
let KEY = GUEST_KEY;
setRepositoryScope(() => [KEY]);
const app = document.querySelector('#app'),
  modal = document.querySelector('#modal');
let state,
  unreadableRaw = '',
  storedRaw = null,
  storageIssue = '',
  view = viewFromPath(),
  period = 'week',
  cursor = new Date(),
  heatMode = 'contributions',
  taskDate = dayKey(),
  taskFilter = 'all',
  focused = false,
  calendarToday = dayKey();
try {
  storedRaw = workspaceStorage.getItem(KEY);
  state = await withStudyLock(() => migrateLocalRuang(workspaceStorage).state);
  storedRaw = workspaceStorage.getItem(KEY);
} catch (e) {
  try {
    await withStudyLock(() => {
      storedRaw = workspaceStorage.getItem(KEY);
    });
  } catch {}
  try {
    storedRaw ||= localStorage.getItem(KEY);
  } catch {}
  state = newState();
  if (storedRaw) {
    unreadableRaw = storedRaw;
    storageIssue = message('error.unreadable');
  } else {
    let original;
    try {
      original = Object.fromEntries(
        [
          'ruang-belajar-v1',
          'ruang-belajar-tracker-v1',
          'ruang-belajar-theme-v1',
        ].map((k) => [k, localStorage.getItem(k)]),
      );
    } catch {}
    if (original && Object.values(original).some((x) => x !== null)) {
      unreadableRaw = JSON.stringify({
        format: 'ruang-belajar-legacy-v1',
        storage: original,
      });
      storageIssue = message('error.unreadable');
    } else {
      memoryOnly = true;
      storageIssue = message('error.storageUnavailable');
    }
  }
}
const iconNames = {
  timer: 'circle',
  chart: 'flag',
  calendar: 'calendar-days',
  book: 'book-open',
  settings: 'list-filter',
  sun: 'eye',
  moon: 'eye-off',
  plus: 'circle',
  play: 'arrow-right',
  pause: 'circle',
  stop: 'circle-check',
  arrow: 'chevron-left',
  check: 'check',
  fire: 'flag',
  target: 'circle-check',
  edit: 'book-open',
  trash: 'circle',
  expand: 'panel-left',
  close: 'circle',
  download: 'arrow-right',
  upload: 'arrow-up-right',
  cloud: 'shield-check',
  list: 'library-big',
  monitor: 'panel-left',
  external: 'external-link',
  agenda: 'calendar-days',
  tracker: 'circle-check',
  guide: 'compass',
};
const icon = (n) => {
  const item = iconSet.icons[iconNames[n] || n] || iconSet.icons['book-open'];
  return (
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    item.body +
    '</svg>'
  );
};
const button = (action, label, ic = '', classes = '', extra = '') =>
  `<button type="button" class="btn ${classes}" data-action="${action}" ${extra}>${ic ? icon(ic) : ''}${esc(label)}</button>`;
const fmtDate = formatDate,
  ht = (key, params) => esc(t(key, params));
// setFullYear preserves years 1–99 instead of applying Date's 1900 offset.
const monthDate = (v, offset = 0, day = 1) => {
  const d = addDays(v, 0);
  d.setFullYear(d.getFullYear(), d.getMonth() + offset, day);
  d.setHours(0, 0, 0, 0);
  return d;
};
const subject = (id) => state.subjects.find((x) => x.id === id);
const dot = (s) =>
  `<span class="subject-dot" style="--subject:${s?.color || '#888888'}" aria-hidden="true"></span>`;
const subjectOptions = (selected = '', empty = false) =>
  `${empty ? `<option value="">${ht('subjects.noneOption')}</option>` : ''}${state.subjects
    .filter((x) => !x.archived || x.id === selected)
    .map(
      (x) =>
        `<option value="${esc(x.id)}" ${x.id === selected ? 'selected' : ''}>${esc(x.name)}</option>`,
    )
    .join('')}`;
function toast(value) {
  toastMessage = value;
  const el = document.querySelector('#toast');
  el.textContent = messageText(value);
  el.classList.add('show');
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => {
    el.classList.remove('show');
    toastMessage = null;
  }, 4500);
}
function persist(next) {
  const valid = validateState(next);
  valid.updatedAt = Date.now();
  if (syncEngine?.account) assertCloudCapacity(documentOf(valid, getLocale()));
  const raw = JSON.stringify(valid);
  let failure = null;
  try {
    if (syncEngine?.account) syncEngine.write(valid, getLocale());
    else workspaceStorage.setItem(KEY, raw);
    const scope = KEY;
    afterWorkspaceCommit(() => {
      if (scope !== KEY) return;
      storedRaw = workspaceStorage.getItem(KEY);
      memoryOnly = false;
      storageIssue = '';
      unreadableRaw = '';
      recoverableCache = null;
      state = valid;
      render();
    });
  } catch (error) {
    if (error?.key) throw error;
    memoryOnly = true;
    storageIssue = message('error.storageFull');
    if (syncEngine?.account)
      syncState = { ...syncState, phase: 'error', error: storageIssue };
    failure = new LocalisedError('error.storageFull');
  }
  if (failure) {
    state = valid;
    render();
    throw failure;
  }
}
function latestState() {
  if (unreadableRaw) throw new LocalisedError('error.recoveryFirst');
  let raw;
  try {
    raw = workspaceStorage.getItem(KEY);
  } catch {
    if (memoryOnly) return structuredClone(state);
    throw new LocalisedError('error.storageRead');
  }
  if (memoryOnly) {
    if (raw !== storedRaw) throw new LocalisedError('error.tabConflict');
    return structuredClone(state);
  }
  const latest = syncEngine?.account
    ? validateState(parseWorkspace(raw)?.doc || newState())
    : restoreLocalState(raw).state;
  storedRaw = raw;
  return latest;
}
function showUnreadableWorkspace(raw) {
  recoverableCache = null;
  if (raw === undefined) {
    memoryOnly = true;
    storageIssue = message('error.storageRead');
    return;
  }
  state = newState();
  unreadableRaw = raw || '';
  storedRaw = raw;
  memoryOnly = false;
  storageIssue = message('error.unreadable');
  if (accountUser && raw)
    try {
      const value = JSON.parse(raw);
      recoverableCache = documentOf(value, value.locale);
      state = validateState(recoverableCache);
    } catch {}
}
function mutate(fn) {
  const scope = KEY;
  return withStudyLock(() => {
    if (scope !== KEY) throw new LocalisedError('error.accountChanged');
    if (syncEngine?.loading) throw new LocalisedError('sync.loading');
    const next = latestState();
    const previous = JSON.stringify(next);
    const before = structuredClone(next);
    const result = fn(next);
    const deleted =
      ['tasks', 'sessions'].some((k) => before[k].length > next[k].length) ||
      before.academic.tryouts.length > next.academic.tryouts.length ||
      ['notes', 'resources'].some(
        (k) => before.learning[k].length > next.learning[k].length,
      );
    const scheduleChanged =
      before.academic.startDate !== next.academic.startDate ||
      JSON.stringify(before.academic.dates) !==
        JSON.stringify(next.academic.dates);
    if (deleted || scheduleChanged)
      snapshot(KEY, previous, deleted ? 'delete' : 'plan');
    persist(next);
    return result;
  });
}
function replaceData(
  next,
  { recover = false, expectedRaw = storedRaw, beforeReplace = () => {} } = {},
) {
  const scope = KEY;
  return withStudyLock(() => {
    if (scope !== KEY) throw new LocalisedError('error.accountChanged');
    if (syncEngine?.loading) throw new LocalisedError('sync.loading');
    if (recover || unreadableRaw) {
      let raw;
      try {
        raw = workspaceStorage.getItem(KEY);
      } catch {
        throw new LocalisedError('error.storageRead');
      }
      if (raw !== expectedRaw) throw new LocalisedError('error.tabConflict');
    }
    const current = recover || unreadableRaw ? state : latestState();
    if (hasActiveSession(current))
      throw new LocalisedError('error.finishReplace');
    snapshot(KEY, JSON.stringify(current), 'replace');
    beforeReplace();
    exportData(current);
    if (recover && syncEngine?.account)
      syncEngine.resetCache(next, getLocale(), expectedRaw);
    persist(next);
  });
}
function applyTheme() {
  document.documentElement.dataset.paletteFamily = [
    'olive',
    'ocean',
    'terracotta',
    'plum',
  ].includes(state.settings.themeKey)
    ? 'ruang'
    : 'sela';
  const mode =
    state.settings.theme === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : state.settings.theme;
  const t = getThemeTokens(state.settings.themeKey, mode);
  for (const [k, v] of Object.entries(t)) {
    if (typeof v === 'string')
      document.documentElement.style.setProperty(
        '--' + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()),
        v,
      );
  }
  const theme = getThemeByKey(state.settings.themeKey);
  document.documentElement.style.setProperty(
    '--layout-panel-radius',
    theme.layout.panelRadius,
  );
  heatPalette(t).forEach((c, i) => {
    document.documentElement.style.setProperty('--heat-bg-' + i, c.background);
    document.documentElement.style.setProperty('--heat-text-' + i, c.text);
  });
  document.documentElement.style.colorScheme = mode;
  document.body.dataset.resolvedMode = mode;
  document.querySelector('meta[name="theme-color"]').content = t.paper;
}
function statCards(a = aggregate(state, dayKey(), dayKey())) {
  return `<div class="summary-grid"><div class="summary-item">${icon('timer')}<div><span>${ht('summary.today')}</span><strong data-live="today">${formatClock(a.total)}</strong></div></div><div class="summary-item">${icon('target')}<div><span>${ht('summary.goal')}</span><strong><span data-live="today-minutes">${formatNumber(Math.floor(a.total / 60000))}</span> <small>${ht('summary.goalValue', { goal: state.settings.goal })}</small></strong></div><span class="summary-progress" data-live="goal-percent">${formatPercent(Math.min(1, a.total / (state.settings.goal * 60000)))}</span></div><div class="summary-item"><div><span>${ht('summary.consistency')}</span><strong class="streak-value" data-live="streak">${ht('summary.streak', { count: streak(state) })}</strong></div></div></div>`;
}
function timerCard() {
  const timer = state.timer,
    chosen = subject(timer.subjectId),
    running = timer.startedAt !== null,
    hasSubjects = state.subjects.some((x) => !x.archived);
  return `<section class="panel timer-panel ${running ? 'running' : ''}" aria-labelledby="timer-heading"><div class="panel-top"><h2 id="timer-heading">${ht('timer.heading')}</h2>${button('focus', '', focused ? 'close' : 'expand', 'icon-btn', `aria-label="${ht(focused ? 'timer.exitFocus' : 'timer.focus')}" title="${ht('timer.focus')}"`)}</div><div class="timer-center"><label class="timer-subject">${dot(chosen)}<select id="timer-subject" aria-label="${ht('timer.subject')}" ${hasActiveSession(state) || !hasSubjects ? 'disabled' : ''}>${hasSubjects ? subjectOptions(timer.subjectId) : `<option>${ht('timer.choosePrompt')}</option>`}</select></label><div class="timer-digits" data-live="timer" aria-label="${ht('timer.elapsed')}">${formatClock(elapsed(state))}</div><p class="timer-status" data-live="status">${ht(!hasSubjects ? 'timer.empty' : running ? 'timer.runningHint' : hasActiveSession(state) ? 'timer.pausedHint' : 'timer.readyHint')}</p><div class="timer-actions">${hasSubjects ? button('toggle-timer', t(running ? 'timer.pause' : hasActiveSession(state) ? 'timer.resume' : 'timer.start'), running ? 'pause' : 'play', 'primary', `data-running="${running}" data-run-id="${timer.runId}"`) : button('add-subject', t('subjects.add'), 'plus', 'primary')}${button('finish', t('timer.finish'), 'stop', 'quiet', `data-run-id="${timer.runId}" ${!hasActiveSession(state) ? 'disabled' : ''}`)}</div></div><div class="timer-bottom"><span class="status-dot ${running ? 'live' : ''}"></span><span>${ht(running ? 'timer.running' : hasActiveSession(state) ? 'timer.paused' : 'timer.ready')}</span><span>${ht('timer.stopwatch')}</span></div></section>`;
}
function tasksCard() {
  const tasks = taskOccurrences(state, taskDate, taskDate),
    visible = tasks.filter((x) => taskFilter !== 'active' || !x.done),
    done = tasks.filter((x) => x.done).length;
  return `<section class="panel tasks-panel"><div class="panel-top"><h2>${taskDate === dayKey() ? ht('tasks.today') : ht('tasks.dateHeading', { date: formatCivilDate(taskDate, { day: 'numeric', month: 'short' }) })}</h2><span class="pill">${ht('tasks.progress', { done, total: tasks.length })}</span></div><div class="task-filter"><div class="tabs"><button data-action="task-filter" data-value="all" aria-pressed="${taskFilter === 'all'}">${ht('tasks.all')}</button><button data-action="task-filter" data-value="active" aria-pressed="${taskFilter === 'active'}">${ht('tasks.active')}</button></div>${dateField('task-date', '', taskDate, t('tasks.date'))}</div><div class="task-list">${
    visible.length
      ? visible
          .map((x) => {
            const s = subject(x.subjectId);
            return `<div class="task ${x.done ? 'done' : ''}"><label><input type="checkbox" data-task="${esc(x.id)}" data-occurrence-date="${x.date}" ${x.done ? 'checked' : ''}><span class="check-box">${icon('check')}</span><span class="task-copy"><span>${esc(x.title)}</span><small>${s ? dot(s) + esc(s.name) : ht('tasks.independent')}</small></span></label><div class="task-tools">${button('edit-task', '', 'edit', 'icon-btn', `data-id="${x.id}" aria-label="${ht('tasks.editNamed', { title: x.title })}"`)}${button('delete-task', '', 'trash', 'icon-btn', `data-id="${x.id}" aria-label="${ht('tasks.deleteNamed', { title: x.title })}"`)}</div></div>`;
          })
          .join('')
      : `<div class="empty">${icon('list')}<p>${ht(tasks.length ? 'tasks.completeEmpty' : 'tasks.empty')}</p><small>${ht(tasks.length ? 'tasks.break' : 'tasks.first')}</small></div>`
  }</div>${button('add-task', t('tasks.add'), 'plus', 'add-row')}</section>`;
}
function subjectRows(a, compact = false) {
  const items = state.subjects
    .filter((x) => !x.archived || a.subjects[x.id])
    .map((x) => ({ ...x, ms: a.subjects[x.id] || 0 }))
    .sort((a, b) => b.ms - a.ms);
  return items.length
    ? items
        .map(
          (x) =>
            `<div class="subject-row"><div class="subject-name">${dot(x)}<span>${esc(x.name)}${x.archived ? `<small>${ht('subjects.archivedSuffix')}</small>` : ''}</span></div><div class="subject-track"><span data-subject-progress="${x.id}" style="width:${a.total ? (x.ms / a.total) * 100 : 0}%;background:${x.color}"></span></div><span class="mono" data-subject-time="${x.id}">${formatDuration(x.ms)}</span>${compact ? button('choose-subject', '', 'play', 'icon-btn', `data-id="${x.id}" aria-label="${ht('subjects.studyNamed', { name: x.name })}" ${x.archived || hasActiveSession(state) ? 'disabled' : ''}`) : ''}</div>`,
        )
        .join('')
    : `<div class="empty"><p>${ht('subjects.emptyDashboard')}</p></div>`;
}
function level(ms) {
  return ms === 0
    ? 0
    : ms < 3600000
      ? 1
      : ms < 7200000
        ? 2
        : ms < 14400000
          ? 3
          : 4;
}
function heatCell(d, days, other = false) {
  const key = dayKey(d),
    ms = days[key] || 0,
    future = key > dayKey(),
    planned =
      agendaItems.some((x) => agendaDate(state.academic, x.id) === key) ||
      state.tasks.some((x) => occurrenceOn(x, key));
  return `<button class="heat-cell l${level(ms)} ${key === dayKey() ? 'today' : ''} ${other ? 'other' : ''}" data-action="day-detail" data-date="${key}" ${future && view !== 'calendar' ? 'disabled' : ''} title="${esc(fmtDate(d))} · ${formatDuration(ms)}" aria-label="${ht('calendar.dayLabel', { date: fmtDate(d), time: formatClock(ms) })}${planned ? ' · ' + ht('a.curriculum') : ''}">${heatMode === 'month' ? formatNumber(d.getDate()) : ''}${planned ? '<span class="planned-dot" aria-hidden="true"></span>' : ''}</button>`;
}
function heatmapCard(full = false) {
  const start = monthDate(cursor),
    end = monthDate(cursor, 1, 0),
    a = aggregate(state, dayKey(addDays(start, -92)), dayKey(addDays(end, 7))),
    all = aggregate(state, dayKey(start), dayKey(end));
  let grid = '';
  if (heatMode === 'contributions') {
    const to = parseDay(dayKey()),
      first = addDays(to, -89),
      from = localeWeekStart(first),
      weekdays = weekdayNames();
    let weeks = 0;
    for (let d = from; d <= to; d = addDays(d, 7)) weeks++;
    let labels = '';
    for (let w = 0; w < weeks; w++) {
      const d = addDays(from, w * 7),
        labelDate = w === 0 ? first : d;
      labels += `<span>${w === 0 || (d.getDate() <= 7 && d.getMonth() !== first.getMonth()) ? fmtDate(labelDate, { month: 'short' }) : ''}</span>`;
    }
    const aa = aggregate(state, dayKey(from), dayKey(to));
    grid = `<div class="contribution-wrap"><div class="day-labels">${[0, 2, 4].map((i) => `<span>${esc(weekdays[i])}</span>`).join('')}</div><div class="contribution-content"><div class="month-labels" style="--weeks:${weeks}">${labels}</div><div class="contribution-grid" style="--weeks:${weeks}">${calendarDays(
      from,
      weeks * 7,
    )
      .map((d) => {
        return !d || d < first
          ? '<span class="heat-cell l0 padding" aria-hidden="true"></span>'
          : heatCell(d, aa.days);
      })
      .join('')}</div></div></div>`;
  } else if (heatMode === 'week') {
    const from = localeWeekStart(cursor);
    grid = `<div class="week-heat">${calendarDays(from, 7)
      .map((d, i) => {
        if (!d)
          return `<div><span>${esc(weekdayNames()[i])}</span><span class="heat-cell padding" aria-hidden="true"></span></div>`;
        const ms = a.days[dayKey(d)] || 0;
        return `<div><span>${fmtDate(d, { weekday: 'short' })}</span>${heatCell(d, a.days)}<strong>${formatNumber(d.getDate())}</strong><small data-heat-day="${dayKey(d)}">${formatDuration(ms)}</small></div>`;
      })
      .join('')}</div>`;
  } else {
    const from = localeWeekStart(start),
      count =
        Math.ceil(
          (((start.getDay() - firstWeekday() + 7) % 7) + end.getDate()) / 7,
        ) * 7;
    grid = `<div class="calendar-grid">${weekdayNames()
      .map((x) => `<span class="calendar-label">${esc(x)}</span>`)
      .join('')}${calendarDays(from, count)
      .map((d) =>
        d
          ? heatCell(d, a.days, d.getMonth() !== start.getMonth())
          : '<span class="heat-cell padding" aria-hidden="true"></span>',
      )
      .join('')}</div>`;
  }
  const from = localeWeekStart(cursor),
    weekTotal = aggregate(state, dayKey(from), dayKey(addDays(from, 6))).total;
  return `<section class="panel heatmap-panel"><div class="panel-top"><div><h2>${ht('calendar.heading')}</h2><p>${ht('calendar.intro')}</p></div><div class="tabs">${[
    ['contributions', 'calendar.ninety'],
    ['week', 'calendar.week'],
    ['month', 'calendar.month'],
  ]
    .map(
      ([value, key]) =>
        `<button data-action="heat-mode" data-value="${value}" aria-pressed="${heatMode === value}">${ht(key)}</button>`,
    )
    .join(
      '',
    )}</div></div>${heatMode !== 'contributions' ? `<div class="period-nav">${button('heat-prev', '', 'arrow', 'icon-btn', `aria-label="${ht('calendar.previous')}"`)}<strong>${heatMode === 'month' ? fmtDate(start, { month: 'long', year: 'numeric' }) : formatDateRange(from, addDays(from, 6))}</strong>${button('heat-next', '', 'arrow', 'icon-btn forward', `aria-label="${ht('calendar.next')}"`)}</div>` : ''}${grid}<div class="heatmap-footer"><span data-live="heat-total">${heatMode === 'contributions' ? ht('calendar.trail') : ht(heatMode === 'week' ? 'calendar.weekTotal' : 'calendar.monthTotal', { duration: formatDuration(heatMode === 'week' ? weekTotal : all.total) })}</span><div class="legend"><span>${ht('calendar.less')}</span>${[0, 1, 2, 3, 4].map((i) => `<span class="heat-sample l${i}"></span>`).join('')}<span>${ht('calendar.more')}</span></div></div>${full ? `<div class="calendar-info">${ht('calendar.help')}</div>` : ''}</section>`;
}
function studyView() {
  const a = aggregate(state, dayKey(), dayKey());
  return `${statCards(a)}<div class="study-grid">${timerCard()}${tasksCard()}</div><div class="bottom-grid">${heatmapCard()}<section class="panel subjects-panel" data-today-subjects><div class="panel-top"><h2>${ht('summary.today')}</h2>${button('nav', t('subjects.manage'), '', 'text-button', 'data-view="subjects"')}</div>${subjectRows(a, true)}<div class="panel-note"><span data-live="session-count">${ht('count.sessions', { count: a.count })}</span> · ${ht('stats.longest')} <span data-live="max-focus">${formatDuration(a.max)}</span></div></section></div>`;
}
function range() {
  const d = parseDay(dayKey(cursor));
  if (period === 'day') return [d, d];
  if (period === 'week') {
    const from = localeWeekStart(d);
    return [from, addDays(from, 6)];
  }
  return [monthDate(d), monthDate(d, 1, 0)];
}
function statsView() {
  const [from, to] = range(),
    a = aggregate(state, dayKey(from), dayKey(to)),
    days = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  const max = Math.max(3600000, ...Object.values(a.days)),
    sessions = allSessions(state)
      .filter((x) => x.end > +from && x.start < +addDays(to, 1))
      .map((x) => ({
        ...x,
        periodMs: Math.max(
          0,
          Math.min(x.end, +addDays(to, 1)) - Math.max(x.start, +from),
        ),
      }))
      .sort((a, b) => b.start - a.start);
  return `<div class="page-toolbar"><div class="tabs">${[
    ['day', 'stats.daily'],
    ['week', 'stats.weekly'],
    ['month', 'stats.monthly'],
  ]
    .map(
      ([value, key]) =>
        `<button data-action="period" data-value="${value}" aria-pressed="${period === value}">${ht(key)}</button>`,
    )
    .join(
      '',
    )}</div><div class="period-nav">${button('period-prev', '', 'arrow', 'icon-btn', `aria-label="${ht('calendar.previous')}"`)}<strong>${period === 'month' ? fmtDate(from, { month: 'long', year: 'numeric' }) : period === 'day' ? fmtDate(from) : formatDateRange(from, to)}</strong>${button('period-next', '', 'arrow', 'icon-btn forward', `aria-label="${ht('calendar.next')}"`)}${button('period-today', t('stats.now'), '', 'text-button')}</div></div><div class="summary-grid stats-summary"><div class="summary-item"><div><span>${ht('stats.total')}</span><strong>${formatClock(a.total)}</strong></div></div><div class="summary-item"><div><span>${ht('stats.average')}</span><strong>${formatDuration(a.total / days.length)}</strong></div></div><div class="summary-item"><div><span>${ht('stats.longest')}</span><strong>${formatDuration(a.max)} <small>· ${ht('count.sessions', { count: a.count })}</small></strong></div></div></div><div class="stats-grid"><section class="panel"><div class="panel-top"><h2>${ht('stats.rhythm')}</h2><span class="muted">${ht('stats.hours')}</span></div>${
    period === 'day'
      ? timeline(a)
      : `<div class="bar-chart" role="img" aria-label="${ht('stats.chartLabel')}"><div class="chart-axis"><span>${formatHours(max / 3600000)}</span><span>${formatHours(max / 7200000)}</span><span>${formatNumber(0)}</span></div><div class="bar-columns">${days
          .map((d) => {
            const ms = a.days[dayKey(d)] || 0;
            return `<button class="bar-column" data-action="day-detail" data-date="${dayKey(d)}" aria-label="${ht('calendar.dayLabel', { date: fmtDate(d), time: formatDuration(ms) })}" title="${esc(fmtDate(d))}: ${formatDuration(ms)}"><span class="bar" style="height:${(ms / max) * 100}%;min-height:${ms ? 4 : 0}px"></span><span class="bar-label">${period === 'week' ? fmtDate(d, { weekday: 'short' }) : formatNumber(d.getDate())}</span></button>`;
          })
          .join('')}</div></div>`
  }<div class="panel-note">${ht('stats.activeDays', { count: Object.keys(a.days).length })}</div></section><section class="panel"><div class="panel-top"><h2>${ht('stats.bySubject')}</h2></div>${subjectRows(a)}</section></div><section class="panel history-panel"><div class="panel-top"><h2>${ht('stats.history')}</h2><span class="muted">${ht('count.records', { count: sessions.length })}</span></div><div class="table-scroll"><table><thead><tr>${['subject', 'date', 'start', 'duration', 'status'].map((key) => `<th>${ht('table.' + key)}</th>`).join('')}</tr></thead><tbody>${
    sessions
      .slice(0, 100)
      .map(
        (x) =>
          `<tr><td>${dot(subject(x.subjectId))}${esc(subject(x.subjectId)?.name || t('subjects.generic'))}</td><td>${fmtDate(x.start, { day: 'numeric', month: 'short' })}</td><td class="mono">${formatTime(x.start)}</td><td class="mono" title="${ht('table.segment', { time: formatClock(x.durationMs) })}">${formatClock(x.periodMs)}</td><td><span class="pill">${ht(x.id.startsWith('active:') ? 'table.running' : 'table.recorded')}</span></td></tr>`,
      )
      .join('') ||
    `<tr><td colspan="5" class="empty">${ht('table.empty')}</td></tr>`
  }</tbody></table></div>${sessions.length > 100 ? `<p class="panel-note">${ht('table.limited')}</p>` : ''}</section>`;
}
function timeline(a) {
  return `<div class="timeline">${a.parts.length ? a.parts.map((x) => `<div class="timeline-row"><span class="mono">${formatTime(x.start)}</span><div>${dot(subject(x.subjectId))}<strong>${esc(subject(x.subjectId)?.name)}</strong><small>${formatClock(x.ms)}</small></div></div>`).join('') : `<div class="empty"><p>${ht('timeline.empty')}</p></div>`}</div>`;
}
function subjectsView() {
  const totals = Object.create(null);
  for (const interval of allSessions(state))
    totals[interval.subjectId] =
      (totals[interval.subjectId] || 0) + interval.durationMs;
  return `<div class="page-toolbar"><p class="muted">${ht('subjects.intro')}</p>${button('add-subject', t('subjects.add'), 'plus', 'primary')}</div><section class="panel subject-manager">${
    state.subjects
      .filter((x) => !x.archived)
      .map(
        (x) =>
          `<div class="managed-subject"><div class="subject-symbol" style="--subject:${x.color}">${icon('book')}</div><div><h2>${esc(x.name)}</h2><p><span data-subject-lifetime="${x.id}">${ht('subjects.total', { duration: formatDuration(totals[x.id] || 0) })}</span> · ${ht('count.records', { count: state.sessions.filter((y) => y.subjectId === x.id).length })}</p></div><div class="managed-actions">${button('choose-subject', t('subjects.study'), 'play', 'quiet', `data-id="${x.id}" ${hasActiveSession(state) ? 'disabled' : ''}`)}${button('edit-subject', '', 'edit', 'icon-btn', `data-id="${x.id}" aria-label="${ht('subjects.editNamed', { name: x.name })}"`)}${button('delete-subject', '', 'trash', 'icon-btn', `data-id="${x.id}" aria-label="${ht('subjects.archiveNamed', { name: x.name })}"`)}</div></div>`,
      )
      .join('') ||
    `<div class="empty"><p>${ht('subjects.empty')}</p><small>${ht('subjects.first')}</small></div>`
  }</section>${
    state.subjects.some((x) => x.archived)
      ? `<section class="panel"><div class="panel-top"><h2>${ht('subjects.archiveHeading')}</h2></div><p class="muted">${ht('subjects.archiveNote')}</p>${state.subjects
          .filter((x) => x.archived)
          .map(
            (x) =>
              `<div class="archive-row"><span>${dot(x)}${esc(x.name)}</span><div class="managed-actions">${button('edit-subject', '', 'edit', 'icon-btn', `data-id="${x.id}" aria-label="${ht('subjects.editArchive', { name: x.name })}"`)}${button('restore-subject', t('subjects.restore'), '', 'quiet', `data-id="${x.id}"`)}</div></div>`,
          )
          .join('')}</section>`
      : ''
  }`;
}
function languageSelect() {
  return `<label class="field">${ht('settings.language')}<select id="language-select">${LANGUAGES.map((l) => `<option value="${l.code}" lang="${l.code}" ${l.code === getLocale() ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>`;
}
function syncLabel() {
  return t('sync.' + syncState.phase);
}
function accountForm() {
  const signup = accountMode === 'signup',
    reset = accountMode === 'reset',
    update = accountMode === 'update',
    busy = authPending || !!cloudPending;
  return `${!reset && !update ? `<div class="mode-options account-tabs" aria-label="${ht('account.heading')}">${button('account-mode', t('cloud.login'), '', signup ? 'quiet' : 'selected', `data-value="login" aria-pressed="${!signup}"`)}${button('account-mode', t('cloud.signup'), '', signup ? 'selected' : 'quiet', `data-value="signup" aria-pressed="${signup}"`)}</div>` : ''}<h2>${ht(reset ? 'account.reset' : update ? 'account.newPassword' : signup ? 'cloud.signup' : 'cloud.login')}</h2><p class="muted">${ht(reset ? 'account.resetHelp' : 'account.intro')}</p><form id="cloud-auth" novalidate aria-busy="${busy}">${signup ? `<label class="field">${ht('a.name')}<input name="fullName" autocomplete="name" minlength="2" maxlength="120" required></label>` : ''}${!update ? `<label class="field">${ht('cloud.email')}<input name="email" type="email" autocomplete="email" required ${busy ? 'disabled' : ''}></label>` : ''}${!reset ? `<label class="field">${ht('cloud.password')}<input name="password" type="password" minlength="${signup || update ? 8 : 1}" autocomplete="${signup || update ? 'new-password' : 'current-password'}" required ${busy ? 'disabled' : ''}></label>` : ''}${signup || update ? `<label class="field">${ht('account.confirmPassword')}<input name="confirmation" type="password" minlength="8" autocomplete="new-password" required ${busy ? 'disabled' : ''}></label>` : ''}${!reset && !update ? `<label class="check-control"><input type="checkbox" name="remember">${ht('a.remember')}</label>` : ''}<p class="form-error" role="alert"></p><button class="btn primary" type="submit" name="mode" value="${accountMode}" ${busy ? 'disabled' : ''}>${ht(busy ? 'cloud.processing' : reset ? 'account.sendReset' : update ? 'account.savePassword' : signup ? 'cloud.signup' : 'cloud.login')}</button></form>${!signup && !reset && !update ? button('account-mode', t('account.forgot'), '', 'text-button', `data-value="reset" ${busy ? 'disabled' : ''}`) : reset ? button('account-mode', t('account.backLogin'), '', 'text-button', 'data-value="login"') : ''}${accountMessage ? `<p class="account-message" role="status">${esc(messageText(accountMessage))}</p>` : ''}`;
}
function accountPanel() {
  return `<section class="panel account-panel"><div class="panel-top"><h2>${ht('account.heading')}</h2>${icon('cloud')}</div><p>${ht('a.accountLinks')}</p>${accountUser ? `<p class="account-email">${esc(accountUser.email || '')}</p><p class="sync-detail" role="status">${esc(syncLabel())}</p><div class="button-row">${button('sync-now', t('account.syncNow'), 'cloud', 'quiet')}${button('cloud-out', t('cloud.out'), '', 'text-button')}</div><h3>${ht('account.guestHeading')}</h3><p>${ht('account.guestHelp')}</p>${button('account-import', t('account.importGuest'), 'upload', 'quiet', syncEngine?.loading ? 'disabled' : '')}${button('account-mode', t('a.changePassword'), '', 'text-button', 'data-value="update"')}${accountMode === 'update' ? accountForm() : ''}` : accountForm()}<p class="small muted"><a href="/migrasi">${ht('nav.migrasi')}</a></p></section>`;
}
function accountView() {
  return `<div class="account-view">${accountPanel()}${!accountUser ? `<p class="account-guest">${ht('account.guestNote')} ${button('nav', t('account.continue'), '', 'text-button', 'data-view="study"')}</p>` : ''}</div>`;
}
function syncBanner() {
  if (!['error', 'conflict', 'offline', 'loading'].includes(syncState.phase))
    return '';
  return `<div class="storage-alert sync-alert" role="${syncState.phase === 'error' || syncState.phase === 'conflict' ? 'alert' : 'status'}"><div><strong>${esc(syncLabel())}</strong><p>${ht(syncState.phase === 'conflict' ? 'account.conflictHelp' : syncState.phase === 'offline' ? 'account.offlineHelp' : syncState.phase === 'loading' ? 'account.loadingHelp' : 'account.errorHelp')}</p>${syncState.error ? `<p class="small">${esc(messageText(syncState.error))}</p>` : ''}</div><div class="button-row">${syncState.phase === 'conflict' ? `${button('sync-export-local', t('account.exportLocal'), 'download', 'quiet')}${button('sync-export-remote', t('account.exportRemote'), 'download', 'quiet')}${button('sync-local', t('account.keepLocal'), '', 'quiet')}${button('sync-remote', t('account.useCloud'), '', 'quiet')}` : syncState.phase === 'error' ? button('sync-now', t('account.retry'), '', 'quiet') : ''}</div></div>`;
}
function settingsView() {
  const themeName = t('theme.' + getThemeByKey(state.settings.themeKey).key);
  return `<div class="settings-grid">${profileSettings.render()}<section class="panel"><div class="panel-top"><h2>${ht('settings.appearance')}</h2></div>${languageSelect()}<p class="small muted">${ht('settings.languageHelp')}</p><div class="field"><span>${ht('settings.mode')}</span><div class="mode-options">${[
    ['light', 'settings.light', 'sun'],
    ['dark', 'settings.dark', 'moon'],
    ['system', 'settings.system', 'monitor'],
  ]
    .map(([value, key, ic]) =>
      button(
        'theme',
        t(key),
        ic,
        state.settings.theme === value ? 'selected' : 'quiet',
        `data-value="${value}" aria-pressed="${state.settings.theme === value}"`,
      ),
    )
    .join(
      '',
    )}</div></div><label class="field">${ht('settings.colourTheme')}<select id="theme-select">${[
    'ruang',
    'classic',
    'light',
    'dark',
  ]
    .map(
      (c) =>
        `<optgroup label="${ht(c === 'ruang' ? 'a.themeRuang' : c === 'classic' ? 'settings.classic' : c === 'light' ? 'settings.lightCollection' : 'settings.darkCollection')}">${THEME_OPTIONS.filter(
          (x) => x.collection === c,
        )
          .map(
            (x) =>
              `<option value="${x.key}" ${x.key === state.settings.themeKey ? 'selected' : ''}>${ht('theme.' + x.key)}</option>`,
          )
          .join('')}</optgroup>`,
    )
    .join('')}</select></label><div class="theme-preview">${getThemeByKey(
    state.settings.themeKey,
  )
    .colors.map((c) => `<span style="background:${c}"></span>`)
    .join(
      '',
    )}<p>${esc(themeName)}</p></div><label class="field">${ht('settings.interface')}<select id="interface-select"><option value="studio" ${state.settings.interfaceStyle === 'studio' ? 'selected' : ''}>${ht('settings.studio')}</option><option value="opaline" ${state.settings.interfaceStyle === 'opaline' ? 'selected' : ''}>${ht('settings.opaline')}</option></select></label><p class="small muted">${ht('settings.themeSource')}</p></section><section class="panel"><div class="panel-top"><h2>${ht('settings.goalHeading')}</h2></div><form id="goal-form" novalidate><label class="field">${ht('settings.goalInput')}<input name="goal" type="number" min="15" max="1440" step="1" value="${state.settings.goal}" required></label><p class="muted">${ht('settings.goalHint')}</p><p class="form-error" role="alert"></p><button class="btn primary" type="submit">${ht('settings.goalSave')}</button></form></section><section class="panel"><div class="panel-top"><h2>${ht('settings.data')}</h2>${icon('download')}</div><p>${ht('settings.dataHelp')}</p><div class="button-row">${button('export', t('data.export'), 'download', 'primary')}${button('import', t('data.import'), 'upload', 'quiet')}</div><input id="import-file" type="file" accept="application/json,.json" hidden><div class="data-status">${icon('check')} ${ht(unreadableRaw ? 'data.recovery' : memoryOnly ? 'data.temporary' : 'data.local')}</div><p class="small muted">${ht('data.noCredentials')}</p></section>${accountPanel()}</div>`;
}

function focusSelectorFor(active) {
  if (!active || !app.contains(active)) return '';
  if (active.id) return '#' + CSS.escape(active.id);
  if (active.dataset.task)
    return '[data-task="' + CSS.escape(active.dataset.task) + '"]';
  if (active.dataset.action) {
    let selector = '[data-action="' + CSS.escape(active.dataset.action) + '"]';
    for (const k of ['id', 'value', 'view'])
      if (active.dataset[k])
        selector += '[data-' + k + '="' + CSS.escape(active.dataset[k]) + '"]';
    return selector;
  }
  const form = active.closest?.('form');
  return form?.id && active.name
    ? '#' + CSS.escape(form.id) + ' [name="' + CSS.escape(active.name) + '"]'
    : '';
}
function captureDrafts(discard = []) {
  if (renderedView !== view) return [];
  return [
    ...app.querySelectorAll(
      '#goal-form input, #cloud-auth input, #task-date, .academic-form input:not([type=hidden])',
    ),
  ]
    .filter(
      (el) =>
        !discard.includes(el.closest('form')?.id) &&
        (el.type === 'checkbox'
          ? el.checked !== el.defaultChecked
          : el.value !== el.defaultValue),
    )
    .map((el) => ({
      selector: el.id
        ? '#' + el.id
        : '#' + el.closest('form').id + ' [name="' + el.name + '"]',
      value: el.value,
      checked: el.checked,
      dateValue: el.dataset.dateValue,
      dateValid: el.dataset.dateValid,
    }));
}
async function withCloudOperation(kind, fn) {
  if (authPending || cloudPending) throw new LocalisedError('error.cloudBusy');
  cloudPending = kind;
  render();
  try {
    return await fn();
  } finally {
    cloudPending = '';
    if (view === 'settings' || view === 'account') render();
  }
}
function updateTitle() {
  const label =
    view === 'account'
      ? t('account.heading')
      : view === 'calendar'
        ? t('page.calendar')
        : t('nav.' + view);
  document.title =
    state.timer.startedAt !== null
      ? `${formatClock(elapsed(state))} · ${subject(state.timer.subjectId)?.name || t('subjects.generic')} — Ruang Belajar`
      : `${label} — Ruang Belajar`;
}
const formErrors = new Map();
let modalContext = null,
  toastMessage = null;
const profileSettings = createProfileSettings({
  validateForm,
  state: () => state,
  mutate,
  render,
  toast,
});
const academic = createAcademicUI({
  validateForm,
  state: () => state,
  scope: () => KEY,
  mutate,
  render,
  navigate,
  toast,
  icon,
  confirm: confirmAction,
  openModal,
  closeModal: () => {
    if (modal.open) modal.close();
  },
  backup: (source) =>
    download(
      serializeBackup(source),
      'ruang-belajar-sebelum-impor-' + dayKey() + '.json',
      'application/json',
    ),
  exportButton: () => button('export', t('data.export'), 'download', 'quiet'),
  cancelButton: () => button('close-modal', t('common.cancel'), '', 'quiet'),
});
const learning = createLearningUI({
  validateForm,
  state: () => state,
  scope: () => KEY,
  mutate,
  render,
  navigate,
  openModal,
  closeModal: () => modal.close(),
  toast,
  confirm: confirmAction,
  download,
  academic,
  snapshots: () => snapshots(KEY),
  restore: async (raw) => {
    const next = validateState(JSON.parse(raw));
    await replaceData(next);
  },
  storageEstimate,
  canForget: () => !!accountUser,
  forget: async () => {
    if (syncState.phase !== 'synced')
      throw new LocalisedError('learn.pendingForget');
    const key = KEY;
    const expectedRaw = await withStudyLock(() => {
      if (KEY !== key) throw new LocalisedError('error.accountChanged');
      const raw = workspaceStorage.getItem(key),
        record = parseWorkspace(raw);
      if (!record || !sameDocument(record.doc, record.base))
        throw new LocalisedError('learn.pendingForget');
      return raw;
    }, [key]);
    const result = await cloud.signOut();
    await forgetWorkspace(key, { expectedRaw });
    if (result?.warning) toast(message('learn.revocationWarning'));
  },
});
function render({ discardDrafts = [] } = {}) {
  if (renderedView !== view) profileSettings.reset();
  const active = document.activeElement,
    focusSelector = focusSelectorFor(active),
    drafts = captureDrafts(discardDrafts),
    picker = renderedView === view ? captureDatePicker() : null;
  let selection;
  try {
    if (active?.selectionStart !== null)
      selection = [active.selectionStart, active.selectionEnd];
  } catch {}
  closeDatePicker();
  applyTheme();
  applyDocumentLocale();
  updateTitle();
  const pageKey =
    view === 'calendar'
      ? 'page.calendar'
      : view === 'account'
        ? 'account.heading'
        : 'nav.' + view;
  const academicPages = [
    'agenda',
    'dasbor',
    'materi',
    'tracker',
    'tryout',
    'panduan',
    'migrasi',
  ];
  const body = ['today', 'planner', 'notes', 'records'].includes(view)
    ? learning.render(view)
    : academicPages.includes(view)
      ? (view === 'agenda' ? learning.summary() : '') + academic.render(view)
      : view === 'study'
        ? studyView()
        : view === 'stats'
          ? statsView()
          : view === 'calendar'
            ? heatmapCard(true) + academic.calendar()
            : view === 'subjects'
              ? subjectsView() + academic.mapping()
              : view === 'account'
                ? accountView()
                : settingsView() +
                  `<section class="academic-section"><button class="btn quiet" data-action="learn-storage">${ht('learn.storage')}</button><button class="btn quiet" data-action="learn-recovery">${ht('learn.recovery')}</button><button class="btn quiet" data-action="learn-reminders">${ht('learn.reminders')}</button></section>`;
  const nav = [
    ['today', 'calendar-days'],
    ['dasbor', 'panel-left'],
    ['planner', 'calendar'],
    ['notes', 'book-open'],
    ['records', 'timer'],
    ['agenda', 'calendar-days'],
    ['study', 'timer'],
    ['materi', 'library-big'],
    ['tracker', 'tracker'],
    ['tryout', 'flag'],
    ['calendar', 'calendar'],
    ['stats', 'chart'],
    ['subjects', 'book'],
    ['panduan', 'guide'],
  ];
  const stats = materialStats(state.academic);
  app.innerHTML = `<div class="app-shell" data-interface-style="${state.settings.interfaceStyle}" data-resolved-mode="${document.body.dataset.resolvedMode}"><a class="skip-link" href="#main-content">${ht('nav.skip')}</a><aside class="sidebar"><a class="wordmark" href="/">ruang<span>belajar</span></a><nav aria-label="${ht('nav.label')}">${nav.map(([value, ic]) => `<a href="${routes[value]}" class="nav-item ${value === view ? 'active' : ''}" ${value === view ? 'aria-current="page"' : ''}>${icon(ic)}<span>${ht('nav.' + value)}</span></a>`).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-goal"><span>${ht('a.progress')}</span><progress value="${stats.stages}" max="${stats.topics * 3}" aria-label="${ht('a.progress')}"></progress><small>${ht('a.topicCount', { count: stats.done, total: stats.topics })}</small></div><a class="nav-item ${view === 'migrasi' ? 'active' : ''}" href="/migrasi">${icon('upload')}<span>${ht('nav.migrasi')}</span></a><a class="nav-item ${view === 'settings' ? 'active' : ''}" href="/pengaturan">${icon('settings')}<span>${ht('nav.settings')}</span></a><a class="nav-item" href="/akun">${icon('cloud')}<span>${esc(syncLabel())}</span></a></div></aside><main id="main-content" tabindex="-1" class="main ${focused ? 'focused' : ''}"><header class="main-header"><div><h1 tabindex="-1">${ht(pageKey)}</h1><p data-live="current-date">${fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div><div class="header-actions"><a class="btn quiet account-entry" href="/akun">${ht(accountUser ? 'account.heading' : 'cloud.login')}</a><select id="header-language-select" class="header-language" aria-label="${ht('settings.language')}">${LANGUAGES.map((l) => `<option value="${l.code}" lang="${l.code}" ${l.code === getLocale() ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>${button('quick-theme', '', document.body.dataset.resolvedMode === 'dark' ? 'sun' : 'moon', 'icon-btn', `aria-label="${ht(document.body.dataset.resolvedMode === 'dark' ? 'mode.enableLight' : 'mode.enableDark')}"`)}</div></header>${storageIssue ? `<div class="storage-alert" role="alert">${esc(messageText(storageIssue))} ${button('export', t(unreadableRaw ? 'data.downloadOriginal' : 'data.export'), '', 'quiet')}${recoverableCache ? button('repair-account-cache', t('data.repairCache'), '', 'quiet') : ''}${unreadableRaw ? button('recover-local', t('data.startFresh'), '', 'quiet') : ''}</div>` : ''}${syncBanner()}${hasActiveSession(state) && view !== 'study' ? `<div class="persistent-timer"><a href="/belajar">${esc(subject(state.timer.subjectId)?.name || '')} <strong class="mono" data-live="timer">${formatClock(elapsed(state))}</strong></a>${button('toggle-timer', t(state.timer.startedAt !== null ? 'timer.pause' : 'timer.resume'), state.timer.startedAt !== null ? 'pause' : 'play', 'quiet', `data-run-id="${state.timer.runId}" data-running="${state.timer.startedAt !== null}"`)}${button('finish', t('timer.finish'), 'stop', 'quiet', `data-run-id="${state.timer.runId}"`)}</div>` : ''}<div class="view-content">${body}</div></main></div>`;
  renderedView = view;
  for (const draft of drafts) {
    const field = app.querySelector(draft.selector);
    if (field) {
      if (field.type === 'checkbox') field.checked = draft.checked;
      field.value =
        draft.dateValue && draft.dateValid === 'true'
          ? formatDateInput(draft.dateValue)
          : draft.value;
      if (draft.dateValue !== undefined) {
        field.dataset.dateValue = draft.dateValue;
        field.dataset.dateValid = draft.dateValid;
      }
    }
  }
  for (const [id, error] of formErrors) {
    const field = app.querySelector('#' + id + ' .form-error');
    if (field) field.textContent = messageText(error);
  }
  if (focusSelector) {
    const field = app.querySelector(focusSelector);
    field?.focus({ preventScroll: true });
    if (selection && field?.setSelectionRange)
      try {
        field.setSelectionRange(...selection);
      } catch {}
  }
  restoreDatePicker(picker);
}
modal.addEventListener('close', () => {
  uiEpoch++;
  closeDatePicker();
  modalContext = null;
  modal.innerHTML = '';
  const target = modalOpener ? app.querySelector(modalOpener) : null;
  (target || app.querySelector('h1'))?.focus({ preventScroll: true });
  modalOpener = '';
});
modal.addEventListener('cancel', (e) => {
  if (modal.querySelector('.date-picker')) {
    e.preventDefault();
    closeDatePicker({ restoreFocus: true });
  }
});
function drawModal(preserve = false) {
  const context = modalContext;
  if (!context) return;
  const picker = preserve ? captureDatePicker() : null;
  const active = document.activeElement,
    fields = preserve
      ? Array.from(modal.querySelectorAll('input,select,textarea')).map(
          (field) => ({
            name: field.name,
            value: field.value,
            checked: field.checked,
            dateValue: field.dataset.dateValue,
            dateValid: field.dataset.dateValid,
          }),
        )
      : [];
  const focusName = modal.contains(active) ? active.name : '',
    action = modal.contains(active) ? active.dataset.action : '';
  let selection;
  try {
    if (active?.selectionStart !== null)
      selection = [active.selectionStart, active.selectionEnd];
  } catch {}
  closeDatePicker();
  modal.innerHTML = `<div class="modal-top"><h2 id="modal-title">${esc(typeof context.title === 'function' ? context.title() : messageText(context.title))}</h2>${button('close-modal', '', 'close', 'icon-btn', `aria-label="${ht('common.close')}"`)}</div>${context.body()}`;
  for (const saved of fields) {
    const field = modal.querySelector(`[name="${saved.name}"]`);
    if (!field) continue;
    field.value =
      saved.dateValue && saved.dateValid === 'true'
        ? formatDateInput(saved.dateValue)
        : saved.value;
    field.checked = saved.checked;
    if (saved.dateValue) {
      field.dataset.dateValue = saved.dateValue;
      field.dataset.dateValid = saved.dateValid;
    }
  }
  const form = modal.querySelector('form');
  if (form) {
    form.noValidate = true;
    form
      .querySelectorAll('button[type="submit"]')
      .forEach((b) => (b.disabled = context.pending));
    form.setAttribute?.('aria-busy', String(context.pending));
    const error = modal.querySelector('.form-error');
    if (error)
      error.textContent = context.error ? messageText(context.error) : '';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (context.pending) return;
      try {
        validateForm(form);
        context.error = null;
        context.pending = true;
        form
          .querySelectorAll('button[type="submit"]')
          .forEach((b) => (b.disabled = true));
        form.setAttribute?.('aria-busy', 'true');
        await context.onSubmit(new FormData(form));
        if (modalContext === context) modal.close();
      } catch (err) {
        context.error = err;
        if (modalContext === context) {
          const error = modal.querySelector('.form-error');
          if (error) error.textContent = messageText(err);
        } else toast(err);
      } finally {
        context.pending = false;
        if (modalContext === context) {
          const current = modal.querySelector('form');
          current
            ?.querySelectorAll('button[type="submit"]')
            .forEach((b) => (b.disabled = false));
          current?.setAttribute?.('aria-busy', 'false');
        }
      }
    });
  }
  if (preserve) {
    const target = focusName
      ? modal.querySelector(`[name="${focusName}"]`)
      : action
        ? modal.querySelector(`[data-action="${action}"]`)
        : null;
    target?.focus({ preventScroll: true });
    if (selection && target?.setSelectionRange)
      try {
        target.setSelectionRange(...selection);
      } catch {}
  }
  restoreDatePicker(picker);
}
function openModal(title, body, onSubmit) {
  uiEpoch++;
  if (!modal.open) modalOpener = focusSelectorFor(document.activeElement);
  modalContext = { title, body, onSubmit, pending: false, error: null };
  drawModal();
  if (!modal.open) modal.showModal();
}
function confirmAction(title, text, label, fn) {
  openModal(
    title,
    () =>
      `<p>${esc(typeof text === 'function' ? text() : messageText(text))}</p><form novalidate><p class="form-error" role="alert"></p><div class="modal-actions">${button('close-modal', t('common.cancel'), '', 'quiet')}<button class="btn primary" type="submit">${esc(messageText(label))}</button></div></form>`,
    fn,
  );
}
function applyRecordDraft(current, original, values) {
  if (!current || !original) throw new LocalisedError('error.tabConflict');
  const normal = (key, value) =>
      key === 'color' ? value.toLowerCase() : value,
    changes = {};
  for (const [key, value] of Object.entries(values)) {
    if (normal(key, value) === normal(key, original[key])) continue;
    if (
      normal(key, current[key]) !== normal(key, original[key]) &&
      normal(key, current[key]) !== normal(key, value)
    )
      throw new LocalisedError('error.tabConflict');
    changes[key] = value;
  }
  Object.assign(current, changes);
}
function editSubject(id) {
  const s = subject(id);
  openModal(
    message(s ? 'form.subjectEdit' : 'form.subjectNew'),
    () =>
      `<form novalidate><label class="field">${ht('form.subjectName')}<input name="name" maxlength="80" value="${esc(s?.name || '')}" placeholder="${ht('form.subjectExample')}" required autofocus></label><label class="field">${ht('form.colour')}<input name="color" type="color" value="${s?.color || COLORS[state.subjects.length % COLORS.length]}"></label><p class="form-error" role="alert"></p><div class="modal-actions">${button('close-modal', t('common.cancel'), '', 'quiet')}<button class="btn primary" type="submit">${ht('form.subjectSave')}</button></div></form>`,
    async (fd) => {
      const name = fd.get('name').trim();
      if (!name) throw new LocalisedError('error.subjectName');
      await mutate((next) => {
        const item = id
          ? next.subjects.find((x) => x.id === id)
          : { id: uid(), name, color: fd.get('color') };
        if (id) applyRecordDraft(item, s, { name, color: fd.get('color') });
        if (
          next.subjects.some(
            (x) =>
              x.id !== id &&
              !x.archived &&
              x.name.toLowerCase() === item.name.toLowerCase(),
          )
        )
          throw new LocalisedError('error.nameUsed');
        if (!id) {
          if (next.subjects.length >= LIMITS.subjects)
            throw new LocalisedError('error.subjectLimit');
          next.subjects.push(item);
          if (!next.timer.subjectId) next.timer.subjectId = item.id;
        }
      });
      toast(message('toast.subjectSaved'));
    },
  );
}
function editTask(id) {
  const task = state.tasks.find((x) => x.id === id);
  openModal(
    message(task ? 'form.taskEdit' : 'form.taskNew'),
    () =>
      `<form novalidate><label class="field">${ht('form.taskTitle')}<input name="title" maxlength="300" value="${esc(task?.title || '')}" placeholder="${ht('form.taskExample')}" required autofocus></label><label class="field">${ht('table.subject')}<select name="subjectId">${subjectOptions(task ? task.subjectId : state.timer.subjectId, true)}</select></label><div class="field"><label for="task-edit-date">${ht('common.date')}</label>${dateField('task-edit-date', 'date', task?.date || taskDate, t('common.date'))}</div><p class="form-error" role="alert"></p><div class="modal-actions">${button('close-modal', t('common.cancel'), '', 'quiet')}<button class="btn primary" type="submit">${ht('form.taskSave')}</button></div></form>`,
    async (fd) => {
      if (!fd.get('title').trim()) throw new LocalisedError('error.taskTitle');
      const date = parseDateInput(fd.get('date'));
      await mutate((next) => {
        const item = {
          title: fd.get('title').trim(),
          subjectId: fd.get('subjectId'),
          date,
        };
        if (id)
          applyRecordDraft(
            next.tasks.find((x) => x.id === id),
            task,
            item,
          );
        else {
          if (next.tasks.length >= LIMITS.tasks)
            throw new LocalisedError('error.taskLimit');
          next.tasks.push({ ...item, id: uid(), done: false });
        }
      });
      toast(message('toast.taskSaved'));
    },
  );
}
function showDay(date) {
  const a = aggregate(state, date, date);
  openModal(
    () => fmtDate(parseDay(date)),
    () =>
      `<div class="day-total"><strong>${formatClock(a.total)}</strong><span>${ht('count.sessions', { count: a.count })} · ${ht('stats.longest')} ${formatDuration(a.max)}</span></div>${subjectRows(a)}<div class="day-sessions">${timeline(a)}</div>${academic.plansForDate(date)}${button('close-modal', t('common.close'), '', 'quiet')}`,
  );
}
function exportData(source = state) {
  if (unreadableRaw) {
    download(
      unreadableRaw,
      'ruang-belajar-' + t('data.recoveryFilename') + '-' + dayKey() + '.json',
      'application/json',
    );
    toast(message('toast.originalExported'));
    return;
  }
  download(
    serializeBackup(source),
    `ruang-belajar-${dayKey()}.json`,
    'application/json',
  );
  toast(message('toast.exported'));
}
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function shiftCursor(n, unit) {
  if (unit === 'month') cursor = monthDate(cursor, n);
  else cursor = addDays(cursor, n * (unit === 'week' ? 7 : 1));
}

async function handleAction(el) {
  const action = el.dataset.action,
    id = el.dataset.id,
    v = el.dataset.value;
  if (action.startsWith('learn-')) {
    await learning.action(el);
    return;
  }
  if (action.startsWith('academic-')) {
    await academic.action(el);
    return;
  }
  if (action === 'nav') {
    uiEpoch++;
    formErrors.clear();
    navigate(el.dataset.view);
  } else if (action === 'account-mode') {
    if (authPending || cloudPending) return;
    accountMode = v;
    accountMessage = null;
    formErrors.delete('cloud-auth');
    render({ discardDrafts: ['cloud-auth'] });
  } else if (action === 'sync-now') {
    await syncEngine?.flush({ force: true });
  } else if (action === 'sync-export-local') exportData(state);
  else if (action === 'sync-export-remote') {
    if (syncEngine?.conflict)
      download(
        serializeBackup(syncEngine.conflict.remote),
        'ruang-belajar-cloud-' + dayKey() + '.json',
        'application/json',
      );
  } else if (action === 'sync-local' || action === 'sync-remote') {
    const scope = KEY;
    confirmAction(
      message('account.resolveTitle'),
      message(
        action === 'sync-local'
          ? 'account.resolveLocal'
          : 'account.resolveRemote',
      ),
      message(
        action === 'sync-local' ? 'account.keepLocal' : 'account.useCloud',
      ),
      async () => {
        if (scope !== KEY) throw new LocalisedError('error.accountChanged');
        exportData(state);
        if (syncEngine?.conflict)
          download(
            serializeBackup(syncEngine.conflict.remote),
            'ruang-belajar-cloud-' + dayKey() + '.json',
            'application/json',
          );
        await syncEngine?.resolve(action === 'sync-local' ? 'local' : 'remote');
      },
    );
  } else if (action === 'account-import') {
    const scope = KEY;
    confirmAction(
      message('account.importGuest'),
      message('account.guestHelp'),
      message('account.importGuest'),
      async () => {
        if (scope !== KEY) throw new LocalisedError('error.accountChanged');
        const guest = await withStudyLock(
          () => restoreLocalState(workspaceStorage.getItem(GUEST_KEY)).state,
          [GUEST_KEY, KEY],
        );
        if (hasActiveSession(guest))
          throw new LocalisedError('error.finishImport');
        await syncEngine?.importGuest(guest, getLocale());
        toast(message('account.guestImported'));
      },
    );
  } else if (action === 'toggle-timer') {
    await mutate((s) => {
      if (el.dataset.runId && s.timer.runId !== el.dataset.runId)
        throw new LocalisedError('error.sessionChanged');
      return el.dataset.running === 'true' ? pauseTimer(s) : startTimer(s);
    });
  } else if (action === 'finish') {
    let ms;
    await mutate((s) => {
      if (el.dataset.runId && s.timer.runId !== el.dataset.runId)
        throw new LocalisedError('error.sessionChanged');
      ms = finishTimer(s);
    });
    toast(message('toast.sessionFinished', { time: formatClock(ms) }));
  } else if (action === 'focus') {
    const next = !focused;
    if (view !== 'study') navigate('study');
    focused = next;
    render();
  } else if (action === 'quick-theme') {
    await mutate(
      (s) =>
        (s.settings.theme =
          document.body.dataset.resolvedMode === 'dark' ? 'light' : 'dark'),
    );
  } else if (action === 'theme') {
    await mutate((s) => (s.settings.theme = v));
  } else if (action === 'task-filter') {
    taskFilter = v;
    render();
  } else if (action === 'add-task' || action === 'edit-task') {
    if (id && state.tasks.find((x) => x.id === id)?.recurrence)
      await learning.action({ dataset: { action: 'learn-task', id } });
    else editTask(id);
  } else if (action === 'delete-task')
    confirmAction(
      message('form.deleteTaskTitle'),
      message('form.deleteTaskText'),
      message('form.deleteTaskButton'),
      async () => {
        await mutate((s) => (s.tasks = s.tasks.filter((x) => x.id !== id)));
        toast(message('toast.taskDeleted'));
      },
    );
  else if (action === 'add-subject' || action === 'edit-subject')
    editSubject(id);
  else if (action === 'choose-subject') {
    if (hasActiveSession(state)) {
      toast(message('error.finishChoose'));
      return;
    }
    await mutate((s) => {
      if (hasActiveSession(s)) throw new LocalisedError('error.finishChoose');
      if (!s.subjects.some((x) => x.id === id && !x.archived))
        throw new LocalisedError('error.subjectUnavailable');
      s.timer.subjectId = id;
      delete s.timer.context;
    });
    navigate('study');
    document
      .querySelector('#timer-heading')
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } else if (action === 'delete-subject') {
    if (state.timer.subjectId === id && hasActiveSession(state)) {
      toast(message('error.finishArchive'));
      return;
    }
    confirmAction(
      message('form.archiveTitle'),
      message('form.archiveText'),
      message('form.archiveButton'),
      async () => {
        await mutate((s) => {
          if (s.timer.subjectId === id && hasActiveSession(s))
            throw new LocalisedError('error.finishArchive');
          s.subjects.find((x) => x.id === id).archived = true;
          if (s.timer.subjectId === id)
            s.timer.subjectId = s.subjects.find((x) => !x.archived)?.id || '';
        });
        toast(message('toast.subjectArchived'));
      },
    );
  } else if (action === 'restore-subject')
    await mutate((s) => {
      const restored = s.subjects.find((x) => x.id === id);
      if (
        s.subjects.some(
          (x) =>
            !x.archived &&
            x.id !== id &&
            x.name.toLowerCase() === restored.name.toLowerCase(),
        )
      )
        throw new LocalisedError('error.restoreName');
      restored.archived = false;
      if (!s.timer.subjectId) s.timer.subjectId = restored.id;
    });
  else if (action === 'heat-mode') {
    heatMode = v;
    render();
  } else if (action === 'heat-prev' || action === 'heat-next') {
    shiftCursor(action === 'heat-prev' ? -1 : 1, heatMode);
    render();
  } else if (action === 'day-detail') {
    academic.setPlanDate(el.dataset.date);
    showDay(el.dataset.date);
  } else if (action === 'period') {
    period = v;
    render();
  } else if (action === 'period-prev' || action === 'period-next') {
    shiftCursor(action === 'period-prev' ? -1 : 1, period);
    render();
  } else if (action === 'period-today') {
    cursor = new Date();
    render();
  } else if (action === 'close-modal') modal.close();
  else if (action === 'export')
    await withStudyLock(() =>
      exportData(unreadableRaw || memoryOnly ? state : latestState()),
    );
  else if (action === 'recover-local') {
    const expectedRaw = storedRaw;
    confirmAction(
      message('form.resetTitle'),
      message('form.resetText'),
      message('form.resetButton'),
      async () => {
        await replaceData(newState(), { recover: true, expectedRaw });
        toast(message('toast.reset'));
      },
    );
  } else if (action === 'repair-account-cache') {
    const scope = KEY,
      expectedRaw = storedRaw,
      doc = recoverableCache;
    if (!doc || !syncEngine?.account) return;
    await withStudyLock(() => {
      if (scope !== KEY) throw new LocalisedError('error.accountChanged');
      if (workspaceStorage.getItem(KEY) !== expectedRaw)
        throw new LocalisedError('error.tabConflict');
      exportData();
      syncEngine.resetCache(doc, doc.locale, expectedRaw, {
        preserveLocal: true,
      });
      state = validateState(doc);
      storedRaw = workspaceStorage.getItem(KEY);
      unreadableRaw = '';
      storageIssue = '';
      memoryOnly = false;
      recoverableCache = null;
      applyingAccount = true;
      try {
        setLocale(doc.locale);
      } finally {
        applyingAccount = false;
      }
      render();
    });
    toast(message('toast.cacheRepaired'));
    await syncEngine.flush({ force: true });
  } else if (action === 'import')
    document.querySelector('#import-file').click();
  else if (action === 'cloud-save' || action === 'cloud-load') {
    if (action === 'cloud-load' && hasActiveSession(state)) {
      toast(message('error.finishCloud'));
      return;
    }
    const epoch = uiEpoch;
    await withCloudOperation(
      action === 'cloud-save' ? 'save' : 'load',
      async () => {
        const remote = await cloud.load();
        if (uiEpoch !== epoch || view !== 'settings' || modal.open) {
          toast(message('toast.cloudCancelled'));
          return;
        }
        if (action === 'cloud-save')
          confirmAction(
            message('form.cloudSaveTitle'),
            message(
              remote.data ? 'form.cloudSaveExisting' : 'form.cloudSaveNew',
            ),
            message('form.cloudSaveButton'),
            async () => {
              await withCloudOperation('save', async () => {
                const copy = await withStudyLock(() =>
                  backupState(latestState()),
                );
                await cloud.save(copy, remote.revision, remote.context);
                toast(message('toast.cloudSaved'));
              });
            },
          );
        else {
          if (!remote.data) {
            toast(message('toast.cloudEmpty'));
            return;
          }
          const next = validateState(remote.data);
          next.timer.startedAt = null;
          next.timer.elapsedMs = 0;
          next.timer.runId = uid();
          confirmAction(
            message('form.cloudLoadTitle'),
            message('form.cloudLoadText'),
            message('form.cloudLoadButton'),
            async () => {
              await withCloudOperation('load', async () => {
                await cloud.checkContext(remote.context);
                await replaceData(next, {
                  beforeReplace: () =>
                    cloud.assertCurrentContext(remote.context),
                });
                toast(message('toast.cloudLoaded'));
              });
            },
          );
        }
      },
    );
  } else if (action === 'cloud-out')
    await withCloudOperation('out', async () => {
      const result = await cloud.signOut();
      recoveryMode = false;
      accountMode = 'login';
      cloudStatus = message(
        result?.warning ? 'learn.revocationWarning' : 'cloud.signedOut',
      );
      toast(cloudStatus);
    });
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  e.preventDefault();
  if (el.disabled) return;
  Promise.resolve(handleAction(el)).catch((err) => toast(err));
});
document.addEventListener('change', async (e) => {
  const el = e.target;
  try {
    if (el.id === 'language-select' || el.id === 'header-language-select') {
      setLocale(el.value);
      return;
    }
    if (el.dataset.task)
      await mutate((s) =>
        setOccurrence(
          s,
          el.dataset.task,
          el.dataset.occurrenceDate ||
            s.tasks.find((x) => x.id === el.dataset.task)?.date,
          el.checked,
        ),
      );
    else if (el.id === 'timer-subject')
      await mutate((s) => {
        if (hasActiveSession(s)) throw new LocalisedError('error.finishChange');
        s.timer.subjectId = el.value;
        delete s.timer.context;
      });
    else if (el.id === 'task-date') {
      taskDate = el.value ? parseDateInput(el.value) : dayKey();
      render();
    } else if (el.id === 'theme-select')
      await mutate((s) => (s.settings.themeKey = el.value));
    else if (el.id === 'interface-select')
      await mutate((s) => (s.settings.interfaceStyle = el.value));
    else if (el.id === 'import-file') {
      try {
        const file = el.files[0];
        if (!file) return;
        if (hasActiveSession(state))
          throw new LocalisedError('error.finishImport');
        if (file.size > MAX_BACKUP_BYTES)
          throw new LocalisedError('error.importTooLarge');
        const request = ++importEpoch,
          epoch = uiEpoch,
          text = await file.text();
        if (request !== importEpoch || uiEpoch !== epoch || modal.open) return;
        const next = parseBackup(text);
        next.timer.startedAt = null;
        next.timer.elapsedMs = 0;
        next.timer.runId = uid();
        confirmAction(
          message('form.importTitle'),
          () =>
            t('form.importText', {
              subjects: t('count.subjects', { count: next.subjects.length }),
              records: t('count.records', { count: next.sessions.length }),
            }),
          message('form.importButton'),
          async () => {
            await replaceData(next);
            toast(message('toast.imported'));
          },
        );
      } catch (err) {
        toast(err);
      } finally {
        el.value = '';
      }
    }
  } catch (err) {
    if (el.matches?.('[data-local-date]'))
      el.setAttribute('aria-invalid', 'true');
    toast(err);
  }
});
document.addEventListener('submit', async (e) => {
  if (!['goal-form', 'cloud-config', 'cloud-auth'].includes(e.target.id))
    return;
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    validateForm(e.target);
    formErrors.delete(e.target.id);
    const error = e.target.querySelector?.('.form-error');
    if (error) error.textContent = '';
    if (e.target.id === 'goal-form') {
      const goal = Number(fd.get('goal'));
      if (!Number.isInteger(goal) || goal < 15 || goal > 1440)
        throw new LocalisedError('error.goalRange');
      await mutate((s) => (s.settings.goal = goal));
      toast(message('toast.goalSaved'));
    } else if (e.target.id === 'cloud-config') {
      if (authPending || cloudPending)
        throw new LocalisedError('error.cloudBusy');
      cloud.configure(fd.get('url'), fd.get('key'));
      cloudStatus = '';
      render({ discardDrafts: ['cloud-config'] });
      toast(message('toast.configSaved'));
    } else {
      if (authPending) return;
      if (cloudPending) throw new LocalisedError('error.cloudBusy');
      const form = e.target,
        submit = e.submitter;
      authPending = true;
      const toggleButtons = (disabled) => {
        form
          .querySelectorAll('button[type="submit"]')
          .forEach((x) => (x.disabled = disabled));
        document
          .querySelectorAll('#cloud-auth button[type="submit"]')
          .forEach((x) => (x.disabled = disabled));
      };
      toggleButtons(true);
      render();
      try {
        const mode = submit?.value || accountMode;
        if (
          (mode === 'signup' || mode === 'update') &&
          fd.get('password') !== fd.get('confirmation')
        )
          throw new LocalisedError('account.passwordMismatch');
        cloudStatus =
          mode === 'reset'
            ? await cloud.requestReset(fd.get('email'))
            : mode === 'update'
              ? await cloud.updatePassword(fd.get('password'))
              : await cloud.authenticate(
                  fd.get('email'),
                  fd.get('password'),
                  mode,
                  {
                    fullName: fd.get('fullName'),
                    remember: fd.has('remember'),
                  },
                );
        accountMessage = cloudStatus;
        if (mode === 'update') {
          recoveryMode = false;
          accountMode = 'login';
        }
        const status = document.querySelector('#cloud-status');
        if (status) status.textContent = messageText(cloudStatus);
        toast(cloudStatus);
      } catch (err) {
        cloudStatus = err;
        accountMessage = err;
        const status = document.querySelector('#cloud-status');
        if (status) status.textContent = messageText(cloudStatus);
        throw err;
      } finally {
        authPending = false;
        toggleButtons(false);
        const password = form.querySelector('input[name="password"]');
        if (password) password.value = '';
        const current = document.querySelector(
          '#cloud-auth input[name="password"]',
        );
        if (current) current.value = '';
        const confirmation = document.querySelector(
          '#cloud-auth input[name="confirmation"]',
        );
        if (confirmation) confirmation.value = '';
        render({ discardDrafts: ['cloud-auth'] });
      }
    }
  } catch (err) {
    formErrors.set(e.target.id, err);
    const error = e.target.querySelector?.('.form-error');
    if (error) error.textContent = messageText(err);
    toast(err);
  }
});
window.addEventListener('storage', (e) => {
  if (e.key === 'sela.supabase.config.v1') {
    cloudStatus = '';
    if (view === 'settings' || view === 'account') render();
    return;
  }
  if (e.key !== KEY && e.key !== null) return;
  if (memoryOnly) {
    toast(message('error.tabChanged'));
    return;
  }
  let raw;
  try {
    raw = workspaceStorage.getItem(KEY);
    const restored = accountUser
      ? {
          state: validateState(parseWorkspace(raw)?.doc || newState()),
          reset: false,
        }
      : restoreLocalState(raw);
    state = restored.state;
    storedRaw = raw;
    storageIssue = '';
    unreadableRaw = '';
    recoverableCache = null;
    if (accountUser && raw) {
      const locale = JSON.parse(raw).locale;
      if (LANGUAGES.some((x) => x.code === locale)) {
        applyingAccount = true;
        try {
          setLocale(locale);
        } finally {
          applyingAccount = false;
        }
      }
    }
    render();
    if (accountUser) syncEngine?.flush().catch(() => {});
    if (restored.reset) mutate(() => {}).catch((err) => toast(err));
  } catch {
    showUnreadableWorkspace(raw);
    render();
    toast(message('error.tabUnreadable'));
  }
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.settings.theme === 'system') render();
});
function tick() {
  learning.checkReminders();
  const now = Date.now(),
    todayKey = dayKey(now),
    rolledOver = todayKey !== calendarToday;
  if (rolledOver) {
    if (taskDate === calendarToday) taskDate = todayKey;
    if (dayKey(cursor) === calendarToday) cursor = parseDay(todayKey);
    calendarToday = todayKey;
    if (view !== 'settings') render();
  }
  const a = aggregate(state, todayKey, todayKey, now);
  const set = (key, text) => {
    const node = app.querySelector('[data-live="' + key + '"]');
    if (node) node.textContent = text;
  };
  set(
    'current-date',
    fmtDate(now, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  );
  set('session-count', t('count.sessions', { count: a.count }));
  set('max-focus', formatDuration(a.max));
  set('timer', formatClock(elapsed(state, now)));
  set('today', formatClock(a.total));
  set('today-minutes', formatNumber(Math.floor(a.total / 60000)));
  set(
    'goal-percent',
    formatPercent(Math.min(1, a.total / (state.settings.goal * 60000))),
  );
  const bar = app.querySelector('[data-live="goal-bar"]');
  if (bar)
    bar.style.width =
      Math.min(100, (a.total / (state.settings.goal * 60000)) * 100) + '%';
  app
    .querySelectorAll('[data-today-subjects] [data-subject-time]')
    .forEach(
      (el) =>
        (el.textContent = formatDuration(
          a.subjects[el.dataset.subjectTime] || 0,
        )),
    );
  app
    .querySelectorAll('[data-today-subjects] [data-subject-progress]')
    .forEach(
      (el) =>
        (el.style.width =
          (a.total
            ? ((a.subjects[el.dataset.subjectProgress] || 0) / a.total) * 100
            : 0) + '%'),
    );
  app.querySelectorAll('.heat-cell.today').forEach((el) => {
    if (el.dataset.date !== todayKey) return;
    for (let i = 0; i < 5; i++)
      el.classList.toggle('l' + i, level(a.total) === i);
    el.title = fmtDate(now) + ' · ' + formatDuration(a.total);
    el.setAttribute(
      'aria-label',
      t('calendar.dayLabel', {
        date: fmtDate(now),
        time: formatClock(a.total),
      }),
    );
  });
  if (heatMode === 'week' || heatMode === 'month') {
    const from =
        heatMode === 'week' ? localeWeekStart(cursor) : monthDate(cursor),
      to = heatMode === 'week' ? addDays(from, 6) : monthDate(cursor, 1, 0);
    const heat = aggregate(state, dayKey(from), dayKey(to), now);
    app
      .querySelectorAll('[data-heat-day]')
      .forEach(
        (el) =>
          (el.textContent = formatDuration(heat.days[el.dataset.heatDay] || 0)),
      );
    set(
      'heat-total',
      t(heatMode === 'week' ? 'calendar.weekTotal' : 'calendar.monthTotal', {
        duration: formatDuration(heat.total),
      }),
    );
  }
  const running = state.timer.startedAt !== null;
  updateTitle();
  if (running && view === 'subjects') {
    const id = state.timer.subjectId,
      total =
        state.sessions.reduce(
          (sum, x) => sum + (x.subjectId === id ? x.durationMs : 0),
          0,
        ) + Math.max(0, now - state.timer.startedAt);
    const node = app.querySelector('[data-subject-lifetime="' + id + '"]');
    if (node)
      node.textContent = t('subjects.total', {
        duration: formatDuration(total),
      });
  }
  if (running) {
    const finish = app.querySelector('[data-action="finish"]');
    if (finish) finish.disabled = false;
  }
  if (rolledOver || (running && Math.floor(now / 1000) % 30 === 0))
    set('streak', t('summary.streak', { count: streak(state, now) }));
  if (
    running &&
    view === 'stats' &&
    !modal.open &&
    Math.floor(now / 1000) % 30 === 0
  )
    render();
}
onLocaleChange(() => {
  render();
  if (modal.open) drawModal(true);
  if (toastMessage)
    document.querySelector('#toast').textContent = messageText(toastMessage);
  if (syncEngine?.account && !applyingAccount) {
    const scope = KEY;
    withStudyLock(() => {
      if (scope !== KEY) throw new LocalisedError('error.accountChanged');
      syncEngine.write(latestState(), getLocale());
      storedRaw = workspaceStorage.getItem(KEY);
    }).catch((err) => toast(err));
  }
});
window.addEventListener('workspace-storage-failure', () => {
  memoryOnly = true;
  storageIssue = message('error.storageFull');
  render();
});
initDateInputs();
setInterval(tick, 1000);
render();
if (needsReset) mutate(() => {}).catch((err) => toast(err));
if (new URLSearchParams(location.search).has('password-reset')) {
  accountMode = 'update';
  recoveryMode = true;
  render();
}
if (cloud.watchAuth) {
  syncEngine = createSync({
    cloud,
    storage: workspaceStorage,
    lock: withStudyLock,
    initialLocale: getLocale,
    available: () => !memoryOnly,
    online: () => navigator.onLine !== false,
    onStatus(value) {
      const previous = syncState,
        switched = accountUser?.id !== value.account?.id || KEY !== value.key,
        changed =
          switched ||
          previous.phase !== value.phase ||
          previous.error !== value.error ||
          previous.loading !== value.loading ||
          previous.conflict !== value.conflict ||
          accountUser?.email !== value.account?.email;
      syncState = value;
      if (switched) {
        if (memoryOnly) exportData(state);
        renderedView = '';
        academic.reset();
        profileSettings.reset();
        learning.reset();
        uiEpoch++;
        importEpoch++;
        if (modal.open) modal.close();
        formErrors.clear();
        accountMessage = null;
        KEY = value.key;
        state = newState();
        storedRaw = null;
        memoryOnly = false;
        unreadableRaw = '';
        storageIssue = '';
        recoverableCache = null;
      }
      accountUser = value.account;
      if (changed) render();
    },
    onWorkspace({ key, account, record }) {
      KEY = key;
      accountUser = account;
      let raw;
      try {
        raw = workspaceStorage.getItem(KEY);
        const doc = record?.doc || (account ? parseWorkspace(raw)?.doc : null);
        state = doc ? validateState(doc) : restoreLocalState(raw).state;
        storedRaw = raw;
        storageIssue = '';
        unreadableRaw = '';
        recoverableCache = null;
        memoryOnly = false;
        if (doc) {
          applyingAccount = true;
          try {
            setLocale(doc.locale);
          } finally {
            applyingAccount = false;
          }
        }
      } catch {
        showUnreadableWorkspace(raw);
      }
      render();
    },
  });
  cloud.watchAuth(({ user, project, event, error }) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryMode = true;
      accountMode = 'update';
      view = 'account';
      render();
    }
    if (error) {
      syncState = { ...syncState, phase: 'error', error };
      render();
      return;
    }
    syncEngine.attach(user, project).catch((err) => toast(err));
  });
  setInterval(() => {
    if (document.visibilityState !== 'hidden' && syncEngine.account)
      pollWorkspace(KEY, () => syncEngine.flush()).catch(() => {});
  }, 60000);
  window.addEventListener('online', () => {
    cloud.refreshAuth();
    syncEngine.flush({ force: true }).catch(() => {});
  });
  window.addEventListener('offline', () => syncEngine.flush().catch(() => {}));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible')
      syncEngine.flush({ force: true }).catch(() => {});
  });
  window.addEventListener('focus', () => syncEngine.flush().catch(() => {}));
}

document.addEventListener('click', (event) => {
  const anchor = event.target.closest('a[href]');
  if (
    !anchor ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    anchor.target ||
    anchor.hasAttribute('download')
  )
    return;
  if (anchor.getAttribute('href') === '#main-content') {
    event.preventDefault();
    document.querySelector('#main-content').focus();
    document.querySelector('#main-content').scrollIntoView({ block: 'start' });
    return;
  }
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || url.hash) return;
  const next = Object.entries(routes).find(
    ([, path]) => path === url.pathname,
  )?.[0];
  if (!next) return;
  event.preventDefault();
  uiEpoch++;
  formErrors.clear();
  if (modal.open) modal.close();
  view = next;
  history.pushState(null, '', url.pathname + url.search);
  focused = false;
  render();
  window.scrollTo({ top: 0, behavior: 'auto' });
});
window.addEventListener('popstate', () => {
  view = viewFromPath();
  focused = false;
  if (modal.open) modal.close();
  render();
});
