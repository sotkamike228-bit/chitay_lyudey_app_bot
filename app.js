import { h, html, L, t, tp, tg, lang, setLang, data, state, render, nav, loadJson, CFG, closeSheet, ageOk, setAge, topbar } from './ctx.js';
import { read, patch, KEYS } from './store.js';
import { hasAccess } from './access.js';
import { openQuiz, openCalibration } from './quiz.js';
import { openAnatomy, totalZones } from './anatomy.js';
import { openPaywall } from './paywall.js';
import { openSheets } from './sheets.js';
import { openHelp } from './help-view.js';
import { refreshEntitlements } from './services.js';

// ---------- возраст ----------
function screenAge() {
  if (state.age === 'under16') return screenUnder16();
  const pick = (v) => { setAge(v); nav.reset(); };
  render(nav.depth() > 1 ? topbar('') : '', h('h1', {}, t.appName), h('p', { class: 'muted' }, t.subtitle),
    h('div', { class: 'card' }, h('h2', {}, t.ageTitle), h('p', { class: 'sub muted' }, t.ageNote),
      h('button', { class: 'btn', onclick: () => pick('adult') }, t.ageAdult),
      h('button', { class: 'btn secondary', onclick: () => pick('teen') }, t.ageTeen),
      h('button', { class: 'link', type: 'button', onclick: () => { setAge('under16'); screenUnder16(); } }, t.ageUnder)));
}
function screenUnder16() {
  render(h('h1', {}, t.appName), h('div', { class: 'card' }, h('h2', {}, t.ageBlockTitle), h('p', {}, t.ageBlockText),
    h('button', { class: 'btn secondary', onclick: () => openHelp() }, t.help),
    h('button', { class: 'link', type: 'button', onclick: () => { setAge(null); screenAge(); } }, t.ageRetry)));
}

// ---------- главная ----------
const ICON = {
  quiz: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5M12 17h.01"/></svg>',
  anatomy: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6" r="3"/><path d="M6 21v-5a6 6 0 0 1 12 0v5M9 14l-3 3M15 14l3 3"/></svg>',
  calib: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18a8 8 0 1 1 16 0M12 18l4-6"/><circle cx="12" cy="18" r="1.2"/></svg>',
  sheets: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/></svg>',
};

function tile(key, badge, badgeKind, onclick, disabled) {
  const tl = tp.tiles[key];
  return h('button', { class: 'tile' + (disabled ? ' off' : '') + (badgeKind === 'pro' ? ' is-pro' : ''), type: 'button', disabled: !!disabled, onclick },
    html('span', { class: 'ico' }, ICON[key]),
    h('span', { class: 'tile-title' }, tl.title),
    h('span', { class: 'tile-sub' }, tl.sub),
    h('span', { class: 'badge ' + badgeKind }, badge));
}

function langToggle() {
  const btn = (code) => h('button', { class: 'lang-btn', type: 'button', 'aria-pressed': String(lang === code), 'aria-label': code === 'ru' ? 'Русский' : 'English',
    onclick: () => { if (lang === code) return; setLang(code); applyStatic(); screenHome(); } }, code.toUpperCase());
  return h('div', { class: 'lang-toggle', role: 'group', 'aria-label': 'Language' }, btn('ru'), btn('en'));
}

function screenHome() {
  const ent = read(KEYS.ent, {});
  const a = read(KEYS.atlas, { opened: [] });
  const best = read(KEYS.core, {}).best;
  const total = data.pro ? totalZones(data.pro) : 11;
  const nodes = [
    h('div', { class: 'home-head' }, h('div', {}, h('h1', {}, t.appName), h('p', { class: 'muted' }, tp.homeSub)), langToggle()),
    h('div', { class: 'grid' },
      tile('quiz', tp.badges.free, 'free', () => nav.go(openQuiz)),
      tile('anatomy', hasAccess('anatomy', ent, CFG) && CFG.proPreview ? tp.badges.pro : tp.badges.part, 'pro', () => nav.go(openAnatomy)),
      tile('calib', tp.badges.pro, 'pro', () => nav.go(openCalibration)),
      tile('sheets', tp.badges.pro, 'pro', () => nav.go(openSheets))),
    h('div', { class: 'card strip' }, h('span', {}, tp.atlas(a.opened.length, total)),
      typeof best === 'number' ? h('span', { class: 'muted' }, t.best(best)) : ''),
  ];
  nodes.push(h('button', { class: 'btn secondary', type: 'button', onclick: () => openPaywall() }, tp.pay.homeLink));
  nodes.push(h('button', { class: 'link', type: 'button', onclick: () => nav.go(screenAge) }, t.ageCurrent[state.age]));
  if (CFG.proPreview) nodes.push(h('p', { class: 'sub muted' }, tp.previewNote));
  render(...nodes);
}

// ---------- запуск ----------
const disc = document.getElementById('disclaimer');
const helpBtn = document.getElementById('helpLink'); helpBtn.addEventListener('click', () => openHelp());
function applyStatic() {
  document.documentElement.lang = lang;
  disc.textContent = t.disclaimer; helpBtn.textContent = t.help;
  if (CFG.privacyUrl) { const a = document.getElementById('privacyLink'); a.hidden = false; a.href = CFG.privacyUrl; a.textContent = t.privacy; }
}
applyStatic();

function applyTheme() {
  const scheme = (tg && tg.colorScheme) || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = scheme;
  try { tg && tg.setHeaderColor && tg.setHeaderColor(scheme === 'light' ? '#F5F6F9' : '#0B0D12'); tg && tg.setBackgroundColor && tg.setBackgroundColor(scheme === 'light' ? '#F5F6F9' : '#0B0D12'); } catch { /* старый клиент */ }
}
applyTheme();
if (tg) { try { tg.ready(); tg.expand(); tg.onEvent && tg.onEvent('themeChanged', applyTheme); } catch { /* нет */ } }

nav.setHome(() => (ageOk() ? screenHome() : screenAge()));
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
loadJson('chitay_quiz.json')
  .then(async (q) => { data.quiz = q; await withTimeout(refreshEntitlements(), 2500); nav.reset(); })
  .catch(() => render(h('div', { class: 'card' }, t.loadError)));
