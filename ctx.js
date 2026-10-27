// Общие объекты и помощники интерфейса: язык, DOM-хелпер h(), навигация, загрузка данных.
import { T } from './ui-text.js';
import { TP } from './ui-pro-text.js';
import { CONFIG } from './config.js';
import { read, patch, KEYS } from './store.js';

export const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
const tgLang = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code;
export const lang = ((tgLang || navigator.language || 'ru').toLowerCase().startsWith('ru')) ? 'ru' : 'en';
export const t = T[lang];
export const tp = TP[lang];
// Если сервер подключён (apiBase), бета-режим отключается: права решает сервер, а не флаг.
export const CFG = { ...CONFIG, proPreview: !!CONFIG.proPreview && !CONFIG.apiBase };
export const root = document.getElementById('app');
export const L = (o) => (o && (o[lang] || o.en || o.ru)) || '';
export const LA = (o) => (o && (o[lang] || o.en || o.ru)) || [];
export const data = { quiz: null, pro: null, calib: null, hypo: null };
// Возраст спрашиваем один раз: 'adult' (18+), 'teen' (16–17), 'under16' (доступ закрыт) или null (ещё не отвечал).
// Старые отметки (age18 true/false) переносятся; кто отвечал только «16+», увидит единый экран один раз.
const stored = read(KEYS.core, {});
export const state = { age: stored.age || (stored.age18 === true ? 'adult' : stored.age18 === false ? 'teen' : null) };
export const isAdult = () => state.age === 'adult';
export const ageOk = () => state.age === 'adult' || state.age === 'teen';
export function setAge(v) { state.age = v; patch(KEYS.core, { age: v }); }

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
export function html(tag, attrs, markup) { const el = h(tag, attrs); el.innerHTML = markup; return el; }

export function render(...nodes) { root.replaceChildren(...nodes); window.scrollTo({ top: 0 }); closeSheet(); }
export function haptic(kind) { try { tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(kind || 'light'); } catch { /* нет */ } }
export function toast(msg) { const el = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(el); setTimeout(() => el.remove(), 1800); }
export function closeSheet() { document.querySelectorAll('.sheet-host').forEach((n) => n.remove()); document.body.classList.remove('sheet-open'); }

// ---- навигация: стек функций-экранов ----
const stack = [];
let homeFn = null;
export const nav = {
  setHome(fn) { homeFn = fn; },
  go(fn) { stack.push(fn); sync(); fn(); },
  replace(fn) { if (stack.length) stack[stack.length - 1] = fn; else stack.push(fn); sync(); fn(); },
  back() { if (stack.length > 1) stack.pop(); const fn = stack[stack.length - 1] || homeFn; sync(); fn(); },
  reset() { stack.length = 0; stack.push(homeFn); sync(); homeFn(); },
  depth: () => stack.length,
};
function sync() {
  try {
    if (!tg || !tg.BackButton) return;
    if (stack.length > 1) tg.BackButton.show(); else tg.BackButton.hide();
  } catch { /* старый клиент */ }
}
if (tg && tg.BackButton) { try { tg.BackButton.onClick(() => { closeSheet(); nav.back(); }); } catch { /* нет */ } }

export function topbar(title) {
  return h('div', { class: 'topbar' },
    nav.depth() > 1 ? h('button', { class: 'back', type: 'button', 'aria-label': tp.back, onclick: () => nav.back() }, '‹') : h('span', { class: 'back-sp' }),
    h('span', { class: 'topbar-title' }, title || ''));
}

export async function loadJson(name) {
  const r = await fetch(name, { cache: 'no-cache' });
  if (!r.ok) throw new Error(name + ' ' + r.status);
  return r.json();
}
