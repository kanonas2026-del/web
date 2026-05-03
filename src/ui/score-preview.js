import { createDraftScoreFromImport } from '../data/score-model.js';
import { evaluateScoreDraft, fingeringHintForShape } from '../data/music-rules.js';

const lineY = { A: 72, E: 104, C: 136, G: 168 };
const STAFF_LEFT = 108;
const STAFF_RIGHT = 16;

export function renderScoreMeta(root, score) {
  root.innerHTML = '';
  const items = [
    ['曲名', score.title],
    ['BPM', score.bpm],
    ['拍子', score.timeSig],
    ['グリッド', `${score.grid}分割`],
  ];
  items.forEach(([label, value]) => {
    const box = document.createElement('div');
    box.className = 'score-meta-item';
    box.innerHTML = `<div class="score-meta-label">${label}</div><div class="score-meta-value">${value}</div>`;
    root.appendChild(box);
  });
}

function xForTick(tick, grid) {
  const ratio = tick / grid;
  return `calc(${STAFF_LEFT}px + ${ratio} * (100% - ${STAFF_LEFT + STAFF_RIGHT}px))`;
}

function noteXForString(tick, grid, stringName) {
  return xForTick(tick, grid);
}

function addGrid(system, grid) {
  const gridEl = document.createElement('div');
  gridEl.className = 'score-grid';
  for (let i = 0; i < grid; i++) {
    gridEl.appendChild(document.createElement('span'));
  }
  system.appendChild(gridEl);
}

function addChord(system, text, tick, grid) {
  const el = document.createElement('div');
  el.className = 'score-chord';
  el.style.left = xForTick(tick, grid);
  el.textContent = text || '';
  system.appendChild(el);
}

function addStrum(system, text, tick, grid) {
  if (!text) return;
  const el = document.createElement('div');
  el.className = 'score-strum';
  el.style.left = xForTick(tick, grid);
  el.textContent = text;
  system.appendChild(el);
}

function addNote(system, stringName, fret, tick, grid, context) {
  if (typeof fret !== 'number') return;
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'score-note' + (fret === 0 ? ' is-open-string' : ' is-fretted') + (fret >= 10 ? ' is-two-digit' : '') + (context.editMode ? ' is-editable' : '');
  if (context.editedMap?.has(`${context.barIndex}:${context.noteIndex}:${stringName}`)) {
    el.classList.add('is-edited');
  }
  el.style.left = noteXForString(tick, grid, stringName);
  el.style.top = `${lineY[stringName]}px`;
  el.textContent = String(fret);
  el.setAttribute('aria-label', `${stringName}弦 ${fret}フレット`);
  el.addEventListener('click', () => {
    if (!context.editMode || typeof context.onNoteTap !== 'function') return;
    el.classList.add('is-active-edit', 'score-edit-flash');
    setTimeout(() => el.classList.remove('is-active-edit', 'score-edit-flash'), 260);
    context.onNoteTap({
      barIndex: context.barIndex,
      noteIndex,
      stringName,
      currentFret: fret
    });
  });
  system.appendChild(el);
}

function renderBar(bar, score, options, barIndex) {
  const system = document.createElement('div');
  system.className = 'score-system';
  system.dataset.bar = String(bar.index);

  const head = document.createElement('div');
  head.className = 'score-system-head';
  head.innerHTML = `
    <div class="score-system-title">Bar ${bar.index}</div>
    <div class="score-system-chord">${bar.chord || ''}</div>
  `;
  system.appendChild(head);

  addGrid(system, score.grid);

  const staff = document.createElement('div');
  staff.className = 'score-staff';
  score.strings.forEach(s => {
    const line = document.createElement('div');
    line.className = 'score-line';
    line.dataset.string = s;
    staff.appendChild(line);
  });
  system.appendChild(staff);

  (bar.strum || []).forEach((symbol, i) => addStrum(system, symbol, i * 2, score.grid));
  (bar.notes || []).forEach((note, noteIndex) => {
    score.strings.forEach(s => addNote(system, s, note[s], note.t, score.grid, {
      editMode: !!options.editMode,
      onNoteTap: options.onNoteTap,
      editedMap: options.editedMap,
      barIndex,
      noteIndex
    }));
  });

  return system;
}

export function renderScorePreview(root, score, options = {}) {
  root.innerHTML = '';
  score.bars.forEach((bar, barIndex) => root.appendChild(renderBar(bar, score, options, barIndex)));
}

export function renderRulePanel(root, score) {
  root.innerHTML = '';
  evaluateScoreDraft(score).forEach(item => {
    const el = document.createElement('div');
    el.className = 'score-rule-item' + (item.level === 'warn' ? ' warn' : '');
    el.textContent = item.text;
    root.appendChild(el);
  });
}

export function makeDraftScore(page, index) {
  return createDraftScoreFromImport(page, index);
}
