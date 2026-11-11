/**
 * three/board/tiles/cityTileRenderer.js
 * 2D Canvas rendering for City and Resort real-estate tiles.
 */

import { GROUP_META, PLAYER_THEMES } from '../../../game/data.js';
import { gameState } from '../../../game/state.js';
import { fmtMoney } from '../../../game/utils.js';
import { calculateTileRent } from '../../../game/rules.js';
import { drawCadastralGrid, drawWhiteNeonText, drawCrispNeonPrice } from './canvasUtils.js';

const THEME_ICONS = ['🎩', '✈️', '🧭', '⚡', '👑', '💎'];

/**
 * Adjusts color hex brightness by percentage (-1.0 to 1.0).
 */
function adjustColorBrightness(hex, percent) {
  const cleanHex = (hex || '#3b82f6').replace('#', '');
  const num = parseInt(cleanHex.length === 3 ? cleanHex.split('').map(c => c + c).join('') : cleanHex, 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(255 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Draws the high-contrast Owner Ribbon directly onto the tile face.
 * Displays owner avatar emoji, bold capitalized name, and slot badge (P1-P4).
 */
export function drawOwnerRibbon(ctx, propState, isNight, isSunset, isCyber) {
  const ownerIdx = propState?.owner;
  if (ownerIdx === null || ownerIdx === undefined) return;
  const player = gameState?.players?.[ownerIdx];
  const theme = PLAYER_THEMES[ownerIdx];
  const colorHex = player?.colorHex || theme?.colorHex || '#3b82f6';
  const rawName = player?.name || theme?.name || `PLAYER ${ownerIdx + 1}`;
  const ownerName = rawName.toUpperCase();
  const icon = player?.icon || theme?.icon || THEME_ICONS[ownerIdx % THEME_ICONS.length] || '👑';
  const slotBadge = `P${ownerIdx + 1}`;

  const rx = 36;
  const ry = 154;
  const rw = 440;
  const rh = 46;
  const radius = 12;

  ctx.save();

  // 1. Soft Drop Shadow for separation
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  // 2. Ribbon Background Gradient
  const ribbonGrad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
  ribbonGrad.addColorStop(0, colorHex);
  ribbonGrad.addColorStop(1, adjustColorBrightness(colorHex, -0.18));
  ctx.fillStyle = ribbonGrad;

  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(rx, ry, rw, rh, radius);
  } else {
    ctx.rect(rx, ry, rw, rh);
  }
  ctx.fill();

  // 3. Crisp Inner Border
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. Left Slot Badge (P1, P2...)
  const slotW = 50;
  const slotH = 30;
  const slotX = rx + 10;
  const slotY = ry + (rh - slotH) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(slotX, slotY, slotW, slotH, 15);
  } else {
    ctx.rect(slotX, slotY, slotW, slotH);
  }
  ctx.fill();

  ctx.fillStyle = colorHex;
  ctx.font = '900 18px Rubik, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(slotBadge, slotX + slotW / 2, slotY + slotH / 2);

  // 5. Right Avatar Circle
  const avatarCenterX = rx + rw - 26;
  const avatarCenterY = ry + rh / 2;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '20px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, avatarCenterX, avatarCenterY + 1);

  // 6. Owner Name (Crisp white text with subtle shadow, NO thick muddy black stroke)
  const textX = (slotX + slotW + avatarCenterX - 17) / 2;
  const textY = ry + rh / 2;
  const maxTextW = (avatarCenterX - 24) - (slotX + slotW + 10);

  ctx.font = '900 24px Rubik, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  ctx.shadowColor = 'rgba(0, 0, 0, 0.60)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(ownerName, textX, textY, maxTextW);

  ctx.restore();
}

/**
 * Backwards-compatible export for tests.
 */
export function drawUnownedPill(ctx, isCyber) {
  // Kept unowned tiles clean and pristine without cluttering placeholder stickers
  if (!ctx) return;
  ctx.save?.();
  ctx.restore?.();
}

export function drawCityTile(ctx, tile, propState, isOwned, isNight, isSunset, isCyber) {
  const groupColor = (tile.group && GROUP_META[tile.group]) ? GROUP_META[tile.group].hex : '#38bdf8';

  drawCadastralGrid(ctx, isCyber);

  // Top Group Color Strip
  ctx.fillStyle = groupColor;
  ctx.fillRect(16, 16, 480, 58);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.fillRect(16, 16, 480, 7);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 74, 480, 4);

  // High-contrast Owner Ribbon (if owned)
  if (isOwned && propState) {
    drawOwnerRibbon(ctx, propState, isNight, isSunset, isCyber);
  }

  const nameLen = tile.name.length;
  const nameFontSize = nameLen <= 6 ? 84 : (nameLen <= 9 ? 70 : (nameLen <= 11 ? 58 : 48));
  const nameFont = `900 ${nameFontSize}px Rubik, system-ui, sans-serif`;

  let valStr;
  if (isOwned) {
    const rentAmt = calculateTileRent(tile.id);
    valStr = fmtMoney(rentAmt);
  } else {
    valStr = fmtMoney(tile.price);
  }

  const valLen = valStr.length;
  const valFontSize = valLen <= 4 ? 126 : (valLen <= 5 ? 114 : (valLen <= 6 ? 102 : 90));
  const valFont = `900 ${valFontSize}px Rubik, system-ui, sans-serif`;

  const nameY = 270;
  const valY = 415;

  if (isOwned) {
    if (isNight || isSunset) {
      drawWhiteNeonText(ctx, tile.name, 256, nameY, nameFont);
      drawCrispNeonPrice(ctx, valStr, 256, valY, valFont, '#f43f5e');
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 10 : 12;
      ctx.font = nameFont;
      ctx.strokeText(tile.name, 256, nameY);
      ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
      ctx.fillText(tile.name, 256, nameY);

      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 12 : 14;
      ctx.font = valFont;
      ctx.strokeText(valStr, 256, valY);
      ctx.fillStyle = isCyber ? '#f43f5e' : '#b91c1c';
      ctx.fillText(valStr, 256, valY);
    }
  } else {
    if (isNight || isSunset) {
      drawWhiteNeonText(ctx, tile.name, 256, nameY, nameFont);
      drawCrispNeonPrice(ctx, valStr, 256, valY, valFont, isCyber ? '#38bdf8' : '#34d399');
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 10 : 12;
      ctx.font = nameFont;
      ctx.strokeText(tile.name, 256, nameY);
      ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
      ctx.fillText(tile.name, 256, nameY);

      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 12 : 14;
      ctx.font = valFont;
      ctx.strokeText(valStr, 256, valY);
      ctx.fillStyle = isCyber ? '#38bdf8' : '#047857';
      ctx.fillText(valStr, 256, valY);
    }
  }
}

export function drawResortTile(ctx, tile, propState, isOwned, isNight, isSunset, isCyber) {
  const resortColor = '#0ea5e9';

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

  // High-contrast Owner Ribbon (if owned)
  if (isOwned && propState) {
    drawOwnerRibbon(ctx, propState, isNight, isSunset, isCyber);
  }

  const nameLen = tile.name.length;
  const nameFontSize = nameLen <= 6 ? 84 : (nameLen <= 9 ? 70 : (nameLen <= 11 ? 58 : 48));
  const nameFont = `900 ${nameFontSize}px Rubik, system-ui, sans-serif`;

  let valStr;
  if (isOwned) {
    const rentAmt = calculateTileRent(tile.id);
    valStr = fmtMoney(rentAmt);
  } else {
    valStr = fmtMoney(tile.price);
  }

  const valLen = valStr.length;
  const valFontSize = valLen <= 4 ? 126 : (valLen <= 5 ? 114 : (valLen <= 6 ? 102 : 90));
  const valFont = `900 ${valFontSize}px Rubik, system-ui, sans-serif`;

  const nameY = 270;
  const valY = 415;

  if (isOwned) {
    if (isNight || isSunset) {
      drawWhiteNeonText(ctx, tile.name, 256, nameY, nameFont);
      drawCrispNeonPrice(ctx, valStr, 256, valY, valFont, '#f43f5e');
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 10 : 12;
      ctx.font = nameFont;
      ctx.strokeText(tile.name, 256, nameY);
      ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
      ctx.fillText(tile.name, 256, nameY);

      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 12 : 14;
      ctx.font = valFont;
      ctx.strokeText(valStr, 256, valY);
      ctx.fillStyle = isCyber ? '#f43f5e' : '#b91c1c';
      ctx.fillText(valStr, 256, valY);
    }
  } else {
    if (isNight || isSunset) {
      drawWhiteNeonText(ctx, tile.name, 256, nameY, nameFont);
      drawCrispNeonPrice(ctx, valStr, 256, valY, valFont, isCyber ? '#38bdf8' : '#34d399');
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 10 : 12;
      ctx.font = nameFont;
      ctx.strokeText(tile.name, 256, nameY);
      ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
      ctx.fillText(tile.name, 256, nameY);

      ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
      ctx.lineWidth = isCyber ? 12 : 14;
      ctx.font = valFont;
      ctx.strokeText(valStr, 256, valY);
      ctx.fillStyle = isCyber ? '#38bdf8' : '#047857';
      ctx.fillText(valStr, 256, valY);
    }
  }
}
