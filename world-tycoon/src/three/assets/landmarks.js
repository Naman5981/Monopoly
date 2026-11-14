/**
 * three/assets/landmarks.js
 * 3D architectural models for the 4 corner board landmarks:
 * - Tile 0: Start GO Archway
 * - Tile 8: Tropical Castaway Island with Watchtower & Palms
 * - Tile 16: Festival Concert Plaza with Golden Jackpot Trophy Cup & Stage Truss
 * - Tile 24: World Tour Aviation Terminal with Runway Tarmac & Passenger Jetliner
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { getTileWorldPosition, BASE_BUILDING_Y } from '../board/coords.js';
import { festivalBalloons } from '../environment/clouds.js';

function tagLandmarkTileId(group, tileId) {
  if (!group) return;
  group.userData.tileId = tileId;
  group.traverse(child => {
    if (child.isMesh || child.isGroup) {
      child.userData.tileId = tileId;
    }
  });
}

export function buildIslandLandmark3D(pos, boardGroup) {
  const g = new THREE.Group();
  g.position.set(pos.x, BASE_BUILDING_Y, pos.z);

  // 1. Deep Ocean Basin & Translucent Turquoise Coastal Shallows (Full 2.92x2.92 tile coverage)
  const deepOceanMat = new THREE.MeshStandardMaterial({
    color: 0x0369a1,
    roughness: 0.15,
    metalness: 0.10
  });
  const oceanBasin = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.04, 2.92), deepOceanMat);
  oceanBasin.position.y = 0.02;
  g.add(oceanBasin);

  const shallowWaterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.12,
    metalness: 0.05,
    transparent: true,
    opacity: 0.65
  });
  const shallowCove = new THREE.Mesh(new THREE.BoxGeometry(2.78, 0.02, 2.78), shallowWaterMat);
  shallowCove.position.y = 0.045;
  g.add(shallowCove);

  // White surf foam fringe along shoreline
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.75 });
  const foamFringe = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.28, 0.01, 24), foamMat);
  foamFringe.position.set(-0.05, 0.052, 0.05);
  foamFringe.scale.set(1.08, 1.0, 0.95);
  g.add(foamFringe);

  // 2. Organic Curving Island Landmass (Natural sand shores rising to lush tropical lawn)
  const sandMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.88,
    metalness: 0.02
  });
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.72,
    flatShading: true
  });

  // Main natural sand atoll
  const mainBeach = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.18, 0.06, 24), sandMat);
  mainBeach.position.set(-0.06, 0.065, 0.04);
  mainBeach.scale.set(1.06, 1.0, 0.94);
  mainBeach.receiveShadow = true;

  // Secondary sandy cape extending toward the pier
  const sandSpit = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.70, 0.05, 16), sandMat);
  sandSpit.position.set(0.58, 0.062, 0.35);
  sandSpit.scale.set(1.2, 1.0, 0.8);
  sandSpit.receiveShadow = true;

  // Elevated central/rear tropical grass knoll
  const mainGrass = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.90, 0.04, 20), grassMat);
  mainGrass.position.set(-0.08, 0.095, 0.06);
  mainGrass.scale.set(1.04, 1.0, 0.96);
  mainGrass.receiveShadow = true;

  g.add(mainBeach, sandSpit, mainGrass);

  // 3. Weathered Castaway Wooden Pier / Jetty extending into the ocean (x: 0.80, z: 0.35)
  const jettyGroup = new THREE.Group();
  jettyGroup.position.set(0.82, 0.05, 0.35);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75, flatShading: true });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });

  // Pier deck planks
  for (let p = 0; p < 5; p++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.34), woodMat);
    plank.position.set(p * 0.11, 0.045, 0);
    plank.castShadow = true;
    jettyGroup.add(plank);
  }

  // Wooden jetty support pilings driven into the seabed
  [
    { x: 0.05, z: -0.14 },
    { x: 0.05, z: 0.14 },
    { x: 0.45, z: -0.14 },
    { x: 0.45, z: 0.14 }
  ].forEach(piling => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.16, 6), darkWoodMat);
    post.position.set(piling.x, 0.02, piling.z);
    jettyGroup.add(post);
  });

  // Nautical rescue lifebuoy hanging at the end of the pier
  const buoyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 });
  const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.026, 8, 16), buoyMat);
  buoy.position.set(0.48, 0.08, 0.16);
  buoy.rotation.y = Math.PI / 4;
  jettyGroup.add(buoy);
  g.add(jettyGroup);

  // 4. Beached Wooden Castaway Rowboat resting on the sand shore (x: 0.45, z: -0.72)
  const boatGroup = new THREE.Group();
  boatGroup.position.set(0.45, 0.075, -0.72);
  boatGroup.rotation.y = -0.35;
  boatGroup.rotation.z = 0.08;

  const hullMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.7 });
  const boatHull = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.26), hullMat);
  boatHull.castShadow = true;
  const boatBench = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.24), darkWoodMat);
  boatBench.position.set(0, 0.03, 0);

  // Wooden oar resting across the boat
  const oarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
  const oarHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6), oarMat);
  oarHandle.rotation.z = Math.PI / 3;
  oarHandle.position.set(0.10, 0.08, 0.05);
  boatGroup.add(boatHull, boatBench, oarHandle);
  g.add(boatGroup);

  // 5. Twin Tropical Coconut Palms in outer corner (x: -0.75, z: 0.75 - ZERO pawn occlusion)
  const palmGroup = new THREE.Group();
  palmGroup.position.set(-0.75, 0.09, 0.75);

  const barkMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.8, flatShading: true });
  const leafMatA = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6, flatShading: true });
  const leafMatB = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6, flatShading: true });
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.75 });

  // Main Tall Palm
  let trunkY = 0;
  for (let i = 0; i < 4; i++) {
    const segH = 0.28;
    const topR = 0.080 - i * 0.008;
    const botR = 0.100 - i * 0.008;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(topR, botR, segH, 7), barkMat);
    seg.position.set(-i * 0.04, trunkY + segH / 2, i * 0.04);
    seg.rotation.z = 0.18;
    seg.rotation.x = -0.18;
    seg.castShadow = true;
    palmGroup.add(seg);
    trunkY += segH * 0.90;
  }
  const crownGroup = new THREE.Group();
  crownGroup.position.set(-0.16, trunkY, 0.16);
  for (let f = 0; f < 6; f++) {
    const ang = (f * Math.PI * 2) / 6;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.85, 4), (f % 2 === 0) ? leafMatA : leafMatB);
    frond.rotation.z = Math.PI / 2 - 0.32;
    frond.rotation.y = ang;
    frond.position.set(Math.cos(ang) * 0.38, -0.05, Math.sin(ang) * 0.38);
    frond.scale.set(0.65, 1.0, 0.22);
    frond.castShadow = true;
    crownGroup.add(frond);
  }
  for (let c = 0; c < 3; c++) {
    const nut = new THREE.Mesh(new THREE.DodecahedronGeometry(0.055, 0), nutMat);
    const ca = (c * Math.PI * 2) / 3;
    nut.position.set(Math.cos(ca) * 0.07, -0.03, Math.sin(ca) * 0.07);
    crownGroup.add(nut);
  }
  palmGroup.add(crownGroup);

  // Smaller Companion Palm (Angled naturally toward the beach)
  const smallPalmGroup = new THREE.Group();
  smallPalmGroup.position.set(0.24, 0, -0.18);
  let sTrunkY = 0;
  for (let j = 0; j < 3; j++) {
    const segH = 0.22;
    const sSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065 - j * 0.006, 0.080 - j * 0.006, segH, 6), barkMat);
    sSeg.position.set(j * 0.03, sTrunkY + segH / 2, -j * 0.02);
    sSeg.rotation.z = -0.15;
    sSeg.castShadow = true;
    smallPalmGroup.add(sSeg);
    sTrunkY += segH * 0.90;
  }
  const sCrown = new THREE.Group();
  sCrown.position.set(0.09, sTrunkY, -0.06);
  for (let sf = 0; sf < 5; sf++) {
    const ang = (sf * Math.PI * 2) / 5;
    const sFrond = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.65, 4), leafMatB);
    sFrond.rotation.z = Math.PI / 2 - 0.30;
    sFrond.rotation.y = ang;
    sFrond.position.set(Math.cos(ang) * 0.28, -0.04, Math.sin(ang) * 0.28);
    sFrond.scale.set(0.60, 1.0, 0.20);
    sCrown.add(sFrond);
  }
  smallPalmGroup.add(sCrown);
  palmGroup.add(smallPalmGroup);
  g.add(palmGroup);

  // 6. Low-Poly Coastal Sea Stack / Granite Rocks breaking the waves (x: -0.95, z: -0.55)
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, flatShading: true });
  [
    { x: -0.95, y: 0.14, z: -0.55, r: 0.18, sy: 1.4 },
    { x: -0.80, y: 0.09, z: -0.72, r: 0.12, sy: 1.0 },
    { x: 0.88, y: 0.07, z: -0.45, r: 0.10, sy: 0.8 }
  ].forEach(rk => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rk.r, 0), rockMat);
    rock.position.set(rk.x, rk.y, rk.z);
    rock.scale.set(1.2, rk.sy, 1.0);
    rock.castShadow = true;
    g.add(rock);
  });

  // 7. Rustic Wooden Signpost "ISLAND JAIL" on shoreline margin (x: -0.35, z: 0.85)
  const signGroup = new THREE.Group();
  signGroup.position.set(-0.35, 0.09, 0.85);

  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.60, 6), darkWoodMat);
  signPost.position.y = 0.30;
  signPost.castShadow = true;

  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.035), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 }));
  signBoard.position.set(0, 0.50, 0.03);
  signBoard.rotation.z = -0.05;

  const lockMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });
  const padlock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.04), lockMat);
  padlock.position.set(0, 0.32, 0.04);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 6, 12, Math.PI), lockMat);
  shackle.position.set(0, 0.37, 0.04);
  signGroup.add(signPost, signBoard, padlock, shackle);
  g.add(signGroup);

  // 8. Coral Starfish & Sea Shells on warm sand
  const starfishMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 });
  const starfish = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.015, 5), starfishMat);
  starfish.rotation.x = Math.PI / 2;
  starfish.position.set(0.18, 0.096, -0.65);
  g.add(starfish);

  boardGroup.add(g);
  return g;
}

export function buildStartLandmark3D(pos, boardGroup) {
  const g = new THREE.Group();
  g.position.set(pos.x, BASE_BUILDING_Y, pos.z);

  // 1. Full-Tile Square Starting Grand Avenue Plaza (Spans 2.92x2.92 cleanly to tile edge)
  const marbleBaseMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.22,
    metalness: 0.08
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.25,
    metalness: 0.88
  });
  const redTrackMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.50
  });
  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.22,
    metalness: 0.85
  });

  const plazaBase = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.05, 2.92), marbleBaseMat);
  plazaBase.position.y = 0.025;
  plazaBase.receiveShadow = true;

  const plazaTrim = new THREE.Mesh(new THREE.BoxGeometry(2.78, 0.02, 2.78), goldTrimMat);
  plazaTrim.position.y = 0.05;

  const raceTrack = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.02, 2.45), redTrackMat);
  raceTrack.position.y = 0.065;
  raceTrack.receiveShadow = true;

  // Directional Start Arrow Chevron (Points in travel direction -X)
  const arrowStem = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.015, 0.28), arrowMat);
  arrowStem.position.set(0.10, 0.078, 0);
  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.55, 3), arrowMat);
  arrowHead.rotation.y = -Math.PI / 2;
  arrowHead.position.set(-0.52, 0.078, 0);
  g.add(plazaBase, plazaTrim, raceTrack, arrowStem, arrowHead);

  // 2. Grand Start Archway in outer corner (z: 0.75 - ZERO pawn occlusion)
  const archGroup = new THREE.Group();
  archGroup.position.set(0, 0.08, 0.75);

  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.75 });
  const archMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.22, metalness: 0.85 });
  const finialMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });

  // Twin gilded fluted pillars
  [-0.95, 0.95].forEach(px => {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.32), marbleBaseMat);
    plinth.position.set(px, 0.07, 0);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 1.25, 10), pillarMat);
    pillar.position.set(px, 0.76, 0);
    pillar.castShadow = true;
    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.28), archMat);
    capital.position.set(px, 1.44, 0);
    const sphereFinial = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 12), finialMat);
    sphereFinial.position.set(px, 1.58, 0);
    archGroup.add(plinth, pillar, capital, sphereFinial);
  });

  // Gilded Start Header Crossbeam
  const header = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.32, 0.26), archMat);
  header.position.set(0, 1.44, 0);
  header.castShadow = true;

  const crownPlate = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.14, 0.28), marbleBaseMat);
  crownPlate.position.set(0, 1.67, 0);

  const centerGem = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), finialMat);
  centerGem.position.set(0, 1.78, 0);

  archGroup.add(header, crownPlate, centerGem);
  g.add(archGroup);

  // 3. Perimeter Celebration Lanterns
  const lanternBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.85
  });

  [
    [-1.25, -0.45],
    [1.25, -0.45]
  ].forEach(([lx, lz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.42, 6), lanternBodyMat);
    post.position.set(lx, 0.26, lz);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), bulbMat);
    bulb.position.set(lx, 0.50, lz);
    g.add(post, bulb);
  });

  boardGroup.add(g);
  return g;
}

export function buildFlightTerminalLandmark3D(pos, boardGroup) {
  const g = new THREE.Group();
  g.position.set(pos.x, BASE_BUILDING_Y, pos.z);

  // 1. Full-Tile Square International Runway & Tarmac (Spans 2.92x2.92 cleanly to tile edge)
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.70,
    metalness: 0.06
  });
  const taxiwayTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.30,
    metalness: 0.82
  });
  const runwayConcreteMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.58
  });

  const tarmacBase = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.05, 2.92), asphaltMat);
  tarmacBase.position.y = 0.025;
  tarmacBase.receiveShadow = true;

  const taxiwayTrim = new THREE.Mesh(new THREE.BoxGeometry(2.78, 0.02, 2.78), taxiwayTrimMat);
  taxiwayTrim.position.y = 0.05;

  const runwayApron = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.02, 2.45), runwayConcreteMat);
  runwayApron.position.y = 0.065;
  runwayApron.receiveShadow = true;
  g.add(tarmacBase, taxiwayTrim, runwayApron);

  // Runway centerline dashes
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  for (let i = 0; i < 4; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.06), stripeMat);
    dash.position.set(-0.75 + i * 0.50, 0.078, 0.30);
    g.add(dash);
  }

  // Runway threshold markings
  const threshMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  for (let j = 0; j < 3; j++) {
    const thL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.015, 0.05), threshMat);
    thL.position.set(-1.05, 0.078, 0.12 + j * 0.18);
    const thR = thL.clone();
    thR.position.x = 0.75;
    g.add(thL, thR);
  }

  // Runway green / red boundary beacons
  const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  [-1.15, 0.85].forEach((lx, lidx) => {
    [-0.20, 0.85].forEach(lz => {
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 6), lidx === 0 ? greenLightMat : redLightMat);
      beacon.position.set(lx, 0.10, lz);
      g.add(beacon);
    });
  });

  // 2. Sleek Modern Airport Control Tower in outer corner (x: 0.85, z: -0.85 - ZERO pawn occlusion)
  const towerGroup = new THREE.Group();
  towerGroup.position.set(0.85, 0.08, -0.85);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
  const towerPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.20, 12), pillarMat);
  towerPillar.position.y = 0.60;
  towerPillar.castShadow = true;

  const cabGlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.75,
    roughness: 0.10,
    metalness: 0.20
  });
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.32, 8), cabGlassMat);
  cab.position.y = 1.30;
  const cabRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.08, 8), pillarMat);
  cabRoof.position.y = 1.50;
  const radarDish = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.10, 10), new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
  radarDish.rotation.x = Math.PI / 4;
  radarDish.position.set(0, 1.64, 0);
  towerGroup.add(towerPillar, cab, cabRoof, radarDish);
  g.add(towerGroup);

  // Slender windsock on perimeter
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.75, 6), new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
  pole.position.set(-0.95, 0.38, -0.85);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.32, 8), new THREE.MeshLambertMaterial({ color: 0xf97316 }));
  sock.rotation.z = Math.PI / 2 + 0.15;
  sock.position.set(-0.82, 0.72, -0.85);
  g.add(pole, sock);

  // 3. Compact Executive Jet Parked on Taxiway Apron in Outer Margin (ZERO pawn occlusion)
  const planeGroup = new THREE.Group();
  planeGroup.position.set(0.15, 0.18, -0.58);
  planeGroup.rotation.y = -0.22;
  planeGroup.scale.set(0.68, 0.68, 0.68);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.15 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.20, metalness: 0.80 });
  const engineMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 1.40, 12), whiteMat);
  fuselage.rotation.z = Math.PI / 2;
  fuselage.position.y = 0.20;
  fuselage.castShadow = true;

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.34, 12), whiteMat);
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(0.86, 0.20, 0);
  nose.castShadow = true;

  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.22), glassMat);
  cockpit.position.set(0.68, 0.27, 0);

  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.80), whiteMat);
  wingL.position.set(0.04, 0.18, -0.48);
  wingL.rotation.y = -0.20;
  wingL.castShadow = true;
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.80), whiteMat);
  wingR.position.set(0.04, 0.18, 0.48);
  wingR.rotation.y = 0.20;
  wingR.castShadow = true;

  const wletL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.035), blueMat);
  wletL.position.set(-0.05, 0.25, -0.88);
  const wletR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.035), blueMat);
  wletR.position.set(-0.05, 0.25, 0.88);

  [-0.36, 0.36].forEach(ez => {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.30, 8), engineMat);
    eng.rotation.z = Math.PI / 2;
    eng.position.set(0.08, 0.10, ez);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.035), engineMat);
    pylon.position.set(0.08, 0.15, ez);
    planeGroup.add(eng, pylon);
  });

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.42, 0.055), blueMat);
  tailFin.position.set(-0.56, 0.42, 0);
  tailFin.castShadow = true;
  const hStab = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.035, 0.55), whiteMat);
  hStab.position.set(-0.60, 0.58, 0);

  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  [{ x: 0.48, z: 0 }, { x: -0.12, z: -0.20 }, { x: -0.12, z: 0.20 }].forEach(gw => {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 6), engineMat);
    strut.position.set(gw.x, 0.07, gw.z);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 8), wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(gw.x, 0.045, gw.z);
    planeGroup.add(strut, wheel);
  });

  planeGroup.add(fuselage, nose, cockpit, wingL, wingR, wletL, wletR, tailFin, hStab);
  g.add(planeGroup);

  boardGroup.add(g);
  return g;
}

export function buildFestivalPlazaLandmark3D(pos, boardGroup) {
  const g = new THREE.Group();
  g.position.set(pos.x, BASE_BUILDING_Y, pos.z);

  // 1. Full-Tile Square Celebration Plaza Base (Spans 2.92x2.92 cleanly to tile edge)
  const marbleBaseMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.22,
    metalness: 0.08
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.25,
    metalness: 0.88
  });
  const indigoCarpetMat = new THREE.MeshStandardMaterial({
    color: 0x312e81,
    roughness: 0.50
  });
  const goldMotifMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.22,
    metalness: 0.85
  });

  const plazaBase = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.05, 2.92), marbleBaseMat);
  plazaBase.position.y = 0.025;
  plazaBase.receiveShadow = true;

  const plazaTrim = new THREE.Mesh(new THREE.BoxGeometry(2.78, 0.02, 2.78), goldTrimMat);
  plazaTrim.position.y = 0.05;

  const plazaCarpet = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.02, 2.45), indigoCarpetMat);
  plazaCarpet.position.y = 0.065;
  plazaCarpet.receiveShadow = true;

  const centerRosette = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.015, 1.65), goldMotifMat);
  centerRosette.position.y = 0.078;
  centerRosette.rotation.y = Math.PI / 4;
  g.add(plazaBase, plazaTrim, plazaCarpet, centerRosette);

  // 2. Prestigious Expo Armillary Monument in outer corner (x: -0.75, z: -0.75 - ZERO pawn occlusion)
  const expoMonumentGroup = new THREE.Group();
  expoMonumentGroup.position.set(-0.75, 0.08, -0.75);

  const pedestalBase = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.56), marbleBaseMat);
  pedestalBase.position.y = 0.06;
  pedestalBase.castShadow = true;

  const pedestalPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.36, 12), marbleBaseMat);
  pedestalPillar.position.y = 0.28;
  pedestalPillar.castShadow = true;

  const capitalTrim = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.48), goldTrimMat);
  capitalTrim.position.y = 0.48;

  // Celestial Armillary Sphere
  const coreGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 16), goldTrimMat);
  coreGlobe.position.y = 0.72;
  coreGlobe.castShadow = true;

  const equatorRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.020, 8, 24), goldTrimMat);
  equatorRing.rotation.x = Math.PI / 2;
  equatorRing.position.y = 0.72;

  const meridianRing = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.020, 8, 24), goldTrimMat);
  meridianRing.rotation.y = Math.PI / 4;
  meridianRing.position.y = 0.72;

  const starFinial = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), goldTrimMat);
  starFinial.position.y = 1.02;

  expoMonumentGroup.add(pedestalBase, pedestalPillar, capitalTrim, coreGlobe, equatorRing, meridianRing, starFinial);
  g.add(expoMonumentGroup);

  // 3. Two Festive Celebration Flagpoles on outer perimeter
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 });
  const redFlagMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
  const cyanFlagMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4 });

  [
    { x: -1.15, z: -0.35, mat: redFlagMat },
    { x: -0.35, z: -1.15, mat: cyanFlagMat }
  ].forEach(fp => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8), poleMat);
    pole.position.set(fp.x, 0.52, fp.z);
    pole.castShadow = true;

    const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 3), fp.mat);
    pennant.rotation.z = -Math.PI / 2;
    pennant.rotation.y = Math.PI / 4;
    pennant.position.set(fp.x + 0.12, 0.88, fp.z);
    g.add(pole, pennant);
  });

  // 4. Subtle Perimeter Festival Lanterns
  const lanternBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.85
  });

  [
    [-1.25, 0.35],
    [0.35, -1.25]
  ].forEach(([lx, lz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.42, 6), lanternBodyMat);
    post.position.set(lx, 0.26, lz);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), bulbMat);
    bulb.position.set(lx, 0.50, lz);
    g.add(post, bulb);
  });

  boardGroup.add(g);
  return g;
}

export function buildFourCornerLandmarks3D(boardGroup) {
  context.cornerLandmarkGroups = {};

  // START (Tile 0)
  const sg = buildStartLandmark3D(getTileWorldPosition(0), boardGroup);
  tagLandmarkTileId(sg, 0);
  context.cornerLandmarkGroups[0] = sg;

  // ISLAND (Tile 8)
  const ig = buildIslandLandmark3D(getTileWorldPosition(8), boardGroup);
  tagLandmarkTileId(ig, 8);
  context.cornerLandmarkGroups[8] = ig;

  // FESTIVAL (Tile 16)
  const fg = buildFestivalPlazaLandmark3D(getTileWorldPosition(16), boardGroup);
  tagLandmarkTileId(fg, 16);
  context.cornerLandmarkGroups[16] = fg;

  // WORLD TOUR / FLIGHT (Tile 24)
  const tg = buildFlightTerminalLandmark3D(getTileWorldPosition(24), boardGroup);
  tagLandmarkTileId(tg, 24);
  context.cornerLandmarkGroups[24] = tg;
}
