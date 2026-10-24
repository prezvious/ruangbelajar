import { CATALOGUES, getLocale, LocalisedError } from './i18n.mjs';

const codeKeys = {
  CLOUD_CONFLICT: 'error.cloudConflict',
  ACCOUNT_CHANGED: 'error.accountChanged',
};

export async function requestJSON(path, body) {
  let response, value;
  try {
    response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    value = await response.json();
  } catch {
    throw new LocalisedError('error.cloudNetwork');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new LocalisedError('error.cloudNetwork');
  if (!response.ok) {
    const key = codeKeys[value.code] || value.key,
      entry = CATALOGUES[getLocale()][key];
    throw new LocalisedError(
      typeof entry === 'string' && !entry.includes('{') ? key : 'http.request',
    );
  }
  return value;
}
