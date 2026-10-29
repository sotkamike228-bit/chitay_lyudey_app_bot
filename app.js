import { h, html, L, t, tp, tg, lang, setLang, data, state, render, nav, loadJson, CFG, closeSheet, ageOk, setAge, topbar } from './ctx.js?v=test2';
import { read, patch, KEYS } from './store.js?v=test2';
import { hasAccess } from './access.js?v=test2';
import { openQuiz, openCalibration } from './quiz.js?v=test2';
import { openAnatomy, totalZones } from './anatomy.js?v=test2';
import { openPaywall } from './paywall.js?v=test2';
import { openSheets } from './sheets.js?v=test2';
import { openHelp } from './help-view.js?v=test2';
import { ICONS } from './icons.js?v=test2';
import { refreshEntitlements } from './services.js?v=test2';

// ---------- возраст ----------
function screenAge() {
  if (state.age === 'under16') return screenUnder16();
  const pick = (v) => { setAge(v); nav.reset(); };
  render(nav.depth() > 1 ? topbar('') : '', h('h1', {}, t.appName), h('p', { class: 'muted' }, t.subtitle),
    h('div', { class: 'card' }, h('h2', {}, t.ageTitle), h('p', { class: 'sub muted' }, t.ageNote),
      h('button', { class: 'btn', onclick: () => pick('adult') }, t.ageAdult),
      h('button', { class: 'btn secondary', onclick: () => pick('teen') }, t.ageTeen),
      h('button', { class: 'link', type: 'button', onclick: () => { setAge('under16'); screenUnder16(); } }, t.ageUnder)),
    h('p', { class: 'disc' }, t.disclaimer));
}
function screenUnder16() {
  render(h('h1', {}, t.appName), h('div', { class: 'card' }, h('h2', {}, t.ageBlockTitle), h('p', {}, t.ageBlockText),
    h('button', { class: 'btn secondary', onclick: () => openHelp() }, t.help),
    h('button', { class: 'link', type: 'button', onclick: () => { setAge(null); screenAge(); } }, t.ageRetry)));
}

// ---------- главная ----------
const ICON = { quiz: ICONS.test, anatomy: ICONS.scanFace, calib: ICONS.gauge, sheets: ICONS.sheets };

function tile(key, badge, badgeKind, onclick, disabled, extra = '') {
  const tl = tp.tiles[key];
  return h('button', { class: 'tile' + (extra ? ' ' + extra : '') + (disabled ? ' off' : '') + (badgeKind === 'pro' ? ' is-pro' : ''), type: 'button', disabled: !!disabled, onclick },
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
      tile('anatomy', tp.badges.atlas, 'pro', () => nav.go(openAnatomy), false, 'flagship'),
      tile('sheets', tp.badges.pro, 'pro', () => nav.go(openSheets)),
      tile('quiz', tp.badges.free, 'free', () => nav.go(openQuiz)),
      tile('calib', tp.badges.pro, 'pro', () => nav.go(openCalibration), false, 'compact')),
    h('div', { class: 'card strip' }, h('span', {}, tp.atlas(a.opened.length, total)),
      typeof best === 'number' ? h('span', { class: 'muted' }, t.best(best)) : ''),
  ];
  nodes.push(h('button', { class: 'btn promo', type: 'button', onclick: () => openPaywall() }, '★ ' + tp.pay.homeLink));
  render(...nodes);
}

// ---------- запуск ----------
const disc = document.getElementById('disclaimer');
const helpBtn = document.getElementById('helpLink'); helpBtn.addEventListener('click', () => openHelp(() => nav.go(screenAge)));
function applyStatic() {
  document.documentElement.lang = lang;
  disc.textContent = ''; disc.hidden = true; helpBtn.textContent = t.help;
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
