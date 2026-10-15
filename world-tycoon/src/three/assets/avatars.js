/**
 * three/assets/avatars.js
 * Procedural 3D character generator: customizable skin tones, business suits, expressive blinking eyes,
 * aviator caps with goggles, top hats with monocles, crowns, and theme-colored pedestal plinths.
 */

import * as THREE from 'three';
import { PLAYER_THEMES } from '../../game/data.js';
import { currentBulbMode, getSoftBloomTexture } from '../core/lighting.js';

/**
 * Creates a complete procedural 3D character mesh.
 * @param {number} idx - Player/theme index
 * @param {boolean} isPortrait - Whether generating for miniature circular HUD portrait
 * @returns {THREE.Group}
 */
export function createDetailed3DAvatarMesh(idx, isPortrait = false) {
  const theme = PLAYER_THEMES[idx % PLAYER_THEMES.length];
  const root = new THREE.Group();
  const skinTones = [0xf1c27d, 0xe0ac69, 0xc68642, 0xffdbac];
  const skinColor = skinTones[idx % skinTones.length];
  const suitMat = new THREE.MeshStandardMaterial({ color: theme.charColor, roughness: 0.45, metalness: 0.1, flatShading: true });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.55, metalness: 0.05, flatShading: true });
  const hatMat = new THREE.MeshStandardMaterial({ color: theme.hatColor, roughness: 0.38, metalness: 0.2, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.3 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.75, flatShading: true });

  if (!isPortrait) {
    const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.14, 16), darkMat);
    pedBase.position.y = 0.07;
    pedBase.castShadow = true;
    root.add(pedBase);

    const pedInner = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.39, 0.06, 16), suitMat);
    pedInner.position.y = 0.15;
    root.add(pedInner);
  }

  const legGroupL = new THREE.Group();
  const legGroupR = new THREE.Group();
  if (!isPortrait) {
    const legGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.34, 10);
    const shoeGeo = new THREE.BoxGeometry(0.16, 0.1, 0.24);
    const legL = new THREE.Mesh(legGeo, darkMat);
    legL.position.y = -0.15;
    const shoeL = new THREE.Mesh(shoeGeo, darkMat);
    shoeL.position.set(0, -0.32, 0.04);
    legGroupL.add(legL, shoeL);
    legGroupL.position.set(-0.14, 0.48, 0);

    const legR = new THREE.Mesh(legGeo, darkMat);
    legR.position.y = -0.15;
    const shoeR = new THREE.Mesh(shoeGeo, darkMat);
    shoeR.position.set(0, -0.32, 0.04);
    legGroupR.add(legR, shoeR);
    legGroupR.position.set(0.14, 0.48, 0);
    root.add(legGroupL, legGroupR);
  }

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = isPortrait ? 0 : 0.44;
  root.add(bodyGroup);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.56, 12), suitMat);
  torso.position.y = 0.28;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const shirtV = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 4), whiteMat);
  shirtV.rotation.x = Math.PI;
  shirtV.rotation.y = Math.PI / 4;
  shirtV.position.set(0, 0.44, 0.22);
  bodyGroup.add(shirtV);

  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.06), goldMat);
  tie.position.set(0, 0.36, 0.29);
  tie.rotation.x = -0.08;
  bodyGroup.add(tie);

  const armGroupL = new THREE.Group();
  armGroupL.position.set(-0.34, 0.48, 0);
  const armMeshL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.38, 10), suitMat);
  armMeshL.position.y = -0.16;
  armMeshL.rotation.z = 0.18;
  const handL = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 1), skinMat);
  handL.position.set(-0.04, -0.36, 0);
  armGroupL.add(armMeshL, handL);
  bodyGroup.add(armGroupL);

  const armGroupR = new THREE.Group();
  armGroupR.position.set(0.34, 0.48, 0);
  const armMeshR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.38, 10), suitMat);
  armMeshR.position.y = -0.16;
  armMeshR.rotation.z = -0.18;
  const handR = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 1), skinMat);
  handR.position.set(0.04, -0.36, 0);
  armGroupR.add(armMeshR, handR);
  bodyGroup.add(armGroupR);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.88;
  bodyGroup.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.16, 10), skinMat);
  neck.position.y = -0.26;
  headGroup.add(neck);

  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 2), skinMat);
  skull.scale.set(1.02, 1.06, 0.98);
  skull.castShadow = true;
  headGroup.add(skull);

  const earGeo = new THREE.IcosahedronGeometry(0.09, 1);
  const earL = new THREE.Mesh(earGeo, skinMat);
  earL.scale.set(0.55, 1.1, 0.8);
  earL.position.set(-0.36, 0.0, 0);
  const earR = earL.clone();
  earR.position.set(0.36, 0.0, 0);
  headGroup.add(earL, earR);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.14, 6), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.01, 0.37);
  headGroup.add(nose);

  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.35 });
  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), cheekMat);
  cheekL.scale.set(1.2, 0.7, 0.5);
  cheekL.position.set(-0.21, -0.06, 0.31);
  const cheekR = cheekL.clone();
  cheekR.position.set(0.21, -0.06, 0.31);
  headGroup.add(cheekL, cheekR);

  const eyesGroup = new THREE.Group();
  [-0.13, 0.13].forEach(ex => {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.088, 12, 12), whiteMat);
    sclera.scale.set(1, 1.12, 0.65);
    sclera.position.set(ex, 0.06, 0.315);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), darkMat);
    pupil.scale.set(1, 1.1, 0.6);
    pupil.position.set(ex, 0.06, 0.358);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(ex + 0.022, 0.085, 0.382);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.032, 0.04), darkMat);
    brow.position.set(ex, 0.18, 0.335);
    brow.rotation.z = ex < 0 ? 0.08 : -0.08;

    eyesGroup.add(sclera, pupil, glint, brow);
  });
  headGroup.add(eyesGroup);

  if (idx % 4 === 1) {
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.05), darkMat);
    s1.position.set(-0.06, -0.1, 0.355);
    s1.rotation.z = 0.22;
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.05), darkMat);
    s2.position.set(0.06, -0.1, 0.355);
    s2.rotation.z = -0.22;
    headGroup.add(s1, s2);
  } else {
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 6, 12, Math.PI), darkMat);
    smile.rotation.x = Math.PI;
    smile.position.set(0, -0.1, 0.345);
    headGroup.add(smile);
  }

  const hatGroup = new THREE.Group();
  headGroup.add(hatGroup);

  if (idx % 4 === 0) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.385, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hatMat);
    dome.position.y = 0.02;
    hatGroup.add(dome);

    const flapL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.22), hatMat);
    flapL.position.set(-0.36, -0.02, -0.02);
    flapL.rotation.z = 0.15;
    const flapR = flapL.clone();
    flapR.position.set(0.36, -0.02, -0.02);
    flapR.rotation.z = -0.15;
    hatGroup.add(flapL, flapR);

    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.07, 16), darkMat);
    strap.position.y = 0.23;
    hatGroup.add(strap);

    const lensMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.15 });
    [-0.13, 0.13].forEach(gx => {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), goldMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(gx, 0.25, 0.36);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.09, 12), lensMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(gx, 0.25, 0.365);
      hatGroup.add(rim, lens);
    });
  } else if (idx % 4 === 1) {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.06, 16), darkMat);
    brim.position.y = 0.26;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.3, 0.42, 16), darkMat);
    crown.position.y = 0.48;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.31, 0.08, 16), goldMat);
    band.position.y = 0.33;
    hatGroup.add(brim, crown, band);

    const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 8, 16), goldMat);
    monocle.position.set(0.13, 0.06, 0.37);
    headGroup.add(monocle);
  } else if (idx % 4 === 2) {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, 0.06, 16), hatMat);
    brim.position.y = 0.22;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hatMat);
    dome.position.y = 0.22;
    const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), goldMat);
    crest.position.set(0, 0.34, 0.35);
    hatGroup.add(brim, dome, crest);
  } else {
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.8 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.13, 0.16), visorMat);
    visor.position.set(0, 0.08, 0.31);
    headGroup.add(visor);

    const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.045, 8, 18, Math.PI), goldMat);
    crownBand.position.set(0, 0.05, 0);
    hatGroup.add(crownBand);

    [-0.39, 0.39].forEach(hx => {
      const muff = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.09, 12), hatMat);
      muff.rotation.z = Math.PI / 2;
      muff.position.set(hx, 0.02, 0);
      hatGroup.add(muff);
    });
  }

  let avatarLight = null;
  let groundAura = null;
  if (!isPortrait) {
    const initIntensity = (currentBulbMode === 'night' ? 1.4 : currentBulbMode === 'sunset' ? 0.65 : 0);
    avatarLight = new THREE.PointLight(theme.charColor, initIntensity, 5.5, 1.8);
    avatarLight.position.set(0, 0.95, 0);
    root.add(avatarLight);

    const auraGeo = new THREE.CircleGeometry(0.72, 24);
    const auraMat = new THREE.MeshBasicMaterial({
      map: getSoftBloomTexture(),
      color: theme.charColor,
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

    if (currentBulbMode === 'night') {
      suitMat.emissive.setHex(theme.charColor);
      suitMat.emissiveIntensity = 0.35;
    } else if (currentBulbMode === 'sunset') {
      suitMat.emissive.setHex(theme.charColor);
      suitMat.emissiveIntensity = 0.18;
    }
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
