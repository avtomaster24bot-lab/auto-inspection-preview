import { schemeForCar } from "./scheme.js?v=20261108m";

const DISCLAIMER =
  "Иллюстративная схема-образец: не заводской чертёж и не схема конкретного демо-автомобиля.";

function view(spec) {
  return { ...spec };
}

function chassisHodovaya() {
  return view({
    id: "chassis",
    assetId: "hodovaya-chassis-v1",
    src: "images/diagrams/hodovaya-chassis.jpg",
    width: 1600,
    height: 978,
    title: "Рама и подвеска",
    alt: "Реальная автомобильная рама с подвеской, колёсами, рулевым механизмом и частью выпуска, кузов снят",
    caption: "Ходовая часть без кузова: рама, рычаги, ступицы, рулевое и выпуск. Образец, не подвеска демо-авто.",
    source: {
      title: "Chassis with suspension and exhaust system",
      author: "CZmarlin (Christopher Ziemnowicz)",
      license: "CC BY-SA 2.5",
      url: "https://commons.wikimedia.org/wiki/File:Chassis_with_suspension_and_exhaust_system.jpg",
    },
  });
}

function strutHodovaya() {
  return view({
    id: "strut",
    assetId: "hodovaya-strut-v1",
    src: "images/diagrams/hodovaya-strut.jpg",
    width: 2000,
    height: 1468,
    title: "Стойка в разрезе кузова",
    alt: "Передняя стойка McPherson, пружина, тормоз и колесо Holden Calais VE в разрезанном крыле",
    caption: "Передняя стойка и колесо в разрезе кузова Holden Calais VE (2006–2007). Образец, кузов частично снят.",
    source: {
      title: "2006–2007 Holden Calais (VE MY07) sedan, cutaway",
      author: "Kevin (Melbourne)",
      license: "CC BY 2.0",
      url: "https://commons.wikimedia.org/wiki/File:2006-2007_Holden_Calais_(VE_MY07)_sedan,_cutaway_(2007-03-12).jpg",
    },
  });
}

function engineCutaway() {
  return view({
    id: "cutaway",
    assetId: "engine-1nz-v1",
    src: "images/diagrams/engine-1nz.jpg",
    width: 1496,
    height: 983,
    title: "Строение двигателя",
    alt: "Двигатель Toyota 1NZ-FXE рядом с разрезом гибридного блока: генератор и электромотор",
    caption: "Двигатель Toyota 1NZ-FXE и разрез силового блока (генератор / мотор). Образец строения, не мотор демо-авто.",
    source: {
      title: "Toyota 1NZ-FXE Engine 01",
      author: "Hatsukari715",
      license: "Public domain",
      url: "https://commons.wikimedia.org/wiki/File:Toyota_1NZ-FXE_Engine_01.JPG",
    },
  });
}

function engineBay() {
  return view({
    id: "bay",
    assetId: "engine-bay-v1",
    src: "images/diagrams/engine-bay.jpg",
    width: 2000,
    height: 1500,
    title: "Двигатель в моторном отсеке",
    alt: "Поперечный разрез передней части автомобиля: двигатель в моторном отсеке и передние стойки",
    caption: "Двигатель в моторном отсеке, кузов в разрезе. Иллюстративная схема, не заводской чертёж.",
    source: {
      title: "Querschnitt durch einen PKW Motor",
      author: "Philandthrop",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Querschnitt_durch_einen_PKW_Motor.jpg",
    },
  });
}

function electricLayout() {
  return view({
    id: "layout",
    assetId: "electric-layout-v1",
    src: "images/diagrams/electric-layout.png",
    width: 1681,
    height: 753,
    title: "Силовая электросхема",
    alt: "Схема электромобиля с прозрачным контуром кузова: батарея, передний и задний моторы, зарядка",
    caption: "Силовая электросхема электромобиля с контуром кузова: батарея, моторы, зарядка. Не жгут и не генератор конкретного ДВС-авто.",
    source: {
      title: "Electric car diagram",
      author: "Ian Furst",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Electric_car_diagram.svg",
    },
  });
}

function interiorCabin() {
  return view({
    id: "cabin",
    assetId: "interior-cabin-v1",
    src: "images/diagrams/interior-cabin.jpg",
    width: 2000,
    height: 1150,
    title: "Разрез салона",
    alt: "Боковой разрез салона седана: сиденья, панель, руль и жёлтые силовые элементы порогов",
    caption: "Разрез салона Ford Fairmont AU 1998: сиденья, панель, пороги. Образец, не вид сверху и не салон демо-авто.",
    source: {
      title: "1998 Ford Fairmont (AU) Ghia sedan, cutaway 03",
      author: "OSX",
      license: "Public domain",
      url: "https://commons.wikimedia.org/wiki/File:1998_Ford_Fairmont_(AU)_Ghia_sedan,_cutaway_(2015-01-01)_03.jpg",
    },
  });
}

function interiorDash() {
  return view({
    id: "dash",
    assetId: "interior-dash-v1",
    src: "images/diagrams/interior-dash.jpg",
    width: 2000,
    height: 1337,
    title: "Место водителя",
    alt: "Салон у места водителя: руль, панель приборов, сиденья и ковры",
    caption: "Место водителя Ford Fairmont AU 1998: руль, панель, сиденья. Образец комплектации салона.",
    source: {
      title: "1998 Ford Fairmont (AU) Ghia sedan, cutaway 04",
      author: "OSX",
      license: "Public domain",
      url: "https://commons.wikimedia.org/wiki/File:1998_Ford_Fairmont_(AU)_Ghia_sedan,_cutaway_(2015-01-01)_04.jpg",
    },
  });
}

function geometryChassis() {
  return view({
    id: "platform",
    assetId: "geometry-chassis-v1",
    src: "images/diagrams/geometry-chassis.jpg",
    width: 2000,
    height: 900,
    title: "Несущая платформа",
    alt: "Шасси Tesla Model S без кузова: лонжероны, подрамник, пол и точки крепления стоек",
    caption: "Несущая платформа Tesla Model S: лонжероны, подрамник и пол. Образец структуры, не рама демо-авто.",
    source: {
      title: "Tesla Model S chassis",
      author: "Christiankral",
      license: "CC BY 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Tesla_Model_S_chassis.jpg",
    },
  });
}

function geometryUnibody() {
  return view({
    id: "unibody",
    assetId: "geometry-unibody-v1",
    src: "images/diagrams/geometry-unibody.jpg",
    width: 1600,
    height: 1186,
    title: "Схема несущего кузова",
    alt: "Принципиальная схема несущего кузова как фермы: пороги, стойки и вид снизу",
    caption: "Принципиальная схема несущего кузова (ферма / пороги). Иллюстративная, не заводской чертёж лонжеронов.",
    source: {
      title: "Passenger car unibody diagram",
      author: "DL24",
      license: "CC0",
      url: "https://commons.wikimedia.org/wiki/File:Passenger_car_unibody_diagram.jpg",
    },
  });
}

function wheelsTire() {
  return view({
    id: "tire",
    assetId: "wheels-tire-v1",
    src: "images/diagrams/wheels-tire.png",
    width: 1575,
    height: 1011,
    title: "Строение шины",
    alt: "Подписанный разрез радиальной шины: протектор, каркас, брекер, борт",
    caption: "Строение радиальной шины в разрезе. Иллюстративная схема, не конкретная покрышка демо-авто.",
    source: {
      title: "Radial Tire (Structure)",
      author: "MagentaGreen",
      license: "CC BY-SA 3.0",
      url: "https://commons.wikimedia.org/wiki/File:Radial_Tire_(Structure).svg",
    },
  });
}

function bodyViews(car, { includeFrontTag = true } = {}) {
  const scheme = schemeForCar(car);
  return [
    view({
      id: "top",
      assetId: `body-top-${scheme.kind}-v1`,
      src: scheme.top.src,
      width: scheme.top.width,
      height: scheme.top.height,
      title: "Вид сверху",
      alt: scheme.top.alt,
      caption: `${scheme.title}. Вид сверху для отметок по панелям кузова.`,
      frontTag: includeFrontTag ? "Передняя часть" : "",
      source: {
        title: scheme.source.patent,
        author: scheme.source.inventors,
        license: scheme.source.license,
        url: scheme.source.url,
      },
    }),
    view({
      id: "side",
      assetId: `body-side-${scheme.kind}-v1`,
      src: scheme.side.src,
      width: scheme.side.width,
      height: scheme.side.height,
      title: "Вид сбоку",
      alt: scheme.side.alt,
      caption: `${scheme.title}. Вид сбоку для отметок по панелям кузова.`,
      frontTag: includeFrontTag ? "Передняя часть" : "",
      source: {
        title: scheme.source.patent,
        author: scheme.source.inventors,
        license: scheme.source.license,
        url: scheme.source.url,
      },
    }),
  ];
}

function wheelsPosition(car) {
  const scheme = schemeForCar(car);
  return view({
    id: "positions",
    assetId: `wheels-top-${scheme.kind}-v1`,
    src: scheme.top.src,
    width: scheme.top.width,
    height: scheme.top.height,
    title: "Положение колёс",
    alt: `Положение четырёх колёс на виде сверху: ${scheme.top.alt}`,
    caption: `Положение колёс на виде сверху. ${scheme.title}.`,
    frontTag: "Передняя часть",
    source: {
      title: scheme.source.patent,
      author: scheme.source.inventors,
      license: scheme.source.license,
      url: scheme.source.url,
    },
  });
}

export function diagramsForDirection(slug, car = {}) {
  const packs = {
    hodovaya: {
      slug: "hodovaya",
      disclaimer: DISCLAIMER,
      views: [chassisHodovaya(), strutHodovaya()],
    },
    body: {
      slug: "body",
      disclaimer: DISCLAIMER,
      views: bodyViews(car),
    },
    engine: {
      slug: "engine",
      disclaimer: DISCLAIMER,
      views: [engineCutaway(), engineBay()],
    },
    electric: {
      slug: "electric",
      disclaimer: DISCLAIMER,
      views: [electricLayout()],
    },
    interior: {
      slug: "interior",
      disclaimer: `${DISCLAIMER} Для салона показан боковой разрез, а не вид сверху: точного свободно лицензированного плана салона сверху не найдено.`,
      views: [interiorCabin(), interiorDash()],
    },
    geometry: {
      slug: "geometry",
      disclaimer: DISCLAIMER,
      views: [geometryChassis(), geometryUnibody()],
    },
    wheels: {
      slug: "wheels",
      disclaimer: DISCLAIMER,
      views: [wheelsPosition(car), wheelsTire()],
    },
  };
  return packs[slug] || { slug, disclaimer: DISCLAIMER, views: [] };
}

export function listDiagramAssets(car = { bodyType: "sedan" }) {
  const seen = new Set();
  const assets = [];
  for (const slug of ["hodovaya", "body", "engine", "electric", "interior", "geometry", "wheels"]) {
    for (const item of diagramsForDirection(slug, car).views) {
      if (seen.has(item.src)) continue;
      seen.add(item.src);
      assets.push(item);
    }
  }
  return assets;
}

export function listAllDiagramSources() {
  return listDiagramAssets().map((item) => item.source);
}
