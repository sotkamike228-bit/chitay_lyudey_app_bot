// Тарифы (утверждены 30.10.2026): Шпаргалки 299 ₽ / 4.99 USDT / 190 ⭐; PRO 30 дней 599 ₽ / 9.99 USDT / 390 ⭐; PRO навсегда 1499 ₽ / 19.99 USDT / 990 ⭐.
// Все платежи разовые, без автосписаний. Источник истины о сумме на сервере.
// Цена на клиенте только для показа. Источник истины о сумме будет на сервере.
export const PRODUCTS = [
  { id: 'pack_cheatsheets', stars: 190, rub: 299, usdt: '4.99', days: null },  // навсегда
  { id: 'pro_lifetime', stars: 990, rub: 1499, usdt: '19.99', days: null },  // навсегда
  { id: 'pro_monthly', stars: 390, rub: 599, usdt: '9.99', days: 30 },
];
export const productById = (id) => PRODUCTS.find((p) => p.id === id) || null;
export const perMonth = (p) => (p.days ? Math.round((p.stars * 30) / p.days) : null);
export const priceMain = (p) => `${p.rub} ₽`;
export const priceAlt = (p) => `/ ${p.usdt} USDT (${p.stars} ⭐)`;
