let audioCtx = null;
let timers = [];

function clearTimers() {
  timers.forEach(t => clearTimeout(t));
  timers = [];
}

function tone(freq, startDelay, duration = 0.18) {
  timers.push(setTimeout(() => {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration + 0.03);
  }, startDelay));
}

export function playScoreDraft(score) {
  stopScoreDraft();
  const beatMs = Math.max(220, Math.round(60000 / (score.bpm || 96)));
  const stepMs = beatMs / 4;
  let offset = 0;
  score.bars.forEach(bar => {
    (bar.notes || []).forEach(note => {
      const base = 261.63;
      const highest = ['A','E','C','G'].map(s => note[s]).filter(v => typeof v === 'number').sort((a,b)=>b-a)[0] || 0;
      tone(base * Math.pow(2, highest / 12), offset + note.t * stepMs, 0.16);
    });
    offset += score.grid * stepMs;
  });
}

export function stopScoreDraft() {
  clearTimers();
}
