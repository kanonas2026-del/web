const IMPORT_STORAGE_KEY = 'ukulele_import_score_pages_v2';
const IMPORT_DB_NAME = 'ukulele_import_score_db';
const IMPORT_DB_STORE = 'state';
const IMPORT_DB_KEY = 'pages';
const REVIEW_KEY = 'ukulele_teacher_step2_review_v2';
const EDIT_KEY = 'ukulele_teacher_score_editor_v3';
const HISTORY_KEY = 'ukulele_teacher_score_history_v2';
const ZOOM_KEY = 'ukulele_teacher_score_zoom_v1';
const SOURCE_ZOOM_KEY = 'ukulele_teacher_source_image_zoom_v1';

const lineY = { A: 72, E: 104, C: 136, G: 168 };
const STAFF_LEFT = 108;
const STAFF_RIGHT = 16;
const stringBaseFreq = { G: 392.00, C: 261.63, E: 329.63, A: 440.00 };
let audioCtx = null;
let timers = [];

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

function enableDisabledButtonFeedback() {
  document.querySelectorAll('.teacher-btn.disabled').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      btn.animate(
        [
          { transform:'scale(1)', opacity:0.55 },
          { transform:'scale(0.985)', opacity:0.75 },
          { transform:'scale(1)', opacity:0.55 }
        ],
        { duration:180, easing:'ease-out' }
      );
    });
  });
}

function openImportDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IMPORT_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMPORT_DB_STORE)) db.createObjectStore(IMPORT_DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readImportState() {
  let payload = null;
  try {
    const db = await openImportDb();
    payload = await new Promise((resolve, reject) => {
      const tx = db.transaction(IMPORT_DB_STORE, 'readonly');
      const req = tx.objectStore(IMPORT_DB_STORE).get(IMPORT_DB_KEY);
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch (_) {}

  if (!payload) {
    try { payload = JSON.parse(localStorage.getItem(IMPORT_STORAGE_KEY) || 'null'); } catch (_) {}
  }

  if (!payload) return null;
  if (Array.isArray(payload)) return { pages: payload, activeId: payload[0]?.id || null };
  if (!Array.isArray(payload.pages)) return null;
  return payload;
}

function createDraftScoreFromImport(page, index = 0) {
  const title = (page?.name || `取り込み譜面 ${index + 1}`).replace(/\.[^.]+$/, '');
  return {
    id: `draft-${page?.id || index}`,
    title,
    bpm: 96,
    timeSig: '4/4',
    grid: 16,
    strings: ['A', 'E', 'C', 'G'],
    source: {
      pageId: page?.id || null,
      pageName: page?.name || '',
      hasProcessed: !!page?.processedUrl
    },
    bars: [
      {
        index: 1,
        chord: 'C',
        strum: ['↓', '', '↓', '', '↓', '', '↓', ''],
        notes: [
          { t: 0, A: 0, E: 1, C: 0, G: 0 },
          { t: 4, A: 3, E: 0, C: 0, G: 0 },
          { t: 8, A: 0, E: 1, C: 0, G: 0 },
          { t: 12, A: 3, E: 0, C: 0, G: 0 }
        ]
      },
      {
        index: 2,
        chord: 'G7',
        strum: ['↓', '', '↑', '', '↓', '', '↑', ''],
        notes: [
          { t: 0, A: 2, E: 1, C: 2, G: 0 },
          { t: 4, A: 2, E: 1, C: 2, G: 0 },
          { t: 8, A: 2, E: 1, C: 2, G: 0 },
          { t: 12, A: 2, E: 1, C: 2, G: 0 }
        ]
      },
      {
        index: 3,
        chord: 'C',
        strum: ['↓', '', '', '', '↓', '', '', ''],
        notes: [
          { t: 0, A: 3, E: 0, C: 0, G: 0 },
          { t: 8, A: 0, E: 0, C: 0, G: 0 }
        ]
      },
      {
        index: 4,
        chord: 'C',
        strum: ['↓', '', '↓', '', '↓', '', '↓', ''],
        notes: [
          { t: 0, A: 0, E: 0, C: 0, G: 0 },
          { t: 4, A: 2, E: 0, C: 0, G: 0 },
          { t: 8, A: 3, E: 0, C: 0, G: 0 },
          { t: 12, A: 0, E: 0, C: 0, G: 0 }
        ]
      }
    ],
    status: 'draft'
  };
}

function saveDraftScore(score) {
  const all = readJson(EDIT_KEY, {});
  all[score.id] = score;
  writeJson(EDIT_KEY, all);
}
function loadDraftScore(id) {
  const all = readJson(EDIT_KEY, {});
  return all[id] || null;
}
function clearDraftScore(id) {
  const all = readJson(EDIT_KEY, {});
  delete all[id];
  writeJson(EDIT_KEY, all);
}
function pushScoreHistory(score) {
  const all = readJson(HISTORY_KEY, {});
  const list = Array.isArray(all[score.id]) ? all[score.id] : [];
  list.push(JSON.parse(JSON.stringify(score)));
  all[score.id] = list.slice(-20);
  writeJson(HISTORY_KEY, all);
}
function popScoreHistory(scoreId) {
  const all = readJson(HISTORY_KEY, {});
  const list = Array.isArray(all[scoreId]) ? all[scoreId] : [];
  const last = list.pop() || null;
  all[scoreId] = list;
  writeJson(HISTORY_KEY, all);
  return last;
}
function updateNoteFret(score, barIndex, noteIndex, stringName, nextFret) {
  const cloned = JSON.parse(JSON.stringify(score));
  const bar = cloned.bars?.[barIndex];
  const note = bar?.notes?.[noteIndex];
  if (!note) return cloned;
  note[stringName] = nextFret;
  cloned.status = 'edited';
  cloned.updatedAt = Date.now();
  return cloned;
}

function xForTick(tick, grid) {
  const ratio = tick / grid;
  return `calc(${STAFF_LEFT}px + ${ratio} * (100% - ${STAFF_LEFT + STAFF_RIGHT}px))`;
}
function noteXForString(tick, grid, stringName) {
  return xForTick(tick, grid);
}

function renderScoreMeta(root, score) {
  if (!root) return;
  root.innerHTML = '';
  [
    ['曲名', score.title],
    ['BPM', score.bpm],
    ['拍子', score.timeSig],
    ['グリッド', `${score.grid}分割`],
  ].forEach(([label, value]) => {
    const box = document.createElement('div');
    box.className = 'score-meta-item';
    box.innerHTML = `<div class="score-meta-label">${label}</div><div class="score-meta-value">${value}</div>`;
    root.appendChild(box);
  });
}

function addGrid(system, grid) {
  const gridEl = document.createElement('div');
  gridEl.className = 'score-grid';
  for (let i = 0; i < grid; i++) gridEl.appendChild(document.createElement('span'));
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
  if (context.editedMap?.has(`${context.barIndex}:${context.noteIndex}:${stringName}`)) el.classList.add('is-edited');
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
      noteIndex: context.noteIndex,
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
function renderScorePreview(root, score, options = {}) {
  if (!root) return;
  root.innerHTML = '';
  score.bars.forEach((bar, barIndex) => root.appendChild(renderBar(bar, score, options, barIndex)));
}
function renderRulePanel(root) {
  if (!root) return;
  root.innerHTML = '';
  [
    { level: 'ok', text: '4線はアプリ側でまっすぐ再描画します。画像の湾曲には依存しません。' },
    { level: 'ok', text: 'テンポ・拍子・16分グリッドを内部データとして保持します。' },
    { level: 'warn', text: '現在は下書きデータです。次段階で画像解析候補と音楽ルールを接続します。' }
  ].forEach(item => {
    const el = document.createElement('div');
    el.className = 'score-rule-item' + (item.level === 'warn' ? ' warn' : '');
    el.textContent = item.text;
    root.appendChild(el);
  });
}

function readScoreZoom() {
  try {
    const value = Number(localStorage.getItem(ZOOM_KEY) || '1');
    return Math.max(0.7, Math.min(1.8, value || 1));
  } catch (_) {
    return 1;
  }
}
function writeScoreZoom(value) {
  try { localStorage.setItem(ZOOM_KEY, String(value)); } catch (_) {}
}
function applyScoreZoom(root, label, value) {
  if (!root) return;
  const zoom = Math.max(0.7, Math.min(1.8, value));
  root.style.setProperty('--score-zoom', String(zoom));
  root.style.zoom = String(zoom);
  if (label) label.textContent = `${Math.round(zoom * 100)}%`;
  writeScoreZoom(zoom);
}

function readSourceZoom() {
  try {
    const value = Number(localStorage.getItem(SOURCE_ZOOM_KEY) || '1');
    return Math.max(0.7, Math.min(2.6, value || 1));
  } catch (_) {
    return 1;
  }
}
function writeSourceZoom(value) {
  try { localStorage.setItem(SOURCE_ZOOM_KEY, String(value)); } catch (_) {}
}
function applySourceZoom(stage, label, value) {
  if (!stage) return;
  const zoom = Math.max(0.7, Math.min(2.6, value));
  stage.style.setProperty('--source-zoom', String(zoom));
  stage.style.zoom = String(zoom);
  if (label) label.textContent = `${Math.round(zoom * 100)}%`;
  writeSourceZoom(zoom);
}

function clearTimers() {
  timers.forEach(t => clearTimeout(t));
  timers = [];
}
function stopScoreDraft() {
  clearTimers();
}
function ensureAudio() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function tone(freq, startDelay, duration = 0.22, gainValue = 0.045) {
  timers.push(setTimeout(() => {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.04);
  }, startDelay));
}
function fretToFreq(stringName, fret) {
  const base = stringBaseFreq[stringName];
  if (!base || typeof fret !== 'number') return null;
  return base * Math.pow(2, fret / 12);
}
function playShape(note, startDelay) {
  ['G', 'C', 'E', 'A'].forEach((stringName, index) => {
    const freq = fretToFreq(stringName, note[stringName]);
    if (!freq) return;
    tone(freq, startDelay + index * 16, 0.24, 0.032);
  });
}
function playScoreDraft(score) {
  stopScoreDraft();
  const beatMs = Math.max(220, Math.round(60000 / (score.bpm || 96)));
  const stepMs = beatMs / 4;
  let offset = 0;
  score.bars.forEach(bar => {
    (bar.notes || []).forEach(note => playShape(note, offset + note.t * stepMs));
    offset += score.grid * stepMs;
  });
}

function readReviewState() {
  return readJson(REVIEW_KEY, {});
}
function writeReviewState(state) {
  writeJson(REVIEW_KEY, state);
}
function reviewPageKey(page) {
  return page?.id || page?.name || 'page';
}
function getPageReview(page) {
  const state = readReviewState();
  return state[reviewPageKey(page)] || {};
}
function setPageReview(page, key, value) {
  const state = readReviewState();
  const pageKey = reviewPageKey(page);
  const entry = state[pageKey] || {};
  entry[key] = value;
  state[pageKey] = entry;
  writeReviewState(state);
}
function updateReviewBadge(page) {
  const badge = document.getElementById('reviewBadge');
  if (!badge) return;
  const review = getPageReview(page);
  const values = ['score','rhythm','fingering'].map(k => review[k]).filter(Boolean);
  badge.classList.remove('is-partial','is-complete');
  if (!values.length) {
    badge.textContent = '未確認';
    return;
  }
  if (values.length < 3) {
    badge.textContent = '途中';
    badge.classList.add('is-partial');
    return;
  }
  badge.textContent = '確認済み';
  badge.classList.add('is-complete');
}
function bindReviewUi(page) {
  document.querySelectorAll('.teacher-review-item').forEach(item => {
    const key = item.getAttribute('data-review-key');
    const current = getPageReview(page)[key];
    item.querySelectorAll('.teacher-mini-btn').forEach(btn => {
      btn.classList.remove('is-selected-ok','is-selected-hold','is-selected-ng');
      const value = btn.getAttribute('data-review-value');
      if (value === current) {
        if (value === 'ok') btn.classList.add('is-selected-ok');
        if (value === 'hold') btn.classList.add('is-selected-hold');
        if (value === 'ng') btn.classList.add('is-selected-ng');
      }
      btn.onclick = () => {
        setPageReview(page, key, value);
        bindReviewUi(page);
      };
    });
  });
  updateReviewBadge(page);
}

function renderCandidatePage(payload) {
  const empty = document.getElementById('candidateEmpty');
  const content = document.getElementById('candidateContent');
  if (!empty || !content) return;

  const pages = Array.isArray(payload?.pages) ? payload.pages : [];
  const activeId = payload?.activeId || pages[0]?.id || null;

  if (!pages.length) {
    empty.hidden = false;
    content.hidden = true;
    return;
  }

  empty.hidden = true;
  content.hidden = false;

  const tabs = document.getElementById('pageTabs');
  const image = document.getElementById('candidateImage');
  const caption = document.getElementById('candidateCaption');
  const sourceImageStage = document.getElementById('sourceImageStage');
  const sourceZoomLabel = document.getElementById('sourceZoomLabel');
  const sourceZoomOutBtn = document.getElementById('sourceZoomOutBtn');
  const sourceZoomResetBtn = document.getElementById('sourceZoomResetBtn');
  const sourceZoomInBtn = document.getElementById('sourceZoomInBtn');
  const meta = document.getElementById('scoreMeta');
  const scoreRoot = document.getElementById('scorePreviewRoot');
  const rulePanel = document.getElementById('scoreRulePanel');
  const status = document.getElementById('scoreStatus');
  const playBtn = document.getElementById('playScoreBtn');
  const stopBtn = document.getElementById('stopScoreBtn');
  const editBtn = document.getElementById('editScoreBtn');
  const undoBtn = document.getElementById('undoScoreBtn');
  const resetDraftBtn = document.getElementById('resetDraftBtn');
  const sendBtn = document.getElementById('sendPracticeBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const scoreZoomLabel = document.getElementById('scoreZoomLabel');
  const errorPanel = document.getElementById('scoreErrorPanel');

  let currentId = activeId;
  let currentScore = null;
  let currentDraftScore = null;
  let editMode = false;
  let scoreZoom = readScoreZoom();
  let sourceZoom = readSourceZoom();
  const editedMap = new Set();

  function getCurrentPage() {
    return pages.find(p => p.id === currentId) || pages[0];
  }

  function renderGeneratedScore() {
    try {
      if (!currentScore) return;
      if (errorPanel) errorPanel.hidden = true;
      applyScoreZoom(scoreRoot, scoreZoomLabel, scoreZoom);
      renderScoreMeta(meta, currentScore);
      renderScorePreview(scoreRoot, currentScore, {
        editMode,
        editedMap,
        onNoteTap: ({ barIndex, noteIndex, stringName, currentFret }) => {
          pushScoreHistory(currentScore);
          const nextFret = (Number(currentFret || 0) + 1) % 13;
          currentScore = updateNoteFret(currentScore, barIndex, noteIndex, stringName, nextFret);
          editedMap.add(`${barIndex}:${noteIndex}:${stringName}`);
          saveDraftScore(currentScore);
          renderGeneratedScore();
        }
      });
      renderRulePanel(rulePanel);
      if (status) status.textContent = currentScore.status === 'edited' ? '修正あり' : '下書き';
    } catch (error) {
      console.error('[teacher-score] render failed', error);
      if (errorPanel) {
        errorPanel.hidden = false;
        errorPanel.textContent = `生成TABの描画で問題が出ました: ${error.message || error}`;
      }
    }
  }

  function renderTabs() {
    tabs.innerHTML = '';
    pages.forEach((page, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'teacher-page-tab' + (page.id === currentId ? ' is-active' : '');
      btn.textContent = `${index + 1}枚目`;
      btn.addEventListener('click', () => {
        currentId = page.id;
        stopScoreDraft();
        renderTabs();
        renderPage();
      });
      tabs.appendChild(btn);
    });
  }

  function renderPage() {
    const page = getCurrentPage();
    const index = pages.findIndex(p => p.id === page.id);
    if (!page) return;

    image.src = page.processedUrl || page.previewUrl || '';
    image.alt = `${page.name || '譜面'} の画像`;
    caption.textContent = (page.name || '選択画像') + (page.processedUrl ? '（補正後）' : '（元画像）');
    applySourceZoom(sourceImageStage, sourceZoomLabel, sourceZoom);

    currentDraftScore = createDraftScoreFromImport(page, Math.max(0, index));
    currentScore = loadDraftScore(currentDraftScore.id) || currentDraftScore;
    editedMap.clear();

    renderGeneratedScore();
    bindReviewUi(page);
  }

  playBtn?.addEventListener('click', () => {
    if (currentScore) playScoreDraft(currentScore);
  });
  stopBtn?.addEventListener('click', stopScoreDraft);
  editBtn?.addEventListener('click', () => {
    editMode = !editMode;
    editBtn.textContent = editMode ? '修正モード ON' : '修正モード OFF';
    editBtn.classList.toggle('is-edit-mode', editMode);
    renderGeneratedScore();
  });
  undoBtn?.addEventListener('click', () => {
    if (!currentScore) return;
    const prev = popScoreHistory(currentScore.id);
    if (!prev) return;
    currentScore = prev;
    saveDraftScore(currentScore);
    renderGeneratedScore();
  });
  resetDraftBtn?.addEventListener('click', () => {
    if (!currentDraftScore || !currentScore) return;
    clearDraftScore(currentDraftScore.id);
    currentScore = currentDraftScore;
    editedMap.clear();
    renderGeneratedScore();
  });
  sendBtn?.addEventListener('click', () => {
    sendBtn.classList.add('is-selected-hold');
    setTimeout(() => sendBtn.classList.remove('is-selected-hold'), 450);
  });
  zoomOutBtn?.addEventListener('click', () => {
    scoreZoom = Math.max(0.7, Math.round((scoreZoom - 0.1) * 10) / 10);
    applyScoreZoom(scoreRoot, scoreZoomLabel, scoreZoom);
  });
  zoomResetBtn?.addEventListener('click', () => {
    scoreZoom = 1;
    applyScoreZoom(scoreRoot, scoreZoomLabel, scoreZoom);
  });
  zoomInBtn?.addEventListener('click', () => {
    scoreZoom = Math.min(1.8, Math.round((scoreZoom + 0.1) * 10) / 10);
    applyScoreZoom(scoreRoot, scoreZoomLabel, scoreZoom);
  });

  sourceZoomOutBtn?.addEventListener('click', () => {
    sourceZoom = Math.max(0.7, Math.round((sourceZoom - 0.1) * 10) / 10);
    applySourceZoom(sourceImageStage, sourceZoomLabel, sourceZoom);
  });
  sourceZoomResetBtn?.addEventListener('click', () => {
    sourceZoom = 1;
    applySourceZoom(sourceImageStage, sourceZoomLabel, sourceZoom);
  });
  sourceZoomInBtn?.addEventListener('click', () => {
    sourceZoom = Math.min(2.6, Math.round((sourceZoom + 0.1) * 10) / 10);
    applySourceZoom(sourceImageStage, sourceZoomLabel, sourceZoom);
  });

  renderTabs();
  renderPage();
}

(async () => {
  enableDisabledButtonFeedback();
  if (!location.pathname.endsWith('/teacher-candidates.html') && !location.pathname.endsWith('teacher-candidates.html')) return;
  const payload = await readImportState();
  renderCandidatePage(payload);
})();
