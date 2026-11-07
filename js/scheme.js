const ZONE_LABELS = {
  hodovaya: "Ходовая часть",
  body: "Кузов",
  engine: "Двигатель",
  electric: "Электроприборы и электрооборудование",
  interior: "Салон",
  geometry: "Геометрия / Лонжероны",
  wheels: "Колёса и резина",
};

function zoneClass(zoneClassMap, slug) {
  return `scheme-hit ${zoneClassMap[slug] || ""}`.trim();
}

function hitAttrs(zoneClassMap, slug) {
  const label = ZONE_LABELS[slug] || slug;
  return `class="${zoneClass(zoneClassMap, slug)}" data-select-dir="${slug}" role="button" tabindex="0" aria-label="${label}"`;
}

function criticalMark(x, y, label) {
  return `<g class="scheme-crit-mark" pointer-events="none">
      <circle cx="${x}" cy="${y}" r="8" fill="#c23b2e"/>
      <text x="${x}" y="${y + 4}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">!</text>
      <title>${label}</title>
    </g>`;
}

export function carTopSvg({ zoneClassMap = {}, geometryCritical = false } = {}) {
  const cls = (slug) => zoneClass(zoneClassMap, slug);
  const crit = geometryCritical
    ? criticalMark(320, 180, "Есть критичное замечание в геометрии / лонжеронах")
    : "";
  return `<svg class="scheme-svg scheme-top" viewBox="0 0 760 360" role="img" aria-label="Вид автомобиля сверху: капот, салон, багажник и колёса">
    <defs>
      <linearGradient id="top-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#dce5ee"/>
        <stop offset="48%" stop-color="#c3cfdc"/>
        <stop offset="100%" stop-color="#9aabbb"/>
      </linearGradient>
      <linearGradient id="top-glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#7aa3b6"/>
        <stop offset="50%" stop-color="#b7d5e2"/>
        <stop offset="100%" stop-color="#6d93a6"/>
      </linearGradient>
      <linearGradient id="top-hood" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#c9d4df"/>
        <stop offset="50%" stop-color="#e4ebf2"/>
        <stop offset="100%" stop-color="#c9d4df"/>
      </linearGradient>
    </defs>
    <g class="scheme-art" pointer-events="none">
      <rect class="scheme-wheel" x="168" y="54" width="96" height="38" rx="14"/>
      <rect class="scheme-wheel" x="168" y="268" width="96" height="38" rx="14"/>
      <rect class="scheme-wheel" x="468" y="54" width="96" height="38" rx="14"/>
      <rect class="scheme-wheel" x="468" y="268" width="96" height="38" rx="14"/>
      <path class="scheme-body" fill="url(#top-body)" stroke="#0b1f33" stroke-width="3" d="M128 116 C102 116 90 134 88 156 L88 204 C90 226 102 244 128 244 L192 258 C232 266 286 270 348 270 L458 270 C516 270 562 258 604 240 L652 218 C682 204 700 192 706 180 C700 168 682 156 652 142 L604 120 C562 102 516 90 458 90 L348 90 C286 90 232 94 192 102 Z"/>
      <path class="scheme-trunk" fill="#b7c4d1" stroke="#0b1f33" stroke-width="1.6" d="M126 128 L198 118 L198 242 L126 232 C108 224 102 210 102 180 C102 150 108 136 126 128 Z"/>
      <path class="scheme-glass" fill="url(#top-glass)" stroke="#3d5a6a" stroke-width="1.4" d="M214 124 L282 114 L282 246 L214 236 Z"/>
      <path class="scheme-cabin" fill="#d5dee7" stroke="#0b1f33" stroke-width="1.6" d="M286 112 L498 112 C508 112 512 118 512 126 L512 234 C512 242 508 248 498 248 L286 248 C276 248 272 242 272 234 L272 126 C272 118 276 112 286 112 Z"/>
      <path class="scheme-glass" fill="url(#top-glass)" stroke="#3d5a6a" stroke-width="1.4" d="M518 120 L578 136 L578 224 L518 240 Z"/>
      <path class="scheme-hood" fill="url(#top-hood)" stroke="#0b1f33" stroke-width="1.6" d="M586 132 L648 148 C676 160 694 170 698 180 C694 190 676 200 648 212 L586 228 Z"/>
      <path class="scheme-bumper" fill="#8a97a6" d="M688 156 C704 166 712 174 712 180 C712 186 704 194 688 204 L676 196 C690 188 694 184 694 180 C694 176 690 172 676 164 Z"/>
      <ellipse class="scheme-mirror" cx="500" cy="86" rx="22" ry="10"/>
      <ellipse class="scheme-mirror" cx="500" cy="274" rx="22" ry="10"/>
      <line class="scheme-shut" x1="210" y1="118" x2="210" y2="242"/>
      <line class="scheme-shut" x1="348" y1="112" x2="348" y2="248"/>
      <line class="scheme-spine" x1="118" y1="168" x2="690" y2="168"/>
      <line class="scheme-spine" x1="118" y1="192" x2="690" y2="192"/>
      <rect class="scheme-light" x="678" y="150" width="16" height="18" rx="4"/>
      <rect class="scheme-light" x="678" y="192" width="16" height="18" rx="4"/>
      ${crit}
    </g>
    <g class="scheme-hits">
      <path ${hitAttrs(zoneClassMap, "body")} d="M128 116 C102 116 90 134 88 156 L88 204 C90 226 102 244 128 244 L192 258 C232 266 286 270 348 270 L458 270 C516 270 562 258 604 240 L652 218 C682 204 700 192 706 180 C700 168 682 156 652 142 L604 120 C562 102 516 90 458 90 L348 90 C286 90 232 94 192 102 Z"/>
      <rect ${hitAttrs(zoneClassMap, "geometry")} x="120" y="158" width="560" height="44" rx="10"/>
      <rect ${hitAttrs(zoneClassMap, "interior")} x="274" y="114" width="232" height="132" rx="12"/>
      <path ${hitAttrs(zoneClassMap, "engine")} d="M586 132 L648 148 C676 160 694 170 698 180 C694 190 676 200 648 212 L586 228 Z"/>
      <path ${hitAttrs(zoneClassMap, "electric")} d="M668 146 h36 v28 h-36 z M668 186 h36 v28 h-36 z M590 138 h48 v28 h-48 z"/>
      <rect ${hitAttrs(zoneClassMap, "hodovaya")} x="156" y="46" width="120" height="56" rx="12"/>
      <rect ${hitAttrs(zoneClassMap, "hodovaya")} x="156" y="258" width="120" height="56" rx="12"/>
      <rect ${hitAttrs(zoneClassMap, "hodovaya")} x="456" y="46" width="120" height="56" rx="12"/>
      <rect ${hitAttrs(zoneClassMap, "hodovaya")} x="456" y="258" width="120" height="56" rx="12"/>
      <rect ${hitAttrs(zoneClassMap, "wheels")} x="168" y="54" width="96" height="38" rx="14"/>
      <rect ${hitAttrs(zoneClassMap, "wheels")} x="168" y="268" width="96" height="38" rx="14"/>
      <rect ${hitAttrs(zoneClassMap, "wheels")} x="468" y="54" width="96" height="38" rx="14"/>
      <rect ${hitAttrs(zoneClassMap, "wheels")} x="468" y="268" width="96" height="38" rx="14"/>
    </g>
  </svg>`;
}

export function carSideSvg({ zoneClassMap = {}, geometryCritical = false } = {}) {
  const cls = (slug) => zoneClass(zoneClassMap, slug);
  const crit = geometryCritical
    ? criticalMark(360, 214, "Есть критичное замечание в геометрии / лонжеронах")
    : "";
  return `<svg class="scheme-svg scheme-side" viewBox="0 0 760 300" role="img" aria-label="Вид автомобиля сбоку: крыша, окна, двери, арки и колёса">
    <defs>
      <linearGradient id="side-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e8eef4"/>
        <stop offset="42%" stop-color="#c5d1dc"/>
        <stop offset="100%" stop-color="#8b9aab"/>
      </linearGradient>
      <linearGradient id="side-glass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d4eaf2"/>
        <stop offset="100%" stop-color="#6f94a8"/>
      </linearGradient>
      <linearGradient id="side-rim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e7edf3"/>
        <stop offset="100%" stop-color="#8a96a4"/>
      </linearGradient>
    </defs>
    <g class="scheme-art" pointer-events="none">
      <line class="scheme-ground" x1="40" y1="292" x2="720" y2="292"/>
      <path class="scheme-body" fill="url(#side-body)" stroke="#0b1f33" stroke-width="3" fill-rule="evenodd" d="M92 228 L92 196 C96 172 122 158 158 154 L186 154 L218 108 L258 76 C280 64 318 60 358 60 L468 60 C508 60 532 72 556 98 L592 150 L652 162 C678 168 696 178 708 194 L714 214 L714 228 L587 228 A 56 56 0 0 0 483 228 L257 228 A 56 56 0 0 0 153 228 Z"/>
      <path class="scheme-glass" fill="url(#side-glass)" stroke="#3d5a6a" stroke-width="1.4" d="M228 150 L256 88 L452 88 L530 148 L498 152 L452 116 L358 116 L268 116 Z"/>
      <path class="scheme-pillar" d="M358 88 L368 152 L352 152 L348 88 Z"/>
      <line class="scheme-shut" x1="368" y1="152" x2="368" y2="226"/>
      <line class="scheme-belt" x1="186" y1="152" x2="592" y2="152"/>
      <rect class="scheme-handle" x="318" y="168" width="22" height="6" rx="3"/>
      <rect class="scheme-handle" x="412" y="168" width="22" height="6" rx="3"/>
      <path class="scheme-mirror" d="M528 138 h28 v16 h-18 l-10 -8 z"/>
      <rect class="scheme-light" x="694" y="178" width="18" height="22" rx="5"/>
      <rect class="scheme-taillight" x="94" y="174" width="12" height="28" rx="3"/>
      <g class="scheme-wheel-draw" transform="translate(205 248)">
        <circle r="44" fill="#1a2430"/>
        <circle r="28" fill="url(#side-rim)" stroke="#0b1f33" stroke-width="2"/>
        <circle r="10" fill="#0b1f33"/>
      </g>
      <g class="scheme-wheel-draw" transform="translate(535 248)">
        <circle r="44" fill="#1a2430"/>
        <circle r="28" fill="url(#side-rim)" stroke="#0b1f33" stroke-width="2"/>
        <circle r="10" fill="#0b1f33"/>
      </g>
      ${crit}
    </g>
    <g class="scheme-hits">
      <path ${hitAttrs(zoneClassMap, "body")} d="M186 154 L228 154 L256 88 L258 76 C280 64 318 60 358 60 L368 60 L368 226 L186 226 Z M368 60 L468 60 C508 60 532 72 556 98 L368 226 Z"/>
      <rect ${hitAttrs(zoneClassMap, "geometry")} x="158" y="204" width="400" height="24" rx="6"/>
      <path ${hitAttrs(zoneClassMap, "interior")} d="M228 150 L256 88 L452 88 L530 148 L498 152 L452 116 L358 116 L268 116 Z"/>
      <path ${hitAttrs(zoneClassMap, "engine")} d="M556 98 L592 150 L652 162 C678 168 696 178 708 194 L714 214 L714 228 L587 228 L556 152 Z"/>
      <path ${hitAttrs(zoneClassMap, "electric")} d="M688 172 h28 v40 h-28 z"/>
      <path ${hitAttrs(zoneClassMap, "hodovaya")} d="M149 196 A 62 62 0 0 1 261 196 L261 252 L149 252 Z"/>
      <path ${hitAttrs(zoneClassMap, "hodovaya")} d="M479 196 A 62 62 0 0 1 591 196 L591 252 L479 252 Z"/>
      <circle ${hitAttrs(zoneClassMap, "wheels")} cx="205" cy="248" r="44"/>
      <circle ${hitAttrs(zoneClassMap, "wheels")} cx="535" cy="248" r="44"/>
    </g>
  </svg>`;
}
