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
  for (const svg of drawn) {
    assert.match(svg, /viewBox="0 0 200 140"/);
    assert.match(svg, /data-illustration="/);
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
  assert.match(card, /Открыть папку/);
  assert.match(card, /overallHero/);
  assert.equal(card.includes("conditionGrid"), false);
  assert.equal(card.includes("directionPicker"), false);
  assert.equal(home.includes("conditionGrid"), false);
  assert.equal(home.includes("directionPicker"), false);
  assert.match(app, /function renderCar/);
  assert.match(app, /Оценочный лист/);
  assert.match(app, />Фото </);
  assert.match(app, />Видео </);
  assert.match(app, /Пока нет фотографий в этой папке/);
  assert.match(app, /Пока нет видео в этой папке/);
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
});
