import assert from 'node:assert/strict';
import { newState } from '../study/core.mjs';
import { createAcademicUI } from '../study/academic-ui.mjs';
import { LocalisedError } from '../study/i18n.mjs';
const previousDocument = globalThis.document,
  previousLocation = globalThis.location;
try {
  globalThis.document = { addEventListener() {} };
  for (const code of ['PM', 'PK']) {
    const state = newState();
    globalThis.location = { search: '?subject=' + code };
    const ui = createAcademicUI({
      state: () => state,
      mutate: async (fn) => fn(state),
      icon: () => '',
      closeModal() {},
      navigate() {},
    });
    ui.render('tracker');
    await ui.action({
      dataset: { action: 'academic-start', topicId: 'math-4' },
    });
    assert.ok(
      state.academic.subjectLinks[code],
      'A shared topic must use the selected subtest’s time category: ' + code,
    );
    assert.equal(state.timer.subjectId, state.academic.subjectLinks[code]);
    assert.equal(state.timer.context.topicId, 'math-4');
    await assert.rejects(
      ui.action({ dataset: { action: 'academic-start', topicId: 'math-4' } }),
      (error) =>
        error instanceof LocalisedError && error.key === 'error.finishChoose',
      'Academic errors must keep their translation key when the language changes',
    );
  }
} finally {
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
  if (previousLocation === undefined) delete globalThis.location;
  else globalThis.location = previousLocation;
}
console.log(
  'PASS: shared PK/PM progress keeps study time attributed to the selected subtest.',
);
