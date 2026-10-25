/**
 * three/core/lighting/lamps.js
 * Builds ambient/sun directional illumination and 3D street lamp structures with filaments and lanterns.
 */

import * as THREE from 'three';
import { context } from '../context.js';
import { matchSettings } from '../../../game/state.js';
import { getSoftBloomTexture, getGroundPoolTexture, getBeamGradientTexture } from './textures.js';
import {
  streetBulbMaterials,
  streetFilamentMaterials,
  streetGlassMaterials,
  streetGlowSprites,
  streetGroundLightPools,
  streetLightBeams,
  streetPointLights,
  streetLampsGroup,
  setStreetLampsGroup,
  currentBulbMode
} from './state.js';
import { setBulbLightingTheme } from './themes.js';

/**
 * Builds the primary ambient and directional sun lights for the Three.js scene.
 */
export function buildMainDirectionalAndAmbientLights(scene) {
  context.ambientLight = new THREE.AmbientLight(0xfffbf2, 0.50);
  scene.add(context.ambientLight);

  // Subtle warm sky / cool ground rim hemisphere light to make plinth and building silhouettes pop
  context.hemiLight = new THREE.HemisphereLight(0xfff8ee, 0x334155, 0.42);
  context.hemiLight.position.set(0, 40, 0);
  scene.add(context.hemiLight);

  context.dirLight = new THREE.DirectionalLight(0xfffaee, 1.28);
  context.dirLight.position.set(22, 34, 18);
  context.dirLight.castShadow = true;
  context.dirLight.shadow.mapSize.width = 1024;
  context.dirLight.shadow.mapSize.height = 1024;
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
  const group = new THREE.Group();
  setStreetLampsGroup(group);
  boardGroup.add(group);

  const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.62 });
  const socketMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.82 });
  const brassTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.22, metalness: 0.88 });

  const lampPositions = [
    // 2 Elegant Garden Promenade Gateway Lanterns
    { x: -5.6, z: 0, rot: Math.PI / 2, isGarden: true, hasPointLight: true },
    { x: 5.6, z: 0, rot: -Math.PI / 2, isGarden: true, hasPointLight: true },

    // 4 Inner Street Corners (Lighting the inner road & tiles)
    { x: -8.5, z: -8.5, rot: Math.PI / 4, hasPointLight: true },
    { x: 8.5, z: -8.5, rot: -Math.PI / 4, hasPointLight: true },
    { x: -8.5, z: 8.5, rot: 3 * Math.PI / 4, hasPointLight: true },
    { x: 8.5, z: 8.5, rot: -3 * Math.PI / 4, hasPointLight: true },

    // 4 Road Sidewalk Street Lamps (One along each board side road)
    { x: 0, z: -10.8, rot: 0, hasPointLight: true },
    { x: 0, z: 10.8, rot: Math.PI, hasPointLight: true },
    { x: -10.8, z: 0, rot: Math.PI / 2, hasPointLight: true },
    { x: 10.8, z: 0, rot: -Math.PI / 2, hasPointLight: true },

    // 4 Outer Board Corners (Beside START, ISLAND, FESTIVAL, AIRPORT)
    { x: -13.5, z: -13.5, rot: Math.PI / 4, hasPointLight: true },
    { x: 13.5, z: -13.5, rot: -Math.PI / 4, hasPointLight: true },
    { x: -13.5, z: 13.5, rot: 3 * Math.PI / 4, hasPointLight: true },
    { x: 13.5, z: 13.5, rot: -3 * Math.PI / 4, hasPointLight: true }
  ];

  lampPositions.forEach((pos) => {
    const lamp = new THREE.Group();
    lamp.position.set(pos.x, 0.35, pos.z);
    lamp.rotation.y = pos.rot;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.26, 8), postMat);
    base.position.y = 0.13;
    lamp.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 1.6, 8), postMat);
    pole.position.y = 0.93;
    lamp.add(pole);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.06, 8), brassTrimMat);
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

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), brassTrimMat);
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
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.position.set(0, 1.95, 0);
    glowSprite.scale.set(2.4, 2.4, 1.0);
    lamp.add(glowSprite);
    streetGlowSprites.push(glowMat);

    const beamGeo = new THREE.CylinderGeometry(0.18, 1.85, 1.7, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      map: getBeamGradientTexture(),
      color: 0xfef08a,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 0.90;
    lamp.add(beam);
    streetLightBeams.push(beamMat);

    const poolGeo = new THREE.CircleGeometry(2.4, 32);
    const poolMat = new THREE.MeshBasicMaterial({
      map: getGroundPoolTexture(),
      color: 0xfffaed,
      transparent: true,
      opacity: 0.40,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const groundPool = new THREE.Mesh(poolGeo, poolMat);
    groundPool.rotation.x = -Math.PI / 2;
    groundPool.position.y = 0.14;
    lamp.add(groundPool);
    streetGroundLightPools.push(poolMat);

    if (pos.hasPointLight) {
      const pl = new THREE.PointLight(0xfef08a, 1.4, 7.0, 1.8);
      pl.position.set(0, 1.95, 0);
      pl.visible = true;
      lamp.add(pl);
      streetPointLights.push(pl);
    }

    group.add(lamp);
  });

  // Apply bulb & lamp state matching the active board style and atmospheric mode
  setBulbLightingTheme(currentBulbMode, matchSettings?.boardStyle || 'wood');
}
