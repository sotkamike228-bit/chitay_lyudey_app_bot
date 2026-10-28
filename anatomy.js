// «Анатомия невербалики»: схема с метками, нижняя панель со слоями, мини-тренажёр зоны, прогресс «Атлас».
import { h, html, L, LA, lang, t, tp, data, render, nav, haptic, topbar, closeSheet, loadJson, CFG, toast } from './ctx.js';
import { read, write, KEYS } from './store.js';
import { hotspotUnlocked, hasAccess } from './access.js';
import { figureSvg, overlaySvg, attachHubArt } from './figures.js';
import { shuffle } from './engine.js';
import { openPaywall, lockCard } from './paywall.js';
import { proLoader, refreshEntitlements } from './services.js';

const A = { sec: 0, view: 0, sel: null, layer: 'seen', content: null, err: null };
const ent = () => read(KEYS.ent, {});
const atlas = () => read(KEYS.atlas, { opened: [], trained: {} });
function saveAtlas(a) { write(KEYS.atlas, a); }

const REL_N = { high: 3, medium: 2, disputed: 1, low: 1 };
function relBar(rel) {
  const r = REL_N[rel] != null ? rel : 'disputed';
  return h('div', { class: 'relbar ' + r }, h('span', { class: 'seg3', 'aria-hidden': 'true' }, ...[0, 1, 2].map((i) => h('i', { class: i < REL_N[r] ? 'on' : '' }))),
    h('span', { class: 'lbl' }, tp.rel[r]));
}
/** Слой зоны: строка, список или список вопросов (check). */
function layerNode(o, cls) {
  if (!o) return '';
  const v = o[lang] || o.en || o.ru;
  if (Array.isArray(v)) return h('ul', { class: cls || '' }, ...v.map((x) => h('li', {}, x)));
  return h('p', {}, v || '');
}
const secBlock = (n, title, node, cls = '') => (node ? h('div', { class: ('sec ' + cls).trim() }, h('h3', {}, h('span', { class: 'n', 'aria-hidden': 'true' }, String(n)), title), node) : '');

export function totalZones(pro) { return pro.anatomy.sections.reduce((n, s) => n + s.hotspots.length, 0); }

export async function openAnatomy() {
  if (!data.pro) {
    try { data.pro = await loadJson('chitay_pro.json'); }
    catch { render(topbar(tp.anatomyTitle), h('div', { class: 'card' }, t.loadError)); return; }
  }
  A.sel = null; A.layer = 'seen'; A.err = null;
  screen();
  prefetch();
}

/** Тихая предзагрузка платных слоёв, если право есть: первое открытие зоны тогда мгновенное. */
function prefetch() {
  if (A.content || !hasAccess('anatomy', ent(), CFG)) return;
  proLoader.load('anatomy').then((c) => { A.content = c; }).catch(() => {});
}

function markOpened(id) {
  const a = atlas();
  if (!a.opened.includes(id)) { a.opened.push(id); saveAtlas(a); }
}

/** Полные данные зоны: бесплатная целиком в открытом файле, платная = каркас + слои с сервера. */
function fullOf(hs) {
  if (hs.tier === 'free') return hs;
  const part = A.content && A.content.hotspots && A.content.hotspots[hs.id];
  return part ? { ...hs, ...part } : null;
}

async function loadFor(id) {
  try {
    const c = await proLoader.load('anatomy');
    if (!c.hotspots || !c.hotspots[id]) throw Object.assign(new Error('missing'), { code: 'unavailable' });
    A.content = c; A.err = null; markOpened(id);
  } catch (e) { A.err = e.code || 'network'; if (A.err === 'locked') refreshEntitlements(); }
  if (A.sel === id) screen();
}

function allHotspots() { return data.pro.anatomy.sections.flatMap((s) => s.hotspots); }
const find = (id) => allHotspots().find((x) => x.id === id);

const FALLBACK_VIEW = { id: 'main', aspect: 0.625 };
/** Ракурс хаба и зоны с координатами этого ракурса (geo переопределяет region и pin). */
function viewOf(sec, i) {
  const views = sec.views && sec.views.length ? sec.views : [FALLBACK_VIEW];
  const idx = Math.min(Math.max(i | 0, 0), views.length - 1);
  const view = views[idx];
  const hotspots = view.geo ? sec.hotspots.map((hs) => (view.geo[hs.id] ? { ...hs, region: view.geo[hs.id].region, pin: view.geo[hs.id].pin } : hs)) : sec.hotspots;
  return { views, idx, view, hotspots };
}

function screen() {
  const an = data.pro.anatomy;
  const sec = an.sections[A.sec];
  const { views, idx, view, hotspots } = viewOf(sec, A.view);
  const a = atlas();
  const chips = h('div', { class: 'chips', role: 'tablist' }, ...an.sections.map((s, i) =>
    h('button', { class: 'chip' + (i === A.sec ? ' on' : ''), role: 'tab', 'aria-selected': String(i === A.sec), type: 'button',
      onclick: () => { A.sec = i; A.view = 0; A.sel = null; screen(); } }, L(s.title))));
  const viewSwitch = views.length > 1 ? h('div', { class: 'views', role: 'tablist', 'aria-label': tp.viewsLabel },
    ...views.map((v, i) => h('button', { class: 'view-btn' + (i === idx ? ' on' : ''), role: 'tab', 'aria-selected': String(i === idx), type: 'button',
      onclick: () => { A.view = i; screen(); } }, L(v.label)))) : '';

  // схема: SVG фигуры + подсветка + кнопки-метки (HTML, чтобы область касания была не меньше 44 px)
  const stage = h('div', { class: 'stage', style: `--asp:${view.aspect || 0.625}` });
  if (view.art) attachHubArt(stage, view.art);
  if (idx === 0) stage.append(html('div', { class: 'fig-wrap' }, figureSvg(sec.figureView, L(sec.title))));   // запасная схема, если картинки нет
  stage.append(html('div', { class: 'ov-wrap' }, overlaySvg(hotspots, A.sel)));
  hotspots.forEach((hs, i) => {
    const open = a.opened.includes(hs.id);
    const pin = h('button', { class: 'pin' + (hs.id === A.sel ? ' on' : '') + (open ? ' seen' : '') + (hs.myth ? ' myth' : ''), type: 'button',
      style: `left:${hs.pin.x}%;top:${hs.pin.y}%`, 'aria-label': L(hs.label), onclick: () => select(hs.id) }, String(i + 1));
    stage.append(pin);
  });

  const list = h('details', { class: 'zones' }, h('summary', {}, tp.zonesList),
    ...sec.hotspots.map((hs, i) => h('button', { class: 'zone-item', type: 'button', onclick: () => select(hs.id) },
      h('span', { class: 'num' }, String(i + 1)), L(hs.label),
      hotspotUnlocked(hs, ent(), CFG) ? '' : h('span', { class: 'badge pro sm' }, tp.badges.pro))));
  list.open = false;

  render(topbar(tp.anatomyTitle), h('p', { class: 'muted sub' }, L(an.intro)),
    h('p', { class: 'atlas' }, tp.atlas(a.opened.length, totalZones(data.pro))),
    chips, viewSwitch, stage, list);
  const on = chips.querySelector('.on'); if (on) chips.scrollLeft = on.offsetLeft - (chips.clientWidth - on.offsetWidth) / 2;   // активный хаб по центру ленты
  if (A.sel) renderSheet(A.sel);
}

function select(id) {
  A.sel = id; A.layer = 'seen'; A.err = null; haptic('light');
  const hs = find(id);
  let needLoad = false;
  if (hotspotUnlocked(hs, ent(), CFG)) {
    if (fullOf(hs)) markOpened(id); else needLoad = true;
  }
  screen();
  const st = document.querySelector('.stage');
  if (st) st.scrollIntoView({ block: 'start' });
  if (needLoad) loadFor(id);
}

function renderSheet(id) {
  closeSheet();
  const hs0 = find(id);
  const hs = fullOf(hs0) || hs0;
  const full = fullOf(hs0);
  const an = data.pro.anatomy;
  const unlocked = hotspotUnlocked(hs0, ent(), CFG);
  const head = h('div', { class: 'sheet-head' },
    h('div', {}, h('h2', {}, L(hs.label)),
      relBar(hs.reliability), h('p', { class: 'sub muted relnote' }, tp.relDesc[hs.reliability] || ''),
      hs.myth ? h('span', { class: 'tag jump' }, L(an.ui.mythBadge)) : ''),
    h('button', { class: 'x', type: 'button', 'aria-label': tp.close, onclick: () => { A.sel = null; screen(); } }, '×'));
  const body = h('div', { class: 'sheet-body' });
  if (!unlocked) {
    body.append(h('p', { class: 'hook' }, tp.locked), h('p', {}, tp.lockedText),
      h('button', { class: 'btn', type: 'button', onclick: () => { A.sel = null; openPaywall('anatomy'); } }, tp.paywallTitle));
  } else if (!full) {
    body.append(...pendingState(id));
  } else {
    const L_ = hs.layers;
    body.append(secBlock(1, tp.sec.seen, layerNode(L_.seen)), secBlock(2, tp.sec.physiology, layerNode(L_.physiology)),
      secBlock(3, tp.sec.caveat, layerNode(L_.notProven)),
      secBlock(4, tp.sec.check, layerNode(L_.check, 'qs'), 'tool'),
      secBlock(5, tp.sec.fix, layerNode(L_.fixation), 'fix'),
      h('details', { class: 'src' }, h('summary', {}, tp.sec.limits), layerNode(L_.alt)));
    if (hs.research) body.append(h('details', { class: 'src' }, h('summary', {}, tp.source), h('p', { class: 'sub muted' }, L(hs.research))));
    body.append(trainerBlock(full));
    body.append(h('p', { class: 'sub muted' }, L(data.pro.meta.caption)));
  }
  const host = h('div', { class: 'sheet-host' }, h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'false', 'aria-label': L(hs.label) }, head, body));
  document.body.append(host);
  document.body.classList.add('sheet-open');
}

/** Состояние платной зоны, пока слои не пришли: загрузка, ошибка или «нужен доступ». */
function pendingState(id) {
  const e = A.err;
  if (!e) return [h('p', { class: 'muted' }, tp.load.loading)];
  if (e === 'previewMissing') return [lockCard('anatomy')];
  if (e === 'locked') return [h('p', { class: 'hook' }, tp.locked), h('p', {}, tp.load.locked),
    h('button', { class: 'btn', type: 'button', onclick: () => { A.sel = null; openPaywall('anatomy'); } }, tp.paywallTitle)];
  const out = [h('p', {}, tp.load[e] || tp.load.network)];
  if (e === 'network' || e === 'unavailable') {
    out.push(h('button', { class: 'btn', type: 'button', onclick: () => { A.err = null; screen(); loadFor(id); } }, tp.load.retry));
  }
  return out;
}

function trainerBlock(hs) {
  const ui = data.pro.anatomy.trainerUi;
  const a = atlas();
  const done = a.trained[hs.id];
  const wrap = h('div', { class: 'trainer card' });
  const opts = [
    { grade: 2, text: L(ui.reliable) },
    { grade: 1, text: L(hs.trainer.hypothesis) },
    { grade: 0, text: L(hs.trainer.hasty) },
  ];
  function show(grade) {
    wrap.replaceChildren(h('h3', {}, L(ui.question)),
      h('p', { class: 'tag ' + (grade === 2 ? 'signal' : grade === 1 ? 'weak' : 'jump') }, grade === 2 ? t.kinds.signal : grade === 1 ? t.kinds.weak : t.kinds.jump),
      h('p', {}, L(ui.feedback[String(grade)])));
  }
  if (done != null) { show(done); return wrap; }
  wrap.append(h('h3', {}, L(ui.question)), ...shuffle(opts).map((o) => h('button', { class: 'opt', type: 'button', onclick: () => {
    const at = atlas(); at.trained[hs.id] = o.grade; saveAtlas(at); haptic(o.grade === 2 ? 'light' : 'medium'); show(o.grade);
  } }, o.text)));
  return wrap;
}
