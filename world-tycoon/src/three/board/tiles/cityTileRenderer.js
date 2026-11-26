/**
 * three/board/tiles/cityTileRenderer.js
 * 2D Canvas rendering for City and Resort real-estate tiles.
 */

import { GROUP_META, PLAYER_THEMES } from '../../../game/data.js';
import { gameState, matchSettings } from '../../../game/state.js';
import { fmtMoney } from '../../../game/utils.js';
import { calculateTileRent } from '../../../game/rules.js';
import { BOARD_FONT_FAMILY, drawCadastralGrid, drawWhiteNeonText, drawCrispNeonPrice } from './canvasUtils.js';

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
 * Resolves full owner theme metadata (colorHex, charColor, ownerPlayer) for a tile,
 * respecting Team Mode (Red #ef4444 / Blue #3b82f6) and Solo custom colors.
 * @param {object|null} propState
 * @returns {{ isOwned: boolean, ownerPlayer: object|null, colorHex: string, charColor: number }}
 */
export function resolveOwnerTheme(propState) {
  const ownerIdx = propState?.owner;
  const isOwned = Boolean(ownerIdx !== null && ownerIdx !== undefined && gameState?.players?.[ownerIdx]);
  if (!isOwned) {
    return { isOwned: false, ownerPlayer: null, colorHex: '#b91c1c', charColor: 0x6366f1 };
  }
  const ownerPlayer = gameState.players[ownerIdx];
  const theme = PLAYER_THEMES[ownerIdx] || null;
  const isTeam = Boolean(matchSettings?.teamMode);
  const teamId = ownerPlayer.teamId !== undefined ? ownerPlayer.teamId : (ownerIdx % 2);
  const colorHex = isTeam ? (teamId === 0 ? '#ef4444' : '#3b82f6') : (ownerPlayer.colorHex || theme?.colorHex || '#3b82f6');
  const charColor = isTeam ? (teamId === 0 ? 0xef4444 : 0x3b82f6) : (ownerPlayer.charColor ?? theme?.charColor ?? 0x6366f1);
  return { isOwned: true, ownerPlayer, colorHex, charColor };
}

/**
 * Resolves the owner theme color for ribbons and on-tile rent price text.
 * @param {object|null} propState
 * @returns {string}
 */
export function getOwnerThemeColor(propState) {
  return resolveOwnerTheme(propState).colorHex;
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
  const isTeam = Boolean(matchSettings?.teamMode);
  const teamId = player ? (player.teamId !== undefined ? player.teamId : (ownerIdx % 2)) : (ownerIdx % 2);
  const colorHex = getOwnerThemeColor(propState);
  const rawName = player?.name || theme?.name || `PLAYER ${ownerIdx + 1}`;
  const ownerName = rawName.toUpperCase();
  const icon = player?.icon || theme?.icon || THEME_ICONS[ownerIdx % THEME_ICONS.length] || '👑';
  const slotBadge = isTeam ? (teamId === 0 ? 'RED' : 'BLUE') : `P${ownerIdx + 1}`;

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
  ctx.font = `900 18px ${BOARD_FONT_FAMILY}`;
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

  ctx.font = `900 24px ${BOARD_FONT_FAMILY}`;
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
 * Draws the persistent '🎪 2× FESTIVAL' capsule badge on boosted city/resort tiles.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} [badgeY=320]
 */
export function drawFestivalBadge(ctx, badgeY = 320) {
  const badgeW = 220;
  const badgeH = 38;
  const badgeX = 256 - badgeW / 2;

  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 19);
  else ctx.rect(badgeX, badgeY, badgeW, badgeH);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#0b1120';
  ctx.font = `900 18px ${BOARD_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎪 2× FESTIVAL', 256, badgeY + badgeH / 2 + 1);
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

function drawPropertyTitleAndPrice(ctx, { tile, propState, isOwned, isNight, isSunset, isCyber }) {
  const nameLen = tile.name.length;
  const nameFontSize = nameLen <= 6 ? 84 : (nameLen <= 9 ? 70 : (nameLen <= 11 ? 58 : 48));
  const nameFont = `900 ${nameFontSize}px ${BOARD_FONT_FAMILY}`;
  const maxTextW = isOwned ? 424 : 452;

  const valStr = isOwned ? fmtMoney(calculateTileRent(tile.id)) : fmtMoney(tile.price);
  const valLen = valStr.length;
  const valFontSize = valLen <= 4 ? 148 : (valLen <= 5 ? 134 : (valLen <= 6 ? 120 : 106));
  const valFont = `900 ${valFontSize}px ${BOARD_FONT_FAMILY}`;

  const isFestivalBoost = Boolean(isOwned && propState?.festivalBoost);
  const nameY = isOwned ? 245 : 220;
  const valY = isFestivalBoost ? 395 : 365;
  const rentColor = isFestivalBoost ? '#f59e0b' : (isOwned ? getOwnerThemeColor(propState) : '#b91c1c');

  if (isFestivalBoost) {
    drawFestivalBadge(ctx, 305);
  }

  if (isNight || isSunset) {
    drawWhiteNeonText(ctx, tile.name, 256, nameY, nameFont, maxTextW);
    const neonPriceColor = isOwned ? rentColor : (isCyber ? '#38bdf8' : '#34d399');
    drawCrispNeonPrice(ctx, valStr, 256, valY, valFont, neonPriceColor);
    return;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
  ctx.lineWidth = isCyber ? 10 : 12;
  ctx.font = nameFont;
  ctx.strokeText(tile.name, 256, nameY, maxTextW);
  ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
  ctx.fillText(tile.name, 256, nameY, maxTextW);

  ctx.strokeStyle = isCyber ? '#020617' : '#ffffff';
  ctx.lineWidth = isCyber ? 12 : 14;
  ctx.font = valFont;
  ctx.strokeText(valStr, 256, valY, maxTextW);
  ctx.fillStyle = isOwned ? rentColor : (isCyber ? '#38bdf8' : '#047857');
  ctx.fillText(valStr, 256, valY, maxTextW);
}

export function drawCityTile(ctx, tile, propState, isOwned, isNight, isSunset, isCyber) {
  const groupColor = (tile.group && GROUP_META[tile.group]) ? GROUP_META[tile.group].hex : '#38bdf8';

  drawCadastralGrid(ctx, isCyber);

  // Top Group Color Strip (clear of 26px owner border & 3D buildings when owned)
  const stripX = isOwned ? 28 : 16;
  const stripY = isOwned ? 28 : 16;
  const stripW = isOwned ? 456 : 480;
  const stripH = isOwned ? 80 : 70;
  const dividerColor = (isCyber || isNight) ? '#ffffff' : '#0f172a';

  ctx.fillStyle = groupColor;
  ctx.fillRect(stripX, stripY, stripW, stripH);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.fillRect(stripX, stripY, stripW, 7);
  ctx.fillStyle = dividerColor;
  ctx.fillRect(stripX, stripY + stripH, stripW, 4);

  // Bottom District Color Footer Bar (360° visibility when camera rotates behind skyscrapers)
  const footerY = isOwned ? 464 : 478;
  const footerH = isOwned ? 18 : 16;
  ctx.fillStyle = groupColor;
  ctx.fillRect(stripX, footerY, stripW, footerH);
  ctx.fillStyle = dividerColor;
  ctx.fillRect(stripX, footerY - 3, stripW, 3);

  // High-contrast Owner Ribbon (if owned)
  if (isOwned && propState) {
    drawOwnerRibbon(ctx, propState, isNight, isSunset, isCyber);
  }

  drawPropertyTitleAndPrice(ctx, { tile, propState, isOwned, isNight, isSunset, isCyber });
}

export function drawResortTile(ctx, tile, propState, isOwned, isNight, isSunset, isCyber) {
  const resortColor = '#0ea5e9';
  const bgInset = isOwned ? 29 : 22;

  if (!isCyber) {
    if (!isOwned) {
      const bgGrad = ctx.createLinearGradient(0, bgInset, 0, 512 - bgInset);
      bgGrad.addColorStop(0, '#f0fdfa');
      bgGrad.addColorStop(0.35, '#f8fafc');
      bgGrad.addColorStop(1, '#fefce8');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(bgInset, bgInset, 512 - bgInset * 2, 512 - bgInset * 2);
    }

    // Subtle tropical wave contours along upper margin
    ctx.strokeStyle = isOwned ? 'rgba(255, 255, 255, 0.45)' : 'rgba(14, 165, 233, 0.22)';
    ctx.lineWidth = 3;
    for (let w = 0; w < 3; w++) {
      ctx.beginPath();
      ctx.arc(100 + w * 156, 120, 56, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  } else {
    drawCadastralGrid(ctx, isCyber);
  }

  // Top Resort Header Strip (clear of 26px owner border when owned)
  const stripX = isOwned ? 28 : 16;
  const stripY = isOwned ? 28 : 16;
  const stripW = isOwned ? 456 : 480;
  ctx.fillStyle = resortColor;
  ctx.fillRect(stripX, stripY, stripW, 58);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.fillRect(stripX, stripY, stripW, 7);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(stripX, stripY + 58, stripW, 4);

  // Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 30px ${BOARD_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RESORT', 256, stripY + 29);

  // High-contrast Owner Ribbon (if owned)
  if (isOwned && propState) {
    drawOwnerRibbon(ctx, propState, isNight, isSunset, isCyber);
  }

  drawPropertyTitleAndPrice(ctx, { tile, propState, isOwned, isNight, isSunset, isCyber });
}
