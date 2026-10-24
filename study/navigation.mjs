export const routes = {
  agenda: '/',
  today: '/hari-ini',
  schedule: '/jadwal',
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
};

export const primaryNavigation = [
  ['today', 'calendar-days', 'nav.home'],
  ['schedule', 'calendar', 'nav.schedule'],
  ['tracker', 'library-big', 'nav.materials'],
  ['tryout', 'flag', 'nav.tryout'],
  ['stats', 'chart', 'nav.stats'],
];
export const utilityNavigation = [
  ['panduan', 'guide', 'nav.panduan'],
  ['settings', 'settings', 'nav.settings'],
];
export function sectionFor(view) {
  if (['today', 'study'].includes(view)) return 'today';
  if (['agenda', 'schedule', 'calendar', 'planner'].includes(view))
    return 'schedule';
  if (['tracker', 'materi', 'notes'].includes(view)) return 'tracker';
  if (['stats', 'records'].includes(view)) return 'stats';
  if (['settings', 'dasbor', 'subjects', 'account'].includes(view))
    return 'settings';
  return view;
}
export function settingsSection(view, search = '') {
  if (view === 'subjects') return 'subjects';
  if (view === 'account') return 'account';
  if (view === 'dasbor') return 'profile';
  const tab = new URLSearchParams(search).get('tab');
  return ['appearance', 'data'].includes(tab) ? tab : 'profile';
}
