/**
 * three/board/tileCanvas.js
 * High-performance, synchronous Canvas 2D texture generator for World Tycoon board tiles.
 * 
 * Clean Code Architecture:
 * - Low-level vector icons & neon typography: ./tiles/canvasUtils.js
 * - Real-estate city & resort rendering: ./tiles/cityTileRenderer.js
 * - Special, tax, chance & corner rendering: ./tiles/specialTileRenderer.js
 * - High-level texture & emissive map composition: tileCanvas.js (facade)
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { PLAYER_THEMES } from '../../game/data.js';
import { gameState, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { calculateTileRent } from '../../game/rules.js';
import { getTileWorldPosition } from './coords.js';
import { currentBulbMode } from '../core/lighting.js';

import { drawCityTile, drawResortTile } from './tiles/cityTileRenderer.js';
import { drawChanceTile, drawTaxTile, drawCornerTile } from './tiles/specialTileRenderer.js';

export * from './tiles/canvasUtils.js';
export * from './tiles/cityTileRenderer.js';
export * from './tiles/specialTileRenderer.js';

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

  ctx.restore();
}

/**
 * Generates a high-intensity emissive map texture for owned city/resort tiles in night/sunset modes.
 * In Three.js MeshStandardMaterial, this texture physically emits light in the 3D scene:
 * - Pure black (#000000) for the card background (zero light emission).
 * - Glowing pure white (#ffffff) with soft bloom for City Name and Rent.
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

  // 1. Soft Proximity Light Wash (delicate ambient spill, strictly non-blinding)
  ctx.save();
  const g1 = ctx.createRadialGradient(256, nameY, 15, 256, nameY, 190);
  g1.addColorStop(0, `rgba(${cRGB}, 0.14)`);
  g1.addColorStop(0.40, `rgba(${cRGB}, 0.07)`);
  g1.addColorStop(0.75, `rgba(${cRGB}, 0.02)`);
  g1.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g1;
  ctx.beginPath();
  ctx.arc(256, nameY, 190, 0, Math.PI * 2);
  ctx.fill();

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

  // 2. Resort Header Subtle Emissive Glow (prevents dark navy washout on resort tiles)
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

  // 3. Neon Tube Incandescent Lighting with Contrast Protection Moat
  function drawEmissiveLight(text, x, y, font) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeText(text, x, y);

    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  drawEmissiveLight(tile.name, 256, nameY, nameFont);
  drawEmissiveLight(valStr, 256, valY, valFont);

  // 4. Owner Ribbon Emissive Contour & Name Glow
  const ownerIdx = propState?.owner;
  if (ownerIdx !== null && ownerIdx !== undefined) {
    const theme = PLAYER_THEMES[ownerIdx];
    const player = gameState.players[ownerIdx];
    const colorHex = player?.colorHex || theme?.colorHex || '#ffffff';
    const ownerName = (player?.name || theme?.name || 'OWNER').toUpperCase();

    ctx.save();
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 4;
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 8;
    if (ctx.roundRect) {
      ctx.roundRect(24, 148, 464, 56, 14);
    } else {
      ctx.rect(24, 148, 464, 56);
    }
    ctx.stroke();

    ctx.font = '900 24px Rubik, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.fillText(ownerName, 256, 176);
    ctx.restore();
  }

  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = context?.maxAnisotropy || 1;
  tex.needsUpdate = true;
  return tex;
}
