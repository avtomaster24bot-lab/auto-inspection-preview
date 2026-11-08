import { DIRECTIONS, orderedDirections, liveScoresForCar, scoreInputFromResults } from "./data.js?v=20261108i";
import { computeScores } from "./scoring.js?v=20261108i";

export function visibleDirections() {
  return orderedDirections(DIRECTIONS);
}

export function isAssignedMaster(role, masterId, carState, slug) {
  return role === "master" && Boolean(masterId) && carState?.assignments?.[slug]?.masterId === masterId;
}

export function canEditDirection(role, masterId, carState, slug) {
  if (!carState || !slug) return false;
  if (role === "admin") return true;
  return isAssignedMaster(role, masterId, carState, slug);
}

export function canSeeInternalFor(role, masterId, carState, slug) {
  return canEditDirection(role, masterId, carState, slug);
}

export function directionAccess(role, masterId, carState, slug) {
  if (canEditDirection(role, masterId, carState, slug)) return "edit";
  if (carState?.status === "published" && carState.publishedSnapshot?.scores) return "public";
  return "blocked";
}

export function unpublishedSectionMessage(role, masterId, carState, slug) {
  if (role === "master" && carState && !isAssignedMaster(role, masterId, carState, slug)) {
    return "Редактирует другой специалист. Раздел ещё не опубликован.";
  }
  return "Раздел ещё не опубликован.";
}

export function blankScores() {
  const directionScores = DIRECTIONS.map((direction) => ({
    id: direction.slug,
    name: direction.name,
    score: null,
    checked: 0,
    total: direction.checkpoints.length,
    coverage: 0,
    criticalFaults: [],
  }));
  const total = directionScores.reduce((sum, item) => sum + item.total, 0);
  return {
    directionScores,
    displayedScore: null,
    overall: null,
    checked: 0,
    total,
    coverage: 0,
    criticalFaults: [],
  };
}

function maskedAssignedResults(carState, masterId) {
  const results = {};
  for (const direction of DIRECTIONS) {
    if (carState.assignments?.[direction.slug]?.masterId === masterId) {
      results[direction.slug] = carState.results[direction.slug];
    } else {
      results[direction.slug] = {};
      for (const checkpoint of direction.checkpoints) {
        results[direction.slug][checkpoint.slug] = {
          score: null,
          versionNote: "",
          publicComment: "",
          internalComment: "",
        };
      }
    }
  }
  return results;
}

export function authorizedOverview(role, masterId, carState) {
  if (!carState) return { scores: blankScores(), unpublished: true, source: "none" };
  if (role === "admin") {
    return { scores: liveScoresForCar(carState), unpublished: false, source: "live" };
  }
  if (carState.status === "published" && carState.publishedSnapshot?.scores) {
    return { scores: carState.publishedSnapshot.scores, unpublished: false, source: "snapshot" };
  }
  if (role === "master") {
    return {
      scores: computeScores(scoreInputFromResults(maskedAssignedResults(carState, masterId))),
      unpublished: false,
      source: "assigned-live",
    };
  }
  return { scores: blankScores(), unpublished: true, source: "unpublished" };
}

export function authorizedConclusion(role, carState, source) {
  if (!carState) return "";
  if (source === "snapshot") return carState.publishedSnapshot?.conclusion || "";
  if (source === "live") return carState.conclusion || carState.publishedSnapshot?.conclusion || "";
  return "";
}

export function authorizedDirectionScore(role, masterId, carState, slug) {
  const access = directionAccess(role, masterId, carState, slug);
  const fallback = blankScores().directionScores.find((item) => item.id === slug);
  if (access === "blocked" || !carState) {
    return { access, unpublished: true, dirScore: fallback };
  }
  if (access === "edit") {
    const live = liveScoresForCar(carState);
    return {
      access,
      unpublished: false,
      dirScore: live.directionScores.find((item) => item.id === slug) || fallback,
    };
  }
  const snap = carState.publishedSnapshot?.scores;
  return {
    access,
    unpublished: false,
    dirScore: snap?.directionScores.find((item) => item.id === slug) || fallback,
  };
}
