/**
 * three/board/rajasthanCenter.js
 * Handcrafted Royal Rajasthan Diorama for Rajasthan Edition.
 *
 * Designed with Game Art Principles & Anti-UI-Slop standards:
 * - Visual Hierarchy: Clean central Royal Chowk (sandstone mosaic plaza) kept completely
 *   unobstructed for pristine 3D dice rolls and HUD action button readability.
 * - Color Harmony: Authentic honeyed Jaisalmer & Amber sandstone tones, Makrana marble,
 *   deep royal saffron (Bhagwa), Mewar crimson, and sacred Kund jewel-emerald water.
 * - Staged Architecture:
 *   1. North-West: Multi-tiered Amber Palace Citadel with arched Suraj Pol gate,
 *      carved jharokha balconies, corner watchtower chhatris, and fluttering saffron banner.
 *   2. South-East: Symmetrical Royal Stepwell Kund (Panna Meena style) with geometric
 *      descending stone steps, turquoise pool, water lilies, and lakeside pavilion.
 *   3. North-East: Desert Oasis Grove with gracefully curved date palms, terracotta planters,
 *      and flowering magenta bougainvillea vines.
 *   4. South-West: Royal Caravan Station with ceremonial crimson shamiana tent, brass urns,
 *      and an elegantly sculpted resting Thar desert camel with embroidered jhool tapestry.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';

// ──────────────────────────────────────────────────────────────────────────────
// Authentic Rajasthan Color Palette
// ──────────────────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────────
// 1. Procedural Desert Ground & Royal Chowk Courtyard Texture
// ──────────────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────────────
// 2. Architectural Rajput Chhatri (Domed Cenotaph Cupola)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Creates an authentic, gracefully proportioned Rajput Chhatri.
 * Features stepped octagonal plinth, 4 slender fluted pillars with bracket capitals,
 * a projecting chhajja stone eave, a fluted onion cupola, and a 24K gold kalash finial.
 *
 * @param {number} scale
 * @param {number} stoneColor - Sandstone tone
 * @param {number} domeColor - Cupola dome tone
 * @returns {THREE.Group}
 */
export function createRajasthanChhatri3D(scale = 1.0, stoneColor = RAJASTHAN_PALETTE.stoneGold, domeColor = RAJASTHAN_PALETTE.stoneGold) {
  const chhatri = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: stoneColor,
    roughness: 0.42,
    metalness: 0.08
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneWarm,
    roughness: 0.50,
    metalness: 0.06
  });
  const domeMat = new THREE.MeshStandardMaterial({
    color: domeColor,
    roughness: 0.38,
    metalness: 0.12
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.royalGold,
    roughness: 0.22,
    metalness: 0.88
  });

  // 1. Stepped Plinth Base (Octagonal / Beveled Platform)
  const base1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.82 * scale, 0.08 * scale, 0.82 * scale),
    darkStoneMat
  );
  base1.position.y = 0.04 * scale;
  base1.castShadow = true;
  base1.receiveShadow = true;

  const base2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.70 * scale, 0.06 * scale, 0.70 * scale),
    stoneMat
  );
  base2.position.y = 0.10 * scale;
  base2.castShadow = true;
  base2.receiveShadow = true;
  chhatri.add(base1, base2);

  // 2. Four Slender Fluted Pillars with Bracket Capitals (Todas)
  const pillarHeight = 0.70 * scale;
  const pillarRadius = 0.038 * scale;
  const pOffset = 0.25 * scale;
  const pillarGeo = new THREE.CylinderGeometry(pillarRadius, pillarRadius * 1.15, pillarHeight, 8);

  const pillarCoords = [
    { x: -pOffset, z: -pOffset },
    { x: pOffset, z: -pOffset },
    { x: pOffset, z: pOffset },
    { x: -pOffset, z: pOffset }
  ];

  pillarCoords.forEach(pos => {
    const pillar = new THREE.Mesh(pillarGeo, stoneMat);
    pillar.position.set(pos.x, (0.13 + pillarHeight / 2) * scale, pos.z);
    pillar.castShadow = true;
    chhatri.add(pillar);

    // Carved capital bracket (toda)
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.12 * scale, 0.06 * scale, 0.12 * scale),
      darkStoneMat
    );
    cap.position.set(pos.x, (0.13 + pillarHeight) * scale, pos.z);
    cap.castShadow = true;
    chhatri.add(cap);
  });

  // 3. Projecting Chhajja (Sloping Stone Sunshade Eave)
  const eaveGeo = new THREE.CylinderGeometry(0.56 * scale, 0.44 * scale, 0.07 * scale, 8);
  const eave = new THREE.Mesh(eaveGeo, darkStoneMat);
  eave.position.y = (0.13 + pillarHeight + 0.04) * scale;
  eave.castShadow = true;
  chhatri.add(eave);

  // 4. Fluted Lotus Cupola Dome
  const domeBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.40 * scale, 0.42 * scale, 0.06 * scale, 12),
    stoneMat
  );
  domeBase.position.y = (0.13 + pillarHeight + 0.09) * scale;
  chhatri.add(domeBase);

  const domeGeo = new THREE.SphereGeometry(0.38 * scale, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = (0.13 + pillarHeight + 0.11) * scale;
  dome.castShadow = true;
  chhatri.add(dome);

  // 5. Golden Kalash Finial with Spire
  const kalashUrn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03 * scale, 0.08 * scale, 0.14 * scale, 8),
    goldMat
  );
  kalashUrn.position.y = (0.13 + pillarHeight + 0.11 + 0.38 + 0.07) * scale;
  kalashUrn.castShadow = true;

  const kalashSpire = new THREE.Mesh(
    new THREE.ConeGeometry(0.04 * scale, 0.16 * scale, 8),
    goldMat
  );
  kalashSpire.position.y = (0.13 + pillarHeight + 0.11 + 0.38 + 0.19) * scale;
  kalashSpire.castShadow = true;

  chhatri.add(kalashUrn, kalashSpire);
  return chhatri;
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. Carved Rajput Jharokha (Overhanging Lattice Balcony)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Creates an ornate Rajput Jharokha balcony with carved stone corbel brackets,
 * perforated lattice screen (jali), and a scalloped arch hood canopy.
 * @param {number} scale
 * @returns {THREE.Group}
 */
export function createRajasthanJharokha3D(scale = 1.0) {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneGold,
    roughness: 0.42,
    metalness: 0.08
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneWarm,
    roughness: 0.52
  });

  // Balcony floor projection
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(0.60 * scale, 0.08 * scale, 0.30 * scale),
    stoneMat
  );
  floor.castShadow = true;
  g.add(floor);

  // Supporting carved corbel brackets
  [-0.20, 0.20].forEach(bx => {
    const bracket = new THREE.Mesh(
      new THREE.ConeGeometry(0.08 * scale, 0.22 * scale, 4),
      darkStoneMat
    );
    bracket.rotation.x = Math.PI;
    bracket.position.set(bx * scale, -0.11 * scale, 0.05 * scale);
    g.add(bracket);
  });

  // Carved Jali front screen panel
  const jali = new THREE.Mesh(
    new THREE.BoxGeometry(0.56 * scale, 0.34 * scale, 0.06 * scale),
    darkStoneMat
  );
  jali.position.set(0, 0.18 * scale, 0.12 * scale);
  jali.castShadow = true;
  g.add(jali);

  // Scalloped hood canopy
  const hood = new THREE.Mesh(
    new THREE.ConeGeometry(0.36 * scale, 0.18 * scale, 6),
    stoneMat
  );
  hood.position.set(0, 0.42 * scale, 0.07 * scale);
  hood.castShadow = true;
  g.add(hood);

  return g;
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. North-West: The Amber & Jaisalmer Palace Citadel
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Builds the Majestic Amber & Jaisalmer Palace Citadel.
 * Positioned in the North-West quadrant, well clear of the central rolling arena.
 * Features tiered sandstone facades, carved jharokha balconies, arched Sun Gate,
 * corner bastions with domed chhatris, and the royal saffron flag.
 * @returns {THREE.Group}
 */
export function createRajasthanPalaceCitadel3D() {
  const palace = new THREE.Group();

  const sandMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneGold,
    roughness: 0.45,
    metalness: 0.08
  });
  const lightStoneMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneLight,
    roughness: 0.40,
    metalness: 0.10
  });
  const darkSandMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneWarm,
    roughness: 0.52
  });
  const rockMat = new THREE.MeshLambertMaterial({
    color: 0x8a582d,
    flatShading: true
  });
  const teakMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.teakWood,
    roughness: 0.65
  });

  // 1. Elevated Natural Sandstone Foundation Plinth
  const hillPlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.6, 0.55, 10),
    rockMat
  );
  hillPlinth.scale.set(1.35, 1.0, 1.1);
  hillPlinth.position.set(0, 0.28, 0);
  hillPlinth.receiveShadow = true;
  palace.add(hillPlinth);

  // 2. Lower Fortress Rampart Citadel (Storey 1)
  const lowerCitadel = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 1.15, 2.6),
    sandMat
  );
  lowerCitadel.position.set(0, 1.05, 0);
  lowerCitadel.castShadow = true;
  lowerCitadel.receiveShadow = true;
  palace.add(lowerCitadel);

  // Parapet coping with crenellations (kanguras)
  const parapet = new THREE.Mesh(
    new THREE.BoxGeometry(3.72, 0.16, 2.72),
    darkSandMat
  );
  parapet.position.set(0, 1.68, 0);
  parapet.castShadow = true;
  palace.add(parapet);

  // 3. Middle Palace Keep (Storey 2 - Hawa Mahal style jharokha tier)
  const midCitadel = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.95, 1.8),
    lightStoneMat
  );
  midCitadel.position.set(-0.15, 2.15, 0);
  midCitadel.castShadow = true;
  midCitadel.receiveShadow = true;
  palace.add(midCitadel);

  // 4. Upper Royal Crown Pavilion (Storey 3)
  const topCitadel = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.75, 1.2),
    sandMat
  );
  topCitadel.position.set(-0.35, 2.95, -0.1);
  topCitadel.castShadow = true;
  palace.add(topCitadel);

  // 5. Fortified Corner Bastions (Watchtowers)
  const bastionGeo = new THREE.CylinderGeometry(0.58, 0.72, 1.6, 10);
  const bastionPositions = [
    { x: -1.75, z: -1.25 },
    { x: 1.75, z: -1.25 },
    { x: 1.75, z: 1.25 },
    { x: -1.75, z: 1.25 }
  ];

  bastionPositions.forEach(bp => {
    const bastion = new THREE.Mesh(bastionGeo, sandMat);
    bastion.position.set(bp.x, 1.15, bp.z);
    bastion.castShadow = true;
    bastion.receiveShadow = true;
    palace.add(bastion);

    // Bastion Chhatri atop watchtower
    const bChhatri = createRajasthanChhatri3D(0.68, RAJASTHAN_PALETTE.stoneGold, RAJASTHAN_PALETTE.stoneLight);
    bChhatri.position.set(bp.x, 1.95, bp.z);
    palace.add(bChhatri);
  });

  // 6. Central Grand Palace Chhatri (Highest spire of the citadel)
  const royalChhatri = createRajasthanChhatri3D(1.05, RAJASTHAN_PALETTE.stoneLight, RAJASTHAN_PALETTE.royalGold);
  royalChhatri.position.set(-0.35, 3.32, -0.1);
  palace.add(royalChhatri);

  // 7. Carved Rajput Jharokha Balconies
  const jharokhaFront = createRajasthanJharokha3D(0.92);
  jharokhaFront.position.set(0.45, 1.45, 1.32);
  palace.add(jharokhaFront);

  const jharokhaUpper = createRajasthanJharokha3D(0.78);
  jharokhaUpper.position.set(-0.65, 2.22, 0.92);
  palace.add(jharokhaUpper);

  // 8. Suraj Pol (Sun Gate Arched Fortress Entry)
  const gateArch = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.95, 0.42),
    darkSandMat
  );
  gateArch.position.set(0, 0.75, 1.36);
  gateArch.castShadow = true;
  palace.add(gateArch);

  const gateDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.78, 0.10),
    teakMat
  );
  gateDoor.position.set(0, 0.65, 1.46);
  palace.add(gateDoor);

  // Gateway entry ramp
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.14, 1.1),
    sandMat
  );
  ramp.position.set(0, 0.32, 1.95);
  ramp.rotation.x = 0.14;
  ramp.receiveShadow = true;
  palace.add(ramp);

  // 9. Royal Saffron Bhagwa Banner of Rajasthan
  const flagpole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.028, 1.75, 8),
    new THREE.MeshStandardMaterial({ color: RAJASTHAN_PALETTE.royalGold, metalness: 0.85, roughness: 0.22 })
  );
  flagpole.position.set(-0.35, 4.55, -0.1);
  flagpole.castShadow = true;

  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(0.92, -0.24);
  flagShape.lineTo(0, -0.48);
  flagShape.closePath();

  const flagGeo = new THREE.ShapeGeometry(flagShape);
  const flagMat = new THREE.MeshLambertMaterial({
    color: RAJASTHAN_PALETTE.royalSaffron,
    side: THREE.DoubleSide
  });
  const pennant = new THREE.Mesh(flagGeo, flagMat);
  pennant.position.set(-0.34, 5.30, -0.1);
  pennant.rotation.y = 0.25;
  pennant.castShadow = true;

  palace.add(flagpole, pennant);
  return palace;
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. South-East: Symmetrical Royal Stepwell Kund (Panna Meena style)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Builds the Royal Stepwell Kund (Baori).
 * Inspired by Rajasthan's world-famous architectural stepwells (Panna Meena Ka Kund / Chand Baori).
 * Features symmetrical tiered sandstone steps descending to a serene jewel-turquoise water pool,
 * floating lotus flowers, and an ornate lakeside Chhatri pavilion.
 * @returns {THREE.Group}
 */
export function createRajasthanStepwellKund3D() {
  const kundGroup = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneGold,
    roughness: 0.45,
    metalness: 0.08
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneWarm,
    roughness: 0.52
  });

  // 1. Outer Sandstone Terrace Rim
  const terraceRim = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.22, 3.6),
    stoneMat
  );
  terraceRim.position.y = 0.38;
  terraceRim.receiveShadow = true;
  terraceRim.castShadow = true;
  kundGroup.add(terraceRim);

  // 2. Stepped Symmetrical Baori Tiers (Geometric stone steps descending into water)
  const tiers = [
    { outerW: 3.2, innerW: 2.6, y: 0.36 },
    { outerW: 2.6, innerW: 2.0, y: 0.31 },
    { outerW: 2.0, innerW: 1.4, y: 0.26 }
  ];

  tiers.forEach((t, idx) => {
    const halfOuter = t.outerW / 2;
    const halfInner = t.innerW / 2;
    const stepDepth = (t.outerW - t.innerW) / 2;
    const stepMat = idx % 2 === 0 ? darkStoneMat : stoneMat;

    // 4 borders forming each stepped tier
    const northStep = new THREE.Mesh(new THREE.BoxGeometry(t.outerW, 0.06, stepDepth), stepMat);
    northStep.position.set(0, t.y, -halfInner - stepDepth / 2);
    const southStep = new THREE.Mesh(new THREE.BoxGeometry(t.outerW, 0.06, stepDepth), stepMat);
    southStep.position.set(0, t.y, halfInner + stepDepth / 2);
    const westStep = new THREE.Mesh(new THREE.BoxGeometry(stepDepth, 0.06, t.innerW), stepMat);
    westStep.position.set(-halfInner - stepDepth / 2, t.y, 0);
    const eastStep = new THREE.Mesh(new THREE.BoxGeometry(stepDepth, 0.06, t.innerW), stepMat);
    eastStep.position.set(halfInner + stepDepth / 2, t.y, 0);

    kundGroup.add(northStep, southStep, westStep, eastStep);
  });

  // 3. Sacred Mirror Water Pool (Jewel-toned emerald-turquoise)
  const waterGeo = new THREE.BoxGeometry(1.38, 0.04, 1.38);
  const waterMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.waterEmerald,
    roughness: 0.08,
    metalness: 0.42,
    transparent: true,
    opacity: 0.92
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0.23;
  water.receiveShadow = true;
  kundGroup.add(water);

  // 4. Floating Sacred Lotus Pads & Pink Blossoms
  const lotusCoords = [
    { x: -0.35, z: -0.32 },
    { x: 0.38, z: 0.28 },
    { x: -0.22, z: 0.35 }
  ];
  const padGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.015, 8);
  const padMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
  const flwGeo = new THREE.ConeGeometry(0.08, 0.10, 6);
  const flwMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.25 });

  lotusCoords.forEach(lc => {
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(lc.x, 0.26, lc.z);
    const flw = new THREE.Mesh(flwGeo, flwMat);
    flw.rotation.x = Math.PI;
    flw.position.set(lc.x, 0.32, lc.z);
    kundGroup.add(pad, flw);
  });

  // 5. Lakeside Viewing Chhatri Pavilion
  const lakeChhatri = createRajasthanChhatri3D(0.95, RAJASTHAN_PALETTE.stoneGold, RAJASTHAN_PALETTE.marbleWhite);
  lakeChhatri.position.set(1.45, 0.45, -1.45);
  kundGroup.add(lakeChhatri);

  return kundGroup;
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. North-East: Desert Oasis & Date Palm Grove
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Builds an authentic desert date palm tree with graceful curved trunk,
 * terracotta planter rim, arching feathery fronds, and date clusters.
 * @param {number} x
 * @param {number} z
 * @param {number} scale
 * @param {number} rotY
 * @returns {THREE.Group}
 */
export function createRajasthanDatePalm3D(x = 0, z = 0, scale = 1.0, rotY = 0) {
  const palm = new THREE.Group();

  const trunkMat = new THREE.MeshLambertMaterial({
    color: RAJASTHAN_PALETTE.palmTrunk,
    flatShading: true
  });
  const frondMat = new THREE.MeshLambertMaterial({
    color: RAJASTHAN_PALETTE.palmFrond,
    flatShading: true
  });
  const dateMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneWarm,
    roughness: 0.35
  });

  // Terracotta stone planter ring
  const planter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38 * scale, 0.42 * scale, 0.14 * scale, 8),
    new THREE.MeshStandardMaterial({ color: RAJASTHAN_PALETTE.stoneDeep, roughness: 0.55 })
  );
  planter.position.y = 0.07 * scale;
  planter.receiveShadow = true;
  palm.add(planter);

  // Curved segmented trunk (4 tilted cylinders)
  let curY = 0.12 * scale;
  let curX = 0;
  for (let s = 0; s < 4; s++) {
    const segH = 0.52 * scale;
    const r1 = (0.13 - s * 0.015) * scale;
    const r2 = (0.16 - s * 0.015) * scale;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, segH, 7), trunkMat);
    seg.position.set(curX, curY + segH / 2, 0);
    seg.rotation.z = -0.08 * (s + 1);
    seg.castShadow = true;
    palm.add(seg);

    curY += segH * 0.94;
    curX += 0.045 * scale;
  }

  // Fruit clusters (dates) hanging below crown
  for (let d = 0; d < 3; d++) {
    const ang = (d / 3) * Math.PI * 2;
    const cluster = new THREE.Mesh(new THREE.SphereGeometry(0.10 * scale, 6, 6), dateMat);
    cluster.scale.set(1, 1.4, 1);
    cluster.position.set(curX + Math.cos(ang) * 0.12 * scale, curY - 0.06 * scale, Math.sin(ang) * 0.12 * scale);
    palm.add(cluster);
  }

  // Arching Feather Palm Fronds (8 outward-curving leaves)
  for (let f = 0; f < 8; f++) {
    const ang = (f / 8) * Math.PI * 2;
    const frondGroup = new THREE.Group();

    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.20 * scale, 1.05 * scale, 4), frondMat);
    blade.scale.set(1.4, 1.0, 0.22);
    blade.position.y = 0.50 * scale;
    blade.castShadow = true;
    frondGroup.add(blade);

    frondGroup.position.set(curX, curY, 0);
    frondGroup.rotation.y = ang;
    frondGroup.rotation.x = 0.74; // Graceful downward curve
    palm.add(frondGroup);
  }

  palm.position.set(x, 0.35, z);
  palm.rotation.y = rotY;
  return palm;
}

/**
 * Builds the North-East Oasis Grove with date palms, garden pavilion, and bougainvillea.
 * @returns {THREE.Group}
 */
export function createRajasthanOasisGrove3D() {
  const grove = new THREE.Group();

  // Garden pavilion
  const gardenChhatri = createRajasthanChhatri3D(0.88, RAJASTHAN_PALETTE.stoneGold, RAJASTHAN_PALETTE.stoneLight);
  gardenChhatri.position.set(0, 0.35, 0);
  grove.add(gardenChhatri);

  // Date palm cluster
  const palms = [
    { x: -1.3, z: -1.2, s: 1.15, r: 0.6 },
    { x: 1.4, z: -0.9, s: 1.05, r: -1.1 },
    { x: 0.2, z: 1.4, s: 0.95, r: 2.1 }
  ];
  palms.forEach(p => {
    const palm = createRajasthanDatePalm3D(p.x, p.z, p.s, p.r);
    grove.add(palm);
  });

  // Flowering Bougainvillea shrubs
  const bougMat = new THREE.MeshLambertMaterial({ color: RAJASTHAN_PALETTE.bougainvillea, flatShading: true });
  [
    { x: -0.9, z: 0.8, s: 0.38 },
    { x: 1.1, z: 0.9, s: 0.34 }
  ].forEach(bp => {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(bp.s, 0), bougMat);
    bush.position.set(bp.x, 0.45, bp.z);
    bush.castShadow = true;
    grove.add(bush);
  });

  return grove;
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. South-West: Royal Caravan Station & Resting Desert Camel
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Builds a beautifully sculpted, art-directed low-poly Thar Desert Camel
 * resting gracefully (couched pose) with royal crimson & gold jhool tapestry.
 * @param {number} x
 * @param {number} z
 * @param {number} scale
 * @param {number} rotY
 * @returns {THREE.Group}
 */
export function createRajasthanCamel3D(x = 0, z = 0, scale = 1.0, rotY = 0) {
  const camel = new THREE.Group();

  const furMat = new THREE.MeshLambertMaterial({
    color: RAJASTHAN_PALETTE.camelFur,
    flatShading: true
  });
  const darkFurMat = new THREE.MeshLambertMaterial({
    color: RAJASTHAN_PALETTE.stoneDeep,
    flatShading: true
  });
  const tapestryMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.royalCrimson,
    roughness: 0.45
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.royalGold,
    metalness: 0.85,
    roughness: 0.25
  });

  // 1. Couched Body (Resting on sand)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.72 * scale, 0.52 * scale, 1.25 * scale),
    furMat
  );
  body.position.y = 0.34 * scale;
  body.castShadow = true;
  body.receiveShadow = true;
  camel.add(body);

  // 2. Iconic Camel Hump
  const hump = new THREE.Mesh(
    new THREE.ConeGeometry(0.36 * scale, 0.50 * scale, 8),
    darkFurMat
  );
  hump.scale.set(0.85, 1.0, 1.2);
  hump.position.set(0, 0.72 * scale, 0.05 * scale);
  hump.castShadow = true;
  camel.add(hump);

  // 3. Royal Ceremonial Tapestry Saddle (Jhool)
  const saddle = new THREE.Mesh(
    new THREE.BoxGeometry(0.78 * scale, 0.26 * scale, 0.80 * scale),
    tapestryMat
  );
  saddle.position.set(0, 0.48 * scale, 0.05 * scale);
  saddle.castShadow = true;

  const goldFringe = new THREE.Mesh(
    new THREE.BoxGeometry(0.82 * scale, 0.06 * scale, 0.84 * scale),
    goldTrimMat
  );
  goldFringe.position.set(0, 0.36 * scale, 0.05 * scale);
  camel.add(saddle, goldFringe);

  // 4. Curved Neck & Noble Head
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14 * scale, 0.20 * scale, 0.72 * scale, 6),
    furMat
  );
  neck.position.set(0, 0.65 * scale, 0.62 * scale);
  neck.rotation.x = 0.48;
  neck.castShadow = true;
  camel.add(neck);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.24 * scale, 0.22 * scale, 0.42 * scale),
    furMat
  );
  head.position.set(0, 0.98 * scale, 0.84 * scale);
  head.castShadow = true;
  camel.add(head);

  // Soft desert ears
  [-0.10, 0.10].forEach(ex => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045 * scale, 0.12 * scale, 4), darkFurMat);
    ear.position.set(ex * scale, 1.12 * scale, 0.74 * scale);
    camel.add(ear);
  });

  // 5. Folded Resting Legs (Couched pose under body)
  const legPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.68 * scale, 0.12 * scale, 1.15 * scale),
    darkFurMat
  );
  legPad.position.y = 0.06 * scale;
  camel.add(legPad);

  camel.position.set(x, 0.35, z);
  camel.rotation.y = rotY;
  return camel;
}

/**
 * Builds the South-West Royal Caravan Camp with royal crimson shamiana tent,
 * resting camel, brass water urns (surahis), and trade cargo.
 * @returns {THREE.Group}
 */
export function createRajasthanCaravanCamp3D() {
  const camp = new THREE.Group();

  const tentMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.royalCrimson,
    roughness: 0.55
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.royalGold,
    metalness: 0.85,
    roughness: 0.22
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.royalGold,
    metalness: 0.92,
    roughness: 0.18
  });

  // 1. Royal Shamiana Tent (Scalloped ceremonial canopy)
  const tentPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.08, 2.0),
    new THREE.MeshStandardMaterial({ color: RAJASTHAN_PALETTE.stoneWarm, roughness: 0.6 })
  );
  tentPlinth.position.y = 0.04;
  camp.add(tentPlinth);

  // 4 Slender brass tent poles
  [[-1.0, -0.8], [1.0, -0.8], [1.0, 0.8], [-1.0, 0.8]].forEach(([px, pz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.35, 6), brassMat);
    pole.position.set(px, 0.68, pz);
    pole.castShadow = true;

    const spear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 6), goldTrimMat);
    spear.position.set(px, 1.40, pz);
    camp.add(pole, spear);
  });

  // Scalloped canopy roof
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 0.55, 4),
    tentMat
  );
  canopy.rotation.y = Math.PI / 4;
  canopy.scale.set(1.0, 1.0, 0.82);
  canopy.position.set(0, 1.55, 0);
  canopy.castShadow = true;

  const valance = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.12, 1.7),
    goldTrimMat
  );
  valance.position.set(0, 1.32, 0);
  camp.add(canopy, valance);

  // 2. Resting Ceremonial Camel in front of the camp
  const camel = createRajasthanCamel3D(0.2, 0.95, 0.92, 0.45);
  camp.add(camel);

  // 3. Caravan Cargo & Brass Water Surahi
  const cargoCrate = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.38, 0.48),
    new THREE.MeshLambertMaterial({ color: RAJASTHAN_PALETTE.stoneDeep })
  );
  cargoCrate.position.set(-0.75, 0.22, 0.45);
  cargoCrate.castShadow = true;

  const surahi = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.12, 0.32, 8),
    brassMat
  );
  surahi.position.set(-0.45, 0.20, 0.55);
  surahi.castShadow = true;
  camp.add(cargoCrate, surahi);

  camp.position.set(0, 0.35, 0);
  return camp;
}

// ──────────────────────────────────────────────────────────────────────────────
// 8. Master Assembler: The Rajasthan Diorama Centerpiece
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Assembles the complete authentic Rajasthan diorama centerpiece.
 * Carefully balanced across 4 quadrants to leave the central Chowk ($x, z \in [-2.8, 2.8]$)
 * completely unobstructed for 3D dice rolls and HUD controls.
 *
 * @param {THREE.Group} boardGroup
 * @returns {THREE.Group}
 */
export function buildRajasthanCenterpiece3D(boardGroup) {
  const rajasthanGroup = new THREE.Group();
  rajasthanGroup.name = 'rajasthan-centerpiece';

  // 1. North-West: Amber & Jaisalmer Palace Citadel
  const palace = createRajasthanPalaceCitadel3D();
  palace.position.set(-4.6, 0, -4.0);
  rajasthanGroup.add(palace);

  // 2. South-East: Symmetrical Royal Stepwell Kund (Panna Meena style)
  const stepwell = createRajasthanStepwellKund3D();
  stepwell.position.set(4.4, 0, 4.2);
  rajasthanGroup.add(stepwell);

  // 3. North-East: Desert Oasis & Date Palm Grove
  const oasis = createRajasthanOasisGrove3D();
  oasis.position.set(4.4, 0, -4.0);
  rajasthanGroup.add(oasis);

  // 4. South-West: Royal Caravan Camp with Resting Camel
  const caravan = createRajasthanCaravanCamp3D();
  caravan.position.set(-4.2, 0, 4.2);
  rajasthanGroup.add(caravan);

  boardGroup.add(rajasthanGroup);
  console.info('🏰 [Rajasthan Centerpiece] Built authentic Royal Sandstone Palace, Stepwell Kund, Oasis Grove & Caravan Station.');
  return rajasthanGroup;
}
