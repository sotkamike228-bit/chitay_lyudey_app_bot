// Загрузка платного контента. Источник один из двух:
//  1) сервер: POST {apiBase}/api/pro {section, initData}, право проверяет сервер при каждом запросе;
//  2) только для беты без сервера (proPreview): локальный файл chitay_pro_full.json. Его НЕТ в публичной сборке:
//     чтобы проверить PRO на телефоне до запуска сервера, владелец сознательно кладёт его на Pages на время теста
//     (и тогда он, как и раньше, виден всем по ссылке).
// Никакие платные тексты не лежат в chitay_pro.json.
export class ProError extends Error {
  constructor(code) { super(code); this.code = code; }   // 'locked' | 'auth' | 'network' | 'unavailable' | 'previewMissing'
}

// Зеркало app/split.py на сервере (tools/split_pro.py). Тест следит, чтобы они не разошлись.
const HOTSPOT_PRIVATE = ['layers', 'research', 'trainer'];
const SECTION_PRIVATE = { dating: ['interestVsDistance', 'checkQuestions'], negotiation: ['cards', 'confidenceCalibration'], protection: ['patterns', 'nlpClaims'] };
export const SECTIONS = ['anatomy', ...Object.keys(SECTION_PRIVATE), 'calibration', 'hypothesis'];

/** Из полного файла получает ровно то, что отдал бы сервер для раздела. */
export function splitFull(full, section) {
  if (section === 'anatomy') {
    const hotspots = {};
    for (const s of full.anatomy.sections) for (const hs of s.hotspots) {
      if (hs.tier === 'free') continue;
      const o = {}; for (const k of HOTSPOT_PRIVATE) if (k in hs) o[k] = hs[k];
      hotspots[hs.id] = o;
    }
    return { hotspots };
  }
  if (section === 'calibration' || section === 'hypothesis') { if (!full[section]) throw new ProError('unavailable'); return full[section]; }
  const sec = full.cheatsheets.sections.find((s) => s.id === section);
  if (!sec || !SECTION_PRIVATE[section]) throw new ProError('unavailable');
  const out = {}; for (const k of SECTION_PRIVATE[section]) if (k in sec) out[k] = sec[k];
  return out;
}

export function createProLoader({ apiBase = '', tg = null, fetchFn = (typeof fetch === 'function' ? fetch : null), preview = false, fullUrl = 'chitay_pro_full.json' } = {}) {
  const cache = new Map();
  const base = apiBase.replace(/\/$/, '');

  async function fromServer(section) {
    let r;
    try {
      r = await fetchFn(base + '/api/pro', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ section, initData: (tg && tg.initData) || '' }) });
    } catch { throw new ProError('network'); }
    if (r.status === 401) throw new ProError('auth');
    if (r.status === 403) throw new ProError('locked');
    if (r.status === 404) throw new ProError('unavailable');
    if (!r.ok) throw new ProError('network');
    try { return (await r.json()).content; } catch { throw new ProError('network'); }
  }

  async function fromPreviewFile(section) {
    let full;
    try { const r = await fetchFn(fullUrl, { cache: 'no-store' }); if (!r.ok) throw 0; full = await r.json(); } catch { throw new ProError('previewMissing'); }
    return splitFull(full, section);
  }

  async function load(section) {
    if (!SECTIONS.includes(section)) throw new ProError('unavailable');
    if (cache.has(section)) return cache.get(section);
    let content;
    try {
      if (base) content = await fromServer(section);
      else if (preview) content = await fromPreviewFile(section);
      else throw new ProError('locked');
    } catch (e) { if (e.code === 'locked' || e.code === 'auth') cache.delete(section); throw e; }
    cache.set(section, content);
    return content;
  }
  return { load, clear: () => cache.clear() };
}
