const iconNames = {
  dot: 'circle',
  unchecked: 'circle',
  'check-circle': 'circle-check',
  book: 'book-open',
  calendar: 'calendar-days',
  library: 'library-big',
  compass: 'compass',
  external: 'external-link',
  'arrow-up-right': 'arrow-up-right',
  arrow: 'arrow-right',
  left: 'chevron-left',
  right: 'chevron-right',
  layout: 'panel-left',
  filter: 'list-filter',
  check: 'check',
  circle: 'circle',
  search: 'search',
  flag: 'flag',
};

const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const validIds = new Set(curriculum.weeks.flatMap(week => week.sessions.map(session => session.id)));
const storageKey = 'ruang-belajar-v1';
const saved = readSaved();
let selectedWeek = Number.isInteger(saved.week) && saved.week >= 1 && saved.week <= 12 ? saved.week : 2;
let selectedDay = 0;
let unfinishedOnly = false;
let completed = new Set(Array.isArray(saved.completed) ? saved.completed.filter(id => validIds.has(id)) : []);
let toastTimeout;
const content = document.getElementById('page-content');

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ week: selectedWeek, completed: [...completed] }));
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function icon(name) {
  const iconName = iconNames[name] || iconNames.book;
  const svgIcon = iconSet.icons[iconName];
  const width = svgIcon.width || iconSet.width;
  const height = svgIcon.height || iconSet.height;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-icon-name="${iconSet.prefix}:${iconName}" focusable="false" aria-hidden="true">${svgIcon.body}</svg>`;
}

function insertIcons() {
  document.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
}

function externalLink(url, label, className = '') {
  return `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)} (tab baru)">${escapeHtml(label)}${icon('arrow-up-right')}</a>`;
}

function notify(message) {
  clearTimeout(toastTimeout);
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 3200);
}

function updateProgress() {
  document.getElementById('total-progress').value = completed.size;
  document.getElementById('total-percent').textContent = `${Math.round(completed.size / validIds.size * 100)}%`;
  document.getElementById('total-count').textContent = `${completed.size} dari ${validIds.size} sesi selesai`;
  trackerApp.updateSidebar();
}

function renderAgenda() {
  const week = curriculum.weeks[selectedWeek - 1];
  const visible = week.sessions.map((session, index) => ({ ...session, day: index })).filter(session => !unfinishedOnly || !completed.has(session.id));
  if (visible.length && !visible.some(session => session.day === selectedDay)) selectedDay = visible[0].day;
  const session = week.sessions[selectedDay];
  const doneCount = week.sessions.filter(item => completed.has(item.id)).length;
  const resources = session.links.length ? session.links.map((url, index) => externalLink(url, session.links.length === 1 ? 'Buka materi belajar' : `Buka materi ${index + 1}`, 'primary-link focus-resource')).join('') : '<p class="no-resource">Belum ada tautan khusus di kurikulum asli. Gunakan sesi ini untuk latihan mandiri.</p>';
  const literacy = session.code === 'LBI' || session.code === 'LBE' ? '<a class="literacy-link" href="/materi">Lihat referensi & topik literasi</a>' : '';
  content.innerHTML = `
    <section class="week-panel" aria-label="Pilih minggu belajar">
      <div class="week-header"><div class="week-title"><span class="calendar-icon">${icon('calendar')}</span><div><h2>Minggu ${String(week.number).padStart(2, '0')} <span aria-hidden="true">&middot;</span> ${escapeHtml(week.title)}</h2><p>Bulan ${week.month} <span aria-hidden="true">&middot;</span> 7 sesi belajar</p></div></div><div class="week-arrows"><span>12 minggu</span><button class="icon-button" data-step="-1" aria-label="Minggu sebelumnya" ${selectedWeek === 1 ? 'disabled' : ''}>${icon('left')}</button><button class="icon-button" data-step="1" aria-label="Minggu berikutnya" ${selectedWeek === 12 ? 'disabled' : ''}>${icon('right')}</button></div></div>
      <div class="week-tabs">${curriculum.weeks.map(item => `<button class="week-tab" data-week="${item.number}" aria-pressed="${selectedWeek === item.number}" aria-label="Minggu ${item.number}: ${escapeHtml(item.title)}">Pekan ${String(item.number).padStart(2, '0')}</button>`).join('')}</div>
    </section>
    <div class="agenda-layout">
      <section aria-labelledby="agenda-heading"><div class="section-heading"><h2 id="agenda-heading">Agenda minggu ini</h2><button class="filter-button" data-filter aria-pressed="${unfinishedOnly}">${icon('filter')}${unfinishedOnly ? 'Belum selesai' : 'Semua sesi'}</button></div>
        <div class="sessions">${visible.map(item => `<article class="session ${item.day === selectedDay ? 'selected' : ''} ${completed.has(item.id) ? 'done' : ''}"><span class="day-label">${days[item.day]}</span><button class="session-select" data-day="${item.day}" aria-pressed="${item.day === selectedDay}" aria-label="Lihat sesi ${days[item.day]}: ${escapeHtml(item.name)}"><span class="subject-line"><span class="session-name">${escapeHtml(item.name)}</span>${item.code !== 'AWAL' ? `<span class="subject-code">${item.code}</span>` : ''}</span><p>${escapeHtml(item.topics.join(' \u00b7 '))}</p></button><button class="completion" data-complete="${item.id}" aria-pressed="${completed.has(item.id)}" aria-label="${completed.has(item.id) ? 'Batalkan selesai' : 'Tandai selesai'}: ${days[item.day]}, ${escapeHtml(item.name)}">${icon(completed.has(item.id) ? 'check-circle' : 'unchecked')}</button></article>`).join('') || '<p class="empty-state">Semua sesi minggu ini sudah selesai.</p>'}</div>
        <div class="weekly-summary"><span>${icon('check')} ${doneCount} dari 7 sesi selesai</span><span>${Math.round(doneCount / 7 * 100)}% minggu ini</span></div>
      </section>
      <aside class="detail-column" aria-label="Detail sesi terpilih"><section class="focus-panel" aria-labelledby="focus-title"><div class="focus-heading"><span>${completed.has(session.id) ? 'Sesi sudah selesai' : 'Detail sesi'}</span>${icon('book')}</div><h2 id="focus-title">${escapeHtml(session.topics[0] || session.name)}</h2><p class="focus-meta"><span class="status-dot">${icon('dot')}</span>${days[selectedDay]} <span aria-hidden="true">&middot;</span> ${escapeHtml(session.code === 'AWAL' ? 'Pendahuluan belajar' : session.name)}</p>${session.topics.length > 1 ? `<ul class="focus-topics">${session.topics.slice(1).map(topic => `<li>${icon('dot')}${escapeHtml(topic)}</li>`).join('')}</ul>` : ''}${resources}${literacy}${session.code !== 'AWAL' ? `<a class="tracker-session-link" href="/tracker?subject=${session.code}">Buka tracker ${session.code}${icon('arrow-up-right')}</a>` : ''}</section>
        <section class="rhythm-panel" aria-label="Penyelesaian sesi minggu ini"><div class="rhythm-heading"><h3>Progres minggu ini</h3><span>Minggu ${String(selectedWeek).padStart(2, '0')}</span></div><div class="rhythm-days">${week.sessions.map((item, index) => `<div class="rhythm-day ${completed.has(item.id) ? 'complete' : ''}" aria-label="${days[index]}: ${completed.has(item.id) ? 'selesai' : 'belum selesai'}"><span>${icon(completed.has(item.id) ? 'check' : 'circle')}</span><span>${days[index].slice(0, 3)}</span></div>`).join('')}</div></section>
      </aside>
    </div>`;
}

function renderMaterials(query = '') {
  const search = query.trim().toLocaleLowerCase('id');
  const matches = value => value.toLocaleLowerCase('id').includes(search);
  const groups = curriculum.weeks.map(week => {
    const sessions = week.sessions.filter(session => matches(`${session.name} ${session.code} ${session.topics.join(' ')} Minggu ${week.number}`));
    return sessions.length ? `<section class="material-group"><h2>Minggu ${String(week.number).padStart(2, '0')} &middot; ${escapeHtml(week.title)}</h2>${sessions.map(session => `<article class="material-item"><div><h3>${escapeHtml(session.name)}</h3><p>${escapeHtml(session.topics.join(' \u00b7 '))}</p>${!session.links.length ? '<p>Latihan mandiri &middot; Belum ada tautan khusus dari sumber.</p>' : ''}</div><div>${session.links.map((url, index) => externalLink(url, session.links.length > 1 ? `Materi ${index + 1}` : 'Buka materi')).join('<br>')}</div></article>`).join('')}</section>` : '';
  }).join('');
  const literacy = curriculum.literacy.filter(group => matches(`${group.title} ${group.topics.join(' ')}`)).map(group => `<section class="material-group"><h2>${escapeHtml(group.title)}</h2><article class="material-item"><div><p>Referensi literasi dari kurikulum asli.</p><div class="material-tags">${group.topics.map(topic => `<span>${escapeHtml(topic)}</span>`).join('')}</div></div><div>${group.links.map(url => externalLink(url, 'Buka referensi')).join('<br>')}</div></article></section>`).join('');
  document.getElementById('material-results').innerHTML = groups + literacy || '<p class="empty-state">Materi belum ditemukan.<br>Coba kata kunci lain, misalnya logika, aljabar, atau literasi.</p>';
}

function renderGuide() {
  content.innerHTML = `<div class="guide-intro"><h2>Pendahuluan belajar</h2><p>Materi minggu pertama: cara belajar, jalur masuk perguruan tinggi, KIP Kuliah, dan strategi belajar.</p></div><section aria-label="Referensi pendahuluan belajar">${curriculum.weeks[0].sessions.map((session, index) => `<article class="material-item"><span class="guide-index">${String(index + 1).padStart(2, '0')}</span><div class="guide-copy"><h3>${escapeHtml(session.name)}</h3><p>${index === 0 || index === 6 ? 'Playlist belajar' : 'Video panduan'} &middot; YouTube</p></div>${externalLink(session.links[0], 'Tonton')}</article>`).join('')}</section>`;
  content.insertAdjacentHTML('beforeend', trackerApp.renderGuideSection());
}

function renderPage() {
  const requested = location.pathname.replace(/^\/+|\/+$/g, '');
  const query = location.search.slice(1);
  const page = ['agenda', 'materi', 'panduan', 'dasbor', 'tracker', 'tryout'].includes(requested) ? requested : 'agenda';
  const labels = { agenda: 'Agenda belajar', materi: 'Semua materi', panduan: 'Panduan', dasbor: 'Dasbor', tracker: 'Tracker materi', tryout: 'Tryout' };
  document.getElementById('page-label').textContent = labels[page];
  document.title = `${labels[page]} \u2014 Ruang Belajar`;
  document.querySelectorAll('[data-page]').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
    if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.getElementById('page-title').textContent = labels[page];
  document.querySelector('.intro-link').hidden = !['agenda', 'materi'].includes(page);
  if (page === 'materi') {
    content.innerHTML = `<label class="search-box">${icon('search')}<input id="material-search" type="search" placeholder="Cari topik, subtes, atau minggu belajar&hellip;" aria-label="Cari materi belajar" autocomplete="off"></label><div id="material-results" aria-live="polite"></div>`;
    renderMaterials();
  } else if (page === 'panduan') renderGuide();
  else if (page === 'dasbor') trackerApp.renderDashboard();
  else if (page === 'tracker') trackerApp.renderTracker(new URLSearchParams(query));
  else if (page === 'tryout') trackerApp.renderTryouts();
  else renderAgenda();
  updateProgress();
  insertIcons();
}

content.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  let focusSelector;
  if (button.hasAttribute('data-week') || button.hasAttribute('data-step')) {
    selectedWeek = button.hasAttribute('data-week') ? Number(button.dataset.week) : selectedWeek + Number(button.dataset.step);
    selectedWeek = Math.max(1, Math.min(12, selectedWeek));
    selectedDay = 0;
    persist();
    focusSelector = `[data-week="${selectedWeek}"]`;
  } else if (button.hasAttribute('data-day')) {
    selectedDay = Number(button.dataset.day);
    focusSelector = `[data-day="${selectedDay}"]`;
  } else if (button.hasAttribute('data-filter')) {
    unfinishedOnly = !unfinishedOnly;
    focusSelector = '[data-filter]';
  } else if (button.hasAttribute('data-complete')) {
    const id = button.dataset.complete;
    if (completed.has(id)) completed.delete(id);
    else completed.add(id);
    const stored = persist();
    notify(stored ? (completed.has(id) ? 'Progres disimpan.' : 'Sesi dikembalikan ke agenda belajar.') : 'Progres berubah, tetapi browser tidak mengizinkan penyimpanan.');
    focusSelector = unfinishedOnly ? '[data-filter]' : `[data-complete="${id}"]`;
  } else return;
  renderAgenda();
  updateProgress();
  content.querySelector(focusSelector)?.focus({ preventScroll: true });
  if (button.hasAttribute('data-week') || button.hasAttribute('data-step')) content.querySelector(focusSelector)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
});

content.addEventListener('input', event => {
  if (event.target.id === 'material-search') renderMaterials(event.target.value);
});
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  document.getElementById('main').focus();
  document.getElementById('main').scrollIntoView({ block: 'start' });
});
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href]');
  if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.hash || !['/', '/dasbor', '/materi', '/tracker', '/tryout', '/panduan'].includes(url.pathname)) return;
  event.preventDefault();
  if (url.href === location.href) return;
  history.pushState(null, '', url.pathname + url.search);
  renderPage();
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.getElementById('main').focus({ preventScroll: true });
});
window.addEventListener('popstate', () => {
  renderPage();
  window.scrollTo({ top: 0, behavior: 'instant' });
});
window.addEventListener('storage', event => {
  if (event.key !== storageKey) return;
  const latest = readSaved();
  completed = new Set(Array.isArray(latest.completed) ? latest.completed.filter(id => validIds.has(id)) : []);
  updateProgress();
  if (['/', '/agenda', '/index.html'].includes(location.pathname)) renderAgenda();
});
const [legacyPage, legacyQuery = ''] = location.hash.slice(1).split('?');
if (['agenda', 'materi', 'panduan', 'dasbor', 'tracker', 'tryout'].includes(legacyPage)) {
  history.replaceState(null, '', (legacyPage === 'agenda' ? '/' : `/${legacyPage}`) + (legacyQuery ? `?${legacyQuery}` : ''));
} else if (['/agenda', '/index.html'].includes(location.pathname)) {
  history.replaceState(null, '', '/' + location.search + location.hash);
}
renderPage();
