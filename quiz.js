// Тест из 5 ситуаций и режим калибровки (тот же поток + шаг «уверенность»).
import { h, html, L, t, tp, lang, data, state, isAdult, render, nav, haptic, toast, topbar, tg, CFG, loadJson } from './ctx.js?v=test4';
import { read, write, patch, KEYS } from './store.js?v=test4';
import { MAX_PICK, playableCases, scoreObservations, scoreAction, missedSignals, percent, tierFor, encodeChallenge, parseChallenge, shuffle, compareChallenge } from './engine.js?v=test4';
import { LEVELS, isCorrect, addItem, stats, CAT_IDS, normCat, roundAllowed, roundCases, markSeen, resetHistory } from './calib.js?v=test4';
import { proLoader } from './services.js?v=test4';
import { openHypo } from './hypo-view.js?v=test4';
import { openAnatomy } from './anatomy.js?v=test4';
import { ICONS } from './icons.js?v=test4';
const trackIcon = (c) => (c.track === 'business' ? 'biz' : c.track === 'relationships' ? 'rel' : 'shield');
import { openPaywall, lockCard } from './paywall.js?v=test4';
import { hasAccess } from './access.js?v=test4';

const Q = { mode: 'quiz', cases: [], i: 0, total: 0, results: [], picked: [], conf: null, challenge: null, cat: null, okCount: 0 };

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
// Калибровка: сначала выбор категории. Первый раунд каждой категории бесплатный, дальше нужен доступ.
const catState = (cat) => normCat((read(KEYS.calibCat, {}) || {})[cat]);
const saveCat = (cat, st) => write(KEYS.calibCat, { ...(read(KEYS.calibCat, {}) || {}), [cat]: st });
async function ensureCalib() { if (!data.calib) data.calib = await loadJson('chitay_calib.json'); return data.calib; }

export async function openCalibration() {
  Q.mode = 'calib';
  try { await ensureCalib(); } catch { render(topbar(tp.calibTitle), h('div', { class: 'card' }, t.loadError)); return; }
  screenCategories();
}

function screenCategories() {
  const cats = data.calib.categories.filter((c) => isAdult() || !c.adultOnly);
  render(topbar(tp.calibTitle), h('div', { class: 'card hero' }, h('p', { class: 'hook' }, tp.calibPitch), h('p', {}, tp.calibCats)),
    ...cats.map((c) => {
      const st = catState(c.id), s = stats(st.h);
      // не пройден ни один раунд: «Первый раунд бесплатно»; пройден и есть итог: статус и кнопка разбора; иначе счётчик раундов
      const status = st.rounds === 0 ? tp.calibFirstFree : s.ready ? tp.verdictShort[s.verdict] : tp.calibRounds(st.rounds);
      const tile = h('button', { class: 'tile row-tile', type: 'button', onclick: () => { Q.cat = c.id; screenCalibIntro(); } },
        h('span', { class: 'tile-title' }, L(c.title)), h('span', { class: 'tile-sub' }, L(c.sub)),
        h('span', { class: 'badge ' + (st.rounds === 0 ? 'free' : 'pro') }, status));
      const detail = st.rounds > 0 && s.ready && !hasAccess('calibration', ent(), CFG)
        ? h('button', { class: 'btn secondary detail-pro', type: 'button', onclick: () => openPaywall('calibration') }, tp.calibDetailPro) : '';
      return h('div', { class: 'cal-item' }, tile, detail);
    }));
}

function screenIntro() {
  const best = read(KEYS.core, {}).best;
  const nodes = [topbar(t.appName), h('div', { class: 'card hero' }, h('p', { class: 'hook' }, t.tagline), h('p', {}, t.introLead))];
  if (Q.challenge != null) nodes.push(h('div', { class: 'banner' }, t.challenge(Q.challenge)));
  if (typeof best === 'number') nodes.push(h('p', { class: 'muted sub' }, t.best(best)));
  if (state.age === 'teen') nodes.push(h('p', { class: 'muted sub' }, t.teenNote));
  nodes.push(h('button', { class: 'btn', onclick: begin }, t.start));
  render(...nodes);
}

function screenCalibIntro() {
  const cat = data.calib.categories.find((c) => c.id === Q.cat);
  const cs = catState(Q.cat), st = stats(cs.h);
  const needPro = !roundAllowed(cs.rounds, hasAccess('calibration', ent(), CFG));
  const nodes = [topbar(L(cat.title)), h('div', { class: 'card hero' }, h('p', { class: 'hook' }, L(cat.hook)), h('p', {}, tp.calibHow))];
  nodes.push(calibCard(st, cs.h));
  if (st.ready && !hasAccess('calibration', ent(), CFG)) nodes.push(h('button', { class: 'btn cta-gb detail-pro', type: 'button', onclick: () => openPaywall('calibration') }, tp.calibDetailPro));
  if (needPro) nodes.push(h('p', { class: 'banner' }, tp.calibNeedPro));
  nodes.push(h('button', { class: 'btn', onclick: needPro ? () => openPaywall('calibration') : begin }, needPro ? tp.pay.homeLink : (cs.rounds === 0 ? tp.calibStartFree : tp.calibStart)));
  if (cs.h.length) nodes.push(h('button', { class: 'btn secondary', onclick: () => { saveCat(Q.cat, resetHistory(cs)); toast(tp.resetDone); screenCalibIntro(); } }, tp.reset));
  nodes.push(h('button', { class: 'btn secondary', onclick: screenCategories }, tp.calibOtherCat));
  render(...nodes);
}

export function calibCard(st, hist) {
  if (!st.ready) return h('div', { class: 'card' }, h('p', { class: 'muted' }, tp.calibProgress(st.n, st.need)));
  return h('div', { class: 'card calib' },
    st.preliminary ? h('span', { class: 'badge soon' }, tp.calibPrelim) : '',
    h('p', { class: 'hook' }, tp.verdicts[st.verdict]),
    st.preliminary ? h('p', { class: 'sub muted' }, tp.calibPrelimNote) : '',
    h('p', { class: 'sub muted' }, tp.calibStats(Math.round(st.accuracy * 100), Math.round(st.meanP * 100), st.n)),
    h('h3', {}, tp.byLevel),
    ...st.byLevel.map((l) => h('div', { class: 'row lvl' }, h('span', {}, tp.levels[l.id]),
      h('span', { class: 'muted' }, l.n ? `${Math.round(l.accuracy * 100)}% (${l.n})` : '—'))));
}

function begin() { if (Q.mode === 'calib') beginCalib(); else startRound(); }

function startRound() {
  Q.cases = playableCases(data.quiz, isAdult());
  Q.i = 0; Q.total = 0; Q.results = []; Q.picked = []; Q.conf = null; Q.okCount = 0;
  screenObserve();
}

/** Раунд калибровки: бесплатный (из открытого файла) или платный (с сервера). */
async function beginCalib() {
  const cs = catState(Q.cat), free = data.calib.free[Q.cat] || [];
  let paid = [];
  if (cs.rounds > 0) {
    if (!hasAccess('calibration', ent(), CFG)) return openPaywall('calibration');
    render(topbar(tp.calibTitle), h('p', { class: 'muted' }, tp.load.loading));
    try { paid = (await proLoader.load('calibration'))[Q.cat] || []; }
    catch (e) {
      const code = (e && e.code) || 'network';
      if (code === 'locked') return openPaywall('calibration');
      if (code !== 'previewMissing') {
        render(topbar(tp.calibTitle), h('div', { class: 'card' }, h('p', {}, tp.load[code] || tp.load.network), h('button', { class: 'btn', onclick: beginCalib }, tp.load.retry)));
        return;
      }
      if (!Q.freeOk) {   // демо без платного файла: карточка пейволла и выбор — играть бесплатные кейсы
        render(topbar(tp.calibTitle), lockCard('calibration', h('button', { class: 'btn secondary', type: 'button', onclick: () => { Q.freeOk = true; beginCalib(); } }, tp.lockCard.free)));
        return;
      }
    }
  }
  Q.freeOk = false;
  const cases = roundCases(cs.rounds, free, paid, cs.seen).filter((c) => isAdult() || !c.adultOnly);
  saveCat(Q.cat, { ...cs, seen: markSeen(cs.seen, cases) });
  Q.cases = cases; Q.i = 0; Q.total = 0; Q.results = []; Q.picked = []; Q.conf = null; Q.okCount = 0;
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
    h('div', { class: 'case-head' }, html('span', { class: 'case-ico' }, ICONS[trackIcon(c)]), h('h1', {}, L(c.title))), h('p', { class: 'hook' }, L(c.hook)),
    h('div', { class: 'card scene-card' }, L(c.scene)),
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
      const c = current(), ok = isCorrect(c, Q.picked);
      const cs = catState(Q.cat);
      saveCat(Q.cat, { ...cs, h: addItem(cs.h, l.id, ok) });
      if (ok) Q.okCount++;
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
      h('h3', {}, t.altTitle), h('ul', {}, ...(c.altExplanations[lang] || c.altExplanations.en || c.altExplanations.ru).map((x) => h('li', {}, x))),
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

function screenCalibResult() {
  const n = Q.cases.length, cs = catState(Q.cat);
  saveCat(Q.cat, { ...cs, rounds: cs.rounds + 1 });          // раунд засчитан только после последнего ответа
  const cat = data.calib.categories.find((c) => c.id === Q.cat);
  const st = stats(catState(Q.cat).h);
  const needPro = !roundAllowed(cs.rounds + 1, hasAccess('calibration', ent(), CFG));
  const blind = Q.results.flatMap((r) => r.missed).slice(0, 2);
  const nodes = [topbar(L(cat.title)),
    h('div', { class: 'card hero' }, h('h2', {}, tp.calibRoundDone), h('p', { class: 'hook' }, tp.calibRoundScore(Q.okCount, n)), h('p', {}, tp.calibNote)),
    calibCard(st, catState(Q.cat).h),
    h('div', { class: 'card' }, h('h3', {}, t.blind), blind.length ? h('ul', {}, ...blind.map((x) => h('li', {}, x))) : h('p', {}, t.blindNone))];
  if (needPro) {
    nodes.push(h('div', { class: 'card pro-card' }, h('span', { class: 'badge pro' }, tp.badges.pro), h('p', {}, tp.calibNextPro),
      h('button', { class: 'btn', onclick: () => openPaywall('calibration') }, tp.pay.homeLink)));
  } else {
    nodes.push(h('button', { class: 'btn', onclick: beginCalib }, tp.calibNextRound));
  }
  nodes.push(h('button', { class: 'btn secondary', onclick: () => nav.go(openHypo) }, tp.hypo.title));
  nodes.push(h('button', { class: 'btn secondary', onclick: screenCategories }, tp.calibOtherCat));
  render(...nodes);
}

async function focusLabels() {
  try { if (!data.pro) data.pro = await loadJson('chitay_pro.json'); } catch { return []; }
  const zones = data.pro.anatomy.sections.flatMap((x) => x.hotspots);
  const weak = Q.results.filter((r) => r.pts < (data.quiz.goodCasePoints || 3)).map((r) => r.id);
  const pool = (weak.length ? Q.cases.filter((c) => weak.includes(c.id)) : Q.cases).flatMap((c) => c.focusZones || []);
  return [...new Set(pool)].slice(0, 2).map((id) => zones.find((z) => z.id === id)).filter(Boolean).map((z) => L(z.label));
}

async function screenResult() {
  if (Q.mode === 'calib') return screenCalibResult();
  const n = Q.cases.length;
  const pct = percent(Q.total, n, data.quiz);
  const good = Q.results.filter((r) => r.pts >= (data.quiz.goodCasePoints || 3)).length;
  const tier = [...data.quiz.gradeTiers].sort((a, b) => b.minGood - a.minGood).find((g) => good >= g.minGood);
  const prev = read(KEYS.core, {}).best;
  if (typeof prev !== 'number' || pct > prev) patch(KEYS.core, { best: pct });
  const blind = Q.results.flatMap((r) => r.missed).slice(0, 2);
  const cmp = compareChallenge(pct, Q.challenge);
  const zones = await focusLabels();
  const box = h('div', { class: 'overlay modal-wrap', role: 'dialog', 'aria-modal': 'true' });
  const close = () => { box.classList.add('closing'); setTimeout(() => box.remove(), 180); };
  const kids = [h('div', { class: 'status tier-' + tier.id },
      h('div', { class: 'label' }, t.resultTitle),
      h('div', { class: 'tier' }, L(tier.title)),
      h('div', { class: 'pct' }, t.goodLine(good, n)),
      h('p', {}, L(tier.line)))];
  if (zones.length) kids.push(h('div', { class: 'card' }, h('h3', {}, t.insightTitle), h('p', {}, t.insight(zones.join(' · ')))));
  if (cmp) kids.push(h('div', { class: 'banner' }, t[cmp](Q.challenge)));
  kids.push(h('div', { class: 'card' }, h('h3', {}, t.blind),
    blind.length ? h('ul', {}, ...blind.map((x) => h('li', {}, x))) : h('p', {}, t.blindNone)));
  kids.push(h('button', { class: 'btn cta-gi', onclick: () => { close(); nav.go(openAnatomy); } }, t.ctaAtlas));
  kids.push(h('button', { class: 'btn secondary', onclick: () => { close(); nav.go(openCalibration); } }, tp.calibTitle));
  kids.push(h('button', { class: 'btn secondary', onclick: () => doShare(t.shareText(L(tier.title), pct), pct) }, t.share));
  kids.push(h('button', { class: 'btn secondary', onclick: () => { close(); startRound(); } }, t.again));
  kids.push(h('p', { class: 'foot-note sub muted' }, L(data.quiz.statusCardFooter)));
  box.append(h('div', { class: 'overlay-inner modal' }, ...kids));
  document.body.append(box);
}
