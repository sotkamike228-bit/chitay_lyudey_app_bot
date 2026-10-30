import { h, tp, tg, CFG, render, nav, topbar, toast } from './ctx.js?v=test6';
import { read, write, KEYS } from './store.js?v=test6';
import { ownedProducts } from './access.js?v=test6';
import { PRODUCTS, perMonth, priceMain, priceAlt } from './pricing.js?v=test6';
import { billing, proLoader } from './services.js?v=test6';

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
  const checkBox = h('div', { class: 'pay-check' });
  const showCheck = (productId) => {
    const b = h('button', { class: 'btn secondary', type: 'button', onclick: async () => {
      b.disabled = true; say(P.states.checking);
      const r = await billing.checkOwned(productId); b.disabled = false;
      if (r.state === 'done') { write(KEYS.ent, { products: r.ent.products || [], exp: r.ent.exp || {} }); proLoader.clear(); toast(P.states.done); screen(); return; }
      say(r.state === 'pending' ? P.states.pending : P.states.error);
    } }, P.methods.check);
    checkBox.replaceChildren(b);
  };

  const plan = (p) => {
    const L = P.plans[p.id]; const has = owned.includes(p.id);
    const finish = (r) => { write(KEYS.ent, { products: r.ent.products || [], exp: r.ent.exp || {} }); proLoader.clear(); toast(P.states.done); screen(); };
    const run = (fn) => async () => {
      if (busy) return; busy = true; btns.forEach((b) => { b.disabled = true; });
      let r = { state: 'error' };
      try { r = await fn((st) => say(st === 'stub' ? P.stubTap(L.name) : P.states[st])); }
      catch (e) { say(P.states.error); alert('Ошибка оформления: ' + (e && e.message)); console.error('[paywall] checkout:', e && e.message); }
      busy = false;
      if (r.state === 'done') { finish(r); return; }
      if (r.state === 'external') showCheck(p.id);
      btns.forEach((b) => { b.disabled = has; });
    };
    const mk = (cls, label, fn) => { const b = h('button', { class: 'btn pay-btn ' + cls, type: 'button', disabled: has, onclick: run(fn) }, label); btns.push(b); return b; };
    const payBtns = has ? h('button', { class: 'btn secondary', type: 'button', disabled: true }, P.ownedBadge)
      : h('div', { class: 'pay-btns', role: 'group', 'aria-label': P.methods.or },
        mk('pay-card', P.methods.cardPrice(p), (cb) => billing.checkoutExternal(p.id, 'card', cb)),
        mk('pay-crypto', P.methods.cryptoPrice(p), (cb) => billing.checkoutExternal(p.id, 'crypto', cb)),
        h('p', { class: 'pay-hint' }, P.methods.cryptoNote),
        mk('pay-stars', P.methods.starsPrice(p), (cb) => billing.checkout(p.id, cb)));
    const flag = p.id === 'pro_lifetime';
    const mo = PRODUCTS.find((x) => x.days === 30);
    return h('div', { class: 'card plan' + (has ? ' owned' : '') + (flag ? ' plan-flagship' : '') },
      flag ? h('div', { class: 'plan-ribbon' }, P.bestBadge) : '',
      h('div', { class: 'plan-head' }, h('h3', {}, L.name)),
      flag && mo ? h('p', { class: 'plan-save' }, P.payback(Math.ceil(p.stars / mo.stars))) : '',
      h('p', { class: 'plan-price' }, h('span', { class: 'pp-main' }, priceMain(p)), ' ', h('span', { class: 'pp-alt' }, priceAlt(p))), h('p', { class: 'sub muted' }, L.note(perMonth(p))), h('p', { class: 'sub' }, L.what), payBtns);
  };
  const btns = [];
  const ORDERED = [...PRODUCTS].sort((a, b) => (b.id === 'pro_lifetime') - (a.id === 'pro_lifetime'));
  const plans = ORDERED.map(plan);

  render(topbar(P.homeLink),
    h('h1', {}, P.title), h('p', { class: 'muted' }, P.sub),
    h('ul', { class: 'benefits' }, ...P.benefits.map((b) => h('li', {}, b))),
    CFG.apiBase ? '' : h('div', { class: 'banner' }, P.stubBanner),
    ...plans, status, checkBox,
    h('p', { class: 'pay-note' }, P.payNote),
    h('button', { class: 'btn secondary', onclick: () => nav.back() }, tp.close));
}
