import { formatScore, DEFAULT_SCORING_CONFIG } from "./scoring.js?v=20261108l";

export const CONDITION_GOOD_MIN = 8;
export const CONDITION_NOTES_MIN = 5;

export const CONDITION_LABELS = {
  unchecked: "Не проверено",
  good: "Хорошее состояние",
  notes: "Требует внимания",
  repair: "Нужен ремонт",
  critical: "Критичный дефект",
  unpublished: "Отчёт ещё не опубликован",
};

export const COMPLETION_LABELS = {
  none: "Проверки ещё не выполнены",
  preliminary: "Предварительная оценка",
  complete: "Осмотр завершён",
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

// Visual/text mapping only. Score bands stay 8+ / 5+ / below; numeric 0 is a score, not "unchecked".
// Critical pill overrides a good/notes/repair appearance when the existing criticalFaults flag is set
// (scoring.js: isCritical checkpoint and score <= DEFAULT_SCORING_CONFIG.criticalThreshold).
export function statusPresentation(input = {}) {
  if (input.unpublished === true || input.kind === "unpublished") {
    return { kind: "unpublished", label: CONDITION_LABELS.unpublished };
  }
  if (input.kind === "critical") {
    return { kind: "critical", label: CONDITION_LABELS.critical };
  }
  const checked = input.checked;
  const fromScore =
    input.kind && input.kind !== "critical"
      ? { kind: input.kind, label: input.label || CONDITION_LABELS[input.kind] || CONDITION_LABELS.unchecked }
      : conditionFromScore(input.score, checked === undefined ? 1 : checked);
  if (fromScore.kind === "unchecked") {
    return { kind: "unchecked", label: CONDITION_LABELS.unchecked };
  }
  if (input.hasCritical) {
    return { kind: "critical", label: CONDITION_LABELS.critical };
  }
  return {
    kind: fromScore.kind,
    label: fromScore.label || CONDITION_LABELS[fromScore.kind] || CONDITION_LABELS.unchecked,
  };
}

export function nodeStatus(result = {}, checkpoint = {}) {
  if (result.score === null || result.score === undefined || !Number.isFinite(result.score)) {
    return { kind: "unchecked", label: CONDITION_LABELS.unchecked };
  }
  const hasCritical = Boolean(
    checkpoint.isCritical && result.score <= DEFAULT_SCORING_CONFIG.criticalThreshold,
  );
  return statusPresentation({ ...conditionFromScore(result.score), hasCritical });
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

export function severityClass(summary = {}) {
  const status = statusPresentation(summary);
  const critical = summary.hasCritical || status.kind === "critical";
  return `kind-${status.kind}${critical ? " has-critical" : ""}`;
}

export function inspectionProgress(scores = {}, options = {}) {
  const total = Number(scores.total) || 0;
  const checked = Number(scores.checked) || 0;
  if (options.unpublished) {
    const summary = summarizeOverall(scores, { unpublished: true });
    return {
      ...summary,
      key: "unpublished",
      completionLabel: CONDITION_LABELS.unpublished,
      checked: 0,
      total,
    };
  }
  const summary = summarizeOverall(scores, options);
  if (checked === 0) {
    return {
      ...summary,
      key: "none",
      completionLabel: COMPLETION_LABELS.none,
      checked,
      total,
    };
  }
  if (total > 0 && checked >= total) {
    return {
      ...summary,
      key: "complete",
      completionLabel: COMPLETION_LABELS.complete,
      checked,
      total,
    };
  }
  return {
    ...summary,
    key: "preliminary",
    completionLabel: COMPLETION_LABELS.preliminary,
    checked,
    total,
  };
}
