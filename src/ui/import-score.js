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

const DRAFT_STORAGE_KEY = 'ukulele_import_score_draft_v1';
const DRAFT_VERSION = 1;
let pages = [];
let activeId = null;
let processingToken = 0;
let inputTimer = null;
let draftMeta = emptyDraft();
let analysisDom = null;

function uid(){ return `${Date.now()}_${Math.random().toString(16).slice(2)}`; }
function defaultSettings(){ return { rotate:0, brightness:1, contrast:1.25, shadow:0.55, threshold:0.18 }; }
function emptyDraft(){ return { version:DRAFT_VERSION, draftId:uid(), ownerMode:'personal', updatedAt:Date.now(), activePageId:null, pages:[] }; }

const ImportDraftStore = {
  load(){
    try{
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if(!raw) return emptyDraft();
      return normalizeDraft(JSON.parse(raw));
    }catch(_){ return emptyDraft(); }
  },
  save(draft){
    try{
      const normalized = normalizeDraft(draft);
      normalized.updatedAt = Date.now();
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(normalized));
    }catch(_){}
  }
};

function clampNumber(value,min,max,fallback){
  const n = Number(value);
  if(!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function normalizeSettings(settings){
  const base = defaultSettings();
  if(!settings || typeof settings !== 'object') return base;
  return {
    rotate: clampNumber(settings.rotate, -8, 8, base.rotate),
    brightness: clampNumber(settings.brightness, 0.7, 1.5, base.brightness),
    contrast: clampNumber(settings.contrast, 0.8, 2.4, base.contrast),
    shadow: clampNumber(settings.shadow, 0, 1, base.shadow),
    threshold: clampNumber(settings.threshold, 0, 1, base.threshold),
  };
}
function normalizePage(page){
  if(!page || typeof page !== 'object') return null;
  if(typeof page.previewUrl !== 'string' || !page.previewUrl) return null;
  return {
    id: typeof page.id === 'string' && page.id ? page.id : uid(),
    pageId: typeof page.pageId === 'string' && page.pageId ? page.pageId : uid(),
    order: Number.isFinite(page.order) ? page.order : 0,
    name: typeof page.name === 'string' && page.name ? page.name : 'image',
    previewUrl: page.previewUrl,
    processedUrl: typeof page.processedUrl === 'string' && page.processedUrl ? page.processedUrl : page.previewUrl,
    width: Number.isFinite(page.width) ? page.width : 0,
    height: Number.isFinite(page.height) ? page.height : 0,
    settings: normalizeSettings(page.settings),
  };
}
function normalizeDraft(input){
  const draft = input && typeof input === 'object' ? input : {};
  const safePages = Array.isArray(draft.pages) ? draft.pages.map(normalizePage).filter(Boolean) : [];
  const safeActiveId = safePages.some(p => p.id === draft.activePageId) ? draft.activePageId : (safePages[0]?.id || null);
  return {
    version: Number.isFinite(draft.version) ? draft.version : DRAFT_VERSION,
    draftId: typeof draft.draftId === 'string' && draft.draftId ? draft.draftId : uid(),
    ownerMode: draft.ownerMode === 'classroom' ? 'classroom' : 'personal',
    updatedAt: Number.isFinite(draft.updatedAt) ? draft.updatedAt : Date.now(),
    activePageId: safeActiveId,
    pages: safePages,
  };
}
function currentDraftId(){ return draftMeta?.draftId || uid(); }
function buildDraftFromState(){
  return normalizeDraft({
    version: DRAFT_VERSION,
    draftId: currentDraftId(),
    ownerMode: 'personal',
    activePageId: activeId,
    pages: pages.map((page, index) => ({
      id: page.id,
      pageId: page.pageId || page.id,
      order: index,
      name: page.name,
      previewUrl: page.previewUrl,
      processedUrl: page.processedUrl,
      width: page.width,
      height: page.height,
      settings: normalizeSettings(page.settings),
    })),
  });
}
function persistState(){ const draft = buildDraftFromState(); draftMeta = draft; ImportDraftStore.save(draft); }
function restoreState(){ const draft = ImportDraftStore.load(); draftMeta = draft; pages = draft.pages.map(normalizePage).filter(Boolean); activeId = draft.activePageId; }

function updateLabels(){
  rotateValue.textContent = `${Number(rotateRange.value).toFixed(1)}°`;
  brightnessValue.textContent = Number(brightnessRange.value).toFixed(2);
  contrastValue.textContent = Number(contrastRange.value).toFixed(2);
  shadowValue.textContent = Number(shadowRange.value).toFixed(2);
  thresholdValue.textContent = Number(thresholdRange.value).toFixed(2);
}
function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function getActivePage(){ return pages.find(page => page.id === activeId) || null; }
function setActive(id){ activeId = id; persistState(); renderThumbs(); renderPreview(); }
function clearCanvas(canvas){ const ctx = canvas.getContext('2d'); canvas.width = 1; canvas.height = 1; ctx.clearRect(0,0,1,1); }
function drawImageOnCanvas(url, canvas, callback){
  if(!url){ clearCanvas(canvas); if(callback) callback(null); return; }
  const img = new Image();
  img.onload = () => {
    const maxW = 900;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    if(callback) callback({ width: canvas.width, height: canvas.height });
  };
  img.src = url;
}
function applySettingsToControls(settings){
  rotateRange.value = settings.rotate;
  brightnessRange.value = settings.brightness;
  contrastRange.value = settings.contrast;
  shadowRange.value = settings.shadow;
  thresholdRange.value = settings.threshold;
  updateLabels();
}
function currentSettings(){
  return normalizeSettings({
    rotate: rotateRange.value, brightness: brightnessRange.value, contrast: contrastRange.value, shadow: shadowRange.value, threshold: thresholdRange.value
  });
}

function renderThumbs(){
  pageCount.textContent = `${pages.length}枚`;
  if(!pages.length){
    thumbList.className = 'thumb-list empty-state';
    thumbList.textContent = 'まだ画像がありません';
    return;
  }
  thumbList.className = 'thumb-list';
  thumbList.innerHTML = pages.map((page,index)=>`
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
      if(action === 'open') setActive(id);
      if(action === 'up') movePage(id, -1);
      if(action === 'down') movePage(id, 1);
      if(action === 'remove') removePage(id);
    });
  });
  thumbList.querySelectorAll('.thumb-item').forEach(item => item.addEventListener('click', () => setActive(item.dataset.id)));
}

function ensureAnalysisUi(){
  if(analysisDom) return analysisDom;
  const mainStack = document.querySelector('.main-stack');
  const section = document.createElement('section');
  section.className = 'card';
  section.innerHTML = `
    <div class="panel-head">
      <h2>TAB解析候補</h2>
      <span id="analysisBadge" class="pill subtle">未実行</span>
    </div>
    <p id="analysisSummary" class="helper">補正後画像から、TAB4本線・小節線・数字候補をブラウザ内だけで抽出します。</p>
    <div style="border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);padding:8px;display:grid;place-items:center;min-height:220px;overflow:auto">
      <canvas id="analysisCanvas"></canvas>
    </div>
    <div id="analysisDetails" class="helper small" style="white-space:pre-line"></div>
  `;
  mainStack.appendChild(section);
  analysisDom = {
    badge: section.querySelector('#analysisBadge'),
    summary: section.querySelector('#analysisSummary'),
    details: section.querySelector('#analysisDetails'),
    canvas: section.querySelector('#analysisCanvas')
  };
  return analysisDom;
}

function renderPreview(){
  const page = getActivePage();
  const ui = ensureAnalysisUi();
  if(!page){
    previewTitle.textContent = 'プレビュー';
    activeMeta.textContent = '未選択';
    clearCanvas(sourceCanvas);
    clearCanvas(processedCanvas);
    clearCanvas(ui.canvas);
    ui.badge.textContent = '未選択';
    ui.summary.textContent = '画像を選ぶとTAB解析候補が表示されます。';
    ui.details.textContent = '';
    return;
  }
  previewTitle.textContent = page.name;
  activeMeta.textContent = `${page.width || '-'} × ${page.height || '-'}`;
  drawImageOnCanvas(page.previewUrl, sourceCanvas);
  drawImageOnCanvas(page.processedUrl || page.previewUrl, processedCanvas, () => runAnalysisOnProcessedCanvas());
  applySettingsToControls(page.settings || defaultSettings());
}

function movePage(id, delta){
  const index = pages.findIndex(page => page.id === id);
  if(index < 0) return;
  const target = index + delta;
  if(target < 0 || target >= pages.length) return;
  const [page] = pages.splice(index, 1);
  pages.splice(target, 0, page);
  persistState();
  renderThumbs();
}
function removePage(id){
  pages = pages.filter(page => page.id !== id);
  if(activeId === id) activeId = pages[0]?.id || null;
  persistState();
  renderThumbs();
  renderPreview();
}
function measureImage(url){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = url;
  });
}
function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function readFiles(fileList){
  const files = Array.from(fileList || []).filter(file => file.type.startsWith('image/'));
  for(const file of files){
    const previewUrl = await fileToDataUrl(file);
    const size = await measureImage(previewUrl);
    const page = normalizePage({
      id: uid(), pageId: uid(), name: file.name, order: pages.length, previewUrl, processedUrl: previewUrl, width: size.width, height: size.height, settings: defaultSettings()
    });
    pages.push(page);
    activeId = page.id;
  }
  persistState();
  renderThumbs();
  renderPreview();
}

function estimateBackground(canvas, smallWidth = 28){
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
function enhanceImage(dataUrl, settings){
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
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0,0,targetW,targetH);
      ctx.translate(targetW/2, targetH/2);
      ctx.rotate(radians);
      ctx.drawImage(img, -img.width/2, -img.height/2);
      ctx.setTransform(1,0,0,1,0,0);
      const imageData = ctx.getImageData(0,0,targetW,targetH);
      const data = imageData.data;
      const bg = estimateBackground(work, 28);
      const bgData = bg.data;
      for(let i=0;i<data.length;i+=4){
        const gray = 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2];
        const bgGray = bgData[i] || 255;
        const normalized = gray * (1 + settings.shadow) - bgGray * settings.shadow + 128 * settings.shadow;
        const contrasted = ((normalized - 128) * settings.contrast) + 128;
        const brightened = contrasted * settings.brightness;
        const clipped = Math.max(0, Math.min(255, brightened));
        const whitened = clipped > (255 * (1 - settings.threshold)) ? 255 : clipped;
        data[i] = whitened; data[i+1] = whitened; data[i+2] = whitened;
      }
      ctx.putImageData(imageData,0,0);
      resolve(work.toDataURL('image/jpeg', 0.92));
    };
    img.src = dataUrl;
  });
}

function clusterPositions(values, tolerance){
  const clusters = [];
  values.sort((a,b)=>a-b);
  for(const value of values){
    const last = clusters[clusters.length - 1];
    if(!last || Math.abs(last.center - value) > tolerance){
      clusters.push({ values:[value], center:value });
    }else{
      last.values.push(value);
      last.center = last.values.reduce((s,v)=>s+v,0) / last.values.length;
    }
  }
  return clusters.map(cluster => Math.round(cluster.center));
}
function detectHorizontalLines(gray, width, height){
  const strongRows = [];
  for(let y=0;y<height;y+=1){
    let darkCount = 0;
    for(let x=0;x<width;x+=1){
      if(gray[y*width + x] < 90) darkCount += 1;
    }
    if(darkCount / width > 0.42) strongRows.push(y);
  }
  return clusterPositions(strongRows, 3);
}
function groupTabLines(lines){
  const groups = [];
  for(let i=0;i<=lines.length-4;i+=1){
    const a=lines[i], b=lines[i+1], c=lines[i+2], d=lines[i+3];
    const d1=b-a, d2=c-b, d3=d-c;
    const avg=(d1+d2+d3)/3;
    const maxDiff=Math.max(Math.abs(d1-avg),Math.abs(d2-avg),Math.abs(d3-avg));
    if(avg >= 10 && avg <= 80 && maxDiff <= avg * 0.35) groups.push({ lines:[a,b,c,d], spacing:avg });
  }
  return dedupeGroups(groups);
}
function dedupeGroups(groups){
  const result = [];
  for(const group of groups){
    const top = group.lines[0];
    const exists = result.some(item => Math.abs(item.lines[0] - top) < 10);
    if(!exists) result.push(group);
  }
  return result;
}
function detectVerticalBars(gray, width, height, group){
  if(!group) return [];
  const top = Math.max(0, group.lines[0] - Math.round(group.spacing * 0.7));
  const bottom = Math.min(height - 1, group.lines[3] + Math.round(group.spacing * 0.7));
  const strongCols = [];
  for(let x=0;x<width;x+=1){
    let darkCount = 0;
    for(let y=top;y<=bottom;y+=1){
      if(gray[y*width + x] < 90) darkCount += 1;
    }
    if(darkCount / Math.max(1, bottom - top + 1) > 0.55) strongCols.push(x);
  }
  return clusterPositions(strongCols, 3);
}
function nearestIndex(values, value){
  let best=0, bestDist=Infinity;
  for(let i=0;i<values.length;i+=1){
    const dist = Math.abs(values[i] - value);
    if(dist < bestDist){ bestDist = dist; best = i; }
  }
  return best;
}
function overlapRatio(a,b){
  const x1=Math.max(a.x,b.x), y1=Math.max(a.y,b.y);
  const x2=Math.min(a.x+a.w,b.x+b.w), y2=Math.min(a.y+a.h,b.y+b.h);
  if(x2<=x1 || y2<=y1) return 0;
  const inter=(x2-x1)*(y2-y1);
  return inter / Math.min(a.w*a.h, b.w*b.h);
}
function mergeNearbyCandidates(candidates, tolerance){
  const sorted = [...candidates].sort((a,b)=>a.cx-b.cx);
  const merged = [];
  for(const c of sorted){
    const last = merged[merged.length - 1];
    if(last && last.lineIndex === c.lineIndex && Math.abs(last.cx - c.cx) < tolerance && overlapRatio(last,c) > 0.2){
      const minX=Math.min(last.x,c.x), minY=Math.min(last.y,c.y);
      const maxX=Math.max(last.x+last.w,c.x+c.w), maxY=Math.max(last.y+last.h,c.y+c.h);
      last.x=minX; last.y=minY; last.w=maxX-minX; last.h=maxY-minY;
      last.cx=minX + last.w/2; last.cy=minY + last.h/2; last.area += c.area;
    }else{
      merged.push({ ...c });
    }
  }
  return merged;
}
function detectDigitCandidates(gray, width, height, group){
  if(!group) return [];
  const top = Math.max(0, group.lines[0] - Math.round(group.spacing * 1.2));
  const bottom = Math.min(height - 1, group.lines[3] + Math.round(group.spacing * 1.2));
  const visited = new Uint8Array(width*height);
  const candidates = [];
  const minArea = Math.max(25, Math.round(group.spacing * group.spacing * 0.12));
  const maxArea = Math.round(group.spacing * group.spacing * 2.6);
  for(let y=top;y<=bottom;y+=1){
    for(let x=0;x<width;x+=1){
      const idx = y*width + x;
      if(visited[idx] || gray[idx] >= 100) continue;
      const queue=[idx];
      visited[idx]=1;
      let minX=x,maxX=x,minY=y,maxY=y,area=0;
      while(queue.length){
        const current=queue.pop();
        const cx=current % width;
        const cy=Math.floor(current / width);
        area += 1;
        if(cx<minX) minX=cx;
        if(cx>maxX) maxX=cx;
        if(cy<minY) minY=cy;
        if(cy>maxY) maxY=cy;
        const neighbors=[current-1,current+1,current-width,current+width];
        for(const n of neighbors){
          if(n<0 || n>=gray.length || visited[n]) continue;
          const ny=Math.floor(n / width);
          if(ny<top || ny>bottom) continue;
          if(gray[n] >= 100) continue;
          visited[n]=1;
          queue.push(n);
        }
      }
      const w=maxX-minX+1, h=maxY-minY+1;
      if(area<minArea || area>maxArea) continue;
      if(w<4 || h<6) continue;
      if(w>group.spacing*1.9 || h>group.spacing*2.4) continue;
      const centerY=(minY+maxY)/2;
      const lineIndex=nearestIndex(group.lines, centerY);
      const lineDistance=Math.abs(group.lines[lineIndex] - centerY);
      if(lineDistance > group.spacing * 0.8) continue;
      candidates.push({ x:minX, y:minY, w, h, area, lineIndex, cx:(minX+maxX)/2, cy:centerY });
    }
  }
  return mergeNearbyCandidates(candidates, group.spacing * 0.7);
}

function renderAnalysisOverlay(canvas, analysis){
  const ui = ensureAnalysisUi();
  const out = ui.canvas;
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext('2d');
  ctx.clearRect(0,0,out.width,out.height);
  ctx.drawImage(canvas,0,0);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,255,180,0.9)';
  for(const y of analysis.allHorizontalLines){
    ctx.beginPath(); ctx.moveTo(0, y+0.5); ctx.lineTo(out.width, y+0.5); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,210,80,0.95)';
  for(const group of analysis.tabGroups){
    for(const y of group.lines){
      ctx.beginPath(); ctx.moveTo(0, y+0.5); ctx.lineTo(out.width, y+0.5); ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(80,160,255,0.9)';
  for(const x of analysis.barLines){
    ctx.beginPath(); ctx.moveTo(x+0.5,0); ctx.lineTo(x+0.5,out.height); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,80,140,0.95)';
  for(const box of analysis.digitCandidates){
    ctx.strokeRect(box.x, box.y, box.w, box.h);
  }
}
function summarizeMusicHints(analysis){
  if(!analysis.bestGroup) return 'TAB4本線のまとまり候補がまだ弱いです。補正を強めるか、回転を少し調整してください。';
  const bars = Math.max(0, analysis.barLines.length - 1);
  const digitsPerLine = [0,0,0,0];
  analysis.digitCandidates.forEach(item => { digitsPerLine[item.lineIndex] += 1; });
  const balance = digitsPerLine.filter(v => v > 0).length;
  const naturalHint = balance >= 3
    ? '複数弦に数字候補があり、和音・フォーム判定へ進みやすい状態です。'
    : '数字候補が一部の弦に偏っています。影軽減か白黒強調を少し上げると改善しやすいです。';
  return `TAB候補 ${analysis.tabGroups.length}組 / 小節線候補 ${bars}区間 / 数字候補 ${analysis.digitCandidates.length}個。${naturalHint}`;
}
function runAnalysisOnProcessedCanvas(){
  const ui = ensureAnalysisUi();
  if(!processedCanvas.width || !processedCanvas.height){
    clearCanvas(ui.canvas);
    ui.badge.textContent = '未実行';
    ui.summary.textContent = '補正後画像があると解析候補を表示します。';
    ui.details.textContent = '';
    return;
  }
  const ctx = processedCanvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = processedCanvas;
  const image = ctx.getImageData(0,0,width,height);
  const gray = new Uint8ClampedArray(width*height);
  for(let i=0,j=0;i<image.data.length;i+=4,j+=1){
    gray[j] = Math.round(0.299*image.data[i] + 0.587*image.data[i+1] + 0.114*image.data[i+2]);
  }
  const allHorizontalLines = detectHorizontalLines(gray, width, height);
  const tabGroups = groupTabLines(allHorizontalLines);
  const bestGroup = [...tabGroups].sort((a,b)=>b.spacing-a.spacing)[0] || null;
  const barLines = detectVerticalBars(gray, width, height, bestGroup);
  const digitCandidates = detectDigitCandidates(gray, width, height, bestGroup);
  const analysis = { allHorizontalLines, tabGroups, bestGroup, barLines, digitCandidates };
  renderAnalysisOverlay(processedCanvas, analysis);
  ui.badge.textContent = bestGroup ? '候補あり' : '候補弱め';
  ui.summary.textContent = summarizeMusicHints(analysis);
  const detailLines = [];
  if(bestGroup){
    detailLines.push(`TAB4本線: ${bestGroup.lines.join(', ')} / 間隔 ${bestGroup.spacing.toFixed(1)}px`);
  }else{
    detailLines.push('TAB4本線: まだ確定できず');
  }
  detailLines.push(`水平線候補: ${allHorizontalLines.length}本`);
  detailLines.push(`小節線候補: ${barLines.length}本`);
  const groupedDigits=[0,0,0,0];
  digitCandidates.forEach(item=>{ groupedDigits[item.lineIndex] += 1; });
  detailLines.push(`数字候補: ${digitCandidates.length}個`);
  detailLines.push(`弦別候補: A=${groupedDigits[0]} / E=${groupedDigits[1]} / C=${groupedDigits[2]} / G=${groupedDigits[3]}`);
  detailLines.push('方針: 画像候補 + 音楽的整合で次段階へ進む');
  ui.details.textContent = detailLines.join('
');
}

async function processActive(autoMode = false){
  const page = getActivePage();
  if(!page) return;
  const token = ++processingToken;
  const settings = autoMode
    ? normalizeSettings({ rotate: rotateRange.value, brightness: 1.08, contrast: 1.55, shadow: 0.72, threshold: 0.24 })
    : currentSettings();
  if(autoMode) applySettingsToControls(settings);
  page.settings = settings;
  const processed = await enhanceImage(page.previewUrl, settings);
  if(token !== processingToken) return;
  page.processedUrl = processed;
  persistState();
  renderThumbs();
  renderPreview();
}
function resetActive(){
  const page = getActivePage();
  if(!page) return;
  processingToken += 1;
  page.settings = defaultSettings();
  page.processedUrl = page.previewUrl;
  persistState();
  renderThumbs();
  renderPreview();
}

fileInput?.addEventListener('change', async event => {
  await readFiles(event.target.files);
  fileInput.value = '';
});
addMoreBtn?.addEventListener('click', () => fileInput?.click());
autoEnhanceBtn?.addEventListener('click', () => processActive(true));
resetViewBtn?.addEventListener('click', resetActive);
backTopBtn?.addEventListener('click', () => { persistState(); window.location.href = './index.html'; });
[rotateRange, brightnessRange, contrastRange, shadowRange, thresholdRange].forEach(input => {
  input?.addEventListener('input', () => {
    updateLabels();
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => processActive(false), 120);
  });
});

restoreState();
ensureAnalysisUi();
updateLabels();
renderThumbs();
renderPreview();
