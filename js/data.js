import { computeScores } from "./scoring.js?v=20261108e";

export const DIRECTIONS = [
  {
    name: "Ходовая часть",
    slug: "hodovaya",
    weight: 1.2,
    checkpoints: [
      ["amort-front", "Амортизаторы передние"],
      ["amort-rear", "Амортизаторы задние"],
      ["springs-front", "Пружины передние"],
      ["springs-rear", "Пружины задние"],
      ["hubs-front", "Ступицы передние"],
      ["hubs-rear", "Ступицы задние"],
      ["cv-inner", "ШРУСы внутренние"],
      ["cv-outer", "ШРУСы наружные"],
      ["control-arms-front", "Рычаги передние"],
      ["silent-blocks", "Сайлентблоки"],
      ["steering-rack", "Рулевая рейка", true],
      ["steering-rods", "Рулевые тяги"],
      ["tie-rod-ends", "Наконечники рулевых тяг"],
      ["discs-front", "Тормозные диски передние"],
      ["discs-rear", "Тормозные диски задние"],
      ["pads", "Тормозные колодки"],
      ["calipers", "Суппорты"],
      ["hub-bearings", "Подшипники ступиц"],
      ["sway-bar", "Стабилизатор поперечной устойчивости"],
      ["sway-bushings", "Втулки стабилизатора"],
      ["sway-links", "Стойки стабилизатора"],
    ],
  },
  {
    name: "Двигатель",
    slug: "engine",
    weight: 1.4,
    checkpoints: [
      ["startup", "Запуск на холодную и горячую"],
      ["noises", "Посторонние шумы"],
      ["oil-leaks", "Утечки масла"],
      ["coolant-leaks", "Утечки охлаждающей жидкости"],
      ["timing", "Ремень / цепь ГРМ", true],
      ["compression", "Компрессия (по данным проверки)", true],
      ["intake", "Система впуска"],
      ["exhaust", "Система выпуска"],
      ["turbo", "Турбина (если установлена)", true],
      ["radiator", "Радиатор и патрубки"],
      ["engine-mounts", "Подушки двигателя"],
      ["oil-condition", "Состояние масла"],
      ["ignition", "Свечи / катушки зажигания"],
      ["fuel", "Топливная система"],
    ],
  },
  {
    name: "Электроприборы и электрооборудование",
    slug: "electric",
    weight: 1,
    checkpoints: [
      ["battery", "АКБ"],
      ["alternator", "Генератор"],
      ["starter", "Стартер"],
      ["headlights", "Оптика головная"],
      ["taillights", "Задние фонари"],
      ["turn-signals", "Указатели поворота"],
      ["wipers", "Стеклоочистители"],
      ["central-lock", "Центральный замок"],
      ["windows", "Стеклоподъёмники"],
      ["ecu-errors", "Ошибки ЭБУ (сканер)", true],
      ["media", "Мультимедиа"],
      ["parking-sensors", "Камера / парктроники"],
      ["heaters", "Подогревы"],
      ["wiring", "Видимая проводка"],
    ],
  },
  {
    name: "Кузов",
    slug: "body",
    weight: 1.3,
    checkpoints: [
      ["paint", "ЛКП, толщина, перекрасы"],
      ["hood", "Капот"],
      ["trunk", "Крышка багажника"],
      ["roof", "Крыша"],
      ["bumper-front", "Передний бампер"],
      ["bumper-rear", "Задний бампер"],
      ["fender-fl", "Крыло переднее левое"],
      ["fender-fr", "Крыло переднее правое"],
      ["door-fl", "Дверь передняя левая"],
      ["door-fr", "Дверь передняя правая"],
      ["door-rl", "Дверь задняя левая"],
      ["door-rr", "Дверь задняя правая"],
      ["sills", "Пороги"],
      ["gaps", "Кузовные зазоры"],
      ["corrosion", "Коррозия", true],
      ["accident-traces", "Следы ДТП", true],
    ],
  },
  {
    name: "Салон",
    slug: "interior",
    weight: 0.8,
    checkpoints: [
      ["seat-driver", "Сиденье водителя"],
      ["seats-other", "Сиденья пассажирские"],
      ["headliner", "Обшивка потолка"],
      ["dashboard", "Панель приборов"],
      ["steering-wheel", "Руль"],
      ["carpets-moisture", "Ковры / следы влаги"],
      ["odor", "Запах"],
      ["seatbelts", "Ремни безопасности"],
      ["climate", "Климат-контроль / печка"],
      ["rattles", "Посторонние шумы в салоне"],
    ],
  },
  {
    name: "Геометрия / Лонжероны",
    slug: "geometry",
    weight: 1.5,
    checkpoints: [
      ["longeron-fl", "Лонжерон передний левый", true],
      ["longeron-fr", "Лонжерон передний правый", true],
      ["longeron-rl", "Лонжерон задний левый", true],
      ["longeron-rr", "Лонжерон задний правый", true],
      ["strut-towers", "Стаканы опор", true],
      ["body-geometry", "Геометрия кузова (измерение)", true],
      ["underbody", "Днище / силовые элементы", true],
      ["suspension-points", "Точки крепления подвески"],
    ],
  },
  {
    name: "Колёса и резина",
    slug: "wheels",
    weight: 0.7,
    checkpoints: [
      ["rims", "Диски"],
      ["tires-front", "Шины передние"],
      ["tires-rear", "Шины задние"],
      ["tire-date", "Дата производства шин"],
      ["tread", "Остаток протектора"],
      ["tire-damage", "Грыжи и порезы", true],
      ["spare", "Запасное колесо"],
      ["tpms", "Датчики давления TPMS"],
    ],
  },
].map((direction) => ({
  ...direction,
  checkpoints: direction.checkpoints.map(([slug, name, isCritical]) => ({
    slug,
    name,
    isCritical: Boolean(isCritical),
    weight: 1,
  })),
}));

export const DIRECTION_DISPLAY_ORDER = ["hodovaya", "body", "engine", "electric", "interior", "geometry", "wheels"];

export function orderedDirections(list = DIRECTIONS) {
  const rank = new Map(DIRECTION_DISPLAY_ORDER.map((slug, index) => [slug, index]));
  return [...list].sort((a, b) => (rank.get(a.slug) ?? 99) - (rank.get(b.slug) ?? 99));
}

export const DEMO_MASTERS = [
  { id: "master-1", name: "Демо-мастер №1", directions: ["hodovaya", "wheels"] },
  { id: "master-2", name: "Демо-мастер №2", directions: ["engine", "electric"] },
  { id: "master-3", name: "Демо-мастер №3", directions: ["body", "interior", "geometry"] },
];

export const ROLES = [
  { id: "buyer", label: "Покупатель" },
  { id: "seller", label: "Продавец" },
  { id: "master", label: "Мастер" },
  { id: "admin", label: "Администратор" },
];

const SAMPLE_NOTES = {
  "steering-rack": {
    score: 8,
    versionNote: "оригинал (демо-пометка)",
    publicComment: "Люфта не замечено на этом учебном примере.",
    internalComment: "Внутренняя заметка только для демо-админа/мастера: не публиковать покупателю.",
  },
  corrosion: {
    score: 4,
    versionNote: "пример состояния",
    publicComment: "На учебном рисунке отмечена зона, как если бы была поверхностная коррозия порога.",
    internalComment: "Служебная пометка: это не осмотр реального кузова.",
  },
  "longeron-fl": {
    score: 3,
    versionNote: "демо-оценка",
    publicComment: "В этом образце критичный узел специально оценён низко, чтобы показать блок замечаний.",
    internalComment: "Внутренний комментарий: синтетический сценарий, не ДТП.",
  },
  "tire-damage": {
    score: 7,
    versionNote: "пример",
    publicComment: "Грыж на схеме не отмечено — оценка для демонстрации шкалы.",
  },
  turbo: {
    score: null,
    versionNote: "",
    publicComment: "",
  },
};

function hashScore(slug, salt) {
  let n = salt;
  for (const ch of slug) n = (n + ch.charCodeAt(0) * 17) % 97;
  return 6 + (n % 4);
}

function makeResults(pattern) {
  const results = {};
  for (const direction of DIRECTIONS) {
    results[direction.slug] = {};
    direction.checkpoints.forEach((checkpoint, index) => {
      const preset = SAMPLE_NOTES[checkpoint.slug];
      if (preset) {
        results[direction.slug][checkpoint.slug] = { ...preset };
        return;
      }
      const skip = pattern.skip?.includes(`${direction.slug}:${checkpoint.slug}`) || (pattern.skipEvery && index % pattern.skipEvery === pattern.skipIndex);
      results[direction.slug][checkpoint.slug] = {
        score: skip ? null : hashScore(checkpoint.slug, pattern.salt),
        versionNote: skip ? "" : "демо",
        publicComment: skip ? "" : "Учебный комментарий к узлу, не результат реального осмотра.",
        internalComment: skip ? "" : "Скрытая демо-заметка мастера.",
      };
    });
  }
  return results;
}

function allReviewedAssignments() {
  const assignments = {};
  for (const master of DEMO_MASTERS) {
    for (const slug of master.directions) {
      assignments[slug] = { masterId: master.id, status: "reviewed", reviewNote: "Демо: принято условно, только в этом браузере." };
    }
  }
  return assignments;
}

function emptyResults() {
  const results = {};
  for (const direction of DIRECTIONS) {
    results[direction.slug] = {};
    for (const checkpoint of direction.checkpoints) {
      results[direction.slug][checkpoint.slug] = {
        score: null,
        versionNote: "",
        publicComment: "",
        internalComment: "",
      };
    }
  }
  return results;
}

function scoreInputFromResults(results) {
  return DIRECTIONS.map((direction) => ({
    id: direction.slug,
    name: direction.name,
    weight: direction.weight,
    checkpoints: direction.checkpoints.map((checkpoint) => ({
      id: checkpoint.slug,
      name: checkpoint.name,
      weight: checkpoint.weight,
      isCritical: checkpoint.isCritical,
      score: results[direction.slug]?.[checkpoint.slug]?.score ?? null,
    })),
  }));
}

const publishedResults = makeResults({ salt: 11, skipEvery: 11, skipIndex: 0 });
const publishedScores = computeScores(scoreInputFromResults(publishedResults));

const inProgressResults = makeResults({ salt: 29, skipEvery: 3, skipIndex: 1 });
const inProgressAssignments = allReviewedAssignments();
inProgressAssignments.geometry = { masterId: "master-3", status: "draft", reviewNote: "" };
inProgressAssignments.interior = { masterId: "master-3", status: "submitted", reviewNote: "" };

export const SAMPLE_CARS = [
  {
    id: "primer-sedan",
    code: "primer-sedan",
    label: "Демо-образец 1",
    make: "ПримерМарка",
    model: "Седан А",
    year: 2019,
    mileage: 87400,
    color: "графитовый (пример цвета)",
    plate: "НЕ госномер — демо",
    vin: "НЕ VIN — демо-образец A",
    trim: "учебная комплектация",
    summary: "Вымышленный седан для показа карточки, отчёта и кнопки WhatsApp.",
    image: "images/car-sedan.webp",
    imageAlt: "Учебная иллюстрация седана, не фото реального осмотра",
  },
  {
    id: "primer-universal",
    code: "primer-universal",
    label: "Демо-образец 2",
    make: "ПримерМарка",
    model: "Универсал Б",
    year: 2016,
    mileage: 142300,
    color: "синий (пример цвета)",
    plate: "НЕ госномер — демо",
    vin: "НЕ VIN — демо-образец B",
    trim: "учебная комплектация",
    summary: "Вымышленный универсал со статусом «в работе у мастеров».",
    image: "images/car-wagon.webp",
    imageAlt: "Учебная иллюстрация универсала, не фото реального осмотра",
  },
  {
    id: "primer-crossover",
    code: "primer-crossover",
    label: "Демо-образец 3",
    make: "ПримерМарка",
    model: "Кроссовер В",
    year: 2021,
    mileage: 31200,
    color: "белый (пример цвета)",
    plate: "НЕ госномер — демо",
    vin: "НЕ VIN — демо-образец C",
    trim: "учебная комплектация",
    summary: "Вымышленный кроссовер без публикации — можно провести демо-процесс с нуля.",
    image: "images/car-crossover.webp",
    imageAlt: "Учебная иллюстрация кроссовера, не фото реального осмотра",
  },
];

export function emptyDirectionNotes() {
  return Object.fromEntries(
    DIRECTIONS.map((direction) => [direction.slug, { publicComment: "", internalComment: "" }]),
  );
}

export function ensureCarShape(carState) {
  if (!carState || typeof carState !== "object") return carState;
  if (!carState.directionNotes) carState.directionNotes = emptyDirectionNotes();
  for (const direction of DIRECTIONS) {
    const current = carState.directionNotes[direction.slug] || {};
    carState.directionNotes[direction.slug] = {
      publicComment: current.publicComment || "",
      internalComment: current.internalComment || "",
    };
  }
  const named = carState.publishedSnapshot?.scores?.directionScores;
  if (Array.isArray(named)) {
    for (const item of named) {
      const catalog = DIRECTIONS.find((direction) => direction.slug === item.id);
      if (catalog) item.name = catalog.name;
    }
  }
  return carState;
}

export function createDefaultState() {
  return {
    version: 1,
    role: "buyer",
    masterId: "master-1",
    cars: {
      "primer-sedan": {
        status: "published",
        conclusion:
          "Демо-заключение: это учебный образец отчёта, а не осмотр реального автомобиля. Формула proposed-v1, непроверенные узлы исключены.",
        assignments: allReviewedAssignments(),
        results: publishedResults,
        directionNotes: emptyDirectionNotes(),
        publishedSnapshot: {
          createdAt: "2026-11-01T12:00:00+05:00",
          scores: publishedScores,
          conclusion:
            "Демо-заключение: это учебный образец отчёта, а не осмотр реального автомобиля. Формула proposed-v1, непроверенные узлы исключены.",
        },
      },
      "primer-universal": {
        status: "in_progress",
        conclusion: "",
        assignments: inProgressAssignments,
        results: inProgressResults,
        directionNotes: emptyDirectionNotes(),
        publishedSnapshot: null,
      },
      "primer-crossover": {
        status: "created",
        conclusion: "",
        assignments: Object.fromEntries(
          DIRECTIONS.map((direction) => {
            const master = DEMO_MASTERS.find((item) => item.directions.includes(direction.slug));
            return [direction.slug, { masterId: master?.id ?? "", status: "pending", reviewNote: "" }];
          }),
        ),
        results: emptyResults(),
        directionNotes: emptyDirectionNotes(),
        publishedSnapshot: null,
      },
    },
  };
}

export function carMeta(id) {
  return SAMPLE_CARS.find((item) => item.id === id) || null;
}

export function liveScoresForCar(carState) {
  return computeScores(scoreInputFromResults(carState.results));
}

export { scoreInputFromResults };
