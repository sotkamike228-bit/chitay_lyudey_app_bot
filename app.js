import { CONFIG } from './config.js';
import { HELP } from './help.js';
import { T } from './ui-text.js';
import {
  MAX_PICK, playableCases, scoreObservations, scoreAction, missedSignals, percent, tierFor,
  encodeChallenge, parseChallenge, shuffle, compareChallenge,
} from './engine.js';

const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
const root = document.getElementById('app');
const KEY = 'chitay.quiz.v1';

// ---------- язык, хранилище ----------
const tgLang = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code;
const lang = ((tgLang || navigator.language || 'ru').toLowerCase().startsWith('ru')) ? 'ru' : 'en';
const t = T[lang];
document.documentElement.lang = lang;
document.title = t.appName;

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function save(patch) { try { localStorage.setItem(KEY, JSON.stringify({ ...load(), ...patch })); } catch { /* хранилище недоступно: работаем без него */ } }

// ---------- состояние ----------
let quiz = null;
const S = { age16: false, age18: null, cases: [], i: 0, total: 0, results: [], phase: 'intro', picked: [], opts: [], actOpts: [], challenge: null };
const stored = load();
S.age16 = !!stored.age16;
S.age18 = typeof stored.age18 === 'boolean' ? stored.age18 : null;
const qsC = new URLSearchParams(location.search).get('c');
const startParam = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || (qsC != null ? 'c' + qsC : '');
S.challenge = parseChallenge(startParam);

// ---------- помощники ----------
const L = (o) => (o && (o[lang] || o.en || o.ru)) || '';
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, ''); else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) el.append(kid instanceof Node ? kid : document.createTextNode(kid ?? ''));
  return el;
}
function render(...nodes) { root.replaceChildren(...nodes); window.scrollTo({ top: 0 }); }
function haptic(kind) { try { tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(kind || 'light'); } catch { /* нет */ } }
function toast(msg) { const el = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(el); setTimeout(() => el.remove(), 1800); }
function progress() {
  const n = S.cases.length;
  return h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': n, 'aria-valuenow': S.i },
    ...S.cases.map((_, k) => h('div', { class: 'seg ' + (k < S.i ? 'done' : k === S.i ? 'now' : '') })));
}

// ---------- экраны ----------
function screenAge() {
  render(
    h('h1', {}, t.appName), h('p', { class: 'muted' }, t.subtitle),
    h('div', { class: 'card' }, h('h2', {}, t.ageTitle), h('p', { class: 'sub muted' }, t.age16Note),
      h('button', { class: 'btn', onclick: () => { S.age16 = true; save({ age16: true }); screenIntro(); } }, t.age16)),
  );
}

function screenIntro() {
  if (!S.age16) return screenAge();
  const nodes = [h('h1', {}, t.appName), h('p', { class: 'muted' }, t.subtitle),
    h('div', { class: 'card' }, h('p', { class: 'hook' }, t.tagline), h('p', {}, t.introLead))];
  if (S.challenge != null) nodes.push(h('div', { class: 'banner' }, t.challenge(S.challenge)));
  if (typeof stored.best === 'number') nodes.push(h('p', { class: 'muted sub' }, t.best(stored.best)));
  nodes.push(h('button', { class: 'btn', onclick: begin }, t.start));
  render(...nodes);
}

function begin() {
  if (S.age18 === null) return screenAge18();
  startRound();
}
function screenAge18() {
  render(h('div', { class: 'card' }, h('h2', {}, t.age18Q),
    h('button', { class: 'btn', onclick: () => { S.age18 = true; save({ age18: true }); startRound(); } }, t.age18Yes),
    h('button', { class: 'btn secondary', onclick: () => { S.age18 = false; save({ age18: false }); startRound(); } }, t.age18No)));
}

function startRound() {
  S.cases = playableCases(quiz, S.age18 === true);
  S.i = 0; S.total = 0; S.results = []; S.picked = [];
  screenObserve();
}

function current() { return S.cases[S.i]; }

function screenObserve() {
  const c = current();
  S.phase = 'observe'; S.picked = [];
  S.opts = shuffle(c.observations);
  const next = h('button', { class: 'btn', disabled: true, onclick: screenAction }, t.toAction);
  const list = S.opts.map((o) => {
    const b = h('button', { class: 'opt', type: 'button', 'aria-pressed': 'false' }, L(o.text));
    b.addEventListener('click', () => {
      const on = S.picked.includes(o.id);
      if (on) S.picked = S.picked.filter((x) => x !== o.id);
      else if (S.picked.length < MAX_PICK) S.picked.push(o.id);
      else return;
      b.setAttribute('aria-pressed', String(S.picked.includes(o.id)));
      next.disabled = S.picked.length === 0; haptic('light');
    });
    return b;
  });
  render(progress(), h('p', { class: 'muted sub' }, t.caseOf(S.i + 1, S.cases.length)),
    h('h1', {}, L(c.title)), h('p', { class: 'hook' }, L(c.hook)),
    h('div', { class: 'card' }, L(c.scene)),
    h('h3', {}, L(c.observePrompt) || t.pick), ...list, next);
}

function screenAction() {
  const c = current();
  S.phase = 'action';
  S.actOpts = shuffle(c.actions);
  render(progress(), h('p', { class: 'muted sub' }, t.caseOf(S.i + 1, S.cases.length)),
    h('h2', {}, L(c.actionPrompt) || t.actionTitle),
    ...S.actOpts.map((a) => h('button', { class: 'opt', type: 'button', onclick: () => screenDebrief(a.id) }, L(a.text))));
}

function screenDebrief(actionId) {
  const c = current();
  S.phase = 'debrief';
  const obsPts = scoreObservations(quiz, c, S.picked);
  const actPts = scoreAction(quiz, c, actionId);
  const pts = obsPts + actPts;
  S.total += pts;
  S.results.push({ id: c.id, pts, missed: missedSignals(c, S.picked).map((o) => L(o.text)) });
  const a = c.actions.find((x) => x.id === actionId);
  const last = S.i === S.cases.length - 1;
  const obsRows = c.observations.map((o) => h('div', { class: 'row' + (S.picked.includes(o.id) ? ' picked' : '') },
    h('span', { class: 'tag ' + o.kind }, t.kinds[o.kind]), S.picked.includes(o.id) ? h('span', { class: 'muted sub' }, `(${t.yourPick})`) : '',
    h('p', {}, L(o.text)), h('p', { class: 'sub muted' }, L(o.why))));
  render(progress(), h('p', { class: 'muted sub' }, t.caseOf(S.i + 1, S.cases.length)),
    h('h2', {}, t.debriefTitle),
    h('div', { class: 'card' }, h('h3', {}, t.observed), ...obsRows),
    h('div', { class: 'card' }, h('h3', {}, t.actionResult),
      h('p', {}, L(a.text)), h('p', { class: 'sub muted' }, L(a.why))),
    h('div', { class: 'card' }, L(c.debrief),
      h('h3', {}, t.altTitle), h('ul', {}, ...(c.altExplanations[lang] || c.altExplanations.en).map((x) => h('li', {}, x))),
      h('h3', {}, t.checkTitle), h('p', {}, '«' + L(c.checkQuestion) + '»'),
      h('p', { class: 'sub muted' }, L(c.reliabilityNote))),
    h('p', { class: 'muted sub' }, t.points(pts)),
    h('button', { class: 'btn', onclick: () => { if (last) screenResult(); else { S.i++; screenObserve(); } } }, last ? t.last : t.next));
}

function shareLink(pct) {
  const param = encodeChallenge(pct);
  if (CONFIG.miniAppLink) return `${CONFIG.miniAppLink}${CONFIG.miniAppLink.includes('?') ? '&' : '?'}startapp=${param}`;
  const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('c', String(pct));
  return u.toString();
}

async function doShare(text, pct) {
  const url = shareLink(pct);
  if (tg && typeof tg.openTelegramLink === 'function') {
    tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    return;
  }
  if (navigator.share) { try { await navigator.share({ text, url }); return; } catch { /* отмена */ } }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast(t.copied); } catch { toast(url); }
}

function screenResult() {
  S.phase = 'result';
  const n = S.cases.length;
  const pct = percent(S.total, n, quiz);
  const tier = tierFor(quiz, pct);
  const max = n * quiz.scoring.maxPerCase;
  if (typeof load().best !== 'number' || pct > load().best) { save({ best: pct }); stored.best = pct; }
  const blind = S.results.flatMap((r) => r.missed).slice(0, 2);
  const cmp = compareChallenge(pct, S.challenge);
  const nodes = [
    h('div', { class: 'status tier-' + tier.id },
      h('div', { class: 'label' }, t.resultTitle),
      h('div', { class: 'tier' }, L(tier.title)),
      h('div', { class: 'pct' }, t.scoreLine(pct, S.total, max)),
      h('p', {}, L(tier.line)),
      h('p', { class: 'foot-note' }, L(quiz.statusCardFooter))),
  ];
  if (cmp) nodes.push(h('div', { class: 'banner' }, t[cmp](S.challenge)));
  nodes.push(h('div', { class: 'card' }, h('h3', {}, t.blind),
    blind.length ? h('ul', {}, ...blind.map((x) => h('li', {}, x))) : h('p', {}, t.blindNone)));
  nodes.push(h('button', { class: 'btn', onclick: () => doShare(t.shareText(L(tier.title), pct), pct) }, t.share));
  nodes.push(h('button', { class: 'btn secondary', onclick: () => doShare(t.challengeText(L(tier.title), pct), pct) }, t.challengeBtn));
  nodes.push(h('button', { class: 'btn secondary', onclick: startRound }, t.again));
  render(...nodes);
}

function screenHelp() {
  const data = HELP[lang];
  const box = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': t.helpTitle },
    h('div', { class: 'sheet' }, h('h1', {}, t.helpTitle), h('p', {}, data.intro),
      h('div', { class: 'card' }, ...data.items.map((it) => h('div', { class: 'row' }, h('p', {}, it.name),
        h('a', { class: 'tel', href: 'tel:' + it.dial }, it.display)))),
      h('p', { class: 'sub muted' }, data.note),
      h('button', { class: 'btn secondary', onclick: () => box.remove() }, t.back)));
  document.body.append(box);
}

// ---------- запуск ----------
document.getElementById('disclaimer').textContent = t.disclaimer;
const helpBtn = document.getElementById('helpLink'); helpBtn.textContent = t.help; helpBtn.addEventListener('click', screenHelp);
if (CONFIG.privacyUrl) { const a = document.getElementById('privacyLink'); a.hidden = false; a.href = CONFIG.privacyUrl; a.textContent = t.privacy; }

if (tg) {
  try { tg.ready(); tg.expand(); tg.setHeaderColor && tg.setHeaderColor('secondary_bg_color'); } catch { /* старый клиент */ }
}

fetch('chitay_quiz.json', { cache: 'no-cache' })
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((q) => { quiz = q; screenIntro(); })
  .catch(() => render(h('div', { class: 'card' }, t.loadError)));
