const SCHEME_ASSETS = {
  sedan: {
    kind: "sedan",
    bodyTypeLabel: "седан",
    modelName: "Toyota Camry",
    modelYears: "около 2010",
    title: "Схема Toyota Camry (около 2010) · образец кузова седан",
    top: {
      src: "images/schemes/toyota-camry-2010-top.png",
      width: 2400,
      height: 948,
      alt: "Вид сверху: Toyota Camry, около 2010 года, образец кузова седан",
    },
    side: {
      src: "images/schemes/toyota-camry-2010-side.png",
      width: 2400,
      height: 759,
      alt: "Вид сбоку: Toyota Camry, около 2010 года, образец кузова седан",
    },
    source: {
      patent: "USD612299S",
      short: "патент США D612299",
      url: "https://patents.google.com/patent/USD612299S/en",
      usptoPdf: "https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/D612299",
      figures: { top: "FIG. 6", side: "FIG. 2" },
      inventors: "Takafumi Ito, Kazumi Kouwaki, Ryonsuke Yokoi, Takeo Sowa",
      assignee: "Toyota Jidosha Kabushiki Kaisha",
      granted: "2010-03-23",
      license: "Опубликованный патент США на промышленный образец; на титульном листе знака © не указано.",
    },
  },
  wagon: {
    kind: "wagon",
    bodyTypeLabel: "универсал",
    modelName: "Subaru Outback",
    modelYears: "около 2010",
    title: "Схема Subaru Outback (около 2010) · образец кузова универсал",
    top: {
      src: "images/schemes/subaru-outback-2010-top.png",
      width: 2400,
      height: 950,
      alt: "Вид сверху: Subaru Outback, около 2010 года, образец кузова универсал",
    },
    side: {
      src: "images/schemes/subaru-outback-2010-side.png",
      width: 2400,
      height: 861,
      alt: "Вид сбоку: Subaru Outback, около 2010 года, образец кузова универсал",
    },
    source: {
      patent: "USD595185S",
      short: "патент США D595185",
      url: "https://patents.google.com/patent/USD595185S/en",
      usptoPdf: "https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/D595185",
      figures: { top: "FIG. 5", side: "FIG. 6" },
      inventors: "Atsushi Kouchi, Susumu Isomura",
      assignee: "Fuji Jukogyo Kabushiki Kaisha (Subaru)",
      granted: "2009-06-30",
      license: "Опубликованный патент США на промышленный образец; на титульном листе знака © не указано.",
    },
  },
  crossover: {
    kind: "crossover",
    bodyTypeLabel: "кроссовер",
    modelName: "Range Rover Evoque",
    modelYears: "около 2014",
    title: "Схема Range Rover Evoque (около 2014) · образец кузова кроссовер",
    top: {
      src: "images/schemes/range-rover-evoque-2014-top.png",
      width: 2400,
      height: 1124,
      alt: "Вид сверху: Range Rover Evoque, около 2014 года, образец кузова кроссовер",
    },
    side: {
      src: "images/schemes/range-rover-evoque-2014-side.png",
      width: 2400,
      height: 930,
      alt: "Вид сбоку: Range Rover Evoque, около 2014 года, образец кузова кроссовер",
    },
    source: {
      patent: "USD718188S",
      short: "патент США D718188",
      url: "https://patents.google.com/patent/USD718188S1/en",
      usptoPdf: "https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/D718188",
      figures: { top: "FIG. 7", side: "FIG. 3" },
      inventors: "Andrew Wheel, Jeremy Waterman",
      assignee: "Jaguar Land Rover Limited",
      granted: "2014-11-25",
      license: "Опубликованный патент США на промышленный образец; на титульном листе знака © не указано.",
    },
  },
};

export function schemeKindForCar(car = {}) {
  if (car.bodyType && SCHEME_ASSETS[car.bodyType]) return car.bodyType;
  const blob = `${car.id || ""} ${car.code || ""} ${car.model || ""} ${car.summary || ""}`.toLowerCase();
  if (/wagon|universal|универсал/.test(blob)) return "wagon";
  if (/crossover|кроссовер|\bsuv\b/.test(blob)) return "crossover";
  if (/sedan|седан/.test(blob)) return "sedan";
  return "sedan";
}

export function schemeForCar(car = {}) {
  return SCHEME_ASSETS[schemeKindForCar(car)];
}

export function listSchemeAssets() {
  return Object.values(SCHEME_ASSETS);
}

export { SCHEME_ASSETS };
