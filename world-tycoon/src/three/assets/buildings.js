/**
 * three/assets/buildings.js
 * Architectural building procedural meshes:
 * - Tier 1: Detailed Ownership Flag with waving pennant cloth and brass finial.
 * - Tiers 2-4: Detailed Cottages, Two-Story Villas, and Grand Neoclassical Luxury Manors with brick chimneys and flower boxes.
 * - Tier 5: 5-Tier Contemporary High-Rise Skyscraper with lobby canopy, glass shaft, stepped terraces, helipad, and flashing pinnacle beacon.
 */

import * as THREE from 'three';

export const animatedFlags = [];
export const animatedChimneySmokes = [];
export const animatedSkyscraperBeacons = [];
export const animatedBuildingPopups = [];

// Shared Flag Geometries & Static Materials Cache for maximum GPU reuse
const sharedFlagGeom = {
  plinth: new THREE.CylinderGeometry(0.22, 0.28, 0.08, 16),
  brassCollar: new THREE.CylinderGeometry(0.14, 0.19, 0.05, 16),
  boltRing: new THREE.CylinderGeometry(0.08, 0.11, 0.04, 12),
  pole: new THREE.CylinderGeometry(0.042, 0.056, 1.80, 16),
  ring: new THREE.TorusGeometry(0.058, 0.014, 8, 16),
  finialBall: new THREE.SphereGeometry(0.095, 16, 16),
  finialTip: new THREE.ConeGeometry(0.052, 0.14, 12),
  star: new THREE.OctahedronGeometry(0.11, 0)
};

const sharedFlagMat = {
  basePlinth: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.22, metalness: 0.88 }),
  pole: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.18, metalness: 0.85 }),
  goldTrim: new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xfacc15,
    emissiveIntensity: 0.15,
    roughness: 0.25,
    metalness: 0.75
  })
};

/**
 * Creates an architectural claim/ownership flag with a waving cloth pennant.
 * @param {number|string} ownerColor - Player's theme color
 * @returns {THREE.Group}
 */
export function createDetailedFlagMesh(ownerColor) {
  const flagGroup = new THREE.Group();

  const clothMat = new THREE.MeshStandardMaterial({
    color: ownerColor,
    emissive: ownerColor,
    emissiveIntensity: 0.18,
    roughness: 0.38,
    metalness: 0.12
  });

  // 1. Plinth & mounting collar (Heavy brass/slate weighted pedestal)
  const plinth = new THREE.Mesh(sharedFlagGeom.plinth, sharedFlagMat.basePlinth);
  plinth.position.y = 0.04;
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  const brassCollar = new THREE.Mesh(sharedFlagGeom.brassCollar, sharedFlagMat.brass);
  brassCollar.position.y = 0.10;
  brassCollar.castShadow = true;

  const boltRing = new THREE.Mesh(sharedFlagGeom.boltRing, sharedFlagMat.brass);
  boltRing.position.y = 0.14;
  flagGroup.add(plinth, brassCollar, boltRing);

  // 2. High-visibility Flagpole (Tall, solid, gleaming)
  const pole = new THREE.Mesh(sharedFlagGeom.pole, sharedFlagMat.pole);
  pole.position.y = 1.04;
  pole.castShadow = true;

  const ringTop = new THREE.Mesh(sharedFlagGeom.ring, sharedFlagMat.brass);
  ringTop.position.set(0, 1.76, 0);
  ringTop.rotation.x = Math.PI / 2;
  const ringBtm = new THREE.Mesh(sharedFlagGeom.ring, sharedFlagMat.brass);
  ringBtm.position.set(0, 1.05, 0);
  ringBtm.rotation.x = Math.PI / 2;

  const finialBall = new THREE.Mesh(sharedFlagGeom.finialBall, sharedFlagMat.brass);
  finialBall.position.y = 1.98;
  const finialTip = new THREE.Mesh(sharedFlagGeom.finialTip, sharedFlagMat.brass);
  finialTip.position.y = 2.09;
  flagGroup.add(pole, ringTop, ringBtm, finialBall, finialTip);

  // 3. Waving cloth pennant banner (Large, bold, 3 waving segments)
  const clothGroup = new THREE.Group();
  clothGroup.position.set(0.04, 1.40, 0);

  const bannerH = 0.64;
  const seg1W = 0.32;
  const seg2W = 0.30;
  const seg3W = 0.28;
  const totalW = seg1W + seg2W + seg3W; // 0.90 width

  const seg1 = new THREE.Mesh(new THREE.BoxGeometry(seg1W, bannerH, 0.032), clothMat);
  seg1.position.set(seg1W / 2, 0, 0);
  seg1.castShadow = true;

  const seg2Group = new THREE.Group();
  seg2Group.position.set(seg1W, 0, 0);
  seg2Group.rotation.y = 0.16;
  const seg2 = new THREE.Mesh(new THREE.BoxGeometry(seg2W, bannerH, 0.032), clothMat);
  seg2.position.set(seg2W / 2, 0, 0);
  seg2.castShadow = true;

  const seg3Group = new THREE.Group();
  seg3Group.position.set(seg2W, 0, 0);
  seg3Group.rotation.y = -0.25;
  const seg3 = new THREE.Mesh(new THREE.BoxGeometry(seg3W, bannerH * 0.90, 0.032), clothMat);
  seg3.position.set(seg3W / 2, 0, 0);
  seg3.castShadow = true;

  // Golden borders across the top and bottom
  const borderThick = 0.036;
  const topBorder = new THREE.Mesh(new THREE.BoxGeometry(totalW, borderThick, 0.038), sharedFlagMat.goldTrim);
  topBorder.position.set(totalW / 2, bannerH / 2 + borderThick / 2, 0);
  const btmBorder = new THREE.Mesh(new THREE.BoxGeometry(totalW, borderThick, 0.038), sharedFlagMat.goldTrim);
  btmBorder.position.set(totalW / 2, -(bannerH / 2 + borderThick / 2), 0);

  // Prominent Golden Star emblem in the center
  const star = new THREE.Mesh(sharedFlagGeom.star, sharedFlagMat.goldTrim);
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
 * Creates a cozy residential house mesh (Level 1: Cottage, Level 2: Villa, Level 3: Manor).
 * @param {number|string} ownerColor
 * @param {number} index - Upgrade level (1 to 3)
 * @returns {THREE.Group}
 */
export function createDetailedHouseMesh(ownerColor, index = 0) {
  const houseGroup = new THREE.Group();

  const foundationMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.1 });
  const stoopMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.1 });
  // Wall with subtle warm tint, roof with vibrant player owner color and matching accent trim
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.05 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.1 });
  const roofMat = new THREE.MeshStandardMaterial({ color: ownerColor, emissive: ownerColor, emissiveIntensity: 0.18, roughness: 0.35, metalness: 0.15, flatShading: true });
  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.2 });
  const doorMat = new THREE.MeshStandardMaterial({ color: ownerColor, roughness: 0.45, metalness: 0.15 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.85 });
  const windowGlowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 0.6, roughness: 0.2 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7, metalness: 0.05 });
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.75, flatShading: true });
  const planterMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });

  const lvl = Math.max(1, Math.min(3, Number(index) || 1));

  if (lvl === 1) {
    // LEVEL 1: Charming Cozy Cottage
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.48), foundationMat);
    foundation.position.y = 0.035;
    foundation.castShadow = true;
    foundation.receiveShadow = true;

    const stoop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.09), stoopMat);
    stoop.position.set(0.08, 0.015, 0.26);
    stoop.castShadow = true;
    stoop.receiveShadow = true;
    houseGroup.add(foundation, stoop);

    const walls = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.44), wallMat);
    walls.position.y = 0.24;
    walls.castShadow = true;
    walls.receiveShadow = true;
    houseGroup.add(walls);

    [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]].forEach(([cx, cz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.35, 0.036), timberMat);
      post.position.set(cx, 0.245, cz);
      post.castShadow = true;
      houseGroup.add(post);
    });

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.02), doorMat);
    door.position.set(0.08, 0.18, 0.225);
    const doorknob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), brassMat);
    doorknob.position.set(0.12, 0.18, 0.24);
    const doorHood = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.06), timberMat);
    doorHood.position.set(0.08, 0.30, 0.24);
    houseGroup.add(door, doorknob, doorHood);

    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.018), frameMat);
    winFrame.position.set(-0.10, 0.24, 0.223);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.11, 0.022), windowGlowMat);
    winGlass.position.set(-0.10, 0.24, 0.225);

    const planter = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.05), planterMat);
    planter.position.set(-0.10, 0.155, 0.245);
    [-0.04, 0, 0.04].forEach((fx, fIdx) => {
      const fColors = [0xf43f5e, 0xfacc15, 0x38bdf8];
      const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.018, 0), new THREE.MeshStandardMaterial({ color: fColors[fIdx] }));
      flower.position.set(-0.10 + fx, 0.185, 0.245);
      houseGroup.add(flower);
    });
    houseGroup.add(winFrame, winGlass, planter);

    const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.11, 0.11), windowGlowMat);
    sideWin.position.set(-0.223, 0.24, 0);
    houseGroup.add(sideWin);

    const roofSlopeL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.50), roofMat);
    roofSlopeL.position.set(-0.10, 0.50, 0);
    roofSlopeL.rotation.z = Math.PI * 0.18;
    roofSlopeL.castShadow = true;
    roofSlopeL.receiveShadow = true;

    const roofSlopeR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.50), roofMat);
    roofSlopeR.position.set(0.10, 0.50, 0);
    roofSlopeR.rotation.z = -Math.PI * 0.18;
    roofSlopeR.castShadow = true;
    roofSlopeR.receiveShadow = true;

    const gableFront = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.02, 3), wallMat);
    gableFront.rotation.y = Math.PI / 6;
    gableFront.rotation.z = Math.PI / 2;
    gableFront.position.set(0, 0.46, 0.21);
    const gableBack = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.02, 3), wallMat);
    gableBack.rotation.y = Math.PI / 6;
    gableBack.rotation.z = Math.PI / 2;
    gableBack.position.set(0, 0.46, -0.21);

    const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.52), ridgeMat);
    ridgeCap.position.set(0, 0.59, 0);
    houseGroup.add(roofSlopeL, roofSlopeR, gableFront, gableBack, ridgeCap);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), chimneyMat);
    chimney.position.set(0.12, 0.55, -0.10);
    chimney.castShadow = true;

    const chimneyCrown = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.10), ridgeMat);
    chimneyCrown.position.set(0.12, 0.67, -0.10);

    const smoke1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.038, 0), smokeMat);
    smoke1.position.set(0.12, 0.72, -0.10);
    const smoke2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.028, 0), smokeMat);
    smoke2.position.set(0.14, 0.78, -0.09);

    smoke1.userData = { isSmoke: true, baseY: 0.72, phase: 0 };
    smoke2.userData = { isSmoke: true, baseY: 0.78, phase: 1.2 };
    animatedChimneySmokes.push(smoke1, smoke2);

    houseGroup.add(chimney, chimneyCrown, smoke1, smoke2);
  } else if (lvl === 2) {
    // LEVEL 2: Stately Two-Story Villa
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.62), foundationMat);
    foundation.position.y = 0.045;
    foundation.castShadow = true;
    foundation.receiveShadow = true;

    const stoop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.12), stoopMat);
    stoop.position.set(0, 0.02, 0.33);
    stoop.castShadow = true;
    stoop.receiveShadow = true;
    houseGroup.add(foundation, stoop);

    const firstWalls = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.36, 0.58), wallMat);
    firstWalls.position.y = 0.27;
    firstWalls.castShadow = true;
    firstWalls.receiveShadow = true;
    houseGroup.add(firstWalls);

    [[-0.30, -0.27], [0.30, -0.27], [-0.30, 0.27], [0.30, 0.27]].forEach(([cx, cz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.04), timberMat);
      post.position.set(cx, 0.28, cz);
      post.castShadow = true;
      houseGroup.add(post);
    });

    const frontDoor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.24, 0.02), doorMat);
    frontDoor.position.set(0, 0.19, 0.292);
    const knobL = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), brassMat);
    knobL.position.set(-0.025, 0.19, 0.305);
    const knobR = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), brassMat);
    knobR.position.set(0.025, 0.19, 0.305);
    const doorCanopy = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.09), timberMat);
    doorCanopy.position.set(0, 0.32, 0.32);
    const porchLantern = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), brassMat);
    porchLantern.position.set(0, 0.28, 0.32);
    houseGroup.add(frontDoor, knobL, knobR, doorCanopy, porchLantern);

    [-0.20, 0.20].forEach(wx => {
      const wFrame = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.018), frameMat);
      wFrame.position.set(wx, 0.25, 0.292);
      const wGlass = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.022), windowGlowMat);
      wGlass.position.set(wx, 0.25, 0.294);
      const wPlanter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.05), planterMat);
      wPlanter.position.set(wx, 0.165, 0.31);
      const f1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.016, 0), new THREE.MeshStandardMaterial({ color: 0xf43f5e }));
      f1.position.set(wx - 0.03, 0.195, 0.31);
      const f2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.016, 0), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
      f2.position.set(wx + 0.03, 0.195, 0.31);
      houseGroup.add(wFrame, wGlass, wPlanter, f1, f2);
    });

    const sideW1 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.12, 0.12), windowGlowMat);
    sideW1.position.set(-0.322, 0.26, 0);
    const sideW2 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.12, 0.12), windowGlowMat);
    sideW2.position.set(0.322, 0.26, 0);
    houseGroup.add(sideW1, sideW2);

    const floorMolding = new THREE.Mesh(new THREE.BoxGeometry(0.67, 0.035, 0.61), timberMat);
    floorMolding.position.y = 0.465;
    floorMolding.castShadow = true;
    houseGroup.add(floorMolding);

    const upperWalls = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.34, 0.54), wallMat);
    upperWalls.position.y = 0.65;
    upperWalls.castShadow = true;
    upperWalls.receiveShadow = true;
    houseGroup.add(upperWalls);

    [[-0.28, -0.25], [0.28, -0.25], [-0.28, 0.25], [0.28, 0.25]].forEach(([cx, cz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.35, 0.036), timberMat);
      post.position.set(cx, 0.65, cz);
      houseGroup.add(post);
    });

    const balconyFloor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.08), stoopMat);
    balconyFloor.position.set(0, 0.49, 0.30);
    const balconyRail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.02), brassMat);
    balconyRail.position.set(0, 0.535, 0.33);
    houseGroup.add(balconyFloor, balconyRail);

    [-0.17, 0.17].forEach(wx => {
      const wFrame = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.018), frameMat);
      wFrame.position.set(wx, 0.66, 0.272);
      const wGlass = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.022), windowGlowMat);
      wGlass.position.set(wx, 0.66, 0.274);
      houseGroup.add(wFrame, wGlass);
    });

    const sideW3 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.11, 0.11), windowGlowMat);
    sideW3.position.set(-0.302, 0.66, 0);
    const sideW4 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.11, 0.11), windowGlowMat);
    sideW4.position.set(0.302, 0.66, 0);
    houseGroup.add(sideW3, sideW4);

    const roofSlopeL = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.038, 0.62), roofMat);
    roofSlopeL.position.set(-0.14, 0.93, 0);
    roofSlopeL.rotation.z = Math.PI * 0.20;
    roofSlopeL.castShadow = true;
    roofSlopeL.receiveShadow = true;

    const roofSlopeR = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.038, 0.62), roofMat);
    roofSlopeR.position.set(0.14, 0.93, 0);
    roofSlopeR.rotation.z = -Math.PI * 0.20;
    roofSlopeR.castShadow = true;
    roofSlopeR.receiveShadow = true;

    const gableFront = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.02, 3), wallMat);
    gableFront.rotation.y = Math.PI / 6;
    gableFront.rotation.z = Math.PI / 2;
    gableFront.position.set(0, 0.88, 0.265);
    const gableBack = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.02, 3), wallMat);
    gableBack.rotation.y = Math.PI / 6;
    gableBack.rotation.z = Math.PI / 2;
    gableBack.position.set(0, 0.88, -0.265);

    const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.64), ridgeMat);
    ridgeCap.position.set(0, 1.05, 0);
    houseGroup.add(roofSlopeL, roofSlopeR, gableFront, gableBack, ridgeCap);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.09), chimneyMat);
    chimney.position.set(0.18, 0.98, -0.12);
    chimney.castShadow = true;
    const chimneyCrown = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.11), ridgeMat);
    chimneyCrown.position.set(0.18, 1.13, -0.12);

    const smoke1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.044, 0), smokeMat);
    smoke1.position.set(0.18, 1.19, -0.12);
    const smoke2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.032, 0), smokeMat);
    smoke2.position.set(0.20, 1.27, -0.11);
    smoke1.userData = { isSmoke: true, baseY: 1.19, phase: 0.8 };
    smoke2.userData = { isSmoke: true, baseY: 1.27, phase: 2.0 };
    animatedChimneySmokes.push(smoke1, smoke2);

    houseGroup.add(chimney, chimneyCrown, smoke1, smoke2);
  } else {
    // LEVEL 3: Grand Luxury Manor / Estate
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.10, 0.74), foundationMat);
    foundation.position.y = 0.05;
    foundation.castShadow = true;
    foundation.receiveShadow = true;

    const stoop1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.035, 0.16), stoopMat);
    stoop1.position.set(0, 0.02, 0.39);
    const stoop2 = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.035, 0.12), stoopMat);
    stoop2.position.set(0, 0.05, 0.38);
    houseGroup.add(foundation, stoop1, stoop2);

    const centralWalls = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.76, 0.64), wallMat);
    centralWalls.position.y = 0.48;
    centralWalls.castShadow = true;
    centralWalls.receiveShadow = true;
    houseGroup.add(centralWalls);

    const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.44, 8), brassMat);
    colL.position.set(-0.13, 0.28, 0.38);
    colL.castShadow = true;
    const colR = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.44, 8), brassMat);
    colR.position.set(0.13, 0.28, 0.38);
    colR.castShadow = true;

    const porticoEntablature = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.14), timberMat);
    porticoEntablature.position.set(0, 0.51, 0.38);
    const porticoPediment = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 3), timberMat);
    porticoPediment.rotation.y = Math.PI / 6;
    porticoPediment.rotation.z = Math.PI / 2;
    porticoPediment.position.set(0, 0.56, 0.38);
    houseGroup.add(colL, colR, porticoEntablature, porticoPediment);

    const doubleDoors = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.02), doorMat);
    doubleDoors.position.set(0, 0.21, 0.322);
    const doorArch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.025, 12, 1, false, 0, Math.PI), brassMat);
    doorArch.rotation.z = Math.PI;
    doorArch.rotation.y = Math.PI / 2;
    doorArch.position.set(0, 0.35, 0.322);
    houseGroup.add(doubleDoors, doorArch);

    const grandWinFrame = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 0.02), frameMat);
    grandWinFrame.position.set(0, 0.65, 0.322);
    const grandWinGlass = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.20, 0.024), windowGlowMat);
    grandWinGlass.position.set(0, 0.65, 0.322);
    houseGroup.add(grandWinFrame, grandWinGlass);

    const cRoofL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.70), roofMat);
    cRoofL.position.set(-0.12, 1.01, 0);
    cRoofL.rotation.z = Math.PI * 0.22;
    cRoofL.castShadow = true;
    cRoofL.receiveShadow = true;

    const cRoofR = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.70), roofMat);
    cRoofR.position.set(0.12, 1.01, 0);
    cRoofR.rotation.z = -Math.PI * 0.22;
    cRoofR.castShadow = true;
    cRoofR.receiveShadow = true;

    const cGableFront = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 3), wallMat);
    cGableFront.rotation.y = Math.PI / 6;
    cGableFront.rotation.z = Math.PI / 2;
    cGableFront.position.set(0, 0.96, 0.315);
    const cGableBack = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 3), wallMat);
    cGableBack.rotation.y = Math.PI / 6;
    cGableBack.rotation.z = Math.PI / 2;
    cGableBack.position.set(0, 0.96, -0.315);

    const cRidgeCap = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.72), ridgeMat);
    cRidgeCap.position.set(0, 1.13, 0);
    houseGroup.add(cRoofL, cRoofR, cGableFront, cGableBack, cRidgeCap);

    const dormer = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.12), wallMat);
    dormer.position.set(0, 0.96, 0.26);
    const dormerWin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.015), windowGlowMat);
    dormerWin.position.set(0, 0.96, 0.322);
    const dormerRoof = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.08, 4), ridgeMat);
    dormerRoof.rotation.y = Math.PI / 4;
    dormerRoof.position.set(0, 1.05, 0.26);
    houseGroup.add(dormer, dormerWin, dormerRoof);

    [-0.35, 0.35].forEach((wingX, wIdx) => {
      const isLeft = wIdx === 0;
      const wingWalls = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.52, 0.56), wallMat);
      wingWalls.position.set(wingX, 0.36, 0);
      wingWalls.castShadow = true;
      wingWalls.receiveShadow = true;
      houseGroup.add(wingWalls);

      const wFrame1 = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.018), frameMat);
      wFrame1.position.set(wingX, 0.24, 0.282);
      const wGlass1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.022), windowGlowMat);
      wGlass1.position.set(wingX, 0.24, 0.284);
      const planter = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.04), planterMat);
      planter.position.set(wingX, 0.165, 0.30);
      const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.015, 0), new THREE.MeshStandardMaterial({ color: isLeft ? 0xf43f5e : 0x38bdf8 }));
      fl.position.set(wingX, 0.19, 0.30);
      houseGroup.add(wFrame1, wGlass1, planter, fl);

      const wFrame2 = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.018), frameMat);
      wFrame2.position.set(wingX, 0.48, 0.282);
      const wGlass2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.022), windowGlowMat);
      wGlass2.position.set(wingX, 0.48, 0.284);
      houseGroup.add(wFrame2, wGlass2);

      const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.12, 0.12), windowGlowMat);
      sideWin.position.set(isLeft ? wingX - 0.122 : wingX + 0.122, 0.36, 0);
      houseGroup.add(sideWin);

      const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.036, 0.60), roofMat);
      wingRoof.position.set(wingX, 0.71, 0);
      wingRoof.rotation.z = isLeft ? Math.PI * 0.10 : -Math.PI * 0.10;
      wingRoof.castShadow = true;
      houseGroup.add(wingRoof);

      const chimX = isLeft ? wingX - 0.04 : wingX + 0.04;
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), chimneyMat);
      chim.position.set(chimX, 0.84, -0.12);
      chim.castShadow = true;
      const chimCrn = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.10), ridgeMat);
      chimCrn.position.set(chimX, 0.99, -0.12);

      const smk1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.038, 0), smokeMat);
      smk1.position.set(chimX, 1.05, -0.12);
      smk1.userData = { isSmoke: true, baseY: 1.05, phase: isLeft ? 0.3 : 1.8 };
      animatedChimneySmokes.push(smk1);
      houseGroup.add(chim, chimCrn, smk1);
    });
  }

  return houseGroup;
}

/**
 * Creates a modern architectural skyscraper landmark with 5 tiers.
 * @param {number|string} ownerColor
 * @returns {THREE.Group}
 */
export function createDetailedSkyscraperMesh(ownerColor) {
  const towerGroup = new THREE.Group();

  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.3 });
  const lobbyGlassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.75, transparent: true, opacity: 0.90 });
  const pylonMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.5 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.18, metalness: 0.85 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.85 });
  const ownerAccentMat = new THREE.MeshStandardMaterial({ color: ownerColor, emissive: ownerColor, emissiveIntensity: 0.75, roughness: 0.25, metalness: 0.3 });
  // Dynamic owner themed tower facade
  const glassTowerMat = new THREE.MeshStandardMaterial({ color: ownerColor, roughness: 0.20, metalness: 0.55, flatShading: true });
  const midTowerMat = new THREE.MeshStandardMaterial({ color: ownerColor, roughness: 0.25, metalness: 0.45, flatShading: true });
  const warmWindowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 0.75, roughness: 0.2 });
  const coolWindowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: ownerColor, emissiveIntensity: 0.65, roughness: 0.2 });
  const helipadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.15 });
  const whiteMarkMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xef4444, emissiveIntensity: 1.6, roughness: 0.1 });

  // TIER 1: Grand Lobby & Plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.12, 0.96), plinthMat);
  plinth.position.y = 0.06;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  towerGroup.add(plinth);

  const lobbyGlass = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.42, 0.84), lobbyGlassMat);
  lobbyGlass.position.y = 0.33;
  lobbyGlass.castShadow = true;
  lobbyGlass.receiveShadow = true;
  towerGroup.add(lobbyGlass);

  [[-0.41, -0.41], [0.41, -0.41], [-0.41, 0.41], [0.41, 0.41]].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.08), pylonMat);
    col.position.set(cx, 0.33, cz);
    col.castShadow = true;
    towerGroup.add(col);
  });

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.20), chromeMat);
  canopy.position.set(0, 0.28, 0.48);
  canopy.castShadow = true;
  const revDoor = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 10), brassMat);
  revDoor.position.set(0, 0.21, 0.42);
  towerGroup.add(canopy, revDoor);

  const lobbyBand = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.045, 0.88), ownerAccentMat);
  lobbyBand.position.y = 0.54;
  towerGroup.add(lobbyBand);

  // TIER 2: Main High-Rise Shaft
  const mainShaft = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.82, 0.74), glassTowerMat);
  mainShaft.position.y = 0.97;
  mainShaft.castShadow = true;
  mainShaft.receiveShadow = true;
  towerGroup.add(mainShaft);

  [[-0.37, -0.37], [0.37, -0.37], [-0.37, 0.37], [0.37, 0.37]].forEach(([cx, cz]) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.84, 0.05), chromeMat);
    fin.position.set(cx, 0.97, cz);
    fin.castShadow = true;
    towerGroup.add(fin);
  });

  [0.72, 0.97, 1.22].forEach(yPos => {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.03, 0.76), chromeMat);
    band.position.y = yPos;
    towerGroup.add(band);
  });

  const winPositions = [
    { x: -0.18, y: 0.84, z: 0.373, warm: true },
    { x: 0.18, y: 0.84, z: 0.373, warm: false },
    { x: 0, y: 1.09, z: 0.373, warm: true },
    { x: -0.18, y: 1.34, z: 0.373, warm: false },
    { x: 0.18, y: 1.34, z: 0.373, warm: true },
    { x: 0.373, y: 0.84, z: 0, warm: true, side: true },
    { x: 0.373, y: 1.09, z: -0.18, warm: false, side: true },
    { x: 0.373, y: 1.34, z: 0.18, warm: true, side: true },
    { x: -0.373, y: 0.84, z: 0, warm: false, side: true },
    { x: -0.373, y: 1.09, z: 0.18, warm: true, side: true },
  ];
  winPositions.forEach(wp => {
    const wGeo = wp.side ? new THREE.BoxGeometry(0.02, 0.14, 0.22) : new THREE.BoxGeometry(0.22, 0.14, 0.02);
    const win = new THREE.Mesh(wGeo, wp.warm ? warmWindowMat : coolWindowMat);
    win.position.set(wp.x, wp.y, wp.z);
    towerGroup.add(win);
  });

  // TIER 3: Setback Terrace & Mid Tower
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.05, 0.76), plinthMat);
  terrace.position.y = 1.40;
  terrace.castShadow = true;
  towerGroup.add(terrace);

  const midShaft = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.68, 0.56), midTowerMat);
  midShaft.position.y = 1.76;
  midShaft.castShadow = true;
  midShaft.receiveShadow = true;
  towerGroup.add(midShaft);

  [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].forEach(([cx, cz]) => {
    const ledRibbon = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.70, 0.035), ownerAccentMat);
    ledRibbon.position.set(cx, 1.76, cz);
    towerGroup.add(ledRibbon);
  });

  const midWins = [
    { x: 0, y: 1.62, z: 0.283, warm: true },
    { x: 0, y: 1.88, z: 0.283, warm: false },
    { x: 0.283, y: 1.75, z: 0, warm: true, side: true },
    { x: -0.283, y: 1.75, z: 0, warm: true, side: true },
  ];
  midWins.forEach(wp => {
    const wGeo = wp.side ? new THREE.BoxGeometry(0.02, 0.13, 0.18) : new THREE.BoxGeometry(0.18, 0.13, 0.02);
    const win = new THREE.Mesh(wGeo, wp.warm ? warmWindowMat : coolWindowMat);
    win.position.set(wp.x, wp.y, wp.z);
    towerGroup.add(win);
  });

  // TIER 4: Penthouse Pavilion & Helipad
  const midTerrace = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.04, 0.58), plinthMat);
  midTerrace.position.y = 2.12;
  towerGroup.add(midTerrace);

  const penthouse = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.42), lobbyGlassMat);
  penthouse.position.y = 2.30;
  penthouse.castShadow = true;
  towerGroup.add(penthouse);

  const penthouseCornice = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.46), chromeMat);
  penthouseCornice.position.y = 2.47;
  towerGroup.add(penthouseCornice);

  const helipad = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 16), helipadMat);
  helipad.position.y = 2.50;
  helipad.castShadow = true;
  towerGroup.add(helipad);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 24), whiteMarkMat);
  ring.position.y = 2.52;
  ring.rotation.x = Math.PI / 2;
  towerGroup.add(ring);

  const hBarL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.005, 0.16), brassMat);
  hBarL.position.set(-0.06, 2.52, 0);
  const hBarR = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.005, 0.16), brassMat);
  hBarR.position.set(0.06, 2.52, 0);
  const hBarC = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.005, 0.025), brassMat);
  hBarC.position.set(0, 2.52, 0);
  towerGroup.add(hBarL, hBarR, hBarC);

  [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([lx, lz], idx) => {
    const pLight = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? 0x22c55e : 0xfacc15 }));
    pLight.position.set(lx, 2.53, lz);
    towerGroup.add(pLight);
  });

  // TIER 5: Spire Needle & Aviation Beacon
  const spireBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.08, 8), chromeMat);
  spireBase.position.y = 2.56;
  const spireNeedle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.032, 0.64, 8), chromeMat);
  spireNeedle.position.y = 2.92;
  spireNeedle.castShadow = true;

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), beaconMat);
  beacon.position.y = 3.26;
  beacon.userData = { isBeacon: true, phase: Math.random() * Math.PI * 2 };
  animatedSkyscraperBeacons.push(beacon);

  towerGroup.add(spireBase, spireNeedle, beacon);

  return towerGroup;
}

/**
 * Updates dynamic flutter for cloth flags, bobbing chimney smoke, and pulsing skyscraper beacons.
 * @param {number} now - performance.now()
 * @param {number} t - time in seconds
 */
export function updateBuildingAnimations(now, t) {
  // Building elastic popup animation with juicy squash & stretch
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
      // Elastic spring overshoot formula
      const elastic = 1 - Math.pow(2, -9 * p) * Math.cos((p * 10 - 0.75) * ((2 * Math.PI) / 3));
      // Subtle dynamic squash & stretch: stretch vertically as it launches, then settle
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
