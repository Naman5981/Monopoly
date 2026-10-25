/**
 * three/board/rajasthan/nature.js
 * Nature and water features: Panna Meena Stepwell Kund, Date Palms, and the Oasis Grove.
 */

import * as THREE from 'three';
import { RAJASTHAN_PALETTE } from './palette.js';
import { createRajasthanChhatri3D } from './architecture.js';

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
