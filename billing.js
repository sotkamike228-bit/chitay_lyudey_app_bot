// Оформление покупки. Пока apiBase пустой, работает режим-заглушка: ничего не списывается.
// Контракт с сервером (см. docs/CHITAY_PAYWALL_SPEC.md):
//   POST {apiBase}/api/invoice  {product, initData} -> {link}
//   POST {apiBase}/api/me       {initData}          -> {products:[...], exp:{id: unixMs}}
// Статус из окна оплаты НЕ считается доказательством: доступ появляется только по ответу /api/me.
import { productById } from './pricing.js';

export function createBilling({ apiBase = '', tg = null, fetchFn = (typeof fetch === 'function' ? fetch : null), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), pollMs = 1500, pollMax = 10 } = {}) {
  const enabled = () => !!apiBase;
  const initData = () => (tg && tg.initData) || '';

  async function post(path, body) {
    const r = await fetchFn(apiBase.replace(/\/$/, '') + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(path + ' ' + r.status);
    return r.json();
  }
  async function fetchEntitlements() { return post('/api/me', { initData: initData() }); }

  /** onState: 'opening' | 'checking' | 'done' | 'cancelled' | 'failed' | 'error' | 'stub'. Возвращает итоговое состояние. */
  async function checkout(productId, onState = () => {}) {
    if (!productById(productId)) throw new Error('unknown product');
    if (!enabled()) { onState('stub'); return { state: 'stub' }; }
    if (!tg || typeof tg.openInvoice !== 'function') { onState('error'); return { state: 'error' }; }
    let link;
    try { onState('opening'); ({ link } = await post('/api/invoice', { product: productId, initData: initData() })); if (!link) throw new Error('no link'); }
    catch { onState('error'); return { state: 'error' }; }
    const status = await new Promise((res) => { try { tg.openInvoice(link, res); } catch { res('failed'); } });
    if (status === 'cancelled') { onState('cancelled'); return { state: 'cancelled' }; }
    if (status === 'failed') { onState('failed'); return { state: 'failed' }; }
    // paid или pending: проверяем у сервера
    onState('checking');
    for (let i = 0; i < pollMax; i++) {
      try {
        const ent = await fetchEntitlements();
        const owned = (ent.products || []).includes(productId) && (!(ent.exp || {})[productId] || ent.exp[productId] > Date.now());
        if (owned) { onState('done'); return { state: 'done', ent }; }
      } catch { /* сеть: пробуем ещё */ }
      await sleep(pollMs);
    }
    onState('error'); return { state: 'error' };
  }
  return { enabled, checkout, fetchEntitlements };
}
