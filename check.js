
const events = [
  {bar:7, strum:'↑', frets:[1,3,2,0]},
  {bar:7, strum:'↓', frets:[0,1,2,0]},
  {bar:7, strum:'↑', frets:[2,1,2,2]},
  {bar:7, strum:'↓', frets:[2,0,0,2]},
  {bar:8, strum:'↓', frets:[1,3,2,0]},
  {bar:8, strum:'↑', frets:[1,0,2,0]},
  {bar:8, strum:'↓', frets:[0,0,0,0]},
  {bar:8, strum:'↑', frets:[1,0,1,0]},
  {bar:9, strum:'↓', frets:[2,3,2,0]},
  {bar:9, strum:'↑', frets:[2,0,2,0]},
  {bar:9, strum:'↓', frets:[2,3,2,0]},
  {bar:9, strum:'↑', frets:[2,0,2,0]}
].map(ev => {
  const shapeText = ev.frets.join('');
  const chordNameMap = {
    '1-3-2-0': 'Gm',
    '0-1-2-0': 'Gm',
    '1-0-2-0': 'Gm',
    '2-1-2-2': 'D7',
    '2-0-0-2': 'D7',
    '1-0-1-0': 'Gdim',
    '0-0-0-0': '開放',
    '2-3-2-0': 'G',
    '2-0-2-0': 'G'
  };
  const chord = chordNameMap[ev.frets.join('-')] || '形';
  return {
    ...ev,
    chord,
    shapeKey: ev.frets.join('-'),
    displayName: `${chord} ${shapeText}`
  };
});

const rowY = [128,178,228,278];
const rowLabels = ['1(A)','2(E)','3(C)','4(G)'];
const playheadX = 290;
const columnGap = 92;
const measureGap = 36;
const basePxPerSec = 150;
const speedSteps = [0.4, 0.5, 0.6, 0.75, 0.9, 1.0, 1.15, 1.3];
const prepGlowRatio = 0.82;
const prepFingerRatio = 0.52;
const currentCommitRatio = 0.30;

const content = document.getElementById('content');
const leftGrid = document.getElementById('leftGrid');
const currentName = document.getElementById('currentName');
const nextName = document.getElementById('nextName');
const summary = document.getElementById('summary');
const statusChip = document.getElementById('statusChip');
const speedTag = document.getElementById('speedTag');

const playBtn = document.getElementById('playBtn');
const firstBtn = document.getElementById('firstBtn');
const backBtn = document.getElementById('backBtn');
const replayBtn = document.getElementById('replayBtn');
const nextBtn = document.getElementById('nextBtn');
const slowBtn = document.getElementById('slowBtn');
const fastBtn = document.getElementById('fastBtn');

const positions = (() => {
  let x = 0;
  return events.map((ev, idx) => {
    if (idx === 0) return 0;
    const prev = events[idx - 1];
    x += columnGap;
    if (ev.bar !== prev.bar) x += measureGap;
    return x;
  });
})();

let running = false;
let lastTs = null;
let currentIndex = 0;
let progress = 0;
let speedIndex = speedSteps.indexOf(1.0);

function getSpeed() {
  return speedSteps[speedIndex];
}

function getCurrentDistance() {
  if (currentIndex >= events.length - 1) return columnGap;
  return positions[currentIndex + 1] - positions[currentIndex];
}

function getPrepGlowPx() {
  return getCurrentDistance() * prepGlowRatio;
}

function getPrepFingerPx() {
  return getCurrentDistance() * prepFingerRatio;
}

function pill(x, y, text, active) {
  const glow = active ? ' filter="url(#glow)"' : '';
  const fill = active ? 'rgba(41,240,208,.22)' : 'rgba(7,12,24,.94)';
  const stroke = active ? 'rgba(41,240,208,.34)' : 'rgba(255,255,255,.08)';
  return `<rect x="${x-18}" y="${y-24}" width="36" height="48" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="1"${glow}></rect><text x="${x}" y="${y}" fill="#fff" font-size="28" font-weight="900" dominant-baseline="middle" text-anchor="middle">${text}</text>`;
}

function syncPlayButton() {
  playBtn.textContent = running ? '停止' : '再生';
  playBtn.classList.toggle('running', running);
}
function flashButton(btn) {
  if (!btn) return;
  btn.classList.remove('flash');
  void btn.offsetWidth;
  btn.classList.add('flash');
  window.clearTimeout(btn._flashTimer);
  btn._flashTimer = window.setTimeout(() => btn.classList.remove('flash'), 260);
}

function attachButtonFeedback(btn, handler) {
  if (!btn) return;
  btn.addEventListener('click', () => {
    flashButton(btn);
    handler();
  });
}


function getNextDifferentIndex(fromIndex = currentIndex) {
  const currentShape = events[fromIndex]?.shapeKey;
  for (let i = fromIndex + 1; i < events.length; i += 1) {
    if (events[i].shapeKey !== currentShape) return i;
  }
  return -1;
}

function getDisplayCurrentIndex(anchor) {
  const nextDifferentIndex = getNextDifferentIndex(currentIndex);
  if (nextDifferentIndex < 0) return currentIndex;
  const remain = positions[nextDifferentIndex] - anchor;
  const commitLead = Math.max(1, getCurrentDistance() * currentCommitRatio);
  return remain <= commitLead ? nextDifferentIndex : currentIndex;
}

function getPrepState(nextIndex, anchor) {
  if (nextIndex < 0) return { glowProgress: 0, fingerProgress: 0, fingerVisible: false };
  const remain = positions[nextIndex] - anchor;
  const glowLead = Math.max(1, getPrepGlowPx());
  const fingerLead = Math.max(1, getPrepFingerPx());
  const glowRaw = 1 - (remain / glowLead);
  const fingerRaw = 1 - (remain / fingerLead);
  const glowProgress = Math.max(0, Math.min(1, glowRaw));
  const fingerProgress = Math.max(0, Math.min(1, fingerRaw));
  return {
    glowProgress,
    fingerProgress,
    fingerVisible: false
  };
}

function getWindowStart(currentEvent, prepEvent) {
  const positives = [];
  [currentEvent, prepEvent].forEach(ev => {
    if (!ev) return;
    ev.frets.forEach(f => { if (f > 0) positives.push(f); });
  });
  if (!positives.length) return 1;
  const minFret = Math.min(...positives);
  const maxFret = Math.max(...positives);
  return Math.max(1, Math.min(minFret, maxFret - 3));
}

const fingerGlyphs = ['人', '中', '薬', '小'];

function getFingerLabels(frets) {
  const entries = frets
    .map((fret, rowIdx) => ({ fret, rowIdx }))
    .filter(item => item.fret > 0)
    .sort((a, b) => (a.fret - b.fret) || (a.rowIdx - b.rowIdx));
  const labels = Array(4).fill('');
  entries.forEach((item, idx) => {
    labels[item.rowIdx] = fingerGlyphs[Math.min(idx, fingerGlyphs.length - 1)];
  });
  return labels;
}

function markerForCurrent(fret, fingerLabel) {
  if (fret === 0) return '<span class="open">開</span>';
  return `<span class="marker"><span class="marker-text">${fingerLabel || '人'}</span></span>`;
}

function markerForNext() {
  return '<span class="marker-ghost"></span>';
}

function buildLeftGrid(currentEvent, prepEvent, prepState) {
  const start = getWindowStart(currentEvent, prepEvent);
  const currentLabels = getFingerLabels(currentEvent.frets);
  const header = `
    <div class="header">
      <span></span>
      <div class="headcells">
        <span class="headcell">${start}</span>
        <span class="headcell">${start + 1}</span>
        <span class="headcell">${start + 2}</span>
        <span class="headcell">${start + 3}</span>
      </div>
    </div>`;

  const rows = rowLabels.map((label, rowIdx) => {
    let cells = '';
    for (let col = 0; col < 4; col += 1) {
      const fret = start + col;
      const currentFret = currentEvent.frets[rowIdx];
      const prepFret = prepEvent ? prepEvent.frets[rowIdx] : null;
      const showCurrent = currentFret === fret || (currentFret === 0 && col === 0);
      const prepMatch = prepEvent && (prepFret === fret || (prepFret === 0 && col === 0));
      const classes = ['cell'];
      if (prepMatch && !showCurrent && prepState.glowProgress > 0.06) classes.push('cell-next');
      const style = (prepMatch && !showCurrent) ? ` style="opacity:${(0.24 + prepState.glowProgress * 0.52).toFixed(3)}"` : '';
      let inner = '';
      if (prepMatch && !showCurrent && prepState.glowProgress > 0.06) {
        inner = markerForNext();
      }
      if (showCurrent) {
        inner = markerForCurrent(currentFret, currentLabels[rowIdx]);
      }
      cells += `<span class="${classes.join(' ')}"${style}>${inner}</span>`;
    }
    return `<div class="row"><span class="label">${label}</span><div class="cells">${cells}</div></div>`;
  }).join('');

  leftGrid.innerHTML = header + rows;
}

function buildSummary(currentEvent, prepEvent) {
  if (!prepEvent) return '最後の形です';
  const diffs = [];
  for (let i = 0; i < 4; i += 1) {
    const cur = currentEvent.frets[i];
    const nxt = prepEvent.frets[i];
    if (cur === nxt) continue;
    const prefix = `${i + 1}弦`;
    if (nxt === 0) {
      diffs.push(`${prefix}を開放へ`);
    } else if (cur === 0) {
      diffs.push(`${prefix}を${nxt}Fへ`);
    } else {
      diffs.push(`${prefix} ${cur}→${nxt}`);
    }
  }
  if (!diffs.length) return 'そのまま維持';
  return diffs.slice(0, 2).join(' / ');
}

function renderLeft(anchor) {
  const displayCurrentIndex = getDisplayCurrentIndex(anchor);
  const currentEvent = events[displayCurrentIndex];
  const nextDifferentIndex = getNextDifferentIndex(displayCurrentIndex);
  const prepState = getPrepState(nextDifferentIndex, anchor);
  const prepEvent = prepState.glowProgress > 0.10 ? events[nextDifferentIndex] : null;

  currentName.textContent = currentEvent.displayName;
  nextName.textContent = prepEvent ? `次の形: ${prepEvent.displayName}` : '次の形: なし';
  statusChip.textContent = `${currentEvent.bar}小節 / ${currentEvent.strum} / ${currentEvent.displayName}`;
  summary.textContent = buildSummary(currentEvent, prepEvent);
  buildLeftGrid(currentEvent, prepEvent, prepState);
}

function renderRight(anchor) {
  let html = '';
  let lastBar = null;
  for (let i = 0; i < events.length; i += 1) {
    const ev = events[i];
    const x = playheadX + (positions[i] - anchor);
    if (x < 60 || x > 910) continue;
    if (lastBar !== ev.bar) {
      html += `<line x1="${x-40}" y1="92" x2="${x-40}" y2="292" stroke="rgba(255,255,255,.18)" stroke-width="3"></line>`;
      html += `<text x="${x + columnGap}" y="42" fill="#d6e2f8" font-size="16" font-weight="700" text-anchor="middle">${ev.bar}小節</text>`;
      lastBar = ev.bar;
    }
    const isCurrent = i === currentIndex;
    html += `<text x="${x}" y="82" fill="#f7fbff" font-size="${isCurrent ? 30 : 26}" font-weight="700" text-anchor="middle">${ev.strum}</text>`;
    for (let r = 0; r < 4; r += 1) html += pill(x, rowY[r], ev.frets[r], isCurrent);
  }
  const lastVisible = playheadX + (positions[events.length - 1] - anchor) + columnGap;
  html += `<line x1="${lastVisible}" y1="92" x2="${lastVisible}" y2="292" stroke="rgba(255,255,255,.18)" stroke-width="3"></line>`;
  content.innerHTML = html;
}

function render() {
  const anchor = positions[currentIndex] + progress;
  renderRight(anchor);
  renderLeft(anchor);
  const delta = getSpeed() - 1.0;
  const deltaText = delta === 0 ? '±0.00x' : `${delta > 0 ? '+' : ''}${delta.toFixed(2)}x`;
  speedTag.textContent = `速度 ${getSpeed().toFixed(2)}x / 基準 ${deltaText}`;
  const slower = speedSteps[Math.max(0, speedIndex - 1)];
  const faster = speedSteps[Math.min(speedSteps.length - 1, speedIndex + 1)];
  const slowDelta = slower - getSpeed();
  const fastDelta = faster - getSpeed();
  slowBtn.textContent = speedIndex === 0 ? '遅く' : `遅く ${slowDelta.toFixed(2)}x`;
  fastBtn.textContent = speedIndex === speedSteps.length - 1 ? '速く' : `速く +${fastDelta.toFixed(2)}x`;
}

function stopPlayback() {
  running = false;
  lastTs = null;
  syncPlayButton();
}

function togglePlay() {
  running = !running;
  lastTs = null;
  syncPlayButton();
}

function goFirst() {
  stopPlayback();
  currentIndex = 0;
  progress = 0;
  render();
}

function goBack() {
  stopPlayback();
  currentIndex = Math.max(0, currentIndex - 1);
  progress = 0;
  render();
}

function replay() {
  stopPlayback();
  progress = 0;
  render();
}

function goNext() {
  stopPlayback();
  currentIndex = Math.min(events.length - 1, currentIndex + 1);
  progress = 0;
  render();
}

function changeSpeed(direction) {
  const nextIndex = Math.max(0, Math.min(speedSteps.length - 1, speedIndex + direction));
  if (nextIndex === speedIndex) return;
  speedIndex = nextIndex;
  render();
}

function loop(ts) {
  if (lastTs == null) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (running) {
    progress += (basePxPerSec * getSpeed()) * dt;
    while (progress >= getCurrentDistance() && currentIndex < events.length - 1) {
      progress -= getCurrentDistance();
      currentIndex += 1;
    }
    if (currentIndex >= events.length - 1 && progress >= getCurrentDistance()) {
      progress = 0;
      stopPlayback();
    }
    render();
  }
  requestAnimationFrame(loop);
}

attachButtonFeedback(playBtn, togglePlay);
attachButtonFeedback(firstBtn, goFirst);
attachButtonFeedback(backBtn, goBack);
attachButtonFeedback(replayBtn, replay);
attachButtonFeedback(nextBtn, goNext);
attachButtonFeedback(slowBtn, () => changeSpeed(-1));
attachButtonFeedback(fastBtn, () => changeSpeed(1));

if (document.getElementById('micBtn')) {
  document.getElementById('micBtn').addEventListener('click', () => flashButton(document.getElementById('micBtn')));
}

render();
syncPlayButton();
requestAnimationFrame(loop);
