/**
 * three/board/tileCanvas.js
 * High-performance, synchronous Canvas 2D texture generator for World Tycoon board tiles.
 * 
 * Direct Canvas 2D rendering:
 * - High-contrast, clean card faces (#ffffff) with architectural cadastral grid.
 * - Minimalist content:
 *     * Unowned: City Name + Buy Price
 *     * Owned: ONLY City Name + Current Rent
 * - Lighting modes:
 *     * Day / Morning: Crisp daylight typography (#0f172a), zero artificial glow
 *     * Night & Sunset: Pure white neon illumination on City Name and Rent (inspired by physical neon tube signs)
 * - Zero SVG latency, zero rasterization bugs, pixel-perfect font rendering.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { GROUP_META, PLAYER_THEMES } from '../../game/data.js';
import { gameState, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { calculateTileRent } from '../../game/rules.js';
import { getTileWorldPosition } from './coords.js';
import { currentBulbMode } from '../core/lighting.js';

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED SVG PATH STRINGS FOR Path2D (Exact Vector Icons)
───────────────────────────────────────────────────────────────────────────── */
const ICON_PATHS = {
  compass: 'M12 2 15 9l7 3-7 3-3 7-3-7-7-3 7-3 3-7zm0 4.8L10.3 10.3 6.8 12l3.5 1.7L12 17.2l1.7-3.5 3.5-1.7-3.5-1.7L12 6.8z',
  palm: 'M13 13c1.5-2.5 4.5-4 8-4-1 2.5-2.5 4.5-5 5.5l5 2.5c-3 .5-5.5-.5-7.5-2 1.5 2.5 2 5.5 1 8.5-1.5-2.5-2.5-5-2.5-8-1 3-3 5.5-6 6.5 1-3 2.5-5 4.5-6.5-2.5 1-5.5 1-8-0.5 3-1 5.5-1 7.5 0.5-2-1.5-3.5-3.5-4.5-6 3.5 0 6.5 1.5 8 4l-1 9h2l-1-9z',
  sparkle: 'M12 2c.5 4.5 4.5 8.5 9 9-4.5.5-8.5 4.5-9 9-.5-4.5-4.5-8.5-9-9 4.5-.5 8.5-4.5 9-9z',
  airplane: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
  dice: 'M3 3h18v18H3V3zm4 4a1.5 1.5 0 1 0 0 .01V7zm10 0a1.5 1.5 0 1 0 0 .01V7zm-5 5a1.5 1.5 0 1 0 0 .01V12zm-5 5a1.5 1.5 0 1 0 0 .01V17zm10 0a1.5 1.5 0 1 0 0 .01V17z',
  lock: 'M17 9V7a5 5 0 0 0-10 0v2H5v13h14V9h-2zm-8-2a3 3 0 0 1 6 0v2H9V7zm3 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z'
};

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS: ROUNDED RECTANGLES & CADASTRA
───────────────────────────────────────────────────────────────────────────── */
function fillRoundRect(ctx, x, y, w, h, r, doFill = true, doStroke = false) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  if (doFill) ctx.fill();
  if (doStroke) ctx.stroke();
}

/**
 * Renders the subtle architectural cadastral grid lines from the reference design.
 */
function drawCadastralGrid(ctx, isCyber) {
  ctx.save();
  ctx.strokeStyle = isCyber ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)';
  ctx.lineWidth = 1.5;

  // Vertical grid lines
  [120, 216, 312, 408].forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x, 78);
    ctx.lineTo(x, 488);
    ctx.stroke();
  });

  // Horizontal grid lines
  [160, 245, 330, 415].forEach(y => {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(492, y);
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Renders authentic white neon light on text:
 * 1. Dark contact casing/outline for razor-sharp legibility against the card face.
 * 2. Diffuse outer white neon bloom.
 * 3. Tight bright neon halo.
 * 4. Pure incandescent white core (the illuminated gas inside the glass tube).
 */
/**
 * Renders physical neon tube typography:
 * 1. Crisp dark tube casing/contour for razor-sharp legibility against the card face.
 * 2. Pure incandescent white core (illuminated gas tube).
 */
function drawWhiteNeonText(ctx, text, x, y, font) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. Crisp dark channel casing (12px wide to provide an unshakeable, razor-sharp contrast border)
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 14;
  ctx.strokeText(text, x, y);

  // 2. Pure white tube core
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);

  ctx.restore();
}

/* ─────────────────────────────────────────────────────────────────────────────
   TILE CONTENT DRAWING FUNCTIONS
───────────────────────────────────────────────────────────────────────────── */

function drawCityTile(ctx, tile, propState, isOwned, isNight, isSunset, isCyber) {
  const groupColor = (tile.group && GROUP_META[tile.group]) ? GROUP_META[tile.group].hex : '#38bdf8';

  // Cadastral Architectural Grid (subtle architectural grid lines)
  drawCadastralGrid(ctx, isCyber);

  // Top Group Color Strip
  ctx.fillStyle = groupColor;
  ctx.fillRect(16, 16, 480, 58);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.fillRect(16, 16, 480, 7);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 74, 480, 4);

  // Typography metrics — bold 800 weight with wide open counters
  const nameLen = tile.name.length;
  const nameFontSize = nameLen <= 6 ? 66 : (nameLen <= 9 ? 56 : (nameLen <= 11 ? 46 : 38));
  const nameFont = `800 ${nameFontSize}px Rubik, system-ui, sans-serif`;

  let valStr;
  if (isOwned) {
    const rentAmt = calculateTileRent(tile.id);
    valStr = fmtMoney(rentAmt);
  } else {
    valStr = fmtMoney(tile.price);
  }

  const valLen = valStr.length;
  const valFontSize = valLen <= 4 ? 104 : (valLen <= 5 ? 92 : (valLen <= 6 ? 82 : 72));
  const valFont = `800 ${valFontSize}px Rubik, system-ui, sans-serif`;

  // Optically shifted downward: name sits below the 3D building footprint (Y: 265), rent sits at bottom (Y: 415)
  const nameY = 265;
  const valY = 415;

  if (isOwned) {
    if (isNight || isSunset) {
      // NIGHT & SUNSET: High-contrast white neon channel letters
      drawWhiteNeonText(ctx, tile.name, 256, nameY, nameFont);
      drawWhiteNeonText(ctx, valStr, 256, valY, valFont);
    } else {
      // DAY / MORNING: Crisp daylight typography
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
      ctx.font = nameFont;
      ctx.fillText(tile.name, 256, nameY);
      ctx.font = valFont;
      ctx.fillText(valStr, 256, valY);
    }
  } else {
    // UNOWNED: Crisp, clear, high-contrast dark typography at identical optical coordinates
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
    ctx.font = nameFont;
    ctx.fillText(tile.name, 256, nameY);
    ctx.font = valFont;
    ctx.fillText(valStr, 256, valY);
  }
}

function drawResortTile(ctx, tile, propState, isOwned, isNight, isSunset, isCyber) {
  const resortColor = '#0ea5e9';

  // Cadastral Architectural Grid
  drawCadastralGrid(ctx, isCyber);

  // Top Resort Header Strip
  ctx.fillStyle = resortColor;
  ctx.fillRect(16, 16, 480, 58);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.fillRect(16, 16, 480, 7);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 74, 480, 4);

  // Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px Rubik, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RESORT', 256, 45);

  const nameLen = tile.name.length;
  const nameFontSize = nameLen <= 6 ? 66 : (nameLen <= 9 ? 56 : (nameLen <= 11 ? 46 : 38));
  const nameFont = `800 ${nameFontSize}px Rubik, system-ui, sans-serif`;

  let valStr;
  if (isOwned) {
    const rentAmt = calculateTileRent(tile.id);
    valStr = fmtMoney(rentAmt);
  } else {
    valStr = fmtMoney(tile.price);
  }

  const valLen = valStr.length;
  const valFontSize = valLen <= 4 ? 104 : (valLen <= 5 ? 92 : (valLen <= 6 ? 82 : 72));
  const valFont = `800 ${valFontSize}px Rubik, system-ui, sans-serif`;

  const nameY = 265;
  const valY = 415;

  if (isOwned) {
    if (isNight || isSunset) {
      drawWhiteNeonText(ctx, tile.name, 256, nameY, nameFont);
      drawWhiteNeonText(ctx, valStr, 256, valY, valFont);
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
      ctx.font = nameFont;
      ctx.fillText(tile.name, 256, nameY);
      ctx.font = valFont;
      ctx.fillText(valStr, 256, valY);
    }
  } else {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
    ctx.font = nameFont;
    ctx.fillText(tile.name, 256, nameY);
    ctx.font = valFont;
    ctx.fillText(valStr, 256, valY);
  }
}

function drawChanceTile(ctx, isCyber) {
  const colors = ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#a855f7', '#fb923c'];
  const cx = 256, cy = 190, r = 105;

  for (let i = 0; i < 6; i++) {
    const a1 = (i * Math.PI) / 3;
    const a2 = ((i + 1) * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a1, a2);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    ctx.strokeStyle = isCyber ? '#00f5ff' : '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Wheel Center Hub
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = isCyber ? '#00f5ff' : '#0f172a';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Star Icon
  ctx.save();
  ctx.translate(cx - 16, cy - 16);
  ctx.scale(1.3, 1.3);
  ctx.fillStyle = '#f59e0b';
  ctx.fill(new Path2D(ICON_PATHS.sparkle));
  ctx.restore();

  // Chance Header Pill
  ctx.fillStyle = '#0284c7';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  fillRoundRect(ctx, 36, 350, 440, 74, 20, true, true);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 46px Rubik, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHANCE', 256, 387);

  // Subtitle
  ctx.fillStyle = isCyber ? '#94a3b8' : '#64748b';
  ctx.font = '800 22px Rubik, system-ui, sans-serif';
  ctx.fillText('SPIN WHEEL FOR PRIZES', 256, 468);
}

function drawTaxTile(ctx, tile, isCyber) {
  const taxAmount = tile.amount || 150000;

  // Vault Box
  ctx.fillStyle = isCyber ? '#111827' : '#f1f5f9';
  ctx.strokeStyle = isCyber ? '#ec4899' : '#64748b';
  ctx.lineWidth = 6;
  fillRoundRect(ctx, 166, 60, 180, 190, 24, true, true);

  ctx.fillStyle = '#dc2626';
  ctx.font = '900 100px Rubik, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('%', 256, 155);

  // Title
  ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
  ctx.font = '900 56px Rubik, system-ui, sans-serif';
  ctx.fillText('WORLD TAX', 256, 340);

  // Amount Pill
  ctx.fillStyle = '#fef2f2';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  fillRoundRect(ctx, 36, 386, 440, 68, 18, true, true);

  ctx.fillStyle = '#dc2626';
  ctx.font = '900 46px Rubik, system-ui, sans-serif';
  ctx.fillText(`-${fmtMoney(taxAmount)}`, 256, 420);

  // Subtitle
  ctx.fillStyle = isCyber ? '#94a3b8' : '#64748b';
  ctx.font = '800 20px Rubik, system-ui, sans-serif';
  ctx.fillText('FEES FUND THE FESTIVAL POOL', 256, 488);
}

function drawCornerTile(ctx, tile, isCyber) {
  const tileId = tile.id;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (tileId === 0) {
    // START
    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 175, 92, 0, Math.PI * 2);
    ctx.fillStyle = '#059669';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.translate(256 - 48, 175 - 48);
    ctx.scale(4.0, 4.0);
    ctx.fillStyle = '#fef08a';
    ctx.fill(new Path2D(ICON_PATHS.compass));
    ctx.restore();

    ctx.fillStyle = '#047857';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    fillRoundRect(ctx, 36, 310, 440, 74, 20, true, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px Rubik, system-ui, sans-serif';
    ctx.fillText('START', 256, 347);

    ctx.fillStyle = '#ecfdf5';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    fillRoundRect(ctx, 36, 404, 440, 66, 18, true, true);

    ctx.fillStyle = '#065f46';
    ctx.font = '900 26px Rubik, system-ui, sans-serif';
    ctx.fillText('PASS: +300K • LAND: +400K', 256, 437);
    return;
  }

  if (tileId === 8) {
    // ISLAND JAIL
    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 175, 92, 0, Math.PI * 2);
    ctx.fillStyle = '#d97706';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.translate(256 - 36, 175 - 36);
    ctx.scale(3.0, 3.0);
    ctx.fillStyle = '#fef3c7';
    ctx.fill(new Path2D(ICON_PATHS.palm));
    ctx.restore();

    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    fillRoundRect(ctx, 36, 310, 440, 74, 20, true, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px Rubik, system-ui, sans-serif';
    ctx.fillText('ISLAND JAIL', 256, 347);

    ctx.fillStyle = '#fffbeb';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    fillRoundRect(ctx, 36, 404, 440, 66, 18, true, true);

    ctx.fillStyle = '#92400e';
    ctx.font = '900 24px Rubik, system-ui, sans-serif';
    ctx.fillText('ROLL DOUBLES OR 150K BAIL', 256, 437);
    return;
  }

  if (tileId === 16) {
    // FESTIVAL
    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 175, 92, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.translate(256 - 40, 175 - 40);
    ctx.scale(3.4, 3.4);
    ctx.fillStyle = '#fbcfe8';
    ctx.fill(new Path2D(ICON_PATHS.sparkle));
    ctx.restore();

    ctx.fillStyle = '#6d28d9';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    fillRoundRect(ctx, 36, 310, 440, 74, 20, true, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px Rubik, system-ui, sans-serif';
    ctx.fillText('FESTIVAL', 256, 347);

    ctx.fillStyle = '#faf5ff';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    fillRoundRect(ctx, 36, 404, 440, 66, 18, true, true);

    ctx.fillStyle = '#581c87';
    ctx.font = '900 25px Rubik, system-ui, sans-serif';
    ctx.fillText('2X CITY RENT & TAX JACKPOT', 256, 437);
    return;
  }

  if (tileId === 24) {
    // WORLD TOUR
    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 175, 92, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.translate(256 - 44, 175 - 44);
    ctx.scale(3.6, 3.6);
    ctx.fillStyle = '#ffffff';
    ctx.fill(new Path2D(ICON_PATHS.airplane));
    ctx.restore();

    ctx.fillStyle = '#0369a1';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    fillRoundRect(ctx, 36, 310, 440, 74, 20, true, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px Rubik, system-ui, sans-serif';
    ctx.fillText('WORLD TOUR', 256, 347);

    ctx.fillStyle = '#f0f9ff';
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2.5;
    fillRoundRect(ctx, 36, 404, 440, 66, 18, true, true);

    ctx.fillStyle = '#075985';
    ctx.font = '900 25px Rubik, system-ui, sans-serif';
    ctx.fillText('DIRECT FLIGHT TO ANY TILE', 256, 437);
    return;
  }

  // Fallback
  ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
  ctx.font = '900 52px Rubik, system-ui, sans-serif';
  ctx.fillText(tile.name, 256, 395);
  ctx.fillStyle = isCyber ? '#94a3b8' : '#64748b';
  ctx.font = '800 32px Rubik, system-ui, sans-serif';
  ctx.fillText(tile.subtitle || '', 256, 452);
}

function drawMortgageOverlay(ctx) {
  // Mortgage feature removed
}

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC CANVAS TEXTURE GENERATOR
───────────────────────────────────────────────────────────────────────────── */

/**
 * Draws the entire tile face synchronously to a 512x512 canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {object} tile
 * @param {object} propState
 */
export function drawTileToCanvas(canvas, tile, propState) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  const boardStyle = matchSettings.boardStyle || 'wood';
  const isCyber = boardStyle === 'cyberpunk';
  const isElegant = boardStyle === 'elegant';
  const bulbMode = currentBulbMode || matchSettings?.lightingTheme || 'day';
  const isNight = bulbMode === 'night';
  const isSunset = bulbMode === 'sunset';

  // 1. Solid Clean Background (Always keep cards clean white, never turn black!)
  let bgFill = '#ffffff';
  if (isCyber) bgFill = '#080d1a';
  else if (isElegant) bgFill = '#fafaf9';
  else bgFill = '#ffffff';

  ctx.fillStyle = bgFill;
  ctx.fillRect(0, 0, 512, 512);

  // 2. Outer Border Frame
  const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
  const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;

  if (isOwned && ownerTheme) {
    ctx.strokeStyle = ownerTheme.colorHex;
    ctx.lineWidth = 26;
    ctx.strokeRect(13, 13, 486, 486);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(27, 27, 458, 458);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
    ctx.fillRect(29, 29, 454, 6);
    ctx.fillRect(29, 29, 6, 454);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.fillRect(29, 477, 454, 6);
    ctx.fillRect(477, 29, 6, 454);
  } else {
    if (isCyber) {
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 10;
      ctx.strokeRect(7, 7, 498, 498);
      ctx.strokeStyle = '#d946ef';
      ctx.lineWidth = 3;
      ctx.strokeRect(16, 16, 480, 480);
    } else if (isElegant) {
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 12;
      ctx.strokeRect(7, 7, 498, 498);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.strokeRect(16, 16, 480, 480);
    } else {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 498, 498);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 472, 472);
    }
  }

  // 3. Tile rotation facing center/street
  const pos = getTileWorldPosition(tile.id);
  ctx.save();
  ctx.translate(256, 256);
  if (pos.side === 1) ctx.rotate(Math.PI / 2);
  else if (pos.side === 2) ctx.rotate(Math.PI);
  else if (pos.side === 3) ctx.rotate(-Math.PI / 2);
  ctx.translate(-256, -256);

  // 4. Inner Content
  if (tile.type === 'city') {
    drawCityTile(ctx, tile, propState, isOwned, isNight, isSunset, isCyber);
  } else if (tile.type === 'resort') {
    drawResortTile(ctx, tile, propState, isOwned, isNight, isSunset, isCyber);
  } else if (tile.type === 'chance') {
    drawChanceTile(ctx, isCyber);
  } else if (tile.type === 'tax') {
    drawTaxTile(ctx, tile, isCyber);
  } else {
    drawCornerTile(ctx, tile, isCyber);
  }

  // 5. Mortgage Overlay (removed)

  ctx.restore();
}

/**
 * Generates a high-intensity emissive map texture for owned city/resort tiles in night/sunset modes.
 * In Three.js MeshStandardMaterial, this texture physically emits light in the 3D scene:
 * - Pure black (#000000) for the card background (zero light emission).
 * - Glowing pure white (#ffffff) with soft bloom for City Name and Rent (radiates real 3D light!).
 * @param {object} tile
 * @param {object} propState
 * @returns {THREE.CanvasTexture|null}
 */
export function createTileEmissiveTexture(tile, propState) {
  const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
  if (!isOwned) return null;
  if (tile.type !== 'city' && tile.type !== 'resort') return null;
  
  const bulbMode = currentBulbMode || matchSettings?.lightingTheme || 'day';
  const isNight = bulbMode === 'night';
  const isSunset = bulbMode === 'sunset';
  if (!isNight && !isSunset) return null;

  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  // Pitch black background = 0 emissive light on the tile face
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 512, 512);

  // Rotate according to tile side
  const pos = getTileWorldPosition(tile.id);
  ctx.save();
  ctx.translate(256, 256);
  if (pos.side === 1) ctx.rotate(Math.PI / 2);
  else if (pos.side === 2) ctx.rotate(Math.PI);
  else if (pos.side === 3) ctx.rotate(-Math.PI / 2);
  ctx.translate(-256, -256);

  // Typography metrics — matching drawCityTile 800 weight with open counters
  const nameLen = tile.name.length;
  const nameFontSize = nameLen <= 6 ? 66 : (nameLen <= 9 ? 56 : (nameLen <= 11 ? 46 : 38));
  const nameFont = `800 ${nameFontSize}px Rubik, system-ui, sans-serif`;

  const rentAmt = calculateTileRent(tile.id);
  const valStr = fmtMoney(rentAmt);
  const valLen = valStr.length;
  const valFontSize = valLen <= 4 ? 104 : (valLen <= 5 ? 92 : (valLen <= 6 ? 82 : 72));
  const valFont = `800 ${valFontSize}px Rubik, system-ui, sans-serif`;

  const nameY = 265;
  const valY = 415;

  const emissiveColor = isSunset ? '#fff0a0' : '#ffffff';
  const cRGB = isSunset ? '255, 240, 180' : '230, 245, 255';

  // ── 1. Soft Proximity Light Wash (delicate ambient spill, strictly non-blinding) ──
  ctx.save();
  // Name proximity pool
  const g1 = ctx.createRadialGradient(256, nameY, 15, 256, nameY, 190);
  g1.addColorStop(0, `rgba(${cRGB}, 0.14)`);
  g1.addColorStop(0.40, `rgba(${cRGB}, 0.07)`);
  g1.addColorStop(0.75, `rgba(${cRGB}, 0.02)`);
  g1.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g1;
  ctx.beginPath();
  ctx.arc(256, nameY, 190, 0, Math.PI * 2);
  ctx.fill();

  // Rent proximity pool
  const g2 = ctx.createRadialGradient(256, valY, 20, 256, valY, 210);
  g2.addColorStop(0, `rgba(${cRGB}, 0.16)`);
  g2.addColorStop(0.40, `rgba(${cRGB}, 0.08)`);
  g2.addColorStop(0.75, `rgba(${cRGB}, 0.03)`);
  g2.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.arc(256, valY, 210, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── 2. Resort Header Subtle Emissive Glow (prevents dark navy washout on resort tiles) ──
  if (tile.type === 'resort') {
    ctx.save();
    ctx.font = '900 30px Rubik, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('RESORT', 256, 45);
    ctx.restore();
  }

  // ── 3. Neon Tube Incandescent Lighting with Contrast Protection Moat ──
  function drawEmissiveLight(text, x, y, font) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Step A: Contrast Shield Moat
    // Erases any proximity wash from the outline so the dark channel casing on the
    // diffuse texture remains pure, deep black on the GPU without getting washed out!
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeText(text, x, y);

    // Step B: Pure white glowing neon tube core inside the black moat
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  drawEmissiveLight(tile.name, 256, nameY, nameFont);
  drawEmissiveLight(valStr, 256, valY, valFont);

  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = context?.maxAnisotropy || 1;
  tex.needsUpdate = true;
  return tex;
}

