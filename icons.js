// Контурные неоновые пиктограммы (SVG, stroke=currentColor). Без цветных эмодзи.
const S = (d) => `<svg viewBox="0 0 48 48" aria-hidden="true" class="neon-ico">${d}</svg>`;
export const ICONS = {
  eyes: S('<path d="M5 24c5-8 12-12 19-12s14 4 19 12c-5 8-12 12-19 12S10 32 5 24z"/><circle cx="24" cy="24" r="6"/><circle cx="24" cy="24" r="1.6"/>'),
  lips: S('<path d="M6 24c5-6 9-8 12-6 2 1 4 1 6 0 3-2 7 0 12 6-5 8-10 11-18 11S11 32 6 24z"/><path d="M8 24h32"/>'),
  posture: S('<circle cx="24" cy="9" r="4"/><path d="M14 18c4-3 16-3 20 0M12 20l-3 16M36 20l3 16M18 20l1 18M30 20l-1 18M19 38h10"/>'),
  hands: S('<path d="M16 40V22l-3-5c-1-2 1-4 3-3l3 3V10c0-2 3-2 3 0v12V8c0-2 3-2 3 0v14V11c0-2 3-2 3 0v13V16c0-2 3-2 3 0v14c0 6-4 10-9 10z"/>'),
  legs: S('<path d="M18 6v22l-6 12h10M30 6v22l6 12H26M18 6h12"/>'),
  biz: S('<rect x="6" y="14" width="36" height="24" rx="4"/><path d="M17 14v-4h14v4M6 25h36M22 25v4h4v-4"/>'),
  rel: S('<path d="M24 40S8 30 8 19c0-5 4-8 8-8 3 0 6 2 8 5 2-3 5-5 8-5 4 0 8 3 8 8 0 11-16 21-16 21z"/>'),
  shield: S('<path d="M24 6l15 5v12c0 9-6 16-15 19C15 39 9 32 9 23V11z"/><path d="M17 24l5 5 9-10"/>'),
  tools: S('<path d="M30 8a9 9 0 0 0-8 12L8 34l6 6 14-14a9 9 0 0 0 12-8l-6 5-5-1-1-5z"/>'),
  scanFace: S('<path d="M6 14V8a2 2 0 0 1 2-2h6M34 6h6a2 2 0 0 1 2 2v6M42 34v6a2 2 0 0 1-2 2h-6M14 42H8a2 2 0 0 1-2-2v-6"/><path d="M24 12c-6 0-9 5-9 10 0 7 4 13 9 13s9-6 9-13c0-5-3-10-9-10z"/><path d="M15 21h18M16 27h16M24 12v23M19 16c1 6 1 14 5 19M29 16c-1 6-1 14-5 19"/><path d="M8 24h32" stroke-dasharray="2 3"/>'),
  scan: S('<circle cx="24" cy="14" r="6"/><path d="M12 42v-8a12 12 0 0 1 24 0v8M6 24h6M36 24h6M24 4v2"/>'),
  test: S('<circle cx="24" cy="24" r="17"/><path d="M19 19a5 5 0 1 1 7 4.5c-1.5.7-2 1.700-2 3M24 33h.1"/>'),
  gauge: S('<path d="M8 36a16 16 0 1 1 32 0M24 36l8-11"/><circle cx="24" cy="36" r="2"/>'),
  sheets: S('<rect x="10" y="5" width="28" height="38" rx="4"/><path d="M17 15h14M17 23h14M17 31h9"/>'),
};
export const HUB_ICON = ['eyes', 'lips', 'posture', 'hands', 'legs'];
