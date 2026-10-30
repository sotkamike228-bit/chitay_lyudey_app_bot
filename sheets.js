// «Шпаргалки»: свидания, переговоры, защита от давления. Данные: chitay_pro.json → cheatsheets.
import { h, html, L, LA, t, tp, data, render, nav, topbar, loadJson, CFG } from './ctx.js?v=test5';
import { read, patch, KEYS } from './store.js?v=test5';
import { hasAccess } from './access.js?v=test5';
import { openPaywall, lockCard } from './paywall.js?v=test5';
import { openCalibration } from './quiz.js?v=test5';
import { openHelp } from './help-view.js?v=test5';
import { openHypo } from './hypo-view.js?v=test5';
import { openProtocol } from './protocol-view.js?v=test5';
import { openExpress } from './express-view.js?v=test5';
import { ICONS } from './icons.js?v=test5';
import { proLoader, refreshEntitlements } from './services.js?v=test5';

const S = new Proxy({}, { get: (_, k) => tp.sheets[k] });   // живой доступ: язык может смениться на лету
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
  if (code === 'previewMissing') return lockCard(feature);
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
const accOpen = (title, ...kids) => h('details', { class: 'acc', open: true }, h('summary', {}, title), h('div', { class: 'acc-body' }, ...kids));
/** Стильная карточка замка под открытым образцом. */
function unlockCard(feature) {
  return h('div', { class: 'card lock-card pro-lock' }, h('span', { class: 'badge pro' }, tp.badges.pro), h('p', { class: 'lock-title' }, S.sheetLock.title), h('p', {}, S.sheetLock.text),
    h('button', { class: 'btn cta-gb', type: 'button', onclick: () => openPaywall(feature) }, S.sheetLock.btn));
}
const negCard = (c, open) => (open ? accOpen : acc)(L(c.title),
  block(S.seen, lst(c.seen)), block(S.meaning, para(c.meaning)), block(S.alt, lst(c.alt)), block(S.doThis, lst(c.doThis || c.steps)),
  block(S.never, lst(c.neverSay)), block(S.say, lst(c.saySomething)));

async function ensure() {
  if (!data.pro) data.pro = await loadJson('chitay_pro.json');
  return data.pro.cheatsheets.sections;
}

export async function openSheets() {
  let secs;
  try { secs = await ensure(); } catch { render(topbar(S.title), h('div', { class: 'card' }, t.loadError)); return; }
  const row = (id, sub, onclick, tag, title) => h('button', { class: 'tile row-tile', type: 'button', onclick },
    h('span', { class: 'tile-title' }, title || S[id]), h('span', { class: 'tile-sub' }, sub), tag ? h('span', { class: 'badge ' + tag[0] }, tag[1]) : '');
  const group = (key, ...rows) => { const g = S.groups[key];
    return h('section', { class: 'sgroup sg-' + key }, h('div', { class: 'sg-head' }, html('span', { class: 'sg-ico' }, ICONS[g[0]]), h('h2', {}, g[1])),
      h('div', { class: 'sg-chips' }, ...g[2].map((x) => h('span', { class: 'sg-chip' }, x))), ...rows); };
  render(topbar(S.title), h('p', { class: 'muted sub' }, S.intro),
    group('biz', row('negotiation', S.negotiationSub, () => nav.go(openNegotiation), ['pro', tp.badges.pro])),
    group('rel', row('dating', S.datingSub, () => nav.go(openDating), ['pro', tp.badges.pro], S.datingRow)),
    group('prot', row('protection', S.protectionSub, () => nav.go(openProtection), ['free', S.freeBadge + ' + PRO'])),
    group('tools', row('express', S.expressSub, () => nav.go(openExpress), ['free', S.freeBadge]),
      row('protocol', S.protocolSub, () => nav.go(openProtocol), ['free', S.freeBadge + ' + PRO']),
      row('hypo', S.hypoSub, () => nav.go(openHypo), ['free', S.freeBadge + ' + PRO'])),
    h('div', { class: 'card pro-card' }, h('p', {}, S.elite), h('button', { class: 'btn secondary', onclick: () => openPaywall('cheatsheets') }, tp.pay.homeLink)),
    h('p', { class: 'muted sub' }, S.discl));
}

const sec = (id) => data.pro.cheatsheets.sections.find((s) => s.id === id);

function openDating() {
  const d = sec('dating');
  if (!hasAccess('cheatsheets', ent(), CFG)) {
    const q = d.demoQuestion;
    render(topbar(S.dating), h('p', { class: 'muted sub' }, S.demoNote), q ? accOpen(L(q.text), block(S.when, para(q.when)), block(S.listen, para(q.listenFor))) : '', unlockCard('cheatsheets')); return;
  }
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
    ...[...(d.demoQuestion ? [d.demoQuestion] : []), ...d.checkQuestions.items].map((q) => acc(L(q.text), block(S.when, para(q.when)), block(S.listen, para(q.listenFor)))));
}

function openNegotiation() {
  const n = sec('negotiation');
  if (!hasAccess('cheatsheets', ent(), CFG)) {
    render(topbar(S.negotiation), h('div', { class: 'card banner' }, L(n.guardrail)), h('p', { class: 'muted sub' }, S.demoNote), n.demoCard ? negCard(n.demoCard, true) : '', unlockCard('cheatsheets')); return;
  }
  withContent('negotiation', 'cheatsheets', S.negotiation, (c) => renderNegotiation({ ...n, ...c }));
}

function renderNegotiation(n) {
  render(topbar(S.negotiation), h('div', { class: 'card banner' }, L(n.guardrail)),
    ...[...(n.demoCard ? [n.demoCard] : []), ...n.cards].map((c, i) => negCard(c, i === 0)),
    h('div', { class: 'card' }, h('p', { class: 'hook' }, S.calibCta), h('p', {}, tp.calibPitch),
      h('button', { class: 'btn', onclick: () => nav.go(openCalibration) }, S.calibGo)));
}

const SCRIPT_LEVELS = ['soft', 'firm', 'exit'];
function scriptsBlock(x) {
  if (!x.scripts) return lst(x.sayThis) ? block(S.sayThis, lst(x.sayThis)) : '';
  return h('div', { class: 'blk' }, h('h3', {}, S.scriptsTitle),
    ...SCRIPT_LEVELS.filter((k) => x.scripts[k]).map((k) => h('div', { class: 'script ' + k }, h('span', { class: 'lvl' }, S.scriptLevels[k]), lst(x.scripts[k]))));
}
/** Мини-тренажёр карточки: вопрос и три варианта, после выбора показываем пояснение. */
function miniTrainer(m) {
  if (!m || !m.opts) return '';
  const out = h('p', { class: 'sub', role: 'status' }, '');
  const btns = m.opts.map((o) => {
    const b = h('button', { class: 'opt', type: 'button' }, L(o.t));
    b.addEventListener('click', () => {
      btns.forEach((x) => { x.disabled = true; });
      b.setAttribute('aria-pressed', 'true');
      out.textContent = (o.ok ? S.miniRight : S.miniWrong) + ' ' + L(o.why);
      out.className = 'sub ' + (o.ok ? 'mini-ok' : 'mini-bad');
    });
    return b;
  });
  return h('div', { class: 'blk mini' }, h('h3', {}, S.miniTitle), h('p', {}, L(m.q)), ...btns, out);
}
/** Карточка приёма давления. Старые поля (seen, whyItWorks, response, sayThis, escalate) остаются; новые необязательны. */
function patternCard(x, open) {
  const title = (x.tier === 'free' ? S.sample + ': ' : '') + L(x.title);
  const node = h('details', { class: 'acc', ...(open ? { open: true } : {}) }, h('summary', {}, title),
    h('div', { class: 'acc-body' },
      block(S.sounds, lst(x.sounds)), block(S.purpose, para(x.purpose)),
      block(S.seen, para(x.seen)), block(S.why, para(x.whyItWorks)), h('p', { class: 'sub muted' }, L(x.reliabilityNote)),
      block(S.doThis, lst(x.response)), scriptsBlock(x), block(S.dont, lst(x.dont)),
      block(S.escalate, para(x.escalate)), miniTrainer(x.mini)));
  return node;
}

function openProtection() {
  const p = sec('protection');
  const proOk = hasAccess('protection', ent(), CFG);
  const demo = p.demoPattern;                         // открытый образец: экран никогда не пустой
  const part = h('div', {});
  const loadPart = async () => {
    part.replaceChildren(demo ? patternCard(demo, true) : '', h('p', { class: 'muted' }, tp.load.loading));
    try {
      const c = await proLoader.load('protection');
      const full = { ...p, ...c };
      const cards = [...(demo ? [demo] : []), ...full.patterns];
      part.replaceChildren(h('p', { class: 'muted sub' }, S.patternsHint), ...cards.map((x, i) => patternCard(x, i === 0)),
        h('h2', {}, L(full.nlpClaims.title)), h('p', { class: 'muted sub' }, L(full.nlpClaims.rule)),
        ...full.nlpClaims.items.map((cl) => acc(L(cl.claim),
          h('p', {}, h('span', { class: 'tag ' + (cl.status === 'notConfirmed' ? 'jump' : 'weak') }, S.nlpStatus[cl.status] || cl.status)),
          block(S.evidence, para(cl.evidence)), block(S.doThis, para(cl.whatToDo)))));
    } catch (e) { part.replaceChildren(demo ? patternCard(demo, true) : '', loadError(e, loadPart, 'protection')); }
  };
  render(topbar(S.protection),
    h('div', { class: 'card' }, h('span', { class: 'badge free' }, S.freeBadge), h('h2', {}, L(p.freeCore.title)), para(p.freeCore.text),
      h('p', { class: 'sub' }, S.helpCta), h('button', { class: 'btn secondary', onclick: () => openHelp() }, S.helpBtn)),
    part);
  if (proOk) loadPart();
  else part.replaceChildren(h('p', { class: 'muted sub' }, S.patternsHint), demo ? patternCard(demo, true) : '',
    h('p', { class: 'banner' }, S.moreLocked(12)), lockedNote('protection'));
}
