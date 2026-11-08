import { DIRECTIONS, DEMO_MASTERS, ROLES, SAMPLE_CARS, createDefaultState, carMeta, liveScoresForCar, ensureCarShape, orderedDirections } from "./data.js?v=20261108l";
import { FORMULA_DISCLAIMER } from "./scoring.js?v=20261108l";
import { buildPublicCarUrl, buildWhatsAppBuyUrl } from "./whatsapp.js?v=20261108l";
import { loadState, saveState, clearState } from "./storage.js?v=20261108l";
import { summarizeDirection, summarizeOverall, directionTitle, inspectionProgress, severityClass, statusPresentation, nodeStatus } from "./summary.js?v=20261108l";
import { directionThumb } from "./icons.js?v=20261108l";
import { folderKey } from "./folder.js?v=20261108l";
import { parseRoute as parseRouteFromHash, isCarRoute, canonicalHash } from "./routes.js?v=20261108l";
import { visibleDirections, canEditDirection, canSeeInternalFor, directionAccess, unpublishedSectionMessage, authorizedOverview, authorizedDirectionScore, authorizedConclusion } from "./access.js?v=20261108l";
import { schemeForCar } from "./scheme.js?v=20261108l";
import { diagramsForDirection } from "./diagrams.js?v=20261108l";
import {
  DEFECT_COLORS,
  DEFECT_SIZES,
  addDefect,
  authorizedDefects,
  cloneDiagramDefects,
  colorMeta,
  defectsForView,
  isTap,
  pointFromClientRect,
  removeDefect,
  sizeMeta,
  updateDefect,
} from "./defects.js?v=20261108l";
import {
  MEDIA_LIMITS_TEXT,
  addFolderMedia,
  clearAllMedia,
  deleteFolderMedia,
  listFolderMedia,
  objectUrlFor,
  revokeAllObjectUrls,
  revokeFolderObjectUrls,
} from "./media.js?v=20261108l";
import { ASSET_VERSION } from "./version.js?v=20261108l";

const STATUS_LABEL = {
  created: "создан",
  in_progress: "в работе у мастеров",
  in_review: "на проверке",
  published: "опубликован",
};

const BRAND_NAME = "Авто Лидер";
const BRAND_SUBLINE = "Проверенные авто!";
const BRAND_HOOK = "Покупай автомобиль правильно!";
const BRAND_FULL = "Авто Лидер — Проверенные авто!";
const BRAND_TAGLINE = "Состояние авто — без тёмных пятен";
const BRAND_SUPPORT = "Понятные оценки, фото и замечания — чтобы знать, что покупаешь.";
const HOME_HOOK = "Узнай состояние машины до покупки — и плати за автомобиль, а не за скрытые проблемы.";
const HOME_BENEFITS = [
  "Понимай, что с автомобилем на самом деле.",
  "Знай, что нужно ремонтировать, а что менять не требуется.",
  "Оценивай реальную стоимость с учётом состояния и предстоящих вложений.",
];

function inspectionScope() {
  const sections = orderedDirections().length;
  const points = DIRECTIONS.reduce((sum, item) => sum + item.checkpoints.length, 0);
  return { sections, points };
}

function chapterHead(id, title, index) {
  return `<header class="chapter-head">
    <span class="chapter-num" aria-hidden="true">${String(index).padStart(2, "0")}</span>
    <h2 id="${id}">${escapeHtml(title)}</h2>
  </header>`;
}


const MASTER_FILTER_NOTE =
  "В этом демо видны все семь разделов. Редактировать можно только назначенные вам. Остальные открываются по опубликованному отчёту либо с пометкой «Раздел ещё не опубликован».";

let sheetDir = null;
let sheetNode = null;
let sheetPane = "checks";
let lastDirTrigger = null;
let lastViewerTrigger = null;
let defectMode = null;
let defectPending = null;
let selectedDefectId = null;

let state = hydrate();
let saveTimer = 0;

function hydrate() {
  const saved = loadState();
  const fresh = createDefaultState();
  if (!saved || saved.version !== 1 || !saved.cars) {
    Object.values(fresh.cars).forEach(ensureCarShape);
    return fresh;
  }
  const cars = { ...fresh.cars, ...saved.cars };
  for (const id of Object.keys(cars)) ensureCarShape(cars[id]);
  return {
    ...fresh,
    ...saved,
    cars,
  };
}

function persist() {
  saveState(state);
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(persist, 200);
}

function siteBase() {
  const url = new URL(location.href);
  url.hash = "";
  url.search = "";
  let href = url.href;
  if (href.endsWith("index.html")) href = href.slice(0, -"index.html".length);
  return href;
}

function parseRoute() {
  return parseRouteFromHash(location.hash);
}

function accessFor(carState, slug) {
  return directionAccess(state.role, state.masterId, carState, slug);
}

function canEditDir(carState, slug) {
  return canEditDirection(state.role, state.masterId, carState, slug);
}

function canSeeInternalDir(carState, slug) {
  return canSeeInternalFor(state.role, state.masterId, carState, slug);
}

function roleLabel() {
  return ROLES.find((item) => item.id === state.role)?.label || state.role;
}

function blankScores() {
  const directionScores = DIRECTIONS.map((direction) => ({
    id: direction.slug,
    name: direction.name,
    score: null,
    checked: 0,
    total: direction.checkpoints.length,
    coverage: 0,
    criticalFaults: [],
  }));
  const total = directionScores.reduce((sum, item) => sum + item.total, 0);
  return {
    directionScores,
    displayedScore: null,
    overall: null,
    checked: 0,
    total,
    coverage: 0,
    criticalFaults: [],
  };
}

function scoresFor(carId) {
  const carState = state.cars[carId];
  if (!carState) return null;
  if (state.role === "buyer" && carState.publishedSnapshot?.scores) return carState.publishedSnapshot.scores;
  if (carState.status === "published" && carState.publishedSnapshot?.scores && state.role !== "admin" && state.role !== "master") {
    return carState.publishedSnapshot.scores;
  }
  return liveScoresForCar(carState);
}

function overviewFor(carId) {
  return authorizedOverview(state.role, state.masterId, state.cars[carId]);
}

function summaryForDirection(carId, direction) {
  const view = authorizedDirectionScore(state.role, state.masterId, state.cars[carId], direction.slug);
  const summary = summarizeDirection(view.dirScore, { unpublished: view.unpublished });
  if (view.unpublished) {
    return { ...summary, label: "Раздел ещё не опубликован" };
  }
  return summary;
}

function whatsappHref(car) {
  const publicCarUrl = buildPublicCarUrl(siteBase(), car.id);
  return buildWhatsAppBuyUrl({
    make: car.make,
    model: car.model,
    year: car.year,
    publicCarUrl,
  });
}

function carPhoto(car, extraClass = "", caption = "Учебная иллюстрация, не фото осмотра") {
  if (!car?.image) return "";
  return `<figure class="${extraClass}">
    <img src="${car.image}" alt="${escapeHtml(car.imageAlt || `${car.make} ${car.model}`)}" width="640" height="480">
    <figcaption>${escapeHtml(caption)}</figcaption>
  </figure>`;
}

function renderWhatsApp(car) {
  return `<a class="btn wa" href="${whatsappHref(car)}" target="_blank" rel="noopener noreferrer">Хочу купить этот автомобиль</a>
    <p class="hint">Откроется WhatsApp с маркой, моделью, годом и ссылкой. Сообщение не отправится само.</p>`;
}

function header() {
  const roleOptions = ROLES.map((role) => `<option value="${role.id}" ${state.role === role.id ? "selected" : ""}>${role.label}</option>`).join("");
  const masterSelect =
    state.role === "master"
      ? `<label>Демо-мастер
          <select id="masterSelect">${DEMO_MASTERS.map((master) => `<option value="${master.id}" ${state.masterId === master.id ? "selected" : ""}>${master.name}</option>`).join("")}</select>
        </label>`
      : "";
  return `<header class="top">
    <div class="brand">
      <a href="#/" class="logo">${BRAND_NAME}</a>
      <p class="brand-sub">${BRAND_SUBLINE}</p>
      <p class="brand-hook">${BRAND_HOOK}</p>
    </div>
    <nav>
      <a href="#/">Все автомобили</a>
      <button type="button" class="mode-toggle" id="modeToggle" aria-haspopup="dialog">Демо-режим: ${escapeHtml(roleLabel())}</button>
      <button type="button" class="btn ghost header-action" id="sharePage">Поделиться</button>
      <button type="button" class="btn ghost header-action" id="installApp">Установить на телефон</button>
    </nav>
    <p id="actionStatus" class="hint action-status" role="status" hidden></p>
    <dialog id="iosInstallHelp" class="mode-dialog">
      <h2>Как добавить на телефон</h2>
      <p>На iPhone или iPad нажмите «Поделиться → На экран «Домой»». Это ярлык этого сайта, а не установка из магазина приложений и не синхронизация аккаунта. Данные по-прежнему хранятся только в этом браузере.</p>
      <button type="button" class="btn" id="iosInstallClose">Понятно</button>
    </dialog>
    <dialog id="copyHelp" class="mode-dialog">
      <h2>Скопируйте ссылку</h2>
      <p>Автоматическое копирование недоступно. Выделите ссылку и скопируйте её вручную.</p>
      <textarea id="copyFallback" readonly rows="3"></textarea>
      <button type="button" class="btn" id="copyHelpClose">Закрыть</button>
    </dialog>
    <dialog id="modeDialog" class="mode-dialog">
      <h2>Режим работы (демо)</h2>
      <p>Это учебный переключатель вида, а не вход в систему и не выдача прав.</p>
      <label>Кто смотрит
        <select id="roleSelect">${roleOptions}</select>
      </label>
      ${masterSelect}
      <p><a href="#/admin">Назначения и публикация</a> — только в этом браузере.</p>
      <div class="row">
        <button type="button" id="resetDemo" class="btn ghost">Сбросить учебные данные</button>
        <button type="button" class="btn" id="modeClose">Закрыть</button>
      </div>
    </dialog>
  </header>`;
}

function statusIconSVG(kind) {
  if (kind === "good") {
    return `<svg class="status-pill-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#0b6b4a"/><path d="M7.2 12.4 10.3 15.5 16.8 8.8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  if (kind === "notes") {
    return `<svg class="status-pill-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="#b37400"/><path d="M12 7.2v6.6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="16.8" r="1.15" fill="#fff"/></svg>`;
  }
  if (kind === "repair") {
    return `<svg class="status-pill-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" fill="#b14800"/><path d="M14.8 7.1a3.1 3.1 0 0 0-4 4L7 14.9 9.1 17l3.8-3.8a3.1 3.1 0 0 0 4-4l-1.6 1.6-1.5-1.5z" fill="#fff"/></svg>`;
  }
  if (kind === "critical") {
    return `<svg class="status-pill-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 2.6h7.6L21.4 8.2v7.6l-5.6 5.6H8.2L2.6 15.8V8.2L8.2 2.6z" fill="#fff"/><path d="M12 7.1v6" stroke="#b42318" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="16.4" r="1.15" fill="#b42318"/></svg>`;
  }
  return `<svg class="status-pill-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#5b6775"/><path d="M8 12h8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`;
}

function statusPillHTML(summary) {
  const status = statusPresentation(summary);
  return `<span class="status-pill status-pill-${status.kind}"><span class="status-pill-icon-wrap" aria-hidden="true">${statusIconSVG(status.kind)}</span><span class="status-pill-text">${escapeHtml(status.label)}</span></span>`;
}

function conditionLegend() {
  const items = [
    { kind: "unchecked", label: "Не проверено" },
    { kind: "good", label: "Хорошее состояние" },
    { kind: "notes", label: "Требует внимания" },
    { kind: "repair", label: "Нужен ремонт" },
    { kind: "critical", label: "Критичный дефект" },
  ];
  return `<ul class="legend" aria-label="Как читать оценки">${items
    .map((item) => `<li>${statusPillHTML(item)}</li>`)
    .join("")}</ul>`;
}

function summaryFields(summary) {
  return `<p class="dir-score">${escapeHtml(summary.scoreText)}</p>
    ${statusPillHTML(summary)}
    <p class="dir-cov">${escapeHtml(summary.coverageText)} проверено</p>`;
}

function overallHero(carId) {
  const { scores, unpublished } = overviewFor(carId);
  const summary = summarizeOverall(scores, { unpublished });
  return `<div class="score-hero score-hero-mini ${severityClass(summary)}" data-overall-hero>
    <strong>${escapeHtml(summary.scoreText)}</strong>
    <div>
      ${statusPillHTML(summary)}
      <p>Проверено ${escapeHtml(summary.coverageText)}</p>
    </div>
  </div>`;
}

function highlightsHTML(carId) {
  const carState = state.cars[carId];
  const { scores, unpublished } = overviewFor(carId);
  if (unpublished) return "";
  const dirs = visibleDirections();
  const critical = (scores.criticalFaults || []).filter((item) => accessFor(carState, item.directionId) !== "blocked");
  const attention = [];
  const good = [];
  for (const direction of dirs) {
    const summary = summaryForDirection(carId, direction);
    if (summary.hasCritical || summary.kind === "repair" || summary.kind === "notes") {
      attention.push({ name: directionTitle(direction.slug, direction.name), summary });
    } else if (summary.kind === "good") {
      good.push(directionTitle(direction.slug, direction.name));
    }
  }
  return `<section class="highlights">
    <h2>Что важно знать</h2>
    ${
      critical.length
        ? `<div class="alert-crit"><p><strong>Критичные замечания</strong></p><ul>${critical.map((item) => `<li>${escapeHtml(item.name)}: ${escapeHtml(String(item.score))}/10</li>`).join("")}</ul></div>`
        : `<p>В проверенных критичных узлах отдельных предупреждений нет.</p>`
    }
    ${
      attention.length
        ? `<h3>Требует внимания</h3><ul>${attention
            .map((item) => `<li>${escapeHtml(item.name)} — ${escapeHtml(item.summary.label)}${item.summary.hasCritical ? ", есть критичное замечание" : ""}</li>`)
            .join("")}</ul>`
        : ""
    }
    ${good.length ? `<h3>В хорошем состоянии</h3><ul>${good.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>` : ""}
  </section>`;
}

function directionNotesHTML(carId, slug, editable) {
  ensureCarShape(state.cars[carId]);
  const notes = state.cars[carId].directionNotes[slug];
  const seeInternal = canSeeInternalDir(state.cars[carId], slug);
  if (editable) {
    return `<section class="dir-notes">
      <label>Описание направления
        <textarea data-dir-note="publicComment" data-car="${carId}" data-dir="${slug}">${escapeHtml(notes.publicComment)}</textarea>
      </label>
      ${
        seeInternal
          ? `<label>Внутренний комментарий направления (скрыт от покупателя)
        <textarea data-dir-note="internalComment" data-car="${carId}" data-dir="${slug}">${escapeHtml(notes.internalComment)}</textarea>
      </label>`
          : ""
      }
    </section>`;
  }
  return `<section class="dir-notes">
    <h3>Описание направления</h3>
    <p>${notes.publicComment ? escapeHtml(notes.publicComment) : "Описание направления пока не заполнено."}</p>
    ${seeInternal && notes.internalComment ? `<div class="internal">Внутреннее (не для покупателя): ${escapeHtml(notes.internalComment)}</div>` : ""}
  </section>`;
}

function emptyPhotoText(editable) {
  return editable ? "Добавьте фото состояния узла" : "Материалы пока не добавлены";
}

function emptyVideoText(editable) {
  return editable ? "Добавьте видео состояния узла" : "Материалы пока не добавлены";
}

function mediaPaneHTML(carId, slug, kind) {
  const key = folderKey(carId, slug);
  const editable = canEditDir(state.cars[carId], slug);
  const photoUpload = editable
    ? `<label class="btn ghost file-btn">Добавить фото
        <input type="file" hidden multiple accept="image/jpeg,image/png,image/webp" data-media-upload="photo" data-car="${carId}" data-dir="${slug}">
      </label>`
    : "";
  const videoUpload = editable
    ? `<label class="btn ghost file-btn">Добавить видео
        <input type="file" hidden multiple accept="video/mp4,video/webm,video/quicktime" data-media-upload="video" data-car="${carId}" data-dir="${slug}">
      </label>`
    : "";
  return `<section class="media-folders" data-media-folder="${escapeHtml(key)}" data-car="${carId}" data-dir="${slug}">
    <div data-photo-panel ${kind === "photo" ? "" : "hidden"}>
      <div class="photo-gallery" data-photo-gallery><p class="empty-media">${emptyPhotoText(editable)}</p></div>
      ${photoUpload}
    </div>
    <div data-video-panel ${kind === "video" ? "" : "hidden"}>
      <div class="video-gallery" data-video-gallery><p class="empty-media">${emptyVideoText(editable)}</p></div>
      ${videoUpload}
    </div>
    <p class="hint">${MEDIA_LIMITS_TEXT}</p>
    <p class="hint upload-status" data-media-status role="status"></p>
    <dialog class="photo-viewer" data-photo-viewer>
      <img alt="Просмотр фото">
      <form method="dialog"><button class="btn" value="close">Закрыть</button></form>
    </dialog>
  </section>`;
}

function nodeScoreLabel(score) {
  return score == null ? "не проверено" : `${score}/10`;
}

function nodeChipKind(result, checkpoint) {
  return nodeStatus(result, checkpoint).kind;
}

function nodeListHTML(carId, direction) {
  const results = state.cars[carId].results[direction.slug] || {};
  return `<div class="node-list">
    ${direction.checkpoints
      .map((checkpoint) => {
        const result = results[checkpoint.slug] || {};
        const status = nodeStatus(result, checkpoint);
        return `<button type="button" class="node-chip kind-${status.kind}" data-select-node="${checkpoint.slug}">
          <span class="node-chip-copy">
            <span class="node-chip-name">${escapeHtml(checkpoint.name)}${checkpoint.isCritical ? ` <span class="crit">критичный</span>` : ""}</span>
            ${statusPillHTML(status)}
          </span>
          <span class="node-score" data-node-score="${checkpoint.slug}">${nodeScoreLabel(result.score)}</span>
        </button>`;
      })
      .join("")}
  </div>`;
}

function nodeEditorHTML(direction, checkpoint, result, seeInternal) {
  const scoreOptions = [`<option value="" ${result.score == null ? "selected" : ""}>не проверено</option>`]
    .concat(Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<option value="${n}" ${result.score === n ? "selected" : ""}>${n}</option>`))
    .join("");
  const internal = seeInternal
    ? `<label>Внутренний комментарий (скрыт от покупателя)
        <textarea data-act="internal" data-dir="${direction.slug}" data-cp="${checkpoint.slug}">${escapeHtml(result.internalComment || "")}</textarea>
      </label>`
    : "";
  return `<label>Оценка
      <select data-act="score" data-dir="${direction.slug}" data-cp="${checkpoint.slug}">${scoreOptions}</select>
    </label>
    <label>Версия / модификация
      <input data-act="version" data-dir="${direction.slug}" data-cp="${checkpoint.slug}" value="${escapeHtml(result.versionNote || "")}">
    </label>
    <label>Публичный комментарий
      <textarea data-act="public" data-dir="${direction.slug}" data-cp="${checkpoint.slug}">${escapeHtml(result.publicComment || "")}</textarea>
    </label>
    ${internal}`;
}

function nodeReadHTML(checkpoint, result, seeInternal) {
  const internal =
    seeInternal && result.internalComment
      ? `<div class="internal">Внутреннее (не для покупателя): ${escapeHtml(result.internalComment)}</div>`
      : "";
  return `<p><strong>Оценка:</strong> ${nodeScoreLabel(result.score)}</p>
    <p><strong>Версия:</strong> ${escapeHtml(result.versionNote || "—")}</p>
    <p><strong>Комментарий:</strong> ${escapeHtml(result.publicComment || "—")}</p>
    ${internal}`;
}

function nodeDetailHTML(carId, direction, checkpoint, result) {
  const carState = state.cars[carId];
  const editable = canEditDir(carState, direction.slug);
  const seeInternal = canSeeInternalDir(carState, direction.slug);
  return `<div class="node-detail">
    <button type="button" class="text-btn" data-back-nodes>Назад к списку</button>
    <h3>${escapeHtml(checkpoint.name)} ${checkpoint.isCritical ? `<span class="crit">критичный</span>` : ""}</h3>
    ${statusPillHTML(nodeStatus(result, checkpoint))}
    <p class="node-score" data-node-score="${checkpoint.slug}">${nodeScoreLabel(result.score)}</p>
    ${editable ? nodeEditorHTML(direction, checkpoint, result, seeInternal) : nodeReadHTML(checkpoint, result, seeInternal)}
  </div>`;
}

function printAllHTML(carId, dirs) {
  const carState = state.cars[carId];
  return `<div class="print-all">${dirs
    .map((direction) => {
      const title = directionTitle(direction.slug, direction.name);
      const access = accessFor(carState, direction.slug);
      if (access === "blocked") {
        return `<section><h3>${title}</h3><p>Раздел ещё не опубликован.</p></section>`;
      }
      const seeInternal = canSeeInternalDir(carState, direction.slug);
      const items = direction.checkpoints
        .map((checkpoint) => {
          const result = carState.results[direction.slug][checkpoint.slug];
          const internal =
            seeInternal && result.internalComment
              ? ` Внутреннее: ${escapeHtml(result.internalComment)}`
              : "";
          return `<li>${checkpoint.name} — ${nodeScoreLabel(result.score)} — ${escapeHtml(result.versionNote || "—")}. ${escapeHtml(result.publicComment || "—")}${internal}</li>`;
        })
        .join("");
      ensureCarShape(carState);
      const note = carState.directionNotes[direction.slug]?.publicComment;
      return `<section><h3>${title}</h3><p>${note ? escapeHtml(note) : "Описание направления пока не заполнено."}</p><ul>${items}</ul>${printDefectsHTML(carId, direction, access)}</section>`;
    })
    .join("")}</div>`;
}

function schemePhotoHTML(view, label) {
  return `<section class="scheme-panel">
        <h3 class="scheme-view-title">${label}</h3>
        <button type="button" class="scheme-zoom" data-scheme-zoom="${view.src}" data-scheme-alt="${escapeHtml(view.alt)}" aria-label="${escapeHtml(label)}: увеличить" aria-haspopup="dialog" aria-controls="schemeZoomDialog">
          <span class="scheme-frame">
            <img class="scheme-photo" src="${view.src}" width="${view.width}" height="${view.height}" alt="${escapeHtml(view.alt)}">
            <span class="scheme-front-tag">Передняя часть</span>
          </span>
        </button>
      </section>`;
}

function schemeCriticalNoteHTML(carId) {
  const overview = overviewFor(carId);
  if (overview.unpublished) return "";
  const faults = overview.scores?.criticalFaults || [];
  if (!faults.length) return "";
  const items = faults.map((item) => `${escapeHtml(item.name)} — ${item.score}/10`).join("; ");
  return `<p class="scheme-crit-note">Критичное замечание: ${items}.</p>`;
}

function carSchemeHTML(carId) {
  const car = SAMPLE_CARS.find((item) => item.id === carId) || { id: carId };
  const scheme = schemeForCar(car);
  return `<figure class="car-scheme">
    <figcaption>${escapeHtml(scheme.title)}</figcaption>
    <p class="scheme-caption-note">Схема кузова — не карта повреждений</p>
    <div class="scheme-views">
      ${schemePhotoHTML(scheme.top, "Вид сверху")}
      ${schemePhotoHTML(scheme.side, "Вид сбоку")}
    </div>
    ${schemeCriticalNoteHTML(carId)}
    <p class="scheme-source">Источник схемы: <a href="${scheme.source.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(scheme.source.short)}</a></p>
    <dialog id="schemeZoomDialog" class="scheme-zoom-dialog">
      <form method="dialog"><button type="submit" class="btn ghost" id="schemeZoomClose">Закрыть</button></form>
      <img alt="">
    </dialog>
  </figure>`;
}

function directionButtonHTML(direction, summary) {
  const title = directionTitle(direction.slug, direction.name);
  const order = orderedDirections().findIndex((item) => item.slug === direction.slug) + 1;
  return `<button type="button" class="dir-btn ${severityClass(summary)}" data-select-dir="${direction.slug}" aria-haspopup="dialog" aria-controls="categoryDialog" aria-expanded="false">
    <span class="dir-spine" aria-hidden="true">${order}</span>
    ${directionThumb(direction.slug)}
    <span class="dir-btn-copy">
      <h3>${escapeHtml(title)}</h3>
      <span data-summary-body="${direction.slug}">${summaryFields(summary)}</span>
    </span>
    <span class="dir-chevron" aria-hidden="true">›</span>
  </button>`;
}

function directionButtonsHTML(carId, dirs) {
  const items = dirs.map((direction) => directionButtonHTML(direction, summaryForDirection(carId, direction))).join("");
  return `<div class="dir-buttons">${items}</div>`;
}

function masterFilterNote() {
  if (state.role !== "master") return "";
  return `<p class="hint master-note" role="note">${MASTER_FILTER_NOTE}</p>`;
}


function finalVerdictHTML(carId) {
  const carState = state.cars[carId];
  const overview = overviewFor(carId);
  const progress = inspectionProgress(overview.scores, { unpublished: overview.unpublished });
  const conclusion = authorizedConclusion(state.role, carState, overview.source);
  const total = progress.total || 0;
  const checked = progress.checked || 0;
  const pct = total ? Math.round((checked / total) * 100) : 0;
  const faults = overview.unpublished ? [] : overview.scores.criticalFaults || [];
  let critLine = "";
  if (!overview.unpublished && faults.length) {
    critLine = `<p class="verdict-crit"><strong>Критичные дефекты:</strong> ${faults.map((item) => `${escapeHtml(item.name)}: ${item.score}/10`).join("; ")}</p>`;
  } else if (!overview.unpublished && checked > 0) {
    critLine = `<p class="verdict-ok">В проверенных критичных узлах отдельных предупреждений нет.</p>`;
  }
  let hint = "";
  if (progress.key === "preliminary") {
    hint = `<p class="hint">Оценка предварительная: проверены не все пункты. Это не гарантия будущего состояния.</p>`;
  } else if (progress.key === "complete") {
    hint = `<p class="hint">Осмотр завершён. Это не гарантия будущего состояния автомобиля.</p>`;
  }
  const condition =
    progress.key === "unpublished" || progress.key === "none"
      ? ""
      : statusPillHTML(progress);
  return `<section class="final-verdict ${severityClass(progress)}" data-final-verdict id="finalVerdict">
    <h2>Итоговая оценка автомобиля</h2>
    <p class="verdict-stage">${escapeHtml(progress.completionLabel)}</p>
    <p class="verdict-score">${escapeHtml(progress.scoreText)}</p>
    ${condition}
    <div class="verdict-progress">
      <div class="verdict-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${overview.unpublished ? 0 : checked}"><span style="width: ${overview.unpublished ? 0 : pct}%"></span></div>
      <p>Проверено ${overview.unpublished ? "—" : checked} из ${total || "—"}</p>
    </div>
    ${critLine}
    ${conclusion ? `<div class="verdict-conclusion"><h3>Заключение</h3><p>${escapeHtml(conclusion)}</p></div>` : ""}
    ${hint}
  </section>`;
}

function sheetDialogHTML() {
  return `<dialog id="categoryDialog" class="sheet-dialog" aria-labelledby="catDialogTitle">
    <div class="sheet-inner">
      <header class="sheet-head">
        <div class="sheet-head-main">
          <span id="catDialogThumb" class="sheet-thumb"></span>
          <div>
            <h2 id="catDialogTitle"></h2>
            <div id="catDialogSummary"></div>
          </div>
        </div>
        <div class="sheet-head-actions">
          <button type="button" class="btn" data-close-sheet>Готово</button>
          <button type="button" class="sheet-x" data-close-sheet aria-label="Закрыть">×</button>
        </div>
      </header>
      <div class="sheet-tabs" role="tablist" aria-label="Содержание раздела" id="catDialogTabs"></div>
      <div class="sheet-body" id="catDialogBody"></div>
    </div>
  </dialog>`;
}

function resetDefectDraft() {
  defectMode = null;
  defectPending = null;
}

function resetDefectUi() {
  resetDefectDraft();
  selectedDefectId = null;
}

function liveDefectList(carId, slug) {
  const carState = state.cars[carId];
  ensureCarShape(carState);
  if (!Array.isArray(carState.diagramDefects[slug])) carState.diagramDefects[slug] = [];
  return carState.diagramDefects[slug];
}

function writeDefectList(carId, slug, nextList) {
  const list = liveDefectList(carId, slug);
  list.splice(0, list.length, ...nextList);
  persist();
}

function defectMarkHTML(item, selectedId) {
  const meta = colorMeta(item.color);
  const size = sizeMeta(item.size);
  const selected = item.id === selectedId ? " is-selected" : "";
  const label = `Отметка ${item.number}, ${meta.label}: ${item.description}`;
  return `<button type="button" class="defect-mark${selected}" data-defect-pick="${escapeHtml(item.id)}" style="--x:${item.x};--y:${item.y};--s:${size.scale};--c:${meta.hex}" aria-label="${escapeHtml(label)}" aria-pressed="${item.id === selectedId ? "true" : "false"}">
      <span class="defect-blob" aria-hidden="true"></span>
      <span class="defect-num" aria-hidden="true">${item.number}</span>
    </button>`;
}

function defectEditorHTML(direction, defect, mode) {
  const current = defect || { color: "attention", size: "m", description: "", nodeId: "" };
  const colors = Object.values(DEFECT_COLORS)
    .map(
      (item) => `<label class="defect-swatch">
        <input type="radio" name="defect-color" value="${item.id}" ${current.color === item.id ? "checked" : ""}>
        <span class="defect-swatch-chip" style="--c:${item.hex}">${escapeHtml(item.label)}</span>
      </label>`,
    )
    .join("");
  const sizes = Object.values(DEFECT_SIZES)
    .map(
      (item) => `<label class="defect-size">
        <input type="radio" name="defect-size" value="${item.id}" ${current.size === item.id ? "checked" : ""}>
        <span>${escapeHtml(item.label)}</span>
      </label>`,
    )
    .join("");
  const nodes = [`<option value="">Не связывать с пунктом</option>`]
    .concat(
      direction.checkpoints.map(
        (checkpoint) =>
          `<option value="${escapeHtml(checkpoint.slug)}" ${current.nodeId === checkpoint.slug ? "selected" : ""}>${escapeHtml(checkpoint.name)}</option>`,
      ),
    )
    .join("");
  const title = mode === "add" ? "Новая отметка" : `Отметка ${defect.number}`;
  return `<form class="defect-editor" data-defect-editor>
      <h3>${escapeHtml(title)}</h3>
      <fieldset><legend>Важность</legend><div class="defect-swatches">${colors}</div></fieldset>
      <fieldset><legend>Размер пятна</legend><div class="defect-sizes">${sizes}</div></fieldset>
      <label>Описание дефекта
        <textarea name="description" required maxlength="400" rows="3">${escapeHtml(current.description)}</textarea>
      </label>
      <label>Связать с пунктом проверки (необязательно)
        <select name="nodeId">${nodes}</select>
      </label>
      <div class="defect-editor-actions">
        <button type="submit" class="btn">Сохранить</button>
        <button type="button" class="btn ghost" data-defect-cancel>Отменить</button>
        ${
          mode === "edit"
            ? `<button type="button" class="btn ghost" data-defect-move>Переместить</button>
        <button type="button" class="btn ghost" data-defect-delete>Удалить отметку</button>`
            : ""
        }
      </div>
    </form>`;
}

function schemePaneHTML(carId, direction, editable) {
  const car = carMeta(carId) || { id: carId };
  const pack = diagramsForDirection(direction.slug, car);
  const access = accessFor(state.cars[carId], direction.slug);
  const auth = authorizedDefects(access, state.cars[carId], direction.slug);
  const list = auth.list;
  const placing = defectMode === "add" || defectMode === "move";
  const maps = pack.views
    .map((view) => {
      const marks = defectsForView(list, view.id, view.assetId)
        .map((item) => defectMarkHTML(item, selectedDefectId))
        .join("");
      const tag = view.frontTag ? `<span class="scheme-front-tag">${escapeHtml(view.frontTag)}</span>` : "";
      return `<figure class="defect-map${placing ? " is-placing" : ""}">
        <div class="defect-map-head">
          <h3 class="defect-map-title">${escapeHtml(view.title)}</h3>
          <button type="button" class="btn ghost defect-zoom" data-scheme-zoom="${escapeHtml(view.src)}" data-scheme-alt="${escapeHtml(view.alt)}" aria-label="${escapeHtml(view.title)}: увеличить" aria-haspopup="dialog" aria-controls="schemeZoomDialog">Увеличить</button>
        </div>
        <div class="defect-map-stage" data-defect-stage data-diagram-view="${escapeHtml(view.id)}" data-diagram-asset="${escapeHtml(view.assetId)}">
          <img src="${escapeHtml(view.src)}" width="${view.width}" height="${view.height}" alt="${escapeHtml(view.alt)}" draggable="false">
          ${tag}
          <div class="defect-map-layer">${marks}</div>
        </div>
        <figcaption>${escapeHtml(view.caption)}</figcaption>
        <p class="defect-source">Источник схемы: <a href="${escapeHtml(view.source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(view.source.title)}</a> · ${escapeHtml(view.source.author)} · ${escapeHtml(view.source.license)}</p>
      </figure>`;
    })
    .join("");
  let toolbar = "";
  if (editable) {
    toolbar = `<div class="defect-toolbar">
      ${defectMode === "add" ? "" : `<button type="button" class="btn" data-defect-add>Добавить дефект</button>`}
      ${
        defectMode === "add" && !defectPending
          ? `<p class="defect-hint" role="status">Нажмите на схему, куда поставить отметку.</p>
      <button type="button" class="btn ghost" data-defect-center>Поставить в центре</button>
      <button type="button" class="btn ghost" data-defect-cancel>Отменить</button>`
          : ""
      }
      ${
        defectMode === "move"
          ? `<p class="defect-hint" role="status">Нажмите новое место на схеме.</p>
      <button type="button" class="btn ghost" data-defect-cancel>Отменить</button>`
          : ""
      }
    </div>`;
  } else {
    toolbar = `<p class="hint">Отметки из опубликованного отчёта. Добавлять и менять их может назначенный специалист.</p>`;
  }
  let editor = "";
  if (editable && defectMode === "add" && defectPending) {
    editor = defectEditorHTML(direction, { color: "attention", size: "m", description: "", nodeId: "" }, "add");
  } else if (editable && selectedDefectId && defectMode !== "add") {
    const selected = list.find((item) => item.id === selectedDefectId);
    if (selected) editor = defectEditorHTML(direction, selected, "edit");
  }
  const cards = list.length
    ? list
        .map((item) => {
          const meta = colorMeta(item.color);
          const selected = item.id === selectedDefectId ? " is-selected" : "";
          const node = item.nodeId ? direction.checkpoints.find((checkpoint) => checkpoint.slug === item.nodeId) : null;
          return `<button type="button" class="defect-card${selected}" data-defect-card="${escapeHtml(item.id)}" style="--c:${meta.hex}">
          <span class="defect-card-num" aria-hidden="true">${item.number}</span>
          <span class="defect-card-body">
            <span class="defect-card-sev">${escapeHtml(meta.label)}</span>
            <span class="defect-card-desc">${escapeHtml(item.description)}</span>
            ${node ? `<span class="defect-card-node">${escapeHtml(node.name)}</span>` : ""}
          </span>
        </button>`;
        })
        .join("")
    : `<p class="defect-empty">Отметок пока нет</p>`;
  return `<section class="defect-scheme" data-defect-scheme>
      <p class="defect-disclaimer">${escapeHtml(pack.disclaimer)}</p>
      ${maps}
      ${toolbar}
      ${editor}
      <h3 class="defect-list-title">Отметки на схеме</h3>
      <div class="defect-list">${cards}</div>
    </section>`;
}

function readDefectForm(root) {
  const form = root.querySelector("[data-defect-editor]");
  if (!form) return null;
  return {
    color: form.querySelector("input[name='defect-color']:checked")?.value,
    size: form.querySelector("input[name='defect-size']:checked")?.value,
    description: form.querySelector("textarea[name='description']")?.value,
    nodeId: form.querySelector("select[name='nodeId']")?.value,
  };
}

function bindDefectScheme(root, carId, direction) {
  const slug = direction.slug;
  const refresh = () => fillSheetBody(carId, direction);

  root.querySelector("[data-defect-add]")?.addEventListener("click", () => {
    defectMode = "add";
    defectPending = null;
    selectedDefectId = null;
    refresh();
  });
  root.querySelectorAll("[data-defect-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      resetDefectDraft();
      refresh();
    });
  });
  root.querySelector("[data-defect-center]")?.addEventListener("click", () => {
    const first = diagramsForDirection(slug, carMeta(carId) || {}).views[0];
    if (!first) return;
    defectPending = { viewId: first.id, assetId: first.assetId, x: 0.5, y: 0.5 };
    refresh();
  });
  root.querySelector("[data-defect-editor]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = readDefectForm(root);
    if (!fields) return;
    if (defectMode === "add" && defectPending) {
      const result = addDefect(liveDefectList(carId, slug), { ...fields, ...defectPending });
      if (!result.ok) return;
      writeDefectList(carId, slug, result.list);
      selectedDefectId = result.defect.id;
      resetDefectDraft();
      refresh();
      return;
    }
    if (selectedDefectId) {
      const result = updateDefect(liveDefectList(carId, slug), selectedDefectId, fields);
      if (!result.ok) return;
      writeDefectList(carId, slug, result.list);
      resetDefectDraft();
      refresh();
    }
  });
  root.querySelector("[data-defect-move]")?.addEventListener("click", () => {
    defectMode = "move";
    refresh();
  });
  root.querySelector("[data-defect-delete]")?.addEventListener("click", () => {
    if (!selectedDefectId) return;
    writeDefectList(carId, slug, removeDefect(liveDefectList(carId, slug), selectedDefectId));
    selectedDefectId = null;
    resetDefectDraft();
    refresh();
  });

  const selectDefect = (id) => {
    selectedDefectId = id;
    if (defectMode === "add") resetDefectDraft();
    refresh();
    window.requestAnimationFrame(() => {
      document.getElementById("catDialogBody")?.querySelector(`[data-defect-card="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  };
  root.querySelectorAll("[data-defect-card]").forEach((button) => {
    button.addEventListener("click", () => selectDefect(button.getAttribute("data-defect-card")));
  });
  root.querySelectorAll("[data-defect-pick]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectDefect(button.getAttribute("data-defect-pick"));
    });
  });

  root.querySelectorAll("[data-defect-stage]").forEach((stage) => {
    const img = stage.querySelector("img");
    let down = null;
    stage.addEventListener("pointerdown", (event) => {
      if (event.button != null && event.button !== 0) return;
      down = { x: event.clientX, y: event.clientY, id: event.pointerId };
    });
    stage.addEventListener("pointerup", (event) => {
      if (event.target.closest("[data-defect-pick]")) {
        down = null;
        return;
      }
      if (!down || event.pointerId !== down.id) return;
      const moved = !isTap(event.clientX - down.x, event.clientY - down.y);
      down = null;
      if (moved) return;
      if (defectMode !== "add" && defectMode !== "move") return;
      const point = pointFromClientRect(img.getBoundingClientRect(), event.clientX, event.clientY);
      if (!point) return;
      const viewId = stage.getAttribute("data-diagram-view");
      const assetId = stage.getAttribute("data-diagram-asset");
      if (defectMode === "add") {
        defectPending = { ...point, viewId, assetId };
        refresh();
        return;
      }
      if (defectMode === "move" && selectedDefectId) {
        const result = updateDefect(liveDefectList(carId, slug), selectedDefectId, point);
        if (result.ok) writeDefectList(carId, slug, result.list);
        resetDefectDraft();
        refresh();
      }
    });
  });

  root.querySelectorAll("[data-scheme-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById("schemeZoomDialog");
      const zoomImg = dialog?.querySelector("img");
      if (!dialog || !zoomImg) return;
      zoomImg.src = button.getAttribute("data-scheme-zoom");
      zoomImg.alt = button.getAttribute("data-scheme-alt") || "Схема";
      if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    });
  });
}

function printDefectsHTML(carId, direction, access) {
  if (access === "blocked") return "";
  const auth = authorizedDefects(access, state.cars[carId], direction.slug);
  const list = auth.list;
  if (!list.length) return `<p>Отметок пока нет</p>`;
  const pack = diagramsForDirection(direction.slug, carMeta(carId) || {});
  const maps = pack.views
    .map((view) => {
      const marks = defectsForView(list, view.id, view.assetId);
      if (!marks.length) return "";
      return `<figure class="print-defect-map">
        <figcaption>${escapeHtml(view.title)}</figcaption>
        <div class="defect-map-stage">
          <img src="${escapeHtml(view.src)}" width="${view.width}" height="${view.height}" alt="${escapeHtml(view.alt)}">
          <div class="defect-map-layer">${marks.map((item) => defectMarkHTML(item, null)).join("")}</div>
        </div>
      </figure>`;
    })
    .join("");
  const items = list
    .map((item) => {
      const meta = colorMeta(item.color);
      return `<li class="print-defect-item" style="--c:${meta.hex}"><span class="defect-card-num">${item.number}</span> ${escapeHtml(meta.label)}: ${escapeHtml(item.description)}</li>`;
    })
    .join("");
  return `${maps}<ol class="print-defect-list">${items}</ol>`;
}

function sheetTabsHTML(direction, pane) {
  const count = direction.checkpoints.length;
  return `<button type="button" role="tab" data-sheet-tab="scheme" aria-selected="${pane === "scheme" ? "true" : "false"}">Схема и дефекты</button>
    <button type="button" role="tab" data-sheet-tab="checks" aria-selected="${pane === "checks" ? "true" : "false"}">Проверки (${count})</button>
    <button type="button" role="tab" data-sheet-tab="photo" aria-selected="${pane === "photo" ? "true" : "false"}">Фото (<span data-photo-count>0</span>)</button>
    <button type="button" role="tab" data-sheet-tab="video" aria-selected="${pane === "video" ? "true" : "false"}">Видео (<span data-video-count>0</span>)</button>
    <button type="button" role="tab" data-sheet-tab="notes" aria-selected="${pane === "notes" ? "true" : "false"}">Описание</button>`;
}

function carCard(car) {
  const carState = state.cars[car.id];
  return `<article class="card comic-card">
    ${carPhoto(car, "car-visual")}
    <div class="card-body">
      <p class="tag">Папка автомобиля · ${car.label}</p>
      <h2>${car.make} ${car.model}</h2>
      <p class="meta">${car.year} · ${car.mileage.toLocaleString("ru-RU")} км · ${car.color}</p>
      <p class="status">${STATUS_LABEL[carState.status]}</p>
      ${overallHero(car.id)}
      <p>${car.summary}</p>
      <div class="row">
        <a class="btn" href="#/c/${car.id}">Открыть оценочный лист</a>
      </div>
      ${renderWhatsApp(car)}
    </div>
  </article>`;
}

function renderHome() {
  const cover = SAMPLE_CARS[0];
  const { sections, points } = inspectionScope();
  const benefitItems = HOME_BENEFITS.map((item, index) => `<li class="benefit-card">
        <span class="benefit-num" aria-hidden="true">${index + 1}</span>
        <p>${escapeHtml(item)}</p>
      </li>`).join("");
  return `${header()}
    <main class="wrap">
      <section class="welcome-hero" aria-labelledby="welcomeTitle">
        <div class="comic-cover">
          ${carPhoto(cover, "comic-cover-art")}
          <p class="comic-sticker comic-sticker-gold">${sections} разделов проверки</p>
          <p class="comic-sticker comic-sticker-cyan">${points} пункт</p>
        </div>
        <div class="welcome-copy">
          <p class="chapter-kicker">${escapeHtml(BRAND_FULL)}</p>
          <h1 id="welcomeTitle">${BRAND_HOOK}</h1>
          <p class="home-hook">${escapeHtml(HOME_HOOK)}</p>
          <p class="lead motto">${BRAND_TAGLINE}</p>
          <p class="support">${BRAND_SUPPORT}</p>
          <a class="btn comic-cta" href="#catalog">Выбрать автомобиль</a>
        </div>
      </section>
      <ul class="benefit-cards" aria-label="Зачем проверять автомобиль перед покупкой">${benefitItems}</ul>
      <section class="catalog-chapter" id="catalog" aria-labelledby="catalogTitle">
        <h2 id="catalogTitle">Автомобили в демо</h2>
        <div class="grid catalog">${SAMPLE_CARS.map(carCard).join("")}</div>
      </section>
    </main>`;
}

function unpublishedBlock(car) {
  return `<section class="unavailable">
    <h2>Оценочный лист ещё не опубликован</h2>
    <p>Когда осмотр «${escapeHtml(car.make)} ${escapeHtml(car.model)}» будет опубликован, здесь появятся оценки, замечания, фото и видео.</p>
    <p class="hint">Разделы уже можно открыть. Подробности появятся после публикации.</p>
  </section>`;
}

function renderCar(id, route = parseRoute()) {
  const car = carMeta(id);
  const carState = state.cars[id];
  if (!car || !carState) return `${header()}<main class="wrap"><h1>Образец не найден</h1></main>`;
  const overview = overviewFor(id);
  const unpublished = overview.unpublished;
  const dirs = visibleDirections();
  return `${header()}
    <main class="wrap report">
      <nav class="crumb" aria-label="Навигация">
        <a class="back" href="#/">Все автомобили</a>
        <span aria-hidden="true">/</span>
        <span>${car.make} ${car.model}, ${car.year}</span>
      </nav>
      <p class="tag">Оценочный лист · ${car.label}</p>
      <h1>${car.make} ${car.model}, ${car.year}</h1>
      <p class="lead motto">${BRAND_TAGLINE}</p>
      <section class="comic-chapter" aria-labelledby="chapter-auto">
        ${chapterHead("chapter-auto", "Автомобиль", 1)}
        <div class="sheet-top">
          ${carPhoto(car, "hero-visual photo-auto", "Фото авто · учебная иллюстрация, не фото реального осмотра")}
          <div class="sheet-facts">
            <dl class="facts">
              <div><dt>Пробег</dt><dd>${car.mileage.toLocaleString("ru-RU")} км</dd></div>
              <div><dt>Цвет</dt><dd>${car.color}</dd></div>
              <div><dt>Госномер</dt><dd>${car.plate}</dd></div>
              <div><dt>VIN</dt><dd>${car.vin}</dd></div>
              <div><dt>Статус осмотра</dt><dd>${STATUS_LABEL[carState.status]}</dd></div>
            </dl>
            ${overallHero(id)}
          </div>
        </div>
      </section>
      <section class="comic-chapter" aria-labelledby="chapter-scheme">
        ${chapterHead("chapter-scheme", "Схема", 2)}
        ${carSchemeHTML(id)}
      </section>
      ${unpublished ? unpublishedBlock(car) : ""}
      ${unpublished ? "" : `<p class="formula">${FORMULA_DISCLAIMER}</p>`}
      ${highlightsHTML(id)}
      <section class="comic-chapter" aria-labelledby="chapter-checks">
        ${chapterHead("chapter-checks", "Проверки", 3)}
        ${conditionLegend()}
        <h2>Выберите раздел</h2>
        <p class="lead">Выберите раздел, чтобы посмотреть оценки, замечания и фото.</p>
        ${masterFilterNote()}
        ${directionButtonsHTML(id, dirs)}
      </section>
      <section class="comic-chapter" aria-labelledby="chapter-verdict">
        ${chapterHead("chapter-verdict", "Итог", 4)}
        ${finalVerdictHTML(id)}
      </section>
      <p class="no-print"><button type="button" class="btn ghost" id="printReport">Печать листа</button></p>
      ${printAllHTML(id, dirs)}
      ${renderWhatsApp(car)}
      ${sheetDialogHTML()}
    </main>`;
}

function renderAdmin() {
  const blocks = SAMPLE_CARS.map((car) => {
    const carState = state.cars[car.id];
    const rows = orderedDirections(DIRECTIONS).map((direction) => {
      const assignment = carState.assignments[direction.slug];
      const options = [`<option value="">не назначен</option>`]
        .concat(DEMO_MASTERS.map((master) => `<option value="${master.id}" ${assignment.masterId === master.id ? "selected" : ""}>${master.name}</option>`))
        .join("");
      return `<tr>
        <td>${directionTitle(direction.slug, direction.name)}</td>
        <td><select data-assign="${car.id}" data-dir="${direction.slug}">${options}</select></td>
        <td>${assignment.status}</td>
        <td>
          <button type="button" class="text-btn" data-review="${car.id}" data-dir="${direction.slug}">Отметить проверенным</button>
        </td>
      </tr>`;
    }).join("");
    return `<section class="card">
      <div class="card-body">
        <h2>${car.label}: ${car.make} ${car.model}</h2>
        <p>Статус: ${STATUS_LABEL[carState.status]}</p>
        <label>Заключение
          <textarea data-conclusion="${car.id}">${escapeHtml(carState.conclusion || "")}</textarea>
        </label>
        <table class="admin-table"><thead><tr><th>Направление</th><th>Мастер</th><th>Статус</th><th></th></tr></thead><tbody>${rows}</tbody></table>
        <a class="btn ghost" href="#/c/${car.id}">Открыть оценочный лист</a>
        <button type="button" class="btn" data-publish="${car.id}">Опубликовать учебный отчёт</button>
        <p class="hint">Публикация меняет только состояние в этом браузере.</p>
        <p class="action-note hint" role="status"></p>
      </div>
    </section>`;
  }).join("");
  return `${header()}<main class="wrap"><h1>Назначения и публикация</h1><p class="lead">Учебная панель. Это не настоящая система прав.</p>${blocks}</main>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render() {
  revokeAllObjectUrls();
  sheetDir = null;
  sheetNode = null;
  sheetPane = "checks";
  resetDefectUi();
  const route = parseRoute();
  if (isCarRoute(route) && location.hash !== canonicalHash(route)) {
    history.replaceState(null, "", canonicalHash(route));
  }
  let html = renderHome();
  if (isCarRoute(route)) html = renderCar(route.id, route);
  if (route.name === "admin") html = renderAdmin();
  document.getElementById("app").innerHTML = html;
  document.title = pageTitle(route);
  bind();
  if (isCarRoute(route) && route.id && route.dir) {
    const carState = state.cars[route.id];
    const allowed = carState ? visibleDirections().some((item) => item.slug === route.dir) : false;
    if (allowed) openCategoryDialog(route.dir, { updateHash: false });
  }
}

function pageTitle(route) {
  if (isCarRoute(route) && route.id) {
    const car = carMeta(route.id);
    if (car) return `${BRAND_NAME} — ${car.make} ${car.model}, ${car.year}`;
  }
  return BRAND_FULL;
}

function applySeverityClass(el, summary) {
  const selected = el.classList.contains("is-selected");
  const bases = [...el.classList].filter((name) => !name.startsWith("kind-") && name !== "has-critical" && name !== "is-selected");
  el.className = `${bases.join(" ")} ${severityClass(summary)}${selected ? " is-selected" : ""}`.trim();
}

function patchLiveSummaries(carId) {
  const carState = state.cars[carId];
  if (!carState) return;
  const dirs = visibleDirections();
  for (const direction of dirs) {
    const summary = summaryForDirection(carId, direction);
    document.querySelectorAll(`[data-summary-body="${direction.slug}"]`).forEach((holder) => {
      holder.innerHTML = summaryFields(summary);
    });
    document.querySelectorAll(`[data-select-dir="${direction.slug}"]`).forEach((el) => applySeverityClass(el, summary));
    if (sheetDir === direction.slug) {
      const dialogSummary = document.getElementById("catDialogSummary");
      if (dialogSummary) dialogSummary.innerHTML = summaryFields(summary);
    }
  }
  const hero = document.querySelector("[data-overall-hero]");
  if (hero) {
    const wrap = document.createElement("div");
    wrap.innerHTML = overallHero(carId);
    hero.replaceWith(wrap.firstElementChild);
  }
  const verdict = document.querySelector("[data-final-verdict]");
  if (verdict) {
    const wrap = document.createElement("div");
    wrap.innerHTML = finalVerdictHTML(carId);
    verdict.replaceWith(wrap.firstElementChild);
  }
}

function syncDirButtons(slug) {
  document.querySelectorAll("[data-select-dir]").forEach((el) => {
    const on = Boolean(slug) && el.getAttribute("data-select-dir") === slug;
    el.classList.toggle("is-selected", on);
    el.setAttribute("aria-expanded", on ? "true" : "false");
  });
}

function fillSheetBody(carId, direction) {
  const body = document.getElementById("catDialogBody");
  if (!body) return;
  const carState = state.cars[carId];
  const access = accessFor(carState, direction.slug);
  const editable = access === "edit";
  if (access === "blocked") {
    body.innerHTML = `<p class="sheet-blocked">${escapeHtml(unpublishedSectionMessage(state.role, state.masterId, carState, direction.slug))}</p>`;
    return;
  }
  if (sheetPane === "scheme") {
    body.innerHTML = schemePaneHTML(carId, direction, editable);
    bindDefectScheme(body, carId, direction);
    return;
  }
  if (sheetPane === "notes") {
    body.innerHTML = `${directionNotesHTML(carId, direction.slug, editable)}
      ${state.role === "master" && editable ? `<button type="button" class="btn" data-submit="${direction.slug}">Отправить направление на проверку</button>` : ""}`;
    bindFieldRoot(body);
    return;
  }
  if (sheetPane === "photo" || sheetPane === "video") {
    body.innerHTML = mediaPaneHTML(carId, direction.slug, sheetPane);
    bindMediaSection(body);
    hydrateMedia(carId, direction.slug, body);
    return;
  }
  if (sheetNode) {
    const checkpoint = direction.checkpoints.find((item) => item.slug === sheetNode);
    const result = carState.results[direction.slug][sheetNode];
    if (!checkpoint || !result) {
      sheetNode = null;
    } else {
      body.innerHTML = nodeDetailHTML(carId, direction, checkpoint, result);
      bindFieldRoot(body);
      body.querySelector("[data-back-nodes]")?.addEventListener("click", () => {
        sheetNode = null;
        fillSheetBody(carId, direction);
      });
      return;
    }
  }
  body.innerHTML = `<p class="hint">Выберите пункт проверки — ${direction.checkpoints.length} узлов.</p>
    ${nodeListHTML(carId, direction)}
    ${state.role === "master" && editable ? `<p><button type="button" class="btn" data-submit="${direction.slug}">Отправить направление на проверку</button></p>` : ""}`;
  body.querySelectorAll("[data-select-node]").forEach((button) => {
    button.addEventListener("click", () => {
      sheetNode = button.getAttribute("data-select-node");
      fillSheetBody(carId, direction);
    });
  });
  bindFieldRoot(body);
}

function fillSheet(carId, slug) {
  const direction = DIRECTIONS.find((item) => item.slug === slug);
  if (!direction) return;
  const carState = state.cars[carId];
  const summary = summaryForDirection(carId, direction);
  const title = document.getElementById("catDialogTitle");
  const summaryBox = document.getElementById("catDialogSummary");
  const thumb = document.getElementById("catDialogThumb");
  const tabs = document.getElementById("catDialogTabs");
  if (title) title.textContent = directionTitle(slug, direction.name);
  if (summaryBox) summaryBox.innerHTML = summaryFields(summary);
  if (thumb) thumb.innerHTML = directionThumb(slug);
  if (accessFor(carState, slug) === "blocked") {
    if (tabs) tabs.innerHTML = "";
    fillSheetBody(carId, direction);
    return;
  }
  if (tabs) tabs.innerHTML = sheetTabsHTML(direction, sheetPane);
  fillSheetBody(carId, direction);
  tabs?.querySelectorAll("[data-sheet-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      sheetPane = tab.getAttribute("data-sheet-tab");
      sheetNode = null;
      resetDefectDraft();
      fillSheet(carId, slug);
    });
  });
}

function openCategoryDialog(slug, { updateHash = true, trigger = null } = {}) {
  const route = parseRoute();
  const carId = route.id;
  if (!carId || !slug) return;
  const carState = state.cars[carId];
  if (!carState) return;
  if (!visibleDirections().some((item) => item.slug === slug)) return;
  if (sheetDir && sheetDir !== slug) revokeFolderObjectUrls(carId, sheetDir);
  sheetDir = slug;
  sheetNode = null;
  sheetPane = "scheme";
  resetDefectUi();
  lastDirTrigger = trigger || document.querySelector(`.dir-btn[data-select-dir="${slug}"]`);
  const dialog = document.getElementById("categoryDialog");
  if (!dialog) return;
  fillSheet(carId, slug);
  if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
  syncDirButtons(slug);
  if (updateHash && isCarRoute(route)) {
    const nextHash = canonicalHash({ name: "car", id: carId, dir: slug });
    if (location.hash !== nextHash) history.replaceState(null, "", nextHash);
  }
}

function onSheetClose() {
  const route = parseRoute();
  const carId = route.id;
  if (carId && sheetDir) revokeFolderObjectUrls(carId, sheetDir);
  sheetDir = null;
  sheetNode = null;
  sheetPane = "checks";
  syncDirButtons(null);
  if (carId && isCarRoute(route)) {
    const nextHash = canonicalHash({ name: "car", id: carId, dir: null });
    if (location.hash !== nextHash) history.replaceState(null, "", nextHash);
  }
  if (lastDirTrigger && document.contains(lastDirTrigger)) lastDirTrigger.focus();
}

function bindSheetDialog() {
  const dialog = document.getElementById("categoryDialog");
  if (!dialog) return;
  dialog.addEventListener("close", onSheetClose);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelectorAll("[data-close-sheet]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
  document.querySelectorAll("[data-select-dir]").forEach((button) => {
    const open = () => {
      const slug = button.getAttribute("data-select-dir");
      const trigger = button.closest(".dir-btn, .scheme-hot") || document.querySelector(`.dir-btn[data-select-dir="${slug}"]`) || button;
      openCategoryDialog(slug, { trigger });
    };
    button.addEventListener("click", open);
    if (button.tagName !== "BUTTON") {
      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    }
  });
}

async function hydrateMedia(carId, slug, root = document) {
  const folder = root.matches?.("[data-media-folder]") ? root : root.querySelector("[data-media-folder]");
  if (!folder) return;
  const editable = canEditDir(state.cars[carId], slug);
  const status = folder.querySelector("[data-media-status]");
  try {
    const items = await listFolderMedia(carId, slug);
    const photos = items.filter((item) => item.kind === "photo");
    const videos = items.filter((item) => item.kind === "video");
    const countRoot = folder.closest("dialog") || folder;
    countRoot.querySelectorAll("[data-photo-count]").forEach((el) => {
      el.textContent = String(photos.length);
    });
    countRoot.querySelectorAll("[data-video-count]").forEach((el) => {
      el.textContent = String(videos.length);
    });
    const photoBox = folder.querySelector("[data-photo-gallery]");
    if (photoBox) {
      photoBox.innerHTML = photos.length
        ? photos
            .map((item) => {
              const url = objectUrlFor(item);
              return `<figure class="media-card thumb">
          <button type="button" class="media-thumb thumb-btn" data-view-photo="${item.id}">
            <img src="${url}" alt="${escapeHtml(item.name)}">
          </button>
          <figcaption>${escapeHtml(item.name)}</figcaption>
          ${editable ? `<button type="button" class="text-btn" data-del-media="${item.id}">Удалить</button>` : ""}
        </figure>`;
            })
            .join("")
        : `<p class="empty-media">${emptyPhotoText(editable)}</p>`;
    }
    const videoBox = folder.querySelector("[data-video-gallery]");
    if (videoBox) {
      videoBox.innerHTML = videos.length
        ? videos
            .map((item) => {
              const url = objectUrlFor(item);
              return `<figure class="video-item">
          <video controls preload="metadata" src="${url}"></video>
          <figcaption>${escapeHtml(item.name)}</figcaption>
          ${editable ? `<button type="button" class="text-btn" data-del-media="${item.id}">Удалить</button>` : ""}
        </figure>`;
            })
            .join("")
        : `<p class="empty-media">${emptyVideoText(editable)}</p>`;
    }
    const tab = folder.querySelector('[data-media-tab][aria-selected="true"]');
    if (tab) {
      const name = tab.getAttribute("data-media-tab");
      const photoPanel = folder.querySelector("[data-photo-panel]");
      const videoPanel = folder.querySelector("[data-video-panel]");
      if (photoPanel) photoPanel.hidden = name !== "photo";
      if (videoPanel) videoPanel.hidden = name !== "video";
    }
    if (status) {
      status.textContent = "";
      status.removeAttribute("aria-busy");
    }
  } catch {
    if (status) status.textContent = "Не удалось прочитать файлы из хранилища этого браузера.";
  }
}

function bindMediaSection(root = document) {
  const folders = [...root.querySelectorAll("[data-media-folder]")];
  if (root.matches && root.matches("[data-media-folder]")) folders.unshift(root);
  for (const folder of folders) {
    if (folder.dataset.mediaBound === "1") continue;
    folder.dataset.mediaBound = "1";
    folder.addEventListener("change", async (event) => {
      const input = event.target.closest("[data-media-upload]");
      if (!input) return;
      const carId = input.getAttribute("data-car");
      const slug = input.getAttribute("data-dir");
      if (!canEditDir(state.cars[carId], slug)) return;
      const kind = input.getAttribute("data-media-upload");
      const files = [...(input.files || [])];
      input.value = "";
      const status = folder.querySelector("[data-media-status]");
      if (status) {
        status.textContent = "Сохраняем файл в этом браузере…";
        status.setAttribute("aria-busy", "true");
      }
      for (const file of files) {
        const result = await addFolderMedia(carId, slug, file, kind);
        if (!result.ok) {
          if (status) status.textContent = result.error;
          break;
        }
        if (status) status.textContent = `«${file.name}» сохранён в папке этого автомобиля в этом браузере.`;
      }
      await hydrateMedia(carId, slug, folder);
    });
    folder.addEventListener("click", async (event) => {
      const del = event.target.closest("[data-del-media]");
      if (del) {
        const carId = folder.getAttribute("data-car");
        const slug = folder.getAttribute("data-dir");
        if (!canEditDir(state.cars[carId], slug)) return;
        const result = await deleteFolderMedia(del.getAttribute("data-del-media"), carId, slug);
        const status = folder.querySelector("[data-media-status]");
        if (!result.ok && status) status.textContent = result.error;
        await hydrateMedia(carId, slug, folder);
        return;
      }
      const view = event.target.closest("[data-view-photo]");
      if (!view) return;
      const viewer = folder.querySelector("[data-photo-viewer]");
      const viewerImg = viewer?.querySelector("img");
      const img = view.querySelector("img");
      if (!viewer || !viewerImg || !img) return;
      lastViewerTrigger = view;
      viewerImg.src = img.src;
      viewerImg.alt = img.alt || "Просмотр фото";
      viewer.addEventListener(
        "close",
        () => {
          if (lastViewerTrigger) lastViewerTrigger.focus();
        },
        { once: true },
      );
      if (typeof viewer.showModal === "function") viewer.showModal();
    });
  }
}

function bindFieldRoot(root) {
  root.querySelectorAll("[data-act]").forEach((el) => {
    const apply = () => {
      const dir = el.getAttribute("data-dir");
      const cp = el.getAttribute("data-cp");
      const act = el.getAttribute("data-act");
      const carId = parseRoute().id;
      if (!canEditDir(state.cars[carId], dir)) return;
      const result = state.cars[carId].results[dir][cp];
      if (act === "score") result.score = el.value === "" ? null : Number(el.value);
      if (act === "version") result.versionNote = el.value;
      if (act === "public") result.publicComment = el.value;
      if (act === "internal") result.internalComment = el.value;
      const carState = state.cars[carId];
      if (carState.status === "created" || carState.status === "published") {
        if (carState.status !== "published") carState.status = "in_progress";
      }
      if (act === "score") {
        document.querySelectorAll(`[data-node-score="${cp}"]`).forEach((head) => {
          head.textContent = nodeScoreLabel(result.score);
        });
      }
      scheduleSave();
      patchLiveSummaries(carId);
    };
    el.addEventListener("change", apply);
    el.addEventListener("input", apply);
  });
  root.querySelectorAll("[data-dir-note]").forEach((el) => {
    el.addEventListener("input", () => {
      const carId = el.getAttribute("data-car");
      const dir = el.getAttribute("data-dir");
      const field = el.getAttribute("data-dir-note");
      if (!canEditDir(state.cars[carId], dir)) return;
      ensureCarShape(state.cars[carId]);
      state.cars[carId].directionNotes[dir][field] = el.value;
      scheduleSave();
    });
  });
  root.querySelectorAll("[data-submit]").forEach((button) => {
    button.addEventListener("click", () => {
      const dir = button.getAttribute("data-submit");
      const carState = state.cars[parseRoute().id];
      if (!canEditDir(carState, dir)) return;
      carState.assignments[dir].status = "submitted";
      carState.status = "in_review";
      persist();
      render();
    });
  });
}


let deferredInstallPrompt = null;

function isStandaloneDisplay() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function showActionStatus(message) {
  const el = document.getElementById("actionStatus");
  if (!el) return;
  el.hidden = !message;
  el.textContent = message || "";
}

function sharePayload() {
  const route = parseRoute();
  if (isCarRoute(route) && route.id && carMeta(route.id)) {
    const car = carMeta(route.id);
    return {
      title: `${car.make} ${car.model}, ${car.year} — ${BRAND_NAME}`,
      text: `Оценочный лист: ${car.make} ${car.model}, ${car.year}`,
      url: buildPublicCarUrl(siteBase(), route.id),
    };
  }
  return {
    title: BRAND_FULL,
    text: BRAND_TAGLINE,
    url: siteBase(),
  };
}

async function copyShareUrl(url) {
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    throw new Error("clipboard unavailable");
  }
  await navigator.clipboard.writeText(url);
  showActionStatus("Ссылка скопирована");
}

async function sharePage() {
  const payload = sharePayload();
  showActionStatus("");
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(payload);
      return;
    } catch (error) {
      if (error && error.name === "AbortError") return;
    }
  }
  try {
    await copyShareUrl(payload.url);
  } catch {
    const help = document.getElementById("copyHelp");
    const box = document.getElementById("copyFallback");
    if (box) box.value = payload.url;
    if (help && typeof help.showModal === "function") help.showModal();
  }
}

function refreshInstallButton() {
  const button = document.getElementById("installApp");
  if (!button) return;
  if (isStandaloneDisplay()) {
    button.textContent = "Открыто с домашнего экрана";
    button.disabled = true;
    return;
  }
  button.disabled = false;
  button.textContent = "Установить на телефон";
}

async function installApp() {
  showActionStatus("");
  if (isStandaloneDisplay()) {
    showActionStatus("Сайт уже открыт как ярлык на устройстве.");
    return;
  }
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (choice && choice.outcome === "accepted") {
      showActionStatus("Ярлык добавляется на устройство. Это не установка из магазина приложений.");
      refreshInstallButton();
    }
    return;
  }
  if (isIosDevice()) {
    document.getElementById("iosInstallHelp")?.showModal();
    return;
  }
  showActionStatus("В этом браузере установка ярлыка сейчас недоступна. На поддерживаемом телефоне появится запрос системы, либо добавьте страницу в закладки. Это не приложение из магазина, аккаунт не создаётся, данные остаются только в этом браузере.");
}

function registerShellWorker() {
  if (!ASSET_VERSION || !("serviceWorker" in navigator)) return;
  const workerUrl = new URL("sw.js", siteBase()).href;
  navigator.serviceWorker.register(workerUrl, { scope: new URL("./", siteBase()).pathname }).catch(() => {});
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    refreshInstallButton();
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    refreshInstallButton();
  });
}

function bindSchemeZoom() {
  const dialog = document.getElementById("schemeZoomDialog");
  const img = dialog?.querySelector("img");
  if (!dialog || !img) return;
  document.querySelectorAll("[data-scheme-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      img.src = button.getAttribute("data-scheme-zoom");
      img.alt = button.getAttribute("data-scheme-alt") || "Схема автомобиля";
      if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    });
  });
}

function bind() {
  bindSheetDialog();
  bindSchemeZoom();
  bindFieldRoot(document);
  bindMediaSection(document);
  document.getElementById("sharePage")?.addEventListener("click", () => {
    sharePage();
  });
  document.getElementById("installApp")?.addEventListener("click", () => {
    installApp();
  });
  document.getElementById("iosInstallClose")?.addEventListener("click", () => {
    document.getElementById("iosInstallHelp")?.close();
  });
  document.getElementById("copyHelpClose")?.addEventListener("click", () => {
    document.getElementById("copyHelp")?.close();
  });
  refreshInstallButton();
  document.getElementById("modeToggle")?.addEventListener("click", () => {
    document.getElementById("modeDialog")?.showModal();
  });
  document.getElementById("modeClose")?.addEventListener("click", () => {
    document.getElementById("modeDialog")?.close();
  });
  document.getElementById("roleSelect")?.addEventListener("change", (event) => {
    state.role = event.target.value;
    persist();
    render();
  });
  document.getElementById("masterSelect")?.addEventListener("change", (event) => {
    state.masterId = event.target.value;
    persist();
    render();
  });
  document.getElementById("resetDemo")?.addEventListener("click", () => {
    if (confirm("Сбросить учебные данные в этом браузере до исходных образцов?")) {
      clearState();
      clearAllMedia()
        .catch(() => {})
        .finally(() => {
          state = createDefaultState();
          persist();
          render();
        });
    }
  });
  document.getElementById("printReport")?.addEventListener("click", () => window.print());
  document.querySelectorAll("[data-assign]").forEach((select) => {
    select.addEventListener("change", () => {
      const carId = select.getAttribute("data-assign");
      const dir = select.getAttribute("data-dir");
      state.cars[carId].assignments[dir].masterId = select.value;
      persist();
    });
  });
  document.querySelectorAll("[data-review]").forEach((button) => {
    button.addEventListener("click", () => {
      const carId = button.getAttribute("data-review");
      const dir = button.getAttribute("data-dir");
      state.cars[carId].assignments[dir].status = "reviewed";
      persist();
      render();
    });
  });
  document.querySelectorAll("[data-publish]").forEach((button) => {
    button.addEventListener("click", () => {
      const carId = button.getAttribute("data-publish");
      const carState = state.cars[carId];
      carState.status = "published";
      carState.publishedSnapshot = {
        createdAt: new Date().toISOString(),
        scores: liveScoresForCar(carState),
        conclusion: carState.conclusion || "",
        diagramDefects: cloneDiagramDefects(carState.diagramDefects),
      };
      persist();
      render();
    });
  });
  document.querySelectorAll("[data-conclusion]").forEach((el) => {
    el.addEventListener("input", () => {
      state.cars[el.getAttribute("data-conclusion")].conclusion = el.value;
      scheduleSave();
    });
  });
}

registerShellWorker();
window.addEventListener("hashchange", render);
render();
