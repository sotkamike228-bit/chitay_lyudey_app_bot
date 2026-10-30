// «Тактический протокол верификатора»: одно правило бесплатно (кластер 2+1), четыре в PRO.
import { h, L, LA, tp, data, render, nav, topbar, loadJson, CFG } from './ctx.js?v=test3';
import { read, KEYS } from './store.js?v=test3';
import { hasAccess } from './access.js?v=test3';
import { openPaywall, lockCard } from './paywall.js?v=test3';
import { proLoader } from './services.js?v=test3';

const ent = () => read(KEYS.ent, {});
const P = () => tp.protocol;

export async function openProtocol() {
  render(topbar(P().title), h('p', { class: 'muted' }, tp.load.loading));
  try { if (!data.pro) data.pro = await loadJson('chitay_pro.json'); } catch { render(topbar(P().title), h('div', { class: 'card' }, tp.load.network)); return; }
  const head = data.pro.protocol;
  let methods = [...head.free], note = null;
  if (hasAccess('cheatsheets', ent(), CFG)) {
    try { methods = [...methods, ...(await proLoader.load('protocol')).methods]; }
    catch (e) { const c = (e && e.code) || 'network'; note = c === 'previewMissing' ? 'preview' : (tp.load[c] || tp.load.network); }
  } else note = 'locked';
  screen(head, methods, note);
}

function card(m) {
  return h('div', { class: 'card' },
    h('div', {}, h('strong', {}, L(m.title)), ' ', h('span', { class: 'badge ' + (m.tier === 'free' ? 'free' : 'pro') }, m.tier === 'free' ? tp.badges.free : tp.badges.pro)),
    h('div', { class: 'sec tool' }, h('h4', {}, P().rule), h('p', {}, L(m.rule))),
    h('h4', {}, P().steps), h('ol', {}, ...LA(m.steps).map((s) => h('li', {}, s))),
    m.example ? h('p', {}, h('em', {}, L(m.example))) : '',
    h('div', { class: 'sec caveat' }, h('h4', {}, P().caution), h('p', {}, L(m.caution))));
}

function screen(head, methods, note) {
  render(topbar(L(head.title)), h('div', { class: 'card hero' }, h('p', {}, L(head.intro))),
    h('p', { class: 'muted sub' }, L(head.guardrail)),
    ...methods.map(card),
    note === 'locked' ? h('div', { class: 'card pro-card' }, h('span', { class: 'badge pro' }, tp.badges.pro), h('p', {}, L(head.moreLocked)),
      h('button', { class: 'btn', onclick: () => openPaywall('cheatsheets') }, tp.pay.homeLink)) : '',
    note === 'preview' ? lockCard('cheatsheets') : '',
    note && note !== 'locked' && note !== 'preview' ? h('p', { class: 'muted sub' }, note) : '');
}
