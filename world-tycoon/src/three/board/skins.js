/**
 * three/board/skins.js
 * Board Style / Skin System:
 * - Wood: Authentic mahogany wood diorama, brass brackets, classic asphalt road & green park.
 * - Cyberpunk: Dark obsidian carbon base, glowing neon cyan/magenta circuits, neon cyber-grid park & synthwave highway.
 * - Elegant: Italian Carrara white marble with gold veining, 24K gold leaf brackets, royal pearl promenade & emerald parterre garden.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { matchSettings } from '../../game/state.js';
import { dioramaMeshes, createProceduralWoodTexture } from './diorama.js';
import { refreshAllTileTexturesAndMaterials } from './tiles.js';

export const BOARD_STYLES = ['wood', 'cyberpunk', 'elegant'];

// ──────────────────────────────────────────────────────────────────────────────
// 1. Procedural Base Texture Generators
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Procedural Cyberpunk Obsidian / Carbon & Laser Circuits Base Texture
 */
export function createProceduralCyberpunkBaseTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');

  // 1. Dark obsidian / carbon background
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0.0, '#060a12');
  grad.addColorStop(0.25, '#0b1324');
  grad.addColorStop(0.50, '#0f172a');
  grad.addColorStop(0.75, '#0a1020');
  grad.addColorStop(1.0, '#060a12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // 2. High-tech carbon micro-weave
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let x = 0; x < 1024; x += 12) {
    for (let y = 0; y < 512; y += 12) {
      if ((x + y) % 24 === 0) {
        ctx.fillRect(x, y, 6, 6);
      }
    }
  }

  // 3. Laser circuit conduits (Neon Cyan & Magenta)
  const circuits = [
    { y: 70, col: '#00f5ff', glow: 'rgba(0, 245, 255, 0.45)', w: 3 },
    { y: 150, col: '#d946ef', glow: 'rgba(217, 70, 239, 0.45)', w: 2.5 },
    { y: 260, col: '#00f5ff', glow: 'rgba(0, 245, 255, 0.45)', w: 3.5 },
    { y: 370, col: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', w: 2.5 },
    { y: 440, col: '#ec4899', glow: 'rgba(236, 72, 153, 0.45)', w: 3 }
  ];

  circuits.forEach(cDef => {
    ctx.shadowColor = cDef.col;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = cDef.col;
    ctx.lineWidth = cDef.w;

    ctx.beginPath();
    ctx.moveTo(0, cDef.y);
    for (let x = 60; x < 1024; x += 160) {
      ctx.lineTo(x, cDef.y);
      const angleY = cDef.y + ((x % 320 === 0) ? 35 : -35);
      ctx.lineTo(x + 35, angleY);
      ctx.lineTo(x + 110, angleY);
      ctx.lineTo(x + 145, cDef.y);
    }
    ctx.lineTo(1024, cDef.y);
    ctx.stroke();

    // Circuit node pads
    for (let nx = 120; nx < 1024; nx += 160) {
      ctx.fillStyle = cDef.col;
      ctx.beginPath();
      ctx.arc(nx, cDef.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.shadowBlur = 0;

  // 4. Subtle digital scanlines & edge illumination
  const edgeGlow = ctx.createLinearGradient(0, 0, 0, 512);
  edgeGlow.addColorStop(0, 'rgba(0, 245, 255, 0.35)');
  edgeGlow.addColorStop(0.08, 'rgba(0, 245, 255, 0.08)');
  edgeGlow.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  edgeGlow.addColorStop(0.92, 'rgba(217, 70, 239, 0.08)');
  edgeGlow.addColorStop(1, 'rgba(217, 70, 239, 0.45)');
  ctx.fillStyle = edgeGlow;
  ctx.fillRect(0, 0, 1024, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = context.maxAnisotropy || 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural Carrara Marble & 24K Gold Veins Base Texture
 */
export function createProceduralMarbleBaseTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');

  // 1. Pristine Italian Carrara White Marble background
  const grad = ctx.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0.0, '#ffffff');
  grad.addColorStop(0.30, '#f8fafc');
  grad.addColorStop(0.65, '#f1f5f9');
  grad.addColorStop(1.0, '#fafaf9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // 2. Soft atmospheric stone clouding
  for (let i = 0; i < 30; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 512;
    const rad = 60 + Math.random() * 120;
    const cloudGrad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rad);
    cloudGrad.addColorStop(0, 'rgba(226, 232, 240, 0.30)');
    cloudGrad.addColorStop(0.6, 'rgba(241, 245, 249, 0.15)');
    cloudGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Delicate branching veins in champagne gold & platinum
  const veinDefs = [
    { x: 80, y: 0, dx: 450, dy: 512, col: 'rgba(212, 175, 55, 0.42)', w: 2.4 },
    { x: 380, y: 0, dx: 300, dy: 512, col: 'rgba(148, 163, 184, 0.30)', w: 1.8 },
    { x: 680, y: 0, dx: 320, dy: 512, col: 'rgba(212, 175, 55, 0.38)', w: 2.2 },
    { x: 920, y: 0, dx: 240, dy: 512, col: 'rgba(180, 140, 45, 0.35)', w: 1.6 }
  ];

  veinDefs.forEach(vd => {
    ctx.beginPath();
    ctx.moveTo(vd.x, vd.y);
    let curX = vd.x;
    for (let stepY = 20; stepY <= 512; stepY += 25) {
      curX += (vd.dx / 20) + (Math.sin(stepY * 0.04) * 16) + (Math.cos(stepY * 0.08) * 8);
      ctx.lineTo(curX, stepY);
      // Small branching offshoot
      if (stepY % 100 === 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(curX, stepY);
        ctx.lineTo(curX + 35, stepY + 30);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
        ctx.lineWidth = vd.w * 0.55;
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.strokeStyle = vd.col;
    ctx.lineWidth = vd.w;
    ctx.stroke();
  });

  // 4. Polished marble lacquer sheen
  const sheen = ctx.createLinearGradient(0, 0, 0, 512);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  sheen.addColorStop(0.15, 'rgba(255, 255, 255, 0.15)');
  sheen.addColorStop(0.5, 'rgba(240, 235, 220, 0.05)');
  sheen.addColorStop(0.9, 'rgba(212, 175, 55, 0.08)');
  sheen.addColorStop(1, 'rgba(180, 140, 40, 0.18)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 1024, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = context.maxAnisotropy || 4;
  tex.needsUpdate = true;
  return tex;
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. Procedural Park & Roadway Texture Generators
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Classic Wood Park & Roadway Texture
 */
export function createWoodParkTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');

  // Roadway: Dark slate-charcoal asphalt
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 1024, 1024);

  // Outer solid road border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 1014, 1014);

  // Dashed lane divider
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 7;
  ctx.setLineDash([28, 22]);
  ctx.strokeRect(52, 52, 920, 920);
  ctx.setLineDash([]);

  // Pedestrian crosswalks at corners
  const crossWalks = [
    { x: 30, y: 30, w: 70, h: 70 },
    { x: 924, y: 30, w: 70, h: 70 },
    { x: 30, y: 924, w: 70, h: 70 },
    { x: 924, y: 924, w: 70, h: 70 }
  ];
  ctx.fillStyle = '#f8fafc';
  crossWalks.forEach(cwk => {
    for (let s = 6; s < cwk.w - 6; s += 14) {
      ctx.fillRect(cwk.x + s, cwk.y + 4, 8, cwk.h - 8);
    }
  });

  // Central lawn curbing
  const pm = 104, ps = 1024 - pm * 2, gc = 6, cw = ps / gc;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(pm - 8, pm - 8, ps + 16, ps + 16);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.strokeRect(pm - 8, pm - 8, ps + 16, ps + 16);

  // Checkered green lawn
  for (let gx = 0; gx < gc; gx++) {
    for (let gz = 0; gz < gc; gz++) {
      ctx.fillStyle = (gx + gz) % 2 === 0 ? '#4ade80' : '#22c55e';
      ctx.fillRect(pm + gx * cw, pm + gz * cw, cw, cw);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 3;
      ctx.strokeRect(pm + gx * cw, pm + gz * cw, cw, cw);
    }
  }

  // Inner lawn perimeter
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 8;
  ctx.strokeRect(pm, pm, ps, ps);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Cyberpunk Synthwave Highway & Neon Grid Matrix Park
 */
export function createCyberpunkParkTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');

  // Roadway: Dark synthwave track
  ctx.fillStyle = '#080d1a';
  ctx.fillRect(0, 0, 1024, 1024);

  // Outer neon cyan road boundary
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#00f5ff';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 1012, 1012);

  // Hot magenta dashed center lane divider
  ctx.shadowColor = '#d946ef';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#ec4899';
  ctx.lineWidth = 6;
  ctx.setLineDash([26, 20]);
  ctx.strokeRect(52, 52, 920, 920);
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // Corner neon digital crosswalks
  const crossWalks = [
    { x: 28, y: 28, w: 74, h: 74 },
    { x: 922, y: 28, w: 74, h: 74 },
    { x: 28, y: 922, w: 74, h: 74 },
    { x: 922, y: 922, w: 74, h: 74 }
  ];
  ctx.fillStyle = '#00f5ff';
  crossWalks.forEach(cwk => {
    for (let s = 6; s < cwk.w - 6; s += 14) {
      ctx.fillRect(cwk.x + s, cwk.y + 4, 7, cwk.h - 8);
    }
  });

  // Central cyber park curb (illuminated dark titanium)
  const pm = 104, ps = 1024 - pm * 2, gc = 6, cw = ps / gc;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(pm - 8, pm - 8, ps + 16, ps + 16);
  ctx.strokeStyle = '#00f5ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(pm - 8, pm - 8, ps + 16, ps + 16);

  // Digital matrix checkered cyber lawn
  for (let gx = 0; gx < gc; gx++) {
    for (let gz = 0; gz < gc; gz++) {
      const isAlt = (gx + gz) % 2 === 0;
      ctx.fillStyle = isAlt ? '#031e1c' : '#0a1628';
      ctx.fillRect(pm + gx * cw, pm + gz * cw, cw, cw);

      // Glowing matrix grid crosshairs
      ctx.strokeStyle = isAlt ? 'rgba(0, 245, 255, 0.40)' : 'rgba(217, 70, 239, 0.35)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(pm + gx * cw, pm + gz * cw, cw, cw);

      // Tech node dot at center of tile
      ctx.fillStyle = isAlt ? '#00f5ff' : '#d946ef';
      ctx.beginPath();
      ctx.arc(pm + gx * cw + cw / 2, pm + gz * cw + cw / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Inner neon boundary frame
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#00f5ff';
  ctx.lineWidth = 7;
  ctx.strokeRect(pm, pm, ps, ps);
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Elegant French Pearl-Stone Promenade & Versailles Emerald Garden
 */
export function createElegantParkTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');

  // Roadway: Polished French pearl-stone promenade
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 1024, 1024);

  // Outer 24K gold foil inlay border
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 9;
  ctx.strokeRect(6, 6, 1012, 1012);

  // Inner gold filigree dashed trim
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 5;
  ctx.setLineDash([20, 16]);
  ctx.strokeRect(52, 52, 920, 920);
  ctx.setLineDash([]);

  // Corner pearl pavers
  const crossWalks = [
    { x: 28, y: 28, w: 74, h: 74 },
    { x: 922, y: 28, w: 74, h: 74 },
    { x: 28, y: 922, w: 74, h: 74 },
    { x: 922, y: 922, w: 74, h: 74 }
  ];
  ctx.fillStyle = '#d4af37';
  crossWalks.forEach(cwk => {
    for (let s = 6; s < cwk.w - 6; s += 14) {
      ctx.fillRect(cwk.x + s, cwk.y + 4, 7, cwk.h - 8);
    }
  });

  // Central Versailles lawn curb: Carrara marble & gold rim
  const pm = 104, ps = 1024 - pm * 2, gc = 6, cw = ps / gc;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(pm - 8, pm - 8, ps + 16, ps + 16);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 5;
  ctx.strokeRect(pm - 8, pm - 8, ps + 16, ps + 16);

  // Royal emerald parterre lawn
  for (let gx = 0; gx < gc; gx++) {
    for (let gz = 0; gz < gc; gz++) {
      ctx.fillStyle = (gx + gz) % 2 === 0 ? '#047857' : '#065f46';
      ctx.fillRect(pm + gx * cw, pm + gz * cw, cw, cw);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(pm + gx * cw, pm + gz * cw, cw, cw);
    }
  }

  // Golden rosette center compass star
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  const midX = pm + ps / 2, midY = pm + ps / 2;
  ctx.arc(midX, midY, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(midX, midY, 32, 0, Math.PI * 2);
  ctx.fill();

  // Perimeter gold frame
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 8;
  ctx.strokeRect(pm, pm, ps, ps);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. Board Style Switcher Implementation
// ──────────────────────────────────────────────────────────────────────────────

let cachedTextures = {
  woodBase: null,
  woodPark: null,
  cyberBase: null,
  cyberPark: null,
  marbleBase: null,
  marblePark: null
};

/**
 * Applies the selected board skin (wood, cyberpunk, elegant) to all 3D meshes.
 * @param {'wood'|'cyberpunk'|'elegant'} styleName
 */
export function applyBoardStyle(styleName = 'wood') {
  const style = BOARD_STYLES.includes(styleName) ? styleName : 'wood';
  matchSettings.boardStyle = style;

  // 1. Base plinth & body materials
  if (style === 'cyberpunk') {
    if (!cachedTextures.cyberBase) cachedTextures.cyberBase = createProceduralCyberpunkBaseTexture();
    if (!cachedTextures.cyberPark) cachedTextures.cyberPark = createCyberpunkParkTexture();

    const cyberMat = new THREE.MeshStandardMaterial({
      map: cachedTextures.cyberBase,
      roughness: 0.22,
      metalness: 0.65
    });

    if (dioramaMeshes.plinthMesh) dioramaMeshes.plinthMesh.material = cyberMat;
    if (dioramaMeshes.earthMesh) dioramaMeshes.earthMesh.material = cyberMat;
    if (dioramaMeshes.lipMesh) dioramaMeshes.lipMesh.material = cyberMat;

    // Corner brackets: Dark titanium with glowing cyan nodes
    const cyberCornerMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.18,
      metalness: 0.90
    });
    const cyberNodeMat = new THREE.MeshStandardMaterial({
      color: 0x00f5ff,
      emissive: 0x00f5ff,
      emissiveIntensity: 1.4,
      roughness: 0.1
    });

    dioramaMeshes.cornerGroups.forEach(cg => {
      if (cg.children[0]) cg.children[0].material = cyberCornerMat;
      if (cg.children[1]) cg.children[1].material = cyberCornerMat;
      if (cg.children[2]) cg.children[2].material = cyberNodeMat;
    });

    // Rim: Gunmetal titanium with cyan accent
    if (dioramaMeshes.rimMesh) {
      dioramaMeshes.rimMesh.material = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.28,
        metalness: 0.85
      });
    }

    // Inner park roadway & digital lawn
    if (dioramaMeshes.innerMesh) {
      dioramaMeshes.innerMesh.material = new THREE.MeshStandardMaterial({
        map: cachedTextures.cyberPark,
        roughness: 0.35,
        metalness: 0.30
      });
    }

    // Update trees to cyber neon foliage
    dioramaMeshes.treeClusters.forEach(cluster => {
      cluster.traverse(child => {
        if (child.isMesh && child.geometry?.type === 'ConeGeometry') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            emissive: 0x06b6d4,
            emissiveIntensity: 0.35,
            roughness: 0.25,
            metalness: 0.5
          });
        } else if (child.isMesh && child.geometry?.type === 'CylinderGeometry') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.3,
            metalness: 0.8
          });
        }
      });
    });

    // Update fountain to cyber hologram water
    if (dioramaMeshes.fountain) {
      dioramaMeshes.fountain.traverse(child => {
        if (child.isMesh && child.material?.transparent) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x00f5ff,
            emissive: 0x00f5ff,
            emissiveIntensity: 0.95,
            transparent: true,
            opacity: 0.90,
            roughness: 0.08
          });
        }
      });
    }

  } else if (style === 'elegant') {
    if (!cachedTextures.marbleBase) cachedTextures.marbleBase = createProceduralMarbleBaseTexture();
    if (!cachedTextures.marblePark) cachedTextures.marblePark = createElegantParkTexture();

    const marbleMat = new THREE.MeshStandardMaterial({
      map: cachedTextures.marbleBase,
      roughness: 0.15,
      metalness: 0.15
    });

    if (dioramaMeshes.plinthMesh) dioramaMeshes.plinthMesh.material = marbleMat;
    if (dioramaMeshes.earthMesh) dioramaMeshes.earthMesh.material = marbleMat;
    if (dioramaMeshes.lipMesh) dioramaMeshes.lipMesh.material = marbleMat;

    // Corner brackets: Mirror-polished 24K Gold
    const goldCornerMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.12,
      metalness: 0.95
    });

    dioramaMeshes.cornerGroups.forEach(cg => {
      if (cg.children[0]) cg.children[0].material = goldCornerMat;
      if (cg.children[1]) cg.children[1].material = goldCornerMat;
      if (cg.children[2]) cg.children[2].material = goldCornerMat;
    });

    // Rim: Champagne Gold
    if (dioramaMeshes.rimMesh) {
      dioramaMeshes.rimMesh.material = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.18,
        metalness: 0.85
      });
    }

    // Inner park: Pearl Promenade & Versailles garden
    if (dioramaMeshes.innerMesh) {
      dioramaMeshes.innerMesh.material = new THREE.MeshStandardMaterial({
        map: cachedTextures.marblePark,
        roughness: 0.28,
        metalness: 0.15
      });
    }

    // Royal topiary trees
    dioramaMeshes.treeClusters.forEach(cluster => {
      cluster.traverse(child => {
        if (child.isMesh && child.geometry?.type === 'ConeGeometry') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x047857,
            roughness: 0.35,
            metalness: 0.15
          });
        } else if (child.isMesh && child.geometry?.type === 'CylinderGeometry') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0.1
          });
        }
      });
    });

    // Pristine marble fountain with azure crystal water
    if (dioramaMeshes.fountain) {
      dioramaMeshes.fountain.traverse(child => {
        if (child.isMesh && child.material?.transparent) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.05,
            metalness: 0.55,
            transparent: true,
            opacity: 0.90
          });
        }
      });
    }

  } else {
    // Default: 'wood' (Mahogany & Brass)
    if (!cachedTextures.woodBase) cachedTextures.woodBase = createProceduralWoodTexture();
    if (!cachedTextures.woodPark) cachedTextures.woodPark = createWoodParkTexture();

    const woodMat = new THREE.MeshStandardMaterial({
      map: cachedTextures.woodBase,
      roughness: 0.24,
      metalness: 0.06
    });

    if (dioramaMeshes.plinthMesh) dioramaMeshes.plinthMesh.material = woodMat;
    if (dioramaMeshes.earthMesh) dioramaMeshes.earthMesh.material = woodMat;
    if (dioramaMeshes.lipMesh) dioramaMeshes.lipMesh.material = woodMat;

    const brassCornerMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.22,
      metalness: 0.85
    });

    dioramaMeshes.cornerGroups.forEach(cg => {
      if (cg.children[0]) cg.children[0].material = brassCornerMat;
      if (cg.children[1]) cg.children[1].material = brassCornerMat;
      if (cg.children[2]) cg.children[2].material = brassCornerMat;
    });

    if (dioramaMeshes.rimMesh) {
      dioramaMeshes.rimMesh.material = new THREE.MeshStandardMaterial({
        color: 0xdde3ea,
        roughness: 0.55,
        metalness: 0.05
      });
    }

    if (dioramaMeshes.innerMesh) {
      dioramaMeshes.innerMesh.material = new THREE.MeshStandardMaterial({
        map: cachedTextures.woodPark,
        roughness: 0.65,
        metalness: 0.05
      });
    }

    dioramaMeshes.treeClusters.forEach(cluster => {
      cluster.traverse(child => {
        if (child.isMesh && child.geometry?.type === 'ConeGeometry') {
          child.material = new THREE.MeshLambertMaterial({
            color: 0x16a34a,
            flatShading: true
          });
        } else if (child.isMesh && child.geometry?.type === 'CylinderGeometry') {
          child.material = new THREE.MeshLambertMaterial({
            color: 0x78350f,
            flatShading: true
          });
        }
      });
    });

    if (dioramaMeshes.fountain) {
      dioramaMeshes.fountain.traverse(child => {
        if (child.isMesh && child.material?.transparent) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            roughness: 0.08,
            metalness: 0.45,
            transparent: true,
            opacity: 0.88
          });
        }
      });
    }
  }

  // 2. Refresh all 32 tiles with new textures and block side styling
  refreshAllTileTexturesAndMaterials();

  // 3. Update scene background gradient to complement theme
  if (typeof document !== 'undefined' && document.body) {
    if (style === 'cyberpunk') {
      document.body.style.background = 'radial-gradient(circle at 50% 40%, #1e1b4b 0%, #0f172a 50%, #020617 100%)';
    } else if (style === 'elegant') {
      document.body.style.background = 'radial-gradient(circle at 50% 40%, #fdfbf7 0%, #f3eee6 50%, #e2d9cc 100%)';
    } else {
      document.body.style.background = 'radial-gradient(circle at 50% 40%, #cce0ff 0%, #a8c8f8 50%, #82aef2 100%)';
    }
  }
}
