import type { GalleryPhoto } from '../types';

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

export const DEFAULT_POSTCARDS: GalleryPhoto[] = [
  {
    id: 'default-starlight',
    caption: 'Winter Starlight',
    isDefault: true,
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
        <defs>
          <linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0b1530"/>
            <stop offset="60%" stop-color="#192a54"/>
            <stop offset="100%" stop-color="#2c3e68"/>
          </linearGradient>
          <radialGradient id="moonGlow" cx="72%" cy="24%" r="28%">
            <stop offset="0%" stop-color="#fff4d2" stop-opacity="0.9"/>
            <stop offset="40%" stop-color="#ffd98a" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#ffd98a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="600" height="600" fill="url(#sky1)"/>
        <rect width="600" height="600" fill="url(#moonGlow)"/>
        <circle cx="432" cy="144" r="42" fill="#fff3cf"/>
        <circle cx="448" cy="134" r="38" fill="#132145"/>
        <g fill="#ffe8b0">
          <circle cx="110" cy="100" r="3"/><circle cx="190" cy="150" r="2.2"/>
          <circle cx="280" cy="88" r="2.8"/><circle cx="340" cy="180" r="2"/>
          <circle cx="515" cy="95" r="2.6"/><circle cx="145" cy="240" r="1.8"/>
          <circle cx="505" cy="245" r="2.2"/><circle cx="250" cy="215" r="2.5"/>
          <circle cx="80" cy="195" r="2"/><circle cx="370" cy="110" r="1.8"/>
        </g>
        <path d="M0 445 Q150 400 310 435 T600 420 L600 600 L0 600 Z" fill="#13203d"/>
        <path d="M0 490 Q200 445 380 480 T600 465 L600 600 L0 600 Z" fill="#dce7f7"/>
        <polygon points="150,480 215,310 280,480" fill="#1d3d3c"/>
        <polygon points="165,430 215,285 265,430" fill="#234d4a"/>
        <polygon points="215,268 222,286 240,286 226,297 231,314 215,304 199,314 204,297 190,286 208,286" fill="#ffd98a"/>
        <g fill="#ffd98a">
          <circle cx="204" cy="340" r="4"/><circle cx="228" cy="368" r="4.5"/>
          <circle cx="195" cy="396" r="4"/><circle cx="235" cy="422" r="4.5"/>
          <circle cx="212" cy="445" r="4"/>
        </g>
        <rect x="370" y="425" width="96" height="62" rx="4" fill="#2f242c"/>
        <polygon points="355,430 418,382 482,430" fill="#4f353b"/>
        <rect x="392" y="446" width="22" height="22" rx="2" fill="#ffd479"/>
        <rect x="426" y="446" width="22" height="22" rx="2" fill="#ffd479"/>
        <text x="300" y="556" text-anchor="middle" fill="#203152" font-family="Georgia,serif" font-style="italic" font-size="28" letter-spacing="3">Silent Night</text>
      </svg>
    `),
  },
  {
    id: 'default-wreath',
    caption: 'Merry Christmas',
    isDefault: true,
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
        <defs>
          <radialGradient id="bg2" cx="50%" cy="46%" r="65%">
            <stop offset="0%" stop-color="#3a1622"/>
            <stop offset="65%" stop-color="#1f0d16"/>
            <stop offset="100%" stop-color="#11080e"/>
          </radialGradient>
        </defs>
        <rect width="600" height="600" fill="url(#bg2)"/>
        <circle cx="300" cy="285" r="158" fill="none" stroke="#285b42" stroke-width="34"/>
        <circle cx="300" cy="285" r="158" fill="none" stroke="#397a58" stroke-width="14" stroke-dasharray="14 12"/>
        <circle cx="300" cy="285" r="134" fill="none" stroke="#ffd98a" stroke-width="2" stroke-opacity="0.6"/>
        <g fill="#d94552">
          <circle cx="300" cy="127" r="11"/><circle cx="437" cy="206" r="10"/>
          <circle cx="437" cy="364" r="11"/><circle cx="300" cy="443" r="10"/>
          <circle cx="163" cy="364" r="11"/><circle cx="163" cy="206" r="10"/>
        </g>
        <g fill="#ffd98a">
          <circle cx="378" cy="148" r="6"/><circle cx="458" cy="285" r="6"/>
          <circle cx="378" cy="422" r="6"/><circle cx="222" cy="422" r="6"/>
          <circle cx="142" cy="285" r="6"/><circle cx="222" cy="148" r="6"/>
        </g>
        <path d="M262 128 L300 156 L338 128 L324 176 L300 162 L276 176 Z" fill="#c93846"/>
        <text x="300" y="278" text-anchor="middle" fill="#ffe4a6" font-family="Georgia,serif" font-style="italic" font-size="44" font-weight="bold">Merry</text>
        <text x="300" y="328" text-anchor="middle" fill="#ffd27d" font-family="Georgia,serif" font-style="italic" font-size="42">Christmas</text>
        <text x="300" y="530" text-anchor="middle" fill="#e8c78a" fill-opacity="0.8" font-family="Georgia,serif" font-size="20" letter-spacing="6">JOY &amp; PEACE</text>
      </svg>
    `),
  },
  {
    id: 'default-aurora',
    caption: 'Aurora Eve',
    isDefault: true,
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
        <defs>
          <linearGradient id="sky3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#071226"/>
            <stop offset="65%" stop-color="#0f2544"/>
            <stop offset="100%" stop-color="#17385c"/>
          </linearGradient>
          <linearGradient id="aurora" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#6ef2c8" stop-opacity="0.65"/>
            <stop offset="50%" stop-color="#69b8ff" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#c39eff" stop-opacity="0.55"/>
          </linearGradient>
        </defs>
        <rect width="600" height="600" fill="url(#sky3)"/>
        <path d="M-20 210 Q140 90 290 185 T620 120 L620 285 Q450 325 300 245 T-20 310 Z" fill="url(#aurora)"/>
        <g fill="#ffffff" fill-opacity="0.85">
          <circle cx="95" cy="82" r="2.2"/><circle cx="220" cy="65" r="2.8"/>
          <circle cx="390" cy="92" r="2.2"/><circle cx="510" cy="74" r="3"/>
          <circle cx="155" cy="195" r="2"/><circle cx="465" cy="215" r="2.5"/>
          <circle cx="310" cy="145" r="2"/><circle cx="545" cy="175" r="2"/>
        </g>
        <polygon points="0,470 140,335 280,470" fill="#112740"/>
        <polygon points="210,475 390,305 580,475" fill="#15314f"/>
        <rect y="465" width="600" height="135" fill="#d9ecff"/>
        <g fill="#0e2a38">
          <polygon points="90,485 115,410 140,485"/>
          <polygon points="150,492 178,405 206,492"/>
          <polygon points="435,490 462,408 489,490"/>
          <polygon points="492,485 516,422 540,485"/>
        </g>
        <text x="300" y="555" text-anchor="middle" fill="#1a3a5c" font-family="Georgia,serif" font-style="italic" font-size="26" letter-spacing="4">Northern Lights</text>
      </svg>
    `),
  },
  {
    id: 'default-lantern',
    caption: 'Warm Wishes',
    isDefault: true,
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
        <defs>
          <radialGradient id="lanternGlow" cx="50%" cy="46%" r="54%">
            <stop offset="0%" stop-color="#fff0c2"/>
            <stop offset="28%" stop-color="#ffb85c" stop-opacity="0.72"/>
            <stop offset="62%" stop-color="#5a2e22" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#110f1d"/>
          </radialGradient>
        </defs>
        <rect width="600" height="600" fill="#110f1d"/>
        <rect width="600" height="600" fill="url(#lanternGlow)"/>
        <line x1="300" y1="0" x2="300" y2="160" stroke="#ffd98a" stroke-width="4" stroke-opacity="0.75"/>
        <path d="M250 175 Q300 145 350 175 L340 198 L260 198 Z" fill="#2c2430"/>
        <rect x="242" y="198" width="116" height="170" rx="14" fill="#fff2cc" fill-opacity="0.88" stroke="#362b38" stroke-width="10"/>
        <line x1="300" y1="198" x2="300" y2="368" stroke="#362b38" stroke-width="6"/>
        <ellipse cx="300" cy="292" rx="22" ry="34" fill="#ff9e3d"/>
        <ellipse cx="300" cy="298" rx="11" ry="20" fill="#fff9e2"/>
        <rect x="234" y="368" width="132" height="20" rx="6" fill="#2c2430"/>
        <g fill="#ffe9b5" fill-opacity="0.85">
          <circle cx="150" cy="210" r="4"/><circle cx="445" cy="190" r="3.5"/>
          <circle cx="170" cy="360" r="3"/><circle cx="430" cy="340" r="4.5"/>
          <circle cx="210" cy="135" r="2.5"/><circle cx="400" cy="430" r="3"/>
        </g>
        <text x="300" y="486" text-anchor="middle" fill="#ffe4ad" font-family="Georgia,serif" font-style="italic" font-size="30" letter-spacing="3">Warm Winter Wishes</text>
      </svg>
    `),
  },
];
