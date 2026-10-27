// Единый линейный SVG-стиль: стилизованные фигуры без лиц реальных людей. viewBox 0..100.
const HEAD = `
  <path d="M43 78 L43 87 M57 78 L57 87"/>
  <path d="M16 100 Q22 90 43 87 M84 100 Q78 90 57 87"/>
  <ellipse cx="50" cy="46" rx="26" ry="32"/>
  <path d="M24 44 Q18 48 24 56 M76 44 Q82 48 76 56"/>
  <path d="M32 35 Q40 31 47 35 M53 35 Q60 31 68 35"/>
  <ellipse cx="40" cy="42" rx="6" ry="3"/><ellipse cx="60" cy="42" rx="6" ry="3"/>
  <circle class="dot" cx="40" cy="42" r="1.7"/><circle class="dot" cx="60" cy="42" r="1.7"/>
  <path d="M50 45 L47.5 57 Q50 59.5 52.5 57"/>
  <path d="M42 65 Q50 69 58 65 M42 65 Q50 63 58 65"/>`;

const BODY = `
  <circle cx="50" cy="14" r="9"/>
  <path d="M46 23 L46 28 M54 23 L54 28"/>
  <path d="M31 33 Q36 28 46 28 L54 28 Q64 28 69 33 L67 62 Q50 66 33 62 Z"/>
  <path d="M30 34 Q24 48 32 60 M70 34 Q76 48 68 60"/>
  <circle cx="34" cy="62" r="3"/><circle cx="66" cy="62" r="3"/>
  <path d="M41 65 L41 92 M59 65 L59 92 M36 95 L45 95 M55 95 L64 95"/>`;

export function figureSvg(view, label) {
  const inner = view === 'face' ? HEAD : BODY;
  return `<svg class="fig" viewBox="0 0 100 100" role="img" aria-label="${label}" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
}

/** Подсветка зоны и линия-выноска от метки к зоне (в тех же координатах). */
export function overlaySvg(hotspots, activeId) {
  const shapes = hotspots.map((hs) => {
    const r = hs.region, p = hs.pin;
    const cx = r.cx, cy = r.cy;
    const on = hs.id === activeId ? ' on' : '';
    const shape = r.shape === 'circle'
      ? `<circle class="zone${on}" cx="${r.cx}" cy="${r.cy}" r="${r.r}"/>`
      : `<ellipse class="zone${on}" cx="${r.cx}" cy="${r.cy}" rx="${r.rx}" ry="${r.ry}"/>`;
    return `<line class="leader${on}" x1="${p.x}" y1="${p.y}" x2="${cx}" y2="${cy}"/>${shape}`;
  }).join('');
  return `<svg class="overlay-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${shapes}</svg>`;
}
