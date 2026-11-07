export const DIRECTION_IMAGES = {
  hodovaya: {
    src: "images/dir-hodovaya.webp",
    alt: "Пружина и амортизатор подвески автомобиля",
  },
  engine: {
    src: "images/dir-engine.webp",
    alt: "Двигатель автомобиля",
  },
  electric: {
    src: "images/dir-electric.webp",
    alt: "Аккумулятор и провода автомобиля",
  },
  body: {
    src: "images/dir-body.webp",
    alt: "Кузов легкового автомобиля",
  },
  interior: {
    src: "images/dir-interior.webp",
    alt: "Передние сиденья и приборная панель",
  },
  geometry: {
    src: "images/dir-geometry.webp",
    alt: "Рама автомобиля и продольные лонжероны",
  },
  wheels: {
    src: "images/dir-wheels.webp",
    alt: "Автомобильное колесо с видимым протектором",
  },
};

export const DIRECTION_ICON_SLUGS = Object.keys(DIRECTION_IMAGES);

export function directionIcon(slug) {
  const item = DIRECTION_IMAGES[slug] || DIRECTION_IMAGES.body;
  return `<img class="dir-photo" data-illustration="${slug}" src="${item.src}" alt="${item.alt}" width="640" height="480">`;
}
