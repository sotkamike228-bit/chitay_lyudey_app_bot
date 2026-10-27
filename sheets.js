// «Шпаргалки»: свидания (18+), переговоры, защита от давления. Данные: chitay_pro.json → cheatsheets.
import { h, L, LA, t, tp, data, state, render, nav, topbar, loadJson, CFG } from './ctx.js';
import { read, patch, KEYS } from './store.js';
import { hasAccess } from './access.js';
import { openPaywall } from './paywall.js';
import { openCalibration } from './quiz.js';
import { openHelp } from './help-view.js';
import { proLoader, refreshEntitlements } from './services.js';

const S = tp.sheets;
const ent = () => read(KEYS.ent, {});
const list = (arr) => h('ul', {}, ...arr.map((x) => h('li', {}, x)));
const block = (title, node) => (node ? h('div', { class: 'blk' }, h('h3', {}, title), node) : '');
const para = (o) => (o ? h('p', {}, L(o)) : '');
const lst = (o) => { const a = LA(o); if (typeof a === 'string') return a ? h('p', {}, a) : ''; return Array.isArray(a) && a.length ? list(a) : ''; };

function lockedNote(feature) {
  return h('div', { class: 'card pro-card' }, h('span', { class: 'badge pro' }, tp.badges.pro), h('p', {}, S.lockedText),
    h('button', { class: 'btn', onclick: () => openPaywall(feature) }, tp.paywallTitle));
}
/** Показывает «Загружаем…», подгружает платную часть раздела и строит экран. Сервер проверяет право сам. */
function loadError(e, retry, feature) {
  const code = (e && e.code) || 'network';
  if (code === 'locked') { refreshEntitlements(); return lockedNote(feature); }
  return h('div', { class: 'card' }, h('p', {}, tp.load[code] || tp.load.network),
    code === 'network' || code === 'unavailable' ? h('button', { class: 'btn', onclick: retry }, tp.load.retry) : '');
}
async function withContent(section, feature, title, build) {
  render(topbar(title), h('p', { class: 'muted' }, tp.load.loading));
  const here = () => document.querySelector('.topbar-title')?.textContent === title;
  try { const c = await proLoader.load(section); if (here()) build(c); }
  catch (e) { if (here()) render(topbar(title), loadError(e, () => withContent(section, feature, title, build), feature)); }
}

const acc = (title, ...kids) => h('details', { class: 'acc' }, h('summary', {}, title), h('div', { class: 'acc-body' }, ...kids));

async function ensure() {
  if (!data.pro) data.pro = await loadJson('chitay_pro.json');
  return data.pro.cheatsheets.sections;
}

export async function openSheets() {
  let secs;
  try { secs = await ensure(); } catch { render(topbar(S.title), h('div', { class: 'card' }, t.loadError)); return; }
  const adultOk = state.age18 === true;
  const row = (id, sub, onclick, tag) => h('button', { class: 'tile row-tile', type: 'button', onclick },
    h('span', { class: 'tile-title' }, S[id]), h('span', { class: 'tile-sub' }, sub), tag ? h('span', { class: 'badge ' + tag[0] }, tag[1]) : '');
  render(topbar(S.title), h('p', { class: 'muted sub' }, S.intro),
    row('dating', S.datingSub, () => nav.go(openDating), ['pro', '18+']),
    row('negotiation', S.negotiationSub, () => nav.go(openNegotiation), ['pro', tp.badges.pro]),
    row('protection', S.protectionSub, () => nav.go(openProtection), ['free', S.freeBadge + ' + PRO']),
    h('p', { class: 'sub muted' }, adultOk || state.age18 === null ? '' : S.age18Off));
}

const sec = (id) => data.pro.cheatsheets.sections.find((s) => s.id === id);

function openDating() {
  const d = sec('dating');
  if (state.age18 !== true) {
    render(topbar(S.dating), h('div', { class: 'card' }, h('p', {}, state.age18 === false ? S.age18Off : S.age18Need),
      state.age18 === null ? h('button', { class: 'btn', onclick: () => { state.age18 = true; patch(KEYS.core, { age18: true }); nav.replace(openDating); } }, S.age18Btn) : ''));
    return;
  }
  if (!hasAccess('cheatsheets', ent(), CFG)) { render(topbar(S.dating), lockedNote('cheatsheets')); return; }
  withContent('dating', 'cheatsheets', S.dating, (c) => renderDating({ ...d, ...c }));
}

function renderDating(d) {
  const iv = d.interestVsDistance;
  const col = (title, items) => h('div', { class: 'col' }, h('h3', {}, title), list(items.map((x) => L(x.text))));
  render(topbar(S.dating),
    h('div', { class: 'card' }, h('h2', {}, L(iv.title)), h('p', { class: 'hook' }, L(iv.rule)),
      h('div', { class: 'cols' }, col(S.moreInterest, iv.moreOftenWithInterest), col(S.moreDistance, iv.moreOftenWithDistance)),
      h('p', { class: 'sub muted' }, S.reliability[iv.reliability] || ''), h('p', { class: 'banner' }, L(iv.alwaysAdd))),
    h('h2', {}, L(d.checkQuestions.title)),
    ...d.checkQuestions.items.map((q) => acc(L(q.text), block(S.when, para(q.when)), block(S.listen, para(q.listenFor)))));
}

function openNegotiation() {
  const n = sec('negotiation');
  if (!hasAccess('cheatsheets', ent(), CFG)) { render(topbar(S.negotiation), lockedNote('cheatsheets')); return; }
  withContent('negotiation', 'cheatsheets', S.negotiation, (c) => renderNegotiation({ ...n, ...c }));
}

function renderNegotiation(n) {
  render(topbar(S.negotiation), h('div', { class: 'card banner' }, L(n.guardrail)),
    ...n.cards.map((c) => acc(L(c.title),
      block(S.seen, lst(c.seen)), block(S.meaning, para(c.meaning)), block(S.alt, lst(c.alt)), block(S.doThis, lst(c.doThis || c.steps)),
      block(S.never, lst(c.neverSay)), block(S.say, lst(c.saySomething)))),
    h('div', { class: 'card' }, h('p', { class: 'hook' }, S.calibCta), h('p', {}, tp.calibPitch),
      h('button', { class: 'btn', onclick: () => nav.go(openCalibration) }, S.calibGo)));
}

function openProtection() {
  const p = sec('protection');
  const proOk = hasAccess('protection', ent(), CFG);
  const part = h('div', {});
  const loadPart = async () => {
    part.replaceChildren(h('p', { class: 'muted' }, tp.load.loading));
    try {
      const c = await proLoader.load('protection');
      const full = { ...p, ...c };
      part.replaceChildren(...full.patterns.map((x) => acc(L(x.title),
        block(S.seen, para(x.seen)), block(S.why, para(x.whyItWorks)), h('p', { class: 'sub muted' }, L(x.reliabilityNote)),
        block(S.doThis, lst(x.response)), block(S.sayThis, lst(x.sayThis)), block(S.escalate, para(x.escalate))),
      ), h('h2', {}, L(full.nlpClaims.title)), h('p', { class: 'muted sub' }, L(full.nlpClaims.rule)),
      ...full.nlpClaims.items.map((cl) => acc(L(cl.claim),
        h('p', {}, h('span', { class: 'tag ' + (cl.status === 'notConfirmed' ? 'jump' : 'weak') }, S.nlpStatus[cl.status] || cl.status)),
        block(S.evidence, para(cl.evidence)), block(S.doThis, para(cl.whatToDo)))));
    } catch (e) { part.replaceChildren(loadError(e, loadPart, 'protection')); }
  };
  render(topbar(S.protection),
    h('div', { class: 'card' }, h('span', { class: 'badge free' }, S.freeBadge), h('h2', {}, L(p.freeCore.title)), para(p.freeCore.text),
      h('p', { class: 'sub' }, S.helpCta), h('button', { class: 'btn secondary', onclick: () => openHelp() }, S.helpBtn)),
    part);
  if (proOk) loadPart(); else part.replaceChildren(lockedNote('protection'));
}
