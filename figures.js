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

const FACE_ACCENT = `
  <path d="M33 31 Q40 27 47 31 M53 31 Q60 27 67 31"/>
  <path d="M34 47 Q40 51 46 47 M54 47 Q60 51 66 47"/>
  <path d="M44 25 Q50 22 56 25"/>`;

// Нижняя часть лица крупно: нос, губы, челюсть, горло.
const MOUTH = `
  <path d="M14 12 Q16 60 34 76 Q50 86 66 76 Q84 60 86 12"/>
  <path d="M43 24 Q50 33 57 24 M44 30 Q46 32.5 49 31 M56 30 Q54 32.5 51 31"/>
  <path d="M48 35 L48 42 M52 35 L52 42"/>
  <path d="M32 50 Q40 44 46 46 Q50 44.5 54 46 Q60 44 68 50 Q50 54 32 50"/>
  <path d="M34 51 Q50 64 66 51"/>
  <path d="M42 71 Q50 74 58 71"/>
  <path d="M38 82 L35 100 M62 82 L65 100"/>`;
const MOUTH_ACCENT = `
  <path d="M18 44 Q20 62 32 72 M82 44 Q80 62 68 72"/>
  <path d="M38 40 Q34 50 38 58 M62 40 Q66 50 62 58"/>
  <path d="M45 88 Q50 92 55 88 M45 94 Q50 98 55 94"/>`;

// Корпус: плечи, скрещённые на груди руки, ноги.
const BODY = `
  <circle cx="50" cy="14" r="9"/>
  <path d="M46 23 L46 28 M54 23 L54 28"/>
  <path d="M26 36 Q32 28 46 28 L54 28 Q68 28 74 36 L69 64 Q50 69 31 64 Z"/>
  <path d="M26 37 Q21 48 29 57 M74 37 Q79 48 71 57"/>
  <path d="M29 57 Q50 44 72 55 M71 57 Q50 44 28 55"/>
  <path d="M41 67 L41 92 M59 67 L59 92 M36 95 L45 95 M55 95 L64 95"/>`;
const BODY_ACCENT = `
  <path d="M27 34 Q38 26 46 27 M73 34 Q62 26 54 27"/>
  <path d="M38 44 Q50 40 62 44"/>`;

// Кисти на столе (вид спереди): пальцы к столу, под столом места для рук.
const HANDS = `
  <path d="M4 70 L96 70"/>
  <path d="M28 55 Q22 40 20 24 M40 55 Q38 40 36 24"/>
  <path d="M72 55 Q78 40 80 24 M60 55 Q62 40 64 24"/>
  <ellipse cx="34" cy="58" rx="9" ry="6"/>
  <path d="M27 62 L26 69 M31 64 L30 69 M35 64 L35 69 M39 62 L40 69"/>
  <ellipse cx="66" cy="58" rx="9" ry="6"/>
  <path d="M73 62 L74 69 M69 64 L70 69 M65 64 L65 69 M61 62 L60 69"/>
  <path d="M36 85 Q42 78 48 85 M52 85 Q58 78 64 85" stroke-dasharray="2 2"/>
  <path d="M30 71 L30 98 M70 71 L70 98" stroke-dasharray="1 3"/>`;
const HANDS_ACCENT = `
  <path d="M22 54 Q19 58 22 62 M46 54 Q49 58 46 62"/>
  <path d="M25 52 Q34 49 43 52 M57 52 Q66 49 75 52"/>`;

const VIEWS = {
  face: [HEAD, FACE_ACCENT], mouth: [MOUTH, MOUTH_ACCENT], body: [BODY, BODY_ACCENT], hands: [HANDS, HANDS_ACCENT],
};

export function figureSvg(view, label) {
  const [inner, accent] = VIEWS[view] || VIEWS.body;
  return `<svg class="fig" viewBox="0 0 100 100" role="img" aria-label="${label}" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
    <g class="accent" fill="none" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${accent}</g></svg>`;
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
