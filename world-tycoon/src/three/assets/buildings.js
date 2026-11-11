/**
 * three/assets/buildings.js
 * Architectural building procedural meshes with Flyweight geometry & material caching:
 * - Tier 1: Detailed Ownership Flag with waving pennant cloth and brass finial.
 * - Tiers 2-4: Detailed Cottages, Two-Story Villas, and Grand Neoclassical Luxury Manors with brick chimneys and flower boxes.
 * - Tier 5: 5-Tier Contemporary High-Rise Skyscraper with lobby canopy, glass shaft, stepped terraces, helipad, and flashing pinnacle beacon.
 * Refactored under Clean Code (Uncle Bob) with small single-responsibility builder functions.
 */

import * as THREE from 'three';

export const animatedFlags = [];
export const animatedChimneySmokes = [];
export const animatedSkyscraperBeacons = [];
export const animatedBuildingPopups = [];

// Shared Geometries Cache for maximum GPU reuse
const geomCache = {
  plinth: new THREE.CylinderGeometry(0.16, 0.20, 0.07, 16),
  brassCollar: new THREE.CylinderGeometry(0.14, 0.19, 0.05, 16),
  boltRing: new THREE.CylinderGeometry(0.08, 0.11, 0.04, 12),
  pole: new THREE.CylinderGeometry(0.042, 0.056, 1.80, 16),
  ring: new THREE.TorusGeometry(0.058, 0.014, 8, 16),
  finialBall: new THREE.SphereGeometry(0.095, 16, 16),
  finialTip: new THREE.ConeGeometry(0.052, 0.14, 12),
  star: new THREE.OctahedronGeometry(0.11, 0),
  smoke1: new THREE.DodecahedronGeometry(0.044, 0),
  smoke2: new THREE.DodecahedronGeometry(0.032, 0)
};

// Static Shared Materials Cache
const staticMatCache = {
  basePlinth: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.22, metalness: 0.88 }),
  pole: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.18, metalness: 0.85 }),
  goldTrim: new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfacc15, emissiveIntensity: 0.15, roughness: 0.25, metalness: 0.75 }),
  foundation: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.1 }),
  stoop: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.1 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.05 }),
  timber: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.1 }),
  ridge: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.2 }),
  windowGlow: new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 0.45, roughness: 0.1, metalness: 0.1 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.2 }),
  chimney: new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8, metalness: 0.05 }),
  smoke: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9, transparent: true, opacity: 0.75 }),
  foliage: new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8, metalness: 0.05 }),
  flower: new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 0.2, roughness: 0.6 }),
  curtainWall: new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.12, roughness: 0.12, metalness: 0.88 }),
  spandrel: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.75 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1, metalness: 0.95 }),
  beacon: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.6, roughness: 0.2 })
};

Object.values(geomCache).forEach(g => { g.userData = { isShared: true }; });
Object.values(staticMatCache).forEach(m => { m.userData = { isShared: true }; });

// Owner-color material pool
const colorMatPool = new Map();
function getOwnerMaterials(ownerColor) {
  const key = String(ownerColor);
  if (!colorMatPool.has(key)) {
    colorMatPool.set(key, {
      roof: new THREE.MeshStandardMaterial({ color: ownerColor, emissive: ownerColor, emissiveIntensity: 0.18, roughness: 0.35, metalness: 0.15, flatShading: true }),
      cloth: new THREE.MeshStandardMaterial({ color: ownerColor, emissive: ownerColor, emissiveIntensity: 0.18, roughness: 0.38, metalness: 0.12 }),
      door: new THREE.MeshStandardMaterial({ color: ownerColor, roughness: 0.45, metalness: 0.15 }),
      accent: new THREE.MeshStandardMaterial({ color: ownerColor, emissive: ownerColor, emissiveIntensity: 0.25, roughness: 0.2, metalness: 0.6 })
    });
  }
  return colorMatPool.get(key);
}

/**
 * Creates an architectural claim/ownership flag with a waving cloth pennant.
 * @param {number|string} ownerColor
 * @returns {THREE.Group}
 */
export function createDetailedFlagMesh(ownerColor) {
  const flagGroup = new THREE.Group();
  const mats = getOwnerMaterials(ownerColor);

  const plinth = new THREE.Mesh(geomCache.plinth, staticMatCache.basePlinth);
  plinth.position.y = 0.04;
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  const brassCollar = new THREE.Mesh(geomCache.brassCollar, staticMatCache.brass);
  brassCollar.position.y = 0.10;

  const boltRing = new THREE.Mesh(geomCache.boltRing, staticMatCache.brass);
  boltRing.position.y = 0.14;

  const pole = new THREE.Mesh(geomCache.pole, staticMatCache.pole);
  pole.position.y = 1.04;
  pole.castShadow = true;

  const ringTop = new THREE.Mesh(geomCache.ring, staticMatCache.brass);
  ringTop.position.set(0, 1.76, 0);
  ringTop.rotation.x = Math.PI / 2;

  const ringBtm = new THREE.Mesh(geomCache.ring, staticMatCache.brass);
  ringBtm.position.set(0, 1.05, 0);
  ringBtm.rotation.x = Math.PI / 2;

  const finialBall = new THREE.Mesh(geomCache.finialBall, staticMatCache.brass);
  finialBall.position.y = 1.98;

  const finialTip = new THREE.Mesh(geomCache.finialTip, staticMatCache.brass);
  finialTip.position.y = 2.09;

  flagGroup.add(plinth, brassCollar, boltRing, pole, ringTop, ringBtm, finialBall, finialTip);

  // Waving cloth pennant banner
  const clothGroup = new THREE.Group();
  clothGroup.position.set(0.04, 1.40, 0);

  const bannerH = 0.64;
  const seg1W = 0.32;
  const seg2W = 0.30;
  const seg3W = 0.28;
  const totalW = seg1W + seg2W + seg3W;

  const seg1 = new THREE.Mesh(new THREE.BoxGeometry(seg1W, bannerH, 0.032), mats.cloth);
  seg1.position.set(seg1W / 2, 0, 0);
  seg1.castShadow = true;

  const seg2Group = new THREE.Group();
  seg2Group.position.set(seg1W, 0, 0);
  seg2Group.rotation.y = 0.16;
  const seg2 = new THREE.Mesh(new THREE.BoxGeometry(seg2W, bannerH, 0.032), mats.cloth);
  seg2.position.set(seg2W / 2, 0, 0);
  seg2.castShadow = true;

  const seg3Group = new THREE.Group();
  seg3Group.position.set(seg2W, 0, 0);
  seg3Group.rotation.y = -0.25;
  const seg3 = new THREE.Mesh(new THREE.BoxGeometry(seg3W, bannerH * 0.90, 0.032), mats.cloth);
  seg3.position.set(seg3W / 2, 0, 0);
  seg3.castShadow = true;

  const borderThick = 0.036;
  const topBorder = new THREE.Mesh(new THREE.BoxGeometry(totalW, borderThick, 0.038), staticMatCache.goldTrim);
  topBorder.position.set(totalW / 2, bannerH / 2 + borderThick / 2, 0);
  const btmBorder = new THREE.Mesh(new THREE.BoxGeometry(totalW, borderThick, 0.038), staticMatCache.goldTrim);
  btmBorder.position.set(totalW / 2, -(bannerH / 2 + borderThick / 2), 0);

  const star = new THREE.Mesh(geomCache.star, staticMatCache.goldTrim);
  star.position.set(0.36, 0, 0.024);
  star.scale.set(1, 1, 0.35);

  seg3Group.add(seg3);
  seg2Group.add(seg2, seg3Group);
  clothGroup.add(seg1, seg2Group, topBorder, btmBorder, star);
  flagGroup.add(clothGroup);

  clothGroup.userData = { isFlagCloth: true, phase: Math.random() * Math.PI * 2, seg2: seg2Group, seg3: seg3Group };
  animatedFlags.push(clothGroup);

  return flagGroup;
}

/**
 * Builds Level 1 Cottage.
 * @param {object} mats
 * @param {THREE.Group} group
 */
function buildCottage(mats, group) {
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.62), staticMatCache.foundation);
  foundation.position.y = 0.04;
  foundation.castShadow = true;

  const stoop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.12), staticMatCache.stoop);
  stoop.position.set(0, 0.02, 0.34);

  const walls = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.44, 0.54), staticMatCache.wall);
  walls.position.y = 0.30;
  walls.castShadow = true;
  walls.receiveShadow = true;

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.02), mats.door);
  door.position.set(0, 0.21, 0.272);

  const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.024), staticMatCache.windowGlow);
  winGlass.position.set(0.20, 0.26, 0.272);

  // Pitched gable roof
  const roofSlopeL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.62), mats.roof);
  roofSlopeL.position.set(-0.16, 0.65, 0);
  roofSlopeL.rotation.z = Math.PI * 0.22;
  const roofSlopeR = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.62), mats.roof);
  roofSlopeR.position.set(0.16, 0.65, 0);
  roofSlopeR.rotation.z = -Math.PI * 0.22;

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.08), staticMatCache.chimney);
  chimney.position.set(0.16, 0.72, -0.12);
  chimney.castShadow = true;

  const smoke1 = new THREE.Mesh(geomCache.smoke1, staticMatCache.smoke);
  smoke1.position.set(0.16, 0.88, -0.12);
  smoke1.userData = { isSmoke: true, baseY: 0.88, phase: 0 };
  animatedChimneySmokes.push(smoke1);

  group.add(foundation, stoop, walls, door, winGlass, roofSlopeL, roofSlopeR, chimney, smoke1);
}

/**
 * Builds Level 2 Villa.
 * @param {object} mats
 * @param {THREE.Group} group
 */
function buildVilla(mats, group) {
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.09, 0.68), staticMatCache.foundation);
  foundation.position.y = 0.045;
  foundation.castShadow = true;

  const wallsF1 = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.38, 0.60), staticMatCache.wall);
  wallsF1.position.y = 0.28;
  wallsF1.castShadow = true;

  const wallsF2 = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.34, 0.54), staticMatCache.wall);
  wallsF2.position.y = 0.64;
  wallsF2.castShadow = true;

  const roofL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.66), mats.roof);
  roofL.position.set(-0.18, 0.94, 0);
  roofL.rotation.z = Math.PI * 0.23;
  const roofR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.66), mats.roof);
  roofR.position.set(0.18, 0.94, 0);
  roofR.rotation.z = -Math.PI * 0.23;

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.09), staticMatCache.chimney);
  chimney.position.set(0.18, 0.98, -0.12);
  chimney.castShadow = true;

  const smoke1 = new THREE.Mesh(geomCache.smoke1, staticMatCache.smoke);
  smoke1.position.set(0.18, 1.19, -0.12);
  smoke1.userData = { isSmoke: true, baseY: 1.19, phase: 0.8 };
  animatedChimneySmokes.push(smoke1);

  group.add(foundation, wallsF1, wallsF2, roofL, roofR, chimney, smoke1);
}

/**
 * Builds Level 3 Manor.
 * @param {object} mats
 * @param {THREE.Group} group
 */
function buildManor(mats, group) {
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.10, 0.74), staticMatCache.foundation);
  foundation.position.y = 0.05;
  foundation.castShadow = true;

  const centralWalls = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.76, 0.64), staticMatCache.wall);
  centralWalls.position.y = 0.48;
  centralWalls.castShadow = true;

  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.52, 0.58), staticMatCache.wall);
  wingL.position.set(-0.35, 0.36, 0);
  wingL.castShadow = true;

  const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.52, 0.58), staticMatCache.wall);
  wingR.position.set(0.35, 0.36, 0);
  wingR.castShadow = true;

  const cRoofL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.70), mats.roof);
  cRoofL.position.set(-0.12, 1.01, 0);
  cRoofL.rotation.z = Math.PI * 0.22;
  const cRoofR = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.70), mats.roof);
  cRoofR.position.set(0.12, 1.01, 0);
  cRoofR.rotation.z = -Math.PI * 0.22;

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.32, 0.09), staticMatCache.chimney);
  chimney.position.set(0.32, 0.74, -0.14);
  chimney.castShadow = true;

  const smoke1 = new THREE.Mesh(geomCache.smoke1, staticMatCache.smoke);
  smoke1.position.set(0.32, 0.95, -0.14);
  smoke1.userData = { isSmoke: true, baseY: 0.95, phase: 1.2 };
  animatedChimneySmokes.push(smoke1);

  group.add(foundation, centralWalls, wingL, wingR, cRoofL, cRoofR, chimney, smoke1);
}

/**
 * Creates a cozy residential house mesh (Level 1: Cottage, Level 2: Villa, Level 3: Manor).
 * @param {number|string} ownerColor
 * @param {number} index - Upgrade level (0 to 2)
 * @returns {THREE.Group}
 */
export function createDetailedHouseMesh(ownerColor, index = 0) {
  const houseGroup = new THREE.Group();
  const mats = getOwnerMaterials(ownerColor);

  if (index === 0) {
    buildCottage(mats, houseGroup);
  } else if (index === 1) {
    buildVilla(mats, houseGroup);
  } else {
    buildManor(mats, houseGroup);
  }

  return houseGroup;
}

/**
 * Creates a 5-tier modern contemporary skyscraper with glass curtain walls, terraces, and flashing beacon.
 * @param {number|string} ownerColor
 * @returns {THREE.Group}
 */
export function createDetailedSkyscraperMesh(ownerColor) {
  const towerGroup = new THREE.Group();
  const mats = getOwnerMaterials(ownerColor);

  // Podium Base
  const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.12, 0.88), staticMatCache.foundation);
  basePlinth.position.y = 0.06;
  basePlinth.castShadow = true;

  const lobby = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.44, 0.78), staticMatCache.curtainWall);
  lobby.position.y = 0.34;
  lobby.castShadow = true;

  // Tower Shaft
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.20, 0.66), staticMatCache.curtainWall);
  shaft.position.y = 1.16;
  shaft.castShadow = true;

  // Upper Penthouse
  const upperTier = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.52), mats.accent);
  upperTier.position.y = 2.12;
  upperTier.castShadow = true;

  // Spire & Aviation Beacon
  const spireBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.08, 8), staticMatCache.chrome);
  spireBase.position.y = 2.56;
  const spireNeedle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.032, 0.64, 8), staticMatCache.chrome);
  spireNeedle.position.y = 2.92;
  spireNeedle.castShadow = true;

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), staticMatCache.beacon);
  beacon.position.y = 3.26;
  beacon.userData = { isBeacon: true, phase: Math.random() * Math.PI * 2 };
  animatedSkyscraperBeacons.push(beacon);

  towerGroup.add(basePlinth, lobby, shaft, upperTier, spireBase, spireNeedle, beacon);
  return towerGroup;
}

/**
 * Updates dynamic flutter for cloth flags, bobbing chimney smoke, and pulsing skyscraper beacons.
 * @param {number} now - performance.now()
 * @param {number} t - time in seconds
 */
export function updateBuildingAnimations(now, t) {
  // Building elastic popup animation with squash & stretch
  for (let i = animatedBuildingPopups.length - 1; i >= 0; i--) {
    const item = animatedBuildingPopups[i];
    if (!item.mesh.parent) {
      animatedBuildingPopups.splice(i, 1);
      continue;
    }
    if (now < item.startTime) continue;
    const elapsed = now - item.startTime;
    const p = Math.min(1, elapsed / item.duration);
    const maxScale = item.targetScale || 1;

    if (p >= 1) {
      item.mesh.scale.set(maxScale, maxScale, maxScale);
      animatedBuildingPopups.splice(i, 1);
    } else {
      const elastic = 1 - Math.pow(2, -9 * p) * Math.cos((p * 10 - 0.75) * ((2 * Math.PI) / 3));
      const stretch = (p < 0.6) ? (1 + (0.6 - p) * 0.28) : 1.0;
      const scaleXZ = (maxScale * elastic) / Math.sqrt(stretch);
      const scaleY = (maxScale * elastic) * stretch;
      item.mesh.scale.set(scaleXZ, scaleY, scaleXZ);
    }
  }

  // Waving cloth flag wind fluttering
  for (let i = animatedFlags.length - 1; i >= 0; i--) {
    const fGroup = animatedFlags[i];
    if (!fGroup.parent) {
      animatedFlags.splice(i, 1);
      continue;
    }
    const ud = fGroup.userData;
    if (ud?.seg2) ud.seg2.rotation.y = 0.16 + Math.sin(t * 3.8 + ud.phase) * 0.14;
    if (ud?.seg3) ud.seg3.rotation.y = -0.25 + Math.sin(t * 4.5 + ud.phase) * 0.22;
  }

  // Chimney smoke bobbing & breathing
  for (let i = animatedChimneySmokes.length - 1; i >= 0; i--) {
    const smk = animatedChimneySmokes[i];
    if (!smk.parent) {
      animatedChimneySmokes.splice(i, 1);
      continue;
    }
    const ud = smk.userData;
    smk.position.y = ud.baseY + Math.sin(t * 2.8 + ud.phase) * 0.025;
    const s = 1 + Math.sin(t * 3.4 + ud.phase) * 0.12;
    smk.scale.set(s, s, s);
  }

  // Skyscraper beacon flashing
  for (let i = animatedSkyscraperBeacons.length - 1; i >= 0; i--) {
    const bcn = animatedSkyscraperBeacons[i];
    if (!bcn.parent) {
      animatedSkyscraperBeacons.splice(i, 1);
      continue;
    }
    if (bcn.material) {
      bcn.material.emissiveIntensity = 1.0 + Math.sin(t * 5.0 + (bcn.userData?.phase || 0)) * 0.8;
    }
  }
}
