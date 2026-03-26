const app = document.getElementById('app');

const nowCard = {
  title: 'C6',
  hintLabel: 'ヒント',
  hint: 'そのまま維持',
  rows: [
    { label: '1弦(A)', fret: '2F', finger: '人' },
    { label: '2弦(E)', fret: '3F', finger: '中' },
    { label: '3弦(C)', fret: '4F', finger: '薬' },
    { label: '4弦(G)', fret: '開放', finger: '' },
  ],
  cells: [
    { row: 0, col: 1, text: '人' },
    { row: 1, col: 2, text: '中' },
    { row: 2, col: 3, text: '薬' },
    { row: 3, col: 0, text: '開放', open: true },
  ]
};

const nextCard = {
  title: 'G7',
  hintLabel: '切替のコツ',
  hint: '形そのままで 1F 戻す',
  summary: '人・中・薬はそのまま 1F ずつ左へ',
  rows: [
    { label: '1弦(A)', fret: '1F', finger: '人' },
    { label: '2弦(E)', fret: '2F', finger: '中' },
    { label: '3弦(C)', fret: '3F', finger: '薬' },
    { label: '4弦(G)', fret: '開放', finger: '' },
  ],
  cells: [
    { row: 0, col: 0, text: '人' },
    { row: 1, col: 1, text: '中' },
    { row: 2, col: 2, text: '薬' },
    { row: 3, col: 0, text: '開放', open: true },
  ],
  changes: [
    { text: '1弦(A) 人: 2F → 1F', type: 'move' },
    { text: '2弦(E) 中: 3F → 2F', type: 'move' },
    { text: '3弦(C) 薬: 4F → 3F', type: 'move' },
    { text: '4弦(G): そのまま', type: 'stay' },
  ]
};

const laneRows = [
  { code: '1(A)', points: [18, 44, 71, 83] },
  { code: '2(E)', points: [14, 36, 59, 77] },
  { code: '3(C)', points: [22, 51, 69] },
  { code: '4(G)', points: [12, 40, 64] },
];

function renderTable(card, isNext = false) {
  const headers = ['1F', '2F', '3F', '4F'];
  const rows = ['1弦(A)', '2弦(E)', '3弦(C)', '4弦(G)'];

  const gridRows = rows.map((rowName, rowIndex) => {
    const cells = [0, 1, 2, 3].map((colIndex) => {
      const hit = card.cells.find((item) => item.row === rowIndex && item.col === colIndex);
      if (!hit) return `<span class="chord-cell"></span>`;
      if (hit.open) return `<span class="chord-cell chord-cell-open">開放</span>`;
      return `<span class="chord-cell chord-cell-hit ${isNext ? 'chord-cell-hit-next' : ''}">${hit.text}</span>`;
    }).join('');

    return `
      <div class="fret-row">
        <span class="fret-row-label">${rowName}</span>
        <div class="fret-row-cells">${cells}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="chord-table-wrap ${isNext ? 'chord-table-wrap-next' : ''}">
      <div class="fret-header">
        <span class="fret-header-spacer"></span>
        <div class="fret-header-cells">
          ${headers.map((header) => `<span class="fret-header-cell">${header}</span>`).join('')}
        </div>
      </div>
      ${gridRows}
    </div>
  `;
}

function renderNowCard(card) {
  const infoRows = card.rows.map((row) => {
    const text = row.finger ? `${row.label}: ${row.fret} ${row.finger}` : `${row.label}: ${row.fret}`;
    return `<div class="chord-info-line">${text}</div>`;
  }).join('');

  return `
    <section class="practice-card side-card">
      <div class="card-head">
        <span class="card-head-label">NOW</span>
        <span class="card-head-dot"></span>
      </div>

      <div class="shape-name">${card.title}</div>
      ${renderTable(card, false)}

      <div class="shape-meta shape-meta-lines">
        ${infoRows}
      </div>

      <div class="shape-line shape-line-hint">
        <span class="shape-label">${card.hintLabel}</span>
        <strong>${card.hint}</strong>
      </div>
    </section>
  `;
}

function renderNextCard(card) {
  const changeRows = card.changes.map((item) => {
    const cls = item.type === 'stay' ? 'change-line change-line-stay' : 'change-line change-line-move';
    return `<div class="${cls}">${item.text}</div>`;
  }).join('');

  return `
    <section class="practice-card side-card next-card">
      <div class="card-head">
        <span class="card-head-label">NEXT</span>
        <span class="card-head-dot card-head-dot-next"></span>
      </div>

      <div class="shape-name shape-name-next">${card.title}</div>
      ${renderTable(card, true)}

      <div class="change-summary-banner">${card.summary}</div>

      <div class="change-box">
        <div class="change-box-title">変化点</div>
        <div class="change-box-lines">
          ${changeRows}
        </div>
      </div>

      <div class="shape-line shape-line-hint shape-line-hint-next">
        <span class="shape-label">${card.hintLabel}</span>
        <strong>${card.hint}</strong>
      </div>
    </section>
  `;
}

const laneRowHtml = laneRows.map((row) => {
  const notes = row.points.map((left) => `<span class="lane-note" style="left:${left}%"></span>`).join('');
  return `
    <div class="lane-row">
      <span class="lane-name">${row.code}</span>
      <div class="lane-track">${notes}</div>
    </div>
  `;
}).join('');

app.innerHTML = `
  <div class="practice-shell">
    <header class="practice-topbar">
      <div class="topbar-left">
        <p class="eyebrow">PRACTICE</p>
        <h1>12th Street Rag</h1>
        <p class="topbar-sub">4/4 / swing / 5-8小節 / ループ中</p>
      </div>

      <div class="topbar-right">
        <div class="top-chip">BPM 72</div>
        <div class="top-chip top-chip-active">Pulse Split</div>
        <div class="top-chip">★★★</div>
      </div>
    </header>

    <div class="practice-layout">
      ${renderNowCard(nowCard)}

      <section class="practice-card center-card">
        <div class="card-head">
          <span class="card-head-label">4弦レーン</span>
          <span class="card-head-dot"></span>
        </div>

        <div class="rhythm-line">
          <div class="rhythm-col"><span class="rhythm-beat">1拍目</span><span class="rhythm-hit">↓</span></div>
          <div class="rhythm-col"><span class="rhythm-beat">2拍目</span><span class="rhythm-hit">↓↑</span></div>
          <div class="rhythm-col"><span class="rhythm-beat">3拍目</span><span class="rhythm-hit">↓</span></div>
          <div class="rhythm-col"><span class="rhythm-beat">4拍目</span><span class="rhythm-hit">↑</span></div>
        </div>

        <div class="lane-box">
          ${laneRowHtml}
          <div class="playhead"></div>
        </div>

        <div class="lane-hint">
          <span class="lane-hint-label">現在</span>
          <strong>3小節目 / 4拍目</strong>
        </div>
      </section>

      ${renderNextCard(nextCard)}
    </div>

    <footer class="transport">
      <button class="transport-btn" type="button">戻る</button>
      <button class="transport-btn" type="button">もう一回</button>
      <button class="transport-btn transport-btn-primary" type="button">再生 / 停止</button>
      <button class="transport-btn" type="button">次へ</button>
      <button class="transport-btn" type="button">遅く</button>
      <button class="transport-btn" type="button">速く</button>
      <button class="transport-btn transport-btn-voice" type="button">🎤</button>
    </footer>
  </div>
`;
