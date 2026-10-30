// Общие объекты и помощники интерфейса: язык, DOM-хелпер h(), навигация, загрузка данных.
import { T } from './ui-text.js?v=test3';
import { TP } from './ui-pro-text.js?v=test3';
import { CONFIG } from './config.js?v=test3';
import { read, write, patch, KEYS } from './store.js?v=test3';

export const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
const tgLang = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code;
const detected = ((tgLang || navigator.language || 'ru').toLowerCase().startsWith('ru')) ? 'ru' : 'en';
const savedLang = (() => { const v = read(KEYS.lang, null); return v === 'ru' || v === 'en' ? v : null; })();
// lang меняется на лету: t и tp — прокси к текущему языку, поэтому экраны подхватывают переключение без перезагрузки.
export let lang = savedLang || detected;
export const t = new Proxy({}, { get: (_, k) => T[lang][k] });
export const tp = new Proxy({}, { get: (_, k) => TP[lang][k] });
export function setLang(l) {
  if (l !== 'ru' && l !== 'en') return;
  lang = l; write(KEYS.lang, l); document.documentElement.lang = l;
}
// Если сервер подключён (apiBase), бета-режим отключается: права решает сервер, а не флаг.
// Временный тумблер для тестов на телефоне: 'test' (всё открыто) или 'user' (с замками). Меняется в «Помощи».
export const MODE_KEY = 'chitay.mode.v1';
const modeOverride = () => { try { return localStorage.getItem(MODE_KEY); } catch { return null; } };
export const CFG = { ...CONFIG, proPreview: modeOverride() === 'user' ? false : modeOverride() === 'test' ? true : !!CONFIG.proPreview && !CONFIG.apiBase };
export const root = document.getElementById('app');
export const L = (o) => (o && (o[lang] || o.en || o.ru)) || '';
export const LA = (o) => (o && (o[lang] || o.en || o.ru)) || [];
export const data = { quiz: null, pro: null, calib: null, hypo: null };
// Единый возрастной ценз 16+ на всё приложение: экран выбора возраста и закрытые разделы убраны.
// state/isAdult/ageOk оставлены как постоянные, чтобы не менять остальные экраны.
export const state = { age: 'adult' };
export const isAdult = () => true;
export const ageOk = () => true;
export function setAge() { /* возраст больше не спрашиваем */ }

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
export function closeSheet() { document.querySelectorAll('.sheet-host').forEach((n) => n.remove()); document.body.classList.remove('sheet-open', 'sheet-full'); }

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
