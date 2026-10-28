// «Экспресс-калибровка за 2 минуты»: пять шагов; первые два открыты полностью, тонкие приёмы возврата к теме в PRO.
import { h, tp, render, nav, topbar } from './ctx.js';
import { openPaywall } from './paywall.js';
import { openProtocol } from './protocol-view.js';

export function openExpress() {
  const X = tp.express;
  render(topbar(X.title), h('div', { class: 'card hero' }, h('p', { class: 'hook' }, X.lead)),
    h('ol', { class: 'steps' }, ...X.steps.map((s, i) => h('li', {}, h('strong', {}, s[0]), h('div', { class: 'sub' }, s[1]),
      i >= 2 ? h('div', { class: 'sub muted' }, '🔒 ' + X.pro) : ''))),
    h('p', { class: 'muted sub' }, X.note),
    h('button', { class: 'btn', onclick: () => nav.go(openProtocol) }, X.toProtocol),
    h('button', { class: 'btn secondary', onclick: () => openPaywall('cheatsheets') }, tp.pay.homeLink));
}
