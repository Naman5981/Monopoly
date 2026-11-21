/**
 * three/stages/lobbyStage.js
 * Executive 3D Multi-Showcase Studio for the Setup/Landing Screen:
 * 1. AVATAR SHOWCASE: Architectural luxury marble & brass exhibition plinth with 3D character, headwear & glowing aura base.
 * 2. BOARD TILE SHOWCASE: Authentic procedural floating 3D board tile diorama snippet showcasing 3 houses + skyscraper in previewed theme.
 * 3. DICE ARENA SHOWCASE: Casino green felt plinth with tumbling 3D dice actively emitting live particle trails (Fire / Gold / Cyber).
 *
 * All modes support seamless 360° mouse & touch drag turntable spin.
 * Adheres strictly to Clean Code (Uncle Bob), /anti-ui-slop, and /better-interface standards.
 */

import * as THREE from 'three';
import { createDetailed3DAvatarMesh } from '../assets/avatars.js';
import { createDetailedHouseMesh, createDetailedSkyscraperMesh } from '../assets/buildings.js';
import { DICE_SKIN_PALETTES } from '../assets/dice.js';

let lobbyHeroScene = null;
let lobbyHeroCamera = null;
let lobbyHeroRenderer = null;
let lobbyHeroAvatarGroup = null;
let lobbyHeroPodiumGroup = null;
let lobbyHeroTileGroup = null;
let lobbyHeroDiceStageGroup = null;
let lobbyHeroMiniDice = [];
let lobbyHeroMainDice = [];
let activeDiceSparks = [];

let currentShowcaseMode = 'avatar'; // 'avatar' | 'building' | 'dice'
let currentBuildingSkin = 'bldg_classic';
let currentDiceSkin = 'dice_classic';
let currentDiceTrail = 'trail_classic';

let isDiceRolling = false;
let diceRollStartTime = 0;
const DICE_ROLL_DURATION = 1.35; // seconds

const lobbyHeroCanvasId = 'lobby-avatar-3d-canvas';

let isDragging = false;
let prevPointerX = 0;
let userRotOffset = 0;
let userRotVelocity = 0;

function setupLobbyPointerInteractions(canvas) {
  if (!canvas || canvas._hasTurntableListeners || typeof canvas.addEventListener !== 'function') return;
  canvas._hasTurntableListeners = true;

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    prevPointerX = e.clientX;
    userRotVelocity = 0;
    try { canvas.setPointerCapture?.(e.pointerId); } catch (_) {}
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevPointerX;
    prevPointerX = e.clientX;
    const deltaRot = dx * 0.014;
    userRotOffset += deltaRot;
    userRotVelocity = deltaRot;
  });

  const endDrag = (e) => {
    if (isDragging) {
      isDragging = false;
      try { canvas.releasePointerCapture?.(e.pointerId); } catch (_) {}
    }
  };

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
}

export function resizeLobbyHeroStage() {
  const canvas = document.getElementById(lobbyHeroCanvasId);
  if (!canvas || !lobbyHeroRenderer || !lobbyHeroCamera) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
  const displayW = Math.max(rect.width || 0, (rect.width ? 0 : 260));
  const displayH = Math.max(rect.height || 0, (rect.height ? 0 : 260));
  if (displayW === 0 || displayH === 0) return;

  const targetW = Math.round(displayW * dpr);
  const targetH = Math.round(displayH * dpr);

  if (canvas.width !== targetW || canvas.height !== targetH) {
    lobbyHeroRenderer.setSize(targetW, targetH, false);
    const aspect = targetW / Math.max(targetH, 1);
    lobbyHeroCamera.aspect = aspect;
    lobbyHeroCamera.fov = aspect < 1.0 ? Math.min(48, 38 / Math.max(aspect, 0.65)) : 38;
    lobbyHeroCamera.updateProjectionMatrix();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Building Tile Snippet Stage Construction
// ──────────────────────────────────────────────────────────────────────────────

function buildLobbyHeroTileStage() {
  lobbyHeroTileGroup = new THREE.Group();
  lobbyHeroTileGroup.position.set(0, -0.48, 0);

  // 1. Asphalt Road Platform & Foundation Plinth
  const baseGeo = new THREE.BoxGeometry(2.35, 0.18, 2.35);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55, metalness: 0.25 });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.09;
  baseMesh.receiveShadow = true;
  lobbyHeroTileGroup.add(baseMesh);

  // Brushed Champagne Gold Border Inlay
  const goldTrimGeo = new THREE.BoxGeometry(2.42, 0.04, 2.42);
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.88 });
  const goldTrim = new THREE.Mesh(goldTrimGeo, goldTrimMat);
  goldTrim.position.y = 0.17;
  lobbyHeroTileGroup.add(goldTrim);

  // Sidewalk & Property Plot
  const sidewalkGeo = new THREE.BoxGeometry(2.24, 0.08, 1.48);
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32, metalness: 0.08 });
  const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  sidewalk.position.set(0, 0.22, -0.36);
  sidewalk.receiveShadow = true;
  lobbyHeroTileGroup.add(sidewalk);

  // Roadway Segment
  const roadGeo = new THREE.BoxGeometry(2.28, 0.05, 0.72);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75, metalness: 0.1 });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.position.set(0, 0.20, 0.76);
  road.receiveShadow = true;
  lobbyHeroTileGroup.add(road);

  // Road Lane Divider Markings
  [-0.68, 0, 0.68].forEach(x => {
    const markGeo = new THREE.BoxGeometry(0.32, 0.02, 0.05);
    const markMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.3 });
    const mark = new THREE.Mesh(markGeo, markMat);
    mark.position.set(x, 0.23, 0.76);
    lobbyHeroTileGroup.add(mark);
  });

  // Miniature Street Lamp Post
  const lampGroup = new THREE.Group();
  lampGroup.position.set(-0.95, 0.24, 0.36);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.75, 8), new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.8 }));
  pole.position.y = 0.375;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 1.2 }));
  bulb.position.set(0.06, 0.74, 0);
  lampGroup.add(pole, bulb);
  lobbyHeroTileGroup.add(lampGroup);

  // Building Slot Containers
  const buildingsMount = new THREE.Group();
  buildingsMount.name = 'buildingsMount';
  buildingsMount.position.set(0, 0.26, 0);
  lobbyHeroTileGroup.add(buildingsMount);

  lobbyHeroTileGroup.visible = false;
  lobbyHeroScene.add(lobbyHeroTileGroup);
}

export function updateLobbyHeroBuildingSkin(skinId = 'bldg_classic', ownerColor = null) {
  if (!lobbyHeroTileGroup) return;
  currentBuildingSkin = skinId;
  const mount = lobbyHeroTileGroup.getObjectByName('buildingsMount');
  if (!mount) return;

  while (mount.children.length > 0) {
    mount.remove(mount.children[0]);
  }

  const color = (typeof ownerColor === 'number')
    ? ownerColor
    : (typeof window !== 'undefined' && window.matchSettings?.customPlayers?.[0]?.charColor) || 0x3b82f6;

  // 1. Place 3 Tiered Houses Along the Sidewalk Frontage
  const housePositions = [
    { x: -0.62, z: -0.06, lvl: 0, scale: 0.90 },
    { x: -0.04, z: -0.06, lvl: 1, scale: 0.88 },
    { x: 0.54, z: -0.06, lvl: 2, scale: 0.85 }
  ];

  housePositions.forEach(hp => {
    const house = createDetailedHouseMesh(color, hp.lvl, skinId);
    house.position.set(hp.x, 0, hp.z);
    house.scale.setScalar(hp.scale);
    mount.add(house);
  });

  // 2. Place Skyscraper Landmark in the Prestigious Center-Back Plot
  const skyscraper = createDetailedSkyscraperMesh(color, skinId);
  skyscraper.position.set(0, 0, -0.66);
  skyscraper.scale.setScalar(0.68);
  mount.add(skyscraper);

  if (lobbyHeroRenderer && lobbyHeroScene && lobbyHeroCamera) {
    try { lobbyHeroRenderer.render(lobbyHeroScene, lobbyHeroCamera); } catch (_) {}
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Dice Arena & Particle VFX Stage Construction
// ──────────────────────────────────────────────────────────────────────────────

function createPipsOnDieFace(parent, facePos, dir, pipPositions, pipMat) {
  const pipGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.015, 10);
  pipPositions.forEach(([u, v]) => {
    const pip = new THREE.Mesh(pipGeo, pipMat);
    if (dir === 'y+') {
      pip.position.set(facePos.x + u, facePos.y, facePos.z + v);
    } else if (dir === 'y-') {
      pip.position.set(facePos.x + u, facePos.y, facePos.z + v);
    } else if (dir === 'x+') {
      pip.position.set(facePos.x, facePos.y + u, facePos.z + v);
      pip.rotation.z = Math.PI / 2;
    } else if (dir === 'x-') {
      pip.position.set(facePos.x, facePos.y + u, facePos.z + v);
      pip.rotation.z = Math.PI / 2;
    } else if (dir === 'z+') {
      pip.position.set(facePos.x + u, facePos.y + v, facePos.z);
      pip.rotation.x = Math.PI / 2;
    } else if (dir === 'z-') {
      pip.position.set(facePos.x + u, facePos.y + v, facePos.z);
      pip.rotation.x = Math.PI / 2;
    }
    parent.add(pip);
  });
}

function buildShowcaseDie(x, y, z, rotX, rotY, rotZ) {
  const dieGroup = new THREE.Group();
  dieGroup.position.set(x, y, z);
  dieGroup.rotation.set(rotX, rotY, rotZ);

  const cubeSize = 0.44;
  const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const cubeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.18,
    metalness: 0.12
  });
  const cube = new THREE.Mesh(cubeGeo, cubeMat);
  cube.castShadow = true;
  cube.name = 'dieCube';
  dieGroup.add(cube);

  // Add crisp contrast pips
  const pipMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2, metalness: 0.8 });
  pipMat.name = 'pipMat';
  const half = cubeSize / 2 + 0.002;
  const o = 0.11;

  // Face 1 (Top Y+): 1 pip center
  createPipsOnDieFace(dieGroup, { x: 0, y: half, z: 0 }, 'y+', [[0, 0]], pipMat);
  // Face 6 (Bottom Y-): 6 pips
  createPipsOnDieFace(dieGroup, { x: 0, y: -half, z: 0 }, 'y-', [[-o, -o], [-o, 0], [-o, o], [o, -o], [o, 0], [o, o]], pipMat);
  // Face 2 (Front Z+): 2 pips diagonal
  createPipsOnDieFace(dieGroup, { x: 0, y: 0, z: half }, 'z+', [[-o, -o], [o, o]], pipMat);
  // Face 5 (Back Z-): 5 pips
  createPipsOnDieFace(dieGroup, { x: 0, y: 0, z: -half }, 'z-', [[-o, -o], [o, -o], [0, 0], [-o, o], [o, o]], pipMat);
  // Face 3 (Right X+): 3 pips diagonal
  createPipsOnDieFace(dieGroup, { x: half, y: 0, z: 0 }, 'x+', [[-o, -o], [0, 0], [o, o]], pipMat);
  // Face 4 (Left X-): 4 pips
  createPipsOnDieFace(dieGroup, { x: -half, y: 0, z: 0 }, 'x-', [[-o, -o], [o, -o], [-o, o], [o, o]], pipMat);

  dieGroup.userData = {
    basePos: new THREE.Vector3(x, y, z),
    baseRot: new THREE.Euler(rotX, rotY, rotZ),
    cubeMat,
    pipMat
  };

  return dieGroup;
}

function buildLobbyHeroDiceStage() {
  lobbyHeroDiceStageGroup = new THREE.Group();
  lobbyHeroDiceStageGroup.position.set(0, -0.48, 0);

  // Tier 1: Mahogany Rim Plinth
  const rimGeo = new THREE.CylinderGeometry(1.48, 1.55, 0.18, 48);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x1c120c, roughness: 0.35, metalness: 0.3 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = 0.09;
  rim.receiveShadow = true;
  lobbyHeroDiceStageGroup.add(rim);

  // Tier 2: Brushed Gold Bezel
  const bezelGeo = new THREE.CylinderGeometry(1.42, 1.42, 0.04, 48);
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.90 });
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.position.y = 0.18;
  lobbyHeroDiceStageGroup.add(bezel);

  // Tier 3: Casino Emerald Green Felt Table Surface
  const feltGeo = new THREE.CylinderGeometry(1.38, 1.38, 0.16, 48);
  const feltMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.88, metalness: 0.04 });
  const felt = new THREE.Mesh(feltGeo, feltMat);
  felt.position.y = 0.22;
  felt.receiveShadow = true;
  lobbyHeroDiceStageGroup.add(felt);

  // Inner Gold Foil Circle Accent
  const foilGeo = new THREE.TorusGeometry(1.10, 0.015, 10, 48);
  const foilMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.35, metalness: 0.85, roughness: 0.2 });
  const foil = new THREE.Mesh(foilGeo, foilMat);
  foil.rotation.x = Math.PI / 2;
  foil.position.y = 0.305;
  lobbyHeroDiceStageGroup.add(foil);

  // 2 Precision 3D Tumbling Dice
  const die1 = buildShowcaseDie(-0.38, 0.52, 0.12, 0.35, 0.45, 0.15);
  const die2 = buildShowcaseDie(0.42, 0.54, -0.14, -0.42, -0.32, 0.28);
  lobbyHeroMainDice = [die1, die2];
  lobbyHeroDiceStageGroup.add(die1, die2);

  // Spark Particle Pool for Active Dice Trails
  const sparkGeo = new THREE.DodecahedronGeometry(0.065, 0);
  for (let i = 0; i < 28; i++) {
    const sMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xef4444,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0
    });
    const spark = new THREE.Mesh(sparkGeo, sMat);
    spark.visible = false;
    lobbyHeroDiceStageGroup.add(spark);
    activeDiceSparks.push({
      mesh: spark,
      mat: sMat,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      active: false
    });
  }

  lobbyHeroDiceStageGroup.visible = false;
  lobbyHeroScene.add(lobbyHeroDiceStageGroup);
}

export function updateLobbyHeroDiceTrail(trailId = 'trail_classic') {
  currentDiceTrail = trailId;
  let color = 0xf97316;
  let emissive = 0xef4444;

  if (trailId === 'trail_gold') {
    color = 0xfacc15;
    emissive = 0xeab308;
  } else if (trailId === 'trail_cyber') {
    color = 0x06b6d4;
    emissive = 0x0891b2;
  } else if (trailId === 'trail_classic') {
    color = 0xe2e8f0;
    emissive = 0x94a3b8;
  }

  activeDiceSparks.forEach(sp => {
    sp.mat.color.setHex(color);
    sp.mat.emissive.setHex(emissive);
  });
}

export function triggerLobbyHeroDiceRoll() {
  isDiceRolling = true;
  diceRollStartTime = performance.now() * 0.001;
}

function emitDiceSparks(sourcePos) {
  if (currentDiceTrail === 'trail_classic') return;
  const spark = activeDiceSparks.find(s => !s.active);
  if (!spark) return;

  spark.active = true;
  spark.life = 1.0;
  spark.mesh.visible = true;
  spark.mesh.position.set(
    sourcePos.x + (Math.random() - 0.5) * 0.25,
    sourcePos.y + (Math.random() - 0.5) * 0.25,
    sourcePos.z + (Math.random() - 0.5) * 0.25
  );
  spark.vel.set(
    (Math.random() - 0.5) * 0.6,
    0.3 + Math.random() * 0.5,
    (Math.random() - 0.5) * 0.6
  );
}

function updateDiceStageRollAnimation(t) {
  if (!lobbyHeroMainDice || lobbyHeroMainDice.length < 2) return;
  const now = performance.now() * 0.001;

  if (isDiceRolling) {
    const elapsed = now - diceRollStartTime;
    const p = Math.min(1.0, elapsed / DICE_ROLL_DURATION);

    if (p >= 1.0) {
      isDiceRolling = false;
    } else {
      // Elastic toss and tumble
      const height = Math.sin(p * Math.PI) * 0.95;
      lobbyHeroMainDice.forEach((die, idx) => {
        const sign = idx === 0 ? 1 : -1;
        die.position.y = die.userData.basePos.y + height;
        die.position.x = die.userData.basePos.x + Math.sin(p * Math.PI * 2 * sign) * 0.18;
        die.rotation.x += 0.22 * sign;
        die.rotation.y += 0.32;
        die.rotation.z += 0.18 * sign;

        // Continuous trail emission during roll
        emitDiceSparks(die.position);
      });
    }
  } else {
    // Gentle idle bobbing & breathing
    lobbyHeroMainDice.forEach((die, idx) => {
      const phase = idx * 1.5;
      die.position.y = die.userData.basePos.y + Math.sin(t * 1.8 + phase) * 0.025;
      die.rotation.y = die.userData.baseRot.y + Math.sin(t * 1.2 + phase) * 0.12;

      // Occasional gentle particle shimmer for prestige trails
      if (Math.random() < 0.06 && currentDiceTrail !== 'trail_classic') {
        emitDiceSparks(die.position);
      }
    });
  }

  // Animate active particle sparks
  activeDiceSparks.forEach(sp => {
    if (!sp.active) return;
    sp.life -= 0.035;
    if (sp.life <= 0) {
      sp.active = false;
      sp.mesh.visible = false;
      sp.mat.opacity = 0;
    } else {
      sp.mesh.position.addScaledVector(sp.vel, 0.025);
      sp.mat.opacity = Math.min(1, sp.life * 1.4);
      sp.mesh.scale.setScalar(sp.life * 0.9 + 0.1);
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Showcase Mode Switcher
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Switches the active 3D studio stage view between Avatar, Board Tile, and Dice Arena.
 * @param {'avatar' | 'building' | 'dice'} mode
 * @param {object} options - { skinId, diceSkinId, trailId, ownerColor, hatStyle, colorHex, charColor, pedestal }
 */
export function setLobbyHeroShowcaseMode(mode = 'avatar', options = {}) {
  currentShowcaseMode = mode;

  if (lobbyHeroAvatarGroup) lobbyHeroAvatarGroup.visible = (mode === 'avatar');
  if (lobbyHeroPodiumGroup) lobbyHeroPodiumGroup.visible = (mode === 'avatar');
  if (lobbyHeroTileGroup) lobbyHeroTileGroup.visible = (mode === 'building');
  if (lobbyHeroDiceStageGroup) lobbyHeroDiceStageGroup.visible = (mode === 'dice');

  if (mode === 'building') {
    const skin = options.skinId || currentBuildingSkin;
    updateLobbyHeroBuildingSkin(skin, options.ownerColor);
  } else if (mode === 'dice') {
    const diceSkin = options.diceSkinId || currentDiceSkin;
    const trail = options.trailId || currentDiceTrail;
    updateLobbyHeroDiceSkin(diceSkin);
    updateLobbyHeroDiceTrail(trail);
  } else if (mode === 'avatar') {
    if (options.hatStyle !== undefined || options.colorHex || options.charColor || options.pedestal) {
      updateLobbyHeroAvatar(options.hatStyle, options.colorHex, options.charColor, options.pedestal);
    }
  }

  resizeLobbyHeroStage();
  if (lobbyHeroRenderer && lobbyHeroScene && lobbyHeroCamera) {
    try { lobbyHeroRenderer.render(lobbyHeroScene, lobbyHeroCamera); } catch (_) {}
  }
}

export function initLobbyHeroStage(targetCanvas = null) {
  const canvas = targetCanvas || document.getElementById(lobbyHeroCanvasId);
  if (!canvas) return;

  if (lobbyHeroRenderer && lobbyHeroRenderer.domElement === canvas && lobbyHeroScene && lobbyHeroAvatarGroup) {
    setupLobbyPointerInteractions(canvas);
    resizeLobbyHeroStage();
    return;
  }

  if (lobbyHeroRenderer) {
    try {
      lobbyHeroRenderer.dispose();
    } catch (_) {}
    lobbyHeroRenderer = null;
  }

  lobbyHeroScene = null;
  lobbyHeroCamera = null;
  lobbyHeroAvatarGroup = null;
  lobbyHeroPodiumGroup = null;
  lobbyHeroTileGroup = null;
  lobbyHeroDiceStageGroup = null;
  lobbyHeroMiniDice = [];
  lobbyHeroMainDice = [];
  activeDiceSparks = [];

  const w = 512;
  const h = 512;

  try {
    lobbyHeroRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    lobbyHeroRenderer.setSize(w, h, false);
    lobbyHeroRenderer.setPixelRatio(Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2));
    lobbyHeroRenderer.shadowMap.enabled = true;
    lobbyHeroRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } catch (err) {
    return;
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
  }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    if (lobbyHeroRenderer) {
      resizeLobbyHeroStage();
    }
  }, false);

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', resizeLobbyHeroStage, { passive: true });
  }

  setupLobbyPointerInteractions(canvas);

  lobbyHeroScene = new THREE.Scene();
  lobbyHeroCamera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
  lobbyHeroCamera.position.set(0, 1.20, 5.4);
  lobbyHeroCamera.lookAt(0, 0.44, 0);

  requestAnimationFrame(resizeLobbyHeroStage);

  // Studio Three-Point Lighting
  const amb = new THREE.AmbientLight(0xe2e8f0, 0.85);
  lobbyHeroScene.add(amb);

  const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.5);
  keyLight.position.set(3.8, 6.8, 4.8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.001;
  lobbyHeroScene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xcfd8dc, 0.65);
  fillLight.position.set(-4.0, 3.5, 2.0);
  lobbyHeroScene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.25);
  rimLight.position.set(-0.5, 4.5, -4.5);
  lobbyHeroScene.add(rimLight);

  // 1. Luxury Architectural Exhibition Plinth (Avatar Mode)
  lobbyHeroPodiumGroup = new THREE.Group();
  lobbyHeroPodiumGroup.position.set(0, -0.58, 0);

  const basePlinthGeo = new THREE.CylinderGeometry(1.42, 1.50, 0.16, 48);
  const basePlinthMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.32, metalness: 0.35 });
  const basePlinth = new THREE.Mesh(basePlinthGeo, basePlinthMat);
  basePlinth.position.y = 0.08;
  basePlinth.receiveShadow = true;
  lobbyHeroPodiumGroup.add(basePlinth);

  const goldTrimGeo = new THREE.CylinderGeometry(1.38, 1.38, 0.03, 48);
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.18, metalness: 0.90 });
  const goldTrim = new THREE.Mesh(goldTrimGeo, goldTrimMat);
  goldTrim.position.y = 0.17;
  lobbyHeroPodiumGroup.add(goldTrim);

  const marbleTopGeo = new THREE.CylinderGeometry(1.34, 1.34, 0.16, 48);
  const marbleTopMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.16, metalness: 0.08 });
  const marbleTop = new THREE.Mesh(marbleTopGeo, marbleTopMat);
  marbleTop.position.y = 0.22;
  marbleTop.receiveShadow = true;
  lobbyHeroPodiumGroup.add(marbleTop);

  const glowGeo = new THREE.TorusGeometry(1.32, 0.02, 12, 48);
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.8
  });
  const glowRing = new THREE.Mesh(glowGeo, glowMat);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.30;
  lobbyHeroPodiumGroup.add(glowRing);

  function createGoldIngot(x, y, z, rotY = 0) {
    const ingotGeo = new THREE.BoxGeometry(0.20, 0.06, 0.11);
    const ingotMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.92, roughness: 0.15 });
    const ingot = new THREE.Mesh(ingotGeo, ingotMat);
    ingot.position.set(x, y, z);
    ingot.rotation.y = rotY;
    ingot.castShadow = true;
    return ingot;
  }

  lobbyHeroPodiumGroup.add(createGoldIngot(-0.92, 0.33, 0.10, 0.25));
  lobbyHeroPodiumGroup.add(createGoldIngot(-0.89, 0.33, -0.06, 0.18));
  lobbyHeroPodiumGroup.add(createGoldIngot(-0.905, 0.39, 0.02, 0.22));

  function createMiniDice(x, z, rotY) {
    const diceMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.20, metalness: 0.15 });
    const die = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, 0.20), diceMat);
    die.position.set(x, 0.40, z);
    die.rotation.set(0.08, rotY, 0.05);
    die.castShadow = true;
    return die;
  }
  const die1 = createMiniDice(0.85, 0.25, 0.42);
  const die2 = createMiniDice(0.98, 0.05, -0.28);
  lobbyHeroMiniDice = [die1, die2];
  lobbyHeroPodiumGroup.add(die1, die2);

  lobbyHeroScene.add(lobbyHeroPodiumGroup);

  // 2. Avatar Group
  lobbyHeroAvatarGroup = new THREE.Group();
  lobbyHeroAvatarGroup.position.set(0, -0.28, 0);
  lobbyHeroScene.add(lobbyHeroAvatarGroup);

  // 3. Floating Board Tile Snippet Stage (Building Mode)
  buildLobbyHeroTileStage();

  // 4. Dice Arena & Live VFX Stage (Dice Mode)
  buildLobbyHeroDiceStage();

  const initialHat = (typeof window !== 'undefined' && window.matchSettings?.customPlayers?.[0]?.hatStyle) ?? 0;
  const initialHex = (typeof window !== 'undefined' && window.matchSettings?.customPlayers?.[0]?.colorHex) || '#3b82f6';
  const initialCharColor = (typeof window !== 'undefined' && window.matchSettings?.customPlayers?.[0]?.charColor) || 0x3b82f6;
  updateLobbyHeroAvatar(initialHat, initialHex, initialCharColor);

  setLobbyHeroShowcaseMode(currentShowcaseMode);
  resizeLobbyHeroStage();
}

export function updateLobbyHeroDiceSkin(skinId = 'dice_classic') {
  currentDiceSkin = skinId;
  const palette = DICE_SKIN_PALETTES[skinId] || DICE_SKIN_PALETTES.dice_classic;
  const col = new THREE.Color(palette.bg);

  // 1. Update podium mini dice
  if (lobbyHeroMiniDice && lobbyHeroMiniDice.length > 0) {
    lobbyHeroMiniDice.forEach(die => {
      if (die && die.material) {
        die.material.color = col;
        applyDiceSkinAttributes(die.material, skinId);
      }
    });
  }

  // 2. Update arena showcase dice
  if (lobbyHeroMainDice && lobbyHeroMainDice.length > 0) {
    lobbyHeroMainDice.forEach(dieGroup => {
      const cubeMat = dieGroup.userData?.cubeMat;
      const pipMat = dieGroup.userData?.pipMat;
      if (cubeMat) {
        cubeMat.color = col;
        applyDiceSkinAttributes(cubeMat, skinId);
      }
      if (pipMat) {
        const pipCol = (skinId === 'dice_obsidian' || skinId === 'dice_ruby') ? 0xfef08a : (skinId === 'dice_midas' ? 0x78350f : 0x090d16);
        pipMat.color.setHex(pipCol);
        pipMat.needsUpdate = true;
      }
    });
  }
}

function applyDiceSkinAttributes(material, skinId) {
  if (skinId === 'dice_midas') {
    material.metalness = 0.90;
    material.roughness = 0.18;
    material.emissive = new THREE.Color(0x713f12);
    material.emissiveIntensity = 0.25;
  } else if (skinId === 'dice_obsidian') {
    material.metalness = 0.50;
    material.roughness = 0.14;
    material.emissive = new THREE.Color(0x581c87);
    material.emissiveIntensity = 0.35;
  } else if (skinId === 'dice_neon') {
    material.metalness = 0.35;
    material.roughness = 0.18;
    material.emissive = new THREE.Color(0x0284c7);
    material.emissiveIntensity = 0.45;
  } else if (skinId === 'dice_ruby') {
    material.metalness = 0.30;
    material.roughness = 0.18;
    material.emissive = new THREE.Color(0x991b1b);
    material.emissiveIntensity = 0.30;
  } else {
    material.metalness = 0.10;
    material.roughness = 0.28;
    material.emissive = new THREE.Color(0x000000);
    material.emissiveIntensity = 0;
  }
  material.needsUpdate = true;
}

export function updateLobbyHeroAvatar(hatStyle = 0, colorHex = '#6c5ce7', charColor = 0x6c5ce7, pedestalStyle = null) {
  if (!lobbyHeroAvatarGroup) return;
  while (lobbyHeroAvatarGroup.children.length > 0) {
    lobbyHeroAvatarGroup.remove(lobbyHeroAvatarGroup.children[0]);
  }
  const parsedCharColor = (typeof charColor === 'number')
    ? charColor
    : (colorHex ? parseInt(colorHex.replace('#', '0x'), 16) : 0x6c5ce7);
  const avatarMesh = createDetailed3DAvatarMesh(0, false, hatStyle, pedestalStyle, parsedCharColor);
  avatarMesh.scale.setScalar(1.02);
  lobbyHeroAvatarGroup.add(avatarMesh);

  if (lobbyHeroRenderer && lobbyHeroScene && lobbyHeroCamera) {
    resizeLobbyHeroStage();
    try {
      lobbyHeroRenderer.render(lobbyHeroScene, lobbyHeroCamera);
    } catch (_) {}
  }
}

/**
 * Per-frame render tick for the spinning lobby hero stage.
 * @param {number} t - Current time in seconds
 */
export function renderLobbyHeroStage(t) {
  const canvas = document.getElementById(lobbyHeroCanvasId);
  const landing = document.getElementById('landing-setup-screen');
  if (!canvas || !landing || landing.classList.contains('hidden') || landing.style.display === 'none') return;

  if (!lobbyHeroRenderer || lobbyHeroRenderer.domElement !== canvas) {
    initLobbyHeroStage(canvas);
  }
  if (!lobbyHeroRenderer || !lobbyHeroScene || !lobbyHeroCamera) return;

  resizeLobbyHeroStage();

  if (!isDragging) {
    userRotOffset += userRotVelocity;
    userRotVelocity *= 0.92;
  }

  if (currentShowcaseMode === 'avatar') {
    if (lobbyHeroAvatarGroup) {
      lobbyHeroAvatarGroup.rotation.y = Math.sin(t * 0.85) * 0.38 + userRotOffset;
      const ud = lobbyHeroAvatarGroup.children[0]?.userData;
      if (ud?.headGroup) {
        ud.headGroup.rotation.y = Math.sin(t * 1.6) * 0.12;
      }
    }
    if (lobbyHeroPodiumGroup) {
      lobbyHeroPodiumGroup.rotation.y = t * 0.12 + userRotOffset;
    }
  } else if (currentShowcaseMode === 'building') {
    if (lobbyHeroTileGroup) {
      lobbyHeroTileGroup.rotation.y = t * 0.16 + userRotOffset;
    }
  } else if (currentShowcaseMode === 'dice') {
    if (lobbyHeroDiceStageGroup) {
      lobbyHeroDiceStageGroup.rotation.y = t * 0.12 + userRotOffset;
      updateDiceStageRollAnimation(t);
    }
  }

  try {
    lobbyHeroRenderer.render(lobbyHeroScene, lobbyHeroCamera);
  } catch (_) {}
}
