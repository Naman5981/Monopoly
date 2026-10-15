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

  const lagoonMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.72 });
  const lagoon = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.28, 0.06, 24), lagoonMat);
  lagoon.position.y = 0.03;

  const sandMat = new THREE.MeshLambertMaterial({ color: 0xfde047 });
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.15, 0.16, 20), sandMat);
  sand.position.y = 0.09;
  sand.receiveShadow = true;

  const grassMat = new THREE.MeshLambertMaterial({ color: 0x22c55e });
  const grassPatch = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.85, 0.06, 16), grassMat);
  grassPatch.position.y = 0.18;
  grassPatch.receiveShadow = true;
  g.add(lagoon, sand, grassPatch);

  const barkMat = new THREE.MeshLambertMaterial({ color: 0x854d0e });
  const leafMatA = new THREE.MeshLambertMaterial({ color: 0x15803d, flatShading: true });
  const leafMatB = new THREE.MeshLambertMaterial({ color: 0x16a34a, flatShading: true });
  const nutMat = new THREE.MeshLambertMaterial({ color: 0x713f12 });

  const palmGroup = new THREE.Group();
  palmGroup.position.set(-0.35, 0.20, -0.30);
  let trunkY = 0;
  let trunkOffset = 0;
  for (let i = 0; i < 4; i++) {
    const segH = 0.32;
    const topR = 0.09 - i * 0.012;
    const botR = 0.11 - i * 0.012;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(topR, botR, segH, 8), barkMat);
    seg.position.set(trunkOffset + i * 0.035, trunkY + segH / 2, -i * 0.025);
    seg.rotation.z = -0.12 * (i + 1);
    seg.castShadow = true;
    palmGroup.add(seg);
    trunkY += segH * 0.92;
    trunkOffset += i * 0.035;
  }
  const crownGroup = new THREE.Group();
  crownGroup.position.set(trunkOffset + 0.10, trunkY, -0.08);
  for (let f = 0; f < 6; f++) {
    const ang = (f * Math.PI * 2) / 6;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.95, 4), (f % 2 === 0) ? leafMatA : leafMatB);
    frond.rotation.z = Math.PI / 2 - 0.28;
    frond.rotation.y = ang;
    frond.position.set(Math.cos(ang) * 0.42, -0.08, Math.sin(ang) * 0.42);
    frond.scale.set(0.7, 1.0, 0.25);
    frond.castShadow = true;
    crownGroup.add(frond);
  }
  for (let c = 0; c < 3; c++) {
    const nut = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07, 0), nutMat);
    const ca = (c * Math.PI * 2) / 3;
    nut.position.set(Math.cos(ca) * 0.09, -0.06, Math.sin(ca) * 0.09);
    crownGroup.add(nut);
  }
  palmGroup.add(crownGroup);
  g.add(palmGroup);

  const smallPalm = new THREE.Group();
  smallPalm.position.set(-0.75, 0.20, 0.15);
  const sTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.75, 7), barkMat);
  sTrunk.position.set(0, 0.38, 0);
  sTrunk.rotation.z = 0.18;
  const sCrown = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.45, 6), leafMatA);
  sCrown.position.set(0.08, 0.82, 0);
  smallPalm.add(sTrunk, sCrown);
  g.add(smallPalm);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6, metalness: 0.05, flatShading: true });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.65, metalness: 0.05, flatShading: true });
  const thatchMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.72, flatShading: true });
  const lanternGlowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.25, roughness: 0.2 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.75 });
  const watchtower = new THREE.Group();
  watchtower.position.set(0.35, 0.20, 0.25);

  [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].forEach(([sx, sz]) => {
    const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.85, 8), darkWoodMat);
    stilt.position.set(sx, 0.42, sz);
    stilt.castShadow = true;
    watchtower.add(stilt);
  });

  const brace1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.74, 6), darkWoodMat);
  brace1.position.set(0, 0.42, -0.28);
  brace1.rotation.z = Math.PI / 4;
  const brace2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.74, 6), darkWoodMat);
  brace2.position.set(0, 0.42, 0.28);
  brace2.rotation.z = -Math.PI / 4;
  watchtower.add(brace1, brace2);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.82), woodMat);
  deck.position.y = 0.85;
  deck.castShadow = true;
  deck.receiveShadow = true;

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.52, 0.64), woodMat);
  cabin.position.y = 1.15;
  cabin.castShadow = true;
  cabin.receiveShadow = true;

  const jailBar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.68), ironMat);
  jailBar.position.y = 1.18;

  const roofEaves = new THREE.Mesh(new THREE.ConeGeometry(0.74, 0.24, 4), thatchMat);
  roofEaves.rotation.y = Math.PI / 4;
  roofEaves.position.y = 1.48;
  roofEaves.castShadow = true;

  const roofPeak = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.42, 4), thatchMat);
  roofPeak.rotation.y = Math.PI / 4;
  roofPeak.position.y = 1.70;
  roofPeak.castShadow = true;

  const lanternArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), darkWoodMat);
  lanternArm.position.set(0.38, 1.34, 0.20);
  const lanternGlass = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), lanternGlowMat);
  lanternGlass.position.set(0.42, 1.28, 0.20);

  const buoyMatRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 16), buoyMatRed);
  buoy.position.set(0.34, 0.85, 0);
  buoy.rotation.y = Math.PI / 2;

  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.04), darkWoodMat);
  ladder.position.set(0, 0.42, 0.40);
  ladder.rotation.x = -0.18;

  watchtower.add(deck, cabin, jailBar, roofEaves, roofPeak, lanternArm, lanternGlass, buoy, ladder);
  g.add(watchtower);

  const campfire = new THREE.Group();
  campfire.position.set(0.30, 0.20, -0.45);
  for (let s = 0; s < 6; s++) {
    const sang = (s * Math.PI * 2) / 6;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.065, 0), new THREE.MeshLambertMaterial({ color: 0x64748b }));
    stone.position.set(Math.cos(sang) * 0.18, 0.04, Math.sin(sang) * 0.18);
    campfire.add(stone);
  }
  const ember = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.16, 6), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
  ember.position.y = 0.08;
  campfire.add(ember);
  g.add(campfire);

  boardGroup.add(g);
  return g;
}

export function buildFlightTerminalLandmark3D(pos, boardGroup) {
  const g = new THREE.Group();
  g.position.set(pos.x, BASE_BUILDING_Y, pos.z);

  const tarmacMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const runway = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.10, 1.45), tarmacMat);
  runway.position.set(-0.15, 0.05, 0.35);
  runway.receiveShadow = true;
  g.add(runway);

  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  for (let i = 0; i < 4; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.06), stripeMat);
    dash.position.set(-0.85 + i * 0.52, 0.11, 0.35);
    g.add(dash);
  }

  const threshMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  for (let j = 0; j < 3; j++) {
    const thL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.05), threshMat);
    thL.position.set(-1.18, 0.11, 0.15 + j * 0.20);
    const thR = thL.clone();
    thR.position.x = 0.88;
    g.add(thL, thR);
  }

  const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  [-1.25, 0.95].forEach((lx, lidx) => {
    [-0.28, 0.98].forEach(lz => {
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 6), lidx === 0 ? greenLightMat : redLightMat);
      beacon.position.set(lx, 0.14, lz);
      g.add(beacon);
    });
  });

  const planeGroup = new THREE.Group();
  planeGroup.position.set(-0.15, 0.28, 0.35);
  planeGroup.rotation.y = -0.08;

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.2 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });
  const engineMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.18, 1.55, 14), whiteMat);
  fuselage.rotation.z = Math.PI / 2;
  fuselage.position.y = 0.22;
  fuselage.castShadow = true;

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.38, 14), whiteMat);
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(0.96, 0.22, 0);
  nose.castShadow = true;

  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.26), glassMat);
  cockpit.position.set(0.75, 0.30, 0);

  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.95), whiteMat);
  wingL.position.set(0.05, 0.20, -0.56);
  wingL.rotation.y = -0.22;
  wingL.castShadow = true;
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.95), whiteMat);
  wingR.position.set(0.05, 0.20, 0.56);
  wingR.rotation.y = 0.22;
  wingR.castShadow = true;

  const wletL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.04), blueMat);
  wletL.position.set(-0.06, 0.28, -1.02);
  const wletR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.04), blueMat);
  wletR.position.set(-0.06, 0.28, 1.02);

  [-0.42, 0.42].forEach(ez => {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.36, 10), engineMat);
    eng.rotation.z = Math.PI / 2;
    eng.position.set(0.10, 0.11, ez);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.04), engineMat);
    pylon.position.set(0.10, 0.17, ez);
    planeGroup.add(eng, pylon);
  });

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.48, 0.06), blueMat);
  tailFin.position.set(-0.64, 0.48, 0);
  tailFin.castShadow = true;
  const hStab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.65), whiteMat);
  hStab.position.set(-0.68, 0.66, 0);

  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  [{ x: 0.55, z: 0 }, { x: -0.15, z: -0.24 }, { x: -0.15, z: 0.24 }].forEach(gw => {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), engineMat);
    strut.position.set(gw.x, 0.08, gw.z);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(gw.x, 0.05, gw.z);
    planeGroup.add(strut, wheel);
  });

  planeGroup.add(fuselage, nose, cockpit, wingL, wingR, wletL, wletR, tailFin, hStab);
  g.add(planeGroup);

  const towerGroup = new THREE.Group();
  towerGroup.position.set(0.55, 0.0, -0.65);
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
  const towerPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.45, 12), pillarMat);
  towerPillar.position.y = 0.72;
  towerPillar.castShadow = true;
  const cabGlassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72, roughness: 0.1 });
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.30, 0.38, 8), cabGlassMat);
  cab.position.y = 1.55;
  const cabRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.10, 8), pillarMat);
  cabRoof.position.y = 1.78;
  const radarDish = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
  radarDish.rotation.x = Math.PI / 4;
  radarDish.position.set(0, 1.95, 0);
  towerGroup.add(towerPillar, cab, cabRoof, radarDish);
  g.add(towerGroup);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 6), new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
  pole.position.set(-0.85, 0.42, -0.55);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 8), new THREE.MeshLambertMaterial({ color: 0xf97316 }));
  sock.rotation.z = Math.PI / 2 + 0.15;
  sock.position.set(-0.70, 0.80, -0.55);
  g.add(pole, sock);

  boardGroup.add(g);
  return g;
}

export function buildFestivalPlazaLandmark3D(pos, boardGroup) {
  const g = new THREE.Group();
  g.position.set(pos.x, BASE_BUILDING_Y, pos.z);

  const stageBaseMat = new THREE.MeshLambertMaterial({ color: 0x7c3aed });
  const stageTrimMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
  const stageTopMat = new THREE.MeshLambertMaterial({ color: 0x10b981 });

  const stageBase = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.32, 0.18, 24), stageBaseMat);
  stageBase.position.y = 0.09;
  stageBase.receiveShadow = true;
  const stageTrim = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.20, 0.06, 24), stageTrimMat);
  stageTrim.position.y = 0.20;
  const stageTop = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.10, 0.06, 24), stageTopMat);
  stageTop.position.y = 0.24;
  stageTop.receiveShadow = true;
  g.add(stageBase, stageTrim, stageTop);

  const goldCupMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.88,
    roughness: 0.22
  });
  const cupGroup = new THREE.Group();
  cupGroup.position.set(0, 0.26, 0);

  const cupPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.12, 16), goldCupMat);
  cupPedestal.position.y = 0.06;
  const cupStem = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 0.22, 12), goldCupMat);
  cupStem.position.y = 0.21;
  const chalice = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.22, 0.52, 16), goldCupMat);
  chalice.position.y = 0.52;
  chalice.castShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.05, 8, 20), goldCupMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.78;

  const coinsMat = new THREE.MeshStandardMaterial({ color: 0xfde047, metalness: 0.9, roughness: 0.18 });
  const coinsMound = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), coinsMat);
  coinsMound.position.y = 0.72;

  [-0.52, 0.52].forEach(hx => {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 8, 12, Math.PI), goldCupMat);
    handle.rotation.z = (hx > 0) ? -Math.PI / 2 : Math.PI / 2;
    handle.position.set(hx, 0.56, 0);
    cupGroup.add(handle);
  });
  cupGroup.add(cupPedestal, cupStem, chalice, rim, coinsMound);
  g.add(cupGroup);

  const trussMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
  const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.85, 8), trussMat);
  pillarL.position.set(-0.85, 0.96, -0.45);
  const pillarR = pillarL.clone();
  pillarR.position.x = 0.85;
  const crossBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.82, 8), trussMat);
  crossBeam.rotation.z = Math.PI / 2;
  crossBeam.position.set(0, 1.90, -0.45);
  g.add(pillarL, pillarR, crossBeam);

  const spotColors = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981];
  spotColors.forEach((sc, sidx) => {
    const spotBody = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.18, 8), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
    spotBody.position.set(-0.54 + sidx * 0.36, 1.82, -0.45);
    spotBody.rotation.x = Math.PI / 4;
    const spotLens = new THREE.Mesh(new THREE.CircleGeometry(0.075, 8), new THREE.MeshBasicMaterial({ color: sc }));
    spotLens.position.set(-0.54 + sidx * 0.36, 1.76, -0.38);
    spotLens.rotation.x = -Math.PI / 4;
    g.add(spotBody, spotLens);
  });

  const speakerMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
  const grilleMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  [-0.92, 0.92].forEach(spx => {
    const spCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.72, 0.32), speakerMat);
    spCabinet.position.set(spx, 0.58, 0.25);
    spCabinet.castShadow = true;
    const spGrille = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.64), grilleMat);
    spGrille.position.set(spx, 0.58, 0.42);
    g.add(spCabinet, spGrille);
  });

  const balloonMatColors = [0xf43f5e, 0x38bdf8, 0xfacc15, 0xa855f7];
  balloonMatColors.forEach((bcol, bidx) => {
    const balloonGroup = new THREE.Group();
    const bx = (bidx % 2 === 0 ? -0.45 : 0.45) + (Math.random() - 0.5) * 0.15;
    const bz = (bidx < 2 ? -0.35 : 0.25);
    balloonGroup.position.set(bx, 1.6 + bidx * 0.22, bz);

    const bMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), new THREE.MeshLambertMaterial({ color: bcol }));
    bMesh.scale.set(1, 1.25, 1);
    bMesh.castShadow = true;
    const strMat = new THREE.LineBasicMaterial({ color: 0xcbd5e1 });
    const strGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.65, 0)]);
    const strLine = new THREE.Line(strGeo, strMat);
    balloonGroup.add(bMesh, strLine);
    g.add(balloonGroup);
    festivalBalloons.push({ mesh: balloonGroup, baseH: 1.6 + bidx * 0.22, phase: bidx * 1.4 });
  });

  boardGroup.add(g);
  return g;
}

export function buildFourCornerLandmarks3D(boardGroup) {
  context.cornerLandmarkGroups = {};

  // START (Tile 0)
  const sp = getTileWorldPosition(0);
  const sg = new THREE.Group();
  sg.position.set(sp.x, BASE_BUILDING_Y, sp.z);
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
  const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.35, 10), pillarMat);
  pL.position.set(-0.85, 0.68, -0.65);
  const pR = pL.clone();
  pR.position.set(0.85, 0.68, -0.65);
  const arch = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 0.36), new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
  arch.position.set(0, 1.45, -0.65);
  sg.add(pL, pR, arch);
  boardGroup.add(sg);
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
