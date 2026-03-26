const app = document.getElementById('app');
const laneRows = [
  { name: 'A', points: [18, 44, 71] },
  { name: 'E', points: [12, 39, 62] },
  { name: 'C', points: [27, 54, 83] },
  { name: 'G', points: [8, 48] },
];
const laneHtml = laneRows.map(row => `
  <div class="lane-row">
    <span class="lane-name">${row.name}</span>
    <div class="lane-track">
      ${row.points.map(left => `<span class="lane-note" style="left:${left}%"></span>`).join('')}
    </div>
  </div>`).join('');

app.innerHTML = `
<div class="practice-shell">
  <header class="topbar">
    <div>
      <p class="eyebrow">PRACTICE</p>
      <h1>12th Street Rag</h1>
      <p class="sub">4/4 / swing / 5-8小節 / ループ中</p>
    </div>
    <div class="chips">
      <div class="chip">BPM 72</div>
      <div class="chip active">Pulse Split</div>
      <div class="chip">★★★</div>
    </div>
  </header>

  <section class="layout">
    <article class="panel">
      <div class="panel-head"><span class="head-label">NOW</span><span class="head-dot"></span></div>
      <div class="shape-name">C6</div>
      <div class="diagram"><div class="shape-grid">
        <span class="mark m-a">2</span><span class="mark m-e">3</span><span class="mark m-c">4</span>
      </div></div>
      <div class="meta">
        <div class="meta-line"><span class="label">指</span><strong>2 / 3 / 4</strong></div>
        <div class="meta-line"><span class="label">ヒント</span><strong>そのまま維持</strong></div>
      </div>
    </article>

    <article class="panel center">
      <div class="panel-head"><span class="head-label">LANE / RHYTHM</span><span class="head-dot"></span></div>
      <div class="rhythm"><div class="hit">↓</div><div class="hit">↓↑</div><div class="hit">↓</div><div class="hit">↑</div></div>
      <div class="lane-box">${laneHtml}<div class="playhead"></div></div>
      <div class="current"><span class="label">現在</span><strong>3小節目 / 4拍目</strong></div>
    </article>

    <article class="panel">
      <div class="panel-head"><span class="head-label">NEXT</span><span class="head-dot"></span></div>
      <div class="shape-name next">G7</div>
      <div class="diagram next"><div class="shape-grid">
        <span class="mark g1">1</span><span class="mark g2">2</span><span class="mark g3">3</span>
      </div></div>
      <div class="meta">
        <div class="meta-line"><span class="label">変わる指</span><strong>人 / 中</strong></div>
        <div class="meta-line"><span class="label">ヒント</span><strong>次で薬指を離す</strong></div>
      </div>
    </article>
  </section>

  <footer class="transport">
    <button class="btn">戻る</button>
    <button class="btn">もう一回</button>
    <button class="btn primary">再生 / 停止</button>
    <button class="btn">次へ</button>
    <button class="btn">遅く</button>
    <button class="btn">速く</button>
    <button class="btn voice">🎤</button>
  </footer>
</div>`;
