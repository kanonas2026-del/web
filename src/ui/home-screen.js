const app = document.getElementById('app');

const SONG_LIBRARY = [
  {
    id: 'kirakira',
    title: 'きらきら星',
    subtitle: '4/4 / ゆっくり練習 / BPM 60',
    note: 'C / F / G7 の基本伴奏'
  },
  {
    id: 'saints',
    title: '聖者の行進',
    subtitle: '4/4 / ベーシック伴奏 / BPM 68',
    note: 'C / F / G7 の練習'
  },
  {
    id: 'rag',
    title: '12th Street Rag',
    subtitle: '4/4 / Swing / BPM 72',
    note: '流れの中での運指練習'
  }
];

const LAST_SONG_KEY = 'ukulele_last_song';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getLastSong() {
  try {
    const id = localStorage.getItem(LAST_SONG_KEY);
    return SONG_LIBRARY.find(song => song.id === id) || SONG_LIBRARY[0];
  } catch (_) {
    return SONG_LIBRARY[0];
  }
}

function saveLastSong(id) {
  try {
    localStorage.setItem(LAST_SONG_KEY, id);
  } catch (_) {}
}

function goPractice(songId) {
  saveLastSong(songId);
  window.location.href = `./practice.html?song=${encodeURIComponent(songId)}`;
}

function renderTop() {
  const lastSong = getLastSong();
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
        <a class="card" href="./practice.html?song=${encodeURIComponent(lastSong.id)}">
          <span class="card-kicker">RESTART</span>
          <h2>前回の続き</h2>
          <p>前回の曲からそのまま再開</p>
          <span class="card-meta">${escapeHtml(lastSong.title)}</span>
        </a>

        <button class="card" type="button" id="libraryBtn">
          <span class="card-kicker">LIBRARY</span>
          <h2>曲ライブラリ</h2>
          <p>3曲の中から選んで練習モードへ進む</p>
          <span class="card-meta">きらきら星 / 聖者の行進 / 12th Street Rag</span>
        </button>

        <button class="card" type="button" id="teacherBtn">
          <span class="card-kicker">IMPORT</span>
          <h2>先生の譜面を入れる</h2>
          <p>TAB譜画像を読み込み、補正して確認する</p>
          <span class="card-meta">縦A4 / 複数枚対応</span>
        </button>

        <button class="card" type="button" id="tuningBtn">
          <span class="card-kicker">TUNING</span>
          <h2>チューニング</h2>
          <p>音合わせから始める</p>
          <span class="card-meta">準備中</span>
        </button>
      </section>
    </div>
  `;

  document.getElementById('libraryBtn')?.addEventListener('click', renderLibrary);
  document.getElementById('teacherBtn')?.addEventListener('click', () => {
    window.location.href = './teacher.html';
  });
  document.getElementById('tuningBtn')?.addEventListener('click', () => {
    window.alert('チューニング は準備中です。');
  });
}

function renderLibrary() {
  app.innerHTML = `
    <div class="home-shell slim-home">
      <section class="hero slim-hero">
        <div class="hero-copy slim-copy">
          <p class="eyebrow">SONG LIBRARY</p>
          <h1>曲ライブラリ</h1>
          <p class="hero-text">練習したい曲を選んでください</p>
        </div>
      </section>

      <section class="grid slim-grid">
        ${SONG_LIBRARY.map(song => `
          <button class="card" type="button" data-song-id="${escapeHtml(song.id)}">
            <span class="card-kicker">SONG</span>
            <h2>${escapeHtml(song.title)}</h2>
            <p>${escapeHtml(song.subtitle)}</p>
            <span class="card-meta">${escapeHtml(song.note)}</span>
          </button>
        `).join('')}

        <button class="card" type="button" id="backTopBtn">
          <span class="card-kicker">TOP</span>
          <h2>TOPへ戻る</h2>
          <p>最初の4つのメニューへ戻る</p>
          <span class="card-meta">前回 / 曲ライブラリ / 先生の譜面 / チューニング</span>
        </button>
      </section>
    </div>
  `;

  app.querySelectorAll('[data-song-id]').forEach(button => {
    button.addEventListener('click', () => {
      const songId = button.getAttribute('data-song-id');
      goPractice(songId);
    });
  });

  document.getElementById('backTopBtn')?.addEventListener('click', renderTop);
}

if (app) {
  renderTop();
}
