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
