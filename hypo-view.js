// «Проверка в 3 шага»: триггер → проверочные вопросы → повторная реакция → сила гипотезы.
import { h, L, LA, t, tp, data, render, nav, topbar, loadJson, CFG } from './ctx.js?v=test6';
import { read, KEYS } from './store.js?v=test6';
import { hasAccess } from './access.js?v=test6';
import { openPaywall, lockCard } from './paywall.js?v=test6';
import { proLoader } from './services.js?v=test6';
import { evaluate, FAMILIES } from './hypo.js?v=test6';

const HY = { theme: null, baseline: null, asked: new Set(), recurred: new Set() };
const ent = () => read(KEYS.ent, {});
const H = () => tp.hypo;
const steps = (n) => h('p', { class: 'muted sub' }, H().step(n));
const list = (arr) => h('ul', {}, ...arr.map((x) => h('li', {}, x)));
const toggle = (label, sub, on, onclick) => {
  const b = h('button', { class: 'opt', type: 'button', 'aria-pressed': String(on) }, h('strong', {}, label), sub ? h('span', { class: 'sub muted' }, ' ' + sub) : '');
  b.addEventListener('click', () => { const v = onclick(); b.setAttribute('aria-pressed', String(v)); });
  return b;
};

export async function openHypo() {
  render(topbar(H().title), h('p', { class: 'muted' }, tp.load.loading));
  try { if (!data.hypo) data.hypo = await loadJson('chitay_hypo.json'); } catch { render(topbar(H().title), h('div', { class: 'card' }, t.loadError)); return; }
  let themes = [...data.hypo.free], note = null;
  if (hasAccess('cheatsheets', ent(), CFG)) {
    try { themes = [...themes, ...(await proLoader.load('hypothesis')).themes]; }
    catch (e) { const c = (e && e.code) || 'network'; note = c === 'previewMissing' ? 'preview' : (tp.load[c] || tp.load.network); }
  } else note = 'locked';
  screenThemes(themes, note);
}

function screenThemes(themes, note) {
  render(topbar(H().title), h('div', { class: 'card hero' }, h('p', { class: 'hook' }, L(data.hypo.caption)), h('p', {}, H().intro)), steps(1),
    h('h3', {}, H().pickTheme),
    ...themes.map((th) => h('button', { class: 'tile row-tile', type: 'button', onclick: () => screenTrigger(th, themes, note) },
      h('span', { class: 'tile-title' }, L(th.title)), h('span', { class: 'tile-sub' }, L(th.trigger)),
      h('span', { class: 'badge ' + (th.tier === 'free' ? 'free' : 'pro') }, th.tier === 'free' ? tp.badges.free : tp.badges.pro))),
    note === 'locked' ? h('div', { class: 'card pro-card' }, h('span', { class: 'badge pro' }, tp.badges.pro), h('p', {}, H().moreLocked),
      h('button', { class: 'btn', onclick: () => openPaywall('cheatsheets') }, tp.pay.homeLink)) : '',
    note === 'preview' ? lockCard('cheatsheets') : '',
    note && note !== 'locked' && note !== 'preview' ? h('p', { class: 'muted sub' }, note) : '');
}

function screenTrigger(th, themes, note) {
  HY.theme = th; HY.baseline = null; HY.asked = new Set(); HY.recurred = new Set();
  const go = h('button', { class: 'btn', disabled: true, onclick: screenQuestions }, H().toQuestions);
  const pick = (v) => { HY.baseline = v; go.disabled = false; return true; };
  const yes = h('button', { class: 'opt', type: 'button', 'aria-pressed': 'false' }, H().baselineYes);
  const no = h('button', { class: 'opt', type: 'button', 'aria-pressed': 'false' }, H().baselineNo);
  yes.addEventListener('click', () => { pick(true); yes.setAttribute('aria-pressed', 'true'); no.setAttribute('aria-pressed', 'false'); });
  no.addEventListener('click', () => { pick(false); no.setAttribute('aria-pressed', 'true'); yes.setAttribute('aria-pressed', 'false'); });
  render(topbar(L(th.title)), steps(1), h('div', { class: 'card' }, h('h3', {}, H().triggerTitle), h('p', {}, L(th.trigger)),
    h('h3', {}, H().altTitle), list(LA(th.alt))),
    h('h3', {}, L(data.hypo.baselineQ)), yes, no, go,
    h('button', { class: 'btn secondary', onclick: () => screenThemes(themes, note) }, H().otherTheme));
}

function screenQuestions() {
  const th = HY.theme;
  const next = h('button', { class: 'btn', disabled: true, onclick: screenReaction }, H().toReaction);
  const cards = th.questions.map((q, i) => h('div', { class: 'card' }, h('span', { class: 'tag signal' }, H().qType[q.type]),
    h('p', { class: 'hook' }, '«' + L(q.text) + '»'), h('p', { class: 'sub muted' }, H().listen + ' ' + L(q.listenFor)),
    toggle(H().asked, '', false, () => { if (HY.asked.has(i)) HY.asked.delete(i); else HY.asked.add(i); next.disabled = HY.asked.size === 0; return HY.asked.has(i); })));
  render(topbar(L(th.title)), steps(2), h('p', { class: 'banner' }, L(data.hypo.fairNote)), h('p', {}, H().questionsLead), ...cards, next);
}

function screenReaction() {
  const th = HY.theme;
  const go = h('button', { class: 'btn', disabled: true, onclick: screenResult }, H().showResult);
  const none = toggle(H().noneRecurred, '', false, () => { HY.recurred.clear(); document.querySelectorAll('.fam').forEach((b) => b.setAttribute('aria-pressed', 'false')); go.disabled = false; return true; });
  const fams = data.hypo.families.map((f) => {
    const b = toggle(L(f.label), L(f.hint), false, () => {
      if (HY.recurred.has(f.id)) HY.recurred.delete(f.id); else HY.recurred.add(f.id);
      none.setAttribute('aria-pressed', 'false'); go.disabled = false; return HY.recurred.has(f.id);
    });
    b.classList.add('fam'); return b;
  });
  render(topbar(L(th.title)), steps(3), h('h2', {}, H().reactionTitle), h('p', { class: 'muted' }, H().reactionLead), ...fams, none, go);
}

function screenResult() {
  const r = evaluate({ baseline: HY.baseline, asked: HY.asked.size, recurred: [...HY.recurred] });
  const S = data.hypo.strengths[r.level];
  render(topbar(H().title),
    h('div', { class: 'status strength-' + r.level }, h('div', { class: 'label' }, H().strengthLabel), h('div', { class: 'tier' }, L(S.title)), h('p', {}, L(S.text)),
      r.capped ? h('p', { class: 'sub' }, L(data.hypo.capNote)) : ''),
    h('div', { class: 'card' }, h('h3', {}, H().tacticsTitle), list(LA(S.tactics))),
    h('div', { class: 'card' }, h('h3', {}, H().altTitle), list(LA(HY.theme.alt)), h('p', { class: 'sub muted' }, L(data.hypo.alwaysAdd))),
    h('button', { class: 'btn', onclick: openHypo }, H().again),
    h('button', { class: 'btn secondary', onclick: () => nav.back() }, tp.back));
}
