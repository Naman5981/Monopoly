/**
 * three/assets/avatars.js
 * Executive 3D Tycoon Character Generator with Clean Code architecture:
 * Stylized figurines with tailored double-breasted suits, peak lapels,
 * luxury eyewear (sunglasses, monocle, visor), and architecturally sculpted executive headwear.
 * Refactored under Clean Code (Uncle Bob): small single-responsibility builder functions.
 */

import * as THREE from 'three';
import { PLAYER_THEMES } from '../../game/data.js';
import { matchSettings } from '../../game/state.js';
import { currentBulbMode, getSoftBloomTexture } from '../core/lighting.js';

// Reusable standard geometries
const avatarGeoms = {
  torso: new THREE.CylinderGeometry(0.27, 0.33, 0.56, 18),
  lapel: new THREE.BoxGeometry(0.09, 0.33, 0.045),
  shirt: new THREE.BoxGeometry(0.12, 0.26, 0.04),
  collar: new THREE.BoxGeometry(0.075, 0.05, 0.035),
  tie: new THREE.BoxGeometry(0.06, 0.27, 0.04),
  tieBar: new THREE.BoxGeometry(0.07, 0.02, 0.03),
  button: new THREE.CylinderGeometry(0.018, 0.018, 0.025, 12),
  cufflink: new THREE.CylinderGeometry(0.02, 0.02, 0.025, 10),
  head: new THREE.SphereGeometry(0.35, 24, 20),
  nose: new THREE.ConeGeometry(0.038, 0.09, 8),
  ear: new THREE.SphereGeometry(0.072, 12, 10),
  sunglassRim: new THREE.BoxGeometry(0.15, 0.095, 0.03),
  sunglassLens: new THREE.BoxGeometry(0.13, 0.078, 0.035),
  sunglassBridge: new THREE.BoxGeometry(0.09, 0.02, 0.025),
  sunglassStem: new THREE.BoxGeometry(0.02, 0.02, 0.32)
};

Object.values(avatarGeoms).forEach(g => { g.userData = { isShared: true }; });

function buildAviationHat(group, hatMat, goldMat, darkMat) {
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.365, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.60), hatMat);
  cap.position.y = 0.04;
  group.add(cap);

  [-0.34, 0.34].forEach(fx => {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.18), hatMat);
    flap.position.set(fx, -0.02, 0.02);
    flap.rotation.z = fx < 0 ? 0.12 : -0.12;
    const buckle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), goldMat);
    buckle.rotation.z = Math.PI / 2;
    buckle.position.set(fx < 0 ? fx - 0.04 : fx + 0.04, -0.08, 0.02);
    group.add(flap, buckle);
  });

  const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.375, 0.375, 0.05, 24), darkMat);
  strap.position.y = 0.20;
  group.add(strap);

  const lensMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.85, roughness: 0.12 });
  [-0.13, 0.13].forEach(gx => {
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.06, 16), goldMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(gx, 0.21, 0.33);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.07, 16), lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(gx, 0.21, 0.335);
    group.add(rim, lens);
  });
}

function buildTopHat(group, darkMat, goldMat, whiteMat) {
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 28), darkMat);
  brim.position.y = 0.25;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.29, 0.44, 28), darkMat);
  crown.position.y = 0.47;
  const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.295, 0.07, 28), goldMat);
  ribbon.position.y = 0.30;
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), whiteMat);
  buckle.position.set(0, 0.30, 0.31);
  group.add(brim, crown, ribbon, buckle);
}

function buildBowlerHat(group, hatMat, darkMat) {
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.52, 0.045, 24), hatMat);
  brim.position.y = 0.22;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hatMat);
  dome.position.y = 0.22;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 24), darkMat);
  band.position.y = 0.24;
  group.add(brim, dome, band);
}

function buildCyberVisor(group, goldMat) {
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.65,
    roughness: 0.10,
    metalness: 0.90,
    transparent: true,
    opacity: 0.88
  });
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.11, 0.16), visorMat);
  visor.position.set(0, 0.07, 0.30);
  const hudLine = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.015, 0.17), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  hudLine.position.set(0, 0.07, 0.31);
  const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 10, 24, Math.PI), goldMat);
  crownBand.position.set(0, 0.06, 0);
  group.add(visor, hudLine, crownBand);
}

function buildCrown(group, goldMat) {
  const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.33, 0.11, 24), goldMat);
  crownBase.position.y = 0.27;
  const velvetMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.70 });
  const velvetDome = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), velvetMat);
  velvetDome.position.y = 0.27;
  group.add(crownBase, velvetDome);

  const rubyMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.15, metalness: 0.85, emissive: 0x9f1239, emissiveIntensity: 0.4 });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.20, 4), goldMat);
    spike.position.set(Math.sin(angle) * 0.33, 0.40, Math.cos(angle) * 0.33);
    const ruby = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), rubyMat);
    ruby.position.set(Math.sin(angle) * 0.35, 0.31, Math.cos(angle) * 0.35);
    group.add(spike, ruby);
  }
}

function buildFedora(group) {
  const fedoraMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.48 });
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.50, 0.04, 24), fedoraMat);
  brim.position.y = 0.24;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.30, 24), fedoraMat);
  crown.position.y = 0.39;
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.85, emissive: 0x0284c7, emissiveIntensity: 0.3 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.325, 0.325, 0.065, 24), bandMat);
  band.position.y = 0.28;
  group.add(brim, crown, band);
}

function buildBicorn(group, goldMat) {
  const bicornMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.38 });
  const baseCap = new THREE.Mesh(new THREE.SphereGeometry(0.33, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), bicornMat);
  baseCap.position.y = 0.20;

  const wingGeo = new THREE.CylinderGeometry(0.38, 0.46, 0.26, 24, 1, false, 0, Math.PI);
  const frontWing = new THREE.Mesh(wingGeo, bicornMat);
  frontWing.position.set(0, 0.33, 0.04);
  frontWing.rotation.x = 0.18;
  frontWing.scale.set(1.15, 1.0, 0.55);

  const backWing = new THREE.Mesh(wingGeo, bicornMat);
  backWing.position.set(0, 0.33, -0.04);
  backWing.rotation.x = -0.18;
  backWing.scale.set(1.15, 1.0, 0.55);

  const goldTrim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 8, 24, Math.PI), goldMat);
  goldTrim.position.set(0, 0.44, 0);
  goldTrim.rotation.x = Math.PI / 2;

  const cockadeMat = new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.5 });
  const cockade = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 16), cockadeMat);
  cockade.rotation.x = Math.PI / 2;
  cockade.position.set(-0.16, 0.34, 0.18);
  const cockadeButton = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), goldMat);
  cockadeButton.position.set(-0.16, 0.34, 0.20);

  group.add(baseCap, frontWing, backWing, goldTrim, cockade, cockadeButton);
}

function buildEyewear(eyesGroup, effectiveHat, idx, darkMat, glassMat, goldMat, whiteMat) {
  const wantsSunglasses = (effectiveHat === 0 || effectiveHat === 2 || effectiveHat === 5 || idx % 3 === 0);
  const wantsMonocle = (effectiveHat === 1);
  const wantsCyberVisor = (effectiveHat === 3);

  if (wantsSunglasses && !wantsCyberVisor) {
    [-0.12, 0.12].forEach(lx => {
      const rim = new THREE.Mesh(avatarGeoms.sunglassRim, darkMat);
      rim.position.set(lx, 0.06, 0.345);
      const lens = new THREE.Mesh(avatarGeoms.sunglassLens, glassMat);
      lens.position.set(lx, 0.06, 0.348);
      eyesGroup.add(rim, lens);
    });
    const bridge = new THREE.Mesh(avatarGeoms.sunglassBridge, goldMat);
    bridge.position.set(0, 0.085, 0.35);
    eyesGroup.add(bridge);
    [-0.24, 0.24].forEach(tx => {
      const stem = new THREE.Mesh(avatarGeoms.sunglassStem, darkMat);
      stem.position.set(tx, 0.06, 0.19);
      eyesGroup.add(stem);
    });
  } else if (wantsMonocle) {
    const monocleRim = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.016, 12, 24), goldMat);
    monocleRim.position.set(0.13, 0.06, 0.345);
    const monocleGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.015, 18), new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.45
    }));
    monocleGlass.rotation.x = Math.PI / 2;
    monocleGlass.position.set(0.13, 0.06, 0.345);
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.01, 8, 16, Math.PI * 0.4), goldMat);
    chain.position.set(0.24, -0.04, 0.28);
    chain.rotation.z = Math.PI * 0.4;
    eyesGroup.add(monocleRim, monocleGlass, chain);

    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), whiteMat);
    sclera.scale.set(1.0, 0.9, 0.6);
    sclera.position.set(-0.13, 0.06, 0.325);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), darkMat);
    pupil.position.set(-0.13, 0.06, 0.355);
    eyesGroup.add(sclera, pupil);
  } else {
    [-0.12, 0.12].forEach(ex => {
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), darkMat);
      pupil.position.set(ex, 0.06, 0.34);
      eyesGroup.add(pupil);
    });
  }
}

/**
 * Creates an executive procedural 3D tycoon figurine mesh.
 * @param {number} idx - Player index
 * @param {boolean} isPortrait - Whether generating for miniature HUD portrait
 * @param {number|null} customHatStyle
 * @param {string|null} customPedestal
 * @param {number|null} customCharColor
 * @returns {THREE.Group}
 */
export function createDetailed3DAvatarMesh(idx, isPortrait = false, customHatStyle = null, customPedestal = null, customCharColor = null) {
  const customP = matchSettings?.customPlayers?.[idx] || null;
  const theme = PLAYER_THEMES[idx % PLAYER_THEMES.length];
  const charColor = (customCharColor !== null && customCharColor !== undefined)
    ? customCharColor
    : (customP?.charColor ?? theme.charColor);
  const hatColor = customP?.hatColor ?? theme.hatColor;

  const root = new THREE.Group();
  const skinTones = [0xf1c27d, 0xdfa166, 0xb87b40, 0xf5d6b4];
  const skinColor = skinTones[idx % skinTones.length];

  const suitMat = new THREE.MeshStandardMaterial({ color: charColor, roughness: 0.52, metalness: 0.12 });
  const lapelMat = new THREE.MeshStandardMaterial({ color: charColor, roughness: 0.40, metalness: 0.20 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.58, metalness: 0.02 });
  const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.38, metalness: 0.22 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.25, metalness: 0.35 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.30, metalness: 0.05 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.20, metalness: 0.88 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.10, metalness: 0.90, transparent: true, opacity: 0.92 });

  // 1. Pedestal Base
  if (!isPortrait) {
    const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.49, 0.12, 24), darkMat);
    pedBase.position.y = 0.06;
    pedBase.castShadow = true;
    root.add(pedBase);

    const pedRing = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.43, 0.04, 24), goldMat);
    pedRing.position.y = 0.13;
    root.add(pedRing);
  }

  // 2. Legs
  const legGroupL = new THREE.Group();
  const legGroupR = new THREE.Group();
  if (!isPortrait) {
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.088, 0.34, 12), darkMat);
    legL.position.y = -0.15;
    legGroupL.add(legL);
    legGroupL.position.set(-0.13, 0.48, 0);

    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.088, 0.34, 12), darkMat);
    legR.position.y = -0.15;
    legGroupR.add(legR);
    legGroupR.position.set(0.13, 0.48, 0);
    root.add(legGroupL, legGroupR);
  }

  // 3. Body & Suit
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = isPortrait ? 0 : 0.44;
  root.add(bodyGroup);

  const torso = new THREE.Mesh(avatarGeoms.torso, suitMat);
  torso.scale.set(1.06, 1.0, 0.88);
  torso.position.y = 0.28;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const lapelL = new THREE.Mesh(avatarGeoms.lapel, lapelMat);
  lapelL.position.set(-0.12, 0.34, 0.28);
  lapelL.rotation.set(-0.08, 0.08, -0.22);
  const lapelR = new THREE.Mesh(avatarGeoms.lapel, lapelMat);
  lapelR.position.set(0.12, 0.34, 0.28);
  lapelR.rotation.set(-0.08, -0.08, 0.22);
  bodyGroup.add(lapelL, lapelR);

  const shirt = new THREE.Mesh(avatarGeoms.shirt, whiteMat);
  shirt.position.set(0, 0.38, 0.265);
  const tie = new THREE.Mesh(avatarGeoms.tie, goldMat);
  tie.position.set(0, 0.32, 0.295);
  bodyGroup.add(shirt, tie);

  // 4. Arms
  const armGroupL = new THREE.Group();
  const armGroupR = new THREE.Group();
  const armMat = suitMat;
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.42, 12), armMat);
  armL.position.y = -0.18;
  armGroupL.add(armL);
  armGroupL.position.set(-0.35, 0.48, 0);

  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.42, 12), armMat);
  armR.position.y = -0.18;
  armGroupR.add(armR);
  armGroupR.position.set(0.35, 0.48, 0);
  bodyGroup.add(armGroupL, armGroupR);

  // 5. Head
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.70;
  bodyGroup.add(headGroup);

  const head = new THREE.Mesh(avatarGeoms.head, skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // 6. Eyewear
  const eyesGroup = new THREE.Group();
  headGroup.add(eyesGroup);
  const effectiveHat = (customHatStyle !== null && customHatStyle !== undefined)
    ? customHatStyle
    : (typeof customP?.hatStyle === 'number' ? customP.hatStyle : (idx % 7));
  buildEyewear(eyesGroup, effectiveHat, idx, darkMat, glassMat, goldMat, whiteMat);

  // 7. Hats
  const hatGroup = new THREE.Group();
  headGroup.add(hatGroup);
  switch (effectiveHat) {
    case 0: buildAviationHat(hatGroup, hatMat, goldMat, darkMat); break;
    case 1: buildTopHat(hatGroup, darkMat, goldMat, whiteMat); break;
    case 2: buildBowlerHat(hatGroup, hatMat, darkMat); break;
    case 3: buildCyberVisor(hatGroup, goldMat); break;
    case 4: buildCrown(hatGroup, goldMat); break;
    case 5: buildFedora(hatGroup); break;
    default: buildBicorn(hatGroup, goldMat); break;
  }

  // 8. Ground Aura (Pawns Only)
  let avatarLight = null;
  let groundAura = null;
  if (!isPortrait) {
    const initIntensity = (currentBulbMode === 'night' ? 1.4 : currentBulbMode === 'sunset' ? 0.65 : 0);
    avatarLight = new THREE.PointLight(charColor, initIntensity, 5.5, 1.8);
    avatarLight.position.set(0, 0.95, 0);
    root.add(avatarLight);

    const auraGeo = new THREE.CircleGeometry(0.72, 24);
    const auraMat = new THREE.MeshBasicMaterial({
      map: getSoftBloomTexture(),
      color: charColor,
      transparent: true,
      opacity: (currentBulbMode === 'night' ? 0.45 : currentBulbMode === 'sunset' ? 0.22 : 0),
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    groundAura = new THREE.Mesh(auraGeo, auraMat);
    groundAura.rotation.x = -Math.PI / 2;
    groundAura.position.y = 0.02;
    root.add(groundAura);
  }

  root.userData = {
    headGroup,
    eyesGroup,
    armGroupL,
    armGroupR,
    legGroupL,
    legGroupR,
    bodyGroup,
    phaseOffset: idx * 1.7,
    avatarLight,
    groundAura,
    suitMat,
    themeColor: theme.charColor,
    playerIdx: idx
  };

  return root;
}
