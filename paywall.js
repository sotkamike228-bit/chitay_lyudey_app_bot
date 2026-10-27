import { h, tp, tg, CFG, render, nav, topbar, toast } from './ctx.js';
import { read, write, KEYS } from './store.js';
import { ownedProducts } from './access.js';
import { PRODUCTS, perMonth } from './pricing.js';
import { billing, proLoader } from './services.js';

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
    const btn = h('button', { class: 'btn' + (p.id === 'pack_cheatsheets' ? '' : ' secondary'), type: 'button', disabled: has,
      onclick: async () => {
        if (busy) return; busy = true; btns.forEach((b) => { b.disabled = true; });
        const r = await billing.checkout(p.id, (st) => say(st === 'stub' ? P.stubTap(L.name) : P.states[st]));
        if (r.state === 'done') {
          write(KEYS.ent, { products: r.ent.products || [], exp: r.ent.exp || {} }); proLoader.clear(); toast(P.states.done); screen(); return;
        }
        busy = false; btns.forEach((b, i) => { b.disabled = owned.includes(PRODUCTS[i].id); });
      } }, has ? P.ownedBadge : L.btn);
    btns.push(btn);
    return h('div', { class: 'card plan' + (has ? ' owned' : '') },
      h('div', { class: 'plan-head' }, h('h3', {}, L.name), p.days === null ? h('span', { class: 'badge pro sm' }, P.onceBadge) : ''),
      h('p', { class: 'plan-price' }, `${p.stars} ⭐`), h('p', { class: 'sub muted' }, L.note(perMonth(p))), h('p', { class: 'sub' }, L.what), btn);
  };
  const btns = [];
  const plans = PRODUCTS.map(plan);

  render(topbar(P.homeLink),
    h('h1', {}, P.title), h('p', { class: 'muted' }, P.sub),
    h('ul', { class: 'benefits' }, ...P.benefits.map((b) => h('li', {}, b))),
    CFG.apiBase ? '' : h('div', { class: 'banner' }, P.stubBanner),
    ...plans, status,
    h('p', { class: 'sub muted' }, P.payNote), h('p', { class: 'sub' }, P.refund(CFG.refundDays)), h('p', { class: 'sub muted' }, P.free),
    h('button', { class: 'btn secondary', onclick: () => nav.back() }, tp.close));
}
