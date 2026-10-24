import {
  t,
  message,
  LocalisedError,
  formatCivilDate,
  formatDate,
  formatDuration,
  weekdayNames,
} from './i18n.mjs';
import {
  esc,
  dayKey,
  uid,
  hasActiveSession,
  serializeBackup,
  validateState,
} from './core.mjs';
import { trackerData } from './catalog.mjs';
import { agendaItems, agendaDate, civilDate } from './academic-model.mjs';
import {
  dailyQueue,
  capacityPlan,
  taskOccurrences,
  setOccurrence,
  correctTime,
  TEXT_BYTES,
  civilAdd,
  assertCloudCapacity,
} from './learning-model.mjs';
import { calendarExport } from './calendar-export.mjs';
import { dateField } from './date-input.mjs';
import { parseDateInput } from './i18n.mjs';
import { Marked } from './lib/marked.mjs';
import DOMPurify from './lib/purify.mjs';

const md = new Marked({
  renderer: {
    html() {
      return '';
    },
    image() {
      return '';
    },
  },
});
export function renderText(body, format) {
  if (format === 'txt') return `<pre class="personal-text">${esc(body)}</pre>`;
  return DOMPurify.sanitize(md.parse(body), {
    ALLOWED_TAGS: [
      'p',
      'br',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'pre',
      'code',
      'strong',
      'em',
      'del',
      'a',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'hr',
    ],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
  })
    .replaceAll('<a ', '<a target="_blank" rel="noopener noreferrer" ')
    .replace(
      /<(\/?)h([1-6])>/g,
      (_, slash, depth) =>
        '<' + slash + 'h' + Math.min(6, Number(depth) + 2) + '>',
    );
}
export function createLearningUI(api) {
  const h = (key) => esc(t(key)),
    b = (action, key, extra = '', style = 'quiet') =>
      `<button type="button" class="btn ${style}" data-action="learn-${action}" ${extra}>${h(key)}</button>`;
  const field = (name, key, value = '', type = 'text', extra = '') =>
    `<label>${h(key)}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const date = (name, key, value) =>
    `<div class="date-entry"><label for="learn-${name}">${h(key)}</label>${dateField('learn-' + name, name, value, t(key), { required: true })}</div>`;
  const actions = () =>
    `<p class="form-error" role="alert"></p><div class="modal-actions"><button class="btn quiet" type="button" data-action="close-modal">${h('common.cancel')}</button><button class="btn primary" type="submit">${h('a.save')}</button></div>`;
  let notePage = 0,
    searchTimer = null;
  let filter = '',
    query = '',
    page = 0,
    plan = null,
    planOriginal = '',
    planOptions = null,
    planScope = '',
    noticeKey = '';
  function summary() {
    const q = dailyQueue(api.state(), dayKey());
    return `<section class="learning-summary"><h2>${h('nav.today')}</h2><p>${q.agenda.length + q.tasks.length} · <a href="/hari-ini">${h('nav.today')}</a></p></section>`;
  }
  function queue() {
    const today = dayKey(),
      s = api.state(),
      q = dailyQueue(s, today);
    const status = (d) =>
      `<span class="small ${d < today ? 'overdue' : 'muted'}">${esc(formatCivilDate(d))}${d < today ? ' · ' + h('learn.overdue') : ''}</span>`;
    return `<div class="button-row">${b('task', 'learn.task', '', 'primary')}<a class="btn quiet" href="/rencana">${h('nav.planner')}</a>${b('reminders', 'learn.reminders')}</div><p class="small muted">${h('learn.queueHelp')}</p><section class="academic-section">${q.agenda.map((x) => `<article class="planned-row"><div><strong>${esc(x.code + ' · ' + x.topics.join(', '))}</strong>${status(x.date)}</div><div class="button-row"><button class="btn quiet" data-action="academic-start" data-agenda-id="${x.id}">${h('a.start')}</button>${b('agenda-done', 'learn.done', `data-id="${x.id}"`)}${x.date < today ? b('agenda-move', 'learn.move', `data-id="${x.id}"`) : ''}</div></article>`).join('')}${q.tasks.map((x) => `<article class="planned-row"><div><strong>${esc(x.title)}</strong>${status(x.date)}${x.recurrence ? `<small>${h('learn.' + x.recurrence.frequency)}</small>` : ''}</div><div class="button-row">${b('task-done', 'learn.done', `data-id="${x.id}" data-date="${x.date}"`)}${x.recurrence ? b('task-skip', 'learn.skip', `data-id="${x.id}" data-date="${x.date}"`) : x.date < today ? b('task-move', 'learn.move', `data-id="${x.id}"`) : ''}${b('task', 'a.edit', `data-id="${x.id}"`)}${b('task-delete', 'a.delete', `data-id="${x.id}"`)}</div></article>`).join('')}${!q.agenda.length && !q.tasks.length ? `<p class="empty">${h('learn.empty')}</p>` : ''}</section>${routines()}`;
  }
  function routines() {
    const tasks = api.state().tasks.filter((x) => x.recurrence);
    return `<details class="academic-section"><summary>${h('learn.frequency')} (${tasks.length})</summary>${tasks.map((x) => `<div class="planned-row"><span>${esc(x.title)} · ${h('learn.' + x.recurrence.frequency)}</span><div>${b('task', 'a.edit', `data-id="${x.id}"`)}${b('task-delete', 'a.delete', `data-id="${x.id}"`)}</div></div>`).join('')}</details>`;
  }
  function planner() {
    const s = api.state(),
      p = s.learning.planner,
      names = weekdayNames('long'),
      start = s.academic.startDate || dayKey();
    // weekdayNames uses locale ordering; use a fixed Sunday date to label JS weekday indices.
    const weekday = (i) =>
      formatDate(new Date(2026, 9, 18 + i, 12), { weekday: 'long' });
    return `<p class="muted">${h('learn.planHelp')}</p><form id="learn-planner" class="academic-form learning-form" novalidate>${date('startDate', 'a.startDate', start)}${date('targetDate', 'a.target', s.academic.profile.targetDate || civilAdd(start, 120))}${field('minutesPerDay', 'learn.capacity', p.minutesPerDay, 'number', 'min="1" max="1440" required')}${field('sessionMinutes', 'learn.estimate', p.sessionMinutes, 'number', 'min="1" max="1440" required')}<fieldset><legend>${h('learn.weekdays')}</legend><div class="weekday-options">${[1, 2, 3, 4, 5, 6, 0].map((i) => `<label><input type="checkbox" id="learn-weekday-${i}" name="weekdays" value="${i}" ${p.weekdays.includes(i) ? 'checked' : ''}>${esc(weekday(i))}</label>`).join('')}</div></fieldset><details><summary>${h('learn.customEstimates')}</summary><div class="estimate-grid">${agendaItems
      .filter((x) => !s.academic.completed.includes(x.id))
      .map(
        (x) =>
          `<label>${esc(x.code + ' · ' + x.topics.join(', '))}<input type="number" name="estimate-${x.id}" min="1" max="1440" value="${p.estimates[x.id] || ''}" placeholder="${p.sessionMinutes}"></label>`,
      )
      .join(
        '',
      )}</div></details><p class="form-error" role="alert"></p><button type="submit" class="btn primary">${h('learn.preview')}</button></form>${
      plan
        ? `<section class="academic-section" aria-live="polite"><h2>${h(plan.feasible ? 'learn.feasible' : 'learn.infeasible')}</h2><p>${h('learn.finish')}: ${esc(formatCivilDate(plan.finish))}</p><p>${h('learn.unscheduled')}: ${plan.unscheduled.length}</p>${plan.unscheduled.length ? '' : b('apply-plan', 'learn.apply', '', 'primary')}<details><summary>${h('learn.preview')}</summary>${agendaItems
            .filter((x) => plan.dates[x.id])
            .map(
              (x) =>
                `<p>${esc(formatCivilDate(plan.dates[x.id]))} · ${esc(x.code + ' · ' + x.topics.join(', '))}</p>`,
            )
            .join('')}</details></section>`
        : ''
    }`;
  }
  function topicOptions(selected) {
    return trackerData.topics
      .map(
        (x) =>
          `<option value="${x.id}" ${x.id === selected ? 'selected' : ''}>${esc(x.subjects.join('/') + ' · ' + x.title)}</option>`,
      )
      .join('');
  }
  function notes() {
    const s = api.state(),
      items = ['notes', 'resources']
        .flatMap((kind) => s.learning[kind].map((x) => ({ ...x, kind })))
        .filter(
          (x) =>
            (!filter || x.topicId === filter) &&
            (!query ||
              `${x.title} ${x.body}`
                .toLocaleLowerCase()
                .includes(query.toLocaleLowerCase())),
        );
    if (notePage * 25 >= items.length) notePage = 0;
    return `<div class="button-row">${b('note', 'learn.note', '', 'primary')}${b('resource', 'learn.resource')}</div><div class="learning-filters"><label>${h('learn.topic')}<select id="learn-topic-filter"><option value="">${h('a.all')}</option>${topicOptions(filter)}</select></label><label>${h('learn.search')}<input type="search" id="learn-search" value="${esc(query)}"></label></div><p class="small muted">${h('learn.textHelp')}</p>${
      items
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(notePage * 25, notePage * 25 + 25)
        .map(
          (x) =>
            `<article class="academic-section"><p class="small muted">${esc(trackerData.topics.find((t) => t.id === x.topicId)?.title)}</p><h2>${esc(x.title)}</h2>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.url)}</a>` : ''}<div class="personal-text markdown-preview">${renderText(x.body, x.format)}</div><div class="button-row">${b(x.kind === 'notes' ? 'note' : 'resource', 'a.edit', `data-id="${x.id}"`)}${b('text-export', 'learn.exportText', `data-kind="${x.kind}" data-id="${x.id}"`)}${b('text-delete', 'a.delete', `data-kind="${x.kind}" data-id="${x.id}"`)}</div></article>`,
        )
        .join('') || `<p class="empty">${h('a.noMatch')}</p>`
    }${items.length > 25 ? `<p>${notePage * 25 + 1}–${Math.min(notePage * 25 + 25, items.length)} / ${items.length} ${b('note-page', 'learn.more')}</p>` : ''}`;
  }
  function records() {
    const s = api.state(),
      rows = [...s.sessions].sort((a, b) => b.start - a.start),
      total = rows.length;
    if (page * 100 >= total) page = 0;
    return `<div class="button-row">${b('time', 'learn.newTime', '', 'primary')}${b('recovery', 'learn.recovery')}${b('archive', 'learn.archive')}</div><p class="small muted">${h('learn.timeHelp')}</p>${rows
      .slice(page * 100, page * 100 + 100)
      .map(
        (x) =>
          `<article class="planned-row"><div><strong>${esc(s.subjects.find((y) => y.id === x.subjectId)?.name)}</strong><small>${esc(formatDate(new Date(x.start), { dateStyle: 'medium', timeStyle: 'short' }))} – ${esc(formatDate(new Date(x.end), { timeStyle: 'short' }))} · ${esc(formatDuration(x.durationMs))}</small></div><div>${b('time', 'a.edit', `data-id="${x.id}"`)}${b('time-delete', 'a.delete', `data-id="${x.id}"`)}</div></article>`,
      )
      .join(
        '',
      )}${total > 100 ? `<p>${page * 100 + 1}–${Math.min((page + 1) * 100, total)} / ${total} ${b('time-page', 'learn.more')}</p>` : ''}<details class="academic-section"><summary>${h('learn.audit')}</summary>${[
      ...s.learning.timeEdits,
    ]
      .reverse()
      .map(
        (x) =>
          `<div class="planned-row"><span>${esc(formatDate(new Date(x.at), { dateStyle: 'medium', timeStyle: 'short' }))} · ${esc(x.reason)}</span><span>${esc(formatDuration(x.before?.durationMs || 0))} → ${esc(formatDuration(x.after?.durationMs || 0))}</span></div>`,
      )
      .join('')}</details>`;
  }
  const checkedScope = (scope) => {
    if (scope !== api.scope()) throw new LocalisedError('error.accountChanged');
  };
  function editTask(id) {
    const original = structuredClone(
        api.state().tasks.find((x) => x.id === id) || null,
      ),
      scope = api.scope();
    api.openModal(
      message(original ? 'a.edit' : 'learn.task'),
      () =>
        `<form novalidate class="learning-form">${field('title', 'learn.title', original?.title || '', 'text', 'required maxlength="300"')}${date('taskDate', 'a.date', original?.date || dayKey())}${field('minutes', 'learn.minutes', original?.minutes || 30, 'number', 'min="1" max="1440" required')}<label>${h('learn.frequency')}<select name="frequency">${['none', 'daily', 'weekly', 'monthly'].map((x) => `<option value="${x}" ${x === (original?.recurrence?.frequency || 'none') ? 'selected' : ''}>${h('learn.' + x)}</option>`).join('')}</select></label>${field('interval', 'learn.interval', original?.recurrence?.interval || 1, 'number', 'min="1" max="30" required')}<div class="date-entry"><label>${h('learn.until')}</label>${dateField('learn-until', 'until', original?.recurrence?.until || '', t('learn.until'))}</div><p class="small muted">${h('learn.monthHelp')}</p><label>${h('learn.format')}<select name="format"><option value="md" ${original?.format !== 'txt' ? 'selected' : ''}>Markdown</option><option value="txt" ${original?.format === 'txt' ? 'selected' : ''}>TXT</option></select></label><label>${h('learn.body')}<textarea name="body" rows="6">${esc(original?.body || '')}</textarea></label><label>${h('learn.textImport')}<input type="file" id="learn-text-import" accept=".md,.markdown,.txt,text/plain,text/markdown"></label>${actions()}</form>`,
      async (fd) => {
        checkedScope(scope);
        await api.mutate((s) => {
          const current = s.tasks.find((x) => x.id === id);
          if (original && JSON.stringify(current) !== JSON.stringify(original))
            throw new LocalisedError('error.tabConflict');
          const frequency = fd.get('frequency'),
            task = {
              ...(original || { id: uid(), subjectId: '', done: false }),
              title: fd.get('title').trim(),
              date: parseDateInput(fd.get('taskDate')),
              minutes: Number(fd.get('minutes')),
              body: fd.get('body'),
              format: fd.get('format'),
            };
          delete task.recurrence;
          if (frequency !== 'none')
            task.recurrence = {
              frequency,
              interval: Number(fd.get('interval')),
              until: fd.get('until') ? parseDateInput(fd.get('until')) : '',
            };
          if (original) s.tasks[s.tasks.findIndex((x) => x.id === id)] = task;
          else s.tasks.push(task);
        });
      },
    );
  }
  function editText(kind, id, topic) {
    const original = structuredClone(
        api.state().learning[kind].find((x) => x.id === id) || null,
      ),
      scope = api.scope();
    api.openModal(
      message(
        original
          ? 'a.edit'
          : kind === 'notes'
            ? 'learn.note'
            : 'learn.resource',
      ),
      () =>
        `<form novalidate class="learning-form"><label>${h('learn.topic')}<select name="topicId">${topicOptions(original?.topicId || topic || filter)}</select></label>${field('title', 'learn.title', original?.title || '', 'text', 'required maxlength="160"')}${kind === 'resources' ? field('url', 'learn.url', original?.url || '', 'url', 'maxlength="2000"') : ''}<label>${h('learn.format')}<select name="format"><option value="md" ${original?.format !== 'txt' ? 'selected' : ''}>Markdown</option><option value="txt" ${original?.format === 'txt' ? 'selected' : ''}>TXT</option></select></label><label>${h('learn.body')}<textarea name="body" rows="12">${esc(original?.body || '')}</textarea></label><label>${h('learn.textImport')}<input id="learn-text-import" type="file" accept=".md,.markdown,.txt,text/plain,text/markdown"></label><p class="small muted">${h('learn.textHelp')}</p>${actions()}</form>`,
      async (fd) => {
        checkedScope(scope);
        await api.mutate((s) => {
          const items = s.learning[kind],
            current = items.find((x) => x.id === id);
          if (original && JSON.stringify(current) !== JSON.stringify(original))
            throw new LocalisedError('error.tabConflict');
          const value = {
            id: original?.id || uid(),
            topicId: fd.get('topicId'),
            title: fd.get('title').trim(),
            body: fd.get('body'),
            format: fd.get('format'),
            updatedAt: Date.now(),
            ...(kind === 'resources' ? { url: fd.get('url').trim() } : {}),
          };
          if (original) items[items.findIndex((x) => x.id === id)] = value;
          else items.push(value);
        });
      },
    );
  }
  function editTime(id, remove = false) {
    const original = structuredClone(
        api.state().sessions.find((x) => x.id === id) || null,
      ),
      scope = api.scope();
    const local = (ms) => {
      const d = new Date(ms);
      return (
        dayKey(d) +
        'T' +
        String(d.getHours()).padStart(2, '0') +
        ':' +
        String(d.getMinutes()).padStart(2, '0') +
        ':' +
        String(d.getSeconds()).padStart(2, '0')
      );
    };
    const now = Date.now();
    api.openModal(
      message(remove ? 'a.delete' : original ? 'a.edit' : 'learn.newTime'),
      () =>
        `<form novalidate class="learning-form">${
          remove
            ? ''
            : `<label>${h('a.subjects')}<select name="subjectId" required>${api
                .state()
                .subjects.map(
                  (x) =>
                    `<option value="${x.id}" ${x.id === original?.subjectId ? 'selected' : ''}>${esc(x.name)}</option>`,
                )
                .join(
                  '',
                )}</select></label>${field('start', 'learn.start', local(original?.start || now - 1800000), 'datetime-local', 'step="1" required')}${field('end', 'learn.end', local(original?.end || now), 'datetime-local', 'step="1" required')}<p>${h('learn.impact')}: <output id="learn-time-impact">${esc(formatDuration(original?.durationMs || 1800000))}</output></p>`
        }${field('reason', 'learn.reason', '', 'text', 'required maxlength="300"')}<p class="small muted">${h('learn.timeHelp')}</p>${actions()}</form>`,
      async (fd) => {
        checkedScope(scope);
        await api.mutate((s) =>
          correctTime(s, {
            id: id || '',
            before: original,
            after: remove
              ? null
              : {
                  subjectId: fd.get('subjectId'),
                  start:
                    original && fd.get('start') === local(original.start)
                      ? original.start
                      : Date.parse(fd.get('start')),
                  end:
                    original && fd.get('end') === local(original.end)
                      ? original.end
                      : Date.parse(fd.get('end')),
                  ...(original?.context ? { context: original.context } : {}),
                },
            reason: fd.get('reason'),
          }),
        );
      },
    );
  }
  function reminders() {
    const r = api.state().learning.reminders,
      scope = api.scope();
    api.openModal(
      message('learn.reminders'),
      () =>
        `<form novalidate class="learning-form"><label class="check-control"><input type="checkbox" name="enabled" ${r.enabled ? 'checked' : ''}>${h('learn.reminderEnable')}</label>${field('time', 'learn.reminderTime', r.time, 'time', 'required')}${field('minutesBefore', 'learn.before', r.minutesBefore, 'number', 'min="0" max="10080" required')}<p>${h('learn.reminderHelp')}</p>${actions()}</form><div class="button-row">${b('ics', 'learn.ics')}</div>`,
      async (fd) => {
        checkedScope(scope);
        await api.mutate((s) => {
          if (JSON.stringify(s.learning.reminders) !== JSON.stringify(r))
            throw new LocalisedError('error.tabConflict');
          s.learning.reminders = {
            enabled: fd.has('enabled'),
            time: fd.get('time'),
            minutesBefore: Number(fd.get('minutesBefore')),
          };
        });
      },
    );
  }
  async function action(el) {
    const action = el.dataset.action.slice(6),
      id = el.dataset.id,
      scope = api.scope();
    if (action === 'archive') {
      const original = JSON.stringify(api.state().sessions);
      api.openModal(
        message('learn.archive'),
        () =>
          `<p>${h('learn.archiveHelp')}</p><form novalidate class="learning-form">${date('before', 'learn.end', dayKey())}${actions()}</form>`,
        async (fd) => {
          checkedScope(scope);
          await api.mutate((s) => {
            if (hasActiveSession(s))
              throw new LocalisedError('error.finishImport');
            if (JSON.stringify(s.sessions) !== original)
              throw new LocalisedError('error.tabConflict');
            const cutoff = Date.parse(
              parseDateInput(fd.get('before')) + 'T00:00:00',
            );
            api.download(
              serializeBackup(s),
              'ruang-sebelum-arsip.json',
              'application/json',
            );
            s.sessions = s.sessions.filter((x) => x.end > cutoff);
          });
        },
      );
    } else if (action === 'note-page') {
      notePage++;
      api.render();
    } else if (action === 'task') editTask(id);
    else if (action === 'note' || action === 'resource')
      editText(
        action === 'note' ? 'notes' : 'resources',
        id,
        el.dataset.topicId,
      );
    else if (action === 'time' || action === 'time-delete')
      editTime(id, action === 'time-delete');
    else if (action === 'time-page') {
      page++;
      api.render();
    } else if (action === 'reminders') reminders();
    else if (action === 'task-done' || action === 'task-skip')
      await api.mutate((s) =>
        setOccurrence(
          s,
          id,
          el.dataset.date,
          action === 'task-skip' ? 'skipped' : true,
        ),
      );
    else if (action === 'agenda-done')
      await api.mutate((s) => {
        if (!s.academic.completed.includes(id)) s.academic.completed.push(id);
      });
    else if (action === 'agenda-move')
      await api.mutate((s) => (s.academic.dates[id] = dayKey()));
    else if (action === 'task-move')
      await api.mutate((s) => {
        const task = s.tasks.find((x) => x.id === id);
        if (!task || task.recurrence)
          throw new LocalisedError('error.tabConflict');
        task.date = dayKey();
      });
    else if (action === 'task-delete' || action === 'text-delete') {
      const kind = action === 'task-delete' ? 'tasks' : el.dataset.kind,
        original = JSON.stringify(
          kind === 'tasks'
            ? api.state().tasks.find((x) => x.id === id)
            : api.state().learning[kind]?.find((x) => x.id === id),
        );
      api.confirm(
        message('a.delete'),
        message('a.deleteAsk'),
        message('a.delete'),
        async () => {
          checkedScope(scope);
          await api.mutate((s) => {
            const list = kind === 'tasks' ? s.tasks : s.learning[kind];
            if (JSON.stringify(list.find((x) => x.id === id)) !== original)
              throw new LocalisedError('error.tabConflict');
            if (kind === 'tasks') s.tasks = list.filter((x) => x.id !== id);
            else s.learning[kind] = list.filter((x) => x.id !== id);
          });
        },
      );
    } else if (action === 'text-export') {
      const item = api
        .state()
        .learning[el.dataset.kind].find((x) => x.id === id);
      if (item)
        api.download(
          item.body,
          item.title.replace(/[^\p{L}\p{N} _-]/gu, '_').slice(0, 80) +
            '.' +
            item.format,
          'text/plain;charset=utf-8',
        );
    } else if (action === 'apply-plan') {
      checkedScope(planScope);
      await api.mutate((s) => {
        if (
          JSON.stringify([
            s.academic,
            s.tasks,
            s.learning.planner,
            s.learning.occurrences,
          ]) !== planOriginal
        )
          throw new LocalisedError('learn.stalePlan');
        s.academic.startDate = planOptions.startDate;
        s.academic.profile.targetDate = planOptions.targetDate;
        s.learning.planner = {
          weekdays: planOptions.weekdays,
          minutesPerDay: planOptions.minutesPerDay,
          sessionMinutes: planOptions.sessionMinutes,
          estimates: planOptions.estimates,
        };
        Object.assign(s.academic.dates, plan.dates);
      });
      plan = null;
      api.render();
      api.toast(message('learn.saved'));
    } else if (action === 'ics') {
      api.openModal(
        message('learn.ics'),
        () =>
          `<form novalidate class="learning-form">${date('from', 'learn.start', dayKey())}${date('to', 'learn.end', civilAdd(dayKey(), 90))}<p>${h('learn.reminderHelp')}</p>${actions()}</form>`,
        async (fd) => {
          checkedScope(scope);
          await api.mutate((s) => {
            s.learning.calendarId ||= uid();
          });
          api.download(
            calendarExport(
              api.state(),
              parseDateInput(fd.get('from')),
              parseDateInput(fd.get('to')),
            ),
            'ruang-belajar.ics',
            'text/calendar;charset=utf-8',
          );
        },
      );
    } else if (action === 'recovery') {
      const rows = await api.snapshots();
      checkedScope(scope);
      api.openModal(
        message('learn.recovery'),
        () =>
          `<p>${h('learn.recoveryHelp')}</p>${rows.map((x) => `<div class="planned-row"><span>${esc(formatDate(new Date(x.at), { dateStyle: 'medium', timeStyle: 'short' }))}</span>${b('restore', 'learn.restore', `data-id="${x.id}"`)}${b('snapshot-export', 'data.export', `data-id="${x.id}"`)}</div>`).join('') || `<p>${h('a.noMatch')}</p>`}`,
      );
    } else if (action === 'restore' || action === 'snapshot-export') {
      const rows = await api.snapshots();
      checkedScope(scope);
      const row = rows.find((x) => x.id === id);
      if (!row) throw new LocalisedError('error.tabConflict');
      if (action === 'snapshot-export')
        api.download(
          serializeBackup(validateState(JSON.parse(row.raw)), row.at),
          'ruang-snapshot.json',
          'application/json',
        );
      else
        api.confirm(
          message('learn.restore'),
          message('learn.recoveryHelp'),
          message('learn.restore'),
          async () => {
            checkedScope(scope);
            api.download(
              serializeBackup(api.state()),
              'ruang-sebelum-pemulihan.json',
              'application/json',
            );
            await api.restore(
              serializeBackup(validateState(JSON.parse(row.raw)), row.at),
            );
          },
        );
    } else if (action === 'storage') {
      const estimate = await api.storageEstimate();
      checkedScope(scope);
      let cloudOK = true;
      try {
        assertCloudCapacity(api.state());
      } catch {
        cloudOK = false;
      }
      api.openModal(
        message('learn.storage'),
        () =>
          `<p>${h('learn.workspaceBudget')} · ${new TextEncoder().encode(JSON.stringify(api.state())).byteLength.toLocaleString()} B / 3 MiB</p><p>${estimate.usage === null ? '—' : Math.round(estimate.usage / 1048576) + ' MiB'} / ${estimate.quota === null ? '—' : Math.round(estimate.quota / 1048576) + ' MiB'}</p>${cloudOK ? '' : `<p role="alert">${h('learn.cloudCapacity')}</p>`}<p>${estimate.persistent ? h('learn.saved') : ''}</p><div class="button-row">${b('persist', 'learn.persist')}${b('recovery', 'learn.recovery')}${api.canForget?.() ? b('forget', 'learn.forget') : ''}</div>`,
      );
    } else if (action === 'persist') {
      const granted = await navigator.storage?.persist?.();
      api.toast(message(granted ? 'learn.saved' : 'error.storageUnavailable'));
    } else if (action === 'forget')
      api.confirm(
        message('learn.forget'),
        message('learn.recoveryHelp'),
        message('learn.forget'),
        async () => {
          checkedScope(scope);
          await api.forget();
          api.closeModal();
        },
      );
  }
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'learn-planner') return;
    e.preventDefault();
    try {
      const fd = new FormData(e.target);
      api.validateForm?.(e.target);
      planOptions = {
        startDate: parseDateInput(fd.get('startDate')),
        targetDate: parseDateInput(fd.get('targetDate')),
        weekdays: fd.getAll('weekdays').map(Number),
        minutesPerDay: Number(fd.get('minutesPerDay')),
        sessionMinutes: Number(fd.get('sessionMinutes')),
        estimates: Object.fromEntries(
          agendaItems
            .filter((x) => fd.get('estimate-' + x.id))
            .map((x) => [x.id, Number(fd.get('estimate-' + x.id))]),
        ),
      };
      plan = capacityPlan(api.state(), planOptions);
      planOriginal = JSON.stringify([
        api.state().academic,
        api.state().tasks,
        api.state().learning.planner,
        api.state().learning.occurrences,
      ]);
      planScope = api.scope();
      api.render();
    } catch (err) {
      api.toast(err);
    }
  });
  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.id === 'learn-topic-filter') {
      filter = el.value;
      notePage = 0;
      api.render();
    }
    if (el.id !== 'learn-text-import') return;
    const form = el.form,
      file = el.files[0],
      scope = api.scope();
    if (!file) return;
    try {
      if (file.size > TEXT_BYTES || !/\.(md|markdown|txt)$/i.test(file.name))
        throw new LocalisedError('learn.fileError');
      const body = new TextDecoder('utf-8', { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      checkedScope(scope);
      if (!form.isConnected) return;
      if (body.includes('\0') || !(body.isWellFormed?.() ?? true))
        throw new LocalisedError('learn.fileError');
      form.elements.body.value = body;
      form.elements.format.value = /\.txt$/i.test(file.name) ? 'txt' : 'md';
      if (!form.elements.title.value)
        form.elements.title.value = file.name.replace(/\.[^.]+$/, '');
    } catch {
      api.toast(message('learn.fileError'));
    } finally {
      el.value = '';
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'learn-search') {
      query = e.target.value;
      notePage = 0;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => api.render(), 150);
    }
    if (
      ['start', 'end'].includes(e.target.name) &&
      e.target.form?.querySelector('#learn-time-impact')
    ) {
      const f = e.target.form.elements;
      document.querySelector('#learn-time-impact').textContent = formatDuration(
        Math.max(0, Date.parse(f.end.value) - Date.parse(f.start.value)) || 0,
      );
    }
  });
  function checkReminders() {
    const s = api.state(),
      r = s.learning.reminders;
    if (!r.enabled) return;
    const date = dayKey(),
      trigger = Date.parse(date + 'T' + r.time) - r.minutesBefore * 60000;
    const key = api.scope() + '@' + date + '@' + r.time + '@' + r.minutesBefore;
    if (Date.now() < trigger || key === noticeKey) return;
    try {
      if (sessionStorage.getItem('ruang.reminder.last') === key) return;
      sessionStorage.setItem('ruang.reminder.last', key);
    } catch {}
    noticeKey = key;
    const q = dailyQueue(s, date);
    if (q.agenda.length + q.tasks.length) api.toast(message('nav.today'));
  }
  return {
    summary,
    reset() {
      notePage = 0;
      clearTimeout(searchTimer);
      filter = '';
      query = '';
      page = 0;
      plan = null;
      planOriginal = '';
      planOptions = null;
      planScope = '';
      noticeKey = '';
    },
    render: (view) =>
      ({ today: queue, planner, notes, records })[view]?.() || '',
    action,
    checkReminders,
  };
}
