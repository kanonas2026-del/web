import { makeDraftScore, renderRulePanel, renderScoreMeta, renderScorePreview } from './score-preview.js';
import { playScoreDraft, stopScoreDraft } from './score-player.js';
import { clearDraftScore, loadDraftScore, popScoreHistory, pushScoreHistory, saveDraftScore, updateNoteFret } from './score-editor.js';

const IMPORT_STORAGE_KEY = 'ukulele_import_score_pages_v2';
const IMPORT_DB_NAME = 'ukulele_import_score_db';
const IMPORT_DB_STORE = 'state';
const IMPORT_DB_KEY = 'pages';
const REVIEW_KEY = 'ukulele_teacher_step2_review_v2';

function enableDisabledButtonFeedback() {
  const disabledButtons = document.querySelectorAll('.teacher-btn.disabled');
  disabledButtons.forEach(btn => {
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

function readReviewState() {
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}'); } catch (_) { return {}; }
}
function writeReviewState(state) {
  try { localStorage.setItem(REVIEW_KEY, JSON.stringify(state)); } catch (_) {}
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

  let currentId = activeId;
  let currentScore = null;
  let currentDraftScore = null;
  let currentPage = null;
  let editMode = false;
  const editedMap = new Set();

  function getCurrentPage() {
    return pages.find(p => p.id === currentId) || pages[0];
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

  function renderGeneratedScore() {
    if (!currentScore) return;
    renderScoreMeta(meta, currentScore);
    renderScorePreview(scoreRoot, currentScore, {
      editMode,
      editedMap,
      onNoteTap: ({ barIndex, noteIndex, stringName, currentFret }) => {
        pushScoreHistory(currentScore);
        const nextFret = (Number(currentFret || 0) + 1) % 6;
        currentScore = updateNoteFret(currentScore, barIndex, noteIndex, stringName, nextFret);
        editedMap.add(`${barIndex}:${noteIndex}:${stringName}`);
        saveDraftScore(currentScore);
        renderGeneratedScore();
      }
    });
    renderRulePanel(rulePanel, currentScore);
    status.textContent = currentScore.status === 'edited' ? '修正あり' : '下書き';
  }

  function renderPage() {
    const page = getCurrentPage();
    const index = pages.findIndex(p => p.id === page.id);
    if (!page) return;
    currentPage = page;

    image.src = page.processedUrl || page.previewUrl || '';
    image.alt = `${page.name || '譜面'} の画像`;
    caption.textContent = (page.name || '選択画像') + (page.processedUrl ? '（補正後）' : '（元画像）');

    currentDraftScore = makeDraftScore(page, Math.max(0, index));
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

  renderTabs();
  renderPage();
}

(async () => {
  enableDisabledButtonFeedback();
  if (!location.pathname.endsWith('/teacher-candidates.html') && !location.pathname.endsWith('teacher-candidates.html')) return;
  const payload = await readImportState();
  renderCandidatePage(payload);
})();
