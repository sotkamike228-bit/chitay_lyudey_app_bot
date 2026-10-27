// Калибровка уверенности: чистая логика (тестируется в Node).
export const LEVELS = [
  { id: 1, p: 0.55 },
  { id: 2, p: 0.75 },
  { id: 3, p: 0.95 },
];
export const MIN_ITEMS = 10;
export const HISTORY_CAP = 200;

/** Верно = выбрано хотя бы одно верное наблюдение и не выбрано ни одного поспешного вывода. */
export function isCorrect(c, pickedIds) {
  const kinds = pickedIds.map((id) => (c.observations.find((o) => o.id === id) || {}).kind);
  return kinds.includes('signal') && !kinds.includes('jump');
}

export function levelP(levelId) {
  const l = LEVELS.find((x) => x.id === levelId);
  return l ? l.p : null;
}

const r4 = (x) => Math.round(x * 10000) / 10000;

export function addItem(history, levelId, correct, now = Date.now()) {
  const p = levelP(levelId);
  if (p == null) return history;
  return [...history, { l: levelId, p, ok: correct ? 1 : 0, t: now }].slice(-HISTORY_CAP);
}

/** gap = средняя уверенность − точность. Brier = средний квадрат ошибки. */
export function stats(history, minItems = MIN_ITEMS) {
  const n = history.length;
  if (n < minItems) return { ready: false, n, need: minItems - n };
  const accuracy = history.reduce((a, x) => a + x.ok, 0) / n;
  const meanP = history.reduce((a, x) => a + x.p, 0) / n;
  const gap = r4(meanP - accuracy);
  const brier = r4(history.reduce((a, x) => a + (x.p - x.ok) ** 2, 0) / n);
  const verdict = gap <= -0.1 ? 'under' : gap <= 0.1 ? 'calibrated' : 'over';
  const byLevel = LEVELS.map((l) => {
    const items = history.filter((x) => x.l === l.id);
    return { id: l.id, p: l.p, n: items.length, accuracy: items.length ? r4(items.reduce((a, x) => a + x.ok, 0) / items.length) : null };
  });
  return { ready: true, n, accuracy: r4(accuracy), meanP: r4(meanP), gap, brier, verdict, byLevel };
}
