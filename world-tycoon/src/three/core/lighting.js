/**
 * three/core/lighting.js
 * Environmental illumination: directional sun, soft shadows, street lamps, filament bulbs, light pools, and theme switching.
 */

import * as THREE from 'three';
import { context } from './context.js';
import { BOARD_TILES, PLAYER_THEMES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { BASE_TILE_Y, getTileWorldPosition } from '../board/coords.js';
import { movingHopDestTileId } from '../board/tilePress.js';

export let currentBulbMode = 'day';

export const streetBulbMaterials = [];
export const streetFilamentMaterials = [];
export const streetGlassMaterials = [];
export const streetGlowSprites = [];
export const streetGroundLightPools = [];
export const streetLightBeams = [];
export const streetPointLights = [];
let streetLampsGroup = null;

let softBloomTexture = null;
export function getSoftBloomTexture() {
  if (softBloomTexture) return softBloomTexture;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.14, 'rgba(255, 252, 240, 0.95)');
  grad.addColorStop(0.35, 'rgba(255, 244, 218, 0.65)');
  grad.addColorStop(0.60, 'rgba(254, 235, 195, 0.28)');
  grad.addColorStop(0.82, 'rgba(253, 224, 175, 0.08)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  softBloomTexture = new THREE.CanvasTexture(c);
  return softBloomTexture;
}

let groundPoolTexture = null;
export function getGroundPoolTexture() {
  if (groundPoolTexture) return groundPoolTexture;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.90)');
  grad.addColorStop(0.20, 'rgba(255, 250, 235, 0.72)');
  grad.addColorStop(0.45, 'rgba(254, 240, 210, 0.38)');
  grad.addColorStop(0.72, 'rgba(253, 230, 180, 0.10)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  groundPoolTexture = new THREE.CanvasTexture(c);
  return groundPoolTexture;
}

let beamGradientTexture = null;
export function getBeamGradientTexture() {
  if (beamGradientTexture) return beamGradientTexture;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255, 250, 205, 0.85)');
  grad.addColorStop(0.25, 'rgba(254, 240, 138, 0.45)');
  grad.addColorStop(0.7, 'rgba(253, 224, 71, 0.15)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);
  beamGradientTexture = new THREE.CanvasTexture(c);
  return beamGradientTexture;
}

/**
 * Builds the primary ambient and directional sun lights for the Three.js scene.
 */
export function buildMainDirectionalAndAmbientLights(scene) {
  context.ambientLight = new THREE.AmbientLight(0xffffff, 0.38);
  scene.add(context.ambientLight);

  context.dirLight = new THREE.DirectionalLight(0xffffff, 0.98);
  context.dirLight.position.set(22, 32, 18);
  context.dirLight.castShadow = true;
  context.dirLight.shadow.mapSize.width = 2048;
  context.dirLight.shadow.mapSize.height = 2048;
  context.dirLight.shadow.camera.near = 2.0;
  context.dirLight.shadow.camera.far = 95;
  const d = 21;
  context.dirLight.shadow.camera.left = -d;
  context.dirLight.shadow.camera.right = d;
  context.dirLight.shadow.camera.top = d;
  context.dirLight.shadow.camera.bottom = -d;
  context.dirLight.shadow.bias = -0.0003;
  context.dirLight.shadow.normalBias = 0.025;
  context.dirLight.shadow.radius = 2.0;
  scene.add(context.dirLight);
}

/**
 * Builds 12 authentic cast-iron street lamps with glowing filaments, volumetric cones, and ground light pools.
 */
export function buildStreetLampsAndBulbs3D(boardGroup) {
  if (streetLampsGroup) return;
  streetLampsGroup = new THREE.Group();
  boardGroup.add(streetLampsGroup);

  const postMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });
  const socketMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 });

  const lampPositions = [
    { x: -5.4, z: -5.5, rot: 0 },
    { x: 0, z: -5.6, rot: 0 },
    { x: 5.4, z: -5.5, rot: 0 },
    { x: -5.4, z: 5.5, rot: Math.PI },
    { x: 0, z: 5.6, rot: Math.PI },
    { x: 5.4, z: 5.5, rot: Math.PI },
    { x: -5.6, z: -2.8, rot: Math.PI / 2 },
    { x: -5.6, z: 2.8, rot: Math.PI / 2 },
    { x: 5.6, z: -2.8, rot: -Math.PI / 2 },
    { x: 5.6, z: 2.8, rot: -Math.PI / 2 },
    { x: -8.5, z: -8.5, rot: Math.PI / 4 },
    { x: 8.5, z: 8.5, rot: -3 * Math.PI / 4 }
  ];

  lampPositions.forEach(pos => {
    const lamp = new THREE.Group();
    lamp.position.set(pos.x, 0.35, pos.z);
    lamp.rotation.y = pos.rot;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.26, 8), postMat);
    base.position.y = 0.13;
    lamp.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 1.6, 8), postMat);
    pole.position.y = 0.93;
    lamp.add(pole);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.06, 8), postMat);
    collar.position.y = 1.62;
    lamp.add(collar);

    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.05), postMat);
    bracket.position.y = 1.58;
    lamp.add(bracket);

    const lanternBase = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.36), postMat);
    lanternBase.position.y = 1.74;
    lamp.add(lanternBase);

    const strutGeo = new THREE.BoxGeometry(0.024, 0.36, 0.024);
    [[-0.13, -0.13], [-0.13, 0.13], [0.13, -0.13], [0.13, 0.13]].forEach(([sx, sz]) => {
      const strut = new THREE.Mesh(strutGeo, postMat);
      strut.position.set(sx, 1.95, sz);
      lamp.add(strut);
    });

    const lanternRoof = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.24, 4), postMat);
    lanternRoof.position.y = 2.18;
    lanternRoof.rotation.y = Math.PI / 4;
    lamp.add(lanternRoof);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), postMat);
    finial.position.y = 2.32;
    lamp.add(finial);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.15,
      emissive: 0x000000,
      emissiveIntensity: 0.0
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.34, 0.27), glassMat);
    glass.position.y = 1.95;
    lamp.add(glass);
    streetGlassMaterials.push(glassMat);

    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 10), socketMat);
    socket.position.y = 2.08;
    lamp.add(socket);

    const bulbGroup = new THREE.Group();
    bulbGroup.position.set(0, 1.95, 0);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfde047,
      emissiveIntensity: 1.8,
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.90
    });

    const neckGeo = new THREE.CylinderGeometry(0.045, 0.065, 0.06, 12);
    const neckMesh = new THREE.Mesh(neckGeo, bulbMat);
    neckMesh.position.y = 0.07;
    bulbGroup.add(neckMesh);

    const sphereGeo = new THREE.SphereGeometry(0.095, 16, 14);
    const sphereMesh = new THREE.Mesh(sphereGeo, bulbMat);
    sphereMesh.position.y = 0.0;
    bulbGroup.add(sphereMesh);

    const filamentMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const filament = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.010, 8, 16), filamentMat);
    filament.rotation.x = Math.PI / 2;
    filament.position.y = 0.01;
    bulbGroup.add(filament);

    lamp.add(bulbGroup);
    streetBulbMaterials.push(bulbMat);
    streetFilamentMaterials.push(filamentMat);

    const glowMat = new THREE.SpriteMaterial({
      map: getSoftBloomTexture(),
      color: 0xfef08a,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.position.set(0, 1.95, 0);
    glowSprite.scale.set(1.2, 1.2, 1.0);
    lamp.add(glowSprite);
    streetGlowSprites.push(glowMat);

    const beamGeo = new THREE.CylinderGeometry(0.18, 1.65, 2.0, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      map: getBeamGradientTexture(),
      color: 0xfef08a,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 0.98;
    lamp.add(beam);
    streetLightBeams.push(beamMat);

    const poolGeo = new THREE.CircleGeometry(1.65, 24);
    const poolMat = new THREE.MeshBasicMaterial({
      map: getGroundPoolTexture(),
      color: 0xfffaed,
      transparent: true,
      opacity: 0.10,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const groundPool = new THREE.Mesh(poolGeo, poolMat);
    groundPool.rotation.x = -Math.PI / 2;
    groundPool.position.y = -0.33;
    lamp.add(groundPool);
    streetGroundLightPools.push(poolMat);

    const pl = new THREE.PointLight(0xfffaed, 0.35, 4.5, 2.0);
    pl.position.set(0, 1.95, 0);
    lamp.add(pl);
    streetPointLights.push(pl);

    streetLampsGroup.add(lamp);
  });
}

/**
 * Tints a hex color into a softened pastel accent.
 */
export function getLightPlayerAccent(hex, amount = 0.40) {
  if (!hex || hex[0] !== '#') return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr}, ${lg}, ${lb})`;
}

/**
 * Updates tile border emissive frames based on active day/sunset/night mode.
 */
export function updateTileBordersForCurrentMode() {
  const isNight = (currentBulbMode === 'night');
  const isSunset = (currentBulbMode === 'sunset');

  BOARD_TILES.forEach(tile => {
    const frame = context.tileBorderFrames[tile.id];
    const mesh = context.tilesMeshMap[tile.id];
    const propState = gameState.properties[tile.id] || null;
    const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
    const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
    const lightPlayerAccent = ownerTheme ? getLightPlayerAccent(ownerTheme.colorHex, 0.40) : null;

    if (Array.isArray(mesh?.material)) {
      [0, 1, 3, 4, 5].forEach(idx => {
        if (mesh.material[idx]) {
          if (isNight && isOwned && lightPlayerAccent) {
            mesh.material[idx].color.setStyle(lightPlayerAccent);
            mesh.material[idx].emissive.setStyle(lightPlayerAccent);
            mesh.material[idx].emissiveIntensity = 0.50;
          } else if (isSunset && isOwned && lightPlayerAccent) {
            mesh.material[idx].color.setStyle(lightPlayerAccent);
            mesh.material[idx].emissive.setStyle(lightPlayerAccent);
            mesh.material[idx].emissiveIntensity = 0.25;
          } else {
            mesh.material[idx].emissive.setHex(0x000000);
            mesh.material[idx].emissiveIntensity = 0;
          }
          mesh.material[idx].needsUpdate = true;
        }
      });
    }

    if (frame && frame.userData?.borderMat) {
      if (isNight && isOwned && lightPlayerAccent) {
        frame.visible = true;
        frame.userData.borderMat.color.setStyle(lightPlayerAccent);
        frame.userData.borderMat.emissive.setStyle(lightPlayerAccent);
        frame.userData.borderMat.emissiveIntensity = 0.85;
      } else if (isSunset && isOwned && lightPlayerAccent) {
        frame.visible = true;
        frame.userData.borderMat.color.setStyle(lightPlayerAccent);
        frame.userData.borderMat.emissive.setStyle(lightPlayerAccent);
        frame.userData.borderMat.emissiveIntensity = 0.45;
      } else {
        frame.visible = false;
        frame.userData.borderMat.emissiveIntensity = 0;
      }
    }
  });
}

/**
 * Updates avatar token lighting and ground auras based on active day/sunset/night mode.
 */
export function updateAvatarLightingForCurrentMode() {
  const isNight = (currentBulbMode === 'night');
  const isSunset = (currentBulbMode === 'sunset');
  context.playerMeshes.forEach(mesh => {
    const ud = mesh?.userData;
    if (!ud) return;
    if (isNight) {
      if (ud.avatarLight) ud.avatarLight.intensity = 1.4;
      if (ud.groundAura) ud.groundAura.material.opacity = 0.45;
      if (ud.suitMat) { ud.suitMat.emissive.setHex(ud.themeColor); ud.suitMat.emissiveIntensity = 0.35; }
    } else if (isSunset) {
      if (ud.avatarLight) ud.avatarLight.intensity = 0.65;
      if (ud.groundAura) ud.groundAura.material.opacity = 0.22;
      if (ud.suitMat) { ud.suitMat.emissive.setHex(ud.themeColor); ud.suitMat.emissiveIntensity = 0.18; }
    } else {
      if (ud.avatarLight) ud.avatarLight.intensity = 0.0;
      if (ud.groundAura) ud.groundAura.material.opacity = 0.0;
      if (ud.suitMat) { ud.suitMat.emissive.setHex(0x000000); ud.suitMat.emissiveIntensity = 0.0; }
    }
  });
}

/**
 * Applies lighting mode changes: 'day', 'sunset', or 'night'.
 * Adjusts street lamps, filaments, glowing bulbs, ground pools, avatar auras, and tile borders.
 */
export function setBulbLightingTheme(mode) {
  currentBulbMode = mode;
  const isNight = (mode === 'night');
  const isSunset = (mode === 'sunset');

  if (isNight) {
    streetFilamentMaterials.forEach(mat => mat.color.setHex(0xffffff));
    streetBulbMaterials.forEach(mat => {
      mat.emissive.setHex(0xffeedd);
      mat.emissiveIntensity = 2.6;
      mat.opacity = 0.92;
    });
    streetGlassMaterials.forEach(mat => {
      mat.emissive.setHex(0xffeedd);
      mat.emissiveIntensity = 0.35;
      mat.opacity = 0.42;
    });
    streetGlowSprites.forEach(mat => {
      mat.color.setHex(0xfffaed);
      mat.opacity = 0.70;
    });
    streetGroundLightPools.forEach(mat => {
      mat.color.setHex(0xffeedd);
      mat.opacity = 0.45;
    });
    streetLightBeams.forEach(mat => {
      mat.color.setHex(0xfffaed);
      mat.opacity = 0.08;
    });
    streetPointLights.forEach(pl => {
      pl.color.setHex(0xffeedd);
      pl.intensity = 1.5;
      pl.distance = 7.5;
      pl.decay = 1.8;
    });
  } else if (isSunset) {
    streetFilamentMaterials.forEach(mat => mat.color.setHex(0xffedd5));
    streetBulbMaterials.forEach(mat => {
      mat.emissive.setHex(0xffe29a);
      mat.emissiveIntensity = 2.0;
      mat.opacity = 0.88;
    });
    streetGlassMaterials.forEach(mat => {
      mat.emissive.setHex(0xffe29a);
      mat.emissiveIntensity = 0.25;
      mat.opacity = 0.35;
    });
    streetGlowSprites.forEach(mat => {
      mat.color.setHex(0xffe29a);
      mat.opacity = 0.55;
    });
    streetGroundLightPools.forEach(mat => {
      mat.color.setHex(0xffe29a);
      mat.opacity = 0.30;
    });
    streetLightBeams.forEach(mat => {
      mat.color.setHex(0xffe29a);
      mat.opacity = 0.06;
    });
    streetPointLights.forEach(pl => {
      pl.color.setHex(0xffe29a);
      pl.intensity = 1.1;
      pl.distance = 6.0;
      pl.decay = 1.8;
    });
  } else {
    streetFilamentMaterials.forEach(mat => mat.color.setHex(0xffedd5));
    streetBulbMaterials.forEach(mat => {
      mat.emissive.setHex(0xffecc7);
      mat.emissiveIntensity = 1.8;
      mat.opacity = 0.90;
    });
    streetGlassMaterials.forEach(mat => {
      mat.emissive.setHex(0xffecc7);
      mat.emissiveIntensity = 0.20;
      mat.opacity = 0.35;
    });
    streetGlowSprites.forEach(mat => {
      mat.color.setHex(0xffecc7);
      mat.opacity = 0.35;
    });
    streetGroundLightPools.forEach(mat => {
      mat.color.setHex(0xffecc7);
      mat.opacity = 0.12;
    });
    streetLightBeams.forEach(mat => {
      mat.color.setHex(0xffecc7);
      mat.opacity = 0.03;
    });
    streetPointLights.forEach(pl => {
      pl.color.setHex(0xffecc7);
      pl.intensity = 0.50;
      pl.distance = 5.0;
      pl.decay = 2.0;
    });
  }

  updateAvatarLightingForCurrentMode();
  updateTileBordersForCurrentMode();

  if (context.tilePressPointLight) {
    context.tilePressPointLight.intensity = 0;
    context.tilePressPointLight.visible = false;
  }
  if (!isNight && !isSunset) {
    Object.values(context.tileGroundLightPools).forEach(pool => {
      if (pool) { pool.visible = false; pool.material.opacity = 0; }
    });
    Object.values(context.tilesMeshMap).forEach(mesh => {
      const topMat = mesh?.userData?.topMat || (Array.isArray(mesh?.material) ? mesh.material[2] : null);
      const sideMat = mesh?.userData?.sideMat || (Array.isArray(mesh?.material) ? mesh.material[0] : null);
      if (topMat) { topMat.emissive.setHex(0x000000); topMat.emissiveIntensity = 0; }
      if (sideMat) { sideMat.emissive.setHex(0x000000); sideMat.emissiveIntensity = 0; }
    });
    Object.keys(context.activeTileIlluminations).forEach(k => {
      context.activeTileIlluminations[k].currentIllum = 0;
    });
  }
}

/**
 * Returns active lighting references for UI toggles and effects.
 */
export function getSceneLighting() {
  return {
    ambientLight: context.ambientLight,
    dirLight: context.dirLight,
    setBulbLightingTheme
  };
}

/**
 * Street lamp organic glow and filament breathing across day, sunset, and night modes.
 * @param {number} t - Time in seconds
 */
export function updateStreetLampGlow(t) {
  const basePulse = Math.sin(t * 3.5) * 0.04;
  let baseIntensity = 0.50;
  let baseOpacity = 0.35;
  let baseEmissive = 1.8;
  if (currentBulbMode === 'night') {
    baseIntensity = 1.5;
    baseOpacity = 0.70;
    baseEmissive = 2.6;
  } else if (currentBulbMode === 'sunset') {
    baseIntensity = 1.1;
    baseOpacity = 0.55;
    baseEmissive = 2.0;
  }

  streetPointLights.forEach((pl, idx) => {
    const lampNoise = Math.sin(t * 5.0 + idx * 1.3) * 0.03;
    pl.intensity = Math.max(0, baseIntensity * (1 + basePulse + lampNoise));
  });
  streetGlowSprites.forEach((spMat, idx) => {
    const lampNoise = Math.cos(t * 4.2 + idx * 1.7) * 0.03;
    spMat.opacity = Math.max(0, Math.min(1, baseOpacity + lampNoise));
  });
  streetBulbMaterials.forEach((bMat, idx) => {
    const lampNoise = Math.sin(t * 4.5 + idx * 1.5) * 0.04;
    bMat.emissiveIntensity = baseEmissive * (1 + lampNoise);
  });
}

/**
 * Updates avatar personal point light and aura breathing in night / sunset modes.
 * @param {number} t - Time in seconds
 */
export function updateAvatarBreathingLights(t) {
  context.playerMeshes.forEach((mesh, idx) => {
    const ud = mesh?.userData;
    if (!ud?.avatarLight) return;
    if (currentBulbMode === 'night') {
      const pulse = Math.sin(t * 3.2 + idx * 1.5) * 0.12;
      ud.avatarLight.intensity = Math.max(0, 1.4 * (1 + pulse));
      if (ud.groundAura) ud.groundAura.material.opacity = Math.max(0, 0.45 * (1 + pulse * 0.6));
    } else if (currentBulbMode === 'sunset') {
      const pulse = Math.sin(t * 2.8 + idx * 1.5) * 0.08;
      ud.avatarLight.intensity = Math.max(0, 0.65 * (1 + pulse));
      if (ud.groundAura) ud.groundAura.material.opacity = Math.max(0, 0.22 * (1 + pulse * 0.5));
    } else {
      ud.avatarLight.intensity = 0.0;
      if (ud.groundAura) ud.groundAura.material.opacity = 0.0;
    }
  });
}

/**
 * Dynamic block illumination in night / sunset mode (pressed tiles, player presence, soft ground halo).
 * @param {number} t - Time in seconds
 */
export function updateTileIlluminationsAndPressLight(t) {
  const isNightBulb = (currentBulbMode === 'night');
  const isSunsetBulb = (currentBulbMode === 'sunset');
  const nightFactor = isNightBulb ? 1.0 : (isSunsetBulb ? 0.35 : 0.0);

  let maxIllumTileId = null;
  let maxIllumVal = 0;

  BOARD_TILES.forEach(tile => {
    const state2 = context.activeTileDepressions[tile.id];
    const mesh = context.tilesMeshMap[tile.id];
    const pool = context.tileGroundLightPools[tile.id];
    let illumData = context.activeTileIlluminations[tile.id];
    if (!illumData) {
      illumData = context.activeTileIlluminations[tile.id] = { currentIllum: 0 };
    }
    if (!mesh) return;

    if (nightFactor <= 0.001) {
      if (illumData.currentIllum > 0.001) {
        illumData.currentIllum *= 0.82;
        if (illumData.currentIllum < 0.001) illumData.currentIllum = 0;
      }
      if (pool) pool.visible = false;
      const topMat = mesh.userData?.topMat || (Array.isArray(mesh.material) ? mesh.material[2] : null);
      const sideMat = mesh.userData?.sideMat || (Array.isArray(mesh.material) ? mesh.material[0] : null);
      if (topMat && topMat.emissiveIntensity > 0) {
        topMat.emissive.setHex(0x000000);
        topMat.emissiveIntensity = 0;
      }
      if (sideMat && sideMat.emissiveIntensity > 0) {
        sideMat.emissive.setHex(0x000000);
        sideMat.emissiveIntensity = 0;
      }
      return;
    }

    const propState = gameState.properties[tile.id] || null;
    const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
    const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
    const lightPlayerAccent = ownerTheme ? getLightPlayerAccent(ownerTheme.colorHex, 0.40) : null;

    const frame = context.tileBorderFrames[tile.id];
    const topMat = mesh.userData?.topMat || (Array.isArray(mesh.material) ? mesh.material[2] : null);
    const sideMat = mesh.userData?.sideMat || (Array.isArray(mesh.material) ? mesh.material[0] : null);

    // Ensure card top face is never washed out to full white: keep top face emissive 0
    if (topMat && topMat.emissiveIntensity > 0) {
      topMat.emissive.setHex(0x000000);
      topMat.emissiveIntensity = 0;
    }

    // Check if any active player is on this tile or currently landing on it
    const hasPlayer = (gameState.players && gameState.players.some(p => !p.bankrupt && p.position === tile.id)) || (movingHopDestTileId === tile.id);

    // Calculate press depth ratio (0 when at rest, 1.0 when fully depressed)
    const pressOffset = state2 ? state2.currentOffset : 0;
    const pressRatio = Math.min(1.0, Math.max(0, -pressOffset / 0.16));

    let targetIllum = 0;
    if (hasPlayer) {
      targetIllum = (0.20 + pressRatio * 0.80) * nightFactor;
    } else if (pressRatio > 0.05) {
      targetIllum = pressRatio * 0.40 * nightFactor;
    }

    illumData.currentIllum += (targetIllum - illumData.currentIllum) * 0.28;
    const illum = illumData.currentIllum;

    if (illum > maxIllumVal) {
      maxIllumVal = illum;
      maxIllumTileId = tile.id;
    }

    // 1. Illuminate Border in Glass Light Accent for Bought Tiles
    if (isNightBulb && isOwned && lightPlayerAccent) {
      if (frame && frame.userData?.borderMat) {
        frame.visible = true;
        frame.userData.borderMat.color.setStyle(lightPlayerAccent);
        frame.userData.borderMat.emissive.setStyle(lightPlayerAccent);
        frame.userData.borderMat.emissiveIntensity = 0.85 + pressRatio * 0.60;
      }
      if (sideMat) {
        sideMat.color.setStyle(lightPlayerAccent);
        sideMat.emissive.setStyle(lightPlayerAccent);
        sideMat.emissiveIntensity = 0.50 + pressRatio * 0.35;
      }
    } else if (isSunsetBulb && isOwned && lightPlayerAccent) {
      if (frame && frame.userData?.borderMat) {
        frame.visible = true;
        frame.userData.borderMat.color.setStyle(lightPlayerAccent);
        frame.userData.borderMat.emissive.setStyle(lightPlayerAccent);
        frame.userData.borderMat.emissiveIntensity = 0.45 + pressRatio * 0.35;
      }
      if (sideMat) {
        sideMat.color.setStyle(lightPlayerAccent);
        sideMat.emissive.setStyle(lightPlayerAccent);
        sideMat.emissiveIntensity = 0.25 + pressRatio * 0.20;
      }
    } else {
      if (frame) frame.visible = false;
      if (sideMat) {
        if (pressRatio > 0.05 && nightFactor > 0.01) {
          sideMat.emissive.setHex(0xffeedd);
          sideMat.emissiveIntensity = pressRatio * 0.35;
        } else {
          sideMat.emissive.setHex(0x000000);
          sideMat.emissiveIntensity = 0;
        }
      }
    }

    // 2. Soft Ground Halo Light Pool (around perimeter on street/grass)
    if (pool) {
      if (illum > 0.05 && nightFactor > 0.01) {
        pool.visible = true;
        if (isOwned && lightPlayerAccent) {
          pool.material.color.setStyle(lightPlayerAccent);
        } else {
          pool.material.color.setHex(0xffeedd);
        }
        pool.material.opacity = (0.12 + pressRatio * 0.38) * nightFactor;
        const poolScale = 1.0 + pressRatio * 0.10;
        pool.scale.set(poolScale, poolScale, 1);
      } else {
        pool.visible = false;
        pool.material.opacity = 0;
      }
    }
  });

  // 3. Dynamic Soft PointLight only on final resting touchdown or click
  if (context.tilePressPointLight) {
    if (maxIllumVal > 0.25 && maxIllumTileId !== null && gameState.phase !== 'MOVING' && nightFactor > 0.01) {
      const pos = getTileWorldPosition(maxIllumTileId);
      const pressOffset = context.activeTileDepressions[maxIllumTileId]?.currentOffset ?? 0;
      context.tilePressPointLight.position.set(pos.x, BASE_TILE_Y + 1.2 + pressOffset, pos.z);
      const propState = gameState.properties[maxIllumTileId] || null;
      const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
      const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
      const lightCol = ownerTheme ? getLightPlayerAccent(ownerTheme.colorHex, 0.40) : null;
      if (lightCol) {
        context.tilePressPointLight.color.setStyle(lightCol);
      } else {
        context.tilePressPointLight.color.setHex(0xffeedd);
      }
      context.tilePressPointLight.intensity = Math.min(0.40, maxIllumVal * 0.40);
      context.tilePressPointLight.visible = true;
    } else {
      context.tilePressPointLight.intensity = 0;
      context.tilePressPointLight.visible = false;
    }
  }
}

