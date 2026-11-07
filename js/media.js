import { folderKey } from "./folder.js?v=20261108g";

export const MEDIA_DB_NAME = "am24-tradein-demo-media-v1";
export const MEDIA_STORE = "media";

export const MEDIA_POLICY = {
  photoMimes: ["image/jpeg", "image/png", "image/webp"],
  videoMimes: ["video/mp4", "video/webm", "video/quicktime"],
  maxPhotoBytes: 10 * 1024 * 1024,
  maxVideoBytes: 80 * 1024 * 1024,
  maxPhotosPerFolder: 20,
  maxVideosPerFolder: 5,
};

export const MEDIA_LIMITS_TEXT =
  "Фото: JPEG, PNG или WebP, до 10 МБ, не больше 20 в папке направления. Видео: MP4, WebM или QuickTime, до 80 МБ, не больше 5 в папке. Файлы сохраняются только в этом браузере (IndexedDB) и не отправляются на сервер.";

const objectUrls = new Map();

export function mediaRecordId(carId, directionId, fileId) {
  return `${folderKey(carId, directionId)}/${fileId}`;
}

export function mimeToKind(mime) {
  if (MEDIA_POLICY.photoMimes.includes(mime)) return "photo";
  if (MEDIA_POLICY.videoMimes.includes(mime)) return "video";
  return null;
}

export function validateMediaFile(input = {}) {
  const policy = input.policy || MEDIA_POLICY;
  const mime = String(input.mime || "");
  const sizeBytes = Number(input.sizeBytes) || 0;
  const detected = mimeToKind(mime);
  if (!detected) {
    return { ok: false, error: "Допустимы только фото JPEG, PNG, WebP и видео MP4, WebM, QuickTime." };
  }
  if (input.kind && input.kind !== detected) {
    return {
      ok: false,
      error:
        input.kind === "photo"
          ? "В папку «Фото» можно добавить только изображение."
          : "В папку «Видео» можно добавить только видеофайл.",
    };
  }
  const kind = input.kind || detected;
  if (kind === "photo") {
    if (sizeBytes > policy.maxPhotoBytes) {
      return { ok: false, error: `Фото больше ${Math.round(policy.maxPhotoBytes / (1024 * 1024))} МБ.` };
    }
    if ((input.existingPhotos || 0) >= policy.maxPhotosPerFolder) {
      return { ok: false, error: `Не больше ${policy.maxPhotosPerFolder} фото в папке направления.` };
    }
  } else {
    if (sizeBytes > policy.maxVideoBytes) {
      return { ok: false, error: `Видео больше ${Math.round(policy.maxVideoBytes / (1024 * 1024))} МБ.` };
    }
    if ((input.existingVideos || 0) >= policy.maxVideosPerFolder) {
      return { ok: false, error: `Не больше ${policy.maxVideosPerFolder} видео в папке направления.` };
    }
  }
  return { ok: true, kind };
}

export function isQuotaError(error) {
  return Boolean(error && (error.name === "QuotaExceededError" || error.code === 22));
}

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function openMediaDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB недоступен в этой среде"));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        const store = db.createObjectStore(MEDIA_STORE, { keyPath: "id" });
        store.createIndex("byFolder", "folderKey", { unique: false });
        store.createIndex("byFolderKind", "folderKindKey", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listFolderMedia(carId, directionId) {
  const folder = folderKey(carId, directionId);
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, "readonly");
    const request = tx.objectStore(MEDIA_STORE).index("byFolder").getAll(folder);
    request.onsuccess = () => {
      const items = (request.result || []).sort((a, b) => String(a.addedAt).localeCompare(String(b.addedAt)));
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function addFolderMedia(carId, directionId, file, kindHint) {
  const existing = await listFolderMedia(carId, directionId);
  const check = validateMediaFile({
    mime: file.type,
    sizeBytes: file.size,
    kind: kindHint,
    existingPhotos: existing.filter((item) => item.kind === "photo").length,
    existingVideos: existing.filter((item) => item.kind === "video").length,
  });
  if (!check.ok) return check;
  const fileId = randomId();
  const folder = folderKey(carId, directionId);
  const record = {
    id: mediaRecordId(carId, directionId, fileId),
    fileId,
    carId,
    directionId,
    folderKey: folder,
    folderKindKey: `${folder}/${check.kind}`,
    kind: check.kind,
    name: file.name,
    mime: file.type,
    sizeBytes: file.size,
    addedAt: new Date().toISOString(),
    blob: file,
  };
  try {
    const db = await openMediaDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, "readwrite");
      tx.onabort = () => reject(tx.error);
      const request = tx.objectStore(MEDIA_STORE).add(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    return { ok: true, id: record.id, kind: record.kind };
  } catch (error) {
    if (isQuotaError(error)) {
      return { ok: false, error: "Не хватает места в хранилище браузера. Удалите старые файлы или освободите место." };
    }
    return { ok: false, error: "Не удалось сохранить файл в этом браузере." };
  }
}

export async function deleteFolderMedia(id, carId, directionId) {
  const db = await openMediaDb();
  const record = await new Promise((resolve, reject) => {
    const request = db.transaction(MEDIA_STORE, "readonly").objectStore(MEDIA_STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  if (!record) return { ok: false, error: "Файл не найден." };
  if (record.carId !== carId || record.directionId !== directionId) {
    return { ok: false, error: "Этот файл принадлежит другой папке автомобиля." };
  }
  await new Promise((resolve, reject) => {
    const request = db.transaction(MEDIA_STORE, "readwrite").objectStore(MEDIA_STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  revokeObjectUrl(id);
  return { ok: true };
}

export async function clearAllMedia() {
  revokeAllObjectUrls();
  if (typeof indexedDB === "undefined") return;
  const db = await openMediaDb();
  await new Promise((resolve, reject) => {
    const request = db.transaction(MEDIA_STORE, "readwrite").objectStore(MEDIA_STORE).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function objectUrlFor(record) {
  if (!record?.blob) return "";
  if (objectUrls.has(record.id)) return objectUrls.get(record.id);
  const url = URL.createObjectURL(record.blob);
  objectUrls.set(record.id, url);
  return url;
}

export function revokeObjectUrl(id) {
  const url = objectUrls.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(id);
  }
}

export function revokeFolderObjectUrls(carId, directionId) {
  const prefix = `${folderKey(carId, directionId)}/`;
  for (const id of [...objectUrls.keys()]) {
    if (id.startsWith(prefix)) revokeObjectUrl(id);
  }
}

export function revokeAllObjectUrls() {
  for (const url of objectUrls.values()) URL.revokeObjectURL(url);
  objectUrls.clear();
}
