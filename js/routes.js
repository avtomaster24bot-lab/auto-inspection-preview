export function parseRoute(hash = "") {
  const raw = String(hash || "#/").replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "c" && parts[1]) {
    return { name: "car", id: decodeURIComponent(parts[1]), dir: parts[2] ? decodeURIComponent(parts[2]) : null };
  }
  if (parts[0] === "report" && parts[1]) {
    return { name: "report", id: decodeURIComponent(parts[1]), dir: parts[2] ? decodeURIComponent(parts[2]) : null };
  }
  if (parts[0] === "inspect" && parts[1]) {
    return { name: "inspect", id: decodeURIComponent(parts[1]), dir: parts[2] ? decodeURIComponent(parts[2]) : null };
  }
  if (parts[0] === "admin") return { name: "admin", id: null, dir: null };
  return { name: "home", id: null, dir: null };
}

export function isCarRoute(route) {
  return route?.name === "car" || route?.name === "report" || route?.name === "inspect";
}

export function canonicalHash(route) {
  if (!route) return "#/";
  if (route.name === "admin") return "#/admin";
  if (isCarRoute(route) && route.id) {
    return route.dir ? `#/c/${encodeURIComponent(route.id)}/${encodeURIComponent(route.dir)}` : `#/c/${encodeURIComponent(route.id)}`;
  }
  return "#/";
}

export function panelDomId(carId, slug) {
  return `dir-panel-${carId}-${slug}`;
}

export function toggleOpenDir(openDirs, slug) {
  const next = new Set(openDirs);
  if (next.has(slug)) next.delete(slug);
  else next.add(slug);
  return next;
}

export function hashDirFromOpen(openDirs, preferred = null) {
  if (preferred && openDirs.has(preferred)) return preferred;
  const first = openDirs.values().next();
  return first.done ? null : first.value;
}
