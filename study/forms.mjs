import { LocalisedError, parseDateInput } from './i18n.mjs';

export function validateForm(form) {
  for (const field of Array.from(form.elements || [])) {
    if (
      field.disabled ||
      !['INPUT', 'SELECT', 'TEXTAREA'].includes(field.tagName)
    )
      continue;
    let error = null;
    if (field.required && !field.value.trim())
      error = new LocalisedError(
        field.name === 'name'
          ? 'error.subjectName'
          : field.name === 'title'
            ? 'error.taskTitle'
            : 'validation.required',
      );
    else if (field.matches('[data-local-date]') && field.value)
      try {
        parseDateInput(field.value);
      } catch (e) {
        error = e;
      }
    else if (
      field.type === 'email' &&
      field.value &&
      field.validity.typeMismatch
    )
      error = new LocalisedError('validation.email');
    else if (field.type === 'url' && field.value && field.validity.typeMismatch)
      error = new LocalisedError('validation.url');
    else if (
      field.name === 'goal' &&
      (field.validity.badInput ||
        field.validity.rangeUnderflow ||
        field.validity.rangeOverflow ||
        field.validity.stepMismatch)
    )
      error = new LocalisedError('error.goalRange');
    else if (
      field.type === 'number' &&
      (field.validity.badInput ||
        field.validity.rangeUnderflow ||
        field.validity.rangeOverflow ||
        field.validity.stepMismatch)
    )
      error = new LocalisedError('validation.number');
    else if (field.minLength > 0 && field.value.length < field.minLength)
      error = new LocalisedError('validation.short', {
        count: field.minLength,
      });
    else if (field.maxLength > 0 && field.value.length > field.maxLength)
      error = new LocalisedError('validation.long', { count: field.maxLength });
    if (error) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
      throw error;
    }
    field.removeAttribute('aria-invalid');
  }
}
