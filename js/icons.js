function frame(slug, inner) {
  return `<svg class="dir-svg" data-illustration="${slug}" viewBox="0 0 200 140" width="200" height="140" aria-hidden="true" focusable="false">
    <rect width="200" height="140" fill="#dce8df"/>
    ${inner}
  </svg>`;
}

const ICONS = {
  hodovaya: frame(
    "hodovaya",
    `
    <rect x="10" y="124" width="180" height="6" rx="3" fill="#c9b8a0"/>
    <rect x="28" y="22" width="144" height="12" rx="4" fill="#0f3d2e"/>
    <circle cx="46" cy="112" r="22" fill="#1c1916"/>
    <circle cx="46" cy="112" r="13" fill="#4a4038"/>
    <circle cx="46" cy="112" r="5" fill="#c4a35a"/>
    <circle cx="154" cy="112" r="22" fill="#1c1916"/>
    <circle cx="154" cy="112" r="13" fill="#4a4038"/>
    <circle cx="154" cy="112" r="5" fill="#c4a35a"/>
    <rect x="46" y="107" width="108" height="10" rx="4" fill="#5a5348"/>
    <path d="M46 107L72 70h28" fill="none" stroke="#1b5b43" stroke-width="7" stroke-linecap="round"/>
    <polyline points="78,70 90,62 68,54 90,46 68,38 88,30 78,24" fill="none" stroke="#c4a35a" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="108" y="42" width="16" height="46" rx="5" fill="#1b5b43"/>
    <rect x="112" y="26" width="8" height="20" rx="2" fill="#0f3d2e"/>
    <rect x="104" y="84" width="24" height="10" rx="3" fill="#0f3d2e"/>
    <path d="M154 107L136 74" fill="none" stroke="#1b5b43" stroke-width="7" stroke-linecap="round"/>
    `,
  ),
  engine: frame(
    "engine",
    `
    <path d="M56 108h88l-10 18H66z" fill="#3a332c"/>
    <rect x="48" y="58" width="104" height="52" rx="7" fill="#0f3d2e"/>
    <rect x="56" y="66" width="7" height="36" fill="#1b5b43"/>
    <rect x="68" y="66" width="7" height="36" fill="#1b5b43"/>
    <rect x="80" y="66" width="7" height="36" fill="#1b5b43"/>
    <rect x="64" y="30" width="24" height="34" rx="4" fill="#246347"/>
    <rect x="92" y="30" width="24" height="34" rx="4" fill="#246347"/>
    <rect x="120" y="30" width="24" height="34" rx="4" fill="#246347"/>
    <rect x="69" y="40" width="14" height="16" rx="2" fill="#c4a35a"/>
    <rect x="97" y="38" width="14" height="18" rx="2" fill="#c4a35a"/>
    <rect x="125" y="42" width="14" height="14" rx="2" fill="#c4a35a"/>
    <rect x="60" y="20" width="88" height="16" rx="4" fill="#1b5b43"/>
    <circle cx="38" cy="86" r="18" fill="#c4a35a"/>
    <circle cx="38" cy="86" r="7" fill="#1c1916"/>
    <path d="M38 68c-16 10-16 26 0 36" fill="none" stroke="#3a332c" stroke-width="5"/>
    <path d="M152 70h22v8h-8v22" fill="none" stroke="#5a5348" stroke-width="7" stroke-linecap="round"/>
    `,
  ),
  electric: frame(
    "electric",
    `
    <rect x="50" y="44" width="100" height="66" rx="8" fill="#0f3d2e"/>
    <rect x="62" y="56" width="76" height="6" fill="#1b5b43"/>
    <rect x="62" y="70" width="76" height="6" fill="#1b5b43"/>
    <rect x="62" y="84" width="76" height="6" fill="#1b5b43"/>
    <rect x="68" y="26" width="24" height="20" rx="3" fill="#c4a35a"/>
    <path d="M80 30v12M74 36h12" stroke="#1c1916" stroke-width="3" stroke-linecap="round"/>
    <rect x="108" y="26" width="24" height="20" rx="3" fill="#d7e4da"/>
    <path d="M114 36h12" stroke="#1c1916" stroke-width="3" stroke-linecap="round"/>
    <path d="M80 26C40 8 22 48 16 88" fill="none" stroke="#a33b2b" stroke-width="8" stroke-linecap="round"/>
    <path d="M120 26c42-16 58 22 64 64" fill="none" stroke="#1c1916" stroke-width="8" stroke-linecap="round"/>
    <path d="M104 64l-10 16h12l-8 20 24-24h-12l8-12z" fill="#f4e3b2"/>
    `,
  ),
  body: frame(
    "body",
    `
    <path d="M18 96c8-28 28-40 52-44l18-22h50l20 22c28 2 40 20 46 44" fill="#0f3d2e"/>
    <path d="M50 52l14-16h40l14 16" fill="#1b5b43"/>
    <rect x="54" y="56" width="28" height="18" rx="3" fill="#c4a35a"/>
    <rect x="90" y="56" width="36" height="18" rx="3" fill="#efe2c6"/>
    <rect x="134" y="70" width="28" height="20" rx="4" fill="#d7e4da"/>
    <path d="M28 78h24v18H28z" fill="#246347"/>
    <circle cx="58" cy="104" r="14" fill="#1c1916"/>
    <circle cx="58" cy="104" r="6" fill="#c4a35a"/>
    <circle cx="148" cy="104" r="14" fill="#1c1916"/>
    <circle cx="148" cy="104" r="6" fill="#c4a35a"/>
    <path d="M36 114h128" stroke="#c9b8a0" stroke-width="4" stroke-linecap="round"/>
    `,
  ),
  interior: frame(
    "interior",
    `
    <rect x="16" y="78" width="168" height="12" rx="4" fill="#3a332c"/>
    <rect x="22" y="52" width="70" height="28" rx="6" fill="#1b5b43"/>
    <rect x="30" y="58" width="24" height="14" rx="2" fill="#d7e4da"/>
    <rect x="58" y="58" width="24" height="14" rx="2" fill="#d7e4da"/>
    <circle cx="64" cy="70" r="18" fill="none" stroke="#c4a35a" stroke-width="6"/>
    <circle cx="64" cy="70" r="4" fill="#c4a35a"/>
    <path d="M108 34h36c10 0 16 8 16 16v14H108V34z" fill="#1b5b43"/>
    <path d="M104 62h56c10 0 14 10 10 20l-10 22H116L102 82c-4-10-2-20 2-20z" fill="#0f3d2e"/>
    <path d="M120 78h22" stroke="#d7e4da" stroke-width="4" stroke-linecap="round"/>
    <rect x="20" y="96" width="160" height="18" rx="4" fill="#c9b8a0"/>
    `,
  ),
  geometry: frame(
    "geometry",
    `
    <path d="M28 40h144v16H28z" fill="#0f3d2e"/>
    <path d="M28 88h144v16H28z" fill="#0f3d2e"/>
    <rect x="40" y="40" width="14" height="64" fill="#c4a35a"/>
    <rect x="93" y="40" width="14" height="64" fill="#c4a35a"/>
    <rect x="146" y="40" width="14" height="64" fill="#c4a35a"/>
    <path d="M22 28h16M162 28h16M22 116h16M162 116h16" stroke="#1b5b43" stroke-width="4" stroke-linecap="round"/>
    <path d="M30 30h140M30 114h140" stroke="#1b5b43" stroke-width="2" stroke-dasharray="6 5"/>
    <path d="M24 70h8M168 70h8" stroke="#c4a35a" stroke-width="4" stroke-linecap="round"/>
    `,
  ),
  wheels: frame(
    "wheels",
    `
    <circle cx="100" cy="72" r="50" fill="#1c1916"/>
    <path d="M100 24l4 10-8 2 8 6-10 0 8 8-10-2 6 10-8-6 2 10-8-8 0 10-8-8-2 8-6-10-6 8-2-10-8 4 2-10-10 0 6-8-10-2 10-4-8-8 10 2-4-10 10 4 2-10 8 8 6-10 6 10 8-6z" fill="#3a332c"/>
    <circle cx="100" cy="72" r="28" fill="#4a4038"/>
    <circle cx="100" cy="72" r="10" fill="#c4a35a"/>
    <path d="M100 48v14M100 82v14M76 72h14M110 72h14M82 54l10 10M108 80l10 10M82 90l10-10M108 64l10-10" stroke="#d7e4da" stroke-width="5" stroke-linecap="round"/>
    <rect x="146" y="30" width="10" height="18" rx="3" fill="#c4a35a"/>
    `,
  ),
};

export function directionIcon(slug) {
  return ICONS[slug] || ICONS.body;
}

export const DIRECTION_ICON_SLUGS = Object.keys(ICONS);
