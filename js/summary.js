import { formatScore } from "./scoring.js?v=20261108d";

export const CONDITION_GOOD_MIN = 8;
export const CONDITION_NOTES_MIN = 5;

export const CONDITION_LABELS = {
  unchecked: "Не проверено",
  good: "Хорошее состояние",
  notes: "Есть замечания",
  repair: "Нужен ремонт",
  unpublished: "Отчёт ещё не опубликован",
};

export const DIRECTION_TITLES = {
  hodovaya: "Ходовая часть",
  engine: "Двигатель",
  electric: "Электроприборы и электрооборудование",
  body: "Кузов",
  interior: "Салон",
  geometry: "Геометрия / Лонжероны",
  wheels: "Колёса и резина",
};

export function directionTitle(slug, fallback = "") {
  return DIRECTION_TITLES[slug] || fallback || slug;
}

export function conditionFromScore(score, checked = 1) {
  if (score === null || score === undefined || !Number.isFinite(score) || checked === 0) {
    return { kind: "unchecked", label: CONDITION_LABELS.unchecked };
  }
  if (score >= CONDITION_GOOD_MIN) return { kind: "good", label: CONDITION_LABELS.good };
  if (score >= CONDITION_NOTES_MIN) return { kind: "notes", label: CONDITION_LABELS.notes };
  return { kind: "repair", label: CONDITION_LABELS.repair };
}

function coverageText(checked, total) {
  return `${checked} из ${total}`;
}

export function summarizeDirection(dirScore = {}, options = {}) {
  const total = Number(dirScore.total) || 0;
  const checked = Number(dirScore.checked) || 0;
  const score = dirScore.score;
  const criticalCount = Array.isArray(dirScore.criticalFaults) ? dirScore.criticalFaults.length : 0;

  if (options.unpublished) {
    return {
      kind: "unpublished",
      label: CONDITION_LABELS.unpublished,
      scoreText: "—/10",
      displayScore: null,
      coverageText: coverageText(0, total),
      checked: 0,
      total,
      hasCritical: false,
      criticalCount: 0,
    };
  }

  if (checked === 0 || score === null || score === undefined || !Number.isFinite(score)) {
    return {
      kind: "unchecked",
      label: CONDITION_LABELS.unchecked,
      scoreText: "—/10",
      displayScore: null,
      coverageText: coverageText(checked, total),
      checked,
      total,
      hasCritical: false,
      criticalCount: 0,
    };
  }

  const condition = conditionFromScore(score, checked);
  return {
    kind: condition.kind,
    label: condition.label,
    scoreText: `${formatScore(score)}/10`,
    displayScore: score,
    coverageText: coverageText(checked, total),
    checked,
    total,
    hasCritical: criticalCount > 0,
    criticalCount,
  };
}

export function summarizeOverall(scores = {}, options = {}) {
  return summarizeDirection(
    {
      score: scores.displayedScore ?? scores.overall ?? null,
      checked: scores.checked,
      total: scores.total,
      criticalFaults: scores.criticalFaults,
    },
    options,
  );
}
