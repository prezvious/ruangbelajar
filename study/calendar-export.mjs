import { LocalisedError } from './i18n.mjs';
import { agendaItems, agendaDate } from './academic-model.mjs';
import { taskOccurrences } from './learning-model.mjs';
const escape = (value) =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n|\r/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
function fold(line) {
  let out = '',
    part = '',
    length = 0;
  for (const char of line) {
    const n = new TextEncoder().encode(char).length;
    if (length + n > 75) {
      out += part + '\r\n';
      part = ' ';
      length = 1;
    }
    part += char;
    length += n;
  }
  return out + part;
}
export function calendarExport(state, from, to, now = Date.now()) {
  if (!state.learning.calendarId)
    throw new LocalisedError('error.backupFormat');
  const tasks = taskOccurrences(state, from, to, 10000)
      .filter((x) => !x.done)
      .map((x) => ({ ...x, id: 'task-' + x.id })),
    agenda = agendaItems
      .filter((x) => {
        const d = agendaDate(state.academic, x.id);
        return d >= from && d <= to && !state.academic.completed.includes(x.id);
      })
      .map((x) => ({
        id: 'agenda-' + x.id,
        date: agendaDate(state.academic, x.id),
        title: x.code + ' · ' + x.topics.join(', '),
      }));
  const stamp = new Date(now).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ruang Belajar//Learning Calendar//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const item of [...agenda, ...tasks]) {
    // Floating local time follows the calendar application's selected timezone.
    const dt =
      item.date.replaceAll('-', '') +
      'T' +
      state.learning.reminders.time.replace(':', '') +
      '00';
    lines.push(
      'BEGIN:VEVENT',
      `UID:${state.learning.calendarId}-${item.id}${item.recurrence ? '-' + item.date : ''}@ruang-belajar.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dt}`,
      'DURATION:PT30M',
      `SUMMARY:${escape(item.title)}`,
      `DESCRIPTION:${escape(item.body || '')}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-PT${state.learning.reminders.minutesBefore}M`,
      `DESCRIPTION:${escape(item.title)}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
