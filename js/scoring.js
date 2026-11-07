export const FORMULA_ID = "proposed-v1";

export const FORMULA_DISCLAIMER =
  "Предлагаемая формула расчёта (proposed-v1), не утверждена как единственная. Непроверенные узлы исключаются из среднего; покрытие показывается отдельно. Критичные дефекты в режиме по умолчанию снижают итог на 0,4 балла каждый.";

export const DEFAULT_SCORING_CONFIG = {
  criticalMode: "PENALTY",
  criticalThreshold: 3,
  criticalPenaltyPerFault: 0.4,
  criticalCap: 6,
};

function round1(n) {
  return Math.round(n * 10) / 10;
}

function clampScore(n) {
  return Math.min(10, Math.max(1, round1(n)));
}

function isChecked(score) {
  return typeof score === "number" && Number.isFinite(score);
}

export function validateScoreValue(score) {
  if (score === null || score === undefined) return true;
  return Number.isInteger(score) && score >= 1 && score <= 10;
}

export function computeScores(directions, config = DEFAULT_SCORING_CONFIG, override) {
  const directionScores = directions.map((direction) => {
    const total = direction.checkpoints.length;
    const checkedItems = direction.checkpoints.filter((item) => isChecked(item.score));
    const weightSum = checkedItems.reduce((sum, item) => sum + (item.weight ?? 1), 0);
    const raw =
      weightSum > 0
        ? checkedItems.reduce((sum, item) => sum + item.score * (item.weight ?? 1), 0) / weightSum
        : null;
    const criticalFaults = checkedItems
      .filter((item) => item.isCritical && item.score <= config.criticalThreshold)
      .map((item) => ({
        checkpointId: item.id,
        directionId: direction.id,
        name: item.name,
        score: item.score,
      }));

    return {
      id: direction.id,
      name: direction.name,
      score: raw === null ? null : round1(raw),
      coverage: total === 0 ? 0 : checkedItems.length / total,
      checked: checkedItems.length,
      total,
      weight: direction.weight,
      criticalFaults,
    };
  });

  const included = directionScores.filter((item) => item.score !== null);
  const dirWeightSum = included.reduce((sum, item) => sum + item.weight, 0);
  const overallBeforePolicy =
    dirWeightSum > 0
      ? included.reduce((sum, item) => sum + item.score * item.weight, 0) / dirWeightSum
      : null;

  const criticalFaults = directionScores.flatMap((item) => item.criticalFaults);
  let overall = overallBeforePolicy;

  if (overall !== null && criticalFaults.length > 0) {
    if (config.criticalMode === "PENALTY") {
      overall = overall - criticalFaults.length * config.criticalPenaltyPerFault;
    } else if (config.criticalMode === "CAP") {
      overall = Math.min(overall, config.criticalCap);
    }
  }

  if (overall !== null) overall = clampScore(overall);

  const checked = directionScores.reduce((sum, item) => sum + item.checked, 0);
  const total = directionScores.reduce((sum, item) => sum + item.total, 0);
  const displayedScore =
    typeof override === "number" && Number.isFinite(override) ? clampScore(override) : overall;

  return {
    formulaId: FORMULA_ID,
    disclaimer: FORMULA_DISCLAIMER,
    directionScores,
    overall: overall === null ? null : round1(overall),
    overallBeforePolicy: overallBeforePolicy === null ? null : round1(overallBeforePolicy),
    displayedScore: displayedScore === null ? null : round1(displayedScore),
    coverage: total === 0 ? 0 : checked / total,
    checked,
    total,
    criticalFaults,
    excludedUnchecked: true,
  };
}

export function formatScore(score) {
  if (score === null || score === undefined) return "н/п";
  return score.toFixed(1).replace(".", ",");
}

export function coveragePercent(coverage) {
  return `${Math.round((coverage || 0) * 100)}%`;
}
