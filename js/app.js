import { DIRECTIONS, DEMO_MASTERS, ROLES, SAMPLE_CARS, createDefaultState, carMeta, liveScoresForCar } from "./data.js";
import { FORMULA_DISCLAIMER } from "./scoring.js";
import { buildPublicCarUrl, buildWhatsAppBuyUrl } from "./whatsapp.js";
import { loadState, saveState, clearState } from "./storage.js";
import { summarizeDirection, summarizeOverall, directionTitle } from "./summary.js";
import { directionIcon } from "./icons.js";

const STATUS_LABEL = {
  created: "создан",
  in_progress: "в работе у мастеров",
  in_review: "на проверке",
  published: "опубликован",
};

const openDirs = new Set();
const openNodes = new Set();
let printOpened = [];

let state = hydrate();
let saveTimer = 0;

function hydrate() {
  const saved = loadState();
  const fresh = createDefaultState();
  if (!saved || saved.version !== 1 || !saved.cars) return fresh;
  return {
    ...fresh,
    ...saved,
    cars: { ...fresh.cars, ...saved.cars },
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
  const raw = (location.hash || "#/").replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "c" && parts[1]) {
    return { name: "car", id: decodeURIComponent(parts[1]), dir: parts[2] ? decodeURIComponent(parts[2]) : null };
  }
  if (parts[0] === "report" && parts[1]) {
    return { name: "report", id: decodeURIComponent(parts[1]), dir: parts[2] ? decodeURIComponent(parts[2]) : null };
  }
  if (parts[0] === "inspect" && parts[1]) {
    return { name: "inspect", id: decodeURIComponent(parts[1]), dir: parts[2] ? decodeURIComponent(parts[2]) : null };
  }
  if (parts[0] === "admin") return { name: "admin" };
  return { name: "home" };
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

function carSvg() {
  return `<svg class="car-svg" viewBox="0 0 360 160" role="img" aria-label="Учебная схема автомобиля, не фото реального авто">
    <rect x="1" y="1" width="358" height="158" rx="16" fill="#e8efe9"/>
    <text x="12" y="22" fill="#5a6b60" font-size="11">Иллюстрация-схема · не фото осмотра</text>
    <path d="M58 108c8-28 28-44 58-48l24-22h92l28 22c34 2 58 22 66 48" fill="#0f3d2e"/>
    <rect x="118" y="52" width="46" height="28" rx="4" fill="#d7e4da"/>
    <rect x="172" y="52" width="62" height="28" rx="4" fill="#d7e4da"/>
    <circle cx="108" cy="112" r="18" fill="#1c1916"/>
    <circle cx="108" cy="112" r="8" fill="#c4a35a"/>
    <circle cx="258" cy="112" r="18" fill="#1c1916"/>
    <circle cx="258" cy="112" r="8" fill="#c4a35a"/>
    <rect x="86" y="122" width="190" height="6" rx="3" fill="#c9b8a0"/>
  </svg>`;
}

function renderWhatsApp(car) {
  const href = whatsappHref(car);
  return `<a class="btn wa" href="${href}" target="_blank" rel="noopener noreferrer">Хочу купить этот автомобиль</a>
    <p class="hint">Откроется WhatsApp с текстом марки, модели, года и публичной ссылкой на эту демо-карточку. Сообщение не отправляется само.</p>`;
}

function roleNote() {
  if (canEdit()) {
    return `Сейчас учебный режим «${roleLabel()}». Это переключатель демонстрации, а не вход в систему и не проверка прав.`;
  }
  return `Сейчас режим «${roleLabel()}»: видны опубликованные оценки. Для заполнения выберите режим «Мастер» или «Администратор» вверху. Это не вход в систему.`;
}

function fillHint() {
  if (canEdit()) {
    return `<p class="callout">Откройте карточку направления — внутри подробный список узлов. Назначения мастеров здесь учебные и действуют только в этом браузере.</p>`;
  }
  return `<p class="callout">Для заполнения выберите режим Мастер или Администратор вверху страницы. Сейчас можно смотреть опубликованное состояние. Это не настоящий вход и не доступ к чужим данным.</p>`;
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
    <p class="cond cond-${summary.kind}"><span class="cond-mark" aria-hidden="true">${condMark(summary.kind)}</span>${escapeHtml(summary.label)}</p>
    <p class="dir-cov">${escapeHtml(summary.coverageText)} проверено</p>
    ${summary.hasCritical ? `<p class="dir-crit"><span aria-hidden="true">!</span> Есть критичные замечания</p>` : ""}`;
}

function header() {
  const roleOptions = ROLES.map((role) => `<option value="${role.id}" ${state.role === role.id ? "selected" : ""}>${role.label}</option>`).join("");
  const masterSelect =
    state.role === "master"
      ? `<label class="mini">Демо-мастер (симуляция)
          <select id="masterSelect">${DEMO_MASTERS.map((master) => `<option value="${master.id}" ${state.masterId === master.id ? "selected" : ""}>${master.name}</option>`).join("")}</select>
        </label>`
      : "";
  return `<header class="top">
    <div class="brand">
      <a href="#/" class="logo">АвтоМастер24 <span>/ Трейд-ин</span></a>
      <p>Независимая диагностика и оценка · учебный предпросмотр</p>
    </div>
    <nav>
      <a href="#/">Автомобили</a>
      <a href="#/admin">Назначения</a>
      <button type="button" id="resetDemo" class="text-btn">Сбросить демо</button>
    </nav>
    <div class="role-box">
      <label>Режим демонстрации
        <select id="roleSelect">${roleOptions}</select>
      </label>
      ${masterSelect}
      <p class="hint">${roleNote()}</p>
    </div>
  </header>`;
}

function directionHref(carId, slug, unpublished) {
  if (canEdit()) {
    const carState = state.cars[carId];
    if (state.role === "master" && carState.assignments[slug]?.masterId !== state.masterId) return null;
    return `#/inspect/${carId}/${slug}`;
  }
  if (unpublished || (state.role === "buyer" && state.cars[carId].status !== "published")) return null;
  return `#/report/${carId}/${slug}`;
}

function moreLabel(href, unpublished) {
  if (href) return "Посмотреть детали";
  if (unpublished) return "Отчёт ещё не опубликован";
  return "Посмотреть детали";
}

function dirCardTile(carId, direction, scores, unpublished) {
  const dirScore = scores.directionScores.find((item) => item.id === direction.slug);
  const summary = summarizeDirection(dirScore, { unpublished });
  const href = directionHref(carId, direction.slug, unpublished);
  const title = directionTitle(direction.slug, direction.name);
  const inner = `${directionIcon(direction.slug)}
    <div class="dir-copy">
      <h3>${title}</h3>
      <div data-summary-body="${direction.slug}">${summaryFields(summary)}</div>
      <span class="more">${moreLabel(href, unpublished)}</span>
    </div>`;
  if (href) {
    return `<a class="dir-card kind-${summary.kind}" href="${href}">${inner}</a>`;
  }
  return `<div class="dir-card kind-${summary.kind} is-static">${inner}</div>`;
}

function conditionGrid(carId) {
  const carState = state.cars[carId];
  const { scores, unpublished } = overviewFor(carId);
  const dirs = visibleDirections(carState);
  if (!dirs.length) {
    return `<section class="condition">
      <h2>Состояние автомобиля</h2>
      <p>В этой симуляции выбранному демо-мастеру ничего не назначено.</p>
    </section>`;
  }
  return `<section class="condition">
    <h2>Состояние автомобиля</h2>
    <p class="lead">Картинка направления и его оценка. Нажмите карточку, чтобы открыть подробный список узлов.</p>
    ${conditionLegend()}
    <div class="dir-grid">${dirs.map((direction) => dirCardTile(carId, direction, scores, unpublished)).join("")}</div>
  </section>`;
}

function overallHero(carId) {
  const { scores, unpublished } = overviewFor(carId);
  const summary = summarizeOverall(scores, { unpublished });
  return `<div class="score-hero kind-${summary.kind}">
    <strong>${escapeHtml(summary.scoreText)}</strong>
    <div>
      <p class="cond cond-${summary.kind}"><span class="cond-mark" aria-hidden="true">${condMark(summary.kind)}</span>${escapeHtml(summary.label)}</p>
      <p>Покрытие ${escapeHtml(summary.coverageText)}</p>
      ${summary.hasCritical ? `<p class="dir-crit">Есть критичные замечания</p>` : ""}
    </div>
  </div>`;
}

function actionRow(car) {
  const carState = state.cars[car.id];
  const reportVisible = carState.status === "published" || state.role !== "buyer";
  const reportLink = reportVisible
    ? `<a class="btn" href="#/report/${car.id}">Смотреть отчёт</a>`
    : `<span class="hint">Публичный отчёт появится после публикации.</span>`;
  const fillLink = canEdit()
    ? `<a class="btn ghost" href="#/inspect/${car.id}">Заполнить чек-лист</a>`
    : `<span class="hint">Для заполнения выберите режим Мастер/Администратор</span>`;
  return `<div class="row">${reportLink}${fillLink}</div>`;
}

function carCard(car) {
  const carState = state.cars[car.id];
  return `<article class="card">
    ${carSvg()}
    <p class="tag">${car.label}</p>
    <h2>${car.make} ${car.model}</h2>
    <p class="meta">${car.year} · ${car.mileage.toLocaleString("ru-RU")} км · ${car.color}</p>
    <p class="status">${STATUS_LABEL[carState.status]}</p>
    ${overallHero(car.id)}
    <p>${car.summary}</p>
    <div class="row">
      <a class="btn" href="#/c/${car.id}">Карточка</a>
    </div>
    ${actionRow(car)}
    ${conditionGrid(car.id)}
    ${renderWhatsApp(car)}
  </article>`;
}

function renderHome() {
  return `${header()}
    <main class="wrap">
      <h1>Каталог учебных автомобилей</h1>
      <p class="lead">Три вымышленных образца. На каждой карточке — семь направлений диагностики: картинка, оценка и кнопка «Посмотреть детали».</p>
      ${fillHint()}
      <div class="grid catalog">${SAMPLE_CARS.map(carCard).join("")}</div>
    </main>`;
}

function renderCar(id) {
  const car = carMeta(id);
  const carState = state.cars[id];
  if (!car || !carState) return `${header()}<main class="wrap"><h1>Образец не найден</h1></main>`;
  return `${header()}
    <main class="wrap">
      <a class="back" href="#/">← К списку</a>
      <p class="tag">${car.label}</p>
      <h1>${car.make} ${car.model}, ${car.year}</h1>
      ${carSvg()}
      <dl class="facts">
        <div><dt>Пробег</dt><dd>${car.mileage.toLocaleString("ru-RU")} км</dd></div>
        <div><dt>Цвет</dt><dd>${car.color}</dd></div>
        <div><dt>Госномер</dt><dd>${car.plate}</dd></div>
        <div><dt>VIN</dt><dd>${car.vin}</dd></div>
        <div><dt>Статус осмотра</dt><dd>${STATUS_LABEL[carState.status]}</dd></div>
      </dl>
      ${overallHero(id)}
      ${fillHint()}
      ${actionRow(car)}
      ${conditionGrid(id)}
      ${renderWhatsApp(car)}
    </main>`;
}

function nodeScoreLabel(score) {
  return score == null ? "не проверено" : `${score}/10`;
}

function inspectNode(direction, checkpoint, result) {
  const key = `${direction.slug}:${checkpoint.slug}`;
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

function readOnlyNode(direction, checkpoint, result) {
  const key = `ro:${direction.slug}:${checkpoint.slug}`;
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

function dirAccordion(direction, summary, inner, route) {
  const slug = direction.slug;
  if (route.dir === slug) openDirs.add(slug);
  const open = openDirs.has(slug) ? " open" : "";
  return `<details class="dir-details kind-${summary.kind}" data-dir="${slug}"${open}>
    <summary>
      ${directionIcon(slug)}
      <div class="dir-copy">
        <h3>${directionTitle(slug, direction.name)}</h3>
        <div data-summary-body="${slug}">${summaryFields(summary)}</div>
        <span class="more">Посмотреть детали</span>
      </div>
    </summary>
    <div class="dir-panel">${inner}</div>
  </details>`;
}

function progressLine(scores, dirs) {
  const visible = scores.directionScores.filter((item) => dirs.some((direction) => direction.slug === item.id));
  const checked = visible.reduce((sum, item) => sum + item.checked, 0);
  const total = visible.reduce((sum, item) => sum + item.total, 0);
  return `Прогресс: ${checked} из ${total}`;
}

function renderInspect(id, route) {
  const car = carMeta(id);
  const carState = state.cars[id];
  if (!car || !carState) return `${header()}<main class="wrap"><h1>Образец не найден</h1></main>`;
  if (!canEdit()) {
    return `${header()}
      <main class="wrap">
        <a class="back" href="#/c/${car.id}">← К карточке</a>
        <h1>Заполнение чек-листа</h1>
        ${fillHint()}
        ${conditionGrid(id)}
        ${state.role !== "buyer" || carState.status === "published" ? `<p><a class="btn" href="#/report/${car.id}">Открыть отчёт с подробностями</a></p>` : ""}
      </main>`;
  }
  const dirs = visibleDirections(carState);
  const scores = liveScoresForCar(carState);
  const blocks = dirs.map((direction) => {
    const dirScore = scores.directionScores.find((item) => item.id === direction.slug);
    const summary = summarizeDirection(dirScore);
    const assignment = carState.assignments[direction.slug];
    const nodes = direction.checkpoints
      .map((checkpoint) => inspectNode(direction, checkpoint, carState.results[direction.slug][checkpoint.slug]))
      .join("");
    const inner = `<p class="hint">Назначение: ${DEMO_MASTERS.find((item) => item.id === assignment?.masterId)?.name || "не назначен"} · статус ${assignment?.status || "pending"}</p>
      ${nodes}
      ${state.role === "master" ? `<button type="button" class="btn" data-submit="${direction.slug}">Отправить направление на проверку</button>` : ""}`;
    return dirAccordion(direction, summary, inner, route);
  });
  return `${header()}
    <main class="wrap">
      <a class="back" href="#/c/${car.id}">← К карточке</a>
      <h1>Чек-лист: ${car.make} ${car.model}</h1>
      ${fillHint()}
      <p class="lead" id="inspectProgress">${progressLine(scores, dirs)}</p>
      <p class="hint">Автосохранение только в этом браузере. Откройте направление, затем нужный узел.</p>
      ${conditionLegend()}
      ${state.role === "master" && dirs.length === 0 ? `<p>В этой симуляции выбранному демо-мастеру ничего не назначено.</p>` : `<div class="dir-stack">${blocks.join("")}</div>`}
      <section class="card">
        <h2>Локальный просмотр файла</h2>
        <p class="hint">Файл остаётся только в этом окне браузера и никуда не загружается. После обновления страницы превью исчезнет. Общего видеоотчёта в этом демо нет.</p>
        <input type="file" id="localFile" accept="image/*">
        <div id="localPreview" class="local-preview" hidden></div>
      </section>
    </main>`;
}

function renderReport(id, route) {
  const car = carMeta(id);
  const carState = state.cars[id];
  if (!car || !carState) return `${header()}<main class="wrap"><h1>Образец не найден</h1></main>`;
  if (state.role === "buyer" && carState.status !== "published") {
    return `${header()}<main class="wrap"><h1>Отчёт ещё не опубликован</h1><p>В режиме покупателя виден только опубликованный учебный отчёт.</p>${fillHint()}</main>`;
  }
  const { scores, unpublished } = overviewFor(id);
  const conclusion =
    state.role === "buyer" && carState.publishedSnapshot
      ? carState.publishedSnapshot.conclusion
      : carState.conclusion || carState.publishedSnapshot?.conclusion || "";
  const critical = (scores.criticalFaults || []).map((item) => `<li>${item.name}: ${item.score}</li>`).join("");
  const dirs = visibleDirections(carState);
  const blocks = dirs
    .map((direction) => {
      const dirScore = scores.directionScores.find((item) => item.id === direction.slug);
      const summary = summarizeDirection(dirScore, { unpublished });
      const nodes = direction.checkpoints
        .map((checkpoint) => readOnlyNode(direction, checkpoint, carState.results[direction.slug][checkpoint.slug]))
        .join("");
      return dirAccordion(direction, summary, nodes, route);
    })
    .join("");
  return `${header()}
    <main class="wrap report">
      <a class="back no-print" href="#/c/${car.id}">← К карточке</a>
      <p class="tag">Учебный аукционный лист</p>
      <h1>Акт осмотра: ${car.make} ${car.model}, ${car.year}</h1>
      <p class="watermark">ДЕМОНСТРАЦИЯ · НЕ РЕАЛЬНЫЙ ОСМОТР</p>
      <div class="media-ph">${carSvg()}<span>Схема-заполнитель, не фото реального осмотра</span></div>
      ${overallHero(id)}
      <p class="disclaimer">${FORMULA_DISCLAIMER}</p>
      <dl class="facts">
        <div><dt>Пробег</dt><dd>${car.mileage.toLocaleString("ru-RU")} км</dd></div>
        <div><dt>Идентификация</dt><dd>${car.vin}; ${car.plate}</dd></div>
        <div><dt>Статус</dt><dd>${STATUS_LABEL[carState.status]}</dd></div>
      </dl>
      ${critical ? `<section><h2>Критичные замечания</h2><ul>${critical}</ul></section>` : ""}
      <section><h2>Итоговое заключение</h2><p>${escapeHtml(conclusion || "Заключение ещё не заполнено в этой демонстрации.")}</p></section>
      <section class="condition">
        <h2>Состояние автомобиля</h2>
        <p class="lead">Семь направлений. Нажмите карточку, чтобы раскрыть оценки узлов.</p>
        ${conditionLegend()}
        <div class="dir-stack">${blocks}</div>
      </section>
      <div class="no-print">
        ${fillHint()}
        <button type="button" class="btn" id="printReport">Печать / сохранить как PDF</button>
        <p class="hint">Откроется диалог печати браузера. Перед печатью раскроются все публичные подробности. Это не серверный экспорт PDF.</p>
        ${renderWhatsApp(car)}
      </div>
    </main>`;
}

function renderAdmin() {
  if (state.role !== "admin") {
    return `${header()}<main class="wrap"><h1>Назначения</h1>${fillHint()}<p>Этот раздел открывается в учебном режиме администратора. Это не проверка прав доступа.</p></main>`;
  }
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
      <h2>${car.label}: ${car.make} ${car.model}</h2>
      <p>Статус: ${STATUS_LABEL[carState.status]}</p>
      <label>Заключение
        <textarea data-conclusion="${car.id}">${escapeHtml(carState.conclusion || "")}</textarea>
      </label>
      <table class="admin-table"><thead><tr><th>Направление</th><th>Мастер</th><th>Статус</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <a class="btn ghost" href="#/inspect/${car.id}">Открыть чек-лист</a>
      <button type="button" class="btn" data-publish="${car.id}">Опубликовать учебный отчёт</button>
      <p class="hint">Публикация только меняет состояние в этом браузере. Ссылок-приглашений и серверных грантов здесь нет.</p>
      <p class="action-note hint" role="status"></p>
    </section>`;
  }).join("");
  return `${header()}<main class="wrap"><h1>Демо-назначения и публикация</h1>${fillHint()}${blocks}</main>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render() {
  const route = parseRoute();
  if (route.dir) openDirs.add(route.dir);
  let html = renderHome();
  if (route.name === "car") html = renderCar(route.id);
  if (route.name === "report") html = renderReport(route.id, route);
  if (route.name === "inspect") html = renderInspect(route.id, route);
  if (route.name === "admin") html = renderAdmin();
  document.getElementById("app").innerHTML = html;
  document.title = pageTitle(route);
  bind();
}

function pageTitle(route) {
  if ((route.name === "report" || route.name === "car") && route.id) {
    const car = carMeta(route.id);
    if (car) {
      const kind = route.name === "report" ? "акт-осмотра" : "карточка";
      return `АвтоМастер24-Трейд-ин_${kind}_${car.make}-${car.model}-${car.year}_демо`.replaceAll(" ", "-");
    }
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
    document.querySelectorAll(`details[data-dir="${direction.slug}"]`).forEach((el) => {
      el.className = `dir-details kind-${summary.kind}`;
    });
  }
  const progress = document.getElementById("inspectProgress");
  if (progress) progress.textContent = progressLine(scores, dirs);
}

function bindDisclosure() {
  document.querySelectorAll("details[data-dir]").forEach((el) => {
    el.addEventListener("toggle", () => {
      const slug = el.getAttribute("data-dir");
      if (el.open) openDirs.add(slug);
      else openDirs.delete(slug);
    });
  });
  document.querySelectorAll("details[data-node]").forEach((el) => {
    el.addEventListener("toggle", () => {
      const key = el.getAttribute("data-node");
      if (el.open) openNodes.add(key);
      else openNodes.delete(key);
    });
  });
}

function bind() {
  bindDisclosure();
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
      state = createDefaultState();
      persist();
      render();
    }
  });
  document.getElementById("printReport")?.addEventListener("click", () => window.print());
  document.getElementById("localFile")?.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    const box = document.getElementById("localPreview");
    if (!box) return;
    box.innerHTML = "";
    if (!file) {
      box.hidden = true;
      return;
    }
    const url = URL.createObjectURL(file);
    box.hidden = false;
    box.innerHTML = `<img alt="Локальный предпросмотр выбранного файла" src="${url}"><p class="hint">«${escapeHtml(file.name)}» не отправлен на сервер.</p>`;
  });
  document.querySelectorAll("[data-act]").forEach((el) => {
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
      const head = document.querySelector(`[data-node="${dir}:${cp}"] .node-score`);
      if (head && act === "score") head.textContent = nodeScoreLabel(result.score);
      scheduleSave();
      patchLiveSummaries(carId);
    };
    el.addEventListener("change", apply);
    el.addEventListener("input", apply);
  });
  document.querySelectorAll("[data-submit]").forEach((button) => {
    button.addEventListener("click", () => {
      const dir = button.getAttribute("data-submit");
      const carState = state.cars[parseRoute().id];
      carState.assignments[dir].status = "submitted";
      carState.status = "in_review";
      persist();
      render();
    });
  });
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
  document.querySelectorAll("[data-conclusion]").forEach((area) => {
    area.addEventListener("input", () => {
      state.cars[area.getAttribute("data-conclusion")].conclusion = area.value;
      scheduleSave();
    });
  });
  document.querySelectorAll("[data-publish]").forEach((button) => {
    button.addEventListener("click", () => {
      const carId = button.getAttribute("data-publish");
      const carState = state.cars[carId];
      const pending = DIRECTIONS.filter((direction) => carState.assignments[direction.slug]?.status !== "reviewed");
      const note = button.parentElement.querySelector(".action-note");
      if (pending.length) {
        if (note) note.textContent = `Публикация в демо закрыта: не все направления в статусе «проверено» (${pending.map((item) => item.name).join(", ")}). Состояние только локальное.`;
        return;
      }
      carState.status = "published";
      carState.publishedSnapshot = {
        createdAt: new Date().toISOString(),
        scores: liveScoresForCar(carState),
        conclusion: carState.conclusion,
      };
      persist();
      render();
    });
  });
}

window.addEventListener("beforeprint", () => {
  printOpened = [];
  document.querySelectorAll("details").forEach((el) => {
    if (!el.open) {
      printOpened.push(el);
      el.open = true;
    }
  });
});
window.addEventListener("afterprint", () => {
  printOpened.forEach((el) => {
    el.open = false;
  });
  printOpened = [];
});
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  persist();
  render();
});
