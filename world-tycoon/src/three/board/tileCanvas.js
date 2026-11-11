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
export function createTileEmissiveTexture(_tile, _propState) {
  // Diffuse canvas texture (drawTileToCanvas) provides 100% crisp, self-contained typography
  // and multi-layered neon glow shadows without dual-map kerning offsets or text doubling glitches.
  return null;
}
