/**
 * three/board/tileSvg.js
 * Declarative SVG Vector Templates for Three.js World Tycoon Board Tiles.
 * 
 * Replaces procedural canvas drawing with clean, resolution-independent vector assets
 * conforming to Uncle Bob's Clean Code principles (SRP, separation of concerns).
 */

import { GROUP_META, PLAYER_THEMES } from '../../game/data.js';
import { gameState, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { calculateTileRent } from '../../game/rules.js';
import { getTileWorldPosition } from './coords.js';
import { currentBulbMode } from '../core/lighting.js';

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED SVG EMBEDDED VECTOR PATHS & ICONS (Resolution-Independent)
───────────────────────────────────────────────────────────────────────────── */
export const SVG_PATHS = {
  crown: 'M2.5 19.5h19a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-19a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm19.3-13.6a1 1 0 0 0-1.2.2L16 9.3 12.8 3.5a1 1 0 0 0-1.6 0L8 9.3 3.4 5.6a1 1 0 0 0-1.2-.2 1 1 0 0 0-.4 1.1l2.5 10.5h15.4l2.5-10.5a1 1 0 0 0-.4-1.1z',
  house: 'M12 3 2 12h3v8h14v-8h3L12 3zm0 3.5 5 4.5v6H7v-6l5-4.5z',
  skyscraper: 'M4 22h16V2H4v20zm2-18h4v3H6V4zm6 0h4v3h-4V4zm-6 5h4v3H6V9zm6 0h4v3h-4V9zm-6 5h4v3H6v-3zm6 0h4v3h-4v-3zm-6 5h4v2H6v-2zm6 0h4v2h-4v-2z',
  crane: 'M2 21h20v-2H13V9l8-4V3L11 7V3H9v18H2v2zm9-10.2 6-3V7l-6 3v0.8z',
  palm: 'M13 13c1.5-2.5 4.5-4 8-4-1 2.5-2.5 4.5-5 5.5l5 2.5c-3 .5-5.5-.5-7.5-2 1.5 2.5 2 5.5 1 8.5-1.5-2.5-2.5-5-2.5-8-1 3-3 5.5-6 6.5 1-3 2.5-5 4.5-6.5-2.5 1-5.5 1-8-0.5 3-1 5.5-1 7.5 0.5-2-1.5-3.5-3.5-4.5-6 3.5 0 6.5 1.5 8 4l-1 9h2l-1-9z',
  airplane: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
  sparkle: 'M12 2c.5 4.5 4.5 8.5 9 9-4.5.5-8.5 4.5-9 9-.5-4.5-4.5-8.5-9-9 4.5-.5 8.5-4.5 9-9z',
  compass: 'M12 2 15 9l7 3-7 3-3 7-3-7-7-3 7-3 3-7zm0 4.8L10.3 10.3 6.8 12l3.5 1.7L12 17.2l1.7-3.5 3.5-1.7-3.5-1.7L12 6.8z',
  lock: 'M17 9V7a5 5 0 0 0-10 0v2H5v13h14V9h-2zm-8-2a3 3 0 0 1 6 0v2H9V7zm3 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
  money: 'M2 6h20v12H2V6zm2 2v8h16V8H4zm8 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-6 2h1v2H6v-2zm11 0h1v2h-1v-2z',
  dice: 'M3 3h18v18H3V3zm4 4a1.5 1.5 0 1 0 0 .01V7zm10 0a1.5 1.5 0 1 0 0 .01V7zm-5 5a1.5 1.5 0 1 0 0 .01V12zm-5 5a1.5 1.5 0 1 0 0 .01V17zm10 0a1.5 1.5 0 1 0 0 .01V17z'
};

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS: STYLES, ROTATION & THEME CONFIGURATION
───────────────────────────────────────────────────────────────────────────── */
function getBoardThemeStyles(boardStyle, propState, isOwned) {
  const isCyber = boardStyle === 'cyberpunk';
  const isElegant = boardStyle === 'elegant';
  const bulbMode = currentBulbMode || matchSettings?.lightingTheme || 'day';
  const isNight = bulbMode === 'night';
  const isSunset = bulbMode === 'sunset';
  const isDay = !isNight && !isSunset;

  let bgFill = '#ffffff';
  let textPrimary = '#0f172a';
  let textSecondary = '#64748b';
  let cardBorder = '#64748b';
  let boxFill = '#f8fafc';
  let boxBorder = '#e2e8f0';

  if (isCyber) {
    bgFill = '#080d1a';
    textPrimary = '#ffffff';
    textSecondary = '#94a3b8';
    cardBorder = '#00f5ff';
    boxFill = 'rgba(15, 23, 42, 0.75)';
    boxBorder = '#1e293b';
  } else if (isElegant) {
    bgFill = '#fafaf9';
    textPrimary = '#1c1917';
    textSecondary = '#78716c';
    cardBorder = '#d4af37';
    boxFill = '#fdfbf7';
    boxBorder = '#f5eedb';
  } else if (isNight && isOwned) {
    // Dark background so white neon text is visible at night
    bgFill = '#0f172a';
  } else if (isSunset && isOwned) {
    // Deep warm dusk background for sunset neon
    bgFill = '#1a0a2e';
  } else {
    bgFill = '#ffffff';
  }

  return { isCyber, isElegant, isNight, isSunset, isDay, bgFill, textPrimary, textSecondary, cardBorder, boxFill, boxBorder };
}

function getTileRotationAngle(tileId) {
  const pos = getTileWorldPosition(tileId);
  if (pos.side === 1) return 90;
  if (pos.side === 2) return 180;
  if (pos.side === 3) return 270;
  return 0;
}

function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* ─────────────────────────────────────────────────────────────────────────────
   SVG COMPONENT GENERATORS
───────────────────────────────────────────────────────────────────────────── */

/**
 * Generates outer tile border frame SVG markup (unowned vs owner theme).
 */
function renderTileOuterBorder(isOwned, ownerTheme, styles) {
  if (isOwned && ownerTheme) {
    return `
      <!-- Bold Owner Frame -->
      <rect x="13" y="13" width="486" height="486" rx="14" fill="none" stroke="${ownerTheme.colorHex}" stroke-width="26" />
      <rect x="27" y="27" width="458" height="458" rx="6" fill="none" stroke="rgba(255, 255, 255, 0.95)" stroke-width="3.5" />
      <!-- Top/Left Highlights -->
      <line x1="29" y1="29" x2="483" y2="29" stroke="rgba(255, 255, 255, 0.9)" stroke-width="6" />
      <line x1="29" y1="29" x2="29" y2="483" stroke="rgba(255, 255, 255, 0.9)" stroke-width="6" />
      <!-- Bottom/Right Shadow Shading -->
      <line x1="29" y1="480" x2="483" y2="480" stroke="rgba(15, 23, 42, 0.25)" stroke-width="6" />
      <line x1="480" y1="29" x2="480" y2="483" stroke="rgba(15, 23, 42, 0.25)" stroke-width="6" />
    `;
  }

  if (styles.isCyber) {
    return `
      <rect x="7" y="7" width="498" height="498" rx="8" fill="none" stroke="#00f5ff" stroke-width="10" />
      <rect x="16" y="16" width="480" height="480" rx="4" fill="none" stroke="#d946ef" stroke-width="3" />
    `;
  } else if (styles.isElegant) {
    return `
      <rect x="7" y="7" width="498" height="498" rx="8" fill="none" stroke="#d4af37" stroke-width="12" />
      <rect x="16" y="16" width="480" height="480" rx="4" fill="none" stroke="#fef08a" stroke-width="3" />
    `;
  } else {
    return `
      <rect x="7" y="7" width="498" height="498" rx="8" fill="none" stroke="#64748b" stroke-width="14" />
      <rect x="20" y="20" width="472" height="472" rx="4" fill="none" stroke="#94a3b8" stroke-width="4" />
    `;
  }
}

/**
 * Generates mortgage overlay banner SVG (Mortgage feature removed).
 */
function renderMortgageOverlay(isMortgaged) {
  return '';
}

/**
 * Generates City Tile SVG Vector Template.
 * Minimalist layout inspired by reference design:
 * - Cadastral architectural grid
 * - Top group color strip
 * - City Name (glows in the colour of the city when bought)
 * - Amount: Buy Price when unowned, ONLY Current Rent when bought
 */
function renderCityTileSvg(tile, propState, styles, isOwned, ownerTheme, ownerName) {
  const groupColor = tile.group && GROUP_META[tile.group] ? GROUP_META[tile.group].hex : '#38bdf8';
  const nameLen = tile.name.length;
  const nameFontSize = nameLen <= 6 ? 66 : (nameLen <= 9 ? 56 : (nameLen <= 11 ? 46 : 38));

  // Value: Buy Price when unowned, Current Rent when bought
  let valStr;
  if (isOwned) {
    const rentAmt = calculateTileRent(tile.id);
    valStr = fmtMoney(rentAmt);
  } else {
    valStr = fmtMoney(tile.price);
  }

  const valLen = valStr.length;
  const valFontSize = valLen <= 4 ? 116 : (valLen <= 5 ? 102 : (valLen <= 6 ? 88 : 74));

  // Architectural Cadastral Grid (inspired by reference image)
  const gridStroke = styles.isCyber ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.045)';
  const gridMarkup = `
    <!-- Architectural Cadastral Grid -->
    <g stroke="${gridStroke}" stroke-width="1.5">
      <line x1="120" y1="78" x2="120" y2="488" />
      <line x1="216" y1="78" x2="216" y2="488" />
      <line x1="312" y1="78" x2="312" y2="488" />
      <line x1="408" y1="78" x2="408" y2="488" />
      <line x1="20" y1="160" x2="492" y2="160" />
      <line x1="20" y1="245" x2="492" y2="245" />
      <line x1="20" y1="330" x2="492" y2="330" />
      <line x1="20" y1="415" x2="492" y2="415" />
    </g>
  `;

  // Top Group Color Strip
  const topBar = `
    <!-- Top Group Color Strip -->
    <rect x="16" y="16" width="480" height="58" rx="4" fill="${groupColor}" />
    <rect x="16" y="16" width="480" height="7" rx="3" fill="rgba(255, 255, 255, 0.40)" />
    <rect x="16" y="74" width="480" height="4" fill="#0f172a" />
  `;

  // Body content depending on ownership and lighting theme
  let bodyMarkup = '';

  // Helper: renders neon glow text using pure stroke-layering (SVG filters don't work in canvas drawImage pipeline)
  const neonText = (x, y, fontSize, text, isItalic = false) => {
    const glowColor = styles.isSunset ? '#fff0a0' : '#ffffff';
    const bloomColor = styles.isSunset ? '#fff0a0' : '#e0f0ff';
    const fontStyle = isItalic ? 'italic' : 'normal';
    const attrs = `font-family="Rubik, system-ui, sans-serif" font-weight="900" font-style="${fontStyle}" font-size="${fontSize}" text-anchor="middle" letter-spacing="${isItalic ? 1 : 3}"`;
    const glowStroke = `fill="none" stroke="${bloomColor}" stroke-linecap="round" stroke-linejoin="round"`;

    // Simulate a real neon tube: dark shadow underneath → wide soft bloom → tight bright halo → bright white core
    return `
      <!-- Dark contact shadow (tube mounting) -->
      <text x="${x}" y="${y + 4}" ${attrs} fill="none" stroke="#000000" stroke-width="24" opacity="0.65" stroke-linecap="round" stroke-linejoin="round">${escapeXml(text)}</text>
      <!-- Neon outer haze — widest, most diffuse bloom -->
      <text x="${x}" y="${y}" ${attrs} ${glowStroke} stroke-width="52" opacity="0.10">${escapeXml(text)}</text>
      <!-- Neon mid bloom -->
      <text x="${x}" y="${y}" ${attrs} ${glowStroke} stroke-width="36" opacity="0.20">${escapeXml(text)}</text>
      <!-- Neon inner bloom -->
      <text x="${x}" y="${y}" ${attrs} ${glowStroke} stroke-width="22" opacity="0.40">${escapeXml(text)}</text>
      <!-- Neon tube glow — tight bright hug -->
      <text x="${x}" y="${y}" ${attrs} ${glowStroke} stroke-width="12" opacity="0.75">${escapeXml(text)}</text>
      <!-- Neon tube bright edge -->
      <text x="${x}" y="${y}" ${attrs} ${glowStroke} stroke-width="5" opacity="1.0">${escapeXml(text)}</text>
      <!-- Bright hot core — the neon tube itself -->
      <text x="${x}" y="${y}" ${attrs} fill="${glowColor}">${escapeXml(text)}</text>
    `;
  };

  if (isOwned) {
    if (styles.isNight || styles.isSunset) {
      // NIGHT & SUNSET: Neon glow via stroke-layering (no SVG filters — they don't work in canvas pipeline)
      bodyMarkup = `
        <!-- Neon City Name -->
        ${neonText(256, 265, nameFontSize, tile.name)}

        <!-- Neon Rent Amount -->
        ${neonText(256, 415, valFontSize, valStr, true)}
      `;
    } else {
      // DAY / MORNING: Clean Daylight Typography (NO artificial lighting)
      const dayTextColor = styles.isCyber ? '#ffffff' : '#0f172a';
      bodyMarkup = `
        <text x="256" y="265" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="${nameFontSize}" fill="${dayTextColor}" text-anchor="middle" letter-spacing="3">${escapeXml(tile.name)}</text>
        <text x="256" y="415" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-style="italic" font-size="${valFontSize}" fill="${dayTextColor}" text-anchor="middle" letter-spacing="1">${escapeXml(valStr)}</text>
      `;
    }
  } else {
    // UNOWNED: Crisp high-contrast typography
    const unownedTextColor = styles.isCyber ? '#ffffff' : '#0f172a';
    bodyMarkup = `
      <text x="256" y="265" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="${nameFontSize}" fill="${unownedTextColor}" text-anchor="middle" letter-spacing="3">${escapeXml(tile.name)}</text>
      <text x="256" y="415" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-style="italic" font-size="${valFontSize}" fill="${unownedTextColor}" text-anchor="middle" letter-spacing="1">${escapeXml(valStr)}</text>
    `;
  }

  return `
    ${gridMarkup}
    ${topBar}
    ${bodyMarkup}
  `;
}

/**
 * Generates Resort Tile SVG Vector Template.
 */
function renderResortTileSvg(tile, propState, styles, isOwned, ownerTheme, ownerName) {
  const resortColor = '#0ea5e9';
  const nameLen = tile.name.length;
  const nameFontSize = nameLen <= 6 ? 66 : (nameLen <= 9 ? 56 : (nameLen <= 11 ? 46 : 38));

  let valStr;
  if (isOwned) {
    const rentAmt = calculateTileRent(tile.id);
    valStr = fmtMoney(rentAmt);
  } else {
    valStr = fmtMoney(tile.price);
  }

  const valLen = valStr.length;
  const valFontSize = valLen <= 4 ? 116 : (valLen <= 5 ? 102 : (valLen <= 6 ? 88 : 74));

  const gridStroke = styles.isCyber ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.045)';
  const gridMarkup = `
    <!-- Architectural Cadastral Grid -->
    <g stroke="${gridStroke}" stroke-width="1.5">
      <line x1="120" y1="78" x2="120" y2="488" />
      <line x1="216" y1="78" x2="216" y2="488" />
      <line x1="312" y1="78" x2="312" y2="488" />
      <line x1="408" y1="78" x2="408" y2="488" />
      <line x1="20" y1="160" x2="492" y2="160" />
      <line x1="20" y1="245" x2="492" y2="245" />
      <line x1="20" y1="330" x2="492" y2="330" />
      <line x1="20" y1="415" x2="492" y2="415" />
    </g>
  `;

  const topBar = `
    <!-- Top Resort Header Strip -->
    <rect x="16" y="16" width="480" height="58" rx="4" fill="${resortColor}" />
    <rect x="16" y="16" width="480" height="7" rx="3" fill="rgba(255, 255, 255, 0.40)" />
    <rect x="16" y="74" width="480" height="4" fill="#0f172a" />
    <text x="256" y="53" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle" letter-spacing="3">RESORT</text>
  `;

  let bodyMarkup = '';

  // Helper: stroke-layering neon glow (SVG filters don't work in canvas drawImage)
  const neonText = (x, y, fontSize, text, isItalic = false) => {
    const glowColor = styles.isSunset ? '#fff0a0' : '#ffffff';
    const bloomColor = styles.isSunset ? '#fff0a0' : '#e0f0ff';
    const fontStyle = isItalic ? 'italic' : 'normal';
    const attrs = `font-family="Rubik, system-ui, sans-serif" font-weight="900" font-style="${fontStyle}" font-size="${fontSize}" text-anchor="middle" letter-spacing="${isItalic ? 1 : 3}"`;
    const glowStroke = `fill="none" stroke="${bloomColor}" stroke-linecap="round" stroke-linejoin="round"`;
    return `
      <text x="${x}" y="${y + 4}" ${attrs} fill="none" stroke="#000000" stroke-width="24" opacity="0.65" stroke-linecap="round" stroke-linejoin="round">${escapeXml(text)}</text>
      <text x="${x}" y="${y}" ${attrs} ${glowStroke} stroke-width="52" opacity="0.10">${escapeXml(text)}</text>
      <text x="${x}" y="${y}" ${attrs} ${glowStroke} stroke-width="36" opacity="0.20">${escapeXml(text)}</text>
      <text x="${x}" y="${y}" ${attrs} ${glowStroke} stroke-width="22" opacity="0.40">${escapeXml(text)}</text>
      <text x="${x}" y="${y}" ${attrs} ${glowStroke} stroke-width="12" opacity="0.75">${escapeXml(text)}</text>
      <text x="${x}" y="${y}" ${attrs} ${glowStroke} stroke-width="5" opacity="1.0">${escapeXml(text)}</text>
      <text x="${x}" y="${y}" ${attrs} fill="${glowColor}">${escapeXml(text)}</text>
    `;
  };

  if (isOwned) {
    if (styles.isNight || styles.isSunset) {
      bodyMarkup = `
        <!-- Neon Resort Name -->
        ${neonText(256, 215, nameFontSize, tile.name)}
        <!-- Neon Rent Amount -->
        ${neonText(256, 380, valFontSize, valStr, true)}
      `;
    } else {
      const dayTextColor = styles.isCyber ? '#ffffff' : '#0f172a';
      bodyMarkup = `
        <text x="256" y="215" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="${nameFontSize}" fill="${dayTextColor}" text-anchor="middle" letter-spacing="3">${escapeXml(tile.name)}</text>
        <text x="256" y="380" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-style="italic" font-size="${valFontSize}" fill="${dayTextColor}" text-anchor="middle" letter-spacing="1">${escapeXml(valStr)}</text>
      `;
    }
  } else {
    const unownedTextColor = styles.isCyber ? '#ffffff' : '#0f172a';
    bodyMarkup = `
      <text x="256" y="218" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="${nameFontSize}" fill="${unownedTextColor}" text-anchor="middle" letter-spacing="3">${escapeXml(tile.name)}</text>
      <text x="256" y="380" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-style="italic" font-size="${valFontSize}" fill="${unownedTextColor}" text-anchor="middle" letter-spacing="1">${escapeXml(valStr)}</text>
    `;
  }

  return `
    ${gridMarkup}
    ${topBar}
    ${bodyMarkup}
  `;
}

/**
 * Generates Chance Tile SVG Vector Template.
 */
function renderChanceTileSvg(tile, styles) {
  const colors = ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#a855f7', '#fb923c'];
  const cx = 256, cy = 190, r = 105;
  let segmentsMarkup = '';

  for (let i = 0; i < 6; i++) {
    const a1 = (i * Math.PI) / 3;
    const a2 = ((i + 1) * Math.PI) / 3;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);

    segmentsMarkup += `
      <path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z" fill="${colors[i]}" stroke="${styles.isCyber ? '#00f5ff' : '#ffffff'}" stroke-width="4" />
    `;
  }

  return `
    <!-- Central Lucky Wheel -->
    <g>
      ${segmentsMarkup}
      <!-- Wheel Center Hub -->
      <circle cx="${cx}" cy="${cy}" r="32" fill="#ffffff" stroke="${styles.isCyber ? '#00f5ff' : '#0f172a'}" stroke-width="4" />
      <g transform="translate(${cx - 16}, ${cy - 16}) scale(1.3)" fill="#f59e0b">
        <path d="${SVG_PATHS.sparkle}" />
      </g>
    </g>

    <!-- Chance Header & Subtitle -->
    <g transform="translate(36, 350)">
      <rect width="440" height="74" rx="20" fill="${styles.isCyber ? '#0284c7' : '#0284c7'}" stroke="#ffffff" stroke-width="3" />
      <g transform="translate(68, 20) scale(1.4)" fill="#ffffff">
        <path d="${SVG_PATHS.dice}" />
      </g>
      <text x="240" y="52" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="46" fill="#ffffff" text-anchor="middle" letter-spacing="3">CHANCE</text>
    </g>
    <text x="256" y="468" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="22" fill="${styles.textSecondary}" text-anchor="middle">SPIN WHEEL FOR PRIZES</text>
  `;
}

/**
 * Generates Tax Tile SVG Vector Template.
 */
function renderTaxTileSvg(tile, styles) {
  const taxAmount = tile.amount || 150000;
  return `
    <!-- Tax Vault Box -->
    <g transform="translate(166, 60)">
      <rect width="180" height="190" rx="24" fill="${styles.isCyber ? '#111827' : '#f1f5f9'}" stroke="${styles.isCyber ? '#ec4899' : '#64748b'}" stroke-width="6" />
      <text x="90" y="130" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="100" fill="#dc2626" text-anchor="middle">%</text>
    </g>

    <!-- Title & Amount -->
    <text x="256" y="340" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="56" fill="${styles.textPrimary}" text-anchor="middle" letter-spacing="2">WORLD TAX</text>
    <g transform="translate(36, 386)">
      <rect width="440" height="68" rx="18" fill="#fef2f2" stroke="#ef4444" stroke-width="3" />
      <text x="220" y="48" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="46" fill="#dc2626" text-anchor="middle">-${fmtMoney(taxAmount)}</text>
    </g>
    <text x="256" y="488" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="20" fill="${styles.textSecondary}" text-anchor="middle">FEES FUND THE FESTIVAL POOL</text>
  `;
}

/**
 * Generates Grand Corner Tile SVG Vector Template (START, ISLAND, FESTIVAL, WORLD TOUR).
 */
function renderCornerTileSvg(tile, styles) {
  const tileId = tile.id;

  if (tileId === 0) {
    // START TILE (Tile 0)
    return `
      <!-- Compass / Direction Star Centerpiece -->
      <g transform="translate(256, 175) scale(1.15)">
        <circle cx="0" cy="0" r="92" fill="#059669" stroke="#ffffff" stroke-width="4" />
        <g transform="translate(-48, -48) scale(4.0)" fill="#fef08a">
          <path d="${SVG_PATHS.compass}" />
        </g>
      </g>

      <!-- START Banner -->
      <g transform="translate(36, 310)">
        <rect width="440" height="74" rx="20" fill="#047857" stroke="#ffffff" stroke-width="3" />
        <text x="220" y="52" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="52" fill="#ffffff" text-anchor="middle" letter-spacing="4">START</text>
      </g>

      <!-- Salary Pill -->
      <g transform="translate(36, 404)">
        <rect width="440" height="66" rx="18" fill="#ecfdf5" stroke="#10b981" stroke-width="2.5" />
        <text x="220" y="44" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="26" fill="#065f46" text-anchor="middle">PASS: +300K • LAND: +400K</text>
      </g>
    `;
  }

  if (tileId === 8) {
    // ISLAND / JAIL TILE (Tile 8)
    return `
      <!-- Island Palm & Prison Badge -->
      <g transform="translate(256, 175) scale(1.15)">
        <circle cx="0" cy="0" r="92" fill="#d97706" stroke="#ffffff" stroke-width="4" />
        <g transform="translate(-36, -36) scale(3.0)" fill="#fef3c7">
          <path d="${SVG_PATHS.palm}" />
        </g>
      </g>

      <!-- Title Banner -->
      <g transform="translate(36, 310)">
        <rect width="440" height="74" rx="20" fill="#b45309" stroke="#ffffff" stroke-width="3" />
        <text x="220" y="52" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="46" fill="#ffffff" text-anchor="middle" letter-spacing="3">ISLAND JAIL</text>
      </g>

      <!-- Instructions Pill -->
      <g transform="translate(36, 404)">
        <rect width="440" height="66" rx="18" fill="#fffbeb" stroke="#f59e0b" stroke-width="2.5" />
        <text x="220" y="44" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="24" fill="#92400e" text-anchor="middle">ROLL DOUBLES OR 150K BAIL</text>
      </g>
    `;
  }

  if (tileId === 16) {
    // FESTIVAL TILE (Tile 16)
    return `
      <!-- Festival Fireworks / Carnival Sparkle -->
      <g transform="translate(256, 175) scale(1.15)">
        <circle cx="0" cy="0" r="92" fill="#7c3aed" stroke="#ffffff" stroke-width="4" />
        <g transform="translate(-40, -40) scale(3.4)" fill="#fbcfe8">
          <path d="${SVG_PATHS.sparkle}" />
        </g>
      </g>

      <!-- Title Banner -->
      <g transform="translate(36, 310)">
        <rect width="440" height="74" rx="20" fill="#6d28d9" stroke="#ffffff" stroke-width="3" />
        <text x="220" y="52" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="48" fill="#ffffff" text-anchor="middle" letter-spacing="3">FESTIVAL</text>
      </g>

      <!-- Bonus Pill -->
      <g transform="translate(36, 404)">
        <rect width="440" height="66" rx="18" fill="#faf5ff" stroke="#a855f7" stroke-width="2.5" />
        <text x="220" y="44" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="25" fill="#581c87" text-anchor="middle">2X CITY RENT &amp; TAX JACKPOT</text>
      </g>
    `;
  }

  if (tileId === 24) {
    // WORLD TOUR TILE (Tile 24)
    return `
      <!-- Supersonic Airplane Centerpiece -->
      <g transform="translate(256, 175) scale(1.15)">
        <circle cx="0" cy="0" r="92" fill="#0284c7" stroke="#ffffff" stroke-width="4" />
        <g transform="translate(-44, -44) scale(3.6)" fill="#ffffff">
          <path d="${SVG_PATHS.airplane}" />
        </g>
      </g>

      <!-- Title Banner -->
      <g transform="translate(36, 310)">
        <rect width="440" height="74" rx="20" fill="#0369a1" stroke="#ffffff" stroke-width="3" />
        <text x="220" y="52" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="46" fill="#ffffff" text-anchor="middle" letter-spacing="3">WORLD TOUR</text>
      </g>

      <!-- Flight Pill -->
      <g transform="translate(36, 404)">
        <rect width="440" height="66" rx="18" fill="#f0f9ff" stroke="#0ea5e9" stroke-width="2.5" />
        <text x="220" y="44" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="25" fill="#075985" text-anchor="middle">DIRECT FLIGHT TO ANY TILE</text>
      </g>
    `;
  }

  // Generic fallback
  return `
    <text x="256" y="395" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="52" fill="${styles.textPrimary}" text-anchor="middle">${escapeXml(tile.name)}</text>
    <text x="256" y="452" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="32" fill="${styles.textSecondary}" text-anchor="middle">${escapeXml(tile.subtitle || '')}</text>
  `;
}

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC API: TILE SVG GENERATOR & RASTERIZER
───────────────────────────────────────────────────────────────────────────── */

/**
 * Generates the complete, self-contained SVG document for a tile.
 * @param {object} tile - Tile definition from BOARD_TILES
 * @param {object} propState - Dynamic property ownership and mortgage state
 * @returns {string} - XML SVG string
 */
export function generateTileSvg(tile, propState) {
  const boardStyle = matchSettings.boardStyle || 'wood';
  const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
  const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
  const ownerName = isOwned ? (gameState.players[propState.owner]?.name || 'PLAYER').toUpperCase() : '';
  const styles = getBoardThemeStyles(boardStyle, propState, isOwned);
  const rotAngle = getTileRotationAngle(tile.id);

  let innerContent = '';
  if (tile.type === 'city') {
    innerContent = renderCityTileSvg(tile, propState, styles, isOwned, ownerTheme, ownerName);
  } else if (tile.type === 'resort') {
    innerContent = renderResortTileSvg(tile, propState, styles, isOwned, ownerTheme, ownerName);
  } else if (tile.type === 'chance') {
    innerContent = renderChanceTileSvg(tile, styles);
  } else if (tile.type === 'tax') {
    innerContent = renderTaxTileSvg(tile, styles);
  } else {
    innerContent = renderCornerTileSvg(tile, styles);
  }

  const outerBorder = renderTileOuterBorder(isOwned, ownerTheme, styles);
  const mortgageBanner = renderMortgageOverlay(propState?.mortgaged);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <!-- Tile Solid Background -->
      <rect width="512" height="512" fill="${styles.bgFill}" />

      <!-- Outer Border Frame -->
      ${outerBorder}

      <!-- Rotated Inner Tile Face Content (facing street/center) -->
      <g transform="rotate(${rotAngle}, 256, 256)">
        ${innerContent}
        ${mortgageBanner}
      </g>
    </svg>
  `.trim();
}

/**
 * Draws the declarative SVG onto a canvas context using an offscreen Image.
 * @param {string} svgString - SVG document markup
 * @param {HTMLCanvasElement} canvas - Target 512x512 canvas
 * @param {Function} [onComplete] - Callback when image finishes rendering
 */
export function drawSvgToCanvas(svgString, canvas, onComplete) {
  const ctx = canvas.getContext('2d');
  const img = new Image();
  const encodedSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (onComplete) onComplete();
  };

  img.onerror = (err) => {
    console.warn('[tileSvg] SVG rasterization error, falling back:', err);
  };

  img.src = encodedSvg;
}
