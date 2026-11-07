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
import { DIRECTION_ICON_SLUGS } from "../js/icons.js";

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
