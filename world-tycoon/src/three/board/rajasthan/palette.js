/**
 * three/board/rajasthan/palette.js
 * Authentic Rajasthan Color Palette and Procedural Desert Ground / Royal Chowk Texture.
 */

import * as THREE from 'three';
import { context } from '../../core/context.js';

export const RAJASTHAN_PALETTE = {
  sandLight: 0xf3e5cf,      // Sunlit desert sand
  sandMid: 0xe6ceab,        // Natural golden Thar sand
  sandDune: 0xd9b88c,       // Shaded dune slope
  stoneLight: 0xedd5b3,     // Jodhpur cream sandstone
  stoneGold: 0xdfb17e,      // Jaisalmer yellow sandstone
  stoneWarm: 0xc8945a,      // Warm ochre sandstone
  stoneDeep: 0xa46c3b,      // Shaded terracotta sandstone
  marbleWhite: 0xfbf8f1,    // Makrana polished marble
  teakWood: 0x451a03,       // Fort gate teakwood
  royalSaffron: 0xea580c,   // Sacred royal saffron (Bhagwa Dhwaj)
  royalCrimson: 0x9f1239,   // Mewar royal crimson velvet
  royalGold: 0xf59e0b,      // 24K polished brass/gold finials
  waterEmerald: 0x0f766e,   // Sacred Kund water depth
  waterShallow: 0x14b8a6,   // Sacred Kund water surface
  palmTrunk: 0x6b4423,      // Weathered date palm bark
  palmFrond: 0x2d6a4f,      // Deep oasis palm frond green
  camelFur: 0xc9945e,       // Soft desert camel coat
  bougainvillea: 0xdb2777   // Desert flowering bougainvillea
};

/**
 * Creates the authentic Thar desert & Royal Sandstone Chowk courtyard texture.
 * Replaces crude scanlines and oversaturated neon gradients with a sophisticated,
 * elegant royal palace diorama ground plane.
 * @returns {THREE.CanvasTexture}
 */
export function createRajasthanDesertTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 1. Outer diorama racetrack asphalt: refined warm charcoal
  ctx.fillStyle = '#27272a';
  ctx.fillRect(0, 0, 1024, 1024);

  // Sandstone outer road curb
  ctx.strokeStyle = '#c8945a';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 1012, 1012);

  // Dashed lane divider in warm sandstone white
  ctx.strokeStyle = '#fef9c3';
  ctx.lineWidth = 6;
  ctx.setLineDash([26, 22]);
  ctx.strokeRect(52, 52, 920, 920);
  ctx.setLineDash([]);

  // Pedestrian crosswalks at 4 road corners
  const crossWalks = [
    { x: 30, y: 30, w: 70, h: 70 },
    { x: 924, y: 30, w: 70, h: 70 },
    { x: 30, y: 924, w: 70, h: 70 },
    { x: 924, y: 924, w: 70, h: 70 }
  ];
  ctx.fillStyle = '#fef9c3';
  crossWalks.forEach(cwk => {
    for (let s = 6; s < cwk.w - 6; s += 14) {
      ctx.fillRect(cwk.x + s, cwk.y + 4, 8, cwk.h - 8);
    }
  });

  // Inner terrain boundaries
  const pm = 104;
  const ps = 1024 - pm * 2; // 816px

  // 2. Sandstone plinth coping rim
  ctx.fillStyle = '#b37e4c';
  ctx.fillRect(pm - 8, pm - 8, ps + 16, ps + 16);
  ctx.strokeStyle = '#8a582d';
  ctx.lineWidth = 3;
  ctx.strokeRect(pm - 8, pm - 8, ps + 16, ps + 16);

  // 3. Desert Sand Ground: Muted, natural golden sand gradient
  const sandGrad = ctx.createLinearGradient(pm, pm, pm + ps, pm + ps);
  sandGrad.addColorStop(0.0, '#f0e2cc'); // Soft sunlit sand
  sandGrad.addColorStop(0.35, '#e6ceab'); // Natural golden Thar sand
  sandGrad.addColorStop(0.70, '#dcbe93'); // Warm desert slope
  sandGrad.addColorStop(1.0, '#cca97c'); // Soft shaded sand
  ctx.fillStyle = sandGrad;
  ctx.fillRect(pm, pm, ps, ps);

  // 4. Subtle organic wind dune ripples (gentle, atmospheric waves)
  ctx.save();
  for (let r = 0; r < 48; r++) {
    const yBase = pm + (r / 48) * ps;
    const waveAmp = 3.0 + (r % 5) * 1.5;
    const waveFreq = 0.012 + (r % 4) * 0.003;

    ctx.beginPath();
    ctx.moveTo(pm, yBase);
    for (let x = pm; x <= pm + ps; x += 16) {
      const yOffset = Math.sin(x * waveFreq + r * 0.35) * waveAmp;
      ctx.lineTo(x, yBase + yOffset);
    }
    ctx.strokeStyle = r % 2 === 0 ? 'rgba(180, 130, 80, 0.12)' : 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 2.0;
    ctx.stroke();
  }
  ctx.restore();

  // 5. Fine natural sand grain stippling
  for (let n = 0; n < 3000; n++) {
    const px = pm + Math.random() * ps;
    const py = pm + Math.random() * ps;
    const isLight = Math.random() > 0.5;
    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.22)' : 'rgba(140, 92, 54, 0.12)';
    ctx.fillRect(px, py, 1.5, 1.5);
  }

  // 6. Central Royal Chowk Courtyard (Paved Sandstone & Marble Mosaic)
  // Kept perfectly centered and flat so rolling 3D dice have pristine readability
  const chowkSize = 340;
  const chowkX = pm + (ps - chowkSize) / 2;
  const chowkY = pm + (ps - chowkSize) / 2;

  // Outer sandstone courtyard terrace border
  ctx.fillStyle = '#dfb17e';
  ctx.fillRect(chowkX - 10, chowkY - 10, chowkSize + 20, chowkSize + 20);
  ctx.strokeStyle = '#a46c3b';
  ctx.lineWidth = 3;
  ctx.strokeRect(chowkX - 10, chowkY - 10, chowkSize + 20, chowkSize + 20);

  // Marble & Sandstone checkerboard paving
  const gridSize = 10;
  const tileSize = chowkSize / gridSize;
  for (let gx = 0; gx < gridSize; gx++) {
    for (let gy = 0; gy < gridSize; gy++) {
      ctx.fillStyle = (gx + gy) % 2 === 0 ? '#fbf8f1' : '#ecd8c0';
      ctx.fillRect(chowkX + gx * tileSize, chowkY + gy * tileSize, tileSize, tileSize);
      ctx.strokeStyle = 'rgba(164, 108, 59, 0.20)';
      ctx.lineWidth = 1;
      ctx.strokeRect(chowkX + gx * tileSize, chowkY + gy * tileSize, tileSize, tileSize);
    }
  }

  // Central Royal Rajasthani Sun Mandala Medallion (Centerpoint of the board)
  const cx = 512;
  const cy = 512;

  // Outer decorative circle
  ctx.beginPath();
  ctx.arc(cx, cy, 96, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(223, 177, 126, 0.45)';
  ctx.fill();
  ctx.strokeStyle = '#c8945a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 8-Pointed Royal Star
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#dfb17e';
  ctx.strokeStyle = '#a46c3b';
  ctx.lineWidth = 2;
  for (let s = 0; s < 2; s++) {
    ctx.rotate((Math.PI / 4) * s);
    ctx.fillRect(-45, -45, 90, 90);
    ctx.strokeRect(-45, -45, 90, 90);
  }

  // Inner lotus rosette
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.fillStyle = '#fbf8f1';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Golden sun core
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
  ctx.restore();

  // Courtyard corner ornamental brackets
  ctx.strokeStyle = '#c8945a';
  ctx.lineWidth = 4;
  ctx.strokeRect(chowkX, chowkY, chowkSize, chowkSize);

  // Inner diorama coping edge
  ctx.strokeStyle = '#c8945a';
  ctx.lineWidth = 4;
  ctx.strokeRect(pm, pm, ps, ps);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = context.maxAnisotropy || 4;
  tex.needsUpdate = true;
  return tex;
}
