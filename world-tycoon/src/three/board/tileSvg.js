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

  let bgFill = '#ffffff';
  let textPrimary = '#0f172a';
  let textSecondary = '#64748b';
  let cardBorder = '#64748b';
  let boxFill = '#f8fafc';
  let boxBorder = '#e2e8f0';

  if (isCyber) {
    bgFill = propState?.mortgaged ? '#0e1726' : '#080d1a';
    textPrimary = '#ffffff';
    textSecondary = '#94a3b8';
    cardBorder = '#00f5ff';
    boxFill = 'rgba(15, 23, 42, 0.75)';
    boxBorder = '#1e293b';
  } else if (isElegant) {
    bgFill = propState?.mortgaged ? '#f1f5f9' : '#fafaf9';
    textPrimary = '#1c1917';
    textSecondary = '#78716c';
    cardBorder = '#d4af37';
    boxFill = '#fdfbf7';
    boxBorder = '#f5eedb';
  } else {
    bgFill = propState?.mortgaged ? '#e2e8f0' : '#ffffff';
  }

  return { isCyber, isElegant, bgFill, textPrimary, textSecondary, cardBorder, boxFill, boxBorder };
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
 * Generates mortgage overlay banner SVG if property is mortgaged.
 */
function renderMortgageOverlay(isMortgaged) {
  if (!isMortgaged) return '';
  return `
    <!-- Mortgage Overlay Banner -->
    <g transform="translate(26, 215)">
      <rect width="460" height="92" rx="14" fill="rgba(225, 29, 72, 0.96)" stroke="#ffffff" stroke-width="5" />
      <g transform="translate(56, 32) scale(1.2)" fill="#ffffff">
        <path d="${SVG_PATHS.lock}" />
      </g>
      <text x="240" y="58" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle" letter-spacing="3">MORTGAGED</text>
    </g>
  `;
}

/**
 * Generates City Tile SVG Vector Template.
 */
function renderCityTileSvg(tile, propState, styles, isOwned, ownerTheme, ownerName) {
  const groupColor = tile.group && GROUP_META[tile.group] ? GROUP_META[tile.group].hex : '#38bdf8';
  const nameLen = tile.name.length;
  const nameFontSize = nameLen <= 6 ? 64 : (nameLen <= 9 ? 54 : (nameLen <= 11 ? 46 : 40));
  const lvl = propState?.level || 0;

  let progressionContent = '';
  if (isOwned) {
    // Owner Plaque + 4 Upgrade Slots (H1, H2, H3, SKY)
    let slotsMarkup = '';
    for (let i = 0; i < 3; i++) {
      const slotX = 36 + i * 112;
      const isActive = lvl >= i + 1;
      const fill = isActive ? '#10b981' : (styles.isCyber ? 'rgba(255,255,255,0.06)' : '#f1f5f9');
      const stroke = isActive ? '#ffffff' : (styles.isCyber ? 'rgba(255,255,255,0.16)' : '#cbd5e1');
      const textFill = isActive ? '#ffffff' : (styles.isCyber ? '#64748b' : '#94a3b8');
      const iconFill = isActive ? '#ffffff' : (styles.isCyber ? '#64748b' : '#94a3b8');

      slotsMarkup += `
        <rect x="${slotX}" y="236" width="104" height="42" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="${isActive ? 2 : 1.5}" />
        <g transform="translate(${slotX + 16}, 245) scale(0.9)" fill="${iconFill}">
          <path d="${SVG_PATHS.house}" />
        </g>
        <text x="${slotX + 64}" y="263" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="19" fill="${textFill}" text-anchor="middle">H${i + 1}</text>
      `;
    }

    // Slot 4: Skyscraper
    const skyX = 372;
    const isSkyActive = lvl >= 4;
    const skyFill = isSkyActive ? '#8b5cf6' : (styles.isCyber ? 'rgba(255,255,255,0.06)' : '#f1f5f9');
    const skyStroke = isSkyActive ? '#ffffff' : (styles.isCyber ? 'rgba(255,255,255,0.16)' : '#cbd5e1');
    const skyTextFill = isSkyActive ? '#ffffff' : (styles.isCyber ? '#64748b' : '#94a3b8');
    const skyIconFill = isSkyActive ? '#ffffff' : (styles.isCyber ? '#64748b' : '#94a3b8');

    slotsMarkup += `
      <rect x="${skyX}" y="236" width="104" height="42" rx="10" fill="${skyFill}" stroke="${skyStroke}" stroke-width="${isSkyActive ? 2 : 1.5}" />
      <g transform="translate(${skyX + 14}, 244) scale(0.95)" fill="${skyIconFill}">
        <path d="${SVG_PATHS.skyscraper}" />
      </g>
      <text x="${skyX + 66}" y="263" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="18" fill="${skyTextFill}" text-anchor="middle">SKY</text>
    `;

    progressionContent = `
      <!-- Owner Plaque Banner -->
      <g transform="translate(36, 180)">
        <rect width="440" height="46" rx="14" fill="${ownerTheme.colorHex}" stroke="#ffffff" stroke-width="2" />
        <g transform="translate(68, 11) scale(1.0)" fill="#ffffff">
          <path d="${SVG_PATHS.crown}" />
        </g>
        <text x="235" y="31" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="24" fill="#ffffff" text-anchor="middle">${escapeXml(ownerName)}</text>
      </g>
      ${slotsMarkup}
    `;
  } else {
    // Unowned: House Potential & Build Cost Container
    let previewSlotsMarkup = '';
    const previewLabels = ['H1', 'H2', 'H3', 'SKY'];
    for (let i = 0; i < 4; i++) {
      const pX = 52 + i * 104;
      const isSky = i === 3;
      const iconPath = isSky ? SVG_PATHS.skyscraper : SVG_PATHS.house;
      previewSlotsMarkup += `
        <rect x="${pX}" y="234" width="96" height="32" rx="8" fill="${styles.isCyber ? 'rgba(30, 41, 59, 0.65)' : '#e2e8f0'}" stroke="${styles.isCyber ? '#334155' : '#cbd5e1'}" stroke-width="1" />
        <g transform="translate(${pX + 12}, 240) scale(0.7)" fill="${styles.isCyber ? '#94a3b8' : '#475569'}">
          <path d="${iconPath}" />
        </g>
        <text x="${pX + 54}" y="255" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="15" fill="${styles.isCyber ? '#94a3b8' : '#475569'}" text-anchor="middle">${previewLabels[i]}</text>
      `;
    }

    progressionContent = `
      <g transform="translate(36, 180)">
        <rect width="440" height="98" rx="16" fill="${styles.boxFill}" stroke="${styles.boxBorder}" stroke-width="2" />
        <g transform="translate(42, 16) scale(0.9)" fill="${styles.isCyber ? '#38bdf8' : '#0284c7'}">
          <path d="${SVG_PATHS.crane}" />
        </g>
        <text x="235" y="35" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="22" fill="${styles.isCyber ? '#38bdf8' : '#0284c7'}" text-anchor="middle">BUILD HOUSE: +${fmtMoney(tile.houseCost || 0)}</text>
      </g>
      ${previewSlotsMarkup}
    `;
  }

  // Rent / Price Showcase & Footer
  let showcaseContent = '';
  if (isOwned) {
    const rentAmt = propState?.mortgaged ? 0 : calculateTileRent(tile.id);
    const rentStr = fmtMoney(rentAmt);
    const rentFontSize = rentStr.length > 8 ? 72 : 84;
    const rentColor = styles.isCyber ? '#38bdf8' : '#047857';

    let footerPill = '';
    if (propState?.festivalBoost) {
      footerPill = `
        <rect x="36" y="436" width="440" height="50" rx="14" fill="${styles.isCyber ? 'rgba(236, 72, 153, 0.22)' : '#fdf2f8'}" stroke="#ec4899" stroke-width="2" />
        <text x="256" y="468" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="21" fill="#db2777" text-anchor="middle">★ FESTIVAL 2X RENT ACTIVE ★</text>
      `;
    } else if (propState?.mortgaged) {
      footerPill = `
        <rect x="36" y="436" width="440" height="50" rx="14" fill="#fef2f2" stroke="#ef4444" stroke-width="2" />
        <text x="256" y="468" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="21" fill="#dc2626" text-anchor="middle">MORTGAGED — NO RENT</text>
      `;
    } else if (lvl === 4) {
      footerPill = `
        <rect x="36" y="436" width="440" height="50" rx="14" fill="${styles.isCyber ? 'rgba(168, 85, 247, 0.22)' : '#faf5ff'}" stroke="#a855f7" stroke-width="2" />
        <text x="256" y="468" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="21" fill="#7c3aed" text-anchor="middle">★ MAX LEVEL SKYSCRAPER ★</text>
      `;
    } else {
      footerPill = `
        <rect x="36" y="436" width="440" height="50" rx="14" fill="${styles.isCyber ? 'rgba(30, 41, 59, 0.7)' : '#f1f5f9'}" stroke="${styles.isCyber ? '#334155' : '#cbd5e1'}" stroke-width="1.5" />
        <text x="256" y="468" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="21" fill="${styles.isCyber ? '#94a3b8' : '#475569'}" text-anchor="middle">TIER ${lvl} OF 4 HOUSES</text>
      `;
    }

    showcaseContent = `
      <text x="256" y="320" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="22" fill="${rentColor}" text-anchor="middle">CURRENT RENT</text>
      <text x="256" y="396" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="${rentFontSize}" fill="${rentColor}" text-anchor="middle">${rentStr}</text>
      ${footerPill}
    `;
  } else {
    const priceStr = fmtMoney(tile.price);
    const priceFontSize = priceStr.length > 8 ? 74 : 86;
    const priceColor = styles.isCyber ? '#00f5ff' : '#0f172a';

    showcaseContent = `
      <text x="256" y="316" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="22" fill="${styles.textSecondary}" text-anchor="middle">PURCHASE PRICE</text>
      <text x="256" y="390" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="${priceFontSize}" fill="${priceColor}" text-anchor="middle">${priceStr}</text>
      <g transform="translate(36, 432)">
        <rect width="440" height="54" rx="16" fill="${styles.isCyber ? 'rgba(30, 41, 59, 0.85)' : '#f1f5f9'}" stroke="${styles.isCyber ? '#334155' : '#cbd5e1'}" stroke-width="2" />
        <text x="220" y="36" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="24" fill="${styles.isCyber ? '#38bdf8' : '#0f172a'}" text-anchor="middle">BASE RENT: ${fmtMoney(tile.rent?.[0] || 0)}</text>
      </g>
    `;
  }

  return `
    <!-- Top Group Color Bar -->
    <rect x="16" y="16" width="480" height="72" fill="${groupColor}" />
    <rect x="16" y="16" width="480" height="8" fill="rgba(255, 255, 255, 0.35)" />
    <rect x="16" y="88" width="480" height="4" fill="#0f172a" />

    <!-- City Name -->
    <text x="256" y="146" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="${nameFontSize}" fill="${styles.textPrimary}" text-anchor="middle">${escapeXml(tile.name)}</text>

    <!-- Zone 2: Progression / Build Track -->
    ${progressionContent}

    <!-- Zone 3: Price / Rent Showcase -->
    ${showcaseContent}
  `;
}

/**
 * Generates Resort Tile SVG Vector Template.
 */
function renderResortTileSvg(tile, propState, styles, isOwned, ownerTheme, ownerName) {
  const resortFontSize = tile.name.length > 8 ? 44 : 54;
  let bodyContent = '';

  if (isOwned) {
    const rentAmt = propState?.mortgaged ? 0 : calculateTileRent(tile.id);
    const rentStr = fmtMoney(rentAmt);
    const rentFontSize = rentStr.length > 8 ? 72 : 84;
    const rentColor = styles.isCyber ? '#38bdf8' : '#047857';

    bodyContent = `
      <!-- Owner Plaque -->
      <g transform="translate(36, 180)">
        <rect width="440" height="46" rx="14" fill="${ownerTheme.colorHex}" stroke="#ffffff" stroke-width="2" />
        <g transform="translate(68, 11) scale(1.0)" fill="#ffffff">
          <path d="${SVG_PATHS.crown}" />
        </g>
        <text x="235" y="31" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="24" fill="#ffffff" text-anchor="middle">${escapeXml(ownerName)}</text>
      </g>

      <!-- Multiplier Feature Pill -->
      <g transform="translate(36, 236)">
        <rect width="440" height="42" rx="10" fill="${styles.isCyber ? 'rgba(30, 41, 59, 0.65)' : '#f1f5f9'}" stroke="${styles.isCyber ? '#334155' : '#cbd5e1'}" stroke-width="1.5" />
        <g transform="translate(42, 10) scale(0.9)" fill="${styles.isCyber ? '#38bdf8' : '#0284c7'}">
          <path d="${SVG_PATHS.palm}" />
        </g>
        <text x="235" y="28" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="18" fill="${styles.isCyber ? '#38bdf8' : '#0284c7'}" text-anchor="middle">VACATION MULTIPLIER (1X–5X)</text>
      </g>

      <!-- Rent Showcase -->
      <text x="256" y="320" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="22" fill="${rentColor}" text-anchor="middle">RESORT RENT</text>
      <text x="256" y="396" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="${rentFontSize}" fill="${rentColor}" text-anchor="middle">${rentStr}</text>

      <!-- Status Footer Pill -->
      <g transform="translate(36, 436)">
        <rect width="440" height="50" rx="14" fill="${styles.isCyber ? 'rgba(30, 41, 59, 0.7)' : '#f1f5f9'}" stroke="${styles.isCyber ? '#334155' : '#cbd5e1'}" stroke-width="1.5" />
        <text x="220" y="32" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="21" fill="${styles.isCyber ? '#94a3b8' : '#475569'}" text-anchor="middle">★ SCALES WITH OWNED RESORTS ★</text>
      </g>
    `;
  } else {
    const priceStr = fmtMoney(tile.price);
    const priceFontSize = priceStr.length > 8 ? 74 : 86;
    const priceColor = styles.isCyber ? '#00f5ff' : '#0f172a';

    bodyContent = `
      <!-- Unowned Feature Box -->
      <g transform="translate(36, 180)">
        <rect width="440" height="98" rx="16" fill="${styles.boxFill}" stroke="${styles.boxBorder}" stroke-width="2" />
        <g transform="translate(42, 14) scale(1.0)" fill="${styles.isCyber ? '#38bdf8' : '#0284c7'}">
          <path d="${SVG_PATHS.palm}" />
        </g>
        <text x="235" y="34" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="22" fill="${styles.isCyber ? '#38bdf8' : '#0284c7'}" text-anchor="middle">VACATION DESTINATION</text>
        <text x="220" y="74" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="18" fill="${styles.textSecondary}" text-anchor="middle">RENT MULTIPLIER: 1X → 2X → 4X → 8X</text>
      </g>

      <!-- Price Showcase -->
      <text x="256" y="316" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="22" fill="${styles.textSecondary}" text-anchor="middle">PURCHASE PRICE</text>
      <text x="256" y="390" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="${priceFontSize}" fill="${priceColor}" text-anchor="middle">${priceStr}</text>

      <!-- Base Rent Pill -->
      <g transform="translate(36, 432)">
        <rect width="440" height="54" rx="16" fill="${styles.isCyber ? 'rgba(30, 41, 59, 0.85)' : '#f1f5f9'}" stroke="${styles.isCyber ? '#334155' : '#cbd5e1'}" stroke-width="2" />
        <text x="220" y="36" font-family="Rubik, system-ui, sans-serif" font-weight="800" font-size="24" fill="${styles.isCyber ? '#38bdf8' : '#0f172a'}" text-anchor="middle">BASE RENT: ${fmtMoney(tile.rent?.[0] || 0)}</text>
      </g>
    `;
  }

  return `
    <!-- Top Resort Header Bar -->
    <rect x="16" y="16" width="480" height="68" fill="#0ea5e9" />
    <rect x="16" y="16" width="480" height="8" fill="rgba(255, 255, 255, 0.32)" />
    <rect x="16" y="84" width="480" height="4" fill="#0f172a" />
    <text x="256" y="58" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="32" fill="#ffffff" text-anchor="middle" letter-spacing="2">RESORT</text>

    <!-- Resort Title -->
    <text x="256" y="146" font-family="Rubik, system-ui, sans-serif" font-weight="900" font-size="${resortFontSize}" fill="${styles.textPrimary}" text-anchor="middle">${escapeXml(tile.name)}</text>

    ${bodyContent}
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
