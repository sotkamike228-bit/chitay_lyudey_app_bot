// Проверка гипотезы в 3 шага: чистая логика (тестируется в Node). Итог: «сила гипотезы», не вероятность.
export const FAMILIES = ['speech', 'gaze', 'body', 'content'];
export const STRENGTHS = ['none', 'weak', 'strong'];

/**
 * baseline: знает ли пользователь обычное поведение человека.
 * asked: сколько проверочных вопросов задано (0–3).
 * recurred: независимые семейства признаков, вернувшихся при повторе на той же теме.
 * Устойчивая = минимум 2 независимых семейства И известна базовая линия; иначе не выше «Слабой».
 */
export function evaluate({ baseline, asked, recurred }) {
  if (!(asked >= 1)) return { ready: false, reason: 'noQuestions' };
  const k = new Set((recurred || []).filter((f) => FAMILIES.includes(f))).size;
  let level = k === 0 ? 'none' : k === 1 ? 'weak' : 'strong';
  let capped = false;
  if (level === 'strong' && !baseline) { level = 'weak'; capped = true; }
  return { ready: true, level, families: k, capped };
}
