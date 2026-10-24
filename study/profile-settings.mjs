import { esc } from './core.mjs';
import { applyAcademicDraft } from './academic-model.mjs';
import { t, message, parseDateInput } from './i18n.mjs';
import { dateField } from './date-input.mjs';

export function createProfileSettings(api) {
  let original = null;
  const fields = [
    ['name', 'a.name'],
    ['university', 'a.university'],
    ['major', 'a.major'],
    ['targetDate', 'a.target'],
  ];

  function render() {
    const profile = api.state().academic.profile;
    return `<section class="profile-settings" aria-labelledby="profile-settings-heading"><h2 id="profile-settings-heading">${esc(t('a.profileEdit'))}</h2><form novalidate id="academic-profile" class="academic-form profile-grid">${fields
      .map(([key, label]) =>
        key === 'targetDate'
          ? `<div class="date-entry"><label for="academic-target-date">${esc(t(label))}</label>${dateField('academic-target-date', key, profile[key], t(label), { required: false })}</div>`
          : `<label>${esc(t(label))}<input name="${key}" type="text" maxlength="120" value="${esc(profile[key])}" ${key === 'name' ? 'autocomplete="name"' : ''}></label>`,
      )
      .join(
        '',
      )}<button class="btn primary" type="submit">${esc(t('a.profileSave'))}</button></form></section>`;
  }

  document.addEventListener('focusin', (event) => {
    if (event.target.closest?.('#academic-profile') && !original)
      original = structuredClone(api.state().academic.profile);
  });
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form.id !== 'academic-profile') return;
    event.preventDefault();
    const fd = new FormData(form);
    Promise.resolve()
      .then(async () => {
        api.validateForm(form);
        const values = Object.fromEntries(
            fields.map(([key]) => [
              key,
              key === 'targetDate' && fd.get(key)
                ? parseDateInput(fd.get(key))
                : fd.get(key).trim(),
            ]),
          ),
          base = original || structuredClone(api.state().academic.profile);
        await api.mutate((s) => {
          s.academic.profile = applyAcademicDraft(
            s.academic.profile,
            base,
            values,
          );
        });
        original = null;
        api.render({ discardDrafts: [form.id] });
        api.toast(message('a.saved'));
      })
      .catch(api.toast);
  });
  return { render, reset: () => (original = null) };
}
