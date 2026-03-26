const app = document.getElementById('app');

app.innerHTML = `
  <div class="home-shell slim-home">
    <section class="hero slim-hero">
      <div class="hero-copy slim-copy">
        <p class="eyebrow">UKULELE PRACTICE</p>
        <h1>弾くための画面だけに絞った新しい練習アプリ</h1>
        <p class="hero-text">前回の曲: 12th Street Rag / 5-8小節 / BPM 72 / Pulse Split</p>
      </div>
    </section>

    <section class="grid slim-grid">
      <a class="card" href="./practice.html">
        <span class="card-kicker">RESTART</span>
        <h2>前回の続き</h2>
        <p>前回の区間からそのまま再開</p>
        <span class="card-meta">5-8小節 / ループ中</span>
      </a>

      <button class="card" type="button">
        <span class="card-kicker">LIBRARY</span>
        <h2>曲ライブラリ</h2>
        <p>曲を選んで練習モードへ進む</p>
        <span class="card-meta">きらきら星 / 伴奏 / swing</span>
      </button>

      <button class="card" type="button">
        <span class="card-kicker">TEACHER SCORE</span>
        <h2>先生の譜面を入れる</h2>
        <p>xlsx / 変換データの確認と読込</p>
        <span class="card-meta">確認・修正前提</span>
      </button>

      <button class="card" type="button">
        <span class="card-kicker">TUNING</span>
        <h2>チューニング</h2>
        <p>練習前に4弦を合わせる</p>
        <span class="card-meta">準備重視</span>
      </button>
    </section>

    <div class="ver-tag">HOME v3.1</div>
  </div>
`;
