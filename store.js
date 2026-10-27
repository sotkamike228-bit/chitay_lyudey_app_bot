// Локальное хранилище с запасным вариантом в памяти (localStorage может быть недоступен).
const mem = new Map();
export const KEYS = { core: 'chitay.quiz.v1', calib: 'chitay.calib.v1', atlas: 'chitay.atlas.v1', ent: 'chitay.ent.v1' };

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw != null) return JSON.parse(raw);
  } catch { /* недоступно */ }
  return mem.has(key) ? mem.get(key) : fallback;
}
export function write(key, value) {
  mem.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* работаем из памяти */ }
}
export function patch(key, partial) { write(key, { ...read(key, {}), ...partial }); }
