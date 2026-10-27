import { h, t, tp, render, nav, topbar } from './ctx.js';

/** Экран «это раздел PRO». Платежей пока нет: честно говорим об этом, кнопка закрытия видна. */
export function openPaywall(feature) {
  nav.go(() => render(topbar(tp.paywallTitle),
    h('div', { class: 'card pro-card' }, h('span', { class: 'badge pro' }, tp.badges.pro),
      h('h2', {}, tp.paywallTitle), h('p', {}, tp.paywallText),
      h('h3', {}, tp.paywallIncludes), h('ul', {}, ...tp.includes.map((x) => h('li', {}, x))),
      h('p', { class: 'sub muted' }, tp.safetyFree)),
    h('button', { class: 'btn secondary', onclick: () => nav.back() }, tp.close)));
}
