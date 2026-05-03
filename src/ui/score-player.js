let audioCtx = null;
let timers = [];

const STRING_BASE_FREQ = {
  G: 392.00,
  C: 261.63,
  E: 329.63,
  A: 440.00
};

function clearTimers() {
  timers.forEach(t => clearTimeout(t));
  timers = [];
}

function ensureAudio() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function tone(freq, startDelay, duration = 0.22, gainValue = 0.045) {
  timers.push(setTimeout(() => {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.04);
  }, startDelay));
}

function fretToFreq(stringName, fret) {
  const base = STRING_BASE_FREQ[stringName];
  if (!base || typeof fret !== 'number') return null;
  return base * Math.pow(2, fret / 12);
}

function playShape(note, startDelay) {
  const order = ['G', 'C', 'E', 'A'];
  order.forEach((stringName, index) => {
    const fret = note[stringName];
    const freq = fretToFreq(stringName, fret);
    if (!freq) return;
    tone(freq, startDelay + index * 16, 0.24, 0.032);
  });
}

export function playScoreDraft(score) {
  stopScoreDraft();
  const beatMs = Math.max(220, Math.round(60000 / (score.bpm || 96)));
  const stepMs = beatMs / 4;
  let offset = 0;
  score.bars.forEach(bar => {
    (bar.notes || []).forEach(note => {
      playShape(note, offset + note.t * stepMs);
    });
    offset += score.grid * stepMs;
  });
}

export function stopScoreDraft() {
  clearTimers();
}
