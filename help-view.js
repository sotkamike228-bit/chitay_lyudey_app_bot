import { h, t, lang, render, closeSheet, CFG, MODE_KEY, tp } from './ctx.js?v=test3';
import { HELP } from './help.js?v=test3';

function devBlock() {
  const set = (mode) => { if ((mode === 'test') === !!CFG.proPreview) return; try { localStorage.setItem(MODE_KEY, mode); } catch { /* нет хранилища */ } location.reload(); };
  const opt = (mode, label) => h('button', { class: 'dev-opt', type: 'button', role: 'radio', 'aria-checked': String((mode === 'test') === !!CFG.proPreview), onclick: () => set(mode) },
    h('span', { class: 'dev-dot', 'aria-hidden': 'true' }), label);
  return h('div', { class: 'card dev-card', role: 'radiogroup', 'aria-label': tp.mode.title },
    h('div', { class: 'dev-title' }, h('span', { class: 'badge pro sm' }, 'DEV'), tp.mode.title),
    opt('user', tp.mode.user), opt('test', tp.mode.test), h('p', { class: 'sub muted' }, tp.mode.note));
}

/** Экран помощи поверх текущего: не теряет прогресс. */
export function openHelp(onAge) {
  closeSheet();
  const data = HELP[lang];
  const box = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': t.helpTitle },
    h('div', { class: 'overlay-inner' }, h('h1', {}, t.helpTitle), devBlock(), h('p', {}, data.intro),
      h('div', { class: 'card' }, ...data.items.map((it) => h('div', { class: 'row' }, h('p', {}, it.name),
        h('a', { class: 'tel', href: 'tel:' + it.dial }, it.display)))),
      h('p', { class: 'sub muted' }, data.note),
      onAge ? h('button', { class: 'btn secondary', type: 'button', onclick: () => { box.remove(); onAge(); } }, t.ageChange) : '',
      h('p', { class: 'disc' }, t.disclaimer),
      h('button', { class: 'btn secondary', onclick: () => box.remove() }, t.back)));
  document.body.append(box);
}
