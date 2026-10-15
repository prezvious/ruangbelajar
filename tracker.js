const trackerApp = (() => {
  const key = 'ruang-belajar-tracker-v1';
  const stages = ['Belajar', 'Latihan', 'Review'];
  const subjectCodes = trackerData.subjects.map(subject => subject.code);
  const topicMap = new Map(trackerData.topics.map(topic => [topic.id, topic]));
  let state = load();
  let subjectFilter = 'all';
  let searchQuery = '';
  let statusFilter = 'all';
  let editingId = '';
  let pendingDelete = '';
  let chartSeries = 'average';

  function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return Number.isFinite(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value;
  }

  function validRecord(record) {
    return record && typeof record.id === 'string' && validDate(record.date) && typeof record.platform === 'string' && record.platform.trim().length > 0 && record.scores && subjectCodes.every(code => typeof record.scores[code] === 'number' && Number.isFinite(record.scores[code]) && record.scores[code] >= 0);
  }

  function load() {
    let stored;
    try { stored = JSON.parse(localStorage.getItem(key)); } catch { stored = null; }
    const profile = stored?.profile || {};
    const progress = {};
    for (const topic of trackerData.topics) {
      const flags = stored?.progress?.[topic.id];
      progress[topic.id] = Array.isArray(flags) && flags.length === 3 ? flags.map(value => value === true) : [...topic.initial];
    }
    const tryouts = Array.isArray(stored?.tryouts) ? [...new Map(stored.tryouts.filter(validRecord).map(record => [record.id, { id: record.id, date: record.date, platform: record.platform.slice(0, 120), scores: Object.fromEntries(subjectCodes.map(code => [code, record.scores[code]])) }])).values()] : [];
    return { profile: { name: typeof profile.name === 'string' ? profile.name.slice(0, 120) : '', university: typeof profile.university === 'string' ? profile.university.slice(0, 120) : '', major: typeof profile.major === 'string' ? profile.major.slice(0, 120) : '', targetDate: validDate(profile.targetDate) ? profile.targetDate : '' }, progress, tryouts };
  }

  function save(message) {
    let stored = true;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { stored = false; }
    updateSidebar();
    notify(stored ? message : 'Perubahan belum tersimpan. Penyimpanan browser tidak tersedia atau penuh.');
    return stored;
  }

  function stats(code = 'all') {
    const topics = trackerData.topics.filter(topic => code === 'all' || topic.subjects.includes(code));
    const counts = stages.map((stage, index) => topics.filter(topic => state.progress[topic.id][index]).length);
    const done = topics.filter(topic => state.progress[topic.id].every(Boolean)).length;
    const checked = counts.reduce((sum, count) => sum + count, 0);
    return { topics: topics.length, counts, done, checked, percent: topics.length ? Math.round(checked / (topics.length * 3) * 100) : 0 };
  }

  function updateSidebar() {
    const target = document.getElementById('tracker-count');
    if (target) target.textContent = `${stats().done} / ${trackerData.topics.length} materi tuntas`;
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
  }

  function number(value) {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value);
  }

  function average(record) {
    return subjectCodes.reduce((sum, code) => sum + record.scores[code], 0) / subjectCodes.length;
  }

  function deadline() {
    if (!state.profile.targetDate) return 'Belum ditentukan';
    const days = Math.round((new Date(`${state.profile.targetDate}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 86400000);
    return days === 0 ? 'Hari ini' : days > 0 ? `${days} hari lagi` : `Lewat ${Math.abs(days)} hari`;
  }

  function renderDashboard() {
    const total = stats();
    const profile = state.profile;
    const last = [...state.tryouts].sort((first, second) => second.date.localeCompare(first.date))[0];
    document.getElementById('page-content').innerHTML = `
      <section class="dashboard-overview" aria-label="Ringkasan belajar"><div><h2>Progres materi</h2><div class="overview-value">${total.percent}<span>%</span></div><p>${total.checked} dari ${total.topics * 3} tahap selesai</p><progress max="${total.topics * 3}" value="${total.checked}" aria-label="Progres materi keseluruhan"></progress></div><dl class="overview-details"><div><dt>Materi tuntas</dt><dd>${total.done} <span>/ ${total.topics}</span></dd></div><div><dt>Tryout tercatat</dt><dd>${state.tryouts.length}</dd></div><div><dt>Rata-rata tryout terakhir</dt><dd>${last ? number(average(last)) : '<span>Belum ada</span>'}</dd></div></dl></section>
      <section class="profile-section" aria-labelledby="profile-heading"><div class="section-heading"><h2 id="profile-heading">Profil & target</h2><span class="subtle-text">${escapeHtml(deadline())}</span></div><dl class="profile-summary"><div><dt>Nama</dt><dd>${escapeHtml(profile.name || 'Belum diisi')}</dd></div><div><dt>Perguruan tinggi</dt><dd>${escapeHtml(profile.university || 'Belum diisi')}</dd></div><div><dt>Jurusan</dt><dd>${escapeHtml(profile.major || 'Belum diisi')}</dd></div><div><dt>Target selesai belajar</dt><dd>${profile.targetDate ? formatDate(profile.targetDate) : 'Belum ditentukan'}</dd></div></dl><details class="inline-editor"><summary>Atur profil dan target ${icon('right')}</summary><form id="profile-form" class="form-grid"><label>Nama<input name="name" maxlength="120" value="${escapeHtml(profile.name)}" autocomplete="name"></label><label>Perguruan tinggi tujuan<input name="university" maxlength="120" value="${escapeHtml(profile.university)}"></label><label>Jurusan tujuan<input name="major" maxlength="120" value="${escapeHtml(profile.major)}"></label><label>Target selesai belajar<input name="targetDate" type="date" value="${escapeHtml(profile.targetDate)}"></label><div class="form-actions"><button type="submit" class="solid-button">Simpan profil ${icon('check')}</button></div></form></details></section>
      <section class="subject-overview" aria-labelledby="subject-heading"><div class="section-heading"><h2 id="subject-heading">Capaian per subtes</h2><a class="text-link" href="/tracker">Buka tracker ${icon('arrow-up-right')}</a></div><div class="subject-progress-list">${trackerData.subjects.map(subject => {
        const current = stats(subject.code);
        return `<a class="subject-progress-row" href="/tracker?subject=${subject.code}"><div class="subject-progress-title"><span class="subject-pill">${subject.code}</span><div><h3>${escapeHtml(subject.name)}</h3><p>${current.done} dari ${current.topics} materi tuntas</p></div><strong>${current.percent}%</strong></div><div class="stage-meters">${stages.map((stage, index) => `<div><span>${stage}<small>${current.counts[index]}/${current.topics}</small></span><progress max="${current.topics}" value="${current.counts[index]}" aria-label="${stage}: ${escapeHtml(subject.name)}"></progress></div>`).join('')}</div></a>`;
      }).join('')}</div></section>${renderTrend()}`;
  }

  function renderTracker(params = new URLSearchParams()) {
    const requested = params.get('subject');
    subjectFilter = subjectCodes.includes(requested) ? requested : 'all';
    searchQuery = '';
    statusFilter = 'all';
    document.getElementById('page-content').innerHTML = `<div class="tracker-toolbar"><div class="subject-tabs" aria-label="Filter subtes"><button data-subject="all" aria-pressed="${subjectFilter === 'all'}">Semua</button>${trackerData.subjects.map(subject => `<button data-subject="${subject.code}" aria-pressed="${subjectFilter === subject.code}">${subject.code}</button>`).join('')}</div><div class="tracker-filters"><label class="tracker-search">${icon('search')}<input id="tracker-search" type="search" placeholder="Cari materi atau submateri" aria-label="Cari materi tracker"></label><label class="select-field"><span class="sr-only">Status materi</span><select id="tracker-status"><option value="all">Semua status</option><option value="pending">Belum tuntas</option><option value="done">Tuntas</option></select></label></div></div><div id="tracker-summary" class="tracker-summary"></div><div id="tracker-results" aria-live="polite"></div><p class="field-note">Materi PK/PM menggunakan progres bersama. Tanda * mengikuti catatan materi pada sumber asli. Progres sesi agenda dicatat terpisah dari tahap materi.</p>`;
    renderTopicResults();
  }

  function renderTopicResults() {
    const total = stats(subjectFilter);
    document.getElementById('tracker-summary').innerHTML = `<span>${total.done} / ${total.topics} materi tuntas</span><div>${stages.map((stage, index) => `<span>${stage} <strong>${total.counts[index]}/${total.topics}</strong></span>`).join('')}</div>`;
    const query = searchQuery.toLocaleLowerCase('id');
    const topics = trackerData.topics.filter(topic => (subjectFilter === 'all' || topic.subjects.includes(subjectFilter)) && `${topic.title} ${topic.group} ${topic.subjects.join(' ')}`.toLocaleLowerCase('id').includes(query) && (statusFilter === 'all' || state.progress[topic.id].every(Boolean) === (statusFilter === 'done')));
    const groups = new Map();
    for (const topic of topics) {
      const groupKey = `${topic.source}:${topic.group}`;
      if (!groups.has(groupKey)) groups.set(groupKey, { title: topic.group, topics: [] });
      groups.get(groupKey).topics.push(topic);
    }
    document.getElementById('tracker-results').innerHTML = [...groups.values()].map(group => `<section class="topic-group"><h2>${escapeHtml(group.title)}</h2>${group.topics.map(topic => `<article class="topic-row ${state.progress[topic.id].every(Boolean) ? 'topic-done' : ''}"><div class="topic-copy"><span class="subject-pill">${topic.subjects.join(' / ')}</span><h3>${escapeHtml(topic.title)}</h3></div><div class="stage-controls" aria-label="Tahap ${escapeHtml(topic.title)}">${stages.map((stage, index) => `<button data-topic="${topic.id}" data-stage="${index}" aria-pressed="${state.progress[topic.id][index]}" aria-label="${stage}: ${escapeHtml(topic.title)}">${icon(state.progress[topic.id][index] ? 'check-circle' : 'unchecked')}<span>${stage}</span></button>`).join('')}</div></article>`).join('')}</section>`).join('') || '<p class="empty-state">Tidak ada materi yang cocok dengan pencarian dan filter ini.</p>';
  }

  function renderGuideSection() {
    return `<section class="tracker-guide"><h2>Menggunakan tracker</h2><ol><li>Isi profil, jurusan, perguruan tinggi, dan target selesai belajar di Dasbor.</li><li>Di Tracker materi, tandai Belajar, Latihan, dan Review untuk setiap submateri. Ketiga tahap dapat dicatat secara terpisah.</li><li>Capaian setiap subtes dan progres keseluruhan dihitung otomatis. Materi gabungan PK/PM tidak perlu dicentang dua kali.</li><li>Catat tanggal pengerjaan, platform, dan nilai tujuh subtes di Tryout. Gunakan sistem penilaian yang sama untuk membandingkan hasil.</li></ol><p class="field-note">Progres sesi agenda dan tahap materi adalah dua catatan berbeda. Data disimpan di browser ini, tidak tersinkron antarperangkat. Sumber tracker berlabel SNBT ${trackerData.sourceYear}; tanggal target pada aplikasi diatur sendiri, bukan mengikuti tanggal lama di spreadsheet.</p><div class="reference-list">${trackerData.resources.map(resource => externalLink(resource.url, resource.label)).join('')}</div><dl class="contact-list">${trackerData.contacts.map(contact => `<div><dt>${escapeHtml(contact.label)}</dt><dd>${escapeHtml(contact.value)}</dd></div>`).join('')}</dl></section>`;
  }

  function renderTrend() {
    return `<section class="trend-section" aria-labelledby="trend-heading"><div class="section-heading"><h2 id="trend-heading">Perkembangan nilai tryout</h2><label class="select-field"><span class="sr-only">Subtes pada grafik</span><select id="chart-series"><option value="average" ${chartSeries === 'average' ? 'selected' : ''}>Rata-rata 7 subtes</option>${subjectCodes.map(code => `<option value="${code}" ${chartSeries === code ? 'selected' : ''}>${code}</option>`).join('')}</select></label></div><div id="score-plot">${plotScores()}</div><p class="field-note">Rata-rata dihitung dari tujuh nilai subtes, bukan skor gabungan resmi. Bandingkan hasil dari sistem penilaian yang sama.</p></section>`;
  }

  function plotScores() {
    const records = [...state.tryouts].sort((first, second) => first.date.localeCompare(second.date)).slice(-12);
    if (!records.length) return '<div class="chart-empty">Belum ada hasil tryout.<a class="text-link" href="/tryout">Catat tryout pertama</a></div>';
    const values = records.map(record => chartSeries === 'average' ? average(record) : record.scores[chartSeries]);
    const maximum = Math.max(100, Math.ceil(Math.max(...values) / 100) * 100);
    const points = values.map((value, index) => ({ x: records.length === 1 ? 400 : 52 + index * 710 / (records.length - 1), y: 196 - value / maximum * 160 }));
    const rows = Array.from({ length: 5 }, (unused, index) => ({ y: 36 + index * 40, value: maximum * (1 - index / 4) }));
    return `<svg class="score-chart" viewBox="0 0 800 238" role="img" aria-labelledby="score-chart-title score-chart-description"><title id="score-chart-title">Nilai ${chartSeries === 'average' ? 'rata-rata 7 subtes' : chartSeries} pada ${records.length} tryout terakhir</title><desc id="score-chart-description">${escapeHtml(records.map((record, index) => `${formatDate(record.date)}: ${number(values[index])}`).join('; '))}</desc>${rows.map(row => `<line class="chart-grid" x1="52" y1="${row.y}" x2="762" y2="${row.y}"/><text class="chart-label" x="40" y="${row.y + 4}" text-anchor="end">${number(row.value)}</text>`).join('')}${points.length > 1 ? `<polyline class="chart-line" points="${points.map(point => `${point.x},${point.y}`).join(' ')}"/>` : ''}${points.map((point, index) => `<circle class="chart-point" cx="${point.x}" cy="${point.y}" r="4"><title>${escapeHtml(records[index].platform)}: ${number(values[index])}</title></circle>${index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 5) === 0 ? `<text class="chart-label" x="${point.x}" y="224" text-anchor="middle">${escapeHtml(formatDate(records[index].date))}</text>` : ''}`).join('')}</svg>`;
  }

  function renderTryouts() {
    const record = state.tryouts.find(item => item.id === editingId);
    if (!record) editingId = '';
    const sorted = [...state.tryouts].sort((first, second) => second.date.localeCompare(first.date));
    document.getElementById('page-content').innerHTML = `<details class="inline-editor tryout-editor" ${record || !sorted.length ? 'open' : ''}><summary>${record ? 'Edit hasil tryout' : 'Tambah hasil tryout'} ${icon('right')}</summary><form id="tryout-form"><input name="recordId" type="hidden" value="${escapeHtml(record?.id || '')}"><div class="form-grid"><label>Tanggal pengerjaan<input name="date" type="date" required max="${today()}" value="${record?.date || today()}"></label><label>Platform tryout<input name="platform" maxlength="120" required value="${escapeHtml(record?.platform || '')}" placeholder="Nama platform"></label></div><fieldset class="score-fields"><legend>Nilai per subtes</legend>${trackerData.subjects.map(subject => `<label>${subject.code}<span class="sr-only">: ${escapeHtml(subject.name)}</span><input name="score-${subject.code}" type="number" min="0" step="0.01" required inputmode="decimal" value="${record ? record.scores[subject.code] : ''}" placeholder="0"></label>`).join('')}</fieldset><p class="field-note">Isi ketujuh nilai sesuai hasil tryout. Nilai 0 tetap dihitung; kolom kosong tidak dianggap 0.</p><div class="form-actions"><button class="solid-button" type="submit">${record ? 'Simpan perubahan' : 'Simpan tryout'} ${icon('check')}</button>${record ? '<button type="button" class="plain-button" data-cancel-edit>Batal</button>' : ''}</div></form></details>${renderTrend()}<section aria-labelledby="tryout-heading"><div class="section-heading"><h2 id="tryout-heading">Riwayat tryout</h2><span class="subtle-text">${sorted.length} catatan</span></div>${sorted.map(item => `<article class="tryout-record"><div class="tryout-record-heading"><div><h3>${escapeHtml(item.platform)}</h3><p>${formatDate(item.date)}</p></div><div class="tryout-average"><span>Rata-rata</span><strong>${number(average(item))}</strong></div></div><dl class="tryout-scores">${subjectCodes.map(code => `<div><dt>${code}</dt><dd>${number(item.scores[code])}</dd></div>`).join('')}</dl><div class="record-actions">${pendingDelete === item.id ? `<span>Hapus catatan ini?</span><button type="button" class="danger-button" data-confirm-delete="${escapeHtml(item.id)}">Hapus permanen</button><button type="button" class="plain-button" data-cancel-delete>Batal</button>` : `<button type="button" class="plain-button" data-edit-tryout="${escapeHtml(item.id)}">Edit</button><button type="button" class="plain-button" data-delete-tryout="${escapeHtml(item.id)}">Hapus</button>`}</div></article>`).join('') || '<p class="empty-state">Belum ada catatan tryout. Tambahkan hasil melalui formulir di atas.</p>'}</section>`;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-subject')) {
      subjectFilter = subjectCodes.includes(button.dataset.subject) ? button.dataset.subject : 'all';
      document.querySelectorAll('[data-subject]').forEach(item => item.setAttribute('aria-pressed', item.dataset.subject === subjectFilter));
      history.replaceState(null, '', subjectFilter === 'all' ? '/tracker' : `/tracker?subject=${subjectFilter}`);
      renderTopicResults();
    } else if (button.hasAttribute('data-topic')) {
      const id = button.dataset.topic;
      const stage = Number(button.dataset.stage);
      if (!topicMap.has(id) || !Number.isInteger(stage) || stage < 0 || stage > 2) return;
      state.progress[id][stage] = !state.progress[id][stage];
      save('Progres materi disimpan.');
      renderTopicResults();
      document.querySelector(`[data-topic="${id}"][data-stage="${stage}"]`)?.focus({ preventScroll: true });
    } else if (button.hasAttribute('data-edit-tryout')) {
      editingId = button.dataset.editTryout;
      pendingDelete = '';
      renderTryouts();
      document.querySelector('#tryout-form input[name="platform"]')?.focus();
    } else if (button.hasAttribute('data-cancel-edit')) {
      editingId = '';
      renderTryouts();
    } else if (button.hasAttribute('data-delete-tryout')) {
      pendingDelete = button.dataset.deleteTryout;
      renderTryouts();
      document.querySelector('[data-confirm-delete]')?.focus({ preventScroll: true });
    } else if (button.hasAttribute('data-cancel-delete')) {
      pendingDelete = '';
      renderTryouts();
    } else if (button.hasAttribute('data-confirm-delete')) {
      if (button.dataset.confirmDelete !== pendingDelete) return;
      state.tryouts = state.tryouts.filter(record => record.id !== pendingDelete);
      if (editingId === pendingDelete) editingId = '';
      pendingDelete = '';
      save('Catatan tryout dihapus.');
      renderTryouts();
    }
  });

  document.addEventListener('input', event => {
    if (event.target.id === 'tracker-search') {
      searchQuery = event.target.value;
      renderTopicResults();
    }
  });

  document.addEventListener('change', event => {
    if (event.target.id === 'tracker-status') {
      statusFilter = event.target.value;
      renderTopicResults();
    } else if (event.target.id === 'chart-series') {
      chartSeries = subjectCodes.includes(event.target.value) ? event.target.value : 'average';
      document.getElementById('score-plot').innerHTML = plotScores();
    }
  });

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!['profile-form', 'tryout-form'].includes(form.id)) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    if (form.id === 'profile-form') {
      const targetDate = values.get('targetDate');
      if (targetDate && !validDate(targetDate)) { notify('Tanggal target tidak valid.'); return; }
      state.profile = { name: values.get('name').trim(), university: values.get('university').trim(), major: values.get('major').trim(), targetDate };
      save('Profil dan target disimpan.');
      renderDashboard();
    } else {
      const date = values.get('date');
      const platform = values.get('platform').trim();
      const scores = Object.fromEntries(subjectCodes.map(code => [code, values.get(`score-${code}`) === '' ? NaN : Number(values.get(`score-${code}`))]));
      const record = { id: values.get('recordId') || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, date, platform, scores };
      if (!validRecord(record) || date > today()) { notify('Isi tanggal pengerjaan yang sudah berlangsung, platform, dan ketujuh nilai dengan benar.'); return; }
      const index = state.tryouts.findIndex(item => item.id === record.id);
      if (index < 0) state.tryouts.push(record);
      else state.tryouts[index] = record;
      editingId = '';
      pendingDelete = '';
      save('Hasil tryout disimpan.');
      renderTryouts();
    }
  });

  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    state = load();
    updateSidebar();
    const page = location.pathname.replace(/^\/+|\/+$/g, '');
    const query = location.search.slice(1);
    if (page === 'dasbor') renderDashboard();
    if (page === 'tracker') renderTracker(new URLSearchParams(query));
    if (page === 'tryout') renderTryouts();
  });

  return { renderDashboard, renderTracker, renderTryouts, renderGuideSection, updateSidebar };
})();
