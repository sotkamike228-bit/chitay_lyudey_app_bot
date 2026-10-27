// Общие экземпляры: оформление покупки, загрузка платного контента, обновление прав.
import { tg, CFG } from './ctx.js';
import { write, KEYS } from './store.js';
import { createBilling } from './billing.js';
import { createProLoader } from './proapi.js';

export const billing = createBilling({ apiBase: CFG.apiBase, tg });
export const proLoader = createProLoader({ apiBase: CFG.apiBase, tg, preview: CFG.proPreview });

/** Спрашивает права у сервера и кладёт в кэш интерфейса. Кэш нужен только для показа: контент всё равно проверяет сервер. */
export async function refreshEntitlements() {
  if (!billing.enabled()) return null;
  try {
    const e = await billing.fetchEntitlements();
    write(KEYS.ent, { products: e.products || [], exp: e.exp || {} });
    proLoader.clear();
    return e;
  } catch { return null; }
}
