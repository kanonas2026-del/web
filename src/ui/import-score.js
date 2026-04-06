const fileInput = document.getElementById('fileInput');
const addMoreBtn = document.getElementById('addMoreBtn');
const autoEnhanceBtn = document.getElementById('autoEnhanceBtn');
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
let pages = [];
let activeId = null;
let processingToken = 0;
let inputTimer = null;

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function defaultSettings() {
  return { rotate: 0, brightness: 1.00, contrast: 1.10, shadow: 0.22, threshold: 0.06 };
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
function savePages() {
  try {
    const safePages = pages.map(({ id, name, previewUrl, processedUrl, settings, width, height }) => ({
      id, name, previewUrl, processedUrl, settings, width, height
    }));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safePages));
  } catch (_) {}
}
function loadPages() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    pages = parsed;
    activeId = pages[0]?.id || null;
  } catch (_) {}
}
function getActivePage() {
  return pages.find(page => page.id === activeId) || null;
}
function setActive(id) {
  activeId = id;
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
      const bg = estimateBackground(work, 28);
      const bgData = bg.data;

      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const bgGray = bgData[i] || 245;

        let normalized = gray;
        normalized = normalized * (1 + settings.shadow * 0.35) - bgGray * (settings.shadow * 0.18) + 10;

        const contrasted = ((normalized - 128) * settings.contrast) + 128;
        const brightened = contrasted * settings.brightness;
        const clipped = Math.max(8, Math.min(245, brightened));

        const gentleBoost = clipped > (245 - settings.threshold * 120)
          ? Math.min(245, clipped + settings.threshold * 18)
          : clipped;

        data[i] = gentleBoost;
        data[i + 1] = gentleBoost;
        data[i + 2] = gentleBoost;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(work.toDataURL('image/jpeg', 0.95));
    };
    img.src = dataUrl;
  });
}
async function processActive(autoMode = false) {
  const page = getActivePage();
  if (!page) return;
  const token = ++processingToken;
  const settings = autoMode
    ? { rotate: Number(rotateRange.value), brightness: 1.00, contrast: 1.12, shadow: 0.22, threshold: 0.06 }
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
fileInput?.addEventListener('change', async event => {
  await readFiles(event.target.files);
  fileInput.value = '';
});
addMoreBtn?.addEventListener('click', () => fileInput?.click());
autoEnhanceBtn?.addEventListener('click', () => processActive(true));
resetViewBtn?.addEventListener('click', () => resetActive());
backTopBtn?.addEventListener('click', () => { window.location.href = './index.html'; });
[rotateRange, brightnessRange, contrastRange, shadowRange, thresholdRange].forEach(input => {
  input?.addEventListener('input', () => {
    updateLabels();
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => processActive(false), 120);
  });
});
loadPages();
updateLabels();
renderThumbs();
renderPreview();
