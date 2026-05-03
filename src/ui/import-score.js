const fileInput = document.getElementById('fileInput');
const addMoreBtn = document.getElementById('addMoreBtn');
const autoEnhanceBtn = document.getElementById('autoEnhanceBtn');
const shapeCorrectBtn = document.getElementById('shapeCorrectBtn');
const resetViewBtn = document.getElementById('resetViewBtn');
const backTopBtn = document.getElementById('backTopBtn');
const thumbList = document.getElementById('thumbList');
const pageCount = document.getElementById('pageCount');
const previewTitle = document.getElementById('previewTitle');
const activeMeta = document.getElementById('activeMeta');
const sourceCanvas = document.getElementById('sourceCanvas');
const processedCanvas = document.getElementById('processedCanvas');
const rotateRange = document.getElementById('rotateRange');
const brightnessRange = document.getElementById('brightnessRange');
const contrastRange = document.getElementById('contrastRange');
const shadowRange = document.getElementById('shadowRange');
const thresholdRange = document.getElementById('thresholdRange');
const rotateValue = document.getElementById('rotateValue');
const brightnessValue = document.getElementById('brightnessValue');
const contrastValue = document.getElementById('contrastValue');
const shadowValue = document.getElementById('shadowValue');
const thresholdValue = document.getElementById('thresholdValue');

const STORAGE_KEY = 'ukulele_import_score_pages_v2';
const DB_NAME = 'ukulele_import_score_db';
const DB_STORE = 'state';
const DB_KEY = 'pages';
let pages = [];
let activeId = null;
let processingToken = 0;
let inputTimer = null;

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function defaultSettings() {
  return { rotate: 0, brightness: 1.00, contrast: 1.04, shadow: 0.08, threshold: 0.00 };
}
function updateLabels() {
  rotateValue.textContent = `${Number(rotateRange.value).toFixed(1)}°`;
  brightnessValue.textContent = Number(brightnessRange.value).toFixed(2);
  contrastValue.textContent = Number(contrastRange.value).toFixed(2);
  shadowValue.textContent = Number(shadowRange.value).toFixed(2);
  thresholdValue.textContent = Number(thresholdRange.value).toFixed(2);
}
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function getSafePages() {
  return pages.map(({ id, name, previewUrl, processedUrl, settings, width, height }) => ({
    id, name, previewUrl, processedUrl, settings, width, height
  }));
}
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbWriteState(payload) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(payload, DB_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
async function dbReadState() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(DB_KEY);
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
async function savePages() {
  const payload = { pages: getSafePages(), activeId, savedAt: Date.now() };
  try { await dbWriteState(payload); } catch (_) {}
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (_) {}
}
async function loadPages() {
  let payload = null;
  try { payload = await dbReadState(); } catch (_) {}
  if (!payload) {
    try { payload = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) {}
  }
  if (!payload) return;
  const parsedPages = Array.isArray(payload) ? payload : payload.pages;
  const parsedActiveId = Array.isArray(payload) ? null : payload.activeId;
  if (!Array.isArray(parsedPages)) return;
  pages = parsedPages;
  activeId = parsedActiveId || pages[0]?.id || null;
}
function getActivePage() {
  return pages.find(page => page.id === activeId) || null;
}
function setActive(id) {
  activeId = id;
  savePages();
  renderThumbs();
  renderPreview();
}
function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = 1;
  canvas.height = 1;
  ctx.clearRect(0, 0, 1, 1);
}
function drawImageOnCanvas(url, canvas) {
  if (!url) {
    clearCanvas(canvas);
    return;
  }
  const img = new Image();
  img.onload = () => {
    const maxW = 900;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = url;
}
function applySettingsToControls(settings) {
  rotateRange.value = settings.rotate;
  brightnessRange.value = settings.brightness;
  contrastRange.value = settings.contrast;
  shadowRange.value = settings.shadow;
  thresholdRange.value = settings.threshold;
  updateLabels();
}
function currentSettings() {
  return {
    rotate: Number(rotateRange.value),
    brightness: Number(brightnessRange.value),
    contrast: Number(contrastRange.value),
    shadow: Number(shadowRange.value),
    threshold: Number(thresholdRange.value),
  };
}
function renderThumbs() {
  pageCount.textContent = `${pages.length}枚`;
  if (!pages.length) {
    thumbList.className = 'thumb-list empty-state';
    thumbList.textContent = 'まだ画像がありません';
    return;
  }
  thumbList.className = 'thumb-list';
  thumbList.innerHTML = pages.map((page, index) => `
    <div class="thumb-item ${page.id === activeId ? 'active' : ''}" data-id="${page.id}">
      <img src="${page.processedUrl || page.previewUrl}" alt="page-${index + 1}">
      <div class="thumb-meta">
        <div class="thumb-title">${index + 1}ページ目</div>
        <div class="thumb-sub">${escapeHtml(page.name)}</div>
        <div class="thumb-actions">
          <button type="button" class="thumb-btn" data-action="open" data-id="${page.id}">表示</button>
          <button type="button" class="thumb-btn" data-action="up" data-id="${page.id}">↑</button>
          <button type="button" class="thumb-btn" data-action="down" data-id="${page.id}">↓</button>
          <button type="button" class="thumb-btn" data-action="remove" data-id="${page.id}">削除</button>
        </div>
      </div>
    </div>
  `).join('');
  thumbList.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', event => {
      event.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'open') setActive(id);
      if (action === 'up') movePage(id, -1);
      if (action === 'down') movePage(id, 1);
      if (action === 'remove') removePage(id);
    });
  });
  thumbList.querySelectorAll('.thumb-item').forEach(item => {
    item.addEventListener('click', () => setActive(item.dataset.id));
  });
}
function renderPreview() {
  const page = getActivePage();
  if (!page) {
    previewTitle.textContent = 'プレビュー';
    activeMeta.textContent = '未選択';
    clearCanvas(sourceCanvas);
    clearCanvas(processedCanvas);
    return;
  }
  previewTitle.textContent = page.name;
  activeMeta.textContent = `${page.width || '-'} × ${page.height || '-'}`;
  drawImageOnCanvas(page.previewUrl, sourceCanvas);
  drawImageOnCanvas(page.processedUrl || page.previewUrl, processedCanvas);
  applySettingsToControls(page.settings || defaultSettings());
}
function movePage(id, delta) {
  const index = pages.findIndex(page => page.id === id);
  if (index < 0) return;
  const target = index + delta;
  if (target < 0 || target >= pages.length) return;
  const [page] = pages.splice(index, 1);
  pages.splice(target, 0, page);
  savePages();
  renderThumbs();
}
function removePage(id) {
  pages = pages.filter(page => page.id !== id);
  if (activeId === id) activeId = pages[0]?.id || null;
  savePages();
  renderThumbs();
  renderPreview();
}
function measureImage(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = url;
  });
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function readFiles(fileList) {
  const files = Array.from(fileList || []).filter(file => file.type.startsWith('image/'));
  for (const file of files) {
    const previewUrl = await fileToDataUrl(file);
    const size = await measureImage(previewUrl);
    const page = {
      id: uid(),
      name: file.name,
      previewUrl,
      processedUrl: previewUrl,
      settings: defaultSettings(),
      width: size.width,
      height: size.height,
    };
    pages.push(page);
    activeId = page.id;
  }
  savePages();
  renderThumbs();
  renderPreview();
}
function estimateBackground(canvas, smallWidth = 28) {
  const ratio = canvas.height / canvas.width;
  const smallHeight = Math.max(1, Math.round(smallWidth * ratio));
  const small = document.createElement('canvas');
  small.width = smallWidth;
  small.height = smallHeight;
  const sctx = small.getContext('2d');
  sctx.filter = 'blur(6px)';
  sctx.drawImage(canvas, 0, 0, smallWidth, smallHeight);
  const expanded = document.createElement('canvas');
  expanded.width = canvas.width;
  expanded.height = canvas.height;
  const ectx = expanded.getContext('2d');
  ectx.imageSmoothingEnabled = true;
  ectx.filter = 'blur(12px)';
  ectx.drawImage(small, 0, 0, canvas.width, canvas.height);
  return ectx.getImageData(0, 0, expanded.width, expanded.height);
}
function enhanceImage(dataUrl, settings) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const radians = settings.rotate * Math.PI / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      const targetW = Math.round(img.width * cos + img.height * sin);
      const targetH = Math.round(img.width * sin + img.height * cos);
      const work = document.createElement('canvas');
      work.width = targetW;
      work.height = targetH;
      const ctx = work.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fdfdfd';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const imageData = ctx.getImageData(0, 0, targetW, targetH);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        const contrast = Math.max(0.90, Math.min(1.18, settings.contrast));
        const brightness = Math.max(0.92, Math.min(1.08, settings.brightness));
        const shadow = Math.max(0, Math.min(0.16, settings.shadow));

        let value = ((gray - 128) * contrast) + 128;
        value = value * brightness;

        // Only lift very dark uneven paper shadow slightly. Do not push paper to pure white.
        if (gray > 120 && gray < 230) {
          value += shadow * 18;
        }

        // Preserve notes, handwriting, TAB numbers, and staff lines. Avoid hard thresholding.
        const clipped = Math.max(18, Math.min(238, value));

        data[i] = clipped;
        data[i + 1] = clipped;
        data[i + 2] = clipped;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(work.toDataURL('image/jpeg', 0.96));
    };
    img.src = dataUrl;
  });
}
async function processActive(autoMode = false) {
  const page = getActivePage();
  if (!page) return;
  const token = ++processingToken;
  const settings = autoMode
    ? { rotate: Number(rotateRange.value), brightness: 1.00, contrast: 1.05, shadow: 0.08, threshold: 0.00 }
    : currentSettings();
  if (autoMode) applySettingsToControls(settings);
  page.settings = settings;
  const processed = await enhanceImage(page.previewUrl, settings);
  if (token !== processingToken) return;
  page.processedUrl = processed;
  savePages();
  renderThumbs();
  renderPreview();
}
function resetActive() {
  const page = getActivePage();
  if (!page) return;
  processingToken++;
  page.settings = defaultSettings();
  page.processedUrl = page.previewUrl;
  savePages();
  renderThumbs();
  renderPreview();
}

function autoCropCanvasByContent(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;
  const w = canvas.width;
  const h = canvas.height;
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y += 3) {
    for (let x = 0; x < w; x += 3) {
      const i = (y * w + x) * 4;
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (gray < 238) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX >= maxX || minY >= maxY) return canvas;
  const padX = Math.round(w * 0.025);
  const padY = Math.round(h * 0.025);
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(w, maxX + padX);
  maxY = Math.min(h, maxY + padY);
  const out = document.createElement('canvas');
  out.width = Math.max(1, maxX - minX);
  out.height = Math.max(1, maxY - minY);
  const octx = out.getContext('2d');
  octx.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
function gentleShapeCanvas(dataUrl, settings) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const radians = (settings.rotate || 0) * Math.PI / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      const targetW = Math.round(img.width * cos + img.height * sin);
      const targetH = Math.round(img.width * sin + img.height * cos);
      const base = document.createElement('canvas');
      base.width = targetW;
      base.height = targetH;
      const ctx = base.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fdfdfd';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const cropped = autoCropCanvasByContent(base);
      const cctx = cropped.getContext('2d', { willReadFrequently: true });
      const imageData = cctx.getImageData(0, 0, cropped.width, cropped.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        let v = gray;
        // safe shadow lift: do not crush staff/text
        if (v > 165) v = Math.min(246, v + 10);
        else v = Math.max(18, v * 0.96);
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
      }
      cctx.putImageData(imageData, 0, 0);
      resolve(cropped.toDataURL('image/jpeg', 0.95));
    };
    img.src = dataUrl;
  });
}
async function shapeCorrectActive() {
  const page = getActivePage();
  if (!page) return;
  const token = ++processingToken;
  const settings = currentSettings();
  page.settings = settings;
  const processed = await gentleShapeCanvas(page.previewUrl, settings);
  if (token !== processingToken) return;
  page.processedUrl = processed;
  await savePages();
  renderThumbs();
  renderPreview();
}

fileInput?.addEventListener('change', async event => {
  await readFiles(event.target.files);
  fileInput.value = '';
});
addMoreBtn?.addEventListener('click', () => fileInput?.click());
autoEnhanceBtn?.addEventListener('click', () => processActive(true));
shapeCorrectBtn?.addEventListener('click', () => shapeCorrectActive());
resetViewBtn?.addEventListener('click', () => resetActive());
backTopBtn?.addEventListener('click', () => { window.location.href = './teacher.html'; });
[rotateRange, brightnessRange, contrastRange, shadowRange, thresholdRange].forEach(input => {
  input?.addEventListener('input', () => {
    updateLabels();
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => processActive(false), 120);
  });
});
(async () => {
  await loadPages();
  updateLabels();
  renderThumbs();
  renderPreview();
})();
