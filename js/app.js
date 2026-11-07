import { DIRECTIONS, DEMO_MASTERS, ROLES, SAMPLE_CARS, createDefaultState, carMeta, liveScoresForCar, ensureCarShape } from "./data.js";
import { FORMULA_DISCLAIMER } from "./scoring.js";
import { buildPublicCarUrl, buildWhatsAppBuyUrl } from "./whatsapp.js";
import { loadState, saveState, clearState } from "./storage.js";
import { summarizeDirection, summarizeOverall, directionTitle } from "./summary.js";
import { directionIcon } from "./icons.js";
import { folderKey, nodeFolderKey } from "./folder.js";
import { parseRoute as parseRouteFromHash, isCarRoute, canonicalHash, panelDomId, toggleOpenDir, hashDirFromOpen } from "./routes.js";
import {
  MEDIA_LIMITS_TEXT,
  addFolderMedia,
  clearAllMedia,
  deleteFolderMedia,
  listFolderMedia,
  objectUrlFor,
  revokeAllObjectUrls,
  revokeFolderObjectUrls,
} from "./media.js";

const STATUS_LABEL = {
  created: "создан",
  in_progress: "в работе у мастеров",
  in_review: "на проверке",
  published: "опубликован",
};

const openDirs = new Set();
const openNodes = new Set();
let lastViewerTrigger = null;

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

function canEdit() {
  return state.role === "admin" || state.role === "master";
}

function canSeeInternal() {
  return state.role === "admin" || state.role === "master";
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
  const carState = state.cars[carId];
  if (!carState) return { scores: blankScores(), unpublished: true };
  if (state.role === "buyer" && carState.status !== "published") {
    return { scores: blankScores(), unpublished: true };
  }
  return { scores: scoresFor(carId) || blankScores(), unpublished: false };
}

function visibleDirections(carState) {
  if (state.role !== "master") return DIRECTIONS;
  return DIRECTIONS.filter((direction) => carState.assignments[direction.slug]?.masterId === state.masterId);
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

function carPhoto(car, extraClass = "") {
  if (!car?.image) return "";
  return `<figure class="${extraClass}">
    <img src="${car.image}" alt="${escapeHtml(car.imageAlt || `${car.make} ${car.model}`)}" width="640" height="480">
    <figcaption>Учебная иллюстрация, не фото осмотра</figcaption>
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
      <a href="#/" class="logo">АвтоМастер24 <span>/ Трейд-ин</span></a>
      <p>Независимая диагностика перед покупкой</p>
    </div>
    <nav>
      <a href="#/">Все автомобили</a>
      <button type="button" class="mode-toggle" id="modeToggle" aria-haspopup="dialog">Режим работы (демо): ${escapeHtml(roleLabel())}</button>
    </nav>
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

function conditionLegend() {
  return `<ul class="legend" aria-label="Как читать оценки">
    <li><span class="cond-mark cond-unchecked" aria-hidden="true">–</span> Не проверено</li>
    <li><span class="cond-mark cond-good" aria-hidden="true">✓</span> Хорошее состояние</li>
    <li><span class="cond-mark cond-notes" aria-hidden="true">!</span> Есть замечания</li>
    <li><span class="cond-mark cond-repair" aria-hidden="true">×</span> Нужен ремонт</li>
    <li><span class="cond-mark cond-crit" aria-hidden="true">!</span> Критичные замечания</li>
  </ul>`;
}

function condMark(kind) {
  if (kind === "good") return "✓";
  if (kind === "notes") return "!";
  if (kind === "repair") return "×";
  return "–";
}

function summaryFields(summary) {
  return `<p class="dir-score">${escapeHtml(summary.scoreText)}</p>
    <p class="cond cond-${summary.kind}"><span class="cond-mark" aria-hidden="true">${condMark(summary.kind)}</span><span>${escapeHtml(summary.label)}</span></p>
    <p class="dir-cov">${escapeHtml(summary.coverageText)} проверено</p>
    ${summary.hasCritical ? `<p class="dir-crit"><span class="cond-mark cond-crit" aria-hidden="true">!</span><span>Есть критичные замечания</span></p>` : ""}`;
}

function severityClass(summary) {
  return `kind-${summary.kind}${summary.hasCritical ? " has-critical" : ""}`;
}

function overallHero(carId) {
  const { scores, unpublished } = overviewFor(carId);
  const summary = summarizeOverall(scores, { unpublished });
  return `<div class="score-hero ${severityClass(summary)}">
    <strong>${escapeHtml(summary.scoreText)}</strong>
    <div>
      <p class="cond cond-${summary.kind}"><span class="cond-mark" aria-hidden="true">${condMark(summary.kind)}</span><span>${escapeHtml(summary.label)}</span></p>
      <p>Проверено ${escapeHtml(summary.coverageText)}</p>
      ${summary.hasCritical ? `<p class="dir-crit"><span class="cond-mark cond-crit" aria-hidden="true">!</span><span>Есть критичные замечания</span></p>` : ""}
    </div>
  </div>`;
}

function highlightsHTML(carId) {
  const carState = state.cars[carId];
  const { scores, unpublished } = overviewFor(carId);
  if (unpublished) return "";
  const dirs = visibleDirections(carState);
  const critical = scores.criticalFaults || [];
  const attention = [];
  const good = [];
  for (const direction of dirs) {
    const summary = summarizeDirection(scores.directionScores.find((item) => item.id === direction.slug));
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

function cardFace(direction, summary, more) {
  return `<span class="dir-illust">${directionIcon(direction.slug)}</span>
    <div class="dir-copy">
      <h3>${directionTitle(direction.slug, direction.name)}</h3>
      <div data-summary-body="${direction.slug}">${summaryFields(summary)}</div>
      <span class="more">${more}</span>
    </div>`;
}

function directionItemHTML(carId, direction, summary, open) {
  const slug = direction.slug;
  const pid = panelDomId(carId, slug);
  return `<article class="direction-item" data-direction-item="${slug}">
    <button type="button" class="dir-card ${severityClass(summary)}${open ? " is-selected" : ""}" data-select-dir="${slug}" aria-expanded="${open ? "true" : "false"}" aria-controls="${pid}">
      ${cardFace(direction, summary, open ? "Скрыть подробности" : "Открыть подробности")}
    </button>
    <div id="${pid}" class="dir-expand" data-dir-panel="${slug}" data-car="${carId}" ${open ? "" : "hidden"}>${open ? folderPanelHTML(carId, slug) : ""}</div>
  </article>`;
}

function directionNotesHTML(carId, slug, editable) {
  ensureCarShape(state.cars[carId]);
  const notes = state.cars[carId].directionNotes[slug];
  if (editable) {
    return `<section class="dir-notes">
      <label>Описание направления
        <textarea data-dir-note="publicComment" data-car="${carId}" data-dir="${slug}">${escapeHtml(notes.publicComment)}</textarea>
      </label>
      ${
        canSeeInternal()
          ? `<label>Внутренний комментарий направления (скрыт от покупателя)
        <textarea data-dir-note="internalComment" data-car="${carId}" data-dir="${slug}">${escapeHtml(notes.internalComment)}</textarea>
      </label>`
          : ""
      }
    </section>`;
  }
  return `<section class="dir-notes">
    <h3>Кратко</h3>
    <p>${notes.publicComment ? escapeHtml(notes.publicComment) : "Описание направления пока не заполнено."}</p>
    ${canSeeInternal() && notes.internalComment ? `<div class="internal">Внутреннее (не для покупателя): ${escapeHtml(notes.internalComment)}</div>` : ""}
  </section>`;
}

function emptyPhotoText() {
  return canEdit() ? "Добавьте фото состояния узла" : "Материалы пока не добавлены";
}

function emptyVideoText() {
  return canEdit() ? "Добавьте видео состояния узла" : "Материалы пока не добавлены";
}

function mediaSectionsHTML(carId, slug, editable) {
  const key = folderKey(carId, slug);
  return `<section class="media-folders" data-media-folder="${escapeHtml(key)}" data-car="${carId}" data-dir="${slug}">
    <div class="media-tabs" role="tablist" aria-label="Фото и видео направления">
      <button type="button" role="tab" aria-selected="true" data-media-tab="photo">Фото (<span data-photo-count>0</span>)</button>
      <button type="button" role="tab" aria-selected="false" data-media-tab="video">Видео (<span data-video-count>0</span>)</button>
    </div>
    <div data-photo-panel>
      <div class="photo-gallery" data-photo-gallery><p class="empty-media">${emptyPhotoText()}</p></div>
      ${
        editable
          ? `<label class="btn ghost file-btn">Добавить фото
        <input type="file" hidden multiple accept="image/jpeg,image/png,image/webp" data-media-upload="photo" data-car="${carId}" data-dir="${slug}">
      </label>`
          : ""
      }
    </div>
    <div data-video-panel hidden>
      <div class="video-gallery" data-video-gallery><p class="empty-media">${emptyVideoText()}</p></div>
      ${
        editable
          ? `<label class="btn ghost file-btn">Добавить видео
        <input type="file" hidden multiple accept="video/mp4,video/webm,video/quicktime" data-media-upload="video" data-car="${carId}" data-dir="${slug}">
      </label>`
          : ""
      }
    </div>
    <p class="hint">${MEDIA_LIMITS_TEXT}</p>
    <p class="hint upload-status" data-media-status role="status"></p>
    <dialog class="photo-viewer" data-photo-viewer>
      <img alt="Просмотр фото">
      <form method="dialog"><button class="btn" value="close">Закрыть</button></form>
    </dialog>
  </section>`;
}

function inspectNode(carId, direction, checkpoint, result) {
  const key = nodeFolderKey(carId, direction.slug, checkpoint.slug);
  const scoreOptions = [`<option value="" ${result.score == null ? "selected" : ""}>не проверено</option>`]
    .concat(Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<option value="${n}" ${result.score === n ? "selected" : ""}>${n}</option>`))
    .join("");
  const internal =
    canSeeInternal()
      ? `<label>Внутренний комментарий (скрыт от покупателя)
          <textarea data-act="internal" data-dir="${direction.slug}" data-cp="${checkpoint.slug}">${escapeHtml(result.internalComment || "")}</textarea>
        </label>`
      : "";
  return `<details class="node" data-node="${key}"${openNodes.has(key) ? " open" : ""}>
    <summary>
      <span>${checkpoint.name} ${checkpoint.isCritical ? `<span class="crit">критичный</span>` : ""}</span>
      <span class="node-score">${nodeScoreLabel(result.score)}</span>
    </summary>
    <div class="node-body">
      <label>Оценка
        <select data-act="score" data-dir="${direction.slug}" data-cp="${checkpoint.slug}">${scoreOptions}</select>
      </label>
      <label>Версия / модификация
        <input data-act="version" data-dir="${direction.slug}" data-cp="${checkpoint.slug}" value="${escapeHtml(result.versionNote || "")}">
      </label>
      <label>Публичный комментарий
        <textarea data-act="public" data-dir="${direction.slug}" data-cp="${checkpoint.slug}">${escapeHtml(result.publicComment || "")}</textarea>
      </label>
      ${internal}
    </div>
  </details>`;
}

function readOnlyNode(carId, direction, checkpoint, result) {
  const key = `ro:${nodeFolderKey(carId, direction.slug, checkpoint.slug)}`;
  const internal =
    canSeeInternal() && result.internalComment
      ? `<div class="internal">Внутреннее (не для покупателя): ${escapeHtml(result.internalComment)}</div>`
      : "";
  return `<details class="node" data-node="${key}"${openNodes.has(key) ? " open" : ""}>
    <summary>
      <span>${checkpoint.name} ${checkpoint.isCritical ? `<span class="crit">критичный</span>` : ""}</span>
      <span class="node-score">${nodeScoreLabel(result.score)}</span>
    </summary>
    <div class="node-body">
      <p><strong>Версия:</strong> ${escapeHtml(result.versionNote || "—")}</p>
      <p><strong>Комментарий:</strong> ${escapeHtml(result.publicComment || "—")}</p>
      ${internal}
    </div>
  </details>`;
}

function nodeScoreLabel(score) {
  return score == null ? "не проверено" : `${score}/10`;
}

function folderPanelHTML(carId, slug) {
  const carState = state.cars[carId];
  const direction = DIRECTIONS.find((item) => item.slug === slug);
  const car = carMeta(carId);
  if (!direction || !carState) return `<p>Направление не найдено</p>`;
  if (state.role === "buyer" && carState.status !== "published") {
    return `<p>Оценочный лист ещё не опубликован. Описание, оценки, фото и видео этого направления скрыты.</p>`;
  }
  const editable = canEdit();
  const assignment = carState.assignments[slug];
  const nodes = direction.checkpoints
    .map((checkpoint) =>
      editable
        ? inspectNode(carId, direction, checkpoint, carState.results[slug][checkpoint.slug])
        : readOnlyNode(carId, direction, checkpoint, carState.results[slug][checkpoint.slug]),
    )
    .join("");
  return `<h3>${directionTitle(slug, direction.name)}</h3>
    <p class="hint">Подробности только этого автомобиля: «${car ? `${car.make} ${car.model}` : carId}». ${
      assignment ? `Назначение: ${DEMO_MASTERS.find((item) => item.id === assignment.masterId)?.name || "не назначен"} · ${assignment.status}.` : ""
    }</p>
    ${directionNotesHTML(carId, slug, editable)}
    ${mediaSectionsHTML(carId, slug, editable)}
    <h3>Узлы направления</h3>
    <p class="hint">Откройте нужный пункт — все ${direction.checkpoints.length} сразу не показаны.</p>
    ${nodes}
    ${state.role === "master" && editable ? `<button type="button" class="btn" data-submit="${slug}">Отправить направление на проверку</button>` : ""}`;
}

function printAllHTML(carId, dirs) {
  const carState = state.cars[carId];
  return `<div class="print-all">${dirs
    .map((direction) => {
      const items = direction.checkpoints
        .map((checkpoint) => {
          const result = carState.results[direction.slug][checkpoint.slug];
          const internal =
            canSeeInternal() && result.internalComment
              ? ` Внутреннее: ${escapeHtml(result.internalComment)}`
              : "";
          return `<li>${checkpoint.name} — ${nodeScoreLabel(result.score)} — ${escapeHtml(result.versionNote || "—")}. ${escapeHtml(result.publicComment || "—")}${internal}</li>`;
        })
        .join("");
      ensureCarShape(carState);
      const note = carState.directionNotes[direction.slug]?.publicComment;
      return `<section><h3>${directionTitle(direction.slug, direction.name)}</h3><p>${note ? escapeHtml(note) : "Описание направления пока не заполнено."}</p><ul>${items}</ul></section>`;
    })
    .join("")}</div>`;
}

function directionPicker(carId, dirs, scores, unpublished) {
  if (!dirs.length) return `<p>В этой симуляции выбранному демо-мастеру ничего не назначено.</p>`;
  const items = dirs
    .map((direction) => {
      const dirScore = scores.directionScores.find((item) => item.id === direction.slug);
      const summary = summarizeDirection(dirScore, { unpublished });
      return directionItemHTML(carId, direction, summary, openDirs.has(direction.slug));
    })
    .join("");
  return `<div class="dir-grid">${items}</div>`;
}

function carCard(car) {
  const carState = state.cars[car.id];
  return `<article class="card">
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
  return `${header()}
    <main class="wrap">
      <h1>Выберите автомобиль</h1>
      <p class="lead">Сначала выберите машину. Оценки, фото и видео откроются в её оценочном листе.</p>
      <div class="grid catalog">${SAMPLE_CARS.map(carCard).join("")}</div>
    </main>`;
}

function unpublishedBlock(car) {
  return `<section class="unavailable">
    <h2>Оценочный лист ещё не опубликован</h2>
    <p>Когда осмотр будет готов, здесь появятся оценки, замечания, фото и видео «${escapeHtml(car.make)} ${escapeHtml(car.model)}».</p>
    <p class="hint">Чтобы посмотреть готовый пример, вернитесь в каталог и откройте опубликованный автомобиль. Режим мастера в меню «Режим работы (демо)» показывает учебное заполнение — это не настоящий доступ.</p>
  </section>`;
}

function renderCar(id, route = parseRoute()) {
  const car = carMeta(id);
  const carState = state.cars[id];
  if (!car || !carState) return `${header()}<main class="wrap"><h1>Образец не найден</h1></main>`;
  const { scores, unpublished } = overviewFor(id);
  const dirs = visibleDirections(carState);
  const selected = route.dir && dirs.some((item) => item.slug === route.dir) ? route.dir : null;
  if (selected) openDirs.add(selected);
  const conclusion =
    state.role === "buyer" && carState.publishedSnapshot
      ? carState.publishedSnapshot.conclusion
      : carState.conclusion || carState.publishedSnapshot?.conclusion || "";
  return `${header()}
    <main class="wrap report">
      <nav class="crumb" aria-label="Навигация">
        <a class="back" href="#/">Все автомобили</a>
        <span aria-hidden="true">/</span>
        <span>${car.make} ${car.model}, ${car.year}</span>
      </nav>
      <p class="tag">Папка автомобиля · ${car.label}</p>
      <h1>${car.make} ${car.model}, ${car.year}</h1>
      <div class="assessment-head">
        ${carPhoto(car, "hero-visual")}
        <div>
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
      ${unpublished ? unpublishedBlock(car) : ""}
      ${unpublished ? "" : `<p class="formula">${FORMULA_DISCLAIMER}</p>`}
      ${unpublished ? "" : highlightsHTML(id)}
      ${!unpublished && conclusion ? `<section class="highlights"><h2>Заключение</h2><p>${escapeHtml(conclusion)}</p></section>` : ""}
      ${unpublished ? "" : conditionLegend()}
      ${unpublished ? "" : `<h2>Диагностика по направлениям</h2><p class="lead">Нажмите картинку, чтобы открыть описание, фото, видео и список узлов.</p>`}
      ${unpublished ? "" : directionPicker(id, dirs, scores, unpublished)}
      ${unpublished ? "" : `<p class="no-print"><button type="button" class="btn ghost" id="printReport">Печать листа</button></p>`}
      ${unpublished ? "" : printAllHTML(id, dirs)}
      ${renderWhatsApp(car)}
    </main>`;
}

function renderAdmin() {
  const blocks = SAMPLE_CARS.map((car) => {
    const carState = state.cars[car.id];
    const rows = DIRECTIONS.map((direction) => {
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
  const route = parseRoute();
  if (isCarRoute(route) && location.hash !== canonicalHash(route)) {
    history.replaceState(null, "", canonicalHash(route));
  }
  if (route.dir) openDirs.add(route.dir);
  let html = renderHome();
  if (isCarRoute(route)) html = renderCar(route.id, route);
  if (route.name === "admin") html = renderAdmin();
  document.getElementById("app").innerHTML = html;
  document.title = pageTitle(route);
  bind();
  if (isCarRoute(route) && route.id) {
    for (const slug of openDirs) {
      const panel = document.getElementById(panelDomId(route.id, slug));
      if (panel && !panel.hidden) hydrateMedia(route.id, slug, panel);
    }
  }
}

function pageTitle(route) {
  if (isCarRoute(route) && route.id) {
    const car = carMeta(route.id);
    if (car) return `АвтоМастер24-Трейд-ин_оценочный-лист_${car.make}-${car.model}-${car.year}_демо`.replaceAll(" ", "-");
  }
  return "АвтоМастер24 / Трейд-ин — демонстрация осмотра";
}

function patchLiveSummaries(carId) {
  const carState = state.cars[carId];
  if (!carState) return;
  const scores = liveScoresForCar(carState);
  const dirs = visibleDirections(carState);
  for (const direction of dirs) {
    const summary = summarizeDirection(scores.directionScores.find((item) => item.id === direction.slug));
    document.querySelectorAll(`[data-summary-body="${direction.slug}"]`).forEach((holder) => {
      holder.innerHTML = summaryFields(summary);
    });
    document.querySelectorAll(`[data-select-dir="${direction.slug}"]`).forEach((el) => {
      if (!el.querySelector(`[data-summary-body="${direction.slug}"]`)) return;
      const selected = el.classList.contains("is-selected");
      el.className = `dir-card ${severityClass(summary)}${selected ? " is-selected" : ""}`;
    });
  }
}

function bindDisclosure(root = document) {
  root.querySelectorAll("details[data-node]").forEach((el) => {
    el.addEventListener("toggle", () => {
      const key = el.getAttribute("data-node");
      if (el.open) openNodes.add(key);
      else openNodes.delete(key);
    });
  });
}

function syncDirButton(slug, open) {
  document.querySelectorAll(`[data-select-dir="${slug}"]`).forEach((el) => {
    el.classList.toggle("is-selected", open);
    el.setAttribute("aria-expanded", open ? "true" : "false");
    const more = el.querySelector(".more");
    if (more) more.textContent = open ? "Скрыть подробности" : "Открыть подробности";
  });
}

function expandDirectionPanel(carId, slug) {
  const panel = document.getElementById(panelDomId(carId, slug));
  if (!panel) return;
  if (!panel.innerHTML.trim()) {
    panel.innerHTML = folderPanelHTML(carId, slug);
    bindFieldRoot(panel);
    bindDisclosure(panel);
    bindMediaSection(panel);
    hydrateMedia(carId, slug, panel);
  }
  panel.hidden = false;
}

function collapseDirectionPanel(carId, slug) {
  const panel = document.getElementById(panelDomId(carId, slug));
  if (!panel) return;
  revokeFolderObjectUrls(carId, slug);
  panel.hidden = true;
  panel.innerHTML = "";
}

function toggleDirection(slug, { updateHash = true } = {}) {
  const route = parseRoute();
  const carId = route.id;
  if (!carId || !slug) return;
  const next = toggleOpenDir(openDirs, slug);
  openDirs.clear();
  next.forEach((item) => openDirs.add(item));
  const open = openDirs.has(slug);
  syncDirButton(slug, open);
  if (open) expandDirectionPanel(carId, slug);
  else collapseDirectionPanel(carId, slug);
  if (updateHash && isCarRoute(route)) {
    const nextHash = canonicalHash({ name: "car", id: carId, dir: hashDirFromOpen(openDirs, slug) });
    if (location.hash !== nextHash) history.replaceState(null, "", nextHash);
  }
}

function bindPicker() {
  document.querySelectorAll("[data-select-dir]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleDirection(button.getAttribute("data-select-dir"));
    });
  });
}

async function hydrateMedia(carId, slug, root = document) {
  const folder = root.querySelector("[data-media-folder]");
  if (!folder) return;
  const status = folder.querySelector("[data-media-status]");
  const activeTab = folder.querySelector('[data-media-tab][aria-selected="true"]')?.getAttribute("data-media-tab") || "photo";
  try {
    const items = await listFolderMedia(carId, slug);
    const photos = items.filter((item) => item.kind === "photo");
    const videos = items.filter((item) => item.kind === "video");
    const photoCount = folder.querySelector("[data-photo-count]");
    const videoCount = folder.querySelector("[data-video-count]");
    if (photoCount) photoCount.textContent = String(photos.length);
    if (videoCount) videoCount.textContent = String(videos.length);
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
          ${canEdit() ? `<button type="button" class="text-btn" data-del-media="${item.id}">Удалить</button>` : ""}
        </figure>`;
            })
            .join("")
        : `<p class="empty-media">${emptyPhotoText()}</p>`;
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
          ${canEdit() ? `<button type="button" class="text-btn" data-del-media="${item.id}">Удалить</button>` : ""}
        </figure>`;
            })
            .join("")
        : `<p class="empty-media">${emptyVideoText()}</p>`;
    }
    folder.querySelector("[data-photo-panel]").hidden = activeTab !== "photo";
    folder.querySelector("[data-video-panel]").hidden = activeTab !== "video";
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
    folder.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-media-tab]");
      if (tab && folder.contains(tab)) {
        const name = tab.getAttribute("data-media-tab");
        folder.querySelectorAll("[data-media-tab]").forEach((button) => {
          button.setAttribute("aria-selected", button === tab ? "true" : "false");
        });
        folder.querySelector("[data-photo-panel]").hidden = name !== "photo";
        folder.querySelector("[data-video-panel]").hidden = name !== "video";
      }
    });
    folder.addEventListener("change", async (event) => {
      const input = event.target.closest("[data-media-upload]");
      if (!input) return;
      const carId = input.getAttribute("data-car");
      const slug = input.getAttribute("data-dir");
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
      await hydrateMedia(carId, slug, folder.closest("[data-dir-panel]") || folder);
    });
    folder.addEventListener("click", async (event) => {
      const del = event.target.closest("[data-del-media]");
      if (del) {
        const carId = folder.getAttribute("data-car");
        const slug = folder.getAttribute("data-dir");
        const result = await deleteFolderMedia(del.getAttribute("data-del-media"), carId, slug);
        const status = folder.querySelector("[data-media-status]");
        if (!result.ok && status) status.textContent = result.error;
        await hydrateMedia(carId, slug, folder.closest("[data-dir-panel]") || folder);
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
      const result = state.cars[carId].results[dir][cp];
      if (act === "score") result.score = el.value === "" ? null : Number(el.value);
      if (act === "version") result.versionNote = el.value;
      if (act === "public") result.publicComment = el.value;
      if (act === "internal") result.internalComment = el.value;
      const carState = state.cars[carId];
      if (carState.status === "created" || carState.status === "published") {
        if (carState.status !== "published") carState.status = "in_progress";
      }
      const head = document.querySelector(`[data-node="${nodeFolderKey(carId, dir, cp)}"] .node-score`);
      if (head && act === "score") head.textContent = nodeScoreLabel(result.score);
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
      ensureCarShape(state.cars[carId]);
      state.cars[carId].directionNotes[dir][field] = el.value;
      scheduleSave();
    });
  });
  root.querySelectorAll("[data-submit]").forEach((button) => {
    button.addEventListener("click", () => {
      const dir = button.getAttribute("data-submit");
      const carState = state.cars[parseRoute().id];
      carState.assignments[dir].status = "submitted";
      carState.status = "in_review";
      persist();
      render();
    });
  });
}

function bind() {
  bindDisclosure();
  bindPicker();
  bindFieldRoot(document);
  bindMediaSection(document);
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

window.addEventListener("hashchange", render);
render();
