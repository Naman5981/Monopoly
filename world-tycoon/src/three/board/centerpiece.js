/**
 * three/board/centerpiece.js
 * Builds the interactive 3D centerpiece diorama at the center of the World Tycoon board (x: 0, z: 0).
 * Features 4 switchable architectural concepts:
 *   1. Armillary Celestial Globe (Default/Recommended)
 *   2. Grand Cascading Park Fountain
 *   3. Festival Treasury Vault & Gold/Cash Stacks
 *   4. Velvet Dice Stadium
 */

import * as THREE from 'three';

let activeCenterpieceGroup = null;
let currentConceptId = 2; // Concept 2: Grand Cascading Central Park Fountain (Default)
const conceptGroups = { 1: null, 2: null, 3: null, 4: null };

// Animated sub-elements
let armillaryRings = null;
let armillaryGlobe = null;
let armillaryCompass = null;
let armillaryStars = [];
let fountainWater = null;
let vaultWheel = null;
let vaultGold = null;
let diceArenaGroup = null;

/**
 * Builds Concept 1: Armillary Celestial Globe
 * Rotating brass celestial rings on a stepped Carrara marble plinth with an inlaid golden compass rose.
 */
function createArmillaryGlobeConcept() {
  const g = new THREE.Group();
  g.name = 'centerpiece-concept-1-globe';

  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.22,
    metalness: 0.08
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.24,
    metalness: 0.88
  });
  const darkGoldMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.3,
    metalness: 0.85
  });

  // 1. Stepped Carrara Marble Plinth (Octagonal)
  const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.32, 0.18, 8), plinthMat);
  basePlinth.position.y = 0.09;
  basePlinth.receiveShadow = true;
  basePlinth.castShadow = true;

  const baseGoldRim = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.04, 8), goldMat);
  baseGoldRim.position.y = 0.18;

  const topPlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.02, 0.14, 8), plinthMat);
  topPlinth.position.y = 0.27;
  topPlinth.receiveShadow = true;
  topPlinth.castShadow = true;

  const topGoldRim = new THREE.Mesh(new THREE.CylinderGeometry(0.94, 0.94, 0.03, 8), goldMat);
  topGoldRim.position.y = 0.35;

  g.add(basePlinth, baseGoldRim, topPlinth, topGoldRim);

  // 2. Inlaid Gold Compass Rose (on top of upper plinth)
  armillaryCompass = new THREE.Group();
  armillaryCompass.position.y = 0.36;
  for (let i = 0; i < 4; i++) {
    const starPoint = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.6, 4), goldMat);
    starPoint.rotation.x = Math.PI / 2;
    starPoint.rotation.z = (i * Math.PI) / 2;
    starPoint.position.set(
      Math.cos((i * Math.PI) / 2) * 0.32,
      0.01,
      Math.sin((i * Math.PI) / 2) * 0.32
    );
    armillaryCompass.add(starPoint);

    // Minor diagonal star points
    const minorPoint = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.38, 4), darkGoldMat);
    minorPoint.rotation.x = Math.PI / 2;
    minorPoint.rotation.z = (i * Math.PI) / 2 + Math.PI / 4;
    minorPoint.position.set(
      Math.cos((i * Math.PI) / 2 + Math.PI / 4) * 0.22,
      0.01,
      Math.sin((i * Math.PI) / 2 + Math.PI / 4) * 0.22
    );
    armillaryCompass.add(minorPoint);
  }
  g.add(armillaryCompass);

  // 3. Central Fluted Brass Pedestal Pillar
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.58, 12), goldMat);
  pillar.position.y = 0.65;
  pillar.castShadow = true;
  pillar.receiveShadow = true;

  const pillarCapital = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.1, 12), goldMat);
  pillarCapital.position.y = 0.98;
  g.add(pillar, pillarCapital);

  // 4. Rotating Armillary Gyroscope & Celestial Globe
  armillaryGlobe = new THREE.Group();
  armillaryGlobe.position.y = 1.48;

  // Brass Orbit Rings
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.045, 16, 48), goldMat);
  r1.castShadow = true;

  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 16, 48), goldMat);
  r2.rotation.x = Math.PI / 2;
  r2.castShadow = true;

  const r3 = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.04, 16, 48), goldMat);
  r3.rotation.y = Math.PI / 4;
  r3.castShadow = true;

  armillaryRings = { r1, r2, r3 };
  armillaryGlobe.add(r1, r2, r3);

  // Central Celestial Sapphire Sphere
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.16,
    metalness: 0.32,
    emissive: 0x0369a1,
    emissiveIntensity: 0.18
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24), sphereMat);
  sphere.castShadow = true;

  // Gold Meridian & Equator Bands on Sphere
  const meridianBand = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.01, 8, 32), goldMat);
  const equatorBand = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.01, 8, 32), goldMat);
  equatorBand.rotation.x = Math.PI / 2;
  sphere.add(meridianBand, equatorBand);
  armillaryGlobe.add(sphere);

  // Orbiting Golden Sparkle Stars
  armillaryStars = [];
  for (let s = 0; s < 4; s++) {
    const starMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), goldMat);
    const starAngle = (s * Math.PI) / 2;
    starMesh.userData = { angle: starAngle, dist: 1.1, speed: 0.8 + s * 0.2, yOffset: (s % 2 === 0 ? 0.15 : -0.15) };
    armillaryGlobe.add(starMesh);
    armillaryStars.push(starMesh);
  }

  g.add(armillaryGlobe);
  return g;
}

/**
 * Builds Concept 2: Grand Cascading Central Park Fountain
 * Symmetrical multi-tiered Carrara marble fountain with cascading turquoise water,
 * concentric ripple foam rings, and ambient water dome pulse.
 */
function createParkFountainConcept() {
  const g = new THREE.Group();
  g.name = 'centerpiece-concept-2-fountain';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.22,
    metalness: 0.05
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.05,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88
  });
  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.7
  });

  // 1. Foundation: Stepped Carrara Marble Octagonal Plinth
  const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.16, 8), stoneMat);
  basePlinth.position.y = 0.08;
  basePlinth.receiveShadow = true;
  basePlinth.castShadow = true;

  const baseRim = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.04, 8), darkStoneMat);
  baseRim.position.y = 0.16;

  // 2. Large Basin (Tier 1)
  const basin1 = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.28, 24), stoneMat);
  basin1.position.y = 0.3;
  basin1.receiveShadow = true;
  basin1.castShadow = true;

  const water1 = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.22, 24), waterMat);
  water1.position.y = 0.35;

  const rippleRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.015, 6, 24), foamMat);
  rippleRing1.rotation.x = Math.PI / 2;
  rippleRing1.position.y = 0.46;

  // 3. Central Fluted Pillar
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.55, 16), stoneMat);
  col.position.y = 0.65;
  col.castShadow = true;

  // 4. Small Elevated Basin (Tier 2)
  const basin2 = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.24, 20), stoneMat);
  basin2.position.y = 0.98;
  basin2.receiveShadow = true;
  basin2.castShadow = true;

  const water2 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 20), waterMat);
  water2.position.y = 1.04;

  const rippleRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 6, 20), foamMat);
  rippleRing2.rotation.x = Math.PI / 2;
  rippleRing2.position.y = 1.13;

  // 5. Spout & Water Dome
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.32, 12), stoneMat);
  spout.position.y = 1.22;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), waterMat);
  dome.position.y = 1.45;

  g.add(basePlinth, baseRim, basin1, water1, rippleRing1, col, basin2, water2, rippleRing2, spout, dome);
  fountainWater = { water1, water2, dome, rippleRing1, rippleRing2 };
  return g;
}

/**
 * Builds Concept 3: Festival Treasury Vault & Cash/Gold Stacks
 */
function createTreasuryVaultConcept() {
  const g = new THREE.Group();
  g.name = 'centerpiece-concept-3-vault';

  const vaultSteel = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.5 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.22, metalness: 0.9 });
  const cashMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });

  // Octagonal Vault Plinth
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.8, 0.26, 8), vaultSteel);
  plinth.position.y = 0.13;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.68, 1.68, 0.05, 8), goldMat);
  rim.position.y = 0.28;
  g.add(plinth, rim);

  // Central Vault Door Wheel
  vaultWheel = new THREE.Group();
  vaultWheel.position.set(0, 0.95, 0);

  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.22, 24), vaultSteel);
  door.rotation.x = Math.PI / 2;
  vaultWheel.add(door);

  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 12, 32), goldMat);
  vaultWheel.add(wheelRim);

  // Gear Teeth
  for (let i = 0; i < 8; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.12), goldMat);
    tooth.position.set(Math.cos((i * Math.PI) / 4) * 0.86, Math.sin((i * Math.PI) / 4) * 0.86, 0);
    tooth.rotation.z = (i * Math.PI) / 4;
    vaultWheel.add(tooth);
  }
  g.add(vaultWheel);

  // 3D Stacks of Gold Bullion (Left)
  vaultGold = new THREE.Group();
  vaultGold.position.set(-0.85, 0.32, 0.45);
  const barGeo = new THREE.BoxGeometry(0.45, 0.12, 0.22);
  [
    { x: 0, y: 0.06, z: 0, r: 0 },
    { x: 0.04, y: 0.18, z: 0, r: 0.1 },
    { x: -0.02, y: 0.30, z: 0, r: -0.05 }
  ].forEach(b => {
    const bar = new THREE.Mesh(barGeo, goldMat);
    bar.position.set(b.x, b.y, b.z);
    bar.rotation.y = b.r;
    vaultGold.add(bar);
  });
  g.add(vaultGold);

  // 3D Stacks of Cash (Right)
  const cashStack = new THREE.Group();
  cashStack.position.set(0.85, 0.32, -0.35);
  const cashGeo = new THREE.BoxGeometry(0.5, 0.14, 0.28);
  for (let c = 0; c < 4; c++) {
    const bundle = new THREE.Mesh(cashGeo, cashMat);
    bundle.position.set((c % 2) * 0.04, c * 0.14 + 0.07, 0);
    bundle.rotation.y = c * 0.12;
    cashStack.add(bundle);
  }
  g.add(cashStack);

  return g;
}

/**
 * Builds Concept 4: Velvet Dice Stadium
 */
function createDiceStadiumConcept() {
  const g = new THREE.Group();
  g.name = 'centerpiece-concept-4-dice-arena';

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x4e2410, roughness: 0.3, metalness: 0.08 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 });
  const velvetMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.85 });

  // Outer Mahogany Lip
  const outerLip = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.95, 0.36, 8), woodMat);
  outerLip.position.y = 0.18;
  const goldBevel = new THREE.Mesh(new THREE.CylinderGeometry(1.86, 1.86, 0.06, 8), goldMat);
  goldBevel.position.y = 0.36;
  g.add(outerLip, goldBevel);

  // Velvet Interior Felt
  const velvetFelt = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.22, 24), velvetMat);
  velvetFelt.position.y = 0.15;
  g.add(velvetFelt);

  // Central Embossed Ring
  const crestRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.03, 8, 32), goldMat);
  crestRing.rotation.x = Math.PI / 2;
  crestRing.position.y = 0.27;
  g.add(crestRing);

  // Pair of 3D Dice Resting in Arena
  diceArenaGroup = new THREE.Group();
  const dieMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18 });
  const die1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), dieMat);
  die1.position.set(-0.35, 0.44, 0.15);
  die1.rotation.set(0.3, 0.5, 0.1);

  const die2 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), dieMat);
  die2.position.set(0.35, 0.44, -0.15);
  die2.rotation.set(-0.4, 0.7, -0.2);

  diceArenaGroup.add(die1, die2);
  g.add(diceArenaGroup);

  return g;
}

/**
 * Builds and mounts all centerpiece concepts into the diorama board at (x: 0, z: 0).
 * Defaults to Concept 1 (Armillary Celestial Globe).
 * @param {THREE.Group} parentGroup - The worldCenterGroup or boardGroup.
 */
export function buildCenterpiece3D(parentGroup) {
  if (!parentGroup) return null;

  activeCenterpieceGroup = new THREE.Group();
  activeCenterpieceGroup.name = 'world-board-centerpiece';
  activeCenterpieceGroup.position.set(0, 0.28, 0);

  // Build all 4 concepts
  conceptGroups[1] = createArmillaryGlobeConcept();
  conceptGroups[2] = createParkFountainConcept();
  conceptGroups[3] = createTreasuryVaultConcept();
  conceptGroups[4] = createDiceStadiumConcept();

  // Add all to container
  Object.values(conceptGroups).forEach(g => {
    if (g) activeCenterpieceGroup.add(g);
  });

  parentGroup.add(activeCenterpieceGroup);

  // Activate default
  setCenterpieceConcept(currentConceptId);

  // Expose global switcher for browser console / UI inspection
  if (typeof window !== 'undefined') {
    window.setCenterpieceConcept = setCenterpieceConcept;
    window.getCenterpieceConcept = () => currentConceptId;
  }

  console.info('🌐 [Board Centerpiece] Built 4 architectural concepts at board center (0, 0). Active: Concept ' + currentConceptId);
  return activeCenterpieceGroup;
}

/**
 * Switches the active centerpiece concept on the board.
 * @param {number} conceptId - 1 | 2 | 3 | 4
 */
export function setCenterpieceConcept(conceptId = 1) {
  const id = Number(conceptId) || 1;
  currentConceptId = Math.max(1, Math.min(4, id));

  for (let c = 1; c <= 4; c++) {
    if (conceptGroups[c]) {
      conceptGroups[c].visible = (c === currentConceptId);
    }
  }

  console.info(`🌐 [Board Centerpiece] Switched to Concept ${currentConceptId}`);
}

/**
 * Smooth per-frame animation tick (60 FPS) for the active centerpiece.
 * @param {number} t - Total elapsed time in seconds.
 * @param {number} dt - Delta time in seconds.
 */
export function updateCenterpieceAnimation(t, dt) {
  if (!activeCenterpieceGroup || !activeCenterpieceGroup.visible) return;

  // Concept 1: Armillary Globe gyroscopic ring rotations
  if (currentConceptId === 1 && armillaryGlobe) {
    if (armillaryRings) {
      armillaryRings.r1.rotation.y += 0.012;
      armillaryRings.r2.rotation.x += 0.016;
      armillaryRings.r3.rotation.z += 0.014;
    }
    if (armillaryCompass) {
      armillaryCompass.rotation.y -= 0.002;
    }

    // Orbiting sparkle stars
    armillaryStars.forEach(s => {
      const u = s.userData;
      u.angle += 0.02 * u.speed;
      s.position.x = Math.cos(u.angle) * u.dist;
      s.position.z = Math.sin(u.angle) * u.dist;
      s.position.y = u.yOffset + Math.sin(t * 2 + u.angle) * 0.12;
      s.rotation.y += 0.04;
    });

    // Subtle breathing hover
    armillaryGlobe.position.y = 1.62 + Math.sin(t * 1.8) * 0.04;
  }

  // Concept 2: Fountain water pulses & ripples
  if (currentConceptId === 2 && fountainWater) {
    fountainWater.dome.scale.y = 1 + Math.sin(t * 4) * 0.14;
    fountainWater.water1.rotation.y += 0.004;
    fountainWater.water2.rotation.y -= 0.006;
    if (fountainWater.rippleRing1) {
      const s1 = 1 + Math.sin(t * 3) * 0.1;
      fountainWater.rippleRing1.scale.set(s1, s1, 1);
    }
    if (fountainWater.rippleRing2) {
      const s2 = 1 + Math.cos(t * 3.5) * 0.12;
      fountainWater.rippleRing2.scale.set(s2, s2, 1);
    }
  }

  // Concept 3: Vault wheel and gold shine
  if (currentConceptId === 3 && vaultWheel) {
    vaultWheel.rotation.z += 0.006;
    if (vaultGold) {
      vaultGold.position.y = 0.32 + Math.sin(t * 2) * 0.02;
    }
  }

  // Concept 4: Dice slow wobble
  if (currentConceptId === 4 && diceArenaGroup) {
    diceArenaGroup.rotation.y += 0.005;
  }
}
