import { SONG_LIBRARY, getSongById } from '../../app/data/song-library.js';

const app = document.getElementById('app');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function practiceHref(songId) {
  return `./practice.html?song=${encodeURIComponent(songId)}`;
}

const fallbackSong = getSongById('kirakira') || SONG_LIBRARY[0];
let lastSong = fallbackSong;
try {
  const saved = localStorage.getItem('ukuleleSelectedSong');
  if (saved) lastSong = getSongById(saved) || fallbackSong;
} catch {}

function renderTop() {
  app.innerHTML = `
    <div class="home-shell slim-home">
      <section class="hero slim-hero">
        <div class="hero-copy slim-copy">
          <p class="eyebrow">UKULELE PRACTICE</p>
          <h1>弾くための画面だけに絞った新しい練習アプリ</h1>
          <p class="hero-text">前回の曲: ${escapeHtml(lastSong.title)} / ${escapeHtml(lastSong.subtitle)}</p>
        </div>
      </section>

      <section class="grid slim-grid">
        <a class="card" href="${practiceHref(lastSong.id)}" id="resumeCard">
          <span class="card-kicker">RESTART</span>
          <h2>前回の続き</h2>
          <p>前回の曲からそのまま再開</p>
          <span class="card-meta">${escapeHtml(lastSong.title)} / 練習へ</span>
        </a>

        <button class="card card-button" type="button" id="libraryCard">
          <span class="card-kicker">LIBRARY</span>
          <h2>曲ライブラリ</h2>
          <p>3曲の中から選んで練習モードへ進む</p>
          <span class="card-meta">きらきら星 / 聖者の行進 / 12th Street Rag</span>
        </button>

        <a class="card" href="./teacher.html">
          <span class="card-kicker">TEACHER SCORE</span>
          <h2>先生の譜面を入れる</h2>
          <p>xlsx / 変換データの確認と読込</p>
          <span class="card-meta">確認・修正前提</span>
        </a>

        <a class="card" href="./tuning.html">
          <span class="card-kicker">TUNING</span>
          <h2>チューニング</h2>
          <p>練習前に4弦を合わせる</p>
          <span class="card-meta">準備重視</span>
        </a>
      </section>

      <div class="ver-tag">HOME v4.0</div>
    </div>
  `;

  const lib = document.getElementById('libraryCard');
  if (lib) {
    lib.addEventListener('click', () => {
      renderLibrary();
      try { history.replaceState(null, '', '#library'); } catch {}
    });
  }
}

function renderLibrary() {
  const songCards = SONG_LIBRARY.map((song, index) => `
    <a class="card" href="${practiceHref(song.id)}" data-song-link="${escapeHtml(song.id)}">
      <span class="card-kicker">SONG ${index + 1}</span>
      <h2>${escapeHtml(song.title)}</h2>
      <p>${escapeHtml(song.subtitle)}</p>
      <span class="card-meta">${song.bars}小節 / 練習を開始</span>
    </a>
  `).join('');

  app.innerHTML = `
    <div class="home-shell slim-home">
      <section class="hero slim-hero">
        <div class="hero-copy slim-copy">
          <p class="eyebrow">LIBRARY</p>
          <h1>曲ライブラリ</h1>
          <p class="hero-text">3曲の中から選んで練習を始める</p>
        </div>
        <button class="chip chip-button" id="backTopBtn" type="button">TOPへ戻る</button>
      </section>

      <section class="grid slim-grid" id="songs">${songCards}</section>

      <div class="ver-tag">HOME v4.0</div>
    </div>
  `;

  document.querySelectorAll('[data-song-link]').forEach((link) => {
    link.addEventListener('click', () => {
      try {
        localStorage.setItem('ukuleleSelectedSong', link.dataset.songLink || fallbackSong.id);
      } catch {}
    });
  });

  const back = document.getElementById('backTopBtn');
  if (back) {
    back.addEventListener('click', () => {
      renderTop();
      try { history.replaceState(null, '', '#top'); } catch {}
    });
  }
}

if (window.location.hash === '#library') {
  renderLibrary();
} else {
  renderTop();
}
