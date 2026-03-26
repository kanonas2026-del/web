const app = document.getElementById("app");

const laneRows = [
  { name: "A", points: [18, 44, 71] },
  { name: "E", points: [12, 39, 62] },
  { name: "C", points: [27, 54, 83] },
  { name: "G", points: [8, 48] },
];

const laneRowHtml = laneRows.map((row) => {
  const notes = row.points
    .map((left) => `<span class="lane-note" style="left:${left}%"></span>`)
    .join("");

  return `
    <div class="lane-row">
      <span class="lane-name">${row.name}</span>
      <div class="lane-track">
        ${notes}
      </div>
    </div>
  `;
}).join("");

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
      <section class="practice-card side-card">
        <div class="card-head">
          <span class="card-head-label">NOW</span>
          <span class="card-head-dot"></span>
        </div>

        <div class="shape-name">C6</div>

        <div class="shape-diagram">
          <div class="shape-grid">
            <span class="shape-mark shape-mark-a">2</span>
            <span class="shape-mark shape-mark-e">3</span>
            <span class="shape-mark shape-mark-c">4</span>
          </div>
        </div>

        <div class="shape-meta">
          <div class="shape-line">
            <span class="shape-label">指</span>
            <strong>2 / 3 / 4</strong>
          </div>
          <div class="shape-line">
            <span class="shape-label">ヒント</span>
            <strong>そのまま維持</strong>
          </div>
        </div>
      </section>

      <section class="practice-card center-card">
        <div class="card-head">
          <span class="card-head-label">LANE / RHYTHM</span>
          <span class="card-head-dot"></span>
        </div>

        <div class="rhythm-line">
          <span class="rhythm-hit">↓</span>
          <span class="rhythm-hit">↓↑</span>
          <span class="rhythm-hit">↓</span>
          <span class="rhythm-hit">↑</span>
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

      <section class="practice-card side-card next-card">
        <div class="card-head">
          <span class="card-head-label">NEXT</span>
          <span class="card-head-dot card-head-dot-next"></span>
        </div>

        <div class="shape-name shape-name-next">G7</div>

        <div class="shape-diagram shape-diagram-next">
          <div class="shape-grid">
            <span class="shape-mark shape-mark-g1">1</span>
            <span class="shape-mark shape-mark-g2">2</span>
            <span class="shape-mark shape-mark-g3">3</span>
          </div>
        </div>

        <div class="shape-meta">
          <div class="shape-line">
            <span class="shape-label">変わる指</span>
            <strong>人 / 中</strong>
          </div>
          <div class="shape-line">
            <span class="shape-label">ヒント</span>
            <strong>次で薬指を離す</strong>
          </div>
        </div>
      </section>
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