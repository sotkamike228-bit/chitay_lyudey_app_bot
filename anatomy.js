// «Анатомия невербалики»: схема с метками, нижняя панель со слоями, мини-тренажёр зоны, прогресс «Атлас».
import { h, html, L, LA, lang, t, tp, data, render, nav, haptic, topbar, closeSheet, loadJson, CFG, toast } from './ctx.js?v=test3';
import { read, write, KEYS } from './store.js?v=test3';
import { hotspotUnlocked, hasAccess } from './access.js?v=test3';
import { figureSvg, overlaySvg, attachHubArt } from './figures.js?v=test3';
import { shuffle } from './engine.js?v=test3';
import { openPaywall, lockCard } from './paywall.js?v=test3';
import { ICONS, HUB_ICON } from './icons.js?v=test3';
import { proLoader, refreshEntitlements } from './services.js?v=test3';

const A = { sec: 0, view: 0, full: false, sel: null, layer: 'seen', content: null, err: null };
const ent = () => read(KEYS.ent, {});
const atlas = () => read(KEYS.atlas, { opened: [], trained: {} });
function saveAtlas(a) { write(KEYS.atlas, a); }

const LEVEL = { high: 3, medium: 2, disputed: 1, low: 1 };
/** «Индекс верификации»: цветной бейдж с текстовым статусом рядом, без процентов. */
function relBar(rel) {
  const r = LEVEL[rel] != null ? rel : 'disputed';
  return h('div', { class: 'vindex lv' + LEVEL[r] },
    h('span', { class: 'vdot', 'aria-hidden': 'true' }), h('span', { class: 'vcap' }, tp.vindex), h('strong', { class: 'vlbl' }, tp.rel[r]));
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
  if (A.sel === id) { screen(); toStage(); requestAnimationFrame(() => requestAnimationFrame(toStage)); }
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
  const step = (dir) => chips.scrollBy({ left: dir * Math.max(120, chips.clientWidth * 0.6), behavior: 'smooth' });
  const arrow = (dir, label) => h('button', { class: 'chips-arrow ' + (dir < 0 ? 'prev' : 'next'), type: 'button', 'aria-label': label, onclick: () => step(dir) }, dir < 0 ? '‹' : '›');
  const prev = arrow(-1, tp.carouselPrev), next = arrow(1, tp.carouselNext);
  const syncArrows = () => {
    const max = chips.scrollWidth - chips.clientWidth;
    prev.disabled = chips.scrollLeft <= 1; next.disabled = chips.scrollLeft >= max - 1;
    carousel.classList.toggle('no-overflow', max <= 1);
  };
  const carousel = h('div', { class: 'chips-carousel' }, prev, chips, next);
  chips.addEventListener('scroll', syncArrows, { passive: true });
  // колесо мыши листает вкладки по горизонтали; у края отдаём прокрутку странице
  chips.addEventListener('wheel', (e) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const max = chips.scrollWidth - chips.clientWidth;
    if (!d || max <= 1) return;
    if ((d < 0 && chips.scrollLeft <= 0) || (d > 0 && chips.scrollLeft >= max - 1)) return;
    e.preventDefault(); chips.scrollLeft += d;
  }, { passive: false });
  const viewSwitch = views.length > 1 ? h('div', { class: 'views', role: 'tablist', 'aria-label': tp.viewsLabel },
    ...views.map((v, i) => h('button', { class: 'view-btn' + (i === idx ? ' on' : ''), role: 'tab', 'aria-selected': String(i === idx), type: 'button',
      onclick: () => { A.view = i; screen(); } }, L(v.label)))) : '';

  // схема: SVG фигуры + подсветка + кнопки-метки (HTML, чтобы область касания была не меньше 44 px)
  const stage = h('div', { class: 'stage', style: `--asp:${view.aspect || 0.625}` });
  if (view.art) attachHubArt(stage, view.art);
  if (!view.art) stage.append(html('div', { class: 'fig-wrap' }, figureSvg(sec.figureView, L(sec.title))));   // схема только если у ракурса нет картинки: старая заглушка не мигает
  stage.append(html('div', { class: 'ov-wrap' }, overlaySvg(hotspots, A.sel)));
  hotspots.forEach((hs, i) => {
    const open = a.opened.includes(hs.id);
    const pin = h('button', { class: 'pin' + (hs.id === A.sel ? ' on' : '') + (open ? ' seen' : ''), type: 'button',
      style: `left:${hs.pin.x}%;top:${hs.pin.y}%`, 'aria-label': L(hs.label), onclick: () => select(hs.id) }, String(i + 1));
    stage.append(pin);
  });

  const list = h('details', { class: 'zones' }, h('summary', {}, tp.zonesList),
    ...sec.hotspots.map((hs, i) => h('button', { class: 'zone-item', type: 'button', onclick: () => select(hs.id) },
      h('span', { class: 'num' }, String(i + 1)), L(hs.label),
      hotspotUnlocked(hs, ent(), CFG) ? '' : h('span', { class: 'badge pro sm' }, tp.badges.pro))));
  list.open = false;
  // «Все зоны списком»: шторка с описанием уезжает вниз, список раскрывается на странице с собственной прокруткой
  list.addEventListener('toggle', () => {
    document.body.classList.toggle('zones-open', list.open);
    if (list.open) { A.full = false; requestAnimationFrame(() => list.scrollIntoView({ block: 'nearest', behavior: 'smooth' })); }
  });

  render(topbar(tp.anatomyTitle), h('p', { class: 'muted sub' }, L(an.intro)),
    h('p', { class: 'atlas' }, tp.atlas(a.opened.length, totalZones(data.pro))),
    carousel, viewSwitch, stage, list);
  document.body.classList.remove('zones-open');
  const on = chips.querySelector('.on'); if (on) chips.scrollLeft = on.offsetLeft - (chips.clientWidth - on.offsetWidth) / 2;   // активный хаб по центру ленты
  syncArrows();
  if (A.sel) renderSheet(A.sel);
}

function toStage() { const st = document.querySelector('.stage'); if (st) st.scrollIntoView({ block: 'start' }); }

function lockModal(hs) {
  const X = tp.lockModal;
  const box = h('div', { class: 'overlay modal-wrap', role: 'dialog', 'aria-modal': 'true' });
  const close = () => { box.classList.add('closing'); setTimeout(() => box.remove(), 180); };
  box.append(h('div', { class: 'overlay-inner modal' },
    h('div', { class: 'hookpro' }, h('p', { class: 'hp-title' }, X.title(L(hs.label))), h('ul', {}, ...X.bullets.map((x) => h('li', {}, x)))),
    h('button', { class: 'btn cta-gb', type: 'button', onclick: () => { close(); A.sel = null; openPaywall('anatomy'); } }, X.cta),
    h('button', { class: 'btn secondary', type: 'button', onclick: close }, X.close)));
  document.body.append(box);
}

function select(id) {
  A.sel = id; A.layer = 'seen'; A.err = null; A.full = true; haptic('light');   // шторка сразу приоткрывается на комфортную высоту
  const hs = find(id);
  let needLoad = false;
  if (hotspotUnlocked(hs, ent(), CFG)) {
    if (fullOf(hs)) markOpened(id); else needLoad = true;
  }
  screen();
  if (!hotspotUnlocked(hs, ent(), CFG)) lockModal(hs);
  toStage(); requestAnimationFrame(() => requestAnimationFrame(toStage));
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
    html('span', { class: 'hub-ico' }, ICONS[HUB_ICON[A.sec] || 'scan']),
    h('div', { class: 'sheet-title' }, h('h2', {}, L(hs.label)),
      h('div', { class: 'head-meta' }, relBar(hs.reliability)),
      hs0.gist ? h('p', { class: 'gist' }, L(hs0.gist)) : '', !unlocked ? h('p', { class: 'lock-teaser' }, tp.lockModal.teaser) : '', hs0.twist ? h('p', { class: 'gist twistp' }, h('b', { class: 'twist' }, tp.twistLabel + ' '), L(hs0.twist)) : ''),
    h('button', { class: 'x', type: 'button', 'aria-label': tp.close, onclick: () => { A.sel = null; A.full = false; screen(); } }, '×'));
  const body = h('div', { class: 'sheet-body' });
  if (!unlocked) {
    body.append(h('div', { class: 'hookpro' }, h('p', { class: 'hp-title' }, tp.lockModal.title(L(hs.label))), h('ul', {}, ...tp.lockModal.bullets.map((x) => h('li', {}, x))),
      h('button', { class: 'btn cta-gb', type: 'button', onclick: () => { A.sel = null; openPaywall('anatomy'); } }, tp.lockModal.cta)));
  } else if (!full) {
    body.append(...pendingState(id));
  } else {
    const L_ = hs.layers;
    body.append(secBlock(1, tp.sec.seen, layerNode(L_.seen)), secBlock(2, tp.sec.physiology, layerNode(L_.physiology)),
      L_.psyche ? secBlock(3, tp.sec.psyche, layerNode(L_.psyche)) : '',
      L_.scene ? secBlock(4, tp.sec.scene, layerNode(L_.scene)) : '',
      secBlock(5, tp.sec.check, layerNode(L_.check, 'qs'), 'tool'),
      L_.hook ? h('div', { class: 'hookpro' }, h('p', { class: 'hp-title' }, L(L_.hook.title)), h('ul', {}, ...LA(L_.hook.bullets).map((x) => h('li', {}, x))), h('button', { class: 'btn cta-gb', type: 'button', onclick: () => { A.sel = null; openPaywall('anatomy'); } }, L(L_.hook.cta))) : '',
      secBlock(6, tp.sec.calib, layerNode(L_.calibration, 'steps'), 'calib'),
      secBlock(7, tp.sec.fix, layerNode(L_.fixation), 'fix'),
      h('details', { class: 'src' }, h('summary', {}, tp.sec.limits), layerNode(L_.notProven), h('h3', {}, tp.layers.alt), layerNode(L_.alt),
        h('p', { class: 'sub muted relnote' }, tp.relDesc[hs.reliability] || '')));
    if (hs.research) body.append(h('details', { class: 'src' }, h('summary', {}, tp.source), h('p', { class: 'sub muted' }, L(hs.research))));
    body.append(trainerBlock(full));
    body.append(h('p', { class: 'sub muted' }, L(data.pro.meta.caption)));
  }
  const grip = h('button', { class: 'sheet-grip', type: 'button', 'aria-expanded': String(A.full),
    onclick: () => { A.full = !A.full; sheet.classList.toggle('full', A.full); document.body.classList.toggle('sheet-full', A.full); grip.setAttribute('aria-expanded', String(A.full)); grip.querySelector('span').textContent = A.full ? tp.sheetLess : tp.sheetHint; } },
    h('span', {}, A.full ? tp.sheetLess : tp.sheetHint));
  const sheet = h('div', { class: 'sheet' + (A.full ? ' full' : ''), role: 'dialog', 'aria-modal': 'false', 'aria-label': L(hs.label) }, h('div', { class: 'sheet-handle', 'aria-hidden': 'true', onclick: () => grip.click() }), head, grip, body);
  const hint = h('button', { class: 'scroll-hint hide', type: 'button', onclick: () => {
    const target = sheet.querySelector('.hookpro');
    if (target) sheet.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' }); else sheet.scrollTo({ top: sheet.scrollHeight, behavior: 'smooth' });
  } }, h('span', { class: 'arr', 'aria-hidden': 'true' }, '↓'), tp.lockModal.scrollHint);
  const upd = () => { const more = sheet.scrollHeight - sheet.scrollTop - sheet.clientHeight > 48; hint.classList.toggle('hide', !(A.full && more)); };
  sheet.addEventListener('scroll', upd, { passive: true });
  grip.addEventListener('click', () => setTimeout(upd, 340));
  sheet.append(hint); setTimeout(upd, 350); setTimeout(upd, 900);
  let y0 = null;
  const setFull = (v) => { if (A.full !== v) grip.click(); };
  sheet.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', (e) => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; y0 = null; if (dy < -40) setFull(true); else if (dy > 40 && !body.scrollTop) setFull(false); }, { passive: true });
  document.body.append(h('div', { class: 'sheet-host' }, sheet));
  document.body.classList.add('sheet-open');
  document.body.classList.toggle('sheet-full', A.full);
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
