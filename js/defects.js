export const DEFECT_COLORS = {
  critical: { id: "critical", label: "Критичный дефект", hex: "#c23b2e" },
  attention: { id: "attention", label: "Требует внимания", hex: "#d17a12" },
  comment: { id: "comment", label: "Замечание", hex: "#1b6ca8" },
};

export const DEFECT_SIZES = {
  s: { id: "s", label: "Малая", scale: 0.07 },
  m: { id: "m", label: "Средняя", scale: 0.11 },
  l: { id: "l", label: "Крупная", scale: 0.16 },
};

export const DIAGRAM_DIRECTION_SLUGS = [
  "hodovaya",
  "body",
  "engine",
  "electric",
  "interior",
  "geometry",
  "wheels",
];

export const DESCRIPTION_MAX = 400;
export const TAP_THRESHOLD_PX = 12;

export function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number < 0) return 0;
  if (number > 1) return 1;
  return number;
}

export function sanitizeDescription(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, DESCRIPTION_MAX);
}

export function isValidColor(value) {
  return Object.hasOwn(DEFECT_COLORS, value);
}

export function normalizeColor(value) {
  return isValidColor(value) ? value : "comment";
}

export function isValidSize(value) {
  return Object.hasOwn(DEFECT_SIZES, value);
}

export function normalizeSize(value) {
  return isValidSize(value) ? value : "m";
}

export function sanitizeNodeId(value) {
  const text = String(value ?? "").trim();
  if (!text || !/^[a-z0-9-]{1,80}$/i.test(text)) return "";
  return text;
}

export function colorMeta(value) {
  return DEFECT_COLORS[normalizeColor(value)];
}

export function sizeMeta(value) {
  return DEFECT_SIZES[normalizeSize(value)];
}

export function emptyDiagramDefects(slugs = DIAGRAM_DIRECTION_SLUGS) {
  return Object.fromEntries(slugs.map((slug) => [slug, []]));
}

export function nextDisplayNumber(list) {
  const numbers = (Array.isArray(list) ? list : [])
    .map((item) => Number(item?.number))
    .filter((number) => Number.isInteger(number) && number > 0);
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

export function makeDefectId(existing = [], preferred = "") {
  const used = new Set((Array.isArray(existing) ? existing : []).map((item) => item?.id).filter(Boolean));
  const candidate = String(preferred || "");
  if (candidate && /^[a-z0-9_-]{4,64}$/i.test(candidate) && !used.has(candidate)) return candidate;
  let id = "";
  do {
    id = `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  } while (used.has(id));
  return id;
}

export function sanitizeDefect(raw) {
  if (!raw || typeof raw !== "object") return null;
  const description = sanitizeDescription(raw.description);
  const viewId = String(raw.viewId || "").trim();
  const assetId = String(raw.assetId || "").trim();
  const id = String(raw.id || "").trim();
  const number = Number(raw.number);
  if (!description || !viewId || !assetId || !id) return null;
  if (!Number.isInteger(number) || number < 1) return null;
  return {
    id,
    number,
    viewId,
    assetId,
    x: clamp01(raw.x),
    y: clamp01(raw.y),
    size: normalizeSize(raw.size),
    color: normalizeColor(raw.color),
    description,
    nodeId: sanitizeNodeId(raw.nodeId),
    createdAt: String(raw.createdAt || ""),
    updatedAt: String(raw.updatedAt || raw.createdAt || ""),
  };
}

export function cloneDiagramDefects(source, slugs = DIAGRAM_DIRECTION_SLUGS) {
  const cloned = emptyDiagramDefects(slugs);
  if (!source || typeof source !== "object") return cloned;
  for (const slug of slugs) {
    const list = Array.isArray(source[slug]) ? source[slug] : [];
    cloned[slug] = list.map(sanitizeDefect).filter(Boolean);
  }
  return cloned;
}

export function authorizedDefects(access, carState, slug) {
  if (!carState || !slug || access === "blocked") {
    return { list: [], canEdit: false, source: "blocked" };
  }
  if (access === "edit") {
    const live = Array.isArray(carState.diagramDefects?.[slug]) ? carState.diagramDefects[slug] : [];
    return { list: live.map(sanitizeDefect).filter(Boolean), canEdit: true, source: "live" };
  }
  const snap = carState.publishedSnapshot?.diagramDefects?.[slug];
  const list = Array.isArray(snap) ? snap.map(sanitizeDefect).filter(Boolean) : [];
  return { list, canEdit: false, source: "snapshot" };
}

export function defectsForView(list, viewId, assetId) {
  return (Array.isArray(list) ? list : []).filter(
    (item) => item.viewId === viewId && item.assetId === assetId,
  );
}

export function addDefect(list, input = {}) {
  const existing = Array.isArray(list) ? list.slice() : [];
  const description = sanitizeDescription(input.description);
  if (!description) return { ok: false, error: "description-required", list: existing };
  const viewId = String(input.viewId || "").trim();
  const assetId = String(input.assetId || "").trim();
  if (!viewId || !assetId) return { ok: false, error: "view-required", list: existing };
  const now = input.createdAt || new Date().toISOString();
  const defect = {
    id: makeDefectId(existing, input.id),
    number: nextDisplayNumber(existing),
    viewId,
    assetId,
    x: clamp01(input.x),
    y: clamp01(input.y),
    size: normalizeSize(input.size),
    color: normalizeColor(input.color),
    description,
    nodeId: sanitizeNodeId(input.nodeId),
    createdAt: now,
    updatedAt: now,
  };
  return { ok: true, list: existing.concat(defect), defect };
}

export function updateDefect(list, id, patch = {}) {
  const existing = Array.isArray(list) ? list.slice() : [];
  const index = existing.findIndex((item) => item.id === id);
  if (index < 0) return { ok: false, error: "missing", list: existing };
  const current = existing[index];
  const nextDescription =
    patch.description === undefined ? current.description : sanitizeDescription(patch.description);
  if (!nextDescription) return { ok: false, error: "description-required", list: existing };
  const updated = {
    ...current,
    x: patch.x === undefined ? current.x : clamp01(patch.x),
    y: patch.y === undefined ? current.y : clamp01(patch.y),
    size: patch.size === undefined ? current.size : normalizeSize(patch.size),
    color: patch.color === undefined ? current.color : normalizeColor(patch.color),
    description: nextDescription,
    nodeId: patch.nodeId === undefined ? current.nodeId : sanitizeNodeId(patch.nodeId),
    updatedAt: patch.updatedAt || new Date().toISOString(),
  };
  existing[index] = updated;
  return { ok: true, list: existing, defect: updated };
}

export function removeDefect(list, id) {
  const existing = Array.isArray(list) ? list : [];
  return existing.filter((item) => item.id !== id);
}

export function pointFromClientRect(rect, clientX, clientY) {
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return null;
  const x = (Number(clientX) - rect.left) / rect.width;
  const y = (Number(clientY) - rect.top) / rect.height;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x, y };
}

export function isTap(dx, dy, threshold = TAP_THRESHOLD_PX) {
  return Math.hypot(Number(dx) || 0, Number(dy) || 0) <= threshold;
}
