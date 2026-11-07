import { DIRECTIONS, DEMO_MASTERS, ROLES, SAMPLE_CARS, createDefaultState, carMeta, liveScoresForCar } from "./data.js";
import { formatScore, coveragePercent, FORMULA_DISCLAIMER } from "./scoring.js";
import { buildPublicCarUrl, buildWhatsAppBuyUrl } from "./whatsapp.js";
import { loadState, saveState, clearState } from "./storage.js";

const STATUS_LABEL = {
  created: "создан",
  in_progress: "в работе у мастеров",
  in_review: "на проверке",
  published: "опубликован",
};

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
  if (parts[0] === "c" && parts[1]) return { name: "car", id: decodeURIComponent(parts[1]) };
  if (parts[0] === "report" && parts[1]) return { name: "report", id: decodeURIComponent(parts[1]) };
  if (parts[0] === "inspect" && parts[1]) return { name: "inspect", id: decodeURIComponent(parts[1]) };
  if (parts[0] === "admin") return { name: "admin" };
  return { name: "home" };
}

function go(hash) {
  location.hash = hash;
}

function canSeeInternal() {
  return state.role === "admin" || state.role === "master";
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
  const role = ROLES.find((item) => item.id === state.role);
  return `Сейчас показан режим «${role?.label || state.role}». Это переключатель демонстрации, а не вход в систему и не проверка прав.`;
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
      ${state.role === "admin" ? `<a href="#/admin">Назначения</a>` : ""}
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

function carCard(car) {
  const carState = state.cars[car.id];
  const scores = carState.status === "published" ? scoresFor(car.id) : state.role === "buyer" ? null : scoresFor(car.id);
  const showScore = carState.status === "published" && scores?.displayedScore != null;
  return `<article class="card">
    ${carSvg()}
    <p class="tag">${car.label}</p>
    <h2>${car.make} ${car.model}</h2>
    <p class="meta">${car.year} · ${car.mileage.toLocaleString("ru-RU")} км · ${car.color}</p>
    <p class="status">${STATUS_LABEL[carState.status]}</p>
    ${showScore ? `<p class="score">Итог ${formatScore(scores.displayedScore)} · покрытие ${coveragePercent(scores.coverage)}</p>` : `<p class="hint">Публичная оценка появляется после демо-публикации.</p>`}
    <p>${car.summary}</p>
    <div class="row">
      <a class="btn" href="#/c/${car.id}">Карточка</a>
      ${carState.status === "published" || state.role !== "buyer" ? `<a class="btn ghost" href="#/report/${car.id}">Отчёт</a>` : ""}
      ${state.role === "master" || state.role === "admin" ? `<a class="btn ghost" href="#/inspect/${car.id}">Чек-лист</a>` : ""}
    </div>
    ${renderWhatsApp(car)}
  </article>`;
}

function renderHome() {
  return `${header()}
    <main class="wrap">
      <h1>Каталог учебных автомобилей</h1>
      <p class="lead">Три вымышленных образца. Это не объявления о продаже и не результаты реальных осмотров.</p>
      <div class="grid">${SAMPLE_CARS.map(carCard).join("")}</div>
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
      <div class="row">
        ${(carState.status === "published" || state.role !== "buyer") ? `<a class="btn" href="#/report/${car.id}">Открыть отчёт</a>` : ""}
        ${(state.role === "master" || state.role === "admin") ? `<a class="btn ghost" href="#/inspect/${car.id}">Заполнить чек-лист</a>` : ""}
      </div>
      ${renderWhatsApp(car)}
    </main>`;
}

function visibleDirections(carState) {
  if (state.role !== "master") return DIRECTIONS;
  return DIRECTIONS.filter((direction) => carState.assignments[direction.slug]?.masterId === state.masterId);
}

function renderInspect(id) {
  const car = carMeta(id);
  const carState = state.cars[id];
  if (!car || !carState) return `${header()}<main class="wrap"><h1>Образец не найден</h1></main>`;
  if (state.role === "buyer") {
    return `${header()}<main class="wrap"><h1>Чек-лист недоступен в режиме покупателя</h1><p>Переключатель ролей — только демонстрация интерфейса.</p></main>`;
  }
  const dirs = visibleDirections(carState);
  const scores = liveScoresForCar(carState);
  const blocks = dirs.map((direction) => {
    const dirScore = scores.directionScores.find((item) => item.id === direction.slug);
    const assignment = carState.assignments[direction.slug];
    const rows = direction.checkpoints
      .map((checkpoint) => {
        const result = carState.results[direction.slug][checkpoint.slug];
        const scoreOptions = [`<option value="" ${result.score == null ? "selected" : ""}>не проверено</option>`]
          .concat(Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<option value="${n}" ${result.score === n ? "selected" : ""}>${n}</option>`))
          .join("");
        const internal =
          canSeeInternal()
            ? `<label>Внутренний комментарий (скрыт от покупателя)
                <textarea data-act="internal" data-dir="${direction.slug}" data-cp="${checkpoint.slug}">${escapeHtml(result.internalComment || "")}</textarea>
              </label>`
            : "";
        return `<article class="node">
          <header>
            <h3>${checkpoint.name} ${checkpoint.isCritical ? `<span class="crit">критичный</span>` : ""}</h3>
            <label>Оценка
              <select data-act="score" data-dir="${direction.slug}" data-cp="${checkpoint.slug}">${scoreOptions}</select>
            </label>
          </header>
          <label>Версия / модификация
            <input data-act="version" data-dir="${direction.slug}" data-cp="${checkpoint.slug}" value="${escapeHtml(result.versionNote || "")}">
          </label>
          <label>Публичный комментарий
            <textarea data-act="public" data-dir="${direction.slug}" data-cp="${checkpoint.slug}">${escapeHtml(result.publicComment || "")}</textarea>
          </label>
          ${internal}
        </article>`;
      })
      .join("");
    return `<section class="direction">
      <h2>${direction.name} <small>${formatScore(dirScore?.score ?? null)} · ${dirScore?.checked || 0}/${dirScore?.total || 0}</small></h2>
      <p class="hint">Назначение: ${DEMO_MASTERS.find((item) => item.id === assignment?.masterId)?.name || "не назначен"} · статус ${assignment?.status || "pending"}</p>
      ${rows}
      ${state.role === "master" ? `<button type="button" class="btn" data-submit="${direction.slug}">Отправить направление на проверку</button>` : ""}
    </section>`;
  });
  return `${header()}
    <main class="wrap">
      <a class="back" href="#/c/${car.id}">← К карточке</a>
      <h1>Чек-лист: ${car.make} ${car.model}</h1>
      <p class="lead">Автосохранение только в этом браузере. Прогресс: ${scores.checked} из ${scores.total} (${coveragePercent(scores.coverage)}).</p>
      ${state.role === "master" && dirs.length === 0 ? `<p>В этой симуляции выбранному демо-мастеру ничего не назначено.</p>` : blocks.join("")}
      <section class="card">
        <h2>Локальный просмотр файла</h2>
        <p class="hint">Файл остаётся только в этом окне браузера и никуда не загружается. После обновления страницы превью исчезнет.</p>
        <input type="file" id="localFile" accept="image/*">
        <div id="localPreview" class="local-preview" hidden></div>
      </section>
    </main>`;
}

function renderReport(id) {
  const car = carMeta(id);
  const carState = state.cars[id];
  if (!car || !carState) return `${header()}<main class="wrap"><h1>Образец не найден</h1></main>`;
  if (state.role === "buyer" && carState.status !== "published") {
    return `${header()}<main class="wrap"><h1>Отчёт ещё не опубликован</h1><p>В режиме покупателя виден только опубликованный учебный отчёт.</p></main>`;
  }
  const scores = scoresFor(id);
  const conclusion =
    state.role === "buyer" && carState.publishedSnapshot
      ? carState.publishedSnapshot.conclusion
      : carState.conclusion || carState.publishedSnapshot?.conclusion || "";
  const critical = (scores.criticalFaults || [])
    .map((item) => `<li>${item.name}: ${item.score}</li>`)
    .join("");
  const tables = DIRECTIONS.map((direction) => {
    if (state.role === "master" && carState.assignments[direction.slug]?.masterId !== state.masterId) {
      return "";
    }
    const dirScore = scores.directionScores.find((item) => item.id === direction.slug);
    const body = direction.checkpoints
      .map((checkpoint) => {
        const result = carState.results[direction.slug][checkpoint.slug];
        const internal =
          canSeeInternal() && result.internalComment
            ? `<div class="internal">Внутреннее (не для покупателя): ${escapeHtml(result.internalComment)}</div>`
            : "";
        return `<tr>
          <td>${checkpoint.name}${checkpoint.isCritical ? " · критичный" : ""}</td>
          <td>${result.score ?? "н/п"}</td>
          <td>${escapeHtml(result.versionNote || "—")}</td>
          <td>${escapeHtml(result.publicComment || "—")}${internal}</td>
        </tr>`;
      })
      .join("");
    return `<section class="sheet-block">
      <h2>${direction.name} — ${formatScore(dirScore?.score ?? null)} <small>покрытие ${coveragePercent(dirScore?.coverage ?? 0)}</small></h2>
      <table>
        <thead><tr><th>Узел</th><th>Оценка</th><th>Версия</th><th>Комментарий</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </section>`;
  }).join("");
  return `${header()}
    <main class="wrap report">
      <a class="back no-print" href="#/c/${car.id}">← К карточке</a>
      <p class="tag">Учебный аукционный лист</p>
      <h1>Акт осмотра: ${car.make} ${car.model}, ${car.year}</h1>
      <p class="watermark">ДЕМОНСТРАЦИЯ · НЕ РЕАЛЬНЫЙ ОСМОТР</p>
      <div class="media-ph">${carSvg()}<span>Схема-заполнитель, не фото реального осмотра</span></div>
      <div class="score-hero">
        <strong>${formatScore(scores.displayedScore)}</strong>
        <span>Итог / покрытие ${coveragePercent(scores.coverage)} (${scores.checked} из ${scores.total})</span>
      </div>
      <p class="disclaimer">${FORMULA_DISCLAIMER}</p>
      <dl class="facts">
        <div><dt>Пробег</dt><dd>${car.mileage.toLocaleString("ru-RU")} км</dd></div>
        <div><dt>Идентификация</dt><dd>${car.vin}; ${car.plate}</dd></div>
        <div><dt>Статус</dt><dd>${STATUS_LABEL[carState.status]}</dd></div>
      </dl>
      ${critical ? `<section><h2>Критичные замечания</h2><ul>${critical}</ul></section>` : ""}
      <section><h2>Итоговое заключение</h2><p>${escapeHtml(conclusion || "Заключение ещё не заполнено в этой демонстрации.")}</p></section>
      ${tables}
      <div class="no-print">
        <button type="button" class="btn" id="printReport">Печать / сохранить как PDF</button>
        <p class="hint">Откроется диалог печати браузера. Это не серверный экспорт PDF.</p>
        ${renderWhatsApp(car)}
      </div>
    </main>`;
}

function renderAdmin() {
  if (state.role !== "admin") {
    return `${header()}<main class="wrap"><h1>Раздел назначений виден в режиме администратора</h1><p>Это не проверка прав доступа, а переключатель демонстрации.</p></main>`;
  }
  const blocks = SAMPLE_CARS.map((car) => {
    const carState = state.cars[car.id];
    const rows = DIRECTIONS.map((direction) => {
      const assignment = carState.assignments[direction.slug];
      const options = [`<option value="">не назначен</option>`]
        .concat(DEMO_MASTERS.map((master) => `<option value="${master.id}" ${assignment.masterId === master.id ? "selected" : ""}>${master.name}</option>`))
        .join("");
      return `<tr>
        <td>${direction.name}</td>
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
      <button type="button" class="btn" data-publish="${car.id}">Опубликовать учебный отчёт</button>
      <p class="hint">Публикация только меняет состояние в этом браузере. Ссылок-приглашений и серверных грантов здесь нет.</p>
      <p class="action-note hint" role="status"></p>
    </section>`;
  }).join("");
  return `${header()}<main class="wrap"><h1>Демо-назначения и публикация</h1>${blocks}</main>`;
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
  let html = renderHome();
  if (route.name === "car") html = renderCar(route.id);
  if (route.name === "report") html = renderReport(route.id);
  if (route.name === "inspect") html = renderInspect(route.id);
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

function bind() {
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
      const result = state.cars[parseRoute().id].results[dir][cp];
      if (act === "score") result.score = el.value === "" ? null : Number(el.value);
      if (act === "version") result.versionNote = el.value;
      if (act === "public") result.publicComment = el.value;
      if (act === "internal") result.internalComment = el.value;
      const carState = state.cars[parseRoute().id];
      if (carState.status === "created" || carState.status === "published") {
        if (carState.status !== "published") carState.status = "in_progress";
      }
      scheduleSave();
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

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  persist();
  render();
});
