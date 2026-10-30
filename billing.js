// Оформление покупки. Пока apiBase пустой, работает режим-заглушка: ничего не списывается.
// Контракт с сервером (см. docs/CHITAY_PAYWALL_SPEC.md):
//   POST {apiBase}/api/invoice  {product, initData} -> {link}
//   POST {apiBase}/api/me       {initData}          -> {products:[...], exp:{id: unixMs}}
// Статус из окна оплаты НЕ считается доказательством: доступ появляется только по ответу /api/me.
import { productById } from './pricing.js?v=test4';

export function createBilling({ apiBase = '', tg = null, fetchFn = (typeof fetch === 'function' ? fetch : null), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), pollMs = 1500, pollMax = 10 } = {}) {
  const enabled = () => !!apiBase;
  const initData = () => (tg && tg.initData) || '';

  async function post(path, body) {
    let r;
    try { r = await fetchFn(apiBase.replace(/\/$/, '') + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { throw new Error(path + ' network/CORS: ' + (e && e.message)); }
    if (!r.ok) throw new Error(path + ' HTTP ' + r.status);
    return r.json();
  }
  async function fetchEntitlements() { return post('/api/me', { initData: initData() }); }

  /** onState: 'opening' | 'checking' | 'done' | 'cancelled' | 'failed' | 'error' | 'stub'. Возвращает итоговое состояние. */
  async function checkout(productId, onState = () => {}) {
    if (!productById(productId)) throw new Error('unknown product');
    if (!enabled()) { onState('stub'); return { state: 'stub' }; }
    if (!tg || typeof tg.openInvoice !== 'function') { onState('error'); alert('DEBUG v=test4\nTelegram WebApp недоступен: ' + (!tg ? 'tg=null (открыто не внутри Telegram или скрипт не загрузился)' : 'нет openInvoice')); return { state: 'error' }; }
    let link;
    try { onState('opening');
      const __id = initData(); const __url = apiBase.replace(/\/$/, '') + '/api/invoice';
      if (!__id) { onState('error'); alert('initData отсутствует\nURL: ' + __url + '\nПриложение открыто не внутри Telegram через бота или без подписи.'); return { state: 'error' }; }
      alert('DEBUG v=test4\ninitData длина: ' + __id.length + '\nURL: ' + __url);
      ({ link } = await post('/api/invoice', { product: productId, initData: initData() })); if (!link) throw new Error('no link'); }
    catch (e) { alert('Ошибка /api/invoice: ' + (e && e.message)); console.error('[billing] /api/invoice:', e && e.message, '| initData length:', initData().length); onState('error'); return { state: 'error' }; }
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
  /** Оплата вне Telegram: сервер отдаёт ссылку на страницу платёжного провайдера. method: 'card' | 'crypto'.
   *  Контракт: POST {apiBase}/api/pay-link {product, method, initData} -> {link}. Пока сервер не умеет, вернём 'unavailable' без списаний. */
  async function checkoutExternal(productId, method, onState = () => {}) {
    if (!productById(productId)) throw new Error('unknown product');
    if (!enabled()) { onState('stub'); return { state: 'stub' }; }
    if (method !== 'card' && method !== 'crypto') throw new Error('unknown method');
    let link;
    try {
      onState('opening');
      ({ link } = await post('/api/pay-link', { product: productId, method, initData: initData() }));
      if (!link || !/^https:\/\//.test(link)) throw new Error('no link');
    } catch (e) { console.error('[billing] /api/pay-link:', e && e.message); onState('unavailable'); return { state: 'unavailable' }; }
    try { if (tg && typeof tg.openLink === 'function') tg.openLink(link); else window.open(link, '_blank', 'noopener'); }
    catch (e) { console.error('[billing] openLink:', e && e.message); onState('error'); return { state: 'error' }; }
    onState('external'); return { state: 'external' };
  }
  /** Разовая проверка прав на сервере (кнопка «Проверить оплату»). */
  async function checkOwned(productId) {
    try { const ent = await fetchEntitlements();
      const owned = (ent.products || []).includes(productId) && (!(ent.exp || {})[productId] || ent.exp[productId] > Date.now());
      return owned ? { state: 'done', ent } : { state: 'pending' };
    } catch { return { state: 'error' }; }
  }
  return { enabled, checkout, checkoutExternal, checkOwned, fetchEntitlements };
}
