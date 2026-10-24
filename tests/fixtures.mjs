import { newState, uid, COLORS } from '../study/core.mjs';
export function studyState(now = Date.now()) {
  const state = newState(now);
  state.subjects = ['Matematika', 'Bahasa Inggris', 'Fisika', 'Biologi'].map(
    (name, i) => ({ id: uid(), name, color: COLORS[i] }),
  );
  state.timer.subjectId = state.subjects[0].id;
  return state;
}
