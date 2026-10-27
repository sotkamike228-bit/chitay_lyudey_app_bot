// Чистая логика квиза без DOM: тестируется в Node (tests/engine.test.mjs).
export const MAX_PICK = 2;

/** Кейсы, доступные пользователю: без подтверждения 18+ скрыты кейсы с треком «Отношения». */
export function playableCases(quiz, adult18) {
  return quiz.cases.filter((c) => adult18 || !c.adultOnly).sort((a, b) => a.order - b.order);
}

/** Очки за выбранные наблюдения: сумма, но не меньше 0 и не больше 2. */
export function scoreObservations(quiz, c, pickedIds) {
  const w = quiz.scoring.observations;
  const sum = pickedIds.reduce((acc, id) => {
    const o = c.observations.find((x) => x.id === id);
    return acc + (o ? w[o.kind] : 0);
  }, 0);
  return Math.max(w.caseMinimum, Math.min(2, sum));
}

export function scoreAction(quiz, c, actionId) {
  const a = c.actions.find((x) => x.id === actionId);
  return a ? quiz.scoring.actions[a.grade] : 0;
}

/** Верные наблюдения, которые пользователь не выбрал (слепые зоны). */
export function missedSignals(c, pickedIds) {
  return c.observations.filter((o) => o.kind === 'signal' && !pickedIds.includes(o.id));
}

export function percent(total, casesPlayed, quiz) {
  const max = casesPlayed * quiz.scoring.maxPerCase;
  return max === 0 ? 0 : Math.round((total / max) * 100);
}

export function tierFor(quiz, pct) {
  const tiers = [...quiz.statusTiers].sort((a, b) => b.minPercent - a.minPercent);
  return tiers.find((t) => pct >= t.minPercent) || tiers[tiers.length - 1];
}

/** Параметр вызова: «c85». Допустимые символы start_param Telegram: A-Za-z0-9_-. */
export function encodeChallenge(pct) { return 'c' + Math.max(0, Math.min(100, Math.round(pct))); }
export function parseChallenge(s) {
  if (typeof s !== 'string') return null;
  const m = /^c(\d{1,3})$/.exec(s.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 0 && n <= 100 ? n : null;
}

export function shuffle(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function compareChallenge(mine, theirs) {
  if (theirs == null) return null;
  return mine > theirs ? 'win' : mine < theirs ? 'lose' : 'tie';
}
