const IMPORT_STORAGE_KEY = 'ukulele_import_score_pages_v2';
const IMPORT_DB_NAME = 'ukulele_import_score_db';
const IMPORT_DB_STORE = 'state';
const IMPORT_DB_KEY = 'pages';

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
  let currentId = activeId;

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
        renderTabs();
        renderPage();
      });
      tabs.appendChild(btn);
    });
  }

  function renderPage() {
    const page = getCurrentPage();
    if (!page) return;
    image.src = page.processedUrl || page.previewUrl || '';
    image.alt = `${page.name || '譜面'} の補正後画像`;
    caption.textContent = (page.name || '選択画像') + (page.processedUrl ? '（補正後）' : '（元画像）');
    bindReviewUi(page);
  }

  renderTabs();
  renderPage();
}

(async () => {
  enableDisabledButtonFeedback();
  if (!location.pathname.endsWith('/teacher-candidates.html') && !location.pathname.endsWith('teacher-candidates.html')) return;
  const payload = await readImportState();
  renderCandidatePage(payload);
})();


const REVIEW_KEY = 'ukulele_teacher_step2_review_v1';

function readReviewState() {
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}'); } catch (_) { return {}; }
}
function writeReviewState(state) {
  try { localStorage.setItem(REVIEW_KEY, JSON.stringify(state)); } catch (_) {}
}
function getPageReviewKey(page) {
  return page?.id || page?.name || 'page';
}
function updateReviewBadge(pageState) {
  const badge = document.getElementById('reviewStatusBadge');
  if (!badge) return;
  const values = ['lines','bars','digits','strokes'].map(k => pageState?.[k] || '');
  const okCount = values.filter(v => v === 'ok').length;
  const holdCount = values.filter(v => v === 'hold').length;
  badge.classList.remove('is-partial', 'is-complete');
  if (okCount === 4) {
    badge.textContent = '確認済み';
    badge.classList.add('is-complete');
  } else if (okCount > 0 || holdCount > 0) {
    badge.textContent = '途中';
    badge.classList.add('is-partial');
  } else {
    badge.textContent = '未確認';
  }
}
function bindReviewUi(page) {
  const reviewState = readReviewState();
  const pageKey = getPageReviewKey(page);
  const pageState = reviewState[pageKey] || {};
  document.querySelectorAll('.teacher-review-item').forEach(item => {
    const key = item.dataset.reviewKey;
    const buttons = item.querySelectorAll('.teacher-mini-btn');
    buttons.forEach(btn => {
      const value = btn.dataset.reviewValue;
      btn.classList.remove('is-selected-ok', 'is-selected-hold');
      if (pageState[key] === value) {
        btn.classList.add(value === 'ok' ? 'is-selected-ok' : 'is-selected-hold');
      }
      btn.onclick = () => {
        const nextState = readReviewState();
        const entry = nextState[pageKey] || {};
        entry[key] = value;
        nextState[pageKey] = entry;
        writeReviewState(nextState);
        bindReviewUi(page);
      };
    });
  });
  updateReviewBadge(pageState);
}
