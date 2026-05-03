export function createDraftScoreFromImport(page, index = 0) {
  const title = (page?.name || `取り込み譜面 ${index + 1}`).replace(/\.[^.]+$/, '');
  return {
    id: `draft-${page?.id || index}`,
    title,
    bpm: 96,
    timeSig: '4/4',
    grid: 16,
    strings: ['A', 'E', 'C', 'G'],
    source: {
      pageId: page?.id || null,
      pageName: page?.name || '',
      hasProcessed: !!page?.processedUrl
    },
    bars: [
      {
        index: 1,
        chord: 'C',
        strum: ['↓', '', '↓', '', '↓', '', '↓', ''],
        notes: [
          { t: 0, A: 0, E: 1, C: 0, G: 0 },
          { t: 4, A: 3, E: 0, C: 0, G: 0 },
          { t: 8, A: 0, E: 1, C: 0, G: 0 },
          { t: 12, A: 3, E: 0, C: 0, G: 0 }
        ]
      },
      {
        index: 2,
        chord: 'G7',
        strum: ['↓', '', '↑', '', '↓', '', '↑', ''],
        notes: [
          { t: 0, A: 2, E: 1, C: 2, G: 0 },
          { t: 4, A: 2, E: 1, C: 2, G: 0 },
          { t: 8, A: 2, E: 1, C: 2, G: 0 },
          { t: 12, A: 2, E: 1, C: 2, G: 0 }
        ]
      },
      {
        index: 3,
        chord: 'C',
        strum: ['↓', '', '', '', '↓', '', '', ''],
        notes: [
          { t: 0, A: 3, E: 0, C: 0, G: 0 },
          { t: 8, A: 0, E: 0, C: 0, G: 0 }
        ]
      },
      {
        index: 4,
        chord: 'C',
        strum: ['↓', '', '↓', '', '↓', '', '↓', ''],
        notes: [
          { t: 0, A: 0, E: 0, C: 0, G: 0 },
          { t: 4, A: 2, E: 0, C: 0, G: 0 },
          { t: 8, A: 3, E: 0, C: 0, G: 0 },
          { t: 12, A: 0, E: 0, C: 0, G: 0 }
        ]
      }
    ],
    status: 'draft'
  };
}
export function getStringIndex(score, stringName) {
  return score.strings.indexOf(stringName);
}
export function getFlatEvents(score) {
  const events = [];
  score.bars.forEach((bar) => {
    bar.notes.forEach(note => {
      events.push({ bar: bar.index, chord: bar.chord, ...note });
    });
  });
  return events;
}

export function cloneScore(score) {
  return JSON.parse(JSON.stringify(score));
}
