export const DEFAULT_WHATSAPP_DIGITS = "77027184520";

export function normalizeKzWhatsAppNumber(input) {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return digits;
  throw new Error("Некорректный номер WhatsApp");
}

export function buildPublicCarUrl(appUrl, publicCode) {
  const base = String(appUrl || "").replace(/\/+$/, "");
  if (!publicCode || /[/?#]/.test(publicCode)) {
    throw new Error("Некорректный публичный код автомобиля");
  }
  return `${base}/#/c/${encodeURIComponent(publicCode)}`;
}

export function buildWhatsAppMessage(input) {
  return `Хочу купить этот автомобиль: ${input.make}, ${input.model}, ${input.year}. ${input.publicCarUrl}`;
}

export function assertSafePublicCarUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Некорректная ссылка на автомобиль");
  }
  if (parsed.search || parsed.hash.includes("?")) {
    throw new Error("В публичную ссылку нельзя включать параметры доступа");
  }
  const combined = `${parsed.pathname}${parsed.hash}`;
  if (combined.includes("/access/")) {
    throw new Error("В сообщение WhatsApp нельзя подставлять токен доступа");
  }
  if (!parsed.hash.includes("/c/")) {
    throw new Error("Ожидается публичная страница автомобиля #/c/{code}");
  }
}

export function buildWhatsAppBuyUrl(input) {
  assertSafePublicCarUrl(input.publicCarUrl);
  const number = normalizeKzWhatsAppNumber(input.number ?? DEFAULT_WHATSAPP_DIGITS);
  const text = buildWhatsAppMessage(input);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
