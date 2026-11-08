import test from "node:test";
import assert from "node:assert/strict";
import { computeScores, DEFAULT_SCORING_CONFIG } from "../js/scoring.js";
import { buildPublicCarUrl, buildWhatsAppBuyUrl, buildWhatsAppMessage, normalizeKzWhatsAppNumber } from "../js/whatsapp.js";
import { saveState, loadState, clearState, STORAGE_KEY } from "../js/storage.js";
import { createDefaultState, DIRECTIONS, SAMPLE_CARS, liveScoresForCar, ensureCarShape } from "../js/data.js";

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

import { conditionFromScore, summarizeDirection, summarizeOverall, CONDITION_LABELS, statusPresentation, nodeStatus } from "../js/summary.js";
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
  assert.equal(summarizeDirection({ score: 6.2, checked: 4, total: 8, criticalFaults: [] }).label, "Требует внимания");
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
  assert.equal(critical.kind, "notes");
  assert.equal(statusPresentation(critical).kind, "critical");
  assert.equal(statusPresentation(critical).label, "Критичный дефект");
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

import { existsSync, statSync } from "node:fs";
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
import { schemeForCar, schemeKindForCar, listSchemeAssets } from "../js/scheme.js";

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
  assert.match(app, /schemeForCar/);
  assert.equal(app.includes("carTopSvg"), false);
  assert.equal(app.includes("carSideSvg"), false);
  assert.equal(scheme.includes("viewBox"), false);
  assert.equal(scheme.includes("scheme-hit"), false);
  assert.equal(scheme.includes("scheme-crit-mark"), false);
  assert.match(scheme, /images\/schemes\/toyota-camry-2010-top\.png/);
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

function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test("scheme uses sourced real-car drawings without homemade paths or damage overlays", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  const scheme = readFileSync(fileURLToPath(new URL("../js/scheme.js", import.meta.url)), "utf8");
  const css = readFileSync(fileURLToPath(new URL("../css/app.css", import.meta.url)), "utf8");
  const readme = readFileSync(fileURLToPath(new URL("../images/schemes/README.md", import.meta.url)), "utf8");

  assert.equal(scheme.includes("export function carTopSvg"), false);
  assert.equal(scheme.includes("export function carSideSvg"), false);
  assert.equal(scheme.includes("scheme-crit-mark"), false);
  assert.equal(scheme.includes("data-select-dir"), false);
  assert.equal(/d="M\d+/.test(scheme), false);
  assert.equal(app.includes("carTopSvg"), false);
  assert.equal(app.includes("carSideSvg"), false);
  assert.equal(app.includes("На схеме отмечено"), false);
  assert.match(app, /Схема кузова — не карта повреждений/);
  assert.match(app, /Источник схемы/);
  assert.match(app, /Передняя часть/);
  assert.match(app, /scheme-view-title/);
  assert.match(app, /"Вид сверху"/);
  assert.match(app, /"Вид сбоку"/);
  assert.match(app, /schemeCriticalNoteHTML/);
  assert.match(app, /Критичное замечание:/);

  const sedan = schemeForCar({ id: "primer-sedan", bodyType: "sedan", model: "Седан А" });
  const wagon = schemeForCar({ id: "primer-universal", bodyType: "wagon", model: "Универсал Б" });
  const crossover = schemeForCar({ id: "primer-crossover", bodyType: "crossover", model: "Кроссовер В" });
  assert.equal(schemeKindForCar({ bodyType: "sedan" }), "sedan");
  assert.equal(schemeKindForCar({ bodyType: "wagon" }), "wagon");
  assert.equal(schemeKindForCar({ bodyType: "crossover" }), "crossover");
  assert.match(sedan.title, /Toyota Camry/);
  assert.match(sedan.title, /седан/);
  assert.match(wagon.title, /Subaru Outback/);
  assert.match(wagon.title, /универсал/);
  assert.match(crossover.title, /Range Rover Evoque/);
  assert.match(crossover.title, /кроссовер/);
  assert.notEqual(sedan.top.src, wagon.top.src);
  assert.notEqual(sedan.top.src, crossover.top.src);
  assert.notEqual(wagon.top.src, crossover.top.src);

  for (const item of listSchemeAssets()) {
    for (const view of [item.top, item.side]) {
      const file = new URL(`../${view.src}`, import.meta.url);
      const buf = readFileSync(file);
      assert.ok(buf.length > 80_000, `${view.src} too small`);
      const size = pngSize(buf);
      assert.equal(size.width, view.width);
      assert.equal(size.height, view.height);
      assert.ok(size.width >= 1600, `${view.src} too narrow`);
      assert.ok(size.height >= 500, `${view.src} too short`);
    }
    assert.match(readme, new RegExp(item.source.patent));
    assert.match(readme, new RegExp(item.source.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("mobile scheme stays stacked and visible without leftover tab-hide rules", () => {
  const css = readFileSync(fileURLToPath(new URL("../css/app.css", import.meta.url)), "utf8");
  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  assert.match(css, /\.scheme-panel\s*\{[^}]*display:\s*block/s);
  assert.match(css, /\.scheme-photo\s*\{[^}]*width:\s*100%/s);
  assert.match(css, /\.scheme-photo\s*\{[^}]*height:\s*auto/s);
  assert.match(css, /\.scheme-photo\s*\{[^}]*object-fit:\s*contain/s);
  assert.equal(css.includes(".scheme-panel { display: none; }"), false);
  assert.equal(css.includes(".scheme-panel.is-active"), false);
  assert.equal(/@media \(max-width: 719px\)[\s\S]*?\.scheme-panel\s*\{\s*display:\s*none/.test(css), false);
  assert.equal(css.includes("scheme-tabs { display: none; }"), false);
  assert.equal(css.includes(".scheme-svg"), false);
  assert.equal(css.includes(".scheme-hit"), false);
  assert.match(app, /scheme-view-title/);
  assert.match(app, /"Вид сверху"/);
  assert.match(app, /"Вид сбоку"/);
  assert.equal(app.includes("data-scheme-view"), false);
  assert.equal(app.includes("function bindSchemeTabs"), false);
  assert.match(app, /Выберите раздел, чтобы посмотреть оценки, замечания и фото/);
  assert.equal(app.includes("простыни"), false);
  assert.equal(app.includes("семь отдельных кнопок"), false);
  assert.match(css, /\.top \.btn\.ghost\.header-action/);
  assert.match(css, /\.top \.btn\.ghost\.header-action[^{]*\{[^}]*background:\s*#ffffff/s);
  assert.match(css, /\.top \.btn\.ghost\.header-action[^{]*\{[^}]*color:\s*#0b1f33/s);
});

test("service worker prefers the network so a refresh gets the latest shell", () => {
  const sw = readFileSync(fileURLToPath(new URL("../sw.js", import.meta.url)), "utf8");
  assert.match(sw, /skipWaiting/);
  assert.match(sw, /clients\.claim/);
  assert.match(sw, /access\.js\?v=20261108j/);
  assert.match(sw, /scheme\.js\?v=20261108j/);
  const fetchHandler = sw.slice(sw.indexOf('self.addEventListener("fetch"'));
  assert.ok(fetchHandler.indexOf("fetch(request)") < fetchHandler.indexOf("caches.match(request)"));
  assert.equal(MEDIA_DB_NAME, "am24-tradein-demo-media-v1");
});


import {
  addDefect,
  authorizedDefects,
  clamp01,
  cloneDiagramDefects,
  defectsForView,
  emptyDiagramDefects,
  isTap,
  normalizeColor,
  pointFromClientRect,
  removeDefect,
  sanitizeDescription,
  updateDefect,
} from "../js/defects.js";
import { diagramsForDirection, listDiagramAssets } from "../js/diagrams.js";

test("status presentation keeps score bands and overrides critical in the pill only", () => {
  assert.equal(conditionFromScore(null).kind, "unchecked");
  assert.equal(conditionFromScore(undefined).label, CONDITION_LABELS.unchecked);
  assert.equal(conditionFromScore(8).kind, "good");
  assert.equal(conditionFromScore(9.4).label, "Хорошее состояние");
  assert.equal(conditionFromScore(5).kind, "notes");
  assert.equal(conditionFromScore(5).label, "Требует внимания");
  assert.equal(conditionFromScore(4.9).kind, "repair");
  assert.equal(conditionFromScore(1).label, "Нужен ремонт");
  assert.equal(conditionFromScore(0).kind, "repair");
  const goodCritical = summarizeDirection({
    score: 8.6,
    checked: 16,
    total: 16,
    criticalFaults: [{ name: "Лонжерон передний левый" }],
  });
  assert.equal(goodCritical.kind, "good");
  assert.equal(goodCritical.label, "Хорошее состояние");
  assert.equal(statusPresentation(goodCritical).kind, "critical");
  assert.equal(statusPresentation(goodCritical).label, "Критичный дефект");
  const unpublished = summarizeOverall({ displayedScore: 8, checked: 80, total: 91 }, { unpublished: true });
  assert.equal(statusPresentation(unpublished).kind, "unpublished");
  assert.equal(nodeStatus({ score: null }, { isCritical: true }).kind, "unchecked");
  assert.equal(nodeStatus({ score: 8 }, { isCritical: true }).kind, "good");
  assert.equal(nodeStatus({ score: 3 }, { isCritical: true }).kind, "critical");
  assert.equal(nodeStatus({ score: 3 }, { isCritical: false }).kind, "repair");
});

test("status pills are large high-contrast labels that wrap instead of shrinking", () => {
  const css = readFileSync(fileURLToPath(new URL("../css/app.css", import.meta.url)), "utf8");
  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  assert.match(css, /\.status-pill\s*\{[^}]*font-size:\s*0\.9375rem/s);
  assert.match(css, /\.status-pill\s*\{[^}]*font-weight:\s*750/s);
  assert.match(css, /\.status-pill-text\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.equal(/\.status-pill\s*\{[^}]*white-space:\s*nowrap/s.test(css), false);
  assert.match(css, /\.status-pill-critical\s*\{[^}]*background:\s*#b42318/s);
  assert.match(css, /\.status-pill-good\s*\{[^}]*color:\s*#064e38/s);
  assert.match(app, /function statusPillHTML/);
  assert.match(app, /Требует внимания/);
  assert.match(app, /Критичный дефект/);
  assert.match(app, /status-pill-icon/);
});

test("diagram defect helpers clamp, isolate, freeze snapshots and keep stable numbers", () => {
  assert.equal(clamp01(-2), 0);
  assert.equal(clamp01(1.7), 1);
  assert.equal(clamp01("nope"), 0);
  assert.equal(normalizeColor("red"), "comment");
  assert.equal(normalizeColor("critical"), "critical");
  assert.equal(sanitizeDescription("  <b>масло</b>\u0007  ").includes("<b>масло</b>"), true);
  assert.equal(sanitizeDescription("  x  ").length, 1);
  assert.equal(pointFromClientRect({ left: 10, top: 20, width: 100, height: 50 }, 5, 30), null);
  assert.deepEqual(pointFromClientRect({ left: 10, top: 20, width: 100, height: 50 }, 60, 45), { x: 0.5, y: 0.5 });
  assert.equal(isTap(3, 4, 12), true);
  assert.equal(isTap(20, 0, 12), false);

  const first = addDefect([], { viewId: "chassis", assetId: "hodovaya-chassis-v1", x: -1, y: 2, color: "critical", description: "Течь", size: "l" });
  const second = addDefect(first.list, { viewId: "chassis", assetId: "hodovaya-chassis-v1", x: 0.4, y: 0.4, color: "attention", description: "Люфт" });
  const third = addDefect(second.list, { viewId: "strut", assetId: "hodovaya-strut-v1", x: 0.2, y: 0.3, color: "comment", description: "Пыльник" });
  assert.equal(first.ok && second.ok && third.ok, true);
  assert.notEqual(first.defect.id, second.defect.id);
  assert.deepEqual(third.list.map((item) => item.number), [1, 2, 3]);
  const afterDelete = removeDefect(third.list, second.defect.id);
  assert.deepEqual(afterDelete.map((item) => item.number), [1, 3]);
  const fourth = addDefect(afterDelete, { viewId: "chassis", assetId: "hodovaya-chassis-v1", x: 0.1, y: 0.1, color: "comment", description: "Ещё" });
  assert.equal(fourth.defect.number, 4);
  const moved = updateDefect(fourth.list, first.defect.id, { x: 1.4, y: -0.2, description: "Течь масла" });
  assert.equal(moved.defect.number, 1);
  assert.equal(moved.defect.x, 1);
  assert.equal(moved.defect.y, 0);
  assert.equal(updateDefect(fourth.list, first.defect.id, { description: "   " }).ok, false);
  assert.equal(addDefect([], { viewId: "chassis", assetId: "a", x: 0.2, y: 0.2, description: "" }).ok, false);
  assert.equal(defectsForView(fourth.list, "strut", "hodovaya-strut-v1").length, 1);
  assert.equal(defectsForView(fourth.list, "chassis", "old-asset").length, 0);

  const live = { hodovaya: moved.list, body: [] };
  const snap = cloneDiagramDefects(live);
  moved.list[0].description = "changed live";
  live.hodovaya.push({ id: "leak", number: 9, viewId: "chassis", assetId: "hodovaya-chassis-v1", x: 0.2, y: 0.2, size: "m", color: "critical", description: "draft" });
  assert.equal(snap.hodovaya.find((item) => item.id === first.defect.id).description, "Течь масла");
  assert.equal(snap.hodovaya.some((item) => item.id === "leak"), false);

  const car = ensureCarShape({
    status: "published",
    results: {},
    assignments: {},
    publishedSnapshot: { scores: { directionScores: [] } },
  });
  assert.ok(Array.isArray(car.diagramDefects.hodovaya));
  car.diagramDefects.hodovaya = fourth.list.slice();
  assert.equal(authorizedDefects("edit", car, "hodovaya").canEdit, true);
  assert.equal(authorizedDefects("edit", car, "hodovaya").source, "live");
  assert.equal(authorizedDefects("public", car, "hodovaya").list.length, 0);
  assert.equal(authorizedDefects("blocked", car, "hodovaya").list.length, 0);
  car.publishedSnapshot.diagramDefects = cloneDiagramDefects(car.diagramDefects);
  car.diagramDefects.hodovaya = [];
  assert.equal(authorizedDefects("public", car, "hodovaya").list.length > 0, true);
  assert.equal(authorizedDefects("edit", car, "hodovaya").list.length, 0);
  const seeded = createDefaultState();
  ensureCarShape(seeded.cars["primer-sedan"]);
  assert.equal(authorizedDefects("public", seeded.cars["primer-sedan"], "geometry").list.length, 0);
});

test("every category has its own sourced diagram assets", () => {
  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  const slugs = ["hodovaya", "body", "engine", "electric", "interior", "geometry", "wheels"];
  for (const slug of slugs) {
    const sedan = diagramsForDirection(slug, { bodyType: "sedan" });
    assert.ok(sedan.views.length >= 1, `${slug} missing views`);
    for (const view of sedan.views) {
      const file = fileURLToPath(new URL(`../${view.src}`, import.meta.url));
      assert.equal(existsSync(file), true, `${view.src} missing`);
      assert.ok(statSync(file).size > 20_000, `${view.src} too small`);
      assert.equal(view.width, view.width);
      assert.ok(view.width >= 1400, `${view.src} too narrow`);
      assert.ok(view.caption.length > 10);
      assert.match(view.source.url, /^https:\/\//);
    }
  }
  assert.notEqual(
    diagramsForDirection("body", { bodyType: "sedan" }).views[0].src,
    diagramsForDirection("body", { bodyType: "wagon" }).views[0].src,
  );
  assert.match(diagramsForDirection("hodovaya", {}).views[0].src, /hodovaya-chassis/);
  assert.match(diagramsForDirection("engine", {}).views[0].src, /engine-1nz/);
  assert.match(diagramsForDirection("electric", {}).views[0].src, /electric-layout/);
  assert.match(diagramsForDirection("interior", {}).disclaimer, /не вид сверху/);
  const assets = listDiagramAssets({ bodyType: "sedan" });
  assert.ok(assets.length >= 10);
  const schemeTab = app.indexOf('data-sheet-tab="scheme"');
  const checksTab = app.indexOf('data-sheet-tab="checks"');
  assert.ok(schemeTab > -1 && schemeTab < checksTab);
  assert.match(app, /Схема и дефекты/);
  assert.match(app, /Отметок пока нет/);
  assert.match(app, /Добавить дефект/);
  assert.match(app, /Переместить/);
  assert.match(app, /Удалить отметку/);
  assert.match(app, /cloneDiagramDefects/);
  assert.match(app, /escapeHtml\(item\.description\)/);
  assert.equal(app.includes("data-scheme-view"), false);
  assert.equal(app.includes("function condMark"), false);
  const sw = readFileSync(fileURLToPath(new URL("../sw.js", import.meta.url)), "utf8");
  assert.match(sw, /defects\.js\?v=20261108j/);
  assert.match(sw, /diagrams\.js\?v=20261108j/);
  assert.match(sw, /images\/diagrams\/hodovaya-chassis\.jpg/);
});


test("comic theme ships licensed local Cyrillic display fonts", () => {
  const comic = readFileSync(fileURLToPath(new URL("../css/comic.css", import.meta.url)), "utf8");
  const html = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
  const sw = readFileSync(fileURLToPath(new URL("../sw.js", import.meta.url)), "utf8");
  const app = readFileSync(fileURLToPath(new URL("../js/app.js", import.meta.url)), "utf8");
  assert.match(html, /css\/comic\.css\?v=20261108j/);
  assert.match(comic, /@font-face/);
  assert.match(comic, /font-family:\s*"Russo One"/);
  assert.match(comic, /font-family:\s*"Balsamiq Sans"/);
  assert.match(comic, /font-family:\s*"Manrope"/);
  assert.match(comic, /url\("\.\.\/fonts\/russo-one\.woff2"\)/);
  assert.match(comic, /url\("\.\.\/fonts\/balsamiq-sans-bold\.woff2"\)/);
  assert.match(comic, /url\("\.\.\/fonts\/manrope-variable\.woff2"\)/);
  assert.match(comic, /U\+0400/);
  assert.match(sw, /css\/comic\.css\?v=20261108j/);
  assert.match(sw, /fonts\/russo-one\.woff2/);
  assert.match(sw, /fonts\/balsamiq-sans-bold\.woff2/);
  assert.match(sw, /fonts\/manrope-variable\.woff2/);
  for (const file of ["russo-one.woff2", "balsamiq-sans-bold.woff2", "manrope-variable.woff2"]) {
    const full = fileURLToPath(new URL(`../fonts/${file}`, import.meta.url));
    assert.equal(existsSync(full), true, `${file} missing`);
    assert.ok(statSync(full).size > 10_000, `${file} too small`);
  }
  assert.match(app, /dir-spine/);
  assert.match(app, /chapter-auto/);
  assert.match(app, /"Автомобиль"/);
  assert.match(app, /"Схема"/);
  assert.match(app, /"Проверки"/);
  assert.match(app, /"Итог"/);
  assert.match(app, /разделов проверки/);
});

test("prefers-reduced-motion disables decorative motion", () => {
  const comic = readFileSync(fileURLToPath(new URL("../css/comic.css", import.meta.url)), "utf8");
  assert.match(comic, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  const reduced = comic.slice(comic.indexOf("prefers-reduced-motion"));
  assert.match(reduced, /animation:\s*none/);
  assert.match(reduced, /scroll-behavior:\s*auto/);
});

test("annotation stage is not skewed or rotated", () => {
  const css = [
    readFileSync(fileURLToPath(new URL("../css/app.css", import.meta.url)), "utf8"),
    readFileSync(fileURLToPath(new URL("../css/comic.css", import.meta.url)), "utf8"),
  ].join("\n");
  const rules = [...css.matchAll(/\.defect-map-stage(?:\s+img)?[^{]*\{[^}]*\}/g)].map((item) => item[0]);
  assert.ok(rules.length >= 2, "expected defect-map-stage rules");
  for (const rule of rules) {
    assert.equal(/skew(?:X|Y)?\s*\(/.test(rule), false, rule);
    assert.equal(/rotate(?:3d|X|Y|Z)?\s*\(/.test(rule), false, rule);
    if (/transform\s*:/.test(rule)) {
      assert.match(rule, /transform:\s*none/);
    }
  }
});
