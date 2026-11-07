function frame(inner) {
  return `<svg class="dir-svg" viewBox="0 0 96 96" width="96" height="96" aria-hidden="true" focusable="false">
    <rect x="2" y="2" width="92" height="92" rx="22" fill="#e7efe9"/>
    ${inner}
  </svg>`;
}

const ICONS = {
  hodovaya: frame(`
    <path d="M18 30h36c6 0 10 4 12 10l8 22H28l-10-8V30z" fill="#0f3d2e"/>
    <rect x="22" y="36" width="14" height="10" rx="2" fill="#d7e4da"/>
    <path d="M62 28v8h6v-8h6v8h6" fill="none" stroke="#c4a35a" stroke-width="3" stroke-linecap="round"/>
    <rect x="68" y="36" width="10" height="22" rx="3" fill="#1b5b43"/>
    <path d="M70 58v8h6v-8h-6z" fill="#0f3d2e"/>
    <path d="M22 68h52" stroke="#c4a35a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="30" cy="72" r="8" fill="#1c1916"/>
    <circle cx="30" cy="72" r="3.5" fill="#c4a35a"/>
    <circle cx="70" cy="72" r="8" fill="#1c1916"/>
    <circle cx="70" cy="72" r="3.5" fill="#c4a35a"/>
  `),
  engine: frame(`
    <rect x="22" y="34" width="48" height="34" rx="6" fill="#0f3d2e"/>
    <rect x="28" y="40" width="16" height="8" rx="2" fill="#d7e4da"/>
    <rect x="48" y="40" width="16" height="8" rx="2" fill="#d7e4da"/>
    <path d="M70 42h8v18h-8" fill="#1b5b43"/>
    <circle cx="30" cy="62" r="5" fill="#c4a35a"/>
    <circle cx="46" cy="62" r="5" fill="#c4a35a"/>
    <circle cx="62" cy="62" r="5" fill="#c4a35a"/>
    <path d="M34 28h16v8H34z" fill="#1b5b43"/>
    <path d="M38 22h8v6h-8z" fill="#c4a35a"/>
    <path d="M20 48h8" stroke="#c4a35a" stroke-width="4" stroke-linecap="round"/>
  `),
  electric: frame(`
    <rect x="26" y="34" width="44" height="32" rx="6" fill="#0f3d2e"/>
    <rect x="32" y="28" width="10" height="8" rx="2" fill="#c4a35a"/>
    <rect x="54" y="28" width="10" height="8" rx="2" fill="#c4a35a"/>
    <path d="M50 40l-10 14h8l-4 14 16-18h-8l6-10z" fill="#f4e3b2"/>
    <path d="M22 50h6" stroke="#1b5b43" stroke-width="4" stroke-linecap="round"/>
    <path d="M68 50h6" stroke="#1b5b43" stroke-width="4" stroke-linecap="round"/>
  `),
  body: frame(`
    <path d="M18 58c4-16 16-24 30-26 10-8 22-8 32 0 10 3 16 12 18 26" fill="#0f3d2e"/>
    <path d="M30 38l8-10h22l8 10" fill="#1b5b43"/>
    <rect x="34" y="40" width="14" height="12" rx="2" fill="#d7e4da"/>
    <rect x="52" y="40" width="16" height="12" rx="2" fill="#d7e4da"/>
    <circle cx="32" cy="64" r="8" fill="#1c1916"/>
    <circle cx="32" cy="64" r="3.2" fill="#c4a35a"/>
    <circle cx="68" cy="64" r="8" fill="#1c1916"/>
    <circle cx="68" cy="64" r="3.2" fill="#c4a35a"/>
    <path d="M24 70h48" stroke="#c9b8a0" stroke-width="3" stroke-linecap="round"/>
  `),
  interior: frame(`
    <path d="M30 30h20c6 0 10 4 10 10v8H30V30z" fill="#1b5b43"/>
    <path d="M28 48h36c6 0 10 6 8 12l-6 14H32L24 60c-2-6 0-12 4-12z" fill="#0f3d2e"/>
    <path d="M62 36c10 2 16 10 18 20" fill="none" stroke="#c4a35a" stroke-width="4" stroke-linecap="round"/>
    <circle cx="78" cy="58" r="4" fill="#c4a35a"/>
    <path d="M36 58h16" stroke="#d7e4da" stroke-width="3" stroke-linecap="round"/>
  `),
  geometry: frame(`
    <path d="M20 38h56v8H20z" fill="#0f3d2e"/>
    <path d="M20 62h56v8H20z" fill="#0f3d2e"/>
    <path d="M28 38v32" stroke="#c4a35a" stroke-width="4"/>
    <path d="M48 38v32" stroke="#c4a35a" stroke-width="4"/>
    <path d="M68 38v32" stroke="#c4a35a" stroke-width="4"/>
    <path d="M18 28h8M70 28h8M18 80h8M70 80h8" stroke="#1b5b43" stroke-width="3" stroke-linecap="round"/>
    <path d="M22 30h52M22 78h52" stroke="#1b5b43" stroke-width="2" stroke-dasharray="4 4"/>
  `),
  wheels: frame(`
    <circle cx="48" cy="50" r="26" fill="#1c1916"/>
    <circle cx="48" cy="50" r="18" fill="#3a332c"/>
    <circle cx="48" cy="50" r="8" fill="#c4a35a"/>
    <path d="M48 32v10M48 58v10M30 50h10M56 50h10M35 37l7 7M54 56l7 7M35 63l7-7M54 44l7-7" stroke="#d7e4da" stroke-width="3" stroke-linecap="round"/>
    <path d="M22 50h-4M78 50h4M48 22v-4M48 82v4" stroke="#0f3d2e" stroke-width="4" stroke-linecap="round"/>
  `),
};

export function directionIcon(slug) {
  return ICONS[slug] || ICONS.body;
}

export const DIRECTION_ICON_SLUGS = Object.keys(ICONS);
