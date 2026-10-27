// Квиз из 5 ситуаций и режим калибровки (тот же поток + шаг «уверенность»).
import { h, L, t, tp, lang, data, state, render, nav, haptic, toast, topbar, tg, CFG } from './ctx.js';
import { read, write, patch, KEYS } from './store.js';
import { MAX_PICK, playableCases, scoreObservations, scoreAction, missedSignals, percent, tierFor, encodeChallenge, parseChallenge, shuffle, compareChallenge } from './engine.js';
import { LEVELS, isCorrect, addItem, stats } from './calib.js';
import { openPaywall } from './paywall.js';
import { hasAccess } from './access.js';

const Q = { mode: 'quiz', cases: [], i: 0, total: 0, results: [], picked: [], conf: null, challenge: null };

const qsC = new URLSearchParams(location.search).get('c');
const startParam = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || (qsC != null ? 'c' + qsC : '');
Q.challenge = parseChallenge(startParam);

const ent = () => read(KEYS.ent, {});

function progress() {
  const n = Q.cases.length;
  return h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': n, 'aria-valuenow': Q.i },
    ...Q.cases.map((_, k) => h('div', { class: 'seg ' + (k < Q.i ? 'done' : k === Q.i ? 'now' : '') })));
}
const current = () => Q.cases[Q.i];

// ---------- вход ----------
export function openQuiz() { Q.mode = 'quiz'; screenIntro(); }
export function openCalibration() {
  if (!hasAccess('calibration', ent(), CFG)) return openPaywall('calibration');
  Q.mode = 'calib'; screenCalibIntro();
}

function screenIntro() {
  const best = read(KEYS.core, {}).best;
  const nodes = [topbar(t.appName), h('div', { class: 'card hero' }, h('p', { class: 'hook' }, t.tagline), h('p', {}, t.introLead))];
  if (Q.challenge != null) nodes.push(h('div', { class: 'banner' }, t.challenge(Q.challenge)));
  if (typeof best === 'number') nodes.push(h('p', { class: 'muted sub' }, t.best(best)));
  nodes.push(h('button', { class: 'btn', onclick: begin }, t.start));
  render(...nodes);
}

function screenCalibIntro() {
  const hist = read(KEYS.calib, []);
  const st = stats(hist);
  const nodes = [topbar(tp.calibTitle), h('div', { class: 'card hero' }, h('p', { class: 'hook' }, tp.calibPitch), h('p', {}, tp.calibHow))];
  nodes.push(calibCard(st, hist));
  nodes.push(h('button', { class: 'btn', onclick: begin }, tp.calibStart));
  if (hist.length) nodes.push(h('button', { class: 'btn secondary', onclick: () => { write(KEYS.calib, []); toast(tp.resetDone); screenCalibIntro(); } }, tp.reset));
  render(...nodes);
}

export function calibCard(st, hist) {
  if (!st.ready) return h('div', { class: 'card' }, h('p', { class: 'muted' }, tp.calibProgress(st.n, st.need)));
  return h('div', { class: 'card calib' },
    h('p', { class: 'hook' }, tp.verdicts[st.verdict]),
    h('p', { class: 'sub muted' }, tp.calibStats(Math.round(st.accuracy * 100), Math.round(st.meanP * 100), st.n)),
    h('h3', {}, tp.byLevel),
    ...st.byLevel.map((l) => h('div', { class: 'row lvl' }, h('span', {}, tp.levels[l.id]),
      h('span', { class: 'muted' }, l.n ? `${Math.round(l.accuracy * 100)}% (${l.n})` : '—'))));
}

function begin() {
  if (state.age18 === null) return screenAge18();
  startRound();
}
function screenAge18() {
  render(topbar(''), h('div', { class: 'card' }, h('h2', {}, t.age18Q),
    h('button', { class: 'btn', onclick: () => { state.age18 = true; patch(KEYS.core, { age18: true }); startRound(); } }, t.age18Yes),
    h('button', { class: 'btn secondary', onclick: () => { state.age18 = false; patch(KEYS.core, { age18: false }); startRound(); } }, t.age18No)));
}

function startRound() {
  Q.cases = playableCases(data.quiz, state.age18 === true);
  Q.i = 0; Q.total = 0; Q.results = []; Q.picked = []; Q.conf = null;
  screenObserve();
}

// ---------- ситуация ----------
function screenObserve() {
  const c = current();
  Q.picked = []; Q.conf = null;
  const next = h('button', { class: 'btn', disabled: true, onclick: screenAction }, t.toAction);
  const list = shuffle(c.observations).map((o) => {
    const b = h('button', { class: 'opt', type: 'button', 'aria-pressed': 'false' }, L(o.text));
    b.addEventListener('click', () => {
      const on = Q.picked.includes(o.id);
      if (on) Q.picked = Q.picked.filter((x) => x !== o.id);
      else if (Q.picked.length < MAX_PICK) Q.picked.push(o.id);
      else return;
      b.setAttribute('aria-pressed', String(Q.picked.includes(o.id)));
      next.disabled = Q.picked.length === 0; haptic('light');
    });
    return b;
  });
  render(topbar(''), progress(), h('p', { class: 'muted sub' }, t.caseOf(Q.i + 1, Q.cases.length)),
    h('h1', {}, L(c.title)), h('p', { class: 'hook' }, L(c.hook)),
    h('div', { class: 'card' }, L(c.scene)),
    h('h3', {}, L(c.observePrompt) || t.pick), ...list, next);
}

function screenAction() {
  const c = current();
  render(topbar(''), progress(), h('p', { class: 'muted sub' }, t.caseOf(Q.i + 1, Q.cases.length)),
    h('h2', {}, L(c.actionPrompt) || t.actionTitle),
    ...shuffle(c.actions).map((a) => h('button', { class: 'opt', type: 'button', onclick: () => afterAction(a.id) }, L(a.text))));
}

function afterAction(actionId) {
  if (Q.mode === 'calib') return screenConfidence(actionId);
  screenDebrief(actionId);
}

function screenConfidence(actionId) {
  render(topbar(''), progress(), h('h2', {}, tp.calibAsk),
    ...LEVELS.map((l) => h('button', { class: 'opt', type: 'button', onclick: () => {
      Q.conf = l.id;
      const c = current();
      write(KEYS.calib, addItem(read(KEYS.calib, []), l.id, isCorrect(c, Q.picked)));
      screenDebrief(actionId);
    } }, tp.levels[l.id])));
}

function screenDebrief(actionId) {
  const c = current();
  const obsPts = scoreObservations(data.quiz, c, Q.picked);
  const actPts = scoreAction(data.quiz, c, actionId);
  const pts = obsPts + actPts;
  Q.total += pts;
  Q.results.push({ id: c.id, pts, missed: missedSignals(c, Q.picked).map((o) => L(o.text)) });
  const a = c.actions.find((x) => x.id === actionId);
  const last = Q.i === Q.cases.length - 1;
  const obsRows = c.observations.map((o) => h('div', { class: 'row' + (Q.picked.includes(o.id) ? ' picked' : '') },
    h('span', { class: 'tag ' + o.kind }, t.kinds[o.kind]), Q.picked.includes(o.id) ? h('span', { class: 'muted sub' }, ` (${t.yourPick})`) : '',
    h('p', {}, L(o.text)), h('p', { class: 'sub muted' }, L(o.why))));
  render(topbar(''), progress(), h('p', { class: 'muted sub' }, t.caseOf(Q.i + 1, Q.cases.length)),
    h('h2', {}, t.debriefTitle),
    h('div', { class: 'card' }, h('h3', {}, t.observed), ...obsRows),
    h('div', { class: 'card' }, h('h3', {}, t.actionResult), h('p', {}, L(a.text)), h('p', { class: 'sub muted' }, L(a.why))),
    h('div', { class: 'card' }, L(c.debrief),
      h('h3', {}, t.altTitle), h('ul', {}, ...(c.altExplanations[lang] || c.altExplanations.en).map((x) => h('li', {}, x))),
      h('h3', {}, t.checkTitle), h('p', {}, '«' + L(c.checkQuestion) + '»'),
      h('p', { class: 'sub muted' }, L(c.reliabilityNote))),
    h('p', { class: 'muted sub' }, t.points(pts)),
    h('button', { class: 'btn', onclick: () => { if (last) screenResult(); else { Q.i++; screenObserve(); } } }, last ? t.last : t.next));
}

// ---------- результат ----------
function shareLink(pct) {
  const param = encodeChallenge(pct);
  if (CFG.miniAppLink) return `${CFG.miniAppLink}${CFG.miniAppLink.includes('?') ? '&' : '?'}startapp=${param}`;
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
  const n = Q.cases.length;
  const pct = percent(Q.total, n, data.quiz);
  const tier = tierFor(data.quiz, pct);
  const max = n * data.quiz.scoring.maxPerCase;
  const prev = read(KEYS.core, {}).best;
  if (typeof prev !== 'number' || pct > prev) patch(KEYS.core, { best: pct });
  const blind = Q.results.flatMap((r) => r.missed).slice(0, 2);
  const cmp = compareChallenge(pct, Q.challenge);
  const nodes = [topbar(''),
    h('div', { class: 'status tier-' + tier.id },
      h('div', { class: 'label' }, t.resultTitle),
      h('div', { class: 'tier' }, L(tier.title)),
      h('div', { class: 'pct' }, t.scoreLine(pct, Q.total, max)),
      h('p', {}, L(tier.line)),
      h('p', { class: 'foot-note' }, L(data.quiz.statusCardFooter)))];
  if (cmp) nodes.push(h('div', { class: 'banner' }, t[cmp](Q.challenge)));
  if (Q.mode === 'calib') nodes.push(calibCard(stats(read(KEYS.calib, [])), read(KEYS.calib, [])));
  nodes.push(h('div', { class: 'card' }, h('h3', {}, t.blind),
    blind.length ? h('ul', {}, ...blind.map((x) => h('li', {}, x))) : h('p', {}, t.blindNone)));
  nodes.push(h('button', { class: 'btn', onclick: () => doShare(t.shareText(L(tier.title), pct), pct) }, t.share));
  nodes.push(h('button', { class: 'btn secondary', onclick: () => doShare(t.challengeText(L(tier.title), pct), pct) }, t.challengeBtn));
  nodes.push(h('button', { class: 'btn secondary', onclick: startRound }, t.again));
  render(...nodes);
}
