import { getStorage } from "./storage.js?v=20261108o";
import { DEFAULT_WHATSAPP_DIGITS, normalizeKzWhatsAppNumber } from "./whatsapp.js?v=20261108o";

export const BRIEF_STORAGE_KEY = "am24-tradein-demo-brief-v1";

export const HOW_BLURBS = {
  hodovaya: "Смотрим износ подвески, стуки, люфты и утечки.",
  body: "Фиксируем окрасы, следы ремонта и состояние кузова.",
  engine: "Оцениваем работу двигателя и технические жидкости.",
  electric: "Проверяем свет, помощники и электрооборудование.",
  interior: "Осматриваем салон, органы управления и следы износа.",
  geometry: "Проверяем геометрию кузова и лонжероны.",
  wheels: "Оцениваем шины, диски и остаток протектора.",
};

function stripControls(value) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

export const BRIEF_CURRENCIES = ["KZT", "RUB", "USD"];

export function emptyBrief(journey = "") {
  return {
    version: 1,
    journey: journey === "inspect" || journey === "podbor" ? journey : "",
    budget: "",
    currency: "",
    bodyPref: "",
    preferences: "",
    listingUrl: "",
    notes: "",
  };
}

export function sanitizeBudget(value) {
  return stripControls(value).slice(0, 80);
}

export function sanitizeCurrency(value) {
  return BRIEF_CURRENCIES.includes(value) ? value : "";
}

export function parseBudgetAmount(value) {
  const raw = sanitizeBudget(value);
  if (!raw) return null;
  const normalized = raw.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function formatBudgetDisplay(brief = {}) {
  const text = sanitizeBudget(brief.budget);
  const currency = sanitizeCurrency(brief.currency);
  const amount = parseBudgetAmount(text);
  if (!text && amount === null) return "";
  const numberText = amount === null ? text : new Intl.NumberFormat("ru-RU").format(amount);
  if (currency) return `${numberText} ${currency}`;
  return `${numberText} (Валюта не указана)`;
}

export function defaultCurrencySelect(brief = {}) {
  const currency = sanitizeCurrency(brief.currency);
  if (currency) return currency;
  if (sanitizeBudget(brief.budget)) return "";
  return "KZT";
}

export function sanitizeNotes(value) {
  return stripControls(value).slice(0, 400);
}

export function listingUrlError(value) {
  const raw = stripControls(value);
  if (!raw) return "";
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return "Проверьте ссылку на объявление";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Ссылка должна начинаться с http:// или https://";
  }
  if (`${parsed.pathname}${parsed.hash}`.includes("/access/")) {
    return "В заявку нельзя вставлять служебные ссылки доступа";
  }
  return "";
}

export function sanitizeListingUrl(value) {
  const raw = stripControls(value).slice(0, 500);
  if (!raw || listingUrlError(raw)) return "";
  return new URL(raw).toString();
}

export function sanitizeBodyPref(value) {
  return ["", "any", "sedan", "wagon", "crossover"].includes(value) ? value : "";
}

export function sanitizeBrief(input = {}) {
  const journey = input.journey === "inspect" || input.journey === "podbor" ? input.journey : "";
  return {
    version: 1,
    journey,
    budget: sanitizeBudget(input.budget),
    currency: sanitizeCurrency(input.currency),
    bodyPref: sanitizeBodyPref(input.bodyPref),
    preferences: sanitizeNotes(input.preferences),
    listingUrl: sanitizeListingUrl(input.listingUrl),
    notes: sanitizeNotes(input.notes),
  };
}

export function loadBrief(storage = getStorage()) {
  const raw = storage.getItem(BRIEF_STORAGE_KEY);
  if (!raw) return emptyBrief();
  try {
    const parsed = JSON.parse(raw);
    return sanitizeBrief(parsed && typeof parsed === "object" ? parsed : {});
  } catch {
    return emptyBrief();
  }
}

export function saveBrief(brief, storage = getStorage()) {
  const clean = sanitizeBrief(brief);
  storage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

export function clearBrief(storage = getStorage()) {
  storage.removeItem(BRIEF_STORAGE_KEY);
}

export function bodyPrefLabel(value) {
  return {
    any: "любой",
    sedan: "седан",
    wagon: "универсал",
    crossover: "кроссовер",
  }[value] || "";
}

export function buildBriefWhatsAppMessage(brief) {
  const clean = sanitizeBrief(brief);
  const lines = ["Здравствуйте! Это учебная заявка с сайта Авто Лидер."];
  if (clean.journey === "podbor") lines.push("Хочу подобрать автомобиль под свои задачи.");
  if (clean.journey === "inspect") lines.push("Хочу обсудить проверку выбранного автомобиля.");
  const budgetLine = formatBudgetDisplay(clean);
  if (budgetLine) lines.push(`Бюджет: ${budgetLine}`);
  const body = bodyPrefLabel(clean.bodyPref);
  if (body) lines.push(`Тип кузова: ${body}`);
  if (clean.preferences) lines.push(`Пожелания: ${clean.preferences}`);
  if (clean.listingUrl) lines.push(`Объявление: ${clean.listingUrl}`);
  if (clean.notes) lines.push(`Заметки: ${clean.notes}`);
  lines.push("Это черновик из браузера, не отправленная заявка.");
  return lines.join("\n");
}

export function buildWhatsAppBriefUrl(brief, number = DEFAULT_WHATSAPP_DIGITS) {
  const digits = normalizeKzWhatsAppNumber(number);
  const text = buildBriefWhatsAppMessage(brief);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
