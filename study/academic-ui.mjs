import { taskOccurrences } from './learning-model.mjs';
import { curriculum, trackerData } from './catalog.mjs';
import {
  agendaItems,
  agendaDate,
  materialStats,
  subjectCodes,
  applyAcademicDraft,
} from './academic-model.mjs';
import {
  t,
  LocalisedError,
  message,
  getLocale,
  formatCivilDate,
  formatNumber,
  parseDateInput,
} from './i18n.mjs';
import { dateField } from './date-input.mjs';
import {
  esc,
  dayKey,
  hasActiveSession,
  startTimer,
  uid,
  LIMITS,
} from './core.mjs';
import {
  decodeImport,
  importFingerprint,
  importSummary,
  mergeWorkspaces,
} from './migration.mjs';

export function createAcademicUI(api) {
  const text = (key, params) => esc(t(key, params)),
    button = (action, label, extra = '', classes = 'quiet') =>
      `<button class="btn ${classes}" type="button" data-action="academic-${action}" ${extra}>${esc(label)}</button>`;
  const link = (url, label) =>
    `<a class="resource-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ${api.icon('external')}</a>`;
  const date = (value) =>
    value ? esc(formatCivilDate(value)) : text('a.unscheduled');
  const dateEntry = (id, name, value, key, required = false) =>
    `<div class="date-entry"><label for="${id}">${text(key)}</label>${dateField(id, name, value, t(key), { required })}</div>`;
  let day = 0,
    unfinished = false,
    query = '',
    filter = 'all',
    status = 'all',
    lastView = '',
    trackerLocation = null,
    editing = '',
    series = 'average',
    planDate = dayKey();
  let tryoutOriginal = null;
  const stages = ['a.learn', 'a.practice', 'a.review'];
  function agenda() {
    const s = api.state(),
      a = s.academic,
      w = curriculum.weeks[a.week - 1],
      items = w.sessions
        .map((x, i) => ({ ...x, day: i }))
        .filter((x) => !unfinished || !a.completed.includes(x.id));
    if (items.length && !items.some((x) => x.day === day)) day = items[0].day;
    const item = w.sessions[day],
      done = a.completed.includes(item.id);
    return `<details class="schedule-editor"><summary>${text('a.schedule')}</summary><form novalidate id="academic-schedule" class="academic-form">${dateEntry('academic-start-date', 'startDate', a.startDate, 'a.startDate')}<button class="btn primary" type="submit">${text('a.save')}</button></form><p class="small muted">${text('a.scheduleHelp')}</p></details><div class="week-tabs" aria-label="${text('a.curriculum')}">${curriculum.weeks.map((x) => button('week', t('a.week', { week: x.number }), `data-id="${x.number}" aria-pressed="${x.number === a.week}"`, x.number === a.week ? 'selected' : 'quiet')).join('')}</div><div class="academic-toolbar"><h2>${text('a.week', { week: a.week })} · ${esc(w.title)}</h2>${button('unfinished', t(unfinished ? 'a.pending' : 'a.all'), `aria-pressed="${unfinished}"`)}</div><div class="agenda-layout"><section class="agenda-list">${items.map((x) => `<div class="agenda-row ${day === x.day ? 'active' : ''}">${button('day', x.code + ' · ' + x.topics.join(', '), `data-id="${x.day}" aria-pressed="${day === x.day}"`)}<span class="small">${date(agendaDate(a, x.id))}</span><label class="check-control"><input type="checkbox" data-agenda="${x.id}" ${a.completed.includes(x.id) ? 'checked' : ''} aria-label="${text('a.done')}: ${esc(x.topics.join(', '))}">${text('a.done')}</label></div>`).join('') || `<p class="empty">${text('a.noMatch')}</p>`}</section><section class="agenda-detail"><span class="subject-pill">${item.code}</span><h2>${esc(item.topics.join(' · '))}</h2><p class="muted">${date(agendaDate(a, item.id))}</p><div class="resource-list">${item.links.map((url, i) => link(url, t('a.resources') + (item.links.length > 1 ? ' ' + (i + 1) : ''))).join('') || `<p>${text('a.noResources')}</p>`}</div>${button('start', t('a.start'), `data-agenda-id="${item.id}"`, 'primary')}<form novalidate id="academic-date" class="academic-form"><input type="hidden" name="agendaId" value="${item.id}">${dateEntry('academic-session-date', 'date', agendaDate(a, item.id), 'a.date', true)}<button class="btn quiet" type="submit">${text('a.save')}</button>${a.dates[item.id] ? button('reset-date', t('a.resetDate'), `data-id="${item.id}"`) : ''}</form><p class="small muted">${text('a.separate')}</p></section></div>`;
  }
  function searchBar() {
    return `<label class="academic-search"><span class="sr-only">${text('a.search')}</span><input id="academic-search" type="search" value="${esc(query)}" placeholder="${text('a.search')}"></label>`;
  }
  function materials() {
    const q = query.toLocaleLowerCase(getLocale()),
      items = agendaItems.filter((x) =>
        `${x.code} ${x.name} ${x.topics.join(' ')} ${x.week}`
          .toLocaleLowerCase(getLocale())
          .includes(q),
      );
    return `${searchBar()}<div class="resource-results">${items.map((x) => `<article class="material-row"><div><span class="subject-pill">${x.code}</span><h2>${esc(x.topics.join(' · '))}</h2><p class="small muted">${text('a.week', { week: x.week })}</p><div class="resource-list">${x.links.map((url) => link(url, t('a.resources'))).join('')}</div></div>${button('open-agenda', t('nav.agenda'), `data-id="${x.id}"`)}</article>`).join('') || `<p class="empty">${text('a.noMatch')}</p>`}</div>${curriculum.literacy
      .filter((x) =>
        `${x.title} ${x.topics.join(' ')}`
          .toLocaleLowerCase(getLocale())
          .includes(q),
      )
      .map(
        (x) =>
          `<section class="academic-section"><h2>${esc(x.title)}</h2><p>${x.topics.map(esc).join(' · ')}</p><div class="resource-list">${x.links.map((url) => link(url, t('a.resources'))).join('')}</div></section>`,
      )
      .join('')}`;
  }
  function tracker() {
    const a = api.state().academic,
      q = query.toLocaleLowerCase(getLocale()),
      stats = materialStats(a, filter),
      topics = trackerData.topics.filter(
        (x) =>
          (filter === 'all' || x.subjects.includes(filter)) &&
          `${x.title} ${x.group} ${x.subjects.join(' ')}`
            .toLocaleLowerCase(getLocale())
            .includes(q) &&
          (status === 'all' ||
            a.progress[x.id].every(Boolean) === (status === 'done')),
      );
    const groups = Map.groupBy(topics, (x) => x.source + ':' + x.group);
    return `<div class="academic-toolbar"><div class="subject-tabs">${['all', ...subjectCodes].map((code) => button('subject', code === 'all' ? t('a.all') : code, `data-id="${code}" aria-pressed="${code === filter}"`, code === filter ? 'selected' : 'quiet')).join('')}</div><label><span class="sr-only">${text('a.status')}</span><select id="academic-status">${['all', 'pending', 'done'].map((x) => `<option value="${x}" ${x === status ? 'selected' : ''}>${text('a.' + x)}</option>`).join('')}</select></label></div>${searchBar()}<div class="academic-summary"><strong>${text('a.topicCount', { count: stats.done, total: stats.topics })}</strong><span>${text('a.stageCount', { count: stats.stages, total: stats.topics * 3 })}</span></div>${[...groups.values()].map((items) => `<section class="topic-group"><h2>${esc(items[0].group)}</h2>${items.map((x) => `<article class="topic-row"><div class="topic-copy"><span class="subject-pill">${x.subjects.join(' / ')}</span><h3>${esc(x.title)}</h3></div><div class="stage-controls">${stages.map((key, i) => button('stage', t(key), `data-id="${x.id}" data-stage="${i}" aria-pressed="${a.progress[x.id][i]}" aria-label="${text(key)}: ${esc(x.title)}"`, a.progress[x.id][i] ? 'selected' : 'quiet')).join('')}${button('start', t('a.start'), `data-topic-id="${x.id}"`, 'text-button')}<button type="button" class="btn text-button" data-action="learn-note" data-topic-id="${x.id}">${text('learn.note')}</button></div></article>`).join('')}</section>`).join('') || `<p class="empty">${text('a.noMatch')}</p>`}<p class="small muted">${text('a.separate')}</p>`;
  }
  const average = (x) =>
    subjectCodes.reduce((sum, c) => sum + x.scores[c] / 7, 0);
  function trend() {
    const items = [...api.state().academic.tryouts]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12);
    if (!items.length)
      return `<section class="academic-section"><h2>${text('a.trend')}</h2><p class="muted">${text('a.noTryout')}</p></section>`;
    const values = items.map((x) =>
        series === 'average' ? average(x) : x.scores[series],
      ),
      max = Math.max(100, Math.ceil(Math.max(...values) / 100) * 100),
      points = values.map((v, i) => ({
        x: items.length === 1 ? 400 : 52 + (i * 710) / (items.length - 1),
        y: 196 - (v / max) * 160,
      }));
    return `<section class="academic-section"><div class="academic-toolbar"><h2>${text('a.trend')}</h2><label><span class="sr-only">${text('a.trend')}</span><select id="academic-series">${['average', ...subjectCodes].map((c) => `<option value="${c}" ${series === c ? 'selected' : ''}>${c === 'average' ? text('a.average') : c}</option>`).join('')}</select></label></div><div class="score-scroll"><svg class="score-chart" viewBox="0 0 800 238" role="img" aria-label="${text('a.trend')}"><title>${text('a.trend')}</title><desc>${esc(items.map((x, i) => x.date + ': ' + formatNumber(values[i], { maximumFractionDigits: 2 })).join('; '))}</desc>${Array.from({ length: 5 }, (_, i) => `<line x1="52" x2="762" y1="${36 + i * 40}" y2="${36 + i * 40}" class="chart-grid"/><text x="42" y="${40 + i * 40}" text-anchor="end">${formatNumber(max * (1 - i / 4))}</text>`).join('')}${points.length > 1 ? `<polyline class="chart-line" points="${points.map((p) => p.x + ',' + p.y).join(' ')}"/>` : ''}${points.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="4"><title>${esc(items[i].platform)}: ${formatNumber(values[i])}</title></circle>${i === 0 || i === points.length - 1 ? `<text x="${p.x}" y="226" text-anchor="middle">${esc(items[i].date)}</text>` : ''}`).join('')}</svg></div><p class="small muted">${text('a.scoreNote')}</p></section>`;
  }
  function dashboard() {
    const profile = api.state().academic.profile;
    return `<section class="dashboard-profile" aria-labelledby="profile-heading"><h2 id="profile-heading">${text('a.profile')}</h2><dl class="profile-summary">${[
      ['name', 'a.name'],
      ['university', 'a.university'],
      ['major', 'a.major'],
      ['targetDate', 'a.target'],
    ]
      .map(([key, label]) =>
        key === 'targetDate'
          ? `<div><dt>${text(label)}</dt><dd>${date(profile[key])}</dd></div>`
          : `<div><dt>${text(label)}</dt><dd>${profile[key] ? esc(profile[key]) : text('a.profileEmpty')}</dd></div>`,
      )
      .join('')}</dl></section>`;
  }
  function tryouts() {
    const a = api.state().academic,
      item = a.tryouts.find((x) => x.id === editing);
    return `<details class="inline-editor" ${item || !a.tryouts.length ? 'open' : ''}><summary>${text(item ? 'a.tryoutEdit' : 'a.tryoutNew')}</summary><form novalidate id="academic-tryout" class="academic-form"><input type="hidden" name="recordId" value="${esc(item?.id || '')}">${dateEntry('academic-tryout-date', 'date', item?.date || dayKey(), 'common.date', true)}<label>${text('a.platform')}<input name="platform" maxlength="120" required value="${esc(item?.platform || '')}"></label><fieldset class="score-fields"><legend>${text('a.average')}</legend>${subjectCodes.map((code) => `<label>${code}<input type="number" min="0" step="0.01" required name="score-${code}" value="${item?.scores[code] ?? ''}" inputmode="decimal"></label>`).join('')}</fieldset><button class="btn primary" type="submit">${text('a.save')}</button>${item ? button('cancel-tryout', t('a.cancel')) : ''}<p class="small muted">${text('a.scoreNote')}</p></form></details>${trend()}<div>${[
      ...a.tryouts,
    ]
      .sort((x, y) => y.date.localeCompare(x.date))
      .map(
        (x) =>
          `<article class="tryout-record"><div class="academic-toolbar"><div><h2>${esc(x.platform)}</h2><p class="muted">${date(x.date)}</p></div><p>${text('a.average')} <strong>${formatNumber(average(x), { maximumFractionDigits: 2 })}</strong></p></div><dl class="tryout-scores">${subjectCodes.map((c) => `<div><dt>${c}</dt><dd>${formatNumber(x.scores[c])}</dd></div>`).join('')}</dl><div class="button-row">${button('edit-tryout', t('a.edit'), `data-id="${x.id}"`)}${button('delete-tryout', t('a.delete'), `data-id="${x.id}"`)}</div></article>`,
      )
      .join('')}</div>`;
  }
  function plansForDate(value) {
    const s = api.state(),
      items = agendaItems.filter((x) => agendaDate(s.academic, x.id) === value),
      tasks = taskOccurrences(s, value, value);
    return `<section class="planned-section"><h2>${text('a.planForDate', { date: formatCivilDate(value) })}</h2>${items.map((x) => `<div class="planned-row"><div><strong>${x.code} · ${esc(x.topics.join(', '))}</strong><small>${text('a.week', { week: x.week })} · ${text(s.academic.completed.includes(x.id) ? 'a.done' : 'a.pending')}</small></div>${button('start', t('a.start'), `data-agenda-id="${x.id}"`)}</div>`).join('')}${tasks.map((x) => `<label class="planned-row"><input type="checkbox" data-task="${esc(x.id)}" data-occurrence-date="${x.date}" ${x.done ? 'checked' : ''}><span>${esc(x.title)}</span></label>`).join('')}${!items.length && !tasks.length ? `<p class="muted">${text('a.noMatch')}</p>` : ''}</section>`;
  }
  function calendar() {
    return `<div class="field plan-date">${dateEntry('academic-plan-date', '', planDate, 'common.date', true)}</div>${plansForDate(planDate)}`;
  }
  function mapping() {
    const s = api.state();
    return `<section class="academic-section"><h2>${text('a.mapping')}</h2><div class="mapping-grid">${[...trackerData.subjects, { code: 'AWAL', name: 'Pendahuluan' }].map((x) => `<label>${x.code}<select data-subject-link="${x.code}"><option value="">${text('a.autoSubject')}</option>${s.subjects.map((y) => `<option value="${esc(y.id)}" ${s.academic.subjectLinks[x.code] === y.id ? 'selected' : ''}>${esc(y.name)}${y.archived ? t('subjects.archivedSuffix') : ''}</option>`).join('')}</select></label>`).join('')}</div></section>`;
  }
  function migration() {
    return `<section class="academic-section"><p>${text('a.migrationHelp')}</p><p class="small muted">${text('a.accountLinks')}</p><div class="button-row">${button('merge-file', t('a.mergeFile'), '', 'primary')}<a class="btn quiet" href="/panduan#migration">${text('a.guide')}</a>${api.exportButton()}</div><input id="academic-merge-file" type="file" accept=".json,application/json" hidden></section>${mapping()}`;
  }
  function guide() {
    const help = `<section class="academic-section" id="migration"><h2>${text('guide.migrationTitle')}</h2><p>${text('guide.migrationText')}</p><a href="/MIGRATION.md" target="_blank" rel="noopener">${text('guide.technicalDoc')}</a></section><section class="academic-section" id="sync-guide"><h2>${text('guide.title')}</h2><p>${text('learn.userGuide')}</p><h3>${text('learn.recovery')}</h3><p>${text('learn.recoveryHelp')}</p><h3>${text('learn.reminders')}</h3><p>${text('learn.reminderHelp')}</p><p>${text('learn.capacityHelp')}</p></section>`;
    return `<section class="academic-section"><h2>${text('a.curriculum')} · TTL Indonesia</h2><p>${text('a.guideText')}</p><p class="small muted">${text('a.separate')}</p><p class="small muted">SNBT ${trackerData.sourceYear} · ${text('a.resources')}</p><div class="resource-list">${trackerData.resources.map((x) => link(x.url, x.label)).join('')}</div>${trackerData.contacts.map((x) => `<p class="small">${esc(x.label)}: ${esc(x.value)}</p>`).join('')}</section>${help}${curriculum.weeks[0].sessions.map((x) => `<section class="academic-section"><h2>${esc(x.name)}</h2><div class="resource-list">${x.links.map((url) => link(url, x.name)).join('')}</div></section>`).join('')}`;
  }
  function render(view) {
    if (lastView !== view) {
      query = '';
      lastView = view;
    }
    if (view === 'tracker' && trackerLocation !== location.search) {
      const code = new URLSearchParams(location.search).get('subject');
      filter = subjectCodes.includes(code) ? code : 'all';
      trackerLocation = location.search;
    }
    return (
      {
        agenda,
        tracker,
        materi: materials,
        dasbor: dashboard,
        tryout: tryouts,
        panduan: guide,
        migrasi: migration,
      }[view] || (() => '')
    )();
  }
  async function action(el) {
    const action = el.dataset.action.slice(9),
      id = el.dataset.id;
    if (action === 'week') await api.mutate((s) => (s.academic.week = +id));
    else if (action === 'day') {
      day = +id;
      api.render();
    } else if (action === 'unfinished') {
      unfinished = !unfinished;
      api.render();
    } else if (action === 'subject') {
      filter = id;
      history.replaceState(
        null,
        '',
        id === 'all' ? '/tracker' : '/tracker?subject=' + id,
      );
      api.render();
    } else if (action === 'stage')
      await api.mutate(
        (s) =>
          (s.academic.progress[id][+el.dataset.stage] =
            !s.academic.progress[id][+el.dataset.stage]),
      );
    else if (action === 'open-agenda') {
      const item = agendaItems.find((x) => x.id === id);
      if (item) {
        day = item.day;
        await api.mutate((s) => (s.academic.week = item.week));
        api.navigate('agenda');
      }
    } else if (action === 'reset-date')
      await api.mutate((s) => delete s.academic.dates[id]);
    else if (action === 'edit-tryout') {
      editing = id;
      tryoutOriginal = structuredClone(
        api.state().academic.tryouts.find((x) => x.id === id),
      );
      api.render({ discardDrafts: ['academic-tryout'] });
      document
        .querySelector('#academic-tryout')
        ?.scrollIntoView({ block: 'center' });
    } else if (action === 'cancel-tryout') {
      editing = '';
      tryoutOriginal = null;
      api.render({ discardDrafts: ['academic-tryout'] });
    } else if (action === 'delete-tryout')
      api.confirm(
        message('a.deleteAsk'),
        message('a.deleteAsk'),
        message('a.delete'),
        () =>
          api.mutate(
            (s) =>
              (s.academic.tryouts = s.academic.tryouts.filter(
                (x) => x.id !== id,
              )),
          ),
      );
    else if (action === 'merge-file')
      document.querySelector('#academic-merge-file').click();
    else if (action === 'start') {
      const item = agendaItems.find((x) => x.id === el.dataset.agendaId),
        topic = trackerData.topics.find((x) => x.id === el.dataset.topicId),
        code =
          item?.code ||
          (topic?.subjects.includes(filter) ? filter : topic?.subjects[0]);
      if (!code) return;
      await api.mutate((s) => {
        if (hasActiveSession(s)) throw new LocalisedError('error.finishChoose');
        let linked = s.subjects.find(
          (x) => x.id === s.academic.subjectLinks[code],
        );
        if (linked?.archived)
          throw new LocalisedError('error.subjectUnavailable');
        if (!linked) {
          if (s.subjects.length >= LIMITS.subjects)
            throw new LocalisedError('error.subjectLimit');
          let id = 'utbk-' + code;
          while (s.subjects.some((x) => x.id === id)) id = uid();
          linked = {
            id,
            name:
              trackerData.subjects.find((x) => x.code === code)?.name ||
              'Pendahuluan',
            color: '#4d5d3c',
            archived: false,
          };
          s.subjects.push(linked);
          s.academic.subjectLinks[code] = id;
        }
        s.timer.subjectId = linked.id;
        s.timer.context = item
          ? { agendaId: item.id }
          : {
              topicId: topic.id,
              stage: Math.max(
                0,
                s.academic.progress[topic.id].findIndex((x) => !x),
              ),
            };
        startTimer(s);
      });
      api.closeModal();
      api.navigate('study');
    }
  }
  async function importFile(file) {
    if (!file) return;
    if (file.size > 128 * 1024 * 1024)
      throw new LocalisedError('error.importTooLarge');
    if (hasActiveSession(api.state()))
      throw new LocalisedError('error.finishImport');
    const scope = api.scope(),
      source = decodeImport(await file.text()),
      fingerprint = await importFingerprint(source);
    if (scope !== api.scope()) throw new LocalisedError('error.accountChanged');
    if (api.state().academic.imports.includes(fingerprint)) {
      api.toast(message('a.duplicate'));
      return;
    }
    const counts = importSummary(source);
    api.openModal(
      message('a.preview'),
      () =>
        `<p>${text('a.previewCounts', counts)}</p><p>${text('a.mergeExplain')}</p><form><label class="check-control"><input type="checkbox" name="appearance">${text('a.useAppearance')}</label><label class="check-control"><input type="checkbox" name="profile">${text('a.useProfile')}</label><p class="form-error" role="alert"></p><div class="modal-actions">${api.cancelButton()}<button class="btn primary" type="submit">${text('a.merge')}</button></div></form>`,
      async (fd) => {
        if (scope !== api.scope())
          throw new LocalisedError('error.accountChanged');
        await api.mutate((s) => {
          const merged = mergeWorkspaces(s, source, fingerprint, {
            appearance: fd.has('appearance'),
            incomingProfile: fd.has('profile'),
          });
          api.backup(s);
          Object.assign(s, merged);
        });
        api.toast(message('a.saved'));
      },
    );
  }
  document.addEventListener('input', (event) => {
    if (event.target.id === 'academic-search') {
      query = event.target.value;
      api.render();
    }
  });
  document.addEventListener('change', (event) => {
    const el = event.target;
    Promise.resolve()
      .then(async () => {
        if (el.dataset.agenda)
          await api.mutate((s) => {
            s.academic.completed = el.checked
              ? [...new Set([...s.academic.completed, el.dataset.agenda])]
              : s.academic.completed.filter((x) => x !== el.dataset.agenda);
          });
        else if (el.id === 'academic-status') {
          status = el.value;
          api.render();
        } else if (el.id === 'academic-series') {
          series = el.value;
          api.render();
        } else if (el.id === 'academic-plan-date') {
          planDate = parseDateInput(el.value);
          api.render();
        } else if (el.dataset.subjectLink)
          await api.mutate((s) => {
            if (el.value)
              s.academic.subjectLinks[el.dataset.subjectLink] = el.value;
            else delete s.academic.subjectLinks[el.dataset.subjectLink];
          });
        else if (el.id === 'academic-merge-file') {
          try {
            await importFile(el.files[0]);
          } finally {
            el.value = '';
          }
        }
      })
      .catch(api.toast);
  });
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (
      !['academic-schedule', 'academic-date', 'academic-tryout'].includes(
        form.id,
      )
    )
      return;
    event.preventDefault();
    const fd = new FormData(form);
    Promise.resolve()
      .then(async () => {
        api.validateForm(form);
        if (form.id === 'academic-schedule')
          await api.mutate(
            (s) =>
              (s.academic.startDate = fd.get('startDate')
                ? parseDateInput(fd.get('startDate'))
                : ''),
          );
        else if (form.id === 'academic-date')
          await api.mutate(
            (s) =>
              (s.academic.dates[fd.get('agendaId')] = parseDateInput(
                fd.get('date'),
              )),
          );
        else {
          const item = {
            id: fd.get('recordId') || uid(),
            date: parseDateInput(fd.get('date')),
            platform: fd.get('platform').trim(),
            scores: Object.fromEntries(
              subjectCodes.map((c) => [c, Number(fd.get('score-' + c))]),
            ),
          };
          if (item.date > dayKey())
            throw new LocalisedError('validation.date', {
              format: message('date.format'),
            });
          await api.mutate((s) => {
            const current = s.academic.tryouts.find((x) => x.id === item.id);
            const record = fd.get('recordId')
              ? applyAcademicDraft(current, tryoutOriginal, item)
              : item;
            s.academic.tryouts = [
              ...s.academic.tryouts.filter((x) => x.id !== item.id),
              record,
            ];
          });
          editing = '';
          tryoutOriginal = null;
          api.render();
        }
        api.render({ discardDrafts: [form.id] });
        api.toast(message('a.saved'));
      })
      .catch(api.toast);
  });
  function reset() {
    day = 0;
    unfinished = false;
    query = '';
    filter = 'all';
    status = 'all';
    lastView = '';
    trackerLocation = null;
    editing = '';
    series = 'average';
    planDate = dayKey();
    tryoutOriginal = null;
  }
  return {
    render,
    action,
    calendar,
    plansForDate,
    mapping,
    reset,
    setPlanDate: (value) => (planDate = value),
  };
}
