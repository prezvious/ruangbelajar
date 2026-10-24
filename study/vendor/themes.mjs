export const THEME_COLLECTIONS = Object.freeze({
  CLASSIC: 'classic',
  LIGHT: 'light',
  DARK: 'dark'
});

export const THEME_COLLECTION_OPTIONS = Object.freeze([
  Object.freeze({ key: THEME_COLLECTIONS.CLASSIC, label: 'Classic' }),
  Object.freeze({ key: THEME_COLLECTIONS.LIGHT, label: 'Light collection' }),
  Object.freeze({ key: THEME_COLLECTIONS.DARK, label: 'Dark collection' })
]);

const RAW_THEMES = [
  {
    key: 'carbon-paper',
    name: 'Carbon Paper',
    vibe: 'Monochrome discipline with editorial calm and stark focus.',
    colors: ['#111111', '#5F5F5F', '#D8D8D8', '#F7F7F7']
  },
  {
    key: 'powder-blue-notebook',
    name: 'Powder Blue Notebook',
    vibe: 'Soft study calm with tidy sky-blue clarity.',
    colors: ['#B4D7EB', '#F2CDBF', '#E3F1F8', '#2B394D']
  },
  {
    key: 'sea-glass-ledger',
    name: 'Sea Glass Ledger',
    vibe: 'Coastal arithmetic calm with polished glass softness.',
    colors: ['#A7DAD8', '#F4CDB5', '#E8F3E9', '#263C3C']
  },
  {
    key: 'honeydew-harbor',
    name: 'Honeydew Harbor',
    vibe: 'Fresh harbor light with mellow green precision.',
    colors: ['#DDF1BC', '#B8E3DE', '#F3DDA9', '#294247']
  },
  {
    key: 'apothecary-glass',
    name: 'Apothecary Glass',
    vibe: 'Laboratory elegance that feels calm and intelligent.',
    colors: ['#7FAE9B', '#A86B39', '#EFE7DA', '#34373C']
  },
  {
    key: 'sage-whisk',
    name: 'Sage Whisk',
    vibe: 'Fresh garden clarity with herbal poise.',
    colors: ['#84C370', '#BFE1B2', '#E4F4DE', '#1C271B']
  },
  {
    key: 'pistachio-tile',
    name: 'Pistachio Tile',
    vibe: 'Glazed green calm with soft geometric order.',
    colors: ['#D0E7B4', '#B7E1DC', '#F2C8B7', '#344036']
  },
  {
    key: 'matcha-sunrise',
    name: 'Matcha Sunrise',
    vibe: 'Gentle morning focus with creamy matcha warmth.',
    colors: ['#C9E3A2', '#F5D3A3', '#F3EABF', '#33402E']
  },
  {
    key: 'rainwashed-clay',
    name: 'Rainwashed Clay',
    vibe: 'Quiet after-rain balance with softened earthen color.',
    colors: ['#BED2DC', '#D2DEC4', '#ECC2AF', '#323B45']
  },
  {
    key: 'blush-blueprint',
    name: 'Blush Blueprint',
    vibe: 'Drafting-table poise with gentle blush contrast.',
    colors: ['#F3C4D0', '#C3DDEC', '#EAE3C2', '#343D49']
  },
  {
    key: 'peach-graphite',
    name: 'Peach Graphite',
    vibe: 'Warm pastel focus grounded by graphite structure.',
    colors: ['#F6C2B5', '#F4D7A8', '#D9EAD8', '#3A3632']
  },
  {
    key: 'cloudberry-mint',
    name: 'Cloudberry Mint',
    vibe: 'Bright orchard softness with cool mint balance.',
    colors: ['#F4C0B4', '#C7EBD7', '#F6E6BC', '#2E3D38']
  },
  {
    key: 'citrus-draft',
    name: 'Citrus Draft',
    vibe: 'Light citrus energy with measured studio restraint.',
    colors: ['#F4E6A6', '#C4E2C5', '#F4C0AE', '#3B3A30']
  },
  {
    key: 'ink-and-apricot',
    name: 'Ink and Apricot',
    vibe: 'Warm studio calm with editorial clarity.',
    colors: ['#1E2533', '#F4B183', '#E7D5C5', '#6B4D45']
  },
  {
    key: 'paper-lantern',
    name: 'Paper Lantern',
    vibe: 'Editorial warmth with crafted literary calm.',
    colors: ['#E86A33', '#F4E9D8', '#24212C', '#8A2E4F']
  },
  {
    key: 'signal-peach',
    name: 'Signal Peach',
    vibe: 'Optimistic warmth with a precise digital pulse.',
    colors: ['#FFAF87', '#355CDE', '#F2EFEA', '#A5553A']
  },
  {
    key: 'taxi-noir',
    name: 'Taxi Noir',
    vibe: 'Urban urgency with direct, high-contrast discipline.',
    colors: ['#F2C230', '#1C1B20', '#F9F7F2', '#D94841']
  },
  {
    key: 'velvet-circuit',
    name: 'Velvet Circuit',
    vibe: 'Nocturnal command-center contrast with premium focus.',
    colors: ['#5B2E6D', '#B96A4B', '#D7F1E3', '#17131E']
  },
  {
    key: 'lavender-mist',
    name: 'Lavender Mist',
    vibe: 'Twilight study hush with soft lavender glow.',
    colors: ['#8E89CD', '#C2B9E9', '#E7E0F7', '#1C1A2E']
  },
  {
    key: 'abacus-bloom',
    name: 'Abacus Bloom',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Rose-and-jade freshness with tactile classroom warmth.',
    colors: ['#D85D72', '#58A88B', '#FFF7F5', '#38272D']
  },
  {
    key: 'soroban-peach',
    name: 'Soroban Peach',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Apricot energy balanced by golden, methodical focus.',
    colors: ['#E96F51', '#F0B95A', '#FFF7ED', '#3C2A32']
  },
  {
    key: 'graph-mint',
    name: 'Graph Mint',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Crisp mint geometry for calm, steady calculation.',
    colors: ['#2E9C76', '#9BD6C6', '#F3FBF7', '#18352E']
  },
  {
    key: 'violet-ruler',
    name: 'Violet Ruler',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Measured violet clarity with drafting-desk precision.',
    colors: ['#7C5CE7', '#C7B8F5', '#F8F6FF', '#28213D']
  },
  {
    key: 'citrus-margin',
    name: 'Citrus Margin',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Sunny annotation color with disciplined paper contrast.',
    colors: ['#D99000', '#F2CF5B', '#FFFBEA', '#3D341B']
  },
  {
    key: 'algebra-rose',
    name: 'Algebra Rose',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Soft rose confidence with polished academic calm.',
    colors: ['#C94F7C', '#EEA6BD', '#FFF5F8', '#422434']
  },
  {
    key: 'blueprint-air',
    name: 'Blueprint Air',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Open blue structure with airy technical precision.',
    colors: ['#2674C8', '#8EC5F2', '#F3F9FE', '#17324D']
  },
  {
    key: 'decimal-sage',
    name: 'Decimal Sage',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Quiet green concentration with natural notebook restraint.',
    colors: ['#568B62', '#ABC7A3', '#F5FAF2', '#26362A']
  },
  {
    key: 'coral-ledger',
    name: 'Coral Ledger',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Warm coral momentum grounded by ledger-like order.',
    colors: ['#DD6248', '#F3A58F', '#FFF6F2', '#472C27']
  },
  {
    key: 'lilac-formula',
    name: 'Lilac Formula',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Gentle lilac focus with elegant symbolic clarity.',
    colors: ['#8A5EC8', '#D3BDEF', '#FAF7FF', '#332743']
  },
  {
    key: 'teal-compass',
    name: 'Teal Compass',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Cool directional confidence with clean geometric balance.',
    colors: ['#168A8D', '#7CCFD0', '#F1FBFB', '#17383A']
  },
  {
    key: 'amber-index',
    name: 'Amber Index',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Library-card warmth with crisp reference-book structure.',
    colors: ['#C77910', '#F0C574', '#FFF9EC', '#3D2D19']
  },
  {
    key: 'berry-notebook',
    name: 'Berry Notebook',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Rich berry accents softened for comfortable practice.',
    colors: ['#B14872', '#E7A8C0', '#FFF5F9', '#3F2330']
  },
  {
    key: 'pistachio-grid',
    name: 'Pistachio Grid',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Fresh green organization with subtle graph-paper rhythm.',
    colors: ['#69A447', '#B8D89B', '#F7FBEF', '#2C3A24']
  },
  {
    key: 'cerulean-quiz',
    name: 'Cerulean Quiz',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Clear sky-blue energy for quick, confident recall.',
    colors: ['#217DA8', '#85CBE0', '#F2FBFE', '#183743']
  },
  {
    key: 'papaya-proof',
    name: 'Papaya Proof',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Warm proof-mark color with inviting problem-solving focus.',
    colors: ['#E2673F', '#F1B36B', '#FFF7F0', '#482B21']
  },
  {
    key: 'lavender-metric',
    name: 'Lavender Metric',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Balanced lavender calm with precise measured contrast.',
    colors: ['#6F68C9', '#BCB7EE', '#F7F6FF', '#292842']
  },
  {
    key: 'aqua-flashcard',
    name: 'Aqua Flashcard',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Fast, refreshing teal built for focused repetition.',
    colors: ['#168E7B', '#8AD9C6', '#F0FCF8', '#173A34']
  },
  {
    key: 'marigold-memo',
    name: 'Marigold Memo',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Golden memory cues with grounded study-room warmth.',
    colors: ['#B8860B', '#E8C766', '#FFFBEE', '#3B3217']
  },
  {
    key: 'prism-paper',
    name: 'Prism Paper',
    collection: THEME_COLLECTIONS.LIGHT,
    vibe: 'Blue-and-rose contrast with playful analytical polish.',
    colors: ['#5D6FE5', '#E87591', '#F8F8FF', '#272B48']
  },
  {
    key: 'midnight-abacus',
    name: 'Midnight Abacus',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Deep teal quiet with luminous blue-green counting cues.',
    colors: ['#66D9C1', '#7AA7FF', '#0C1519', '#EAF8F5']
  },
  {
    key: 'neon-long-division',
    name: 'Neon Long Division',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Charged lime-and-cyan focus on a muted night field.',
    colors: ['#B9E85C', '#54C7EC', '#11160D', '#F3FFE4']
  },
  {
    key: 'observatory-ink',
    name: 'Observatory Ink',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Celestial violet and amber for late-night problem solving.',
    colors: ['#9B8CFF', '#F0A66A', '#111224', '#F3F1FF']
  },
  {
    key: 'carbon-equation',
    name: 'Carbon Equation',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Near-monochrome restraint with cool metallic definition.',
    colors: ['#E1E4EA', '#7D8796', '#0E1014', '#F7F8FA']
  },
  {
    key: 'cobalt-afterhours',
    name: 'Cobalt Afterhours',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Electric blue focus with a restrained rose counterpoint.',
    colors: ['#5C9DFF', '#E182B4', '#0B1425', '#EDF4FF']
  },
  {
    key: 'ember-blackboard',
    name: 'Ember Blackboard',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Warm chalk-and-ember contrast on a roasted blackboard.',
    colors: ['#F28C52', '#E5C07B', '#1A100D', '#FFF2E8']
  },
  {
    key: 'deep-sea-calculator',
    name: 'Deep Sea Calculator',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Submerged cyan clarity with calm oceanic depth.',
    colors: ['#45C4C8', '#7CA6D8', '#07191D', '#EAFBFC']
  },
  {
    key: 'plum-algorithm',
    name: 'Plum Algorithm',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Plum-toned concentration with soft rose highlights.',
    colors: ['#CA8BE8', '#EBA4C9', '#1A0E20', '#FBEFFC']
  },
  {
    key: 'forest-binary',
    name: 'Forest Binary',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Organic green signals across a deep woodland terminal.',
    colors: ['#72C98A', '#C5D66D', '#0B1A12', '#F0F9F2']
  },
  {
    key: 'ruby-function',
    name: 'Ruby Function',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Precise ruby emphasis with warm functional contrast.',
    colors: ['#EE6A78', '#F0A38F', '#210D13', '#FFF0F2']
  },
  {
    key: 'indigo-grid',
    name: 'Indigo Grid',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Structured indigo depth with cool coordinate-line clarity.',
    colors: ['#899CFF', '#66C0D0', '#0D1026', '#F1F3FF']
  },
  {
    key: 'bronze-theorem',
    name: 'Bronze Theorem',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Antique bronze reasoning with a quiet green patina.',
    colors: ['#D6A15D', '#8AC6A8', '#1A130B', '#FFF5E6']
  },
  {
    key: 'aurora-matrix',
    name: 'Aurora Matrix',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Polar green and violet signals over a deep night field.',
    colors: ['#6FE1B8', '#B48CFF', '#0B171B', '#EEFFF9']
  },
  {
    key: 'lunar-graphite',
    name: 'Lunar Graphite',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Low-glare graphite with cool moonlit definition.',
    colors: ['#A9B4C4', '#6D88A9', '#12161D', '#F4F7FB']
  },
  {
    key: 'magenta-operator',
    name: 'Magenta Operator',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Expressive magenta commands balanced by soft periwinkle.',
    colors: ['#E77BC3', '#8FA7FF', '#1C0D1A', '#FFF0FB']
  },
  {
    key: 'arctic-variable',
    name: 'Arctic Variable',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Icy cyan clarity across a dense blue-black workspace.',
    colors: ['#81D4FA', '#A8B5FF', '#09151F', '#EFFAFF']
  },
  {
    key: 'moss-terminal',
    name: 'Moss Terminal',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Moss-green focus with muted brass instrument warmth.',
    colors: ['#9BCB7A', '#D1A96B', '#11190D', '#F4FBEF']
  },
  {
    key: 'saffron-night',
    name: 'Saffron Night',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Golden saffron markers over a deep, warm night surface.',
    colors: ['#F3BE5B', '#E57B6F', '#1C1509', '#FFF8E8']
  },
  {
    key: 'eclipse-violet',
    name: 'Eclipse Violet',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Violet shadow with mint-lit mathematical highlights.',
    colors: ['#AF8CFF', '#6ED4C3', '#120D1E', '#F7F1FF']
  },
  {
    key: 'crimson-vector',
    name: 'Crimson Vector',
    collection: THEME_COLLECTIONS.DARK,
    vibe: 'Crimson direction and violet depth in a focused dark field.',
    colors: ['#FF7A82', '#C494FF', '#210D12', '#FFF1F2']
  }
];

export const LEGACY_THEME_ALIASES = Object.freeze({
  'acid-lemon-lobby': 'taxi-noir',
  'vinyl-after-rain': 'velvet-circuit',
  'chrome-blossom': 'signal-peach',
  'porcelain-rebel': 'paper-lantern',
  'cobalt-typewriter': 'ink-and-apricot',
  'rosewater-asphalt': 'paper-lantern',
  'carbon-taffy': 'signal-peach',
  'cherry-receipt': 'signal-peach',
  'lilac-concrete': 'lavender-mist',
  'mercury-carnival': 'signal-peach',
  'studio-vermouth': 'ink-and-apricot',
  'pixel-bazaar': 'taxi-noir',
  'marble-disco': 'velvet-circuit',
  'saffron-static': 'taxi-noir',
  'cotton-candy-dawn': 'paper-lantern',
  'honey-milk': 'ink-and-apricot',
  'aqua-whisper': 'sage-whisk'
});

const SHARED_LAYOUT = Object.freeze({
  headerColumns: 'auto minmax(0, 1fr) auto',
  brandOrder: 1,
  navOrder: 2,
  actionsOrder: 3,
  brandAlign: 'start',
  navAlign: 'center',
  actionsAlign: 'end',
  mainMax: '1200px',
  mainGap: '1.2rem',
  mainTop: '1rem',
  mainBottom: '2.8rem',
  trainerColumns: 'minmax(21rem, 25rem) minmax(0, 1fr)',
  guestColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
  summaryColumns: 'repeat(4, minmax(0, 1fr))',
  operationColumns: 'repeat(4, minmax(0, 1fr))',
  panelRadius: '24px',
  panelBorderWidth: '1px',
  cardTilt: '0deg',
  cardLift: '6px',
  heroSize: '0px',
  heroRotate: '0deg',
  heroOffsetX: '0px',
  heroOffsetY: '0px',
  heroAccentWidth: '0px',
  heroAccentHeight: '0px',
  heroAccentRotate: '0deg',
  heroAccentX: '0px',
  heroAccentY: '0px',
  bgAngle: '160deg',
  bgStop: '74%',
  animationDuration: '0.42s'
});

const HEX_PATTERN = /^#?[0-9a-f]{6}$/i;

function normalizeHex(hex) {
  if (typeof hex !== 'string') {
    throw new Error(`Expected a hex string, received ${typeof hex}.`);
  }

  const trimmed = hex.trim();
  if (!HEX_PATTERN.test(trimmed)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return trimmed.startsWith('#')
    ? trimmed.toUpperCase()
    : `#${trimmed.toUpperCase()}`;
}

function clampChannel(value) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  const body = normalized.slice(1);
  return {
    r: Number.parseInt(body.slice(0, 2), 16),
    g: Number.parseInt(body.slice(2, 4), 16),
    b: Number.parseInt(body.slice(4, 6), 16)
  };
}

function rgbToHex(red, green, blue) {
  const toHex = (value) =>
    clampChannel(value).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function mix(hexA, hexB, ratio = 0.5) {
  const weight = Math.min(1, Math.max(0, ratio));
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);

  return rgbToHex(
    rgbA.r + (rgbB.r - rgbA.r) * weight,
    rgbA.g + (rgbB.g - rgbA.g) * weight,
    rgbA.b + (rgbB.b - rgbA.b) * weight
  );
}

function darken(hex, ratio = 0.2) {
  return mix(hex, '#000000', ratio);
}

function lighten(hex, ratio = 0.2) {
  return mix(hex, '#FFFFFF', ratio);
}

function toRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  const clampedAlpha = Math.min(1, Math.max(0, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha.toFixed(3)})`;
}

function findAlphaForContrast(foregroundHex, backgroundHex, targetContrast) {
  for (let alpha = 0.24; alpha <= 0.86; alpha += 0.01) {
    const compositeHex = mix(backgroundHex, foregroundHex, alpha);

    if (contrastRatio(compositeHex, backgroundHex) >= targetContrast) {
      return alpha;
    }
  }

  return 0.86;
}

function srgbChannelToLinear(channel) {
  const srgb = channel / 255;
  if (srgb <= 0.04045) {
    return srgb / 12.92;
  }

  return ((srgb + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const red = srgbChannelToLinear(r);
  const green = srgbChannelToLinear(g);
  const blue = srgbChannelToLinear(b);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return (lighter + 0.05) / (darker + 0.05);
}

function sortByLuminance(hexColors) {
  return [...hexColors].sort(
    (colorA, colorB) => relativeLuminance(colorA) - relativeLuminance(colorB)
  );
}

function minimumContrast(foregroundHex, backgroundHexes) {
  return Math.min(
    ...backgroundHexes.map((backgroundHex) =>
      contrastRatio(foregroundHex, backgroundHex)
    )
  );
}

function pickTextColor(backgroundHexes, candidates) {
  const backgrounds = backgroundHexes.map(normalizeHex);
  const normalizedCandidates = [...new Set(candidates.map(normalizeHex))];

  return normalizedCandidates.reduce((bestCandidate, candidate) =>
    minimumContrast(candidate, backgrounds) >
    minimumContrast(bestCandidate, backgrounds)
      ? candidate
      : bestCandidate
  );
}

function ensureContrast(foregroundHex, backgroundHexes, targetContrast) {
  const foreground = normalizeHex(foregroundHex);
  const backgrounds = backgroundHexes.map(normalizeHex);

  if (minimumContrast(foreground, backgrounds) >= targetContrast) {
    return foreground;
  }

  const endpoint = pickTextColor(backgrounds, ['#0B0D12', '#FFFFFF']);
  if (minimumContrast(endpoint, backgrounds) < targetContrast) {
    return endpoint;
  }

  let failingRatio = 0;
  let passingRatio = 1;

  for (let index = 0; index < 24; index += 1) {
    const ratio = (failingRatio + passingRatio) / 2;
    const candidate = mix(foreground, endpoint, ratio);

    if (minimumContrast(candidate, backgrounds) >= targetContrast) {
      passingRatio = ratio;
    } else {
      failingRatio = ratio;
    }
  }

  return mix(foreground, endpoint, passingRatio);
}

function softenTextColor(foregroundHex, backgroundHex, backgroundHexes) {
  const foreground = normalizeHex(foregroundHex);
  const background = normalizeHex(backgroundHex);
  const backgrounds = backgroundHexes.map(normalizeHex);
  let passingRatio = 0;
  let failingRatio = 1;

  for (let index = 0; index < 24; index += 1) {
    const ratio = (passingRatio + failingRatio) / 2;
    const candidate = mix(foreground, background, ratio);

    if (minimumContrast(candidate, backgrounds) >= 4.5) {
      passingRatio = ratio;
    } else {
      failingRatio = ratio;
    }
  }

  return mix(foreground, background, passingRatio);
}

function buildLightTokenSet(hexColors) {
  const [accentMain, accentWarm, accentSoft] = hexColors;
  const [darkest, secondDark, secondLight, lightest] =
    sortByLuminance(hexColors);
  const ink900 = darken(darkest, 0.08);
  const ink700 = mix(darkest, secondDark, 0.56);
  const ink500 = mix(secondDark, lightest, 0.38);
  const paper = lighten(lightest, 0.05);
  const paperStrong = mix(lightest, secondLight, 0.35);
  const sand = mix(secondLight, secondDark, 0.22);
  const surfaceRaised = mix(paperStrong, '#FFFFFF', 0.46);
  const surfaceRaisedStrong = mix(paperStrong, '#FFFFFF', 0.68);
  const surfaceInput = mix(paperStrong, '#FFFFFF', 0.76);
  const surfaceSelected = mix(surfaceRaised, accentSoft, 0.12);
  const surfacePositive = mix(surfaceRaised, accentSoft, 0.1);
  const surfaceWarning = mix(surfaceRaised, accentWarm, 0.12);
  const surfaceHighlight = '#FFFFFF';
  const rawLine = mix(ink900, accentMain, 0.55);
  const accentAlert = darken(accentWarm, 0.18);
  const surfaceDanger = mix(surfaceRaised, accentAlert, 0.1);
  const contentSurfaces = [
    paper,
    paperStrong,
    surfaceRaised,
    surfaceRaisedStrong,
    surfaceInput,
    surfaceSelected,
    surfacePositive,
    surfaceWarning,
    surfaceDanger,
    surfaceHighlight
  ];
  const line = ensureContrast(rawLine, contentSurfaces, 3);
  const textMain = pickTextColor(contentSurfaces, [
    darken(darkest, 0.12),
    hexColors[3],
    '#111827',
    '#F8FAFC'
  ]);
  const textSubtle = softenTextColor(textMain, paper, contentSurfaces);
  const buttonStrongText = pickTextColor(
    [accentMain],
    [darken(darkest, 0.2), '#0B0D12', '#FFFFFF']
  );
  const buttonQuietText = pickTextColor(
    [paperStrong, surfaceRaisedStrong],
    [darken(darkest, 0.18), textMain, '#FFFFFF']
  );
  const buttonDangerText = pickTextColor(
    [accentAlert],
    [textMain, '#0B0D12', '#FFFFFF']
  );
  const textAccent = ensureContrast(accentMain, contentSurfaces, 4.5);
  const textDanger = ensureContrast(accentAlert, contentSurfaces, 4.5);
  const controlBorder = line;
  const focusRing = ensureContrast(accentMain, contentSurfaces, 3);
  const headerSurface = ink900;
  const headerSurfaceAlt = mix(ink900, ink700, 0.28);
  const headerSurfaces = [headerSurface, headerSurfaceAlt];
  const headerText = pickTextColor(headerSurfaces, [
    lightest,
    '#F8FAFC',
    '#0B0D12'
  ]);
  const headerControlSurface = mix(headerSurface, headerText, 0.09);
  const interactiveHeaderSurfaces = [...headerSurfaces, headerControlSurface];
  const headerTextAccent = ensureContrast(
    accentMain,
    interactiveHeaderSurfaces,
    4.5
  );
  const headerTextSubtle = softenTextColor(
    headerText,
    headerSurface,
    interactiveHeaderSurfaces
  );
  const headerControlBorder = ensureContrast(
    mix(headerSurface, headerText, 0.24),
    interactiveHeaderSurfaces,
    3
  );
  const heroDecorBase = ensureContrast(
    mix(line, ink900, 0.58),
    [surfaceRaised],
    4.5
  );
  const heroDecorSurface = surfaceRaised;
  const heroDecorStrokeAlpha = findAlphaForContrast(
    heroDecorBase,
    heroDecorSurface,
    3.1
  );

  return {
    colorScheme: 'light',
    ink900,
    ink700,
    ink500,
    paper,
    paperStrong,
    sand,
    accentMain,
    accentWarm,
    accentSoft,
    accentAlert,
    textMain,
    textSubtle,
    textAccent,
    textDanger,
    line,
    controlBorder,
    focusRing,
    buttonStrongText,
    buttonQuietText,
    buttonDangerText,
    surfaceRaised,
    surfaceRaisedStrong,
    surfaceInput,
    surfaceSelected,
    surfacePositive,
    surfaceWarning,
    surfaceDanger,
    surfaceHighlight,
    surfaceShadow: ink900,
    surfaceScrim: 'rgba(9, 8, 13, 0.420)',
    headerSurface,
    headerSurfaceAlt,
    headerText,
    headerTextAccent,
    headerTextSubtle,
    headerControlSurface,
    headerControlBorder,
    headerBorder: toRgba(headerText, 0.18),
    toggleThumb: buttonStrongText,
    heroDecorStroke: toRgba(heroDecorBase, heroDecorStrokeAlpha),
    heroDecorFill: toRgba(accentMain, 0.1),
    glowMain: toRgba(accentMain, 0.18),
    glowWarm: toRgba(accentWarm, 0.18),
    glowSoft: toRgba(accentSoft, 0.18),
    glowLine: toRgba(line, 0.2)
  };
}

function buildDarkTokenSet(hexColors) {
  const [accentMain, accentWarm, accentSoft] = hexColors;
  const [darkest, secondDark, secondLight, lightest] =
    sortByLuminance(hexColors);
  const paper = mix(darkest, '#070A0F', 0.52);
  const paperStrong = mix(paper, lightest, 0.09);
  const surfaceRaised = mix(paperStrong, lightest, 0.035);
  const surfaceRaisedStrong = mix(paperStrong, lightest, 0.055);
  const surfaceInput = mix(paperStrong, lightest, 0.075);
  const surfaceSelected = mix(surfaceRaised, accentMain, 0.16);
  const surfacePositive = mix(surfaceRaised, accentSoft, 0.12);
  const surfaceWarning = mix(surfaceRaised, accentWarm, 0.14);
  const surfaceHighlight = mix(paperStrong, lightest, 0.12);
  const accentAlert = mix(accentWarm, '#EF6A6A', 0.35);
  const surfaceDanger = mix(surfaceRaised, accentAlert, 0.13);
  const contentSurfaces = [
    paper,
    paperStrong,
    surfaceRaised,
    surfaceRaisedStrong,
    surfaceInput,
    surfaceSelected,
    surfacePositive,
    surfaceWarning,
    surfaceDanger,
    surfaceHighlight
  ];
  const textMain = pickTextColor(contentSurfaces, [
    lightest,
    hexColors[3],
    '#F8FAFC',
    '#0B0D12'
  ]);
  const textSubtle = softenTextColor(textMain, paper, contentSurfaces);
  const ink900 = mix(paper, '#000000', 0.18);
  const ink700 = mix(ink900, lightest, 0.1);
  const ink500 = mix(ink700, lightest, 0.26);
  const sand = mix(paperStrong, secondLight, 0.12);
  const line = ensureContrast(mix(textMain, paper, 0.56), contentSurfaces, 3);
  const controlBorder = line;
  const focusRing = ensureContrast(accentMain, contentSurfaces, 3);
  const buttonStrongText = pickTextColor(
    [accentMain],
    [textMain, '#0B0D12', '#FFFFFF']
  );
  const buttonQuietText = pickTextColor(
    [paperStrong, surfaceRaisedStrong],
    [textMain, '#0B0D12', '#FFFFFF']
  );
  const buttonDangerText = pickTextColor(
    [accentAlert],
    [textMain, '#0B0D12', '#FFFFFF']
  );
  const textAccent = ensureContrast(accentMain, contentSurfaces, 4.5);
  const textDanger = ensureContrast(accentAlert, contentSurfaces, 4.5);
  const headerSurface = ink900;
  const headerSurfaceAlt = mix(ink900, ink700, 0.28);
  const headerSurfaces = [headerSurface, headerSurfaceAlt];
  const headerText = pickTextColor(headerSurfaces, [
    lightest,
    '#F8FAFC',
    '#0B0D12'
  ]);
  const headerControlSurface = mix(headerSurface, headerText, 0.09);
  const interactiveHeaderSurfaces = [...headerSurfaces, headerControlSurface];
  const headerTextAccent = ensureContrast(
    accentMain,
    interactiveHeaderSurfaces,
    4.5
  );
  const headerTextSubtle = softenTextColor(
    headerText,
    headerSurface,
    interactiveHeaderSurfaces
  );
  const headerControlBorder = ensureContrast(
    mix(headerSurface, headerText, 0.24),
    interactiveHeaderSurfaces,
    3
  );
  const heroDecorBase = ensureContrast(
    mix(accentMain, textMain, 0.34),
    [surfaceRaised],
    4.5
  );
  const heroDecorStrokeAlpha = findAlphaForContrast(
    heroDecorBase,
    surfaceRaised,
    3.1
  );

  return {
    colorScheme: 'dark',
    ink900,
    ink700,
    ink500,
    paper,
    paperStrong,
    sand,
    accentMain,
    accentWarm,
    accentSoft,
    accentAlert,
    textMain,
    textSubtle,
    textAccent,
    textDanger,
    line,
    controlBorder,
    focusRing,
    buttonStrongText,
    buttonQuietText,
    buttonDangerText,
    surfaceRaised,
    surfaceRaisedStrong,
    surfaceInput,
    surfaceSelected,
    surfacePositive,
    surfaceWarning,
    surfaceDanger,
    surfaceHighlight,
    surfaceShadow: '#000000',
    surfaceScrim: 'rgba(0, 0, 0, 0.620)',
    headerSurface,
    headerSurfaceAlt,
    headerText,
    headerTextAccent,
    headerTextSubtle,
    headerControlSurface,
    headerControlBorder,
    headerBorder: toRgba(headerText, 0.18),
    toggleThumb: buttonStrongText,
    heroDecorStroke: toRgba(heroDecorBase, heroDecorStrokeAlpha),
    heroDecorFill: toRgba(accentMain, 0.1),
    glowMain: toRgba(accentMain, 0.22),
    glowWarm: toRgba(accentWarm, 0.18),
    glowSoft: toRgba(accentSoft, 0.16),
    glowLine: toRgba(line, 0.18)
  };
}

export const THEME_OPTIONS = RAW_THEMES.map((theme) => {
  const normalizedColors = theme.colors.map(normalizeHex);
  const lightTokens = Object.freeze(buildLightTokenSet(normalizedColors));
  const darkTokens = Object.freeze(buildDarkTokenSet(normalizedColors));

  return Object.freeze({
    ...theme,
    collection: theme.collection || THEME_COLLECTIONS.CLASSIC,
    colors: normalizedColors,
    tokens: lightTokens,
    tokensByMode: Object.freeze({
      light: lightTokens,
      dark: darkTokens
    }),
    layout: SHARED_LAYOUT
  });
});

const THEME_OPTIONS_BY_KEY = new Map(
  THEME_OPTIONS.map((theme) => [theme.key, theme])
);
export const DEFAULT_THEME_KEY = THEME_OPTIONS[0].key;

export function getThemeOptionLabel(theme) {
  if (!theme || typeof theme !== 'object') {
    return '';
  }

  const resolvedTheme = THEME_OPTIONS_BY_KEY.get(theme.key) || theme;
  return resolvedTheme.key === DEFAULT_THEME_KEY
    ? `${resolvedTheme.name} (Default)`
    : resolvedTheme.name;
}

export function resolveThemeKey(themeKey) {
  if (typeof themeKey !== 'string') {
    return DEFAULT_THEME_KEY;
  }

  const normalizedKey = themeKey.trim();
  if (!normalizedKey) {
    return DEFAULT_THEME_KEY;
  }

  const aliasedKey = LEGACY_THEME_ALIASES[normalizedKey] || normalizedKey;
  return THEME_OPTIONS_BY_KEY.has(aliasedKey) ? aliasedKey : DEFAULT_THEME_KEY;
}

export function getThemeByKey(themeKey) {
  return (
    THEME_OPTIONS_BY_KEY.get(resolveThemeKey(themeKey)) || THEME_OPTIONS[0]
  );
}

export function getThemeTokens(themeKey, resolvedMode = 'light') {
  const theme = getThemeByKey(themeKey);
  return theme.tokensByMode[resolvedMode === 'dark' ? 'dark' : 'light'];
}
