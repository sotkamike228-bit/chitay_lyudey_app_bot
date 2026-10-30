// Калибровка уверенности: чистая логика (тестируется в Node).
import { shuffle } from './engine.js?v=test6';
export const LEVELS = [
  { id: 1, p: 0.55 },
  { id: 2, p: 0.75 },
  { id: 3, p: 0.95 },
];
export const MIN_ITEMS = 4;          // первый срез уже после первого раунда
export const PRELIM_BELOW = 10;      // до 10 ответов срез помечается как предварительный
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
  return { ready: true, preliminary: n < PRELIM_BELOW, n, accuracy: r4(accuracy), meanP: r4(meanP), gap, brier, verdict, byLevel };
}

// ---------- категории: у каждой свой цикл, история, вердикт ----------
export const CAT_IDS = ['negotiation', 'dating', 'toxic'];
export const ROUND_SIZE = 4;
export const SEEN_CAP = 100;

export function emptyCat() { return { h: [], rounds: 0, seen: [] }; }
export function normCat(o) {
  const e = emptyCat();
  return o && typeof o === 'object' ? { h: Array.isArray(o.h) ? o.h : e.h, rounds: Number(o.rounds) > 0 ? Number(o.rounds) : 0, seen: Array.isArray(o.seen) ? o.seen : e.seen } : e;
}
/** Первый раунд категории бесплатный; дальше нужен доступ. */
export function roundAllowed(rounds, hasPro) { return rounds === 0 || !!hasPro; }

/** Кейсы раунда. Раунд 0: бесплатные кейсы категории. Дальше: общий пул, ещё не виденные кейсы идут первыми. */
export function roundCases(rounds, free, paid = [], seen = [], n = ROUND_SIZE, rnd = Math.random) {
  if (rounds === 0) return shuffle(free, rnd).slice(0, n);
  const all = [...free, ...paid];
  const fresh = all.filter((c) => !seen.includes(c.id));
  const old = all.filter((c) => seen.includes(c.id));
  return [...shuffle(fresh, rnd), ...shuffle(old, rnd)].slice(0, n);
}
export function markSeen(seen, cases) { return [...new Set([...seen, ...cases.map((c) => c.id)])].slice(-SEEN_CAP); }
/** Сброс истории не возвращает бесплатный раунд: rounds и seen остаются. */
export function resetHistory(cat) { return { ...normCat(cat), h: [] }; }
