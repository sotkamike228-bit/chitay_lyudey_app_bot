// Тарифы (вариант B, утверждён владельцем 27.10.2026). Все платежи разовые, без автосписаний.
// Цена на клиенте только для показа. Источник истины о сумме будет на сервере.
export const PRODUCTS = [
  { id: 'pack_cheatsheets', stars: 199, days: null },  // навсегда
  { id: 'pro_yearly', stars: 990, days: 365 },
  { id: 'pro_monthly', stars: 149, days: 30 },
];
export const productById = (id) => PRODUCTS.find((p) => p.id === id) || null;
export const perMonth = (p) => (p.days ? Math.round((p.stars * 30) / p.days) : null);
