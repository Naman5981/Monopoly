/**
 * three/board/rajasthan/architecture.js
 * Architectural structures: Chhatri cupolas, Jharokha balconies, and the Amber & Jaisalmer Palace Citadel.
 */

import * as THREE from 'three';
import { RAJASTHAN_PALETTE } from './palette.js';

/**
 * Creates an authentic, gracefully proportioned Rajput Chhatri.
 * Features stepped octagonal plinth, 4 slender fluted pillars with bracket capitals,
 * a projecting chhajja stone eave, a fluted onion cupola, and a 24K gold kalash finial.
 *
 * @param {number} scale
 * @param {number} stoneColor - Sandstone tone
 * @param {number} domeColor - Cupola dome tone
 * @returns {THREE.Group}
 */
export function createRajasthanChhatri3D(scale = 1.0, stoneColor = RAJASTHAN_PALETTE.stoneGold, domeColor = RAJASTHAN_PALETTE.stoneGold) {
  const chhatri = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: stoneColor,
    roughness: 0.42,
    metalness: 0.08
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneWarm,
    roughness: 0.50,
    metalness: 0.06
  });
  const domeMat = new THREE.MeshStandardMaterial({
    color: domeColor,
    roughness: 0.38,
    metalness: 0.12
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.royalGold,
    roughness: 0.22,
    metalness: 0.88
  });

  // 1. Stepped Plinth Base (Octagonal / Beveled Platform)
  const base1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.82 * scale, 0.08 * scale, 0.82 * scale),
    darkStoneMat
  );
  base1.position.y = 0.04 * scale;
  base1.castShadow = true;
  base1.receiveShadow = true;

  const base2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.70 * scale, 0.06 * scale, 0.70 * scale),
    stoneMat
  );
  base2.position.y = 0.10 * scale;
  base2.castShadow = true;
  base2.receiveShadow = true;
  chhatri.add(base1, base2);

  // 2. Four Slender Fluted Pillars with Bracket Capitals (Todas)
  const pillarHeight = 0.70 * scale;
  const pillarRadius = 0.038 * scale;
  const pOffset = 0.25 * scale;
  const pillarGeo = new THREE.CylinderGeometry(pillarRadius, pillarRadius * 1.15, pillarHeight, 8);

  const pillarCoords = [
    { x: -pOffset, z: -pOffset },
    { x: pOffset, z: -pOffset },
    { x: pOffset, z: pOffset },
    { x: -pOffset, z: pOffset }
  ];

  pillarCoords.forEach(pos => {
    const pillar = new THREE.Mesh(pillarGeo, stoneMat);
    pillar.position.set(pos.x, (0.13 + pillarHeight / 2) * scale, pos.z);
    pillar.castShadow = true;
    chhatri.add(pillar);

    // Carved capital bracket (toda)
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.12 * scale, 0.06 * scale, 0.12 * scale),
      darkStoneMat
    );
    cap.position.set(pos.x, (0.13 + pillarHeight) * scale, pos.z);
    cap.castShadow = true;
    chhatri.add(cap);
  });

  // 3. Projecting Chhajja (Sloping Stone Sunshade Eave)
  const eaveGeo = new THREE.CylinderGeometry(0.56 * scale, 0.44 * scale, 0.07 * scale, 8);
  const eave = new THREE.Mesh(eaveGeo, darkStoneMat);
  eave.position.y = (0.13 + pillarHeight + 0.04) * scale;
  eave.castShadow = true;
  chhatri.add(eave);

  // 4. Fluted Lotus Cupola Dome
  const domeBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.40 * scale, 0.42 * scale, 0.06 * scale, 12),
    stoneMat
  );
  domeBase.position.y = (0.13 + pillarHeight + 0.09) * scale;
  chhatri.add(domeBase);

  const domeGeo = new THREE.SphereGeometry(0.38 * scale, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = (0.13 + pillarHeight + 0.11) * scale;
  dome.castShadow = true;
  chhatri.add(dome);

  // 5. Golden Kalash Finial with Spire
  const kalashUrn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03 * scale, 0.08 * scale, 0.14 * scale, 8),
    goldMat
  );
  kalashUrn.position.y = (0.13 + pillarHeight + 0.11 + 0.38 + 0.07) * scale;
  kalashUrn.castShadow = true;

  const kalashSpire = new THREE.Mesh(
    new THREE.ConeGeometry(0.04 * scale, 0.16 * scale, 8),
    goldMat
  );
  kalashSpire.position.y = (0.13 + pillarHeight + 0.11 + 0.38 + 0.19) * scale;
  kalashSpire.castShadow = true;

  chhatri.add(kalashUrn, kalashSpire);
  return chhatri;
}

/**
 * Creates an ornate Rajput Jharokha balcony with carved stone corbel brackets,
 * perforated lattice screen (jali), and a scalloped arch hood canopy.
 * @param {number} scale
 * @returns {THREE.Group}
 */
export function createRajasthanJharokha3D(scale = 1.0) {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneGold,
    roughness: 0.42,
    metalness: 0.08
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneWarm,
    roughness: 0.52
  });

  // Balcony floor projection
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(0.60 * scale, 0.08 * scale, 0.30 * scale),
    stoneMat
  );
  floor.castShadow = true;
  g.add(floor);

  // Supporting carved corbel brackets
  [-0.20, 0.20].forEach(bx => {
    const bracket = new THREE.Mesh(
      new THREE.ConeGeometry(0.08 * scale, 0.22 * scale, 4),
      darkStoneMat
    );
    bracket.rotation.x = Math.PI;
    bracket.position.set(bx * scale, -0.11 * scale, 0.05 * scale);
    g.add(bracket);
  });

  // Carved Jali front screen panel
  const jali = new THREE.Mesh(
    new THREE.BoxGeometry(0.56 * scale, 0.34 * scale, 0.06 * scale),
    darkStoneMat
  );
  jali.position.set(0, 0.18 * scale, 0.12 * scale);
  jali.castShadow = true;
  g.add(jali);

  // Scalloped hood canopy
  const hood = new THREE.Mesh(
    new THREE.ConeGeometry(0.36 * scale, 0.18 * scale, 6),
    stoneMat
  );
  hood.position.set(0, 0.42 * scale, 0.07 * scale);
  hood.castShadow = true;
  g.add(hood);

  return g;
}

/**
 * Builds the Majestic Amber & Jaisalmer Palace Citadel.
 * Positioned in the North-West quadrant, well clear of the central rolling arena.
 * Features tiered sandstone facades, carved jharokha balconies, arched Sun Gate,
 * corner bastions with domed chhatris, and the royal saffron flag.
 * @returns {THREE.Group}
 */
export function createRajasthanPalaceCitadel3D() {
  const palace = new THREE.Group();

  const sandMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneGold,
    roughness: 0.45,
    metalness: 0.08
  });
  const lightStoneMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneLight,
    roughness: 0.40,
    metalness: 0.10
  });
  const darkSandMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.stoneWarm,
    roughness: 0.52
  });
  const rockMat = new THREE.MeshLambertMaterial({
    color: 0x8a582d,
    flatShading: true
  });
  const teakMat = new THREE.MeshStandardMaterial({
    color: RAJASTHAN_PALETTE.teakWood,
    roughness: 0.65
  });

  // 1. Elevated Natural Sandstone Foundation Plinth
  const hillPlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.6, 0.55, 10),
    rockMat
  );
  hillPlinth.scale.set(1.35, 1.0, 1.1);
  hillPlinth.position.set(0, 0.28, 0);
  hillPlinth.receiveShadow = true;
  palace.add(hillPlinth);

  // 2. Lower Fortress Rampart Citadel (Storey 1)
  const lowerCitadel = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 1.15, 2.6),
    sandMat
  );
  lowerCitadel.position.set(0, 1.05, 0);
  lowerCitadel.castShadow = true;
  lowerCitadel.receiveShadow = true;
  palace.add(lowerCitadel);

  // Parapet coping with crenellations (kanguras)
  const parapet = new THREE.Mesh(
    new THREE.BoxGeometry(3.72, 0.16, 2.72),
    darkSandMat
  );
  parapet.position.set(0, 1.68, 0);
  parapet.castShadow = true;
  palace.add(parapet);

  // 3. Middle Palace Keep (Storey 2 - Hawa Mahal style jharokha tier)
  const midCitadel = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.95, 1.8),
    lightStoneMat
  );
  midCitadel.position.set(-0.15, 2.15, 0);
  midCitadel.castShadow = true;
  midCitadel.receiveShadow = true;
  palace.add(midCitadel);

  // 4. Upper Royal Crown Pavilion (Storey 3)
  const topCitadel = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.75, 1.2),
    sandMat
  );
  topCitadel.position.set(-0.35, 2.95, -0.1);
  topCitadel.castShadow = true;
  palace.add(topCitadel);

  // 5. Fortified Corner Bastions (Watchtowers)
  const bastionGeo = new THREE.CylinderGeometry(0.58, 0.72, 1.6, 10);
  const bastionPositions = [
    { x: -1.75, z: -1.25 },
    { x: 1.75, z: -1.25 },
    { x: 1.75, z: 1.25 },
    { x: -1.75, z: 1.25 }
  ];

  bastionPositions.forEach(bp => {
    const bastion = new THREE.Mesh(bastionGeo, sandMat);
    bastion.position.set(bp.x, 1.15, bp.z);
    bastion.castShadow = true;
    bastion.receiveShadow = true;
    palace.add(bastion);

    // Bastion Chhatri atop watchtower
    const bChhatri = createRajasthanChhatri3D(0.68, RAJASTHAN_PALETTE.stoneGold, RAJASTHAN_PALETTE.stoneLight);
    bChhatri.position.set(bp.x, 1.95, bp.z);
    palace.add(bChhatri);
  });

  // 6. Central Grand Palace Chhatri (Highest spire of the citadel)
  const royalChhatri = createRajasthanChhatri3D(1.05, RAJASTHAN_PALETTE.stoneLight, RAJASTHAN_PALETTE.royalGold);
  royalChhatri.position.set(-0.35, 3.32, -0.1);
  palace.add(royalChhatri);

  // 7. Carved Rajput Jharokha Balconies
  const jharokhaFront = createRajasthanJharokha3D(0.92);
  jharokhaFront.position.set(0.45, 1.45, 1.32);
  palace.add(jharokhaFront);

  const jharokhaUpper = createRajasthanJharokha3D(0.78);
  jharokhaUpper.position.set(-0.65, 2.22, 0.92);
  palace.add(jharokhaUpper);

  // 8. Suraj Pol (Sun Gate Arched Fortress Entry)
  const gateArch = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.95, 0.42),
    darkSandMat
  );
  gateArch.position.set(0, 0.75, 1.36);
  gateArch.castShadow = true;
  palace.add(gateArch);

  const gateDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.78, 0.10),
    teakMat
  );
  gateDoor.position.set(0, 0.65, 1.46);
  palace.add(gateDoor);

  // Gateway entry ramp
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.14, 1.1),
    sandMat
  );
  ramp.position.set(0, 0.32, 1.95);
  ramp.rotation.x = 0.14;
  ramp.receiveShadow = true;
  palace.add(ramp);

  // 9. Royal Saffron Bhagwa Banner of Rajasthan
  const flagpole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.028, 1.75, 8),
    new THREE.MeshStandardMaterial({ color: RAJASTHAN_PALETTE.royalGold, metalness: 0.85, roughness: 0.22 })
  );
  flagpole.position.set(-0.35, 4.55, -0.1);
  flagpole.castShadow = true;

  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(0.92, -0.24);
  flagShape.lineTo(0, -0.48);
  flagShape.closePath();

  const flagGeo = new THREE.ShapeGeometry(flagShape);
  const flagMat = new THREE.MeshLambertMaterial({
    color: RAJASTHAN_PALETTE.royalSaffron,
    side: THREE.DoubleSide
  });
  const pennant = new THREE.Mesh(flagGeo, flagMat);
  pennant.position.set(-0.34, 5.30, -0.1);
  pennant.rotation.y = 0.25;
  pennant.castShadow = true;

  palace.add(flagpole, pennant);
  return palace;
}
