const EDIT_KEY = 'ukulele_teacher_score_editor_v2';
const HISTORY_KEY = 'ukulele_teacher_score_history_v1';

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

export function saveDraftScore(score) {
  const all = readJson(EDIT_KEY, {});
  all[score.id] = score;
  writeJson(EDIT_KEY, all);
}

export function loadDraftScore(id) {
  const all = readJson(EDIT_KEY, {});
  return all[id] || null;
}

export function clearDraftScore(id) {
  const all = readJson(EDIT_KEY, {});
  delete all[id];
  writeJson(EDIT_KEY, all);
}

export function pushScoreHistory(score) {
  const all = readJson(HISTORY_KEY, {});
  const list = Array.isArray(all[score.id]) ? all[score.id] : [];
  list.push(score);
  all[score.id] = list.slice(-20);
  writeJson(HISTORY_KEY, all);
}

export function popScoreHistory(scoreId) {
  const all = readJson(HISTORY_KEY, {});
  const list = Array.isArray(all[scoreId]) ? all[scoreId] : [];
  const last = list.pop() || null;
  all[scoreId] = list;
  writeJson(HISTORY_KEY, all);
  return last;
}

export function markScoreDirty(score) {
  return { ...score, status: 'edited', updatedAt: Date.now() };
}

export function updateNoteFret(score, barIndex, noteIndex, stringName, nextFret) {
  const cloned = JSON.parse(JSON.stringify(score));
  const bar = cloned.bars?.[barIndex];
  const note = bar?.notes?.[noteIndex];
  if (!note) return cloned;
  note[stringName] = nextFret;
  cloned.status = 'edited';
  cloned.updatedAt = Date.now();
  return cloned;
}
