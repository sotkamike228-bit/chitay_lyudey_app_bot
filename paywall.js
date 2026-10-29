import { h, tp, tg, CFG, render, nav, topbar, toast } from './ctx.js?v=test2';
import { read, write, KEYS } from './store.js?v=test2';
import { ownedProducts } from './access.js?v=test2';
import { PRODUCTS, perMonth } from './pricing.js?v=test2';
import { billing, proLoader } from './services.js?v=test2';

/** Карточка «Доступно в полной версии»: вместо технических заглушек. extra — дополнительные кнопки. */
export function lockCard(feature, ...extra) {
  return h('div', { class: 'card lock-card' },
    h('p', { class: 'lock-title' }, tp.lockCard.title),
    h('p', { class: 'lock-text' }, tp.load.previewMissing),
    h('button', { class: 'btn', type: 'button', onclick: () => openPaywall(feature) }, tp.lockCard.btn), ...extra);
}

/** Экран тарифов. Пока сервера нет (apiBase пуст), тап по тарифу ничего не списывает. */
export function openPaywall() {
  nav.go(screen);
}

function screen() {
  const P = tp.pay;
  const owned = ownedProducts(read(KEYS.ent, {}));
  const status = h('p', { class: 'pay-status', role: 'status', 'aria-live': 'polite' });
  const say = (msg) => { status.textContent = msg || ''; };
  let busy = false;

  const plan = (p) => {
    const L = P.plans[p.id]; const has = owned.includes(p.id);
    const btn = h('button', { class: 'btn' + (p.id === 'pro_lifetime' ? ' cta-gb' : ' secondary'), type: 'button', disabled: has,
      onclick: async () => {
        if (busy) return; busy = true; btns.forEach((b) => { b.disabled = true; });
        let r = { state: 'error' };
        try { r = await billing.checkout(p.id, (st) => say(st === 'stub' ? P.stubTap(L.name) : P.states[st])); }
        catch (e) { say(P.states.error); alert('Ошибка оформления: ' + (e && e.message)); console.error('[paywall] checkout:', e && e.message); }
        if (r.state === 'done') {
          busy = false; write(KEYS.ent, { products: r.ent.products || [], exp: r.ent.exp || {} }); proLoader.clear(); toast(P.states.done); screen(); return;
        }
        busy = false; btns.forEach((b, i) => { b.disabled = owned.includes(ORDERED[i].id); });
      } }, has ? P.ownedBadge : L.btn);
    btns.push(btn);
    const flag = p.id === 'pro_lifetime';
    const mo = PRODUCTS.find((x) => x.days === 30);
    return h('div', { class: 'card plan' + (has ? ' owned' : '') + (flag ? ' plan-flagship' : '') },
      flag ? h('div', { class: 'plan-ribbon' }, P.bestBadge) : '',
      h('div', { class: 'plan-head' }, h('h3', {}, L.name), p.days === null ? h('span', { class: 'badge pro sm' }, P.onceBadge) : ''),
      flag && mo ? h('p', { class: 'plan-save' }, P.payback(Math.ceil(p.stars / mo.stars))) : '',
      h('p', { class: 'plan-price' }, `${p.stars} ⭐`), h('p', { class: 'sub muted' }, L.note(perMonth(p))), h('p', { class: 'sub' }, L.what), btn);
  };
  const btns = [];
  const ORDERED = [...PRODUCTS].sort((a, b) => (b.id === 'pro_lifetime') - (a.id === 'pro_lifetime'));
  const plans = ORDERED.map(plan);

  render(topbar(P.homeLink),
    h('h1', {}, P.title), h('p', { class: 'muted' }, P.sub),
    h('ul', { class: 'benefits' }, ...P.benefits.map((b) => h('li', {}, b))),
    CFG.apiBase ? '' : h('div', { class: 'banner' }, P.stubBanner),
    ...plans, status,
    h('p', { class: 'sub muted' }, P.payNote), h('p', { class: 'sub' }, P.refund(CFG.refundDays)), h('p', { class: 'sub muted' }, P.free),
    h('button', { class: 'btn secondary', onclick: () => nav.back() }, tp.close));
}
