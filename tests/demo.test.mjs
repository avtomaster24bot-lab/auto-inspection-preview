import test from "node:test";
import assert from "node:assert/strict";
import { computeScores, DEFAULT_SCORING_CONFIG } from "../js/scoring.js";
import { buildPublicCarUrl, buildWhatsAppBuyUrl, buildWhatsAppMessage, normalizeKzWhatsAppNumber } from "../js/whatsapp.js";
import { saveState, loadState, clearState, STORAGE_KEY } from "../js/storage.js";
import { createDefaultState, DIRECTIONS, SAMPLE_CARS, liveScoresForCar } from "../js/data.js";

test("unchecked scores are excluded from averages", () => {
  const result = computeScores([
    {
      id: "d1",
      name: "Тест",
      weight: 1,
      checkpoints: [
        { id: "a", name: "A", weight: 1, isCritical: false, score: 8 },
        { id: "b", name: "B", weight: 1, isCritical: false, score: null },
        { id: "c", name: "C", weight: 1, isCritical: false, score: 6 },
      ],
    },
  ]);
  assert.equal(result.excludedUnchecked, true);
  assert.equal(result.directionScores[0].score, 7);
  assert.equal(result.directionScores[0].checked, 2);
  assert.equal(result.directionScores[0].total, 3);
  assert.equal(result.overall, 7);
});

test("critical penalty uses default formula", () => {
  const result = computeScores(
    [
      {
        id: "d1",
        weight: 1,
        checkpoints: [
          { id: "crit", name: "Критичный", weight: 1, isCritical: true, score: 3 },
          { id: "ok", name: "Обычный", weight: 1, isCritical: false, score: 9 },
        ],
      },
    ],
    DEFAULT_SCORING_CONFIG,
  );
  assert.equal(result.overallBeforePolicy, 6);
  assert.equal(result.criticalFaults.length, 1);
  assert.equal(result.overall, 5.6);
});

test("whatsapp number and encoded message", () => {
  assert.equal(normalizeKzWhatsAppNumber("87027184520"), "77027184520");
  const publicCarUrl = buildPublicCarUrl("https://avtomaster24bot-lab.github.io/auto-inspection-preview/", "primer-sedan");
  assert.equal(publicCarUrl, "https://avtomaster24bot-lab.github.io/auto-inspection-preview/#/c/primer-sedan");
  const message = buildWhatsAppMessage({
    make: "ПримерМарка",
    model: "Седан А",
    year: 2019,
    publicCarUrl,
  });
  assert.match(message, /ПримерМарка/);
  assert.match(message, /Седан А/);
  assert.match(message, /2019/);
  assert.match(message, /#\/c\/primer-sedan/);
  const url = buildWhatsAppBuyUrl({
    make: "ПримерМарка",
    model: "Седан А",
    year: 2019,
    publicCarUrl,
  });
  assert.equal(url.startsWith("https://wa.me/77027184520?text="), true);
  assert.equal(url.includes(encodeURIComponent(message)), true);
});

test("whatsapp rejects access tokens and query strings", () => {
  assert.throws(() =>
    buildWhatsAppBuyUrl({
      make: "A",
      model: "B",
      year: 2019,
      publicCarUrl: "https://example.com/auto-inspection-preview/#/c/primer-sedan?token=secret",
    }),
  );
  assert.throws(() =>
    buildWhatsAppBuyUrl({
      make: "A",
      model: "B",
      year: 2019,
      publicCarUrl: "https://example.com/access/secret-token",
    }),
  );
});

test("local demo state round-trip", () => {
  const memory = {
    data: {},
    getItem(key) {
      return Object.hasOwn(this.data, key) ? this.data[key] : null;
    },
    setItem(key, value) {
      this.data[key] = String(value);
    },
    removeItem(key) {
      delete this.data[key];
    },
  };
  const initial = createDefaultState();
  saveState(initial, memory);
  assert.equal(Boolean(memory.data[STORAGE_KEY]), true);
  const loaded = loadState(memory);
  assert.equal(loaded.cars["primer-sedan"].status, "published");
  assert.equal(SAMPLE_CARS.length, 3);
  assert.equal(DIRECTIONS.length, 7);
  const live = liveScoresForCar(loaded.cars["primer-sedan"]);
  assert.equal(typeof live.displayedScore, "number");
  clearState(memory);
  assert.equal(loadState(memory), null);
});

import { conditionFromScore, summarizeDirection, summarizeOverall, CONDITION_LABELS } from "../js/summary.js";
import { DIRECTION_ICON_SLUGS, directionIcon } from "../js/icons.js";
import { folderKey, nodeFolderKey, parseFolderKey } from "../js/folder.js";

test("unchecked and missing scores never look like zero", () => {
  assert.equal(conditionFromScore(null).label, CONDITION_LABELS.unchecked);
  assert.equal(conditionFromScore(7, 0).label, CONDITION_LABELS.unchecked);
  const empty = summarizeDirection({ score: null, checked: 0, total: 21, criticalFaults: [] });
  assert.equal(empty.kind, "unchecked");
  assert.equal(empty.scoreText, "—/10");
  assert.equal(empty.displayScore, null);
  assert.equal(empty.coverageText, "0 из 21");
  assert.equal(empty.hasCritical, false);
});

test("plain language bands and critical warning", () => {
  assert.equal(summarizeDirection({ score: 8, checked: 10, total: 10, criticalFaults: [] }).label, "Хорошее состояние");
  assert.equal(summarizeDirection({ score: 7.8, checked: 10, total: 10, criticalFaults: [] }).scoreText, "7,8/10");
  assert.equal(summarizeDirection({ score: 6.2, checked: 4, total: 8, criticalFaults: [] }).label, "Есть замечания");
  assert.equal(summarizeDirection({ score: 4.9, checked: 8, total: 8, criticalFaults: [] }).label, "Нужен ремонт");
  const critical = summarizeDirection({
    score: 7.2,
    checked: 8,
    total: 8,
    criticalFaults: [{ name: "Лонжерон" }],
  });
  assert.equal(critical.hasCritical, true);
  assert.equal(critical.criticalCount, 1);
  assert.notEqual(critical.label, CONDITION_LABELS.unchecked);
});

test("unpublished overview hides live numbers", () => {
  const summary = summarizeOverall({ displayedScore: 8.4, checked: 80, total: 91, criticalFaults: [] }, { unpublished: true });
  assert.equal(summary.kind, "unpublished");
  assert.equal(summary.label, "Отчёт ещё не опубликован");
  assert.equal(summary.scoreText, "—/10");
  assert.equal(summary.displayScore, null);
  assert.equal(summary.hasCritical, false);
});

test("each diagnostic direction has its own pictogram", () => {
  assert.deepEqual(DIRECTION_ICON_SLUGS.sort(), ["body", "electric", "engine", "geometry", "hodovaya", "interior", "wheels"]);
});

test("illustrations are large and distinct", () => {
  const drawn = DIRECTION_ICON_SLUGS.map((slug) => directionIcon(slug));
  for (const markup of drawn) {
    assert.match(markup, /class="dir-photo"/);
    assert.match(markup, /data-illustration="/);
    assert.match(markup, /images\/dir-[a-z]+\.webp/);
  }
  assert.equal(new Set(drawn).size, 7);
});

test("folder keys keep cars and directions apart", () => {
  assert.equal(folderKey("primer-sedan", "hodovaya"), "primer-sedan/hodovaya");
  assert.notEqual(folderKey("primer-sedan", "hodovaya"), folderKey("primer-universal", "hodovaya"));
  assert.notEqual(folderKey("primer-sedan", "hodovaya"), folderKey("primer-sedan", "engine"));
  assert.equal(nodeFolderKey("primer-sedan", "hodovaya", "amort-rear"), "primer-sedan/hodovaya/amort-rear");
  assert.deepEqual(parseFolderKey("primer-sedan/hodovaya/amort-rear"), {
    carId: "primer-sedan",
    directionId: "hodovaya",
    checkpointId: "amort-rear",
  });
  assert.throws(() => folderKey("", "hodovaya"));
  assert.throws(() => folderKey("primer-sedan", ""));
});

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ensureCarShape } from "../js/data.js";
import { validateMediaFile, mediaRecordId, mimeToKind, MEDIA_POLICY, isQuotaError } from "../js/media.js";

test("catalog home markup does not embed seven direction tiles", () => {
  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  const card = app.slice(app.indexOf("function carCard"), app.indexOf("function renderHome"));
  const home = app.slice(app.indexOf("function renderHome"), app.indexOf("function renderCar"));
  assert.match(card, /Открыть оценочный лист/);
  assert.match(card, /overallHero/);
  assert.equal(card.includes("conditionGrid"), false);
  assert.equal(card.includes("directionPicker"), false);
  assert.equal(home.includes("conditionGrid"), false);
  assert.equal(home.includes("directionPicker"), false);
  assert.match(app, /function renderCar/);
  assert.match(app, /Оценочный лист/);
  assert.match(app, /Фото \(/);
  assert.match(app, /Видео \(/);
  assert.match(app, /Добавьте фото состояния узла/);
  assert.match(app, /Материалы пока не добавлены/);
  assert.match(app, /Что важно знать/);
});

test("media validation rejects wrong type, size and folder counts", () => {
  assert.equal(mimeToKind("image/jpeg"), "photo");
  assert.equal(mimeToKind("video/mp4"), "video");
  assert.equal(mimeToKind("application/pdf"), null);
  assert.equal(validateMediaFile({ mime: "image/gif", sizeBytes: 100 }).ok, false);
  assert.equal(validateMediaFile({ mime: "image/jpeg", sizeBytes: MEDIA_POLICY.maxPhotoBytes + 1 }).ok, false);
  assert.equal(validateMediaFile({ mime: "video/mp4", sizeBytes: MEDIA_POLICY.maxVideoBytes + 1 }).ok, false);
  assert.equal(validateMediaFile({ mime: "image/jpeg", sizeBytes: 100, existingPhotos: MEDIA_POLICY.maxPhotosPerFolder }).ok, false);
  assert.equal(validateMediaFile({ mime: "video/webm", sizeBytes: 100, existingVideos: MEDIA_POLICY.maxVideosPerFolder }).ok, false);
  assert.equal(validateMediaFile({ mime: "image/jpeg", sizeBytes: 100, kind: "video" }).ok, false);
  assert.equal(validateMediaFile({ mime: "video/mp4", sizeBytes: 100, kind: "photo" }).ok, false);
  assert.equal(validateMediaFile({ mime: "image/png", sizeBytes: 100 }).ok, true);
  assert.equal(validateMediaFile({ mime: "image/webp", sizeBytes: 2048 }).ok, true);
  assert.equal(validateMediaFile({ mime: "video/quicktime", sizeBytes: 100 }).ok, true);
});

test("media record ids stay inside one car and direction", () => {
  const a = mediaRecordId("primer-sedan", "hodovaya", "file-1");
  const b = mediaRecordId("primer-universal", "hodovaya", "file-1");
  const c = mediaRecordId("primer-sedan", "engine", "file-1");
  assert.equal(a, "primer-sedan/hodovaya/file-1");
  assert.notEqual(a, b);
  assert.notEqual(a, c);
  assert.equal(a.startsWith("primer-sedan/hodovaya/"), true);
  assert.equal(isQuotaError({ name: "QuotaExceededError" }), true);
  assert.equal(isQuotaError({ code: 22 }), true);
  assert.equal(isQuotaError({ name: "Error" }), false);
});

test("ensureCarShape adds direction notes without wiping scores", () => {
  const state = createDefaultState();
  const originalComment = state.cars["primer-sedan"].results.hodovaya["amort-rear"].publicComment;
  const stripped = { ...state.cars["primer-sedan"] };
  delete stripped.directionNotes;
  const next = ensureCarShape(stripped);
  assert.equal(next.directionNotes.hodovaya.publicComment, "");
  assert.equal(next.directionNotes.engine.internalComment, "");
  assert.equal(next.results.hodovaya["amort-rear"].publicComment, originalComment);
  assert.notEqual(originalComment, "");
  const electricScore = next.publishedSnapshot.scores.directionScores.find((item) => item.id === "electric");
  const kept = electricScore.score;
  electricScore.name = "Электрика";
  ensureCarShape(next);
  assert.equal(electricScore.name, "Электроприборы и электрооборудование");
  assert.equal(electricScore.score, kept);
});

import { existsSync } from "node:fs";
import { DIRECTION_IMAGES } from "../js/icons.js";
import { parseRoute, canonicalHash, isCarRoute } from "../js/routes.js";

test("report and inspect hashes stay compatible with the car dossier", () => {
  const report = parseRoute("#/report/primer-sedan/hodovaya");
  assert.equal(report.name, "report");
  assert.equal(report.id, "primer-sedan");
  assert.equal(report.dir, "hodovaya");
  assert.equal(isCarRoute(report), true);
  assert.equal(canonicalHash(report), "#/c/primer-sedan/hodovaya");
  const inspect = parseRoute("#/inspect/primer-universal/engine");
  assert.equal(canonicalHash(inspect), "#/c/primer-universal/engine");
  const car = parseRoute("#/c/primer-sedan");
  assert.equal(car.name, "car");
  assert.equal(canonicalHash(car), "#/c/primer-sedan");
  assert.equal(parseRoute("#/admin").name, "admin");
});

test("category image files exist and stay isolated by slug", () => {
  const srcs = DIRECTION_ICON_SLUGS.map((slug) => DIRECTION_IMAGES[slug].src);
  assert.equal(new Set(srcs).size, 7);
  for (const slug of DIRECTION_ICON_SLUGS) {
    const item = DIRECTION_IMAGES[slug];
    assert.equal(existsSync(new URL(`../${item.src}`, import.meta.url)), true);
    assert.match(item.alt, /[А-Яа-яA-Za-z]/);
  }
  assert.match(DIRECTION_IMAGES.hodovaya.alt, /пружин/i);
  assert.match(DIRECTION_IMAGES.engine.alt, /двигател/i);
  assert.match(DIRECTION_IMAGES.electric.alt, /аккумулятор/i);
  assert.match(DIRECTION_IMAGES.body.alt, /кузов/i);
  assert.match(DIRECTION_IMAGES.interior.alt, /сиден/i);
  assert.match(DIRECTION_IMAGES.geometry.alt, /лонжерон/i);
  assert.match(DIRECTION_IMAGES.wheels.alt, /колес/i);
});

test("photo gallery thumbnails keep a 120px grid and viewer can upscale", () => {
  const css = readFileSync(fileURLToPath(new URL("../css/app.css", import.meta.url)), "utf8");
  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  assert.match(app, /class="media-card thumb"/);
  assert.match(app, /class="media-thumb thumb-btn"/);
  assert.match(css, /\.photo-gallery\s*\{[^}]*minmax\(120px, 1fr\)/s);
  assert.match(css, /\.media-card,[\s\S]*?margin:\s*0/);
  assert.match(css, /\.media-thumb,[\s\S]*?display:\s*block/);
  assert.match(css, /\.media-thumb,[\s\S]*?padding:\s*0/);
  assert.match(css, /\.media-thumb,[\s\S]*?min-width:\s*0/);
  assert.match(css, /aspect-ratio:\s*4 \/ 3/);
  assert.match(css, /\.photo-viewer img\s*\{[^}]*width:\s*min\(90vw, 576px\)/s);
  assert.match(css, /\.photo-viewer img\s*\{[^}]*max-height:\s*75vh/s);
  assert.match(css, /\.photo-viewer img\s*\{[^}]*object-fit:\s*contain/s);
  assert.equal(css.includes("minmax(96px, 1fr)"), false);
});

import { directionTitle } from "../js/summary.js";
import { DIRECTION_DISPLAY_ORDER, orderedDirections } from "../js/data.js";
import { ASSET_VERSION } from "../js/version.js";

test("category details open in a compact dialog from buttons", () => {
  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  const css = readFileSync(fileURLToPath(new URL("../css/app.css", import.meta.url)), "utf8");
  assert.match(app, /function directionButtonsHTML/);
  assert.match(app, /class="dir-btn/);
  assert.match(app, /id="categoryDialog"/);
  assert.match(app, /function openCategoryDialog/);
  assert.match(app, /data-close-sheet/);
  assert.match(app, /Назад к списку/);
  assert.match(app, /data-select-node/);
  assert.match(app, /data-sheet-tab="checks"/);
  assert.equal(app.includes('id="dirExpand"'), false);
  assert.equal(app.includes("direction-item"), false);
  assert.equal(app.includes("function toggleDirection"), false);
  const openFn = app.slice(app.indexOf("function openCategoryDialog"), app.indexOf("function onSheetClose"));
  assert.equal(openFn.includes("scrollIntoView"), false);
  assert.match(css, /\.dir-btn h3[\s\S]*overflow-wrap:\s*break-word/);
  assert.match(css, /\.sheet-dialog[\s\S]*max-height:\s*85vh/);
});

test("seven named directions stay independent with requested button order", () => {
  const bySlug = Object.fromEntries(DIRECTIONS.map((direction) => [direction.slug, direction]));
  assert.equal(DIRECTIONS.length, 7);
  assert.equal(new Set(DIRECTIONS.map((direction) => direction.slug)).size, 7);
  assert.deepEqual(DIRECTION_DISPLAY_ORDER, ["hodovaya", "body", "engine", "electric", "interior", "geometry", "wheels"]);
  assert.deepEqual(
    orderedDirections(DIRECTIONS).map((direction) => directionTitle(direction.slug, direction.name)),
    [
      "Ходовая часть",
      "Кузов",
      "Двигатель",
      "Электроприборы и электрооборудование",
      "Салон",
      "Геометрия / Лонжероны",
      "Колёса и резина",
    ],
  );
  assert.equal(bySlug.hodovaya.checkpoints.length, 21);
  assert.equal(bySlug.engine.checkpoints.length, 14);
  assert.equal(bySlug.electric.slug, "electric");
  assert.equal(bySlug.electric.name, "Электроприборы и электрооборудование");
  assert.equal(bySlug.electric.checkpoints.length, 14);
  assert.equal(directionTitle("electric", "Электрика"), "Электроприборы и электрооборудование");
  assert.equal(directionTitle("geometry"), "Геометрия / Лонжероны");
  assert.ok(DIRECTION_IMAGES.hodovaya && DIRECTION_IMAGES.body && DIRECTION_IMAGES.engine && DIRECTION_IMAGES.electric);
  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  assert.equal(app.includes("Узлы направления"), false);
  assert.match(app, /Выберите раздел/);
  assert.match(app, /function directionButtonsHTML/);
  const state = createDefaultState();
  assert.equal(Object.keys(state.cars["primer-sedan"].results.hodovaya).length, 21);
  assert.equal(Object.keys(state.cars["primer-sedan"].results.engine).length, 14);
  assert.equal(Object.keys(state.cars["primer-sedan"].results.electric).length, 14);
  assert.equal(state.cars["primer-sedan"].assignments.hodovaya.masterId, "master-1");
  assert.equal(state.cars["primer-sedan"].assignments.engine.masterId, "master-2");
  assert.equal(state.cars["primer-sedan"].assignments.electric.masterId, "master-2");
  assert.equal(state.cars["primer-sedan"].assignments.body.masterId, "master-3");
});

test("share falls back without claiming success and install uses a real manifest", () => {
  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  const html = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
  const sw = readFileSync(fileURLToPath(new URL("../sw.js", import.meta.url)), "utf8");
  const manifest = JSON.parse(readFileSync(fileURLToPath(new URL("../manifest.webmanifest", import.meta.url)), "utf8"));
  assert.match(app, /function sharePage/);
  assert.match(app, /navigator\.share/);
  assert.match(app, /clipboard\.writeText/);
  assert.match(app, /Ссылка скопирована/);
  assert.match(app, /AbortError/);
  assert.match(app, /copyFallback/);
  assert.match(app, /beforeinstallprompt/);
  assert.match(app, /Поделиться → На экран «Домой»/);
  assert.match(app, /не установка из магазина приложений/);
  assert.match(html, new RegExp(`css/app.css\\?v=${ASSET_VERSION}`));
  assert.match(html, new RegExp(`js/app.js\\?v=${ASSET_VERSION}`));
  assert.match(html, /rel="manifest"/);
  assert.match(html, /apple-touch-icon/);
  assert.match(app, new RegExp(`from "./data.js\\?v=${ASSET_VERSION}"`));
  assert.equal(manifest.scope, "/auto-inspection-preview/");
  assert.equal(manifest.start_url, "/auto-inspection-preview/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.short_name, "Авто Лидер");
  assert.equal(manifest.name, "Авто Лидер — Проверенные авто!");
  assert.match(sw, /am24-shell-\$\{VERSION\}/);
  assert.match(sw, new RegExp(`const VERSION = "${ASSET_VERSION}"`));
  assert.match(sw, /blob:/);
  assert.match(sw, /data:/);
  assert.equal(existsSync(new URL("../images/icon-192.png", import.meta.url)), true);
  assert.equal(existsSync(new URL("../images/icon-512.png", import.meta.url)), true);
  assert.equal(existsSync(new URL("../images/apple-touch-icon.png", import.meta.url)), true);
});

test("public preview uses Авто Лидер brand and clarity slogan without tomography", () => {
  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  const html = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
  const css = readFileSync(fileURLToPath(new URL("../css/app.css", import.meta.url)), "utf8");
  assert.match(app, /const BRAND_NAME = "Авто Лидер"/);
  assert.match(app, /const BRAND_SUBLINE = "Проверенные авто!"/);
  assert.match(app, /const BRAND_FULL = "Авто Лидер — Проверенные авто!"/);
  assert.match(app, /const BRAND_TAGLINE = "Состояние авто — без тёмных пятен"/);
  assert.match(app, /const BRAND_SUPPORT = "Понятные оценки, фото и замечания — чтобы знать, что покупаешь."/);
  assert.match(app, /class="logo">\$\{BRAND_NAME\}/);
  assert.match(app, /class="brand-sub">\$\{BRAND_SUBLINE\}/);
  assert.match(app, /class="lead motto">\$\{BRAND_TAGLINE\}/);
  assert.equal(app.includes("АвтоМастер24"), false);
  assert.equal(html.includes("АвтоМастер24"), false);
  assert.match(html, /Авто Лидер — Проверенные авто!/);
  assert.match(html, /apple-mobile-web-app-title" content="Авто Лидер"/);
  assert.match(css, /\.brand-sub/);
  assert.match(css, /\.motto/);
  assert.match(css, /\.support/);
  const home = app.slice(app.indexOf("function renderHome"), app.indexOf("function unpublishedBlock"));
  const car = app.slice(app.indexOf("function renderCar"), app.indexOf("function renderAdmin"));
  assert.match(home, /BRAND_TAGLINE/);
  assert.match(home, /BRAND_SUPPORT/);
  assert.match(car, /BRAND_TAGLINE/);
  assert.equal(car.includes("BRAND_SUPPORT"), false);
  const buttons = app.slice(app.indexOf("function directionButtonsHTML"), app.indexOf("function masterFilterNote"));
  assert.equal(buttons.includes("BRAND_TAGLINE"), false);
  assert.equal(app.toLowerCase().includes("томограф"), false);
  assert.equal(html.toLowerCase().includes("томограф"), false);
});


import { visibleDirections, canEditDirection, canSeeInternalFor, directionAccess, unpublishedSectionMessage, authorizedOverview, authorizedDirectionScore } from "../js/access.js";
import { carTopSvg, carSideSvg } from "../js/scheme.js";

test("all seven category buttons stay visible and master edits stay assigned-only", () => {
  const state = createDefaultState();
  const published = state.cars["primer-sedan"];
  const inProgress = state.cars["primer-universal"];
  const slugs = visibleDirections().map((direction) => direction.slug);
  assert.deepEqual(slugs, DIRECTION_DISPLAY_ORDER);
  assert.equal(slugs.length, 7);

  assert.equal(canEditDirection("master", "master-3", published, "body"), true);
  assert.equal(canEditDirection("master", "master-3", published, "interior"), true);
  assert.equal(canEditDirection("master", "master-3", published, "geometry"), true);
  assert.equal(canEditDirection("master", "master-3", published, "hodovaya"), false);
  assert.equal(canEditDirection("master", "master-3", published, "engine"), false);
  assert.equal(canEditDirection("master", "master-3", published, "electric"), false);
  assert.equal(canEditDirection("master", "master-3", published, "wheels"), false);
  assert.equal(directionAccess("master", "master-3", published, "hodovaya"), "public");
  assert.equal(directionAccess("master", "master-3", inProgress, "hodovaya"), "blocked");
  assert.equal(directionAccess("master", "master-3", inProgress, "body"), "edit");
  assert.equal(canSeeInternalFor("master", "master-3", published, "hodovaya"), false);
  assert.equal(canSeeInternalFor("master", "master-3", published, "body"), true);
  assert.match(unpublishedSectionMessage("master", "master-3", inProgress, "hodovaya"), /Редактирует другой специалист/);
  assert.match(unpublishedSectionMessage("master", "master-3", inProgress, "hodovaya"), /Раздел ещё не опубликован/);

  assert.equal(canEditDirection("master", "master-1", published, "hodovaya"), true);
  assert.equal(canEditDirection("master", "master-1", published, "wheels"), true);
  assert.equal(canEditDirection("master", "master-1", published, "body"), false);
  assert.equal(directionAccess("master", "master-1", published, "body"), "public");
  assert.equal(directionAccess("master", "master-1", inProgress, "body"), "blocked");
  assert.equal(directionAccess("master", "master-1", inProgress, "hodovaya"), "edit");

  assert.equal(canEditDirection("admin", "master-1", published, "electric"), true);
  assert.equal(canEditDirection("buyer", null, published, "body"), false);
  assert.equal(directionAccess("buyer", null, published, "body"), "public");
  assert.equal(directionAccess("buyer", null, inProgress, "body"), "blocked");
  assert.equal(unpublishedSectionMessage("buyer", null, inProgress, "body"), "Раздел ещё не опубликован.");

  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  const css = readFileSync(fileURLToPath(new URL("../css/app.css", import.meta.url)), "utf8");
  const scheme = readFileSync(fileURLToPath(new URL("../js/scheme.js", import.meta.url)), "utf8");
  const accessSrc = readFileSync(fileURLToPath(new URL("../js/access.js", import.meta.url)), "utf8");
  assert.match(app, /visibleDirections\(\)/);
  assert.equal(app.includes("DIRECTIONS.filter((direction) => carState.assignments"), false);
  assert.equal(app.includes("посмотреть все в режиме покупателя"), false);
  assert.match(accessSrc, /Редактирует другой специалист/);
  assert.match(app, /unpublishedSectionMessage/);
  assert.match(app, /Раздел ещё не опубликован/);
  assert.match(app, /canEditDir\(/);
  assert.match(app, /Вид сверху/);
  assert.match(app, /Вид сбоку/);
  assert.match(app, /carTopSvg/);
  assert.match(app, /carSideSvg/);
  assert.match(scheme, /viewBox="0 0 760 360"/);
  assert.match(scheme, /viewBox="0 0 760 300"/);
  assert.match(scheme, /scheme-hit/);
  assert.match(css, /#0b1f33/);
  assert.equal(css.includes("#f3efe6"), false);
  assert.equal(css.includes("#2c2418"), false);
  assert.equal(/\.badge\s*\{[^}]*position:\s*sticky/s.test(css), false);
  assert.match(css, /\.dir-chevron/);
});

test("published snapshot stays readable and unpublished drafts do not leak", () => {
  const state = createDefaultState();
  const sedan = state.cars["primer-sedan"];
  const uni = state.cars["primer-universal"];
  const liveUni = liveScoresForCar(uni);
  assert.notEqual(liveUni.directionScores.find((item) => item.id === "engine").score, null);
  const hidden = authorizedDirectionScore("master", "master-3", uni, "engine");
  assert.equal(hidden.unpublished, true);
  assert.equal(hidden.dirScore.score, null);
  const shown = authorizedDirectionScore("master", "master-3", sedan, "engine");
  assert.equal(shown.access, "public");
  assert.equal(shown.dirScore.score, sedan.publishedSnapshot.scores.directionScores.find((item) => item.id === "engine").score);
  const adminOverview = authorizedOverview("admin", "master-1", uni);
  const masterOverview = authorizedOverview("master", "master-3", uni);
  assert.ok(masterOverview.scores.checked < adminOverview.scores.checked);
  assert.notEqual(masterOverview.scores.displayedScore, adminOverview.scores.displayedScore);
  const buyerDraft = authorizedOverview("buyer", "", uni);
  assert.equal(buyerDraft.unpublished, true);
  assert.equal(buyerDraft.scores.displayedScore, null);
  assert.equal(buyerDraft.scores.criticalFaults.length, 0);
  const buyerSedan = authorizedOverview("buyer", "", sedan);
  assert.equal(buyerSedan.scores.checked, 80);
  assert.equal(buyerSedan.scores.total, 91);
  assert.equal(buyerSedan.scores.displayedScore, 7);
});



import { inspectionProgress, COMPLETION_LABELS } from "../js/summary.js";
import { MEDIA_DB_NAME } from "../js/media.js";

test("final score sits after category buttons and uses completion labels", () => {
  const state = createDefaultState();
  const sedanScores = state.cars["primer-sedan"].publishedSnapshot.scores;
  const prelim = inspectionProgress(sedanScores);
  assert.equal(prelim.key, "preliminary");
  assert.equal(prelim.completionLabel, COMPLETION_LABELS.preliminary);
  assert.equal(prelim.completionLabel, "Предварительная оценка");
  assert.equal(prelim.checked, 80);
  assert.equal(prelim.total, 91);
  assert.equal(prelim.scoreText, "7,0/10");
  assert.equal(prelim.hasCritical, true);

  const none = inspectionProgress({ displayedScore: null, checked: 0, total: 91, criticalFaults: [] });
  assert.equal(none.key, "none");
  assert.equal(none.completionLabel, "Проверки ещё не выполнены");
  assert.equal(none.scoreText, "—/10");

  const done = inspectionProgress({ displayedScore: 8, checked: 91, total: 91, criticalFaults: [] });
  assert.equal(done.key, "complete");
  assert.equal(done.completionLabel, "Осмотр завершён");
  assert.equal(done.scoreText, "8,0/10");

  const hidden = inspectionProgress({ displayedScore: 7, checked: 80, total: 91, criticalFaults: [{ name: "X" }] }, { unpublished: true });
  assert.equal(hidden.key, "unpublished");
  assert.equal(hidden.scoreText, "—/10");
  assert.equal(hidden.hasCritical, false);

  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  const carFn = app.slice(app.indexOf("function renderCar"), app.indexOf("function renderAdmin"));
  assert.ok(carFn.indexOf("directionButtonsHTML") > -1);
  assert.ok(carFn.indexOf("finalVerdictHTML") > carFn.indexOf("directionButtonsHTML"));
  assert.ok(carFn.indexOf("printReport") > carFn.indexOf("finalVerdictHTML"));
  assert.match(app, /Итоговая оценка автомобиля/);
  assert.match(app, /Выберите раздел/);
});

test("scheme shows recognizable top and side car views", () => {
  const top = carTopSvg({ geometryCritical: true });
  const side = carSideSvg({ geometryCritical: false });
  assert.match(top, /Вид автомобиля сверху/);
  assert.match(side, /Вид автомобиля сбоку/);
  for (const slug of ["hodovaya", "body", "engine", "electric", "interior", "geometry", "wheels"]) {
    assert.match(top, new RegExp(`data-select-dir="${slug}"`));
    assert.match(side, new RegExp(`data-select-dir="${slug}"`));
  }
  assert.match(top, /scheme-crit-mark/);
  assert.equal(side.includes("scheme-crit-mark"), false);
  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  assert.match(app, /carTopSvg/);
  assert.match(app, /carSideSvg/);
  assert.match(app, /scheme-view-title">Вид сверху/);
  assert.match(app, /scheme-view-title">Вид сбоку/);
});

test("service worker prefers the network so a refresh gets the latest shell", () => {
  const sw = readFileSync(fileURLToPath(new URL("../sw.js", import.meta.url)), "utf8");
  assert.match(sw, /skipWaiting/);
  assert.match(sw, /clients\.claim/);
  assert.match(sw, /access\.js\?v=20261108f/);
  assert.match(sw, /scheme\.js\?v=20261108f/);
  const fetchHandler = sw.slice(sw.indexOf('self.addEventListener("fetch"'));
  assert.ok(fetchHandler.indexOf("fetch(request)") < fetchHandler.indexOf("caches.match(request)"));
  assert.equal(MEDIA_DB_NAME, "am24-tradein-demo-media-v1");
});
