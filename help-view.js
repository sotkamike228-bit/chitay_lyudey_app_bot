import { h, t, lang, render, closeSheet } from './ctx.js';
import { HELP } from './help.js';

/** Экран помощи поверх текущего: не теряет прогресс. */
export function openHelp(onAge) {
  closeSheet();
  const data = HELP[lang];
  const box = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': t.helpTitle },
    h('div', { class: 'overlay-inner' }, h('h1', {}, t.helpTitle), h('p', {}, data.intro),
      h('div', { class: 'card' }, ...data.items.map((it) => h('div', { class: 'row' }, h('p', {}, it.name),
        h('a', { class: 'tel', href: 'tel:' + it.dial }, it.display)))),
      h('p', { class: 'sub muted' }, data.note),
      onAge ? h('button', { class: 'btn secondary', type: 'button', onclick: () => { box.remove(); onAge(); } }, t.ageChange) : '',
      h('p', { class: 'disc' }, t.disclaimer),
      h('button', { class: 'btn secondary', onclick: () => box.remove() }, t.back)));
  document.body.append(box);
}
