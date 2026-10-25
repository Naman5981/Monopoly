/**
 * three/board/rajasthan/caravan.js
 * Resting Thar Desert Camel and Royal Caravan Shamiana Camp.
 */

import * as THREE from 'three';
import { RAJASTHAN_PALETTE } from './palette.js';

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
