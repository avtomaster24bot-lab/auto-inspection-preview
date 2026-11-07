export const STORAGE_KEY = "am24-tradein-demo-v1";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

export function getStorage(preferred) {
  if (preferred) return preferred;
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* private mode */
  }
  return memoryStorage();
}

export function saveState(state, storage = getStorage()) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
  return true;
}

export function loadState(storage = getStorage()) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearState(storage = getStorage()) {
  storage.removeItem(STORAGE_KEY);
}
