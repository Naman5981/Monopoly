/**
 * three/board/diorama.js
 * Builds the floating wooden diorama island base:
 * stepped mahogany plinth, procedural wood grain texture, brass corner brackets,
 * inner asphalt roadway, manicured central lawn, fountain, and pine tree clusters.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { buildFestivalBalloon3D } from '../environment/clouds.js';
import { buildRajasthanCenterpiece3D, createRajasthanDesertTexture } from './rajasthanCenter.js';
import { matchSettings } from '../../game/state.js';

/**
 * Generates an authentic high-resolution procedural mahogany wood grain canvas texture.
 * @returns {THREE.CanvasTexture}
 */
export function createProceduralWoodTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0.0, '#4e2410');
  grad.addColorStop(0.22, '#3b1a0b');
  grad.addColorStop(0.48, '#562a14');
  grad.addColorStop(0.72, '#3e1b0c');
  grad.addColorStop(1.0, '#4e2410');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  const grainCount = 140;
  for (let i = 0; i < grainCount; i++) {
    const xBase = (i / grainCount) * 1024;
    const waveFreq = 0.009 + (i % 6) * 0.003;
    const waveAmp = 5 + (i % 8) * 3;
    const isDark = (i % 3 === 0);
    const isHighlight = (i % 7 === 0);

    ctx.beginPath();
    ctx.moveTo(xBase, 0);
    for (let y = 0; y <= 512; y += 10) {
      const offsetX = Math.sin(y * waveFreq) * waveAmp + Math.cos(y * 0.025) * (waveAmp * 0.35);
      ctx.lineTo(xBase + offsetX, y);
    }
    ctx.lineWidth = isHighlight ? 1.6 : isDark ? 2.4 : 1.2;
    ctx.strokeStyle = isHighlight
      ? 'rgba(178, 108, 62, 0.40)'
      : isDark
        ? 'rgba(24, 9, 4, 0.48)'
        : 'rgba(52, 22, 9, 0.28)';
    ctx.stroke();
  }

  for (let n = 0; n < 2000; n++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 512;
    const pLen = 6 + Math.random() * 18;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(26, 9, 4, 0.38)' : 'rgba(155, 92, 54, 0.24)';
    ctx.fillRect(px, py, 1.2, pLen);
  }

  const varnish = ctx.createLinearGradient(0, 0, 0, 512);
  varnish.addColorStop(0, 'rgba(255, 235, 210, 0.20)');
  varnish.addColorStop(0.12, 'rgba(255, 255, 255, 0.08)');
  varnish.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  varnish.addColorStop(0.92, 'rgba(0, 0, 0, 0.30)');
  varnish.addColorStop(1, 'rgba(0, 0, 0, 0.58)');
  ctx.fillStyle = varnish;
  ctx.fillRect(0, 0, 1024, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = context.maxAnisotropy || 4;
  tex.needsUpdate = true;
  return tex;
}

export function createPineTreeCluster3D() {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.14, 2.1),
    new THREE.MeshLambertMaterial({ color: 0x15803d, flatShading: true })
  );
  pad.receiveShadow = true;
  g.add(pad);

  const offsets = [
    { x: -0.45, z: -0.4, s: 1.0 },
    { x: 0.48, z: -0.2, s: 0.85 },
    { x: -0.1, z: 0.45, s: 0.92 }
  ];

  offsets.forEach(o => {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 0.45, 6),
      new THREE.MeshLambertMaterial({ color: 0x78350f, flatShading: true })
    );
    trunk.position.set(o.x, 0.25, o.z);
    g.add(trunk);

    const cone1 = new THREE.Mesh(
      new THREE.ConeGeometry(0.58 * o.s, 1.1 * o.s, 6),
      new THREE.MeshLambertMaterial({ color: 0x16a34a, flatShading: true })
    );
    cone1.position.set(o.x, 0.85 * o.s, o.z);
    cone1.castShadow = true;
    g.add(cone1);

    const cone2 = new THREE.Mesh(
      new THREE.ConeGeometry(0.44 * o.s, 0.85 * o.s, 6),
      new THREE.MeshLambertMaterial({ color: 0x22c55e, flatShading: true })
    );
    cone2.position.set(o.x, 1.35 * o.s, o.z);
    cone2.castShadow = true;
    g.add(cone2);
  });

  return g;
}

export function createParkFountain3D() {
  const g = new THREE.Group();
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.16, 2.3),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.25 })
  );
  plinth.position.y = 0.08;
  plinth.receiveShadow = true;

  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 1.05, 0.34, 24),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 })
  );
  basin.position.y = 0.25;
  basin.castShadow = true;
  basin.receiveShadow = true;

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.82, 0.28, 24),
    new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.08, metalness: 0.45, transparent: true, opacity: 0.88 })
  );
  water.position.y = 0.32;

  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.46, 12),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 })
  );
  spout.position.y = 0.52;
  spout.castShadow = true;

  const waterDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.1, transparent: true, opacity: 0.9 })
  );
  waterDome.position.y = 0.76;

  g.add(plinth, basin, water, spout, waterDome);
  return g;
}

/**
 * Creates the authentic manicured green lawn and roadway procedural canvas texture for World Edition.
 * @returns {THREE.CanvasTexture}
 */
export function createWorldParkTexture() {
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 1024;
  roadCanvas.height = 1024;
  const rctx = roadCanvas.getContext('2d');

  rctx.fillStyle = '#334155';
  rctx.fillRect(0, 0, 1024, 1024);

  rctx.strokeStyle = '#ffffff';
  rctx.lineWidth = 10;
  rctx.strokeRect(5, 5, 1014, 1014);

  rctx.strokeStyle = '#f8fafc';
  rctx.lineWidth = 7;
  rctx.setLineDash([28, 22]);
  rctx.strokeRect(52, 52, 920, 920);
  rctx.setLineDash([]);

  const crossWalks = [
    { x: 30, y: 30, w: 70, h: 70 },
    { x: 924, y: 30, w: 70, h: 70 },
    { x: 30, y: 924, w: 70, h: 70 },
    { x: 924, y: 924, w: 70, h: 70 }
  ];
  rctx.fillStyle = '#f8fafc';
  crossWalks.forEach(cwk => {
    for (let s = 6; s < cwk.w - 6; s += 14) {
      rctx.fillRect(cwk.x + s, cwk.y + 4, 8, cwk.h - 8);
    }
  });

  const pm = 104, ps = 1024 - pm * 2, gc = 6, cw = ps / gc;
  rctx.fillStyle = '#e2e8f0';
  rctx.fillRect(pm - 8, pm - 8, ps + 16, ps + 16);
  rctx.strokeStyle = '#cbd5e1';
  rctx.lineWidth = 4;
  rctx.strokeRect(pm - 8, pm - 8, ps + 16, ps + 16);

  for (let gx = 0; gx < gc; gx++) {
    for (let gz = 0; gz < gc; gz++) {
      rctx.fillStyle = (gx + gz) % 2 === 0 ? '#4ade80' : '#22c55e';
      rctx.fillRect(pm + gx * cw, pm + gz * cw, cw, cw);
      rctx.strokeStyle = 'rgba(255,255,255,0.22)';
      rctx.lineWidth = 3;
      rctx.strokeRect(pm + gx * cw, pm + gz * cw, cw, cw);
    }
  }

  rctx.strokeStyle = '#fef08a';
  rctx.lineWidth = 8;
  rctx.strokeRect(pm, pm, ps, ps);

  const parkTex = new THREE.CanvasTexture(roadCanvas);
  parkTex.colorSpace = THREE.SRGBColorSpace;
  parkTex.anisotropy = 4;
  return parkTex;
}

export const dioramaMeshes = {
  plinthMesh: null,
  earthMesh: null,
  lipMesh: null,
  cornerGroups: [],
  rimMesh: null,
  innerMesh: null,
  treeClusters: [],
  fountain: null,
  shadowPlane: null,
  worldCenterGroup: null,
  rajasthanCenterGroup: null,
  worldParkTex: null,
  rajasthanDesertTex: null
};

export function buildDioramaBaseAndPark(boardGroup) {
  dioramaMeshes.cornerGroups = [];
  dioramaMeshes.treeClusters = [];

  const shadowGeo = new THREE.PlaneGeometry(34.0, 34.0);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.26 });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.36;
  boardGroup.add(shadowPlane);
  dioramaMeshes.shadowPlane = shadowPlane;

  const woodTex = createProceduralWoodTexture();
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.24,
    metalness: 0.06
  });

  // 1. Stepped Pedestal Base Plinth
  const plinthGeo = new THREE.BoxGeometry(30.4, 0.34, 30.4);
  const plinthMesh = new THREE.Mesh(plinthGeo, woodMat);
  plinthMesh.position.y = -1.18;
  plinthMesh.receiveShadow = true;
  plinthMesh.castShadow = true;
  boardGroup.add(plinthMesh);
  dioramaMeshes.plinthMesh = plinthMesh;

  // 2. Main Wooden Body
  const earthGeo = new THREE.BoxGeometry(29.8, 1.15, 29.8);
  const earthMesh = new THREE.Mesh(earthGeo, woodMat);
  earthMesh.position.y = -0.62;
  earthMesh.receiveShadow = true;
  earthMesh.castShadow = true;
  boardGroup.add(earthMesh);
  dioramaMeshes.earthMesh = earthMesh;

  // 3. Upper Wooden Moulding
  const lipGeo = new THREE.BoxGeometry(29.96, 0.16, 29.96);
  const lipMesh = new THREE.Mesh(lipGeo, woodMat);
  lipMesh.position.y = -0.06;
  lipMesh.receiveShadow = true;
  boardGroup.add(lipMesh);
  dioramaMeshes.lipMesh = lipMesh;

  // 4. Brass Corner Brackets
  const cornerMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.22,
    metalness: 0.85
  });
  const cornerOffsets = [
    { x: -14.9, z: -14.9, rot: 0 },
    { x: 14.9, z: -14.9, rot: Math.PI / 2 },
    { x: 14.9, z: 14.9, rot: Math.PI },
    { x: -14.9, z: 14.9, rot: -Math.PI / 2 }
  ];
  cornerOffsets.forEach(c => {
    const cg = new THREE.Group();
    const wing1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.52, 0.12), cornerMat);
    wing1.position.set(0.55, 0, 0);
    const wing2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 1.3), cornerMat);
    wing2.position.set(0, 0, 0.55);
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), cornerMat);
    stud.position.set(0.12, 0.14, 0.12);
    cg.add(wing1, wing2, stud);
    cg.position.set(c.x, -0.62, c.z);
    cg.rotation.y = c.rot;
    boardGroup.add(cg);
    dioramaMeshes.cornerGroups.push(cg);
  });

  const rimGeo = new THREE.BoxGeometry(29.9, 0.36, 29.9);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xdde3ea, roughness: 0.55, metalness: 0.05 });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = 0.12;
  rimMesh.receiveShadow = true;
  boardGroup.add(rimMesh);
  dioramaMeshes.rimMesh = rimMesh;

  dioramaMeshes.worldParkTex = createWorldParkTexture();
  const innerMesh = new THREE.Mesh(
    new THREE.BoxGeometry(20.6, 0.15, 20.6),
    new THREE.MeshStandardMaterial({ map: dioramaMeshes.worldParkTex, roughness: 0.65, metalness: 0.05 })
  );
  innerMesh.position.y = 0.28;
  innerMesh.receiveShadow = true;
  boardGroup.add(innerMesh);
  dioramaMeshes.innerMesh = innerMesh;

  // World Center Group: manicured park, pine trees, fountain, benches, moss stones
  const worldCenterGroup = new THREE.Group();
  worldCenterGroup.name = 'world-centerpiece';
  boardGroup.add(worldCenterGroup);
  dioramaMeshes.worldCenterGroup = worldCenterGroup;

  const treeClusters = [
    { x: -4.6, z: 1.5 },
    { x: 1.5, z: -4.8 },
    { x: 4.8, z: 1.2 },
    { x: -0.6, z: 5.2 }
  ];
  treeClusters.forEach(pos => {
    const cluster = createPineTreeCluster3D();
    cluster.position.set(pos.x, 0.35, pos.z);
    worldCenterGroup.add(cluster);
    dioramaMeshes.treeClusters.push(cluster);
  });

  const fountain = createParkFountain3D();
  fountain.position.set(-3.6, 0.36, -3.2);
  worldCenterGroup.add(fountain);
  dioramaMeshes.fountain = fountain;
}

export function buildLowPolyParkDecor3D(boardGroup) {
  const worldCenterGroup = dioramaMeshes.worldCenterGroup || boardGroup;
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55, flatShading: true });
  const mossMat = new THREE.MeshLambertMaterial({ color: 0x4ade80, flatShading: true });
  [
    { x: -5.0, z: -4.2, s: 0.42 },
    { x: 4.2, z: 3.8, s: 0.45 },
    { x: -2.8, z: 4.6, s: 0.38 },
    { x: 4.6, z: -2.8, s: 0.40 }
  ].forEach(rp => {
    const rg = new THREE.Group();
    const mr = new THREE.Mesh(new THREE.DodecahedronGeometry(rp.s, 0), stoneMat);
    mr.scale.set(1.15, 0.75, 0.95);
    mr.position.y = rp.s * 0.45;
    mr.castShadow = true;
    mr.receiveShadow = true;
    rg.add(mr);
    const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(rp.s * 0.48, 0), mossMat);
    moss.position.set(rp.s * 0.35, rp.s * 0.55, 0);
    moss.castShadow = true;
    rg.add(moss);
    rg.position.set(rp.x, 0.35, rp.z);
    worldCenterGroup.add(rg);
  });

  const bushMat = new THREE.MeshLambertMaterial({ color: 0x22c55e, flatShading: true });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x92400e, flatShading: true });
  [
    { x: -2.2, z: -5.6, rot: 0 },
    { x: 2.5, z: 5.6, rot: Math.PI },
    { x: -5.8, z: -0.8, rot: Math.PI / 2 },
    { x: 5.8, z: -1.2, rot: -Math.PI / 2 }
  ].forEach(bs => {
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.42), woodMat);
    seat.position.y = 0.25;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.08), woodMat);
    back.position.set(0, 0.42, -0.18);
    bench.add(seat, back);
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), bushMat);
    bush.position.set(0.85, 0.32, 0);
    bush.castShadow = true;
    bench.add(bush);
    bench.position.set(bs.x, 0.35, bs.z);
    bench.rotation.y = bs.rot;
    worldCenterGroup.add(bench);
  });

  // Festival hot-air balloon floats above the board
  buildFestivalBalloon3D(boardGroup);

  // Rajasthan Centerpiece: Hill Fort, Oasis Lake, Thar Desert Dunes, Date Palms & Camels
  dioramaMeshes.rajasthanCenterGroup = buildRajasthanCenterpiece3D(boardGroup);

  // Apply active board edition center
  updateDioramaCenterForEdition(matchSettings?.boardEdition || 'world');
}

/**
 * Dynamically switches the central diorama assets and ground texture between World and Rajasthan editions.
 * @param {string} editionId - 'world' | 'rajasthan'
 */
export function updateDioramaCenterForEdition(editionId = 'world') {
  const isRajasthan = editionId === 'rajasthan';

  if (dioramaMeshes.worldCenterGroup) {
    dioramaMeshes.worldCenterGroup.visible = !isRajasthan;
  }
  if (dioramaMeshes.rajasthanCenterGroup) {
    dioramaMeshes.rajasthanCenterGroup.visible = isRajasthan;
  }

  if (dioramaMeshes.innerMesh) {
    if (isRajasthan) {
      if (!dioramaMeshes.rajasthanDesertTex) {
        dioramaMeshes.rajasthanDesertTex = createRajasthanDesertTexture();
      }
      dioramaMeshes.innerMesh.material.map = dioramaMeshes.rajasthanDesertTex;
      dioramaMeshes.innerMesh.material.roughness = 0.72;
      dioramaMeshes.innerMesh.material.metalness = 0.04;
      dioramaMeshes.innerMesh.material.needsUpdate = true;
    } else {
      if (!dioramaMeshes.worldParkTex) {
        dioramaMeshes.worldParkTex = createWorldParkTexture();
      }
      dioramaMeshes.innerMesh.material.map = dioramaMeshes.worldParkTex;
      dioramaMeshes.innerMesh.material.roughness = 0.65;
      dioramaMeshes.innerMesh.material.metalness = 0.05;
      dioramaMeshes.innerMesh.material.needsUpdate = true;
    }
  }
}
