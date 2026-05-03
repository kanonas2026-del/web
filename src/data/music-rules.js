export function evaluateScoreDraft(score) {
  const results = [];
  if (!score?.bars?.length) {
    results.push({ level: 'warn', text: '小節データがありません。' });
    return results;
  }

  const allowedStrings = new Set(score.strings || []);
  let hasHighFret = false;
  let hasSparseBars = false;

  score.bars.forEach(bar => {
    if (!bar.notes?.length) {
      hasSparseBars = true;
      return;
    }
    bar.notes.forEach(note => {
      Object.keys(note).forEach(key => {
        if (!allowedStrings.has(key)) return;
        const fret = note[key];
        if (typeof fret === 'number' && fret >= 7) hasHighFret = true;
      });
    });
  });

  results.push({ level: 'ok', text: '4線はアプリ側でまっすぐ再描画します。画像の湾曲には依存しません。' });
  results.push({ level: 'ok', text: 'テンポ・拍子・16分グリッドを内部データとして保持します。' });
  if (hasHighFret) results.push({ level: 'warn', text: '高いフレットがあります。初心者向け譜面なら確認してください。' });
  if (hasSparseBars) results.push({ level: 'warn', text: '空の小節があります。手書き省略の可能性があります。' });
  results.push({ level: 'warn', text: '現在は下書きデータです。次段階で画像解析候補と音楽ルールを接続します。' });
  return results;
}
export function fingeringHintForShape(shape) {
  const values = ['A', 'E', 'C', 'G'].map(s => shape?.[s]).filter(v => typeof v === 'number');
  if (!values.length) return '開放中心';
  const max = Math.max(...values);
  if (max <= 3) return '初級運指';
  if (max <= 5) return '要確認';
  return '高フレット注意';
}
