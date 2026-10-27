// «Анатомия невербалики»: схема с метками, нижняя панель со слоями, мини-тренажёр зоны, прогресс «Атлас».
import { h, html, L, LA, lang, t, tp, data, render, nav, haptic, topbar, closeSheet, loadJson, CFG, toast } from './ctx.js';
import { read, write, KEYS } from './store.js';
import { hotspotUnlocked, hasAccess } from './access.js';
import { figureSvg, overlaySvg } from './figures.js';
import { shuffle } from './engine.js';
import { openPaywall } from './paywall.js';
import { proLoader, refreshEntitlements } from './services.js';

const A = { sec: 0, sel: null, layer: 'seen', content: null, err: null };
const ent = () => read(KEYS.ent, {});
const atlas = () => read(KEYS.atlas, { opened: [], trained: {} });
function saveAtlas(a) { write(KEYS.atlas, a); }

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

function screen() {
  const an = data.pro.anatomy;
  const sec = an.sections[A.sec];
  const a = atlas();
  const chips = h('div', { class: 'chips', role: 'tablist' }, ...an.sections.map((s, i) =>
    h('button', { class: 'chip' + (i === A.sec ? ' on' : ''), role: 'tab', 'aria-selected': String(i === A.sec), type: 'button',
      onclick: () => { A.sec = i; A.sel = null; screen(); } }, L(s.title))));

  // схема: SVG фигуры + подсветка + кнопки-метки (HTML, чтобы область касания была не меньше 44 px)
  const stage = h('div', { class: 'stage' });
  stage.append(html('div', { class: 'fig-wrap' }, figureSvg(sec.figureView, L(sec.title))));
  stage.append(html('div', { class: 'ov-wrap' }, overlaySvg(sec.hotspots, A.sel)));
  sec.hotspots.forEach((hs, i) => {
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
    chips, stage, list);
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
      h('p', { class: 'rel ' + hs.reliability }, h('span', { 'aria-hidden': 'true' }, tp.relIcon[hs.reliability] + ' '), tp.rel[hs.reliability]),
      hs.myth ? h('span', { class: 'tag jump' }, L(an.ui.mythBadge)) : ''),
    h('button', { class: 'x', type: 'button', 'aria-label': tp.close, onclick: () => { A.sel = null; screen(); } }, '×'));
  const body = h('div', { class: 'sheet-body' });
  if (!unlocked) {
    body.append(h('p', { class: 'hook' }, tp.locked), h('p', {}, tp.lockedText),
      h('button', { class: 'btn', type: 'button', onclick: () => { A.sel = null; openPaywall('anatomy'); } }, tp.paywallTitle));
  } else if (!full) {
    body.append(...pendingState(id));
  } else {
    const tabs = h('div', { class: 'chips small', role: 'tablist' }, ...an.ui.layersToggle.map((k) =>
      h('button', { class: 'chip' + (k === A.layer ? ' on' : ''), role: 'tab', 'aria-selected': String(k === A.layer), type: 'button',
        onclick: () => { A.layer = k; renderSheet(id); } }, tp.layers[k])));
    const lay = hs.layers[A.layer];
    const content = Array.isArray(lay[lang] || lay.ru)
      ? h('ul', {}, ...LA(lay).map((x) => h('li', {}, x)))
      : h('p', {}, L(lay));
    body.append(tabs, h('div', { class: 'layer' }, content));
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
