// Тарифы (обновлено 28.10.2026: 189 / 369 / 999). Все платежи разовые, без автосписаний.
// Цена на клиенте только для показа. Источник истины о сумме будет на сервере.
export const PRODUCTS = [
  { id: 'pack_cheatsheets', stars: 1, days: null },  // навсегда
  { id: 'pro_lifetime', stars: 1, days: null },  // навсегда
  { id: 'pro_monthly', stars: 1, days: 30 },
];
export const productById = (id) => PRODUCTS.find((p) => p.id === id) || null;
export const perMonth = (p) => (p.days ? Math.round((p.stars * 30) / p.days) : null);
