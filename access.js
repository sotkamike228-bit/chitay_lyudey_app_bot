// Слой доступа. Платежей пока нет (этап В): proPreview открывает всё на время бета-теста.
export const PRODUCT_FEATURES = {
  report_signals: ['report'],
  pack_anatomy: ['anatomy'],
  pack_cheatsheets: ['cheatsheets', 'calibration', 'protection'],
  pro_monthly: ['*'],
  pro_lifetime: ['*'],
};
export const FREE_FEATURES = ['quiz', 'help', 'protectionCore', 'atlas'];

/** Продукты с действующим сроком: exp[productId] (мс) в прошлом означает, что доступ закончился. */
export function ownedProducts(entitlements, now = Date.now()) {
  const exp = (entitlements && entitlements.exp) || {};
  return ((entitlements && entitlements.products) || []).filter((p) => !exp[p] || exp[p] > now);
}

export function hasAccess(feature, entitlements, cfg = {}) {
  if (FREE_FEATURES.includes(feature)) return true;
  if (cfg.proPreview) return true;
  const owned = ownedProducts(entitlements);
  return owned.some((p) => (PRODUCT_FEATURES[p] || []).some((f) => f === '*' || f === feature));
}

/** Бесплатные зоны анатомии открыты всегда; остальные требуют продукта с функцией «anatomy». */
export function hotspotUnlocked(hotspot, entitlements, cfg = {}) {
  return hotspot.tier === 'free' || hasAccess('anatomy', entitlements, cfg);
}

export function productFor(feature) {
  return Object.entries(PRODUCT_FEATURES).find(([, fs]) => fs.includes(feature))?.[0] || null;
}
