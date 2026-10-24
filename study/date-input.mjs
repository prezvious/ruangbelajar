import { esc, dayKey, parseDay, addDays, calendarDays } from './core.mjs';
import {
  t,
  formatDate,
  formatDateInput,
  parseDateInput,
  formatNumber,
  weekdayNames,
  localeWeekStart,
} from './i18n.mjs';
import { iconSet } from './icons.mjs';

const svg = (name) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconSet.icons[name].body}</svg>`;
const dateIcon = svg('calendar-days'),
  dateArrow = svg('chevron-left');
export function dateField(id, name, iso, label, { required = !!name } = {}) {
  return `<div class="date-field"><div class="date-control"><input id="${esc(id)}" ${name ? `name="${esc(name)}"` : ''} ${required ? 'required' : ''} type="text" inputmode="numeric" autocomplete="off" data-local-date data-date-value="${iso}" data-date-valid="true" value="${iso ? esc(formatDateInput(iso)) : ''}" aria-label="${esc(label)}" aria-describedby="${id}-hint"><button type="button" class="btn icon-btn" data-date-open="${id}" aria-label="${esc(t('date.choose'))}" aria-expanded="false">${dateIcon}</button></div><small id="${id}-hint" class="date-hint">${esc(t('date.format'))}</small></div>`;
}
function dateAt(year, month, day) {
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
}
let dateInput = null,
  dateMonth = null,
  dateFocus = null,
  datePopup = null;
export function captureDatePicker() {
  if (!dateInput?.isConnected) return null;
  const active = document.activeElement;
  let selector = '';
  if (datePopup?.contains(active)) {
    if (active.hasAttribute('data-date-month'))
      selector = '[data-date-month="' + active.dataset.dateMonth + '"]';
    else if (active.hasAttribute('data-date-close'))
      selector = '[data-date-close]';
    else if (active.hasAttribute('data-date-pick'))
      selector =
        (active.closest('.date-picker-bottom')
          ? '.date-picker-bottom'
          : '[role="grid"]') +
        ' [data-date-pick="' +
        active.dataset.datePick +
        '"]';
  }
  return { id: dateInput.id, month: +dateMonth, focus: dateFocus, selector };
}
export function restoreDatePicker(saved) {
  if (!saved) return;
  const input = document.getElementById(saved.id);
  if (!input?.isConnected) return;
  dateInput = input;
  dateMonth = new Date(saved.month);
  dateFocus = saved.focus;
  document
    .querySelector(`[data-date-open="${input.id}"]`)
    ?.setAttribute('aria-expanded', 'true');
  drawDatePicker({ focus: false });
  if (saved.selector) datePopup.querySelector(saved.selector)?.focus();
}
export function closeDatePicker({ restoreFocus = false } = {}) {
  if (dateInput) {
    const opener = document.querySelector(`[data-date-open="${dateInput.id}"]`);
    opener?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) opener?.focus();
  }
  datePopup?.remove();
  dateInput = null;
  datePopup = null;
}
function drawDatePicker({ focus = true } = {}) {
  if (!dateInput?.isConnected) {
    closeDatePicker();
    return;
  }
  if (!datePopup) {
    datePopup = document.createElement('div');
    datePopup.className = 'date-picker';
    datePopup.setAttribute('role', 'dialog');
    dateInput.closest('.date-field').append(datePopup);
  }
  datePopup.setAttribute('aria-label', t('date.choose'));
  const first = dateAt(dateMonth.getFullYear(), dateMonth.getMonth(), 1),
    last = dateAt(dateMonth.getFullYear(), dateMonth.getMonth() + 1, 0),
    from = localeWeekStart(first),
    dates = calendarDays(from, 42);

  datePopup.innerHTML = `<div class="date-picker-top"><button type="button" data-date-month="-1" aria-label="${esc(t('date.previous'))}" ${first.getFullYear() === 1 && first.getMonth() === 0 ? 'disabled' : ''}>${dateArrow}</button><strong>${esc(formatDate(first, { month: 'long', year: 'numeric' }))}</strong><button type="button" data-date-month="1" aria-label="${esc(t('date.next'))}" ${last.getFullYear() === 9999 && last.getMonth() === 11 ? 'disabled' : ''}><span class="date-forward">${dateArrow}</span></button></div><div class="date-picker-grid" role="grid" aria-label="${esc(formatDate(first, { month: 'long', year: 'numeric' }))}"><div role="row">${weekdayNames()
    .map(
      (x) => `<span class="date-weekday" role="columnheader">${esc(x)}</span>`,
    )
    .join('')}</div>${Array.from(
    { length: 6 },
    (_, row) =>
      `<div role="row">${dates
        .slice(row * 7, row * 7 + 7)
        .map((d) => {
          if (!d) return '<span role="gridcell" aria-disabled="true"></span>';
          const iso = dayKey(d);
          return `<button type="button" role="gridcell" data-date-pick="${iso}" class="${d.getMonth() !== first.getMonth() ? 'other ' : ''}${iso === dayKey() ? 'today' : ''}" aria-label="${esc(formatDate(d))}" aria-selected="${iso === dateInput.dataset.dateValue}" tabindex="${iso === dateFocus ? '0' : '-1'}" ${d.getFullYear() < 1 || d.getFullYear() > 9999 ? 'disabled' : ''}>${formatNumber(d.getDate())}</button>`;
        })
        .join('')}</div>`,
  ).join(
    '',
  )}</div><div class="date-picker-bottom"><button type="button" data-date-pick="${dayKey()}">${esc(t('date.today'))}</button><button type="button" data-date-close>${esc(t('common.close'))}</button></div>`;
  if (focus)
    datePopup.querySelector(`[data-date-pick="${dateFocus}"]`)?.focus();
  datePopup.scrollIntoView({ block: 'nearest' });
}
function chooseDate(iso) {
  const input = dateInput;
  input.value = formatDateInput(iso);
  input.dataset.dateValue = iso;
  input.dataset.dateValid = 'true';
  input.removeAttribute('aria-invalid');
  closeDatePicker();
  input.focus();
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
export function initDateInputs() {
  document.addEventListener('input', (e) => {
    const input = e.target;
    if (!input.matches?.('[data-local-date]')) return;
    try {
      input.dataset.dateValue = parseDateInput(input.value);
      input.dataset.dateValid = 'true';
      input.removeAttribute('aria-invalid');
    } catch {
      input.dataset.dateValid = 'false';
    }
  });
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-date-open]');
    if (opener) {
      e.preventDefault();
      const input = document.getElementById(opener.dataset.dateOpen);
      if (dateInput === input) {
        closeDatePicker();
        return;
      }
      closeDatePicker();
      dateInput = input;
      try {
        dateFocus = parseDateInput(input.value);
      } catch {
        dateFocus = dayKey();
      }
      dateMonth = parseDay(dateFocus);
      dateFocus = dayKey(dateMonth);
      opener.setAttribute('aria-expanded', 'true');
      drawDatePicker();
      return;
    }
    if (!datePopup) return;
    const pick = e.target.closest('[data-date-pick]'),
      month = e.target.closest('[data-date-month]');
    if (pick && !pick.disabled) {
      chooseDate(pick.dataset.datePick);
      return;
    }
    if (month && !month.disabled) {
      dateMonth = dateAt(
        dateMonth.getFullYear(),
        dateMonth.getMonth() + Number(month.dataset.dateMonth),
        1,
      );
      dateFocus = dayKey(dateMonth);
      drawDatePicker();
      return;
    }
    if (e.target.closest('[data-date-close]')) {
      closeDatePicker({ restoreFocus: true });
      return;
    }
    if (
      !datePopup.contains(e.target) &&
      !dateInput.closest('.date-field').contains(e.target)
    )
      closeDatePicker();
  });
  document.addEventListener('keydown', (e) => {
    if (!datePopup) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeDatePicker({ restoreFocus: true });
      return;
    }
    const cell = e.target.closest('[data-date-pick]');
    if (!cell || !cell.closest('[role="grid"]')) return;
    let next = parseDay(cell.dataset.datePick),
      handled = true;
    if (e.key === 'ArrowLeft') next = addDays(next, -1);
    else if (e.key === 'ArrowRight') next = addDays(next, 1);
    else if (e.key === 'ArrowUp') next = addDays(next, -7);
    else if (e.key === 'ArrowDown') next = addDays(next, 7);
    else if (e.key === 'Home') next = localeWeekStart(next);
    else if (e.key === 'End') next = addDays(localeWeekStart(next), 6);
    else if (e.key === 'PageUp' || e.key === 'PageDown')
      next = dateAt(
        next.getFullYear(),
        next.getMonth() + (e.key === 'PageUp' ? -1 : 1),
        1,
      );
    else handled = false;
    if (handled) {
      e.preventDefault();
      if (next.getFullYear() < 1 || next.getFullYear() > 9999) return;
      dateFocus = dayKey(next);
      dateMonth = next;
      drawDatePicker();
    }
  });
}
