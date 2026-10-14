/**
 * three/scene.js
 * Full Three.js isometric diorama — board, tiles, avatars, dice, cars, clouds.
 * Exports a Scene object with imperative methods called by the engine.
 */

import * as THREE from 'three';
import { BOARD_TILES, GROUP_META, PLAYER_THEMES } from '../game/data.js';
import { gameState, displayedCash } from '../game/state.js';
import { fmtMoney } from '../game/utils.js';
import { calculateTileRent } from '../game/rules.js';
import { playSFX } from '../game/audio.js';

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────
const STEP = 3.15;
const HALF_SPAN = 4 * STEP;         // 12.6
const BASE_TILE_Y = 0.34;
const BASE_BUILDING_Y = 0.46;

// ──────────────────────────────────────────────────────────────────────────────
// Internal state
// ──────────────────────────────────────────────────────────────────────────────
let scene, camera, renderer, raycaster, mouseVec;
let boardGroup;
let tilesMeshMap = {};
let tileBuildingGroups = {};
let cornerLandmarkGroups = {};
let playerMeshes = [];
let diceMeshes = [];
let roadCars = [];
let festivalBalloons = [];
let lowPolyClouds = [];
let tileHighlightRing = null;
let animatedBuildingPopups = [];
let animatedFlags = [];
let animatedChimneySmokes = [];
let animatedSkyscraperBeacons = [];
let activeTileDepressions = {};   // tileId → { currentOffset, targetOffset, _timer }
let tileGroundLightPools = {};
let activeTileIlluminations = {}; // tileId → { currentIllum }
let tileBorderFrames = {};        // tileId → frameGroup
let tilePressPointLight = null;
let movingHopDestTileId = null;
let maxAnisotropy = 4;

let cameraZoom = 1.0;
let targetCameraZoom = 1.0;
let cameraAzimuth = Math.PI / 4;
let targetCameraAzimuth = Math.PI / 4;
let cameraTarget = new THREE.Vector3(0, 0, 0);
let targetCameraTarget = new THREE.Vector3(0, 0, 0);
let ambientLight = null;
let dirLight = null;

export function getSceneLighting() {
  return { ambientLight, dirLight, setBulbLightingTheme };
}

export function startIntroCameraFlyIn() {
  cameraAzimuth = Math.PI * 0.9;
  targetCameraAzimuth = Math.PI / 4;
  cameraZoom = 0.65;
  targetCameraZoom = 1.0;
  targetCameraTarget.set(0, 0, 0);
}

// City preview (buy / inspector modals)
let cityPreviewRenderer = null;
let cityPreviewScene = null;
let cityPreviewCamera = null;
let cityPreviewGroup = null;
let activeCityPreviewCanvasId = null;

// HUD portrait rendering
let portraitRenderer = null;
let portraitCamera = null;
let portraitScenes = [];

// ──────────────────────────────────────────────────────────────────────────────
// Callbacks registered by the engine
// ──────────────────────────────────────────────────────────────────────────────
let onTileClick = () => {};
let onHoverChange = () => {};

// ──────────────────────────────────────────────────────────────────────────────
// Tile world position helper
// ──────────────────────────────────────────────────────────────────────────────
export function getTileWorldPosition(id) {
  if (id >= 0 && id <= 8) {
    const t = id / 8;
    return { x: HALF_SPAN - t * (2 * HALF_SPAN), z: HALF_SPAN, side: 0 };
  }
  if (id >= 8 && id <= 16) {
    const t = (id - 8) / 8;
    return { x: -HALF_SPAN, z: HALF_SPAN - t * (2 * HALF_SPAN), side: 1 };
  }
  if (id >= 16 && id <= 24) {
    const t = (id - 16) / 8;
    return { x: -HALF_SPAN + t * (2 * HALF_SPAN), z: -HALF_SPAN, side: 2 };
  }
  const t = (id - 24) / 8;
  return { x: HALF_SPAN, z: -HALF_SPAN + t * (2 * HALF_SPAN), side: 3 };
}

function getTileFacingAngle(tileId) {
  const pos = getTileWorldPosition(tileId);
  if (pos.side === 0) return -Math.PI / 2;
  if (pos.side === 1) return Math.PI;
  if (pos.side === 2) return Math.PI / 2;
  return 0;
}

// ──────────────────────────────────────────────────────────────────────────────
// Camera
// ──────────────────────────────────────────────────────────────────────────────
function updateIsometricCamera() {
  const dist = 36;
  const elev = 32;
  camera.position.set(
    cameraTarget.x + Math.cos(cameraAzimuth) * dist,
    cameraTarget.y + elev,
    cameraTarget.z + Math.sin(cameraAzimuth) * dist
  );
  camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
  camera.zoom = cameraZoom;
  camera.updateProjectionMatrix();
}

export function resetCameraView() {
  targetCameraAzimuth = Math.PI / 4;
  targetCameraZoom = 1.0;
  targetCameraTarget.set(0, 0, 0);
}

export function rotateBoardLeft() {
  targetCameraAzimuth -= Math.PI / 2;
  const snap = Math.PI / 4;
  targetCameraAzimuth = Math.round(targetCameraAzimuth / snap) * snap;
}

export function rotateBoardRight() {
  targetCameraAzimuth += Math.PI / 2;
  const snap = Math.PI / 4;
  targetCameraAzimuth = Math.round(targetCameraAzimuth / snap) * snap;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: Tint Hex to Light Accent
// ──────────────────────────────────────────────────────────────────────────────
function getLightPlayerAccent(hex, amount = 0.40) {
  if (!hex || hex[0] !== '#') return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr}, ${lg}, ${lb})`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Canvas Tile Texture
// ──────────────────────────────────────────────────────────────────────────────
function createTileTexture(tile, propState) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = propState?.mortgaged ? '#e2e8f0' : '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
  const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
  const lightPlayerAccent = ownerTheme ? getLightPlayerAccent(ownerTheme.colorHex, 0.40) : null;

  if (isOwned) {
    // Total border on the block with light player accent
    ctx.strokeStyle = lightPlayerAccent;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 498, 498);

    // Embossed bevel highlight (top and left edges catch light)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(14, 14, 484, 8);
    ctx.fillRect(14, 14, 8, 484);

    // Embossed bevel shadow (bottom and right edges in shadow)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.fillRect(14, 490, 484, 8);
    ctx.fillRect(490, 14, 8, 484);

    // Inner crisp definition border in solid owner theme color
    ctx.strokeStyle = ownerTheme.colorHex;
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 472, 472);
  } else {
    // Tactile 3D Block Embossing & Bevel Groove:
    // 1. Dark outer channel border separating adjacent blocks
    ctx.strokeStyle = '#64748b'; // slate-500
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 498, 498);

    // 2. Embossed bevel highlight (top and left edges catch light)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(14, 14, 484, 8);
    ctx.fillRect(14, 14, 8, 484);

    // 3. Embossed bevel shadow (bottom and right edges in shadow)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(14, 490, 484, 8);
    ctx.fillRect(490, 14, 8, 484);

    // 4. Inner crisp definition border
    ctx.strokeStyle = '#94a3b8'; // slate-400
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 472, 472);
  }

  const pos = getTileWorldPosition(tile.id);
  ctx.save();
  ctx.translate(256, 256);
  if (pos.side === 1) ctx.rotate(Math.PI / 2);
  if (pos.side === 2) ctx.rotate(Math.PI);
  if (pos.side === 3) ctx.rotate(-Math.PI / 2);
  ctx.translate(-256, -256);

  if (tile.type === 'city' && tile.group) {
    ctx.fillStyle = GROUP_META[tile.group].hex;
    ctx.fillRect(12, 12, 488, 106);
    // Subtle top gloss highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fillRect(12, 12, 488, 10);
    // Crisp bottom shadow line
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(12, 118, 488, 6);
    if (propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner]) {
      ctx.fillStyle = PLAYER_THEMES[propState.owner].colorHex;
      ctx.fillRect(12, 464, 488, 36);
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (tile.type === 'city') {
    const fontSize = tile.name.length > 8 ? 50 : 56;
    ctx.font = `900 ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = '#0f172a';
    ctx.fillText(tile.name, 256, 215);

    const displayAmt = (propState?.owner !== null && propState?.owner !== undefined && !propState?.mortgaged)
      ? calculateTileRent(tile.id)
      : tile.price;
    ctx.font = '900 94px Inter, sans-serif';
    ctx.fillStyle = (propState?.owner !== null && propState?.owner !== undefined) ? '#047857' : '#0f172a';
    ctx.fillText(fmtMoney(displayAmt), 256, 375);

    if (propState?.festivalBoost) {
      ctx.fillStyle = '#6d28d9';
      ctx.font = '900 34px Inter, sans-serif';
      ctx.fillText('★ 2X RENT ★', 256, 286);
    }
  } else if (tile.type === 'chance') {
    const colors = ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#a855f7', '#fb923c'];
    const cx2 = 256, cy2 = 200, r = 110;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(cx2, cy2);
      ctx.arc(cx2, cy2, r, (i * Math.PI) / 3, ((i + 1) * Math.PI) / 3);
      ctx.closePath();
      ctx.fillStyle = colors[i]; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 54px Inter, sans-serif';
    ctx.fillText('CHANCE', 256, 405);
  } else if (tile.type === 'tax') {
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6;
    ctx.fillRect(166, 70, 180, 190);
    ctx.strokeRect(166, 70, 180, 190);
    ctx.fillStyle = '#dc2626'; ctx.font = '900 84px Inter, sans-serif';
    ctx.fillText('%', 256, 170);
    ctx.fillStyle = '#0f172a'; ctx.font = '900 62px Inter, sans-serif';
    ctx.fillText('TAX', 256, 345);
    ctx.font = '800 46px Inter, sans-serif'; ctx.fillStyle = '#dc2626';
    ctx.fillText(`-${fmtMoney(tile.amount)}`, 256, 425);
  } else if (tile.type === 'resort') {
    ctx.fillStyle = '#0ea5e9'; ctx.fillRect(12, 12, 488, 90);
    // Subtle top gloss highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fillRect(12, 12, 488, 10);
    // Crisp bottom shadow line
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(12, 102, 488, 6);

    ctx.fillStyle = '#ffffff'; ctx.font = '900 42px Inter, sans-serif';
    ctx.fillText('BEACH', 256, 58);
    ctx.fillStyle = '#0f172a'; ctx.font = '900 52px Inter, sans-serif';
    ctx.fillText(tile.name, 256, 210);

    const isOwnedResort = (propState?.owner !== null && propState?.owner !== undefined && !propState?.mortgaged);
    const displayAmt = isOwnedResort ? calculateTileRent(tile.id) : tile.price;
    ctx.font = '900 90px Inter, sans-serif';
    ctx.fillStyle = isOwnedResort ? '#047857' : '#0f172a';
    ctx.fillText(fmtMoney(displayAmt), 256, 380);

    if (propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner]) {
      ctx.fillStyle = PLAYER_THEMES[propState.owner].colorHex;
      ctx.fillRect(12, 464, 488, 36);
    }
  } else {
    ctx.fillStyle = '#0f172a'; ctx.font = '900 54px Inter, sans-serif';
    ctx.fillText(tile.name, 256, 395);
    ctx.fillStyle = '#334155'; ctx.font = '800 34px Inter, sans-serif';
    ctx.fillText(tile.subtitle || '', 256, 452);
  }

  if (propState?.mortgaged) {
    ctx.fillStyle = 'rgba(225, 29, 72, 0.94)';
    ctx.fillRect(26, 215, 460, 92);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
    ctx.strokeRect(26, 215, 460, 92);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 52px Inter, sans-serif';
    ctx.fillText('MORTGAGED', 256, 262);
  }

  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

// ──────────────────────────────────────────────────────────────────────────────
// Procedural Wood Grain Texture Generator
// ──────────────────────────────────────────────────────────────────────────────
function createProceduralWoodTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');

  // Rich warm mahogany / dark walnut base gradient
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0.0, '#4e2410');
  grad.addColorStop(0.22, '#3b1a0b');
  grad.addColorStop(0.48, '#562a14');
  grad.addColorStop(0.72, '#3e1b0c');
  grad.addColorStop(1.0, '#4e2410');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Longitudinal wood grain flow lines & growth rings
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

  // Tactile wood pore striations
  for (let n = 0; n < 2000; n++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 512;
    const pLen = 6 + Math.random() * 18;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(26, 9, 4, 0.38)' : 'rgba(155, 92, 54, 0.24)';
    ctx.fillRect(px, py, 1.2, pLen);
  }

  // Satin varnish sheen (subtle highlight along upper edge, gentle depth at bottom)
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
  tex.anisotropy = maxAnisotropy || 4;
  tex.needsUpdate = true;
  return tex;
}

// ──────────────────────────────────────────────────────────────────────────────
// Board Construction
// ──────────────────────────────────────────────────────────────────────────────
function buildDioramaBaseAndPark() {
  const shadowGeo = new THREE.PlaneGeometry(34.0, 34.0);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.26 });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.36;
  boardGroup.add(shadowPlane);

  const woodTex = createProceduralWoodTexture();
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.24,
    metalness: 0.06
  });

  // 1. Stepped Bottom Pedestal Plinth (wider base)
  const plinthGeo = new THREE.BoxGeometry(30.4, 0.34, 30.4);
  const plinthMesh = new THREE.Mesh(plinthGeo, woodMat);
  plinthMesh.position.y = -1.18;
  plinthMesh.receiveShadow = true;
  plinthMesh.castShadow = true;
  boardGroup.add(plinthMesh);

  // 2. Main Vertical Wooden Body
  const earthGeo = new THREE.BoxGeometry(29.8, 1.15, 29.8);
  const earthMesh = new THREE.Mesh(earthGeo, woodMat);
  earthMesh.position.y = -0.62;
  earthMesh.receiveShadow = true;
  earthMesh.castShadow = true;
  boardGroup.add(earthMesh);

  // 3. Upper Wooden Moulding / Lip
  const lipGeo = new THREE.BoxGeometry(29.96, 0.16, 29.96);
  const lipMesh = new THREE.Mesh(lipGeo, woodMat);
  lipMesh.position.y = -0.06;
  lipMesh.receiveShadow = true;
  boardGroup.add(lipMesh);

  // 4. Polished Brass / Gold Corner Accent Brackets at the 4 Base Corners
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
  });

  const rimGeo = new THREE.BoxGeometry(29.9, 0.36, 29.9);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xdde3ea, roughness: 0.55, metalness: 0.05 });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = 0.12;
  rimMesh.receiveShadow = true;
  boardGroup.add(rimMesh);

  // Inner park with asphalt road and vibrant green manicured lawn
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 1024; roadCanvas.height = 1024;
  const rctx = roadCanvas.getContext('2d');

  // Rich charcoal slate asphalt
  rctx.fillStyle = '#334155';
  rctx.fillRect(0, 0, 1024, 1024);

  // Outer curb trim
  rctx.strokeStyle = '#ffffff'; rctx.lineWidth = 10;
  rctx.strokeRect(5, 5, 1014, 1014);

  // Crisp dashed center road line
  rctx.strokeStyle = '#f8fafc'; rctx.lineWidth = 7;
  rctx.setLineDash([28, 22]); rctx.strokeRect(52, 52, 920, 920); rctx.setLineDash([]);

  // Pedestrian zebra crosswalks at the four corners of the roadway
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

  // Park stone promenade border
  const pm = 104, ps = 1024 - pm * 2, gc = 6, cw = ps / gc;
  rctx.fillStyle = '#e2e8f0';
  rctx.fillRect(pm - 8, pm - 8, ps + 16, ps + 16);
  rctx.strokeStyle = '#cbd5e1'; rctx.lineWidth = 4;
  rctx.strokeRect(pm - 8, pm - 8, ps + 16, ps + 16);

  // Vibrant spring lawn tiles
  for (let gx = 0; gx < gc; gx++) {
    for (let gz = 0; gz < gc; gz++) {
      rctx.fillStyle = (gx + gz) % 2 === 0 ? '#4ade80' : '#22c55e';
      rctx.fillRect(pm + gx * cw, pm + gz * cw, cw, cw);
      rctx.strokeStyle = 'rgba(255,255,255,0.22)'; rctx.lineWidth = 3;
      rctx.strokeRect(pm + gx * cw, pm + gz * cw, cw, cw);
    }
  }

  // Sandstone garden promenade inner border
  rctx.strokeStyle = '#fef08a'; rctx.lineWidth = 8;
  rctx.strokeRect(pm, pm, ps, ps);

  const parkTex = new THREE.CanvasTexture(roadCanvas);
  parkTex.colorSpace = THREE.SRGBColorSpace;
  parkTex.anisotropy = 4;
  const innerMesh = new THREE.Mesh(
    new THREE.BoxGeometry(20.6, 0.15, 20.6),
    new THREE.MeshStandardMaterial({ map: parkTex, roughness: 0.65, metalness: 0.05 })
  );
  innerMesh.position.y = 0.28;
  innerMesh.receiveShadow = true;
  boardGroup.add(innerMesh);

  // Park decorations: pine trees, fountain, streetlamps
  const treeClusters = [{ x: -4.6, z: 1.5 }, { x: 1.5, z: -4.8 }, { x: 4.8, z: 1.2 }, { x: -0.6, z: 5.2 }];
  treeClusters.forEach(pos => {
    const cluster = createPineTreeCluster3D();
    cluster.position.set(pos.x, 0.35, pos.z);
    boardGroup.add(cluster);
  });

  const fountain = createParkFountain3D();
  fountain.position.set(-3.2, 0.36, -2.2);
  boardGroup.add(fountain);
}

function createPineTreeCluster3D() {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 2.1), new THREE.MeshLambertMaterial({ color: 0x15803d, flatShading: true }));
  pad.receiveShadow = true; g.add(pad);
  const offsets = [{ x: -0.45, z: -0.4, s: 1.0 }, { x: 0.48, z: -0.2, s: 0.85 }, { x: -0.1, z: 0.45, s: 0.92 }];
  offsets.forEach(o => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.45, 6), new THREE.MeshLambertMaterial({ color: 0x78350f, flatShading: true }));
    trunk.position.set(o.x, 0.25, o.z); g.add(trunk);
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(0.58 * o.s, 1.1 * o.s, 6), new THREE.MeshLambertMaterial({ color: 0x16a34a, flatShading: true }));
    cone1.position.set(o.x, 0.85 * o.s, o.z); cone1.castShadow = true; g.add(cone1);
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.44 * o.s, 0.85 * o.s, 6), new THREE.MeshLambertMaterial({ color: 0x22c55e, flatShading: true }));
    cone2.position.set(o.x, 1.35 * o.s, o.z); cone2.castShadow = true; g.add(cone2);
  });
  return g;
}

function createParkFountain3D() {
  const g = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 2.3), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.25 }));
  plinth.position.y = 0.08; plinth.receiveShadow = true;
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.05, 0.34, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }));
  basin.position.y = 0.25; basin.castShadow = true; basin.receiveShadow = true;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.28, 24), new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.08, metalness: 0.45, transparent: true, opacity: 0.88 }));
  water.position.y = 0.32;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.46, 12), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 }));
  spout.position.y = 0.52; spout.castShadow = true;
  const waterDome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.1, transparent: true, opacity: 0.9 }));
  waterDome.position.y = 0.76;
  g.add(plinth, basin, water, spout, waterDome);
  return g;
}

function buildLowPolyParkDecor3D() {
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55, flatShading: true });
  const mossMat = new THREE.MeshLambertMaterial({ color: 0x4ade80, flatShading: true });
  [{ x: -4.8, z: -3.8, s: 0.42 }, { x: 4.2, z: 3.8, s: 0.45 }, { x: -2.8, z: 4.6, s: 0.38 }, { x: 4.6, z: -2.8, s: 0.40 }].forEach(rp => {
    const rg = new THREE.Group();
    const mr = new THREE.Mesh(new THREE.DodecahedronGeometry(rp.s, 0), stoneMat);
    mr.scale.set(1.15, 0.75, 0.95); mr.position.y = rp.s * 0.45; mr.castShadow = true; mr.receiveShadow = true; rg.add(mr);
    const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(rp.s * 0.48, 0), mossMat);
    moss.position.set(rp.s * 0.35, rp.s * 0.55, 0); moss.castShadow = true; rg.add(moss);
    rg.position.set(rp.x, 0.35, rp.z); boardGroup.add(rg);
  });

  // Park benches with colorful flower beds
  const flowerColors = [0xf43f5e, 0xfacc15, 0xa855f7, 0x38bdf8];

  const bushMat = new THREE.MeshLambertMaterial({ color: 0x22c55e, flatShading: true });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x92400e, flatShading: true });
  [{ x: -2.2, z: -5.6, rot: 0 }, { x: 2.5, z: 5.6, rot: Math.PI }, { x: -5.8, z: -0.8, rot: Math.PI / 2 }, { x: 5.8, z: -1.2, rot: -Math.PI / 2 }].forEach(bs => {
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.42), woodMat); seat.position.y = 0.25;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.08), woodMat); back.position.set(0, 0.42, -0.18);
    bench.add(seat, back);
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), bushMat); bush.position.set(0.85, 0.32, 0); bush.castShadow = true;
    bench.add(bush); bench.position.set(bs.x, 0.35, bs.z); bench.rotation.y = bs.rot; boardGroup.add(bench);
  });

  const balloonGroup = new THREE.Group();
  const envelope = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 1), new THREE.MeshLambertMaterial({ color: 0xf43f5e, flatShading: true }));
  envelope.scale.set(1, 1.22, 1); envelope.position.y = 4.2; envelope.castShadow = true;
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.42), new THREE.MeshLambertMaterial({ color: 0xb45309, flatShading: true }));
  basket.position.y = 2.65;
  balloonGroup.add(envelope, basket);
  balloonGroup.position.set(-5.2, 0.5, -5.2);
  boardGroup.add(balloonGroup);
  festivalBalloons.push({ mesh: balloonGroup, baseH: 0.5, phase: 0.7 });
}

function buildLowPolyFloatingClouds3D() {
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.92 });
  [{ x: -16, y: 7.5, z: -12, scale: 1.15, speed: 0.18, phase: 0 }, { x: 15, y: 8.2, z: -14, scale: 0.95, speed: 0.14, phase: 2.1 }, { x: -17, y: 6.8, z: 13, scale: 1.05, speed: 0.16, phase: 4.2 }, { x: 16, y: 7.8, z: 11, scale: 0.88, speed: 0.15, phase: 1.3 }].forEach(cfg => {
    const cg = new THREE.Group();
    [{ x: 0, y: 0, z: 0, r: 1.1 }, { x: 0.95, y: -0.1, z: 0.2, r: 0.82 }, { x: -0.9, y: -0.15, z: -0.1, r: 0.78 }, { x: 0.3, y: 0.45, z: -0.2, r: 0.72 }].forEach(pf => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(pf.r, 0), cloudMat);
      m.position.set(pf.x, pf.y, pf.z); m.scale.set(1.1, 0.78, 0.95); cg.add(m);
    });
    cg.scale.setScalar(cfg.scale); cg.position.set(cfg.x, cfg.y, cfg.z); boardGroup.add(cg);
    lowPolyClouds.push({ mesh: cg, baseX: cfg.x, baseY: cfg.y, baseZ: cfg.z, speed: cfg.speed, phase: cfg.phase });
  });
}

function createTileBorderFrame(colorHex) {
  const frameGroup = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: 0.85,
    roughness: 0.15,
    metalness: 0.25,
    transparent: true,
    opacity: 0.92
  });

  const rimW = 2.96;
  const rimThick = 0.10;
  const rimH = 0.024;

  // North & South border bars
  const barNSGeo = new THREE.BoxGeometry(rimW, rimH, rimThick);
  const barN = new THREE.Mesh(barNSGeo, mat);
  barN.position.set(0, 0.121, -(rimW - rimThick) / 2);
  const barS = new THREE.Mesh(barNSGeo, mat);
  barS.position.set(0, 0.121, (rimW - rimThick) / 2);

  // East & West border bars
  const barEWGeo = new THREE.BoxGeometry(rimThick, rimH, rimW - rimThick * 2);
  const barE = new THREE.Mesh(barEWGeo, mat);
  barE.position.set((rimW - rimThick) / 2, 0.121, 0);
  const barW = new THREE.Mesh(barEWGeo, mat);
  barW.position.set(-(rimW - rimThick) / 2, 0.121, 0);

  frameGroup.add(barN, barS, barE, barW);
  frameGroup.userData = { borderMat: mat };
  return frameGroup;
}

function buildAllBoardTiles3D() {
  tilesMeshMap = {}; tileBuildingGroups = {}; activeTileDepressions = {};
  tileGroundLightPools = {};
  activeTileIlluminations = {};
  tileBorderFrames = {};
  BOARD_TILES.forEach(tile => {
    const pos = getTileWorldPosition(tile.id);
    const propState = gameState.properties[tile.id] || null;
    const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
    const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
    const lightPlayerAccent = ownerTheme ? getLightPlayerAccent(ownerTheme.colorHex, 0.40) : null;
    const sideColor = isOwned
      ? new THREE.Color(lightPlayerAccent)
      : new THREE.Color(0xe2e8f0);
    const sideMat = new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.42, metalness: 0.04 });
    const topTex = createTileTexture(tile, propState);
    const topMat = new THREE.MeshStandardMaterial({ map: topTex, color: 0xffffff, roughness: 0.28, metalness: 0.02 });
    const materials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
    const tileMesh = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.24, 2.96), materials);
    tileMesh.position.set(pos.x, BASE_TILE_Y, pos.z);
    tileMesh.receiveShadow = true; tileMesh.castShadow = true;
    tileMesh.userData = { tileId: tile.id, topMat, sideMat };

    // Glass illuminated border frame (glowing in owner light accent in night mode)
    const borderFrame = createTileBorderFrame(lightPlayerAccent || '#e2e8f0');
    borderFrame.visible = false;
    tileMesh.add(borderFrame);
    tileBorderFrames[tile.id] = borderFrame;

    boardGroup.add(tileMesh);
    tilesMeshMap[tile.id] = tileMesh;

    // Ground light pool for night illumination
    const poolGeo = new THREE.PlaneGeometry(4.8, 4.8);
    const poolMat = new THREE.MeshBasicMaterial({
      map: getGroundPoolTexture(),
      color: 0xffeedd,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const groundPool = new THREE.Mesh(poolGeo, poolMat);
    groundPool.rotation.x = -Math.PI / 2;
    groundPool.position.set(pos.x, 0.04, pos.z);
    groundPool.visible = false;
    boardGroup.add(groundPool);
    tileGroundLightPools[tile.id] = groundPool;

    const bGroup = new THREE.Group();
    bGroup.position.set(pos.x, BASE_BUILDING_Y, pos.z);
    if (pos.side === 1) bGroup.rotation.y = -Math.PI / 2;
    else if (pos.side === 2) bGroup.rotation.y = Math.PI;
    else if (pos.side === 3) bGroup.rotation.y = Math.PI / 2;
    boardGroup.add(bGroup);
    tileBuildingGroups[tile.id] = bGroup;
    activeTileDepressions[tile.id] = { currentOffset: 0, targetOffset: 0 };
    activeTileIlluminations[tile.id] = { currentIllum: 0 };
  });

  if (!tilePressPointLight) {
    tilePressPointLight = new THREE.PointLight(0xffeedd, 0, 7.5, 1.8);
    tilePressPointLight.position.set(0, 1.2, 0);
    tilePressPointLight.visible = false;
    boardGroup.add(tilePressPointLight);
  }
}

function buildIslandLandmark3D(pos) {
  const g = new THREE.Group();
  g.position.set(pos.x, BASE_BUILDING_Y, pos.z);

  // 1. Tropical Atoll Base: turquoise water lagoon ring + soft sandy beach + grass mound
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

  // 2. Leaning Organic Coconut Palm Trees
  const barkMat = new THREE.MeshLambertMaterial({ color: 0x854d0e });
  const leafMatA = new THREE.MeshLambertMaterial({ color: 0x15803d, flatShading: true });
  const leafMatB = new THREE.MeshLambertMaterial({ color: 0x16a34a, flatShading: true });
  const nutMat = new THREE.MeshLambertMaterial({ color: 0x713f12 });

  // Main leaning palm tree
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

  // Secondary smaller palm tree
  const smallPalm = new THREE.Group();
  smallPalm.position.set(-0.75, 0.20, 0.15);
  const sTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.75, 7), barkMat);
  sTrunk.position.set(0, 0.38, 0);
  sTrunk.rotation.z = 0.18;
  const sCrown = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.45, 6), leafMatA);
  sCrown.position.set(0.08, 0.82, 0);
  smallPalm.add(sTrunk, sCrown);
  g.add(smallPalm);

  // 3. Stranded Castaway Watchtower Hut on Bamboo Stilts (Upgraded Architectural Diorama)
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

  // Cross bamboo support braces
  const brace1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.74, 6), darkWoodMat);
  brace1.position.set(0, 0.42, -0.28); brace1.rotation.z = Math.PI / 4;
  const brace2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.74, 6), darkWoodMat);
  brace2.position.set(0, 0.42, 0.28); brace2.rotation.z = -Math.PI / 4;
  watchtower.add(brace1, brace2);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.82), woodMat);
  deck.position.y = 0.85;
  deck.castShadow = true; deck.receiveShadow = true;

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.52, 0.64), woodMat);
  cabin.position.y = 1.15;
  cabin.castShadow = true; cabin.receiveShadow = true;

  const jailBar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.68), ironMat);
  jailBar.position.y = 1.18;

  // Multi-tier thatched tropical roof with extended eaves
  const roofEaves = new THREE.Mesh(new THREE.ConeGeometry(0.74, 0.24, 4), thatchMat);
  roofEaves.rotation.y = Math.PI / 4; roofEaves.position.y = 1.48; roofEaves.castShadow = true;

  const roofPeak = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.42, 4), thatchMat);
  roofPeak.rotation.y = Math.PI / 4; roofPeak.position.y = 1.70; roofPeak.castShadow = true;

  // Hanging castaway storm lantern
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

  // 4. Castaway Campfire & Stones
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

function buildFlightTerminalLandmark3D(pos) {
  const g = new THREE.Group();
  g.position.set(pos.x, BASE_BUILDING_Y, pos.z);

  // 1. Airport Runway Tarmac Base
  const tarmacMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const runway = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.10, 1.45), tarmacMat);
  runway.position.set(-0.15, 0.05, 0.35);
  runway.receiveShadow = true;
  g.add(runway);

  // Centerline white dashes
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  for (let i = 0; i < 4; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.06), stripeMat);
    dash.position.set(-0.85 + i * 0.52, 0.11, 0.35);
    g.add(dash);
  }
  // Threshold markings (yellow keys)
  const threshMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  for (let j = 0; j < 3; j++) {
    const thL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.05), threshMat);
    thL.position.set(-1.18, 0.11, 0.15 + j * 0.20);
    const thR = thL.clone();
    thR.position.x = 0.88;
    g.add(thL, thR);
  }
  // Runway edge beacons
  const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  [-1.25, 0.95].forEach((lx, lidx) => {
    [-0.28, 0.98].forEach(lz => {
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 6), lidx === 0 ? greenLightMat : redLightMat);
      beacon.position.set(lx, 0.14, lz);
      g.add(beacon);
    });
  });

  // 2. Modern Commercial Passenger Jetliner
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

  // 3. Modern Airport Control Tower (ATC)
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

  // 4. Airport Windsock
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 6), new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
  pole.position.set(-0.85, 0.42, -0.55);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 8), new THREE.MeshLambertMaterial({ color: 0xf97316 }));
  sock.rotation.z = Math.PI / 2 + 0.15;
  sock.position.set(-0.70, 0.80, -0.55);
  g.add(pole, sock);

  boardGroup.add(g);
  return g;
}

function buildFestivalPlazaLandmark3D(pos) {
  const g = new THREE.Group();
  g.position.set(pos.x, BASE_BUILDING_Y, pos.z);

  // 1. Tiered Concert / Carnival Stage Deck
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

  // 2. Grand Golden Festival Jackpot Trophy Cup / Pot (Centerpiece)
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

  // 3. Concert Lighting Truss Arch & Stage Spotlights
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

  // 4. Concert Speaker Stacks
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

  // 5. Floating Helium Balloons attached to Festival stage
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

function tagLandmarkTileId(group, tileId) {
  if (!group) return;
  group.userData.tileId = tileId;
  group.traverse(child => {
    if (child.isMesh || child.isGroup) {
      child.userData.tileId = tileId;
    }
  });
}

function buildFourCornerLandmarks3D() {
  cornerLandmarkGroups = {};

  // START (Tile 0)
  const sp = getTileWorldPosition(0);
  const sg = new THREE.Group();
  sg.position.set(sp.x, BASE_BUILDING_Y, sp.z);
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
  const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.35, 10), pillarMat);
  pL.position.set(-0.85, 0.68, -0.65);
  const pR = pL.clone(); pR.position.set(0.85, 0.68, -0.65);
  const arch = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 0.36), new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
  arch.position.set(0, 1.45, -0.65);
  sg.add(pL, pR, arch);
  boardGroup.add(sg);
  tagLandmarkTileId(sg, 0);
  cornerLandmarkGroups[0] = sg;

  // ISLAND (Tile 8)
  const ig = buildIslandLandmark3D(getTileWorldPosition(8));
  tagLandmarkTileId(ig, 8);
  cornerLandmarkGroups[8] = ig;

  // FESTIVAL (Tile 16)
  const fg = buildFestivalPlazaLandmark3D(getTileWorldPosition(16));
  tagLandmarkTileId(fg, 16);
  cornerLandmarkGroups[16] = fg;

  // WORLD TOUR / FLIGHT (Tile 24)
  const tg = buildFlightTerminalLandmark3D(getTileWorldPosition(24));
  tagLandmarkTileId(tg, 24);
  cornerLandmarkGroups[24] = tg;
}

// ──────────────────────────────────────────────────────────────────────────────
// Street Lamps & Emissive Light Bulbs (Morning / Sunset / Night)
// ──────────────────────────────────────────────────────────────────────────────
let streetLampsGroup = null;
const streetBulbMaterials = [];
const streetFilamentMaterials = [];
const streetGlassMaterials = [];
const streetGlowSprites = [];
const streetGroundLightPools = [];
const streetLightBeams = [];
const streetPointLights = [];
let currentBulbMode = 'day';

let softBloomTexture = null;
function getSoftBloomTexture() {
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
function getGroundPoolTexture() {
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
function getBeamGradientTexture() {
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

function buildStreetLampsAndBulbs3D() {
  if (streetLampsGroup) return;
  streetLampsGroup = new THREE.Group();
  boardGroup.add(streetLampsGroup);

  const postMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });
  const socketMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 });

  // 12 strategic lamp locations across inner park promenades and corners
  const lampPositions = [
    // North side road promenade
    { x: -5.4, z: -5.5, rot: 0 },
    { x: 0, z: -5.6, rot: 0 },
    { x: 5.4, z: -5.5, rot: 0 },
    // South side road promenade
    { x: -5.4, z: 5.5, rot: Math.PI },
    { x: 0, z: 5.6, rot: Math.PI },
    { x: 5.4, z: 5.5, rot: Math.PI },
    // West side road promenade
    { x: -5.6, z: -2.8, rot: Math.PI / 2 },
    { x: -5.6, z: 2.8, rot: Math.PI / 2 },
    // East side road promenade
    { x: 5.6, z: -2.8, rot: -Math.PI / 2 },
    { x: 5.6, z: 2.8, rot: -Math.PI / 2 },
    // Outer diorama corner intersections
    { x: -8.5, z: -8.5, rot: Math.PI / 4 },
    { x: 8.5, z: 8.5, rot: -3 * Math.PI / 4 }
  ];

  lampPositions.forEach(pos => {
    const lamp = new THREE.Group();
    lamp.position.set(pos.x, 0.35, pos.z);
    lamp.rotation.y = pos.rot;

    // 1. Lamp cast-iron physical architecture
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

    // Four iron corner struts/mullions holding the glass panes
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

    // 2. Translucent lantern glass enclosure
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

    // 3. Hanging brass socket inside top of lantern
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 10), socketMat);
    socket.position.y = 2.08;
    lamp.add(socket);

    // 4. Authentic pear-shaped incandescent light bulb nestled inside the lamp
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

    // Bulb upper neck and lower sphere
    const neckGeo = new THREE.CylinderGeometry(0.045, 0.065, 0.06, 12);
    const neckMesh = new THREE.Mesh(neckGeo, bulbMat);
    neckMesh.position.y = 0.07;
    bulbGroup.add(neckMesh);

    const sphereGeo = new THREE.SphereGeometry(0.095, 16, 14);
    const sphereMesh = new THREE.Mesh(sphereGeo, bulbMat);
    sphereMesh.position.y = 0.0;
    bulbGroup.add(sphereMesh);

    // Glowing tungsten filament inside the bulb
    const filamentMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const filament = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.010, 8, 16), filamentMat);
    filament.rotation.x = Math.PI / 2;
    filament.position.y = 0.01;
    bulbGroup.add(filament);

    lamp.add(bulbGroup);
    streetBulbMaterials.push(bulbMat);
    streetFilamentMaterials.push(filamentMat);

    // 5. Optical bloom glow sprite (pure additive optical haze, ZERO circles or polygon edges!)
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

    // 6. Volumetric downward evening light cone
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

    // 7. Real ground light pool on the street/grass directly beneath the lamp
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
    groundPool.position.y = -0.33; // On pavement at y = 0.02 world coords
    lamp.add(groundPool);
    streetGroundLightPools.push(poolMat);

    // 8. Dynamic PointLight casting real light onto roads, cars, grass and tiles
    const pl = new THREE.PointLight(0xfffaed, 0.35, 4.5, 2.0);
    pl.position.set(0, 1.95, 0);
    lamp.add(pl);
    streetPointLights.push(pl);

    streetLampsGroup.add(lamp);
  });
}

export function setBulbLightingTheme(mode) {
  currentBulbMode = mode;
  const isNight = (mode === 'night');
  const isSunset = (mode === 'sunset');

  if (isNight) {
    // NIGHT MODE: Incandescent champagne filaments, warm-white bulbs, soft localized ground pools, and moonlight contrast
    streetFilamentMaterials.forEach(mat => {
      mat.color.setHex(0xffffff);
    });
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
    // SUNSET MODE: Warm twilight amber glow without oversaturating the diorama
    streetFilamentMaterials.forEach(mat => {
      mat.color.setHex(0xffedd5);
    });
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
    // MORNING / DAY MODE: Warm glowing incandescent tungsten filaments visible inside the lamps
    streetFilamentMaterials.forEach(mat => {
      mat.color.setHex(0xffedd5);
    });
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

  if (tilePressPointLight) {
    tilePressPointLight.intensity = 0;
    tilePressPointLight.visible = false;
  }
  if (!isNight && !isSunset) {
    Object.values(tileGroundLightPools).forEach(pool => {
      if (pool) { pool.visible = false; pool.material.opacity = 0; }
    });
    Object.values(tilesMeshMap).forEach(mesh => {
      const topMat = mesh?.userData?.topMat || (Array.isArray(mesh?.material) ? mesh.material[2] : null);
      const sideMat = mesh?.userData?.sideMat || (Array.isArray(mesh?.material) ? mesh.material[0] : null);
      if (topMat) { topMat.emissive.setHex(0x000000); topMat.emissiveIntensity = 0; }
      if (sideMat) { sideMat.emissive.setHex(0x000000); sideMat.emissiveIntensity = 0; }
    });
    Object.keys(activeTileIlluminations).forEach(k => {
      activeTileIlluminations[k].currentIllum = 0;
    });
  }
}

export function updateTileBordersForCurrentMode() {
  const isNight = (currentBulbMode === 'night');
  const isSunset = (currentBulbMode === 'sunset');

  BOARD_TILES.forEach(tile => {
    const frame = tileBorderFrames[tile.id];
    const mesh = tilesMeshMap[tile.id];
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

// ──────────────────────────────────────────────────────────────────────────────
// Tile Button Press
// ──────────────────────────────────────────────────────────────────────────────
export function triggerTileButtonPress(tileId, depth = -0.2, duration = 220) {
  const st = activeTileDepressions[tileId];
  if (!st) return;
  st.targetOffset = depth;
  if (st._timer) clearTimeout(st._timer);
  st._timer = setTimeout(() => { st.targetOffset = 0; }, duration);
}

// ──────────────────────────────────────────────────────────────────────────────
// Upgraded 3D Building Models: Flag, Hut (Cottage), and Skyscraper
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 1. Detailed Architectural Flag Mesh (Claim / Ownership Flag)
 */
export function createDetailedFlagMesh(ownerColor) {
  const flagGroup = new THREE.Group();

  // Materials
  const basePlinthMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.2 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.85 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.8 });
  const clothMat = new THREE.MeshStandardMaterial({ color: ownerColor, roughness: 0.45, metalness: 0.1 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.3, metalness: 0.7 });

  // 1. Heavy stepped plinth & brass mounting collar
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.04, 12), basePlinthMat);
  plinth.position.y = 0.02;
  plinth.castShadow = true; plinth.receiveShadow = true;

  const brassCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.03, 12), brassMat);
  brassCollar.position.y = 0.055;
  brassCollar.castShadow = true;

  const boltRing = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.03, 8), brassMat);
  boltRing.position.y = 0.085;
  flagGroup.add(plinth, brassCollar, boltRing);

  // 2. Sleek architectural flagpole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.96, 12), poleMat);
  pole.position.y = 0.58;
  pole.castShadow = true;

  // Halyard rigging rings
  const ringTop = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 8, 12), brassMat);
  ringTop.position.set(0, 0.94, 0); ringTop.rotation.x = Math.PI / 2;
  const ringBtm = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 8, 12), brassMat);
  ringBtm.position.set(0, 0.58, 0); ringBtm.rotation.x = Math.PI / 2;

  // Golden spearhead / acorn finial
  const finialBall = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 12), brassMat);
  finialBall.position.y = 1.07;
  const finialTip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.08, 8), brassMat);
  finialTip.position.y = 1.14;
  flagGroup.add(pole, ringTop, ringBtm, finialBall, finialTip);

  // 3. Heraldic waving cloth pennant banner with realistic ripples
  const clothGroup = new THREE.Group();
  clothGroup.position.set(0.02, 0.76, 0);

  // Segment 1 (Root)
  const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.022), clothMat);
  seg1.position.set(0.08, 0, 0);
  seg1.castShadow = true;

  // Segment 2 (Mid ripple wave)
  const seg2Group = new THREE.Group();
  seg2Group.position.set(0.16, 0, 0);
  seg2Group.rotation.y = 0.16;
  const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.36, 0.022), clothMat);
  seg2.position.set(0.075, 0, 0);
  seg2.castShadow = true;

  // Segment 3 (Tail fly ripple)
  const seg3Group = new THREE.Group();
  seg3Group.position.set(0.15, 0, 0);
  seg3Group.rotation.y = -0.25;
  const seg3 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.022), clothMat);
  seg3.position.set(0.07, 0, 0);
  seg3.castShadow = true;

  // Top & bottom golden fringe borders
  const topBorder = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.026, 0.026), goldTrimMat);
  topBorder.position.set(0.22, 0.17, 0);
  const btmBorder = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.026, 0.026), goldTrimMat);
  btmBorder.position.set(0.22, -0.17, 0);

  // Center heraldic star/diamond emblem
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), goldTrimMat);
  star.position.set(0.18, 0, 0.016);
  star.scale.set(1, 1, 0.3);

  seg3Group.add(seg3);
  seg2Group.add(seg2, seg3Group);
  clothGroup.add(seg1, seg2Group, topBorder, btmBorder, star);
  flagGroup.add(clothGroup);

  clothGroup.userData = { isFlagCloth: true, phase: Math.random() * Math.PI * 2, seg2: seg2Group, seg3: seg3Group };
  animatedFlags.push(clothGroup);

  return flagGroup;
}

/**
 * 2. Detailed Cozy Hut / Cottage Mesh (Levels 1 - 3)
 */
export function createDetailedHouseMesh(ownerColor, index = 0) {
  const houseGroup = new THREE.Group();

  // Materials
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.1 });
  const stoopMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.1 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.05 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.1 });
  const roofMat = new THREE.MeshStandardMaterial({ color: ownerColor, roughness: 0.35, metalness: 0.15, flatShading: true });
  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.2 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5, metalness: 0.05 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.85 });
  const windowGlowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 0.6, roughness: 0.2 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7, metalness: 0.05 }); // terracotta brick
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.75, flatShading: true });
  const planterMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });

  const lvl = Math.max(1, Math.min(3, Number(index) || 1));

  if (lvl === 1) {
    // ══════════════════════════════════════════════════════════════════════════
    // LEVEL 1: Charming Cozy Cottage (1 House)
    // ══════════════════════════════════════════════════════════════════════════
    // 1. Foundation & front stoop
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.48), foundationMat);
    foundation.position.y = 0.035;
    foundation.castShadow = true; foundation.receiveShadow = true;

    const stoop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.09), stoopMat);
    stoop.position.set(0.08, 0.015, 0.26);
    stoop.castShadow = true; stoop.receiveShadow = true;
    houseGroup.add(foundation, stoop);

    // 2. Main cottage walls & corner architectural timber posts
    const walls = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.44), wallMat);
    walls.position.y = 0.24;
    walls.castShadow = true; walls.receiveShadow = true;
    houseGroup.add(walls);

    [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]].forEach(([cx, cz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.35, 0.036), timberMat);
      post.position.set(cx, 0.245, cz);
      post.castShadow = true;
      houseGroup.add(post);
    });

    // 3. Front entrance door & canopy
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.02), doorMat);
    door.position.set(0.08, 0.18, 0.225);
    const doorknob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), brassMat);
    doorknob.position.set(0.12, 0.18, 0.24);
    const doorHood = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.06), timberMat);
    doorHood.position.set(0.08, 0.30, 0.24);
    houseGroup.add(door, doorknob, doorHood);

    // 4. Front illuminated window with white frame & flower planter box
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.018), frameMat);
    winFrame.position.set(-0.10, 0.24, 0.223);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.11, 0.022), windowGlowMat);
    winGlass.position.set(-0.10, 0.24, 0.225);

    const planter = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.05), planterMat);
    planter.position.set(-0.10, 0.155, 0.245);
    [-0.04, 0, 0.04].forEach((fx, fIdx) => {
      const fColors = [0xf43f5e, 0xfacc15, 0x38bdf8];
      const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.018, 0), new THREE.MeshStandardMaterial({ color: fColors[fIdx] }));
      flower.position.set(-0.10 + fx, 0.185, 0.245);
      houseGroup.add(flower);
    });
    houseGroup.add(winFrame, winGlass, planter);

    // Side glowing window
    const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.11, 0.11), windowGlowMat);
    sideWin.position.set(-0.223, 0.24, 0);
    houseGroup.add(sideWin);

    // 5. Stylized Gabled Roof with overhang & eaves
    const roofSlopeL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.50), roofMat);
    roofSlopeL.position.set(-0.10, 0.50, 0);
    roofSlopeL.rotation.z = Math.PI * 0.18;
    roofSlopeL.castShadow = true; roofSlopeL.receiveShadow = true;

    const roofSlopeR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.50), roofMat);
    roofSlopeR.position.set(0.10, 0.50, 0);
    roofSlopeR.rotation.z = -Math.PI * 0.18;
    roofSlopeR.castShadow = true; roofSlopeR.receiveShadow = true;

    // Front & Back gable triangular wall infills
    const gableFront = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.02, 3), wallMat);
    gableFront.rotation.y = Math.PI / 6; gableFront.rotation.z = Math.PI / 2;
    gableFront.position.set(0, 0.46, 0.21);
    const gableBack = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.02, 3), wallMat);
    gableBack.rotation.y = Math.PI / 6; gableBack.rotation.z = Math.PI / 2;
    gableBack.position.set(0, 0.46, -0.21);

    // Ridge cap along peak
    const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.52), ridgeMat);
    ridgeCap.position.set(0, 0.59, 0);
    houseGroup.add(roofSlopeL, roofSlopeR, gableFront, gableBack, ridgeCap);

    // 6. Terracotta brick chimney & whimsical low-poly smoke
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), chimneyMat);
    chimney.position.set(0.12, 0.55, -0.10);
    chimney.castShadow = true;

    const chimneyCrown = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.10), ridgeMat);
    chimneyCrown.position.set(0.12, 0.67, -0.10);

    const smoke1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.038, 0), smokeMat);
    smoke1.position.set(0.12, 0.72, -0.10);
    const smoke2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.028, 0), smokeMat);
    smoke2.position.set(0.14, 0.78, -0.09);

    smoke1.userData = { isSmoke: true, baseY: 0.72, phase: 0 };
    smoke2.userData = { isSmoke: true, baseY: 0.78, phase: 1.2 };
    animatedChimneySmokes.push(smoke1, smoke2);

    houseGroup.add(chimney, chimneyCrown, smoke1, smoke2);
  } else if (lvl === 2) {
    // ══════════════════════════════════════════════════════════════════════════
    // LEVEL 2: Stately Two-Story Villa (2 Houses - Bigger House)
    // ══════════════════════════════════════════════════════════════════════════
    // 1. Broad stone foundation & entrance porch
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.62), foundationMat);
    foundation.position.y = 0.045;
    foundation.castShadow = true; foundation.receiveShadow = true;

    const stoop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.12), stoopMat);
    stoop.position.set(0, 0.02, 0.33);
    stoop.castShadow = true; stoop.receiveShadow = true;
    houseGroup.add(foundation, stoop);

    // 2. First Floor walls & corner timber pilasters
    const firstWalls = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.36, 0.58), wallMat);
    firstWalls.position.y = 0.27;
    firstWalls.castShadow = true; firstWalls.receiveShadow = true;
    houseGroup.add(firstWalls);

    [[-0.30, -0.27], [0.30, -0.27], [-0.30, 0.27], [0.30, 0.27]].forEach(([cx, cz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.04), timberMat);
      post.position.set(cx, 0.28, cz);
      post.castShadow = true;
      houseGroup.add(post);
    });

    // Central entrance double door with transom canopy & brass lantern
    const frontDoor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.24, 0.02), doorMat);
    frontDoor.position.set(0, 0.19, 0.292);
    const knobL = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), brassMat);
    knobL.position.set(-0.025, 0.19, 0.305);
    const knobR = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), brassMat);
    knobR.position.set(0.025, 0.19, 0.305);
    const doorCanopy = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.09), timberMat);
    doorCanopy.position.set(0, 0.32, 0.32);
    const porchLantern = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), brassMat);
    porchLantern.position.set(0, 0.28, 0.32);
    houseGroup.add(frontDoor, knobL, knobR, doorCanopy, porchLantern);

    // Dual front 1st-floor windows with flower boxes
    [-0.20, 0.20].forEach(wx => {
      const wFrame = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.018), frameMat);
      wFrame.position.set(wx, 0.25, 0.292);
      const wGlass = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.022), windowGlowMat);
      wGlass.position.set(wx, 0.25, 0.294);
      const wPlanter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.05), planterMat);
      wPlanter.position.set(wx, 0.165, 0.31);
      const f1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.016, 0), new THREE.MeshStandardMaterial({ color: 0xf43f5e }));
      f1.position.set(wx - 0.03, 0.195, 0.31);
      const f2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.016, 0), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
      f2.position.set(wx + 0.03, 0.195, 0.31);
      houseGroup.add(wFrame, wGlass, wPlanter, f1, f2);
    });

    // Ground floor side windows
    const sideW1 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.12, 0.12), windowGlowMat);
    sideW1.position.set(-0.322, 0.26, 0);
    const sideW2 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.12, 0.12), windowGlowMat);
    sideW2.position.set(0.322, 0.26, 0);
    houseGroup.add(sideW1, sideW2);

    // 3. Middle floor architectural dividing cornice
    const floorMolding = new THREE.Mesh(new THREE.BoxGeometry(0.67, 0.035, 0.61), timberMat);
    floorMolding.position.y = 0.465;
    floorMolding.castShadow = true;
    houseGroup.add(floorMolding);

    // 4. Second Floor upper story
    const upperWalls = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.34, 0.54), wallMat);
    upperWalls.position.y = 0.65;
    upperWalls.castShadow = true; upperWalls.receiveShadow = true;
    houseGroup.add(upperWalls);

    [[-0.28, -0.25], [0.28, -0.25], [-0.28, 0.25], [0.28, 0.25]].forEach(([cx, cz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.35, 0.036), timberMat);
      post.position.set(cx, 0.65, cz);
      houseGroup.add(post);
    });

    // Upper balcony over the porch
    const balconyFloor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.08), stoopMat);
    balconyFloor.position.set(0, 0.49, 0.30);
    const balconyRail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.02), brassMat);
    balconyRail.position.set(0, 0.535, 0.33);
    houseGroup.add(balconyFloor, balconyRail);

    // Upper illuminated windows
    [-0.17, 0.17].forEach(wx => {
      const wFrame = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.018), frameMat);
      wFrame.position.set(wx, 0.66, 0.272);
      const wGlass = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.022), windowGlowMat);
      wGlass.position.set(wx, 0.66, 0.274);
      houseGroup.add(wFrame, wGlass);
    });

    // Upper side windows
    const sideW3 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.11, 0.11), windowGlowMat);
    sideW3.position.set(-0.302, 0.66, 0);
    const sideW4 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.11, 0.11), windowGlowMat);
    sideW4.position.set(0.302, 0.66, 0);
    houseGroup.add(sideW3, sideW4);

    // 5. Stylized Villa Gabled Roof
    const roofSlopeL = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.038, 0.62), roofMat);
    roofSlopeL.position.set(-0.14, 0.93, 0);
    roofSlopeL.rotation.z = Math.PI * 0.20;
    roofSlopeL.castShadow = true; roofSlopeL.receiveShadow = true;

    const roofSlopeR = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.038, 0.62), roofMat);
    roofSlopeR.position.set(0.14, 0.93, 0);
    roofSlopeR.rotation.z = -Math.PI * 0.20;
    roofSlopeR.castShadow = true; roofSlopeR.receiveShadow = true;

    const gableFront = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.02, 3), wallMat);
    gableFront.rotation.y = Math.PI / 6; gableFront.rotation.z = Math.PI / 2;
    gableFront.position.set(0, 0.88, 0.265);
    const gableBack = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.02, 3), wallMat);
    gableBack.rotation.y = Math.PI / 6; gableBack.rotation.z = Math.PI / 2;
    gableBack.position.set(0, 0.88, -0.265);

    const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.64), ridgeMat);
    ridgeCap.position.set(0, 1.05, 0);
    houseGroup.add(roofSlopeL, roofSlopeR, gableFront, gableBack, ridgeCap);

    // 6. Taller Brick Chimney & Smoke
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.09), chimneyMat);
    chimney.position.set(0.18, 0.98, -0.12);
    chimney.castShadow = true;
    const chimneyCrown = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.11), ridgeMat);
    chimneyCrown.position.set(0.18, 1.13, -0.12);

    const smoke1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.044, 0), smokeMat);
    smoke1.position.set(0.18, 1.19, -0.12);
    const smoke2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.032, 0), smokeMat);
    smoke2.position.set(0.20, 1.27, -0.11);
    smoke1.userData = { isSmoke: true, baseY: 1.19, phase: 0.8 };
    smoke2.userData = { isSmoke: true, baseY: 1.27, phase: 2.0 };
    animatedChimneySmokes.push(smoke1, smoke2);

    houseGroup.add(chimney, chimneyCrown, smoke1, smoke2);
  } else {
    // ══════════════════════════════════════════════════════════════════════════
    // LEVEL 3: Grand Luxury Manor / Estate (3 Houses - Even Bigger House)
    // ══════════════════════════════════════════════════════════════════════════
    // 1. Broad stone foundation & grand multi-step entrance
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.10, 0.74), foundationMat);
    foundation.position.y = 0.05;
    foundation.castShadow = true; foundation.receiveShadow = true;

    const stoop1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.035, 0.16), stoopMat);
    stoop1.position.set(0, 0.02, 0.39);
    const stoop2 = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.035, 0.12), stoopMat);
    stoop2.position.set(0, 0.05, 0.38);
    houseGroup.add(foundation, stoop1, stoop2);

    // 2. Central 2.5-story Grand Pavilion
    const centralWalls = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.76, 0.64), wallMat);
    centralWalls.position.y = 0.48;
    centralWalls.castShadow = true; centralWalls.receiveShadow = true;
    houseGroup.add(centralWalls);

    // Grand entrance portico with twin brass pillars & neoclassical pediment
    const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.44, 8), brassMat);
    colL.position.set(-0.13, 0.28, 0.38); colL.castShadow = true;
    const colR = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.44, 8), brassMat);
    colR.position.set(0.13, 0.28, 0.38); colR.castShadow = true;

    const porticoEntablature = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.14), timberMat);
    porticoEntablature.position.set(0, 0.51, 0.38);
    const porticoPediment = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 3), timberMat);
    porticoPediment.rotation.y = Math.PI / 6; porticoPediment.rotation.z = Math.PI / 2;
    porticoPediment.position.set(0, 0.56, 0.38);
    houseGroup.add(colL, colR, porticoEntablature, porticoPediment);

    // Grand arched double entrance doors
    const doubleDoors = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.02), doorMat);
    doubleDoors.position.set(0, 0.21, 0.322);
    const doorArch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.025, 12, 1, false, 0, Math.PI), brassMat);
    doorArch.rotation.z = Math.PI; doorArch.rotation.y = Math.PI / 2;
    doorArch.position.set(0, 0.35, 0.322);
    houseGroup.add(doubleDoors, doorArch);

    // Grand upper story arched window
    const grandWinFrame = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 0.02), frameMat);
    grandWinFrame.position.set(0, 0.65, 0.322);
    const grandWinGlass = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.20, 0.024), windowGlowMat);
    grandWinGlass.position.set(0, 0.65, 0.322);
    houseGroup.add(grandWinFrame, grandWinGlass);

    // Central high-pitched roof & dormer
    const cRoofL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.70), roofMat);
    cRoofL.position.set(-0.12, 1.01, 0);
    cRoofL.rotation.z = Math.PI * 0.22;
    cRoofL.castShadow = true; cRoofL.receiveShadow = true;

    const cRoofR = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.70), roofMat);
    cRoofR.position.set(0.12, 1.01, 0);
    cRoofR.rotation.z = -Math.PI * 0.22;
    cRoofR.castShadow = true; cRoofR.receiveShadow = true;

    const cGableFront = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 3), wallMat);
    cGableFront.rotation.y = Math.PI / 6; cGableFront.rotation.z = Math.PI / 2;
    cGableFront.position.set(0, 0.96, 0.315);
    const cGableBack = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 3), wallMat);
    cGableBack.rotation.y = Math.PI / 6; cGableBack.rotation.z = Math.PI / 2;
    cGableBack.position.set(0, 0.96, -0.315);

    const cRidgeCap = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.72), ridgeMat);
    cRidgeCap.position.set(0, 1.13, 0);
    houseGroup.add(cRoofL, cRoofR, cGableFront, cGableBack, cRidgeCap);

    // Attic dormer window
    const dormer = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.12), wallMat);
    dormer.position.set(0, 0.96, 0.26);
    const dormerWin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.015), windowGlowMat);
    dormerWin.position.set(0, 0.96, 0.322);
    const dormerRoof = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.08, 4), ridgeMat);
    dormerRoof.rotation.y = Math.PI / 4;
    dormerRoof.position.set(0, 1.05, 0.26);
    houseGroup.add(dormer, dormerWin, dormerRoof);

    // 3. Flanking Side Wings (Left & Right)
    [-0.35, 0.35].forEach((wingX, wIdx) => {
      const isLeft = wIdx === 0;
      // Wing walls
      const wingWalls = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.52, 0.56), wallMat);
      wingWalls.position.set(wingX, 0.36, 0);
      wingWalls.castShadow = true; wingWalls.receiveShadow = true;
      houseGroup.add(wingWalls);

      // Lower window with flower planter
      const wFrame1 = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.018), frameMat);
      wFrame1.position.set(wingX, 0.24, 0.282);
      const wGlass1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.022), windowGlowMat);
      wGlass1.position.set(wingX, 0.24, 0.284);
      const planter = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.04), planterMat);
      planter.position.set(wingX, 0.165, 0.30);
      const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.015, 0), new THREE.MeshStandardMaterial({ color: isLeft ? 0xf43f5e : 0x38bdf8 }));
      fl.position.set(wingX, 0.19, 0.30);
      houseGroup.add(wFrame1, wGlass1, planter, fl);

      // Upper window
      const wFrame2 = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.018), frameMat);
      wFrame2.position.set(wingX, 0.48, 0.282);
      const wGlass2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.022), windowGlowMat);
      wGlass2.position.set(wingX, 0.48, 0.284);
      houseGroup.add(wFrame2, wGlass2);

      // Side glowing window on outermost facade
      const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.12, 0.12), windowGlowMat);
      sideWin.position.set(isLeft ? wingX - 0.122 : wingX + 0.122, 0.36, 0);
      houseGroup.add(sideWin);

      // Sloped wing hipped roof
      const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.036, 0.60), roofMat);
      wingRoof.position.set(wingX, 0.71, 0);
      wingRoof.rotation.z = isLeft ? Math.PI * 0.10 : -Math.PI * 0.10;
      wingRoof.castShadow = true;
      houseGroup.add(wingRoof);

      // Wing brick chimney with smoke
      const chimX = isLeft ? wingX - 0.04 : wingX + 0.04;
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), chimneyMat);
      chim.position.set(chimX, 0.84, -0.12);
      chim.castShadow = true;
      const chimCrn = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.10), ridgeMat);
      chimCrn.position.set(chimX, 0.99, -0.12);

      const smk1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.038, 0), smokeMat);
      smk1.position.set(chimX, 1.05, -0.12);
      smk1.userData = { isSmoke: true, baseY: 1.05, phase: isLeft ? 0.3 : 1.8 };
      animatedChimneySmokes.push(smk1);
      houseGroup.add(chim, chimCrn, smk1);
    });
  }

  return houseGroup;
}

/**
 * 3. Detailed Contemporary Skyscraper Mesh (Level 4 Landmark)
 */
export function createDetailedSkyscraperMesh(ownerColor) {
  const towerGroup = new THREE.Group();

  // Materials
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.3 });
  const lobbyGlassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.75, transparent: true, opacity: 0.90 });
  const pylonMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.5 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.18, metalness: 0.85 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.85 });
  const ownerAccentMat = new THREE.MeshStandardMaterial({ color: ownerColor, emissive: ownerColor, emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.3 });
  const glassTowerMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.65, flatShading: true });
  const midTowerMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.18, metalness: 0.55, flatShading: true });
  const warmWindowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 0.75, roughness: 0.2 });
  const coolWindowMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 0.7, roughness: 0.2 });
  const helipadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.15 });
  const whiteMarkMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xef4444, emissiveIntensity: 1.6, roughness: 0.1 });

  // ────────────────────────────────────────────────────────────────────────
  // TIER 1: Grand Lobby & Architectural Foundation Plinth
  // ────────────────────────────────────────────────────────────────────────
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.12, 0.96), plinthMat);
  plinth.position.y = 0.06;
  plinth.castShadow = true; plinth.receiveShadow = true;
  towerGroup.add(plinth);

  const lobbyGlass = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.42, 0.84), lobbyGlassMat);
  lobbyGlass.position.y = 0.33;
  lobbyGlass.castShadow = true; lobbyGlass.receiveShadow = true;
  towerGroup.add(lobbyGlass);

  // 4 Corner structural lobby columns
  [[-0.41, -0.41], [0.41, -0.41], [-0.41, 0.41], [0.41, 0.41]].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.08), pylonMat);
    col.position.set(cx, 0.33, cz);
    col.castShadow = true;
    towerGroup.add(col);
  });

  // Entrance marquee canopy & revolving doors
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.20), chromeMat);
  canopy.position.set(0, 0.28, 0.48);
  canopy.castShadow = true;
  const revDoor = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 10), brassMat);
  revDoor.position.set(0, 0.21, 0.42);
  towerGroup.add(canopy, revDoor);

  // Lobby neon crown band (player's ownerColor!)
  const lobbyBand = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.045, 0.88), ownerAccentMat);
  lobbyBand.position.y = 0.54;
  towerGroup.add(lobbyBand);

  // ────────────────────────────────────────────────────────────────────────
  // TIER 2: Main High-Rise Tower Shaft
  // ────────────────────────────────────────────────────────────────────────
  const mainShaft = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.82, 0.74), glassTowerMat);
  mainShaft.position.y = 0.97;
  mainShaft.castShadow = true; mainShaft.receiveShadow = true;
  towerGroup.add(mainShaft);

  // Corner vertical metallic mullions
  [[-0.37, -0.37], [0.37, -0.37], [-0.37, 0.37], [0.37, 0.37]].forEach(([cx, cz]) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.84, 0.05), chromeMat);
    fin.position.set(cx, 0.97, cz);
    fin.castShadow = true;
    towerGroup.add(fin);
  });

  // Horizontal floor spandrel bands
  [0.72, 0.97, 1.22].forEach(yPos => {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.03, 0.76), chromeMat);
    band.position.y = yPos;
    towerGroup.add(band);
  });

  // Illuminated office window bays
  const winPositions = [
    { x: -0.18, y: 0.84, z: 0.373, warm: true },
    { x: 0.18, y: 0.84, z: 0.373, warm: false },
    { x: 0, y: 1.09, z: 0.373, warm: true },
    { x: -0.18, y: 1.34, z: 0.373, warm: false },
    { x: 0.18, y: 1.34, z: 0.373, warm: true },
    // Side windows
    { x: 0.373, y: 0.84, z: 0, warm: true, side: true },
    { x: 0.373, y: 1.09, z: -0.18, warm: false, side: true },
    { x: 0.373, y: 1.34, z: 0.18, warm: true, side: true },
    { x: -0.373, y: 0.84, z: 0, warm: false, side: true },
    { x: -0.373, y: 1.09, z: 0.18, warm: true, side: true },
  ];
  winPositions.forEach(wp => {
    const wGeo = wp.side ? new THREE.BoxGeometry(0.02, 0.14, 0.22) : new THREE.BoxGeometry(0.22, 0.14, 0.02);
    const win = new THREE.Mesh(wGeo, wp.warm ? warmWindowMat : coolWindowMat);
    win.position.set(wp.x, wp.y, wp.z);
    towerGroup.add(win);
  });

  // ────────────────────────────────────────────────────────────────────────
  // TIER 3: Stepped Setback Terrace & Mid Tower
  // ────────────────────────────────────────────────────────────────────────
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.05, 0.76), plinthMat);
  terrace.position.y = 1.40;
  terrace.castShadow = true;
  towerGroup.add(terrace);

  const midShaft = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.68, 0.56), midTowerMat);
  midShaft.position.y = 1.76;
  midShaft.castShadow = true; midShaft.receiveShadow = true;
  towerGroup.add(midShaft);

  // Vertical corner illuminated LED ribbons (in ownerColor!)
  [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].forEach(([cx, cz]) => {
    const ledRibbon = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.70, 0.035), ownerAccentMat);
    ledRibbon.position.set(cx, 1.76, cz);
    towerGroup.add(ledRibbon);
  });

  // Mid-tower illuminated windows
  const midWins = [
    { x: 0, y: 1.62, z: 0.283, warm: true },
    { x: 0, y: 1.88, z: 0.283, warm: false },
    { x: 0.283, y: 1.75, z: 0, warm: true, side: true },
    { x: -0.283, y: 1.75, z: 0, warm: true, side: true },
  ];
  midWins.forEach(wp => {
    const wGeo = wp.side ? new THREE.BoxGeometry(0.02, 0.13, 0.18) : new THREE.BoxGeometry(0.18, 0.13, 0.02);
    const win = new THREE.Mesh(wGeo, wp.warm ? warmWindowMat : coolWindowMat);
    win.position.set(wp.x, wp.y, wp.z);
    towerGroup.add(win);
  });

  // ────────────────────────────────────────────────────────────────────────
  // TIER 4: Penthouse Pavilion & Rooftop Helipad
  // ────────────────────────────────────────────────────────────────────────
  const midTerrace = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.04, 0.58), plinthMat);
  midTerrace.position.y = 2.12;
  towerGroup.add(midTerrace);

  const penthouse = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.42), lobbyGlassMat);
  penthouse.position.y = 2.30;
  penthouse.castShadow = true;
  towerGroup.add(penthouse);

  const penthouseCornice = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.46), chromeMat);
  penthouseCornice.position.y = 2.47;
  towerGroup.add(penthouseCornice);

  // Luxury Rooftop Helipad
  const helipad = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 16), helipadMat);
  helipad.position.y = 2.50;
  helipad.castShadow = true;
  towerGroup.add(helipad);

  // Helipad painted landing ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 24), whiteMarkMat);
  ring.position.y = 2.52; ring.rotation.x = Math.PI / 2;
  towerGroup.add(ring);

  // Helipad "H" letter mark
  const hBarL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.005, 0.16), brassMat);
  hBarL.position.set(-0.06, 2.52, 0);
  const hBarR = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.005, 0.16), brassMat);
  hBarR.position.set(0.06, 2.52, 0);
  const hBarC = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.005, 0.025), brassMat);
  hBarC.position.set(0, 2.52, 0);
  towerGroup.add(hBarL, hBarR, hBarC);

  // Helipad perimeter micro warning lights
  [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([lx, lz], idx) => {
    const pLight = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? 0x22c55e : 0xfacc15 }));
    pLight.position.set(lx, 2.53, lz);
    towerGroup.add(pLight);
  });

  // ────────────────────────────────────────────────────────────────────────
  // TIER 5: Architectural Pinnacle Spire & Flashing Aviation Beacon
  // ────────────────────────────────────────────────────────────────────────
  const spireBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.08, 8), chromeMat);
  spireBase.position.y = 2.56;
  const spireNeedle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.032, 0.64, 8), chromeMat);
  spireNeedle.position.y = 2.92;
  spireNeedle.castShadow = true;

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), beaconMat);
  beacon.position.y = 3.26;
  beacon.userData = { isBeacon: true, phase: Math.random() * Math.PI * 2 };
  animatedSkyscraperBeacons.push(beacon);

  towerGroup.add(spireBase, spireNeedle, beacon);

  return towerGroup;
}

export function refreshTileTextureAndBuildings(tileId) {
  const tile = BOARD_TILES[tileId];
  const mesh = tilesMeshMap[tileId];
  if (!tile || !mesh) return;

  const propState = gameState.properties[tileId] || null;
  const newTex = createTileTexture(tile, propState);
  if (Array.isArray(mesh.material) && mesh.material[2]) {
    if (mesh.material[2].map) mesh.material[2].map.dispose();
    mesh.material[2].map = newTex;
    mesh.material[2].needsUpdate = true;
  }

  // Update block 3D side material color dynamically based on ownership
  const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
  const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
  const lightPlayerAccent = ownerTheme ? getLightPlayerAccent(ownerTheme.colorHex, 0.40) : null;
  const sideColor = isOwned
    ? new THREE.Color(lightPlayerAccent)
    : new THREE.Color(0xe2e8f0);

  const isNight = (currentBulbMode === 'night');
  const isSunset = (currentBulbMode === 'sunset');

  if (Array.isArray(mesh.material)) {
    [0, 1, 3, 4, 5].forEach(idx => {
      if (mesh.material[idx]) {
        mesh.material[idx].color.copy(sideColor);
        if (isOwned && isNight && lightPlayerAccent) {
          mesh.material[idx].emissive.setStyle(lightPlayerAccent);
          mesh.material[idx].emissiveIntensity = 0.50;
        } else if (isOwned && isSunset && lightPlayerAccent) {
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

  // Update top glass border frame
  const frame = tileBorderFrames[tileId];
  if (frame && frame.userData?.borderMat) {
    if (isOwned && lightPlayerAccent) {
      frame.userData.borderMat.color.setStyle(lightPlayerAccent);
      frame.userData.borderMat.emissive.setStyle(lightPlayerAccent);
      if (isNight) {
        frame.visible = true;
        frame.userData.borderMat.emissiveIntensity = 0.85;
      } else if (isSunset) {
        frame.visible = true;
        frame.userData.borderMat.emissiveIntensity = 0.45;
      } else {
        frame.visible = false;
        frame.userData.borderMat.emissiveIntensity = 0;
      }
    } else {
      frame.visible = false;
      frame.userData.borderMat.emissiveIntensity = 0;
    }
  }

  // Corner tiles (START, ISLAND, FESTIVAL, AIRPORT) have static 3D landmarks
  if ([0, 8, 16, 24].includes(tileId)) return;

  const bGroup = tileBuildingGroups[tileId];
  if (!bGroup) return;
  while (bGroup.children.length > 0) bGroup.remove(bGroup.children[0]);
  if (!propState || propState.owner === null || propState.mortgaged) return;

  // Align bGroup with tile orientation facing inward
  const pos = getTileWorldPosition(tileId);
  if (pos.side === 1) bGroup.rotation.y = -Math.PI / 2;
  else if (pos.side === 2) bGroup.rotation.y = Math.PI;
  else if (pos.side === 3) bGroup.rotation.y = Math.PI / 2;
  else bGroup.rotation.y = 0;

  const ownerColor = PLAYER_THEMES[propState.owner]?.charColor ?? 0x6366f1;

  const lvl = propState.level || 0;

  if (lvl === 0) {
    // 0 houses: Show ownership flag claiming the property
    const flagMesh = createDetailedFlagMesh(ownerColor);
    flagMesh.position.set(-0.18, 0, -0.75);
    flagMesh.scale.set(0.01, 0.01, 0.01);
    bGroup.add(flagMesh);
    animatedBuildingPopups.push({ mesh: flagMesh, startTime: performance.now(), duration: 400 });
  } else if (lvl >= 1 && lvl <= 3) {
    // Level 1: flag is removed, 1 house placed
    // Level 2: 1 house replaced by a bigger house
    // Level 3: replaced by an even bigger house
    const hGroup = createDetailedHouseMesh(ownerColor, lvl);
    hGroup.position.set(0, 0, -0.78);
    hGroup.scale.set(0.01, 0.01, 0.01);
    bGroup.add(hGroup);
    animatedBuildingPopups.push({ mesh: hGroup, startTime: performance.now(), duration: 420 });
  } else if (lvl >= 4) {
    // Level 4 (after 3 houses): replaced by a skyscraper
    const towerGroup = createDetailedSkyscraperMesh(ownerColor);
    towerGroup.position.set(0, 0, -0.68);
    towerGroup.scale.set(0.01, 0.01, 0.01);
    bGroup.add(towerGroup);
    animatedBuildingPopups.push({ mesh: towerGroup, startTime: performance.now(), duration: 500 });
  }
}

export const updateTileMesh = refreshTileTextureAndBuildings;

// ──────────────────────────────────────────────────────────────────────────────
// 3D Road Cars
// ──────────────────────────────────────────────────────────────────────────────
function createDetailed3DVehicleMesh(variantIdx) {
  const carGroup = new THREE.Group();
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });
  const rimMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.85, flatShading: true });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 0.85, roughness: 0.2 });

  const wheels = [];
  const suspensionGroup = new THREE.Group();
  carGroup.add(suspensionGroup);

  // Variant 1: Heavy Cargo Delivery Box Truck
  if (variantIdx === 1) {
    const underShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.65), new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.35 }));
    underShadow.rotation.x = -Math.PI / 2; underShadow.position.y = 0.02; carGroup.add(underShadow);

    const cabMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.2, flatShading: true }); // Ocean blue cab
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5, metalness: 0.1, flatShading: true }); // Clean white freight box
    const chassisMat = new THREE.MeshLambertMaterial({ color: 0x334155 });

    // Steel frame chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 0.44), chassisMat);
    chassis.position.set(0, 0.18, 0); chassis.castShadow = true; chassis.receiveShadow = true;
    suspensionGroup.add(chassis);

    // Front Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.50), cabMat);
    cab.position.set(0.44, 0.40, 0); cab.castShadow = true; cab.receiveShadow = true;
    suspensionGroup.add(cab);

    // Cab windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.46), glassMat);
    windshield.position.set(0.64, 0.45, 0);
    suspensionGroup.add(windshield);

    // Heavy front bumper & grille
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.16, 0.52), chromeMat);
    bumper.position.set(0.70, 0.18, 0); bumper.castShadow = true;
    suspensionGroup.add(bumper);

    // Aerodynamic roof fairing / wind deflector atop cab
    const deflector = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.46), cabMat);
    deflector.position.set(0.40, 0.68, 0); deflector.castShadow = true;
    suspensionGroup.add(deflector);

    // Large rectangular freight box container
    const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.58, 0.52), boxMat);
    cargoBox.position.set(-0.25, 0.48, 0); cargoBox.castShadow = true; cargoBox.receiveShadow = true;
    // Red cargo accent stripe on box
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.925, 0.08, 0.525), new THREE.MeshLambertMaterial({ color: 0xef4444 }));
    stripe.position.set(-0.25, 0.48, 0);
    suspensionGroup.add(cargoBox, stripe);

    // Vertical chrome exhaust pipe behind cab
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.52, 8), chromeMat);
    exhaust.position.set(0.18, 0.52, 0.23); exhaust.castShadow = true;
    suspensionGroup.add(exhaust);

    // Headlights and taillights
    [-0.18, 0.18].forEach(zOff => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.10), headlightMat);
      hl.position.set(0.71, 0.25, zOff);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.08), taillightMat);
      tl.position.set(-0.72, 0.26, zOff);
      suspensionGroup.add(hl, tl);
    });

    // 6 Wheels (2 front steering, 4 rear heavy-duty tandem duals)
    [
      { x: 0.48, z: 0.27 }, { x: 0.48, z: -0.27 },
      { x: -0.15, z: 0.27 }, { x: -0.15, z: -0.27 },
      { x: -0.48, z: 0.27 }, { x: -0.48, z: -0.27 }
    ].forEach(wc => {
      const wPivot = new THREE.Group(); wPivot.position.set(wc.x, 0.14, wc.z);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.10, 12), wheelMat); tire.rotation.x = Math.PI / 2; tire.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.11, 6), rimMat); hub.rotation.x = Math.PI / 2;
      wPivot.add(tire, hub); carGroup.add(wPivot); wheels.push(wPivot);
    });

    carGroup.userData = { wheels, suspensionGroup };
    return carGroup;
  }

  // Variant 3: Cruiser / Commuter Motorcycle with Rider
  if (variantIdx === 3) {
    const underShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.34), new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.35 }));
    underShadow.rotation.x = -Math.PI / 2; underShadow.position.y = 0.02; carGroup.add(underShadow);

    const bikeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.3, flatShading: true }); // Bright orange bike
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const riderSuitMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.3 }); // Yellow racing helmet

    // Steel chassis frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.12), frameMat);
    frame.position.set(0, 0.18, 0); frame.castShadow = true;
    suspensionGroup.add(frame);

    // Cylindrical chrome engine block
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8), chromeMat);
    engine.rotation.z = Math.PI / 2; engine.position.set(0, 0.18, 0);
    suspensionGroup.add(engine);

    // Chrome exhaust pipe running along side
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 6), chromeMat);
    exhaust.rotation.z = Math.PI / 2; exhaust.position.set(-0.16, 0.12, 0.10);
    suspensionGroup.add(exhaust);

    // Fuel tank
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.16), bikeMat);
    tank.position.set(0.10, 0.28, 0); tank.castShadow = true;
    suspensionGroup.add(tank);

    // Black leather seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.14), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
    seat.position.set(-0.10, 0.26, 0);
    suspensionGroup.add(seat);

    // Front fork struts
    const forkL = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 6), chromeMat);
    forkL.rotation.z = -0.32; forkL.position.set(0.24, 0.22, -0.06);
    const forkR = forkL.clone(); forkR.position.z = 0.06;
    suspensionGroup.add(forkL, forkR);

    // Handlebars with grips
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.30), chromeMat);
    hBar.position.set(0.18, 0.36, 0);
    suspensionGroup.add(hBar);

    // Round front headlight & rear brake light
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), headlightMat);
    hl.position.set(0.35, 0.28, 0);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08), taillightMat);
    tl.position.set(-0.32, 0.25, 0);
    suspensionGroup.add(hl, tl);

    // Stylized rider leaning forward
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.20), riderSuitMat);
    torso.rotation.z = -0.22; torso.position.set(-0.06, 0.42, 0); torso.castShadow = true;
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), helmetMat);
    helmet.position.set(0.04, 0.58, 0); helmet.castShadow = true;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.12), glassMat);
    visor.position.set(0.11, 0.58, 0);
    suspensionGroup.add(torso, helmet, visor);

    // 2 Wheels (Front & Rear)
    [{ x: 0.32, z: 0, w: 0.07 }, { x: -0.28, z: 0, w: 0.09 }].forEach(wc => {
      const wPivot = new THREE.Group(); wPivot.position.set(wc.x, 0.14, wc.z);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, wc.w, 12), wheelMat); tire.rotation.x = Math.PI / 2; tire.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, wc.w + 0.01, 6), rimMat); hub.rotation.x = Math.PI / 2;
      wPivot.add(tire, hub); carGroup.add(wPivot); wheels.push(wPivot);
    });

    carGroup.userData = { wheels, suspensionGroup };
    return carGroup;
  }

  // Variants 0, 2, 4: Sports Car, Taxi, Compact SUV
  const bodyColors = [0xef4444, 0x0284c7, 0xfacc15, 0xf97316, 0x10b981];
  const paintMat = new THREE.MeshStandardMaterial({ color: bodyColors[variantIdx % bodyColors.length], roughness: 0.3, metalness: 0.2, flatShading: true });

  const underShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.58), new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.32 }));
  underShadow.rotation.x = -Math.PI / 2; underShadow.position.y = 0.02; carGroup.add(underShadow);

  const isSUV = (variantIdx === 4);
  const isSports = (variantIdx === 0);
  const isTaxi = (variantIdx === 2);

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.22, 0.50), paintMat);
  chassis.position.y = 0.20; chassis.castShadow = true; chassis.receiveShadow = true; suspensionGroup.add(chassis);

  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.48), new THREE.MeshLambertMaterial({ color: 0x334155 }));
  bumperF.position.set(0.46, 0.15, 0); bumperF.castShadow = true; suspensionGroup.add(bumperF);

  const cabinLength = isSUV ? 0.62 : 0.48;
  const cabinHeight = isSUV ? 0.24 : 0.20;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinLength, cabinHeight, 0.42), glassMat);
  cabin.position.set(isSUV ? -0.04 : -0.02, 0.38, 0); cabin.castShadow = true; suspensionGroup.add(cabin);

  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(cabinLength - 0.08, 0.05, 0.38), paintMat);
  roofCap.position.set(isSUV ? -0.04 : -0.02, 0.38 + cabinHeight * 0.5, 0); roofCap.castShadow = true; suspensionGroup.add(roofCap);

  if (isSports) {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.48), paintMat);
    spoiler.position.set(-0.42, 0.38, 0); spoiler.castShadow = true; suspensionGroup.add(spoiler);
  } else if (isTaxi) {
    const taxiSign = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.22), headlightMat);
    taxiSign.position.set(0, 0.54, 0); taxiSign.castShadow = true; suspensionGroup.add(taxiSign);
  } else if (isSUV) {
    [-0.14, 0.14].forEach(rz => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.03), chromeMat);
      rail.position.set(-0.04, 0.52, rz);
      suspensionGroup.add(rail);
    });
  }

  [-0.16, 0.16].forEach(zOff => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.10), headlightMat);
    hl.position.set(0.47, 0.22, zOff);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.10), taillightMat);
    tl.position.set(-0.47, 0.22, zOff);
    suspensionGroup.add(hl, tl);
  });

  [{ x: 0.28, z: 0.26 }, { x: 0.28, z: -0.26 }, { x: -0.28, z: 0.26 }, { x: -0.28, z: -0.26 }].forEach(wc => {
    const wPivot = new THREE.Group(); wPivot.position.set(wc.x, 0.13, wc.z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.10, 12), wheelMat); tire.rotation.x = Math.PI / 2; tire.castShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.11, 6), rimMat); hub.rotation.x = Math.PI / 2;
    wPivot.add(tire, hub); carGroup.add(wPivot); wheels.push(wPivot);
  });

  carGroup.userData = { wheels, suspensionGroup };
  return carGroup;
}

function getRoadTrackPoint(p, R) {
  const cr = 1.35; // corner radius
  const hs = R - cr; // straight half length
  const sLen = 2 * hs; // straight length
  const cLen = 0.5 * Math.PI * cr; // corner arc length
  const qLen = sLen + cLen; // quadrant length
  const totalLen = 4 * qLen;

  let d = (((p % 1) + 1) % 1) * totalLen;
  const qIdx = Math.floor(d / qLen);
  const qDist = d - qIdx * qLen;

  let x = 0, z = 0;
  if (qIdx === 0) {
    if (qDist < sLen) {
      x = hs - (qDist / sLen) * (2 * hs);
      z = R;
    } else {
      const t = (qDist - sLen) / cLen;
      const angle = Math.PI / 2 + t * (Math.PI / 2);
      x = -hs + cr * Math.cos(angle);
      z = hs + cr * Math.sin(angle);
    }
  } else if (qIdx === 1) {
    if (qDist < sLen) {
      x = -R;
      z = hs - (qDist / sLen) * (2 * hs);
    } else {
      const t = (qDist - sLen) / cLen;
      const angle = Math.PI + t * (Math.PI / 2);
      x = -hs + cr * Math.cos(angle);
      z = -hs + cr * Math.sin(angle);
    }
  } else if (qIdx === 2) {
    if (qDist < sLen) {
      x = -hs + (qDist / sLen) * (2 * hs);
      z = -R;
    } else {
      const t = (qDist - sLen) / cLen;
      const angle = 1.5 * Math.PI + t * (Math.PI / 2);
      x = hs + cr * Math.cos(angle);
      z = -hs + cr * Math.sin(angle);
    }
  } else {
    if (qDist < sLen) {
      x = R;
      z = -hs + (qDist / sLen) * (2 * hs);
    } else {
      const t = (qDist - sLen) / cLen;
      const angle = 2 * Math.PI + t * (Math.PI / 2);
      x = hs + cr * Math.cos(angle);
      z = hs + cr * Math.sin(angle);
    }
  }
  return { x, z };
}

let lastCarAnimTime = performance.now();

function buildAnimatedRoadCars3D() {
  roadCars.forEach(c => { if (c.mesh) boardGroup.remove(c.mesh); });
  roadCars = [];
  lastCarAnimTime = performance.now();

  for (let i = 0; i < 5; i++) {
    const carMesh = createDetailed3DVehicleMesh(i);
    const laneRadius = (i % 2 === 0) ? 9.48 : 8.92;
    const direction = (i % 2 === 0) ? 1 : -1;
    const baseSpeed = 0.00016 + Math.random() * 0.00008;
    boardGroup.add(carMesh);
    roadCars.push({
      mesh: carMesh,
      progress: (i / 5) + Math.random() * 0.08,
      currentSpeed: baseSpeed,
      targetSpeed: baseSpeed,
      minSpeed: 0.00010,
      maxSpeed: 0.00028,
      laneRadius,
      direction,
      nextSpeedChangeTime: performance.now() + 1000 + Math.random() * 2500,
      bobPhase: Math.random() * Math.PI * 2
    });
  }
}

function updateRoadCarsAnimation() {
  const now = performance.now();
  const dtScale = Math.min(2.0, Math.max(0.4, (now - lastCarAnimTime) / 16.67));
  lastCarAnimTime = now;

  roadCars.forEach((c, idx) => {
    if (now >= c.nextSpeedChangeTime) {
      const r = Math.random();
      c.targetSpeed = r < 0.3 ? c.maxSpeed * (0.85 + Math.random() * 0.15) : r < 0.65 ? c.minSpeed + (c.maxSpeed - c.minSpeed) * (0.4 + Math.random() * 0.3) : c.minSpeed * (0.95 + Math.random() * 0.15);
      c.nextSpeedChangeTime = now + 1600 + Math.random() * 3000;
    }

    roadCars.forEach((other, oIdx) => {
      if (idx === oIdx || c.direction !== other.direction || c.laneRadius !== other.laneRadius) return;
      let d = (other.progress - c.progress) * c.direction;
      if (d < 0) d += 1;
      if (d > 0 && d < 0.08) {
        c.targetSpeed = Math.min(c.targetSpeed, other.currentSpeed * 0.8);
      }
    });

    const accel = c.targetSpeed - c.currentSpeed;
    c.currentSpeed += accel * 0.04;
    c.progress = (c.progress + c.currentSpeed * c.direction * dtScale + 1) % 1;

    const pos = getRoadTrackPoint(c.progress, c.laneRadius);
    const stepAhead = 0.0015 * c.direction;
    const posAhead = getRoadTrackPoint((c.progress + stepAhead + 1) % 1, c.laneRadius);

    const dx = posAhead.x - pos.x;
    const dz = posAhead.z - pos.z;
    const targetRotY = Math.atan2(-dz, dx);

    c.mesh.position.set(pos.x, 0.36, pos.z);

    const curY = c.mesh.rotation.y;
    let diffY = ((targetRotY - curY + Math.PI) % (Math.PI * 2));
    if (diffY < 0) diffY += Math.PI * 2;
    diffY -= Math.PI;
    c.mesh.rotation.y = curY + diffY * 0.28;

    const ud = c.mesh.userData;
    if (ud?.wheels) {
      ud.wheels.forEach(w => {
        w.rotation.z -= Math.abs(c.currentSpeed) * dtScale * 140;
      });
    }
    if (ud?.suspensionGroup) {
      ud.suspensionGroup.position.y = Math.sin(now * 0.015 + c.bobPhase) * 0.010;
      ud.suspensionGroup.rotation.z = Math.max(-0.06, Math.min(0.06, -accel * 40));
      ud.suspensionGroup.rotation.x = Math.max(-0.08, Math.min(0.08, -diffY * 0.25));
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// 3D Dice
// ──────────────────────────────────────────────────────────────────────────────
function build3DDicePair() {
  const materials = [];
  for (let face = 1; face <= 6; face++) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, 242, 242);
    ctx.fillStyle = (face === 1 || face === 4) ? '#ef4444' : '#0f172a';
    const pips = { 1: [[128, 128]], 2: [[70, 70], [186, 186]], 3: [[64, 64], [128, 128], [192, 192]], 4: [[70, 70], [186, 70], [70, 186], [186, 186]], 5: [[66, 66], [190, 66], [128, 128], [66, 190], [190, 190]], 6: [[70, 58], [186, 58], [70, 128], [186, 128], [70, 198], [186, 198]] }[face];
    pips.forEach(([px, py]) => { ctx.beginPath(); ctx.arc(px, py, face === 1 ? 28 : 22, 0, Math.PI * 2); ctx.fill(); });
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = maxAnisotropy;
    materials.push(new THREE.MeshLambertMaterial({ map: tex }));
  }
  const restingCoords = [{ x: -2.25, z: -0.95 }, { x: -0.95, z: -2.25 }];
  for (let i = 0; i < 2; i++) {
    const dieGroup = new THREE.Group();
    const dieMesh = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.38, 1.38), materials);
    dieMesh.castShadow = true; dieMesh.receiveShadow = true; dieGroup.add(dieMesh);
    dieGroup.position.set(restingCoords[i].x, 1.05, restingCoords[i].z);
    boardGroup.add(dieGroup); diceMeshes.push(dieGroup);
  }
}

function getTargetRotationForDieFace(faceVal) {
  switch (faceVal) {
    case 1: return { x: 0, z: Math.PI / 2 };
    case 2: return { x: 0, z: -Math.PI / 2 };
    case 3: return { x: 0, z: 0 };
    case 4: return { x: Math.PI, z: 0 };
    case 5: return { x: -Math.PI / 2, z: 0 };
    case 6: return { x: Math.PI / 2, z: 0 };
    default: return { x: 0, z: 0 };
  }
}

function getCSSDiceRotationForFace(faceVal) {
  switch (faceVal) {
    case 1: return { x: 0, y: 0 };
    case 2: return { x: -90, y: 0 };
    case 3: return { x: 0, y: -90 };
    case 4: return { x: 0, y: 90 };
    case 5: return { x: 90, y: 0 };
    case 6: return { x: 0, y: 180 };
    default: return { x: 0, y: 0 };
  }
}

export function animate3DDiceTumble(d1, d2) {
  return new Promise(resolve => {
    // 1. Play realistic dice shuffle sound
    playSFX('diceShuffle');

    const overlay = document.getElementById('screen-dice-overlay');
    const backdrop = document.getElementById('dice-overlay-backdrop');
    const actor1 = document.getElementById('dice-actor-1');
    const actor2 = document.getElementById('dice-actor-2');
    const die1 = document.getElementById('screen-die-1');
    const die2 = document.getElementById('screen-die-2');
    const shadow1 = document.getElementById('screen-die-shadow-1');
    const shadow2 = document.getElementById('screen-die-shadow-2');
    const resultBadge = document.getElementById('dice-overlay-result');
    const resultText = document.getElementById('dice-overlay-result-text');
    const sumBadge = document.getElementById('dice-sum-badge');
    if (sumBadge) sumBadge.classList.add('hidden');

    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
      overlay.style.opacity = '1';
      if (backdrop) backdrop.style.opacity = '1';
      if (resultBadge) resultBadge.style.transform = 'scale(0)';
    }

    const duration = 1250;
    const startTime = performance.now();

    // 3D Three.js dice coordinates & rotations
    const rot1 = getTargetRotationForDieFace(d1);
    const rot2 = getTargetRotationForDieFace(d2);
    const startPos = [{ x: -3.6, z: 0.4 }, { x: 0.4, z: -3.6 }];
    const endPos = [{ x: -2.25, z: -0.95 }, { x: -0.95, z: -2.25 }];
    const spins1 = { x: rot1.x + Math.PI * 4, y: Math.PI * 2.25, z: rot1.z + Math.PI * 2 };
    const spins2 = { x: rot2.x - Math.PI * 4, y: -Math.PI * 1.75, z: rot2.z + Math.PI * 2 };
    // Hide background dice on board while rolling overlay is active
    diceMeshes.forEach(d => { d.visible = false; });

    // CSS Screen Dice target rotations
    const cssRot1 = getCSSDiceRotationForFace(d1);
    const cssRot2 = getCSSDiceRotationForFace(d2);
    const cssSpins1 = { x: cssRot1.x + 360 * 3, y: cssRot1.y + 360 * 4, z: 360 * 2 };
    const cssSpins2 = { x: cssRot2.x - 360 * 3, y: cssRot2.y - 360 * 4, z: -360 * 2 };

    let bounced1 = false;
    let bounced2 = false;

    function stepDice(now) {
      const rawT = Math.min(1, (now - startTime) / duration);

      // Screen Overlay 3D Dice Bounces
      let bounceY1 = 0, shadowScale1 = 1, shadowOp1 = 0.8;
      let bounceY2 = 0, shadowScale2 = 1, shadowOp2 = 0.8;

      if (rawT < 0.44) {
        const p = rawT / 0.44;
        bounceY1 = -220 * (1 - p * p);
        shadowScale1 = 0.45 + 0.55 * p;
        shadowOp1 = 0.25 + 0.55 * p;
      } else if (rawT < 0.76) {
        if (!bounced1) { bounced1 = true; playSFX('diceBounce'); }
        const p = (rawT - 0.44) / 0.32;
        bounceY1 = -Math.sin(p * Math.PI) * 82;
        shadowScale1 = 1 - Math.sin(p * Math.PI) * 0.45;
        shadowOp1 = 0.8 - Math.sin(p * Math.PI) * 0.4;
      } else if (rawT < 0.93) {
        if (!bounced2) { bounced2 = true; playSFX('diceBounce'); }
        const p = (rawT - 0.76) / 0.17;
        bounceY1 = -Math.sin(p * Math.PI) * 18;
        shadowScale1 = 1 - Math.sin(p * Math.PI) * 0.2;
        shadowOp1 = 0.8 - Math.sin(p * Math.PI) * 0.2;
      } else {
        bounceY1 = 0; shadowScale1 = 1; shadowOp1 = 0.8;
      }

      const t2 = Math.max(0, Math.min(1, (now - startTime - 35) / (duration - 35)));
      if (t2 < 0.44) {
        const p = t2 / 0.44;
        bounceY2 = -240 * (1 - p * p);
        shadowScale2 = 0.45 + 0.55 * p;
        shadowOp2 = 0.25 + 0.55 * p;
      } else if (t2 < 0.76) {
        const p = (t2 - 0.44) / 0.32;
        bounceY2 = -Math.sin(p * Math.PI) * 90;
        shadowScale2 = 1 - Math.sin(p * Math.PI) * 0.45;
        shadowOp2 = 0.8 - Math.sin(p * Math.PI) * 0.4;
      } else if (t2 < 0.93) {
        const p = (t2 - 0.76) / 0.17;
        bounceY2 = -Math.sin(p * Math.PI) * 20;
        shadowScale2 = 1 - Math.sin(p * Math.PI) * 0.2;
        shadowOp2 = 0.8 - Math.sin(p * Math.PI) * 0.2;
      } else {
        bounceY2 = 0; shadowScale2 = 1; shadowOp2 = 0.8;
      }

      if (actor1) actor1.style.transform = `translateY(${bounceY1}px)`;
      if (actor2) actor2.style.transform = `translateY(${bounceY2}px)`;
      if (shadow1) { shadow1.style.transform = `scale(${shadowScale1})`; shadow1.style.opacity = shadowOp1; }
      if (shadow2) { shadow2.style.transform = `scale(${shadowScale2})`; shadow2.style.opacity = shadowOp2; }

      // Rotations
      const rotProgress = 1 - Math.pow(1 - rawT, 2.8);
      const curX1 = cssSpins1.x * (1 - rotProgress) + cssRot1.x * rotProgress;
      const curY1 = cssSpins1.y * (1 - rotProgress) + cssRot1.y * rotProgress;
      const curZ1 = cssSpins1.z * (1 - rotProgress);

      const curX2 = cssSpins2.x * (1 - rotProgress) + cssRot2.x * rotProgress;
      const curY2 = cssSpins2.y * (1 - rotProgress) + cssRot2.y * rotProgress;
      const curZ2 = cssSpins2.z * (1 - rotProgress);

      if (die1) die1.style.transform = `rotateX(${curX1}deg) rotateY(${curY1}deg) rotateZ(${curZ1}deg)`;
      if (die2) die2.style.transform = `rotateX(${curX2}deg) rotateY(${curY2}deg) rotateZ(${curZ2}deg)`;

      if (rawT < 1) {
        requestAnimationFrame(stepDice);
      } else {
        if (die1) die1.style.transform = `rotateX(${cssRot1.x}deg) rotateY(${cssRot1.y}deg) rotateZ(0deg)`;
        if (die2) die2.style.transform = `rotateX(${cssRot2.x}deg) rotateY(${cssRot2.y}deg) rotateZ(0deg)`;

        const resultStr = `🎲 ${d1} + ${d2} = ${d1 + d2}${d1 === d2 ? ' (DOUBLES!)' : ''}`;
        if (resultText) resultText.textContent = resultStr;
        if (resultBadge) resultBadge.style.transform = 'scale(1)';
        playSFX('hop');

        if (sumBadge) {
          sumBadge.textContent = resultStr;
          sumBadge.classList.remove('hidden');
        }

        setTimeout(() => {
          if (overlay) {
            overlay.style.opacity = '0';
            if (backdrop) backdrop.style.opacity = '0';
            setTimeout(() => {
              overlay.classList.add('hidden');
              overlay.classList.remove('flex');
              // Settle and reveal resting dice on the background board
              if (diceMeshes[0]) {
                diceMeshes[0].position.set(endPos[0].x, 1.05, endPos[0].z);
                diceMeshes[0].rotation.set(rot1.x, Math.PI / 4, rot1.z);
              }
              if (diceMeshes[1]) {
                diceMeshes[1].position.set(endPos[1].x, 1.05, endPos[1].z);
                diceMeshes[1].rotation.set(rot2.x, -Math.PI / 4, rot2.z);
              }
              diceMeshes.forEach(d => { d.visible = true; d.scale.set(1, 1, 1); });
              resolve();
            }, 280);
          } else {
            diceMeshes.forEach(d => { d.visible = true; });
            resolve();
          }
        }, 650);
      }
    }
    requestAnimationFrame(stepDice);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Player Token Avatars
// ──────────────────────────────────────────────────────────────────────────────
function createDetailed3DAvatarMesh(idx, isPortrait = false) {
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
    pedBase.position.y = 0.07; pedBase.castShadow = true; root.add(pedBase);
    const pedInner = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.39, 0.06, 16), suitMat);
    pedInner.position.y = 0.15; root.add(pedInner);
  }

  const legGroupL = new THREE.Group();
  const legGroupR = new THREE.Group();
  if (!isPortrait) {
    const legGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.34, 10);
    const shoeGeo = new THREE.BoxGeometry(0.16, 0.1, 0.24);
    const legL = new THREE.Mesh(legGeo, darkMat); legL.position.y = -0.15;
    const shoeL = new THREE.Mesh(shoeGeo, darkMat); shoeL.position.set(0, -0.32, 0.04);
    legGroupL.add(legL, shoeL); legGroupL.position.set(-0.14, 0.48, 0);
    const legR = new THREE.Mesh(legGeo, darkMat); legR.position.y = -0.15;
    const shoeR = new THREE.Mesh(shoeGeo, darkMat); shoeR.position.set(0, -0.32, 0.04);
    legGroupR.add(legR, shoeR); legGroupR.position.set(0.14, 0.48, 0);
    root.add(legGroupL, legGroupR);
  }

  const bodyGroup = new THREE.Group(); bodyGroup.position.y = isPortrait ? 0 : 0.44; root.add(bodyGroup);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.56, 12), suitMat);
  torso.position.y = 0.28; torso.castShadow = true; bodyGroup.add(torso);
  const shirtV = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 4), whiteMat);
  shirtV.rotation.x = Math.PI; shirtV.rotation.y = Math.PI / 4; shirtV.position.set(0, 0.44, 0.22); bodyGroup.add(shirtV);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.06), goldMat);
  tie.position.set(0, 0.36, 0.29); tie.rotation.x = -0.08; bodyGroup.add(tie);

  const armGroupL = new THREE.Group(); armGroupL.position.set(-0.34, 0.48, 0);
  const armMeshL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.38, 10), suitMat);
  armMeshL.position.y = -0.16; armMeshL.rotation.z = 0.18;
  const handL = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 1), skinMat); handL.position.set(-0.04, -0.36, 0);
  armGroupL.add(armMeshL, handL); bodyGroup.add(armGroupL);
  const armGroupR = new THREE.Group(); armGroupR.position.set(0.34, 0.48, 0);
  const armMeshR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.38, 10), suitMat);
  armMeshR.position.y = -0.16; armMeshR.rotation.z = -0.18;
  const handR = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 1), skinMat); handR.position.set(0.04, -0.36, 0);
  armGroupR.add(armMeshR, handR); bodyGroup.add(armGroupR);

  const headGroup = new THREE.Group(); headGroup.position.y = 0.88; bodyGroup.add(headGroup);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.16, 10), skinMat); neck.position.y = -0.26; headGroup.add(neck);
  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 2), skinMat); skull.scale.set(1.02, 1.06, 0.98); skull.castShadow = true; headGroup.add(skull);
  const earGeo = new THREE.IcosahedronGeometry(0.09, 1);
  const earL = new THREE.Mesh(earGeo, skinMat); earL.scale.set(0.55, 1.1, 0.8); earL.position.set(-0.36, 0.0, 0);
  const earR = earL.clone(); earR.position.set(0.36, 0.0, 0);
  headGroup.add(earL, earR);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.14, 6), skinMat); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.01, 0.37); headGroup.add(nose);
  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.35 });
  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), cheekMat); cheekL.scale.set(1.2, 0.7, 0.5); cheekL.position.set(-0.21, -0.06, 0.31);
  const cheekR = cheekL.clone(); cheekR.position.set(0.21, -0.06, 0.31); headGroup.add(cheekL, cheekR);

  const eyesGroup = new THREE.Group();
  [-0.13, 0.13].forEach(ex => {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.088, 12, 12), whiteMat); sclera.scale.set(1, 1.12, 0.65); sclera.position.set(ex, 0.06, 0.315);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), darkMat); pupil.scale.set(1, 1.1, 0.6); pupil.position.set(ex, 0.06, 0.358);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(ex + 0.022, 0.085, 0.382);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.032, 0.04), darkMat); brow.position.set(ex, 0.18, 0.335); brow.rotation.z = ex < 0 ? 0.08 : -0.08;
    eyesGroup.add(sclera, pupil, glint, brow);
  });
  headGroup.add(eyesGroup);

  if (idx % 4 === 1) {
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.05), darkMat); s1.position.set(-0.06, -0.1, 0.355); s1.rotation.z = 0.22;
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.05), darkMat); s2.position.set(0.06, -0.1, 0.355); s2.rotation.z = -0.22;
    headGroup.add(s1, s2);
  } else {
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 6, 12, Math.PI), darkMat); smile.rotation.x = Math.PI; smile.position.set(0, -0.1, 0.345); headGroup.add(smile);
  }

  const hatGroup = new THREE.Group(); headGroup.add(hatGroup);
  if (idx % 4 === 0) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.385, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hatMat); dome.position.y = 0.02; hatGroup.add(dome);
    const flapL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.22), hatMat); flapL.position.set(-0.36, -0.02, -0.02); flapL.rotation.z = 0.15;
    const flapR = flapL.clone(); flapR.position.set(0.36, -0.02, -0.02); flapR.rotation.z = -0.15;
    hatGroup.add(flapL, flapR);
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.07, 16), darkMat); strap.position.y = 0.23; hatGroup.add(strap);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.15 });
    [-0.13, 0.13].forEach(gx => {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), goldMat); rim.rotation.x = Math.PI / 2; rim.position.set(gx, 0.25, 0.36);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.09, 12), lensMat); lens.rotation.x = Math.PI / 2; lens.position.set(gx, 0.25, 0.365);
      hatGroup.add(rim, lens);
    });
  } else if (idx % 4 === 1) {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.06, 16), darkMat); brim.position.y = 0.26;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.3, 0.42, 16), darkMat); crown.position.y = 0.48;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.31, 0.08, 16), goldMat); band.position.y = 0.33;
    hatGroup.add(brim, crown, band);
    const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 8, 16), goldMat); monocle.position.set(0.13, 0.06, 0.37); headGroup.add(monocle);
  } else if (idx % 4 === 2) {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, 0.06, 16), hatMat); brim.position.y = 0.22;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hatMat); dome.position.y = 0.22;
    const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), goldMat); crest.position.set(0, 0.34, 0.35);
    hatGroup.add(brim, dome, crest);
  } else {
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.8 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.13, 0.16), visorMat); visor.position.set(0, 0.08, 0.31); headGroup.add(visor);
    const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.045, 8, 18, Math.PI), goldMat); crownBand.position.set(0, 0.05, 0); hatGroup.add(crownBand);
    [-0.39, 0.39].forEach(hx => { const muff = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.09, 12), hatMat); muff.rotation.z = Math.PI / 2; muff.position.set(hx, 0.02, 0); hatGroup.add(muff); });
  }

  let avatarLight = null;
  let groundAura = null;
  if (!isPortrait) {
    // Dynamic PointLight casting local light in avatar's personal theme color
    const initIntensity = (currentBulbMode === 'night' ? 1.4 : currentBulbMode === 'sunset' ? 0.65 : 0);
    avatarLight = new THREE.PointLight(theme.charColor, initIntensity, 5.5, 1.8);
    avatarLight.position.set(0, 0.95, 0);
    root.add(avatarLight);

    // Glowing ground aura light pool beneath avatar's pedestal
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
    headGroup, eyesGroup, armGroupL, armGroupR, legGroupL, legGroupR, bodyGroup,
    phaseOffset: idx * 1.7, avatarLight, groundAura, suitMat, themeColor: theme.charColor, playerIdx: idx
  };
  return root;
}

export function updateAvatarLightingForCurrentMode() {
  const isNight = (currentBulbMode === 'night');
  const isSunset = (currentBulbMode === 'sunset');
  playerMeshes.forEach(mesh => {
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

export function spawnAllPlayerTokens3D() {
  playerMeshes.forEach(m => boardGroup.remove(m));
  playerMeshes = [];
  gameState.players.forEach((_, idx) => {
    const mesh = createDetailed3DAvatarMesh(idx, false);
    mesh.scale.setScalar(0.88); boardGroup.add(mesh); playerMeshes.push(mesh);
  });
  updatePlayerTokenPositions3D();
  updateAvatarLightingForCurrentMode();
}

export function updatePlayerTokenPositions3D() {
  const offsets = [{ x: -0.45, z: 0.45 }, { x: 0.45, z: 0.45 }, { x: -0.45, z: -0.45 }, { x: 0.45, z: -0.45 }];
  gameState.players.forEach((p, idx) => {
    const mesh = playerMeshes[idx];
    if (!mesh) return;
    if (p.bankrupt) { mesh.visible = false; return; }
    mesh.visible = true;
    const pos = getTileWorldPosition(p.position);
    const tilePress = activeTileDepressions[p.position]?.currentOffset ?? 0;
    mesh.position.set(pos.x + offsets[idx].x, BASE_BUILDING_Y + tilePress, pos.z + offsets[idx].z);
    mesh.rotation.y = getTileFacingAngle(p.position);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Tile Highlight Ring
// ──────────────────────────────────────────────────────────────────────────────
function buildTileHighlightRing3D() {
  const ringGeo = new THREE.RingGeometry(1.15, 1.48, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x6c5ce7, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  tileHighlightRing = new THREE.Mesh(ringGeo, ringMat);
  tileHighlightRing.rotation.x = -Math.PI / 2;
  tileHighlightRing.position.y = 0.48;
  tileHighlightRing.visible = false;
  boardGroup.add(tileHighlightRing);
}

export function setTileHighlightRing(tileId, visible, colorHex = null) {
  if (!tileHighlightRing) return;
  if (visible) {
    const pos = getTileWorldPosition(tileId);
    tileHighlightRing.position.set(pos.x, 0.48, pos.z);
    const pIdx = gameState.currentPlayerIdx;
    const theme = PLAYER_THEMES[pIdx];
    const targetColor = colorHex || theme?.colorHex || '#6c5ce7';
    tileHighlightRing.material.color.set(targetColor);
  }
  tileHighlightRing.visible = visible;
}

// ──────────────────────────────────────────────────────────────────────────────
// Active Player Turn Highlight Beacon
// ──────────────────────────────────────────────────────────────────────────────
let activePlayerBeaconGroup = null;
let activeTileBeaconBox = null;
const activeTurnSpriteMap = {};

function createTurnBillboardTexture(name, colorHex) {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 96;
  const ctx = c.getContext('2d');

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(10, 10, 364, 76, 38);
  } else {
    ctx.rect(10, 10, 364, 76);
  }
  ctx.fill();

  ctx.strokeStyle = colorHex || '#6c5ce7';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.font = '900 30px Inter, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cleanName = (name || 'PLAYER').toUpperCase();
  ctx.fillText(`★ ${cleanName}'S TURN ★`, 192, 48);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

export function buildActivePlayerHighlightSystem() {
  if (activePlayerBeaconGroup) return;

  activePlayerBeaconGroup = new THREE.Group();
  boardGroup.add(activePlayerBeaconGroup);

  // 1. Concentric pulsing ground rings under active player (themed to player, zero yellow)
  const innerRingGeo = new THREE.RingGeometry(0.68, 0.98, 32);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0x6c5ce7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92
  });
  const groundRingInner = new THREE.Mesh(innerRingGeo, innerRingMat);
  groundRingInner.rotation.x = -Math.PI / 2;
  groundRingInner.position.y = 0.06;
  activePlayerBeaconGroup.add(groundRingInner);

  const outerRingGeo = new THREE.RingGeometry(1.02, 1.28, 32);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: 0xa89cf5,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.50
  });
  const groundRingOuter = new THREE.Mesh(outerRingGeo, outerRingMat);
  groundRingOuter.rotation.x = -Math.PI / 2;
  groundRingOuter.position.y = 0.05;
  activePlayerBeaconGroup.add(groundRingOuter);

  // 2. Floating 3D pointer group above avatar head (themed to player, zero yellow)
  const pointerGroup = new THREE.Group();
  pointerGroup.position.y = 2.4;

  const diamondGeo = new THREE.OctahedronGeometry(0.30, 0);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0x6c5ce7,
    emissive: 0x6c5ce7,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.4
  });
  const floatingDiamond = new THREE.Mesh(diamondGeo, diamondMat);
  pointerGroup.add(floatingDiamond);

  const coneGeo = new THREE.ConeGeometry(0.12, 0.28, 6);
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0x6c5ce7,
    emissive: 0x6c5ce7,
    emissiveIntensity: 0.45
  });
  const pointerCone = new THREE.Mesh(coneGeo, coneMat);
  pointerCone.rotation.x = Math.PI;
  pointerCone.position.y = -0.30;
  pointerGroup.add(pointerCone);

  const spriteMat = new THREE.SpriteMaterial({ transparent: true });
  const turnSprite = new THREE.Sprite(spriteMat);
  turnSprite.scale.set(2.4, 0.62, 1);
  turnSprite.position.y = 0.65;
  pointerGroup.add(turnSprite);

  activePlayerBeaconGroup.add(pointerGroup);

  activePlayerBeaconGroup.userData = {
    groundRingInner,
    groundRingOuter,
    pointerGroup,
    floatingDiamond,
    pointerCone,
    turnSprite,
    spriteMat,
    lastPlayerIdx: -1
  };

  activePlayerBeaconGroup.visible = false;
}

// ──────────────────────────────────────────────────────────────────────────────
// World Tour Flight Highlights
// ──────────────────────────────────────────────────────────────────────────────
let flightHighlightsGroup = null;
let flightModeActive = false;

function buildFlightHighlightsGroup() {
  if (flightHighlightsGroup) return;
  flightHighlightsGroup = new THREE.Group();
  boardGroup.add(flightHighlightsGroup);

  const ringGeo = new THREE.RingGeometry(1.08, 1.44, 28);
  BOARD_TILES.forEach(t => {
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    const pos = getTileWorldPosition(t.id);
    ring.position.set(pos.x, 0.45, pos.z);
    ring.userData = { tileId: t.id };
    flightHighlightsGroup.add(ring);
  });
  flightHighlightsGroup.visible = false;
}

export function setFlightModeHighlights(active) {
  flightModeActive = active;
  if (!flightHighlightsGroup) {
    buildFlightHighlightsGroup();
  }
  flightHighlightsGroup.visible = active;
  if (!active) {
    BOARD_TILES.forEach(t => {
      if (activeTileDepressions[t.id]) activeTileDepressions[t.id].targetOffset = 0;
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Monopoly Set Highlight Rings
// ──────────────────────────────────────────────────────────────────────────────
let monopolyRingsGroup = null;

export function setMonopolyTileHighlights(tileIds, colorHex = '#facc15') {
  if (!monopolyRingsGroup) {
    monopolyRingsGroup = new THREE.Group();
    boardGroup.add(monopolyRingsGroup);
  }
  while (monopolyRingsGroup.children.length > 0) {
    monopolyRingsGroup.remove(monopolyRingsGroup.children[0]);
  }
  if (!tileIds || tileIds.length === 0) return;

  const ringGeo = new THREE.RingGeometry(1.15, 1.48, 32);
  const color = new THREE.Color(colorHex);
  tileIds.forEach(id => {
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(ringGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    const pos = getTileWorldPosition(id);
    mesh.position.set(pos.x, 0.46, pos.z);
    monopolyRingsGroup.add(mesh);
  });

  setTimeout(() => {
    if (monopolyRingsGroup) {
      while (monopolyRingsGroup.children.length > 0) {
        monopolyRingsGroup.remove(monopolyRingsGroup.children[0]);
      }
    }
  }, 9000);
}

// ──────────────────────────────────────────────────────────────────────────────
// City Preview (buy / inspector modals)
// ──────────────────────────────────────────────────────────────────────────────
function ensureCityPreviewInitialized() {
  if (cityPreviewRenderer) return;
  cityPreviewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  cityPreviewRenderer.setSize(220, 110);
  cityPreviewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  cityPreviewScene = new THREE.Scene();
  cityPreviewCamera = new THREE.PerspectiveCamera(34, 220 / 110, 0.1, 30);
  cityPreviewCamera.position.set(2.9, 2.2, 2.9);
  cityPreviewCamera.lookAt(0, 0.35, 0);
  cityPreviewScene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dir = new THREE.DirectionalLight(0xfffbeb, 0.95); dir.position.set(4, 7, 5);
  cityPreviewScene.add(dir);
  cityPreviewGroup = new THREE.Group(); cityPreviewScene.add(cityPreviewGroup);
}

export function populateCityPreview3DScene(tile, targetCanvasId) {
  ensureCityPreviewInitialized();
  activeCityPreviewCanvasId = targetCanvasId;
  while (cityPreviewGroup.children.length > 0) cityPreviewGroup.remove(cityPreviewGroup.children[0]);
  const groupColorHex = tile.group ? GROUP_META[tile.group].hex : '#38bdf8';
  const accentColor = new THREE.Color(groupColorHex);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.02, 0.24, 8), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, flatShading: true }));
  plinth.position.y = -0.12; cityPreviewGroup.add(plinth);
  const colorRim = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.18, 0.08, 8), new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.35, flatShading: true }));
  colorRim.position.y = -0.02; cityPreviewGroup.add(colorRim);
  if (tile.type === 'city' || tile.type === 'resort') {
    const propState = gameState.properties[tile.id] || null;
    const lvl = propState?.level || 0;
    const ownerColorNum = (propState?.owner !== null && propState?.owner !== undefined && PLAYER_THEMES[propState.owner])
      ? PLAYER_THEMES[propState.owner].charColor
      : parseInt(groupColorHex.replace('#', '0x'), 16);

    if (lvl >= 4) {
      const tower = createDetailedSkyscraperMesh(ownerColorNum);
      tower.scale.set(0.68, 0.68, 0.68);
      tower.position.set(0, 0, 0);
      cityPreviewGroup.add(tower);
    } else if (lvl > 0 && lvl <= 3) {
      const house = createDetailedHouseMesh(ownerColorNum, lvl);
      const previewScale = lvl === 1 ? 1.05 : lvl === 2 ? 0.90 : 0.78;
      house.scale.set(previewScale, previewScale, previewScale);
      house.position.set(0, 0, 0);
      cityPreviewGroup.add(house);
    } else if (propState?.owner !== null && propState?.owner !== undefined) {
      const flag = createDetailedFlagMesh(ownerColorNum);
      flag.scale.set(1.15, 1.15, 1.15);
      flag.position.set(-0.15, 0, 0);
      cityPreviewGroup.add(flag);
    } else {
      const showcaseHouse = createDetailedHouseMesh(ownerColorNum, 1);
      showcaseHouse.scale.set(0.85, 0.85, 0.85);
      showcaseHouse.position.set(-0.35, 0, 0.15);
      const flag = createDetailedFlagMesh(ownerColorNum);
      flag.scale.set(0.85, 0.85, 0.85);
      flag.position.set(-0.70, 0, -0.35);
      const miniSkyscraper = createDetailedSkyscraperMesh(ownerColorNum);
      miniSkyscraper.scale.set(0.50, 0.50, 0.50);
      miniSkyscraper.position.set(0.40, 0, -0.15);
      cityPreviewGroup.add(showcaseHouse, flag, miniSkyscraper);
    }
  } else {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.7, flatShading: true }));
    gem.position.y = 0.68; cityPreviewGroup.add(gem);
  }
  cityPreviewGroup.scale.set(0.01, 0.01, 0.01);
  cityPreviewGroup.userData.openStartTime = performance.now();
}

export function clearCityPreview() {
  activeCityPreviewCanvasId = null;
}

// ──────────────────────────────────────────────────────────────────────────────
// HUD Portrait Renderer
// ──────────────────────────────────────────────────────────────────────────────
function ensure3DPortraitSystemInitialized() {
  if (portraitRenderer) return;
  portraitRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  portraitRenderer.setSize(136, 136); portraitRenderer.setPixelRatio(1);
  portraitCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
  portraitCamera.position.set(0, 0.88, 2.55); portraitCamera.lookAt(0, 0.82, 0);
  portraitScenes = [];
  for (let i = 0; i < 4; i++) {
    const pScene = new THREE.Scene();
    pScene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const kl = new THREE.DirectionalLight(0xfffbeb, 0.9); kl.position.set(2.5, 4, 3.5); pScene.add(kl);
    const rl = new THREE.DirectionalLight(0x93c5fd, 0.55); rl.position.set(-3, 2, -2); pScene.add(rl);
    const avatar3D = createDetailed3DAvatarMesh(i, true);
    avatar3D.position.set(0, -0.05, 0); avatar3D.rotation.y = (i % 2 === 0) ? 0.24 : -0.24;
    pScene.add(avatar3D);
    portraitScenes.push({ scene: pScene, avatar: avatar3D });
  }
}

let lastPortraitRenderTime = 0;

function renderLive3DHUDPortraits(t) {
  if (!portraitRenderer || portraitScenes.length === 0) return;
  const now = performance.now();
  if (now - lastPortraitRenderTime < 95) return; // Cap portrait rendering at ~10 fps to prevent GPU/CPU readback stalls
  lastPortraitRenderTime = now;

  gameState.players.forEach((_, idx) => {
    const targetCanvas = document.getElementById(`hud-avatar-canvas-${idx}`);
    const entry = portraitScenes[idx];
    if (!targetCanvas || !entry) return;
    const isTurn = (idx === gameState.currentPlayerIdx);
    const avatar = entry.avatar; const ud = avatar.userData;
    const baseYaw = (idx % 2 === 0) ? 0.24 : -0.24;
    avatar.rotation.y = baseYaw + Math.sin(t * 1.6 + idx) * (isTurn ? 0.22 : 0.09);
    avatar.position.y = -0.05 + Math.sin(t * (isTurn ? 3.6 : 1.8) + idx) * (isTurn ? 0.035 : 0.015);
    if (ud?.headGroup) { ud.headGroup.rotation.z = Math.sin(t * 2.1 + idx) * (isTurn ? 0.08 : 0.03); ud.headGroup.rotation.x = Math.cos(t * 1.9 + idx) * 0.05; }
    if (ud?.eyesGroup) { const b = (t + idx * 1.3) % 3.8; ud.eyesGroup.scale.y = (b > 3.64 && b < 3.76) ? 0.1 : 1.0; }
    portraitRenderer.render(entry.scene, portraitCamera);
    const ctx2d = targetCanvas.getContext('2d');
    if (ctx2d) { ctx2d.clearRect(0, 0, targetCanvas.width, targetCanvas.height); ctx2d.drawImage(portraitRenderer.domElement, 0, 0, targetCanvas.width, targetCanvas.height); }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Speech Bubble
// ──────────────────────────────────────────────────────────────────────────────
export function showSpeechBubble(text, duration = 2600) {
  const bubble = document.getElementById('token-speech-bubble');
  bubble.textContent = text;
  bubble.classList.remove('hidden');
  updateSpeechBubbleScreenPosition();
  if (bubble._hideTimer) clearTimeout(bubble._hideTimer);
  bubble._hideTimer = setTimeout(() => bubble.classList.add('hidden'), duration);
}

function updateSpeechBubbleScreenPosition() {
  const bubble = document.getElementById('token-speech-bubble');
  if (bubble.classList.contains('hidden')) return;
  const activeMesh = playerMeshes[gameState.currentPlayerIdx];
  if (!activeMesh) return;
  const worldPos = new THREE.Vector3();
  activeMesh.getWorldPosition(worldPos);
  worldPos.y += 1.85;
  worldPos.project(camera);
  bubble.style.left = `${(worldPos.x * 0.5 + 0.5) * window.innerWidth}px`;
  bubble.style.top = `${(-worldPos.y * 0.5 + 0.5) * window.innerHeight}px`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Hop Token Animation (per step)
// ──────────────────────────────────────────────────────────────────────────────
export function hopPlayerStepAnimation(playerIdx, startPos, endPos, step, totalSteps, destTileId) {
  return new Promise(resolveHop => {
    const mesh = playerMeshes[playerIdx];
    const offsets = [{ x: -0.42, z: 0.42 }, { x: 0.42, z: 0.42 }, { x: -0.42, z: -0.42 }, { x: 0.42, z: -0.42 }];
    const off = offsets[playerIdx];
    const hopDuration = 340;
    const hopStart = performance.now();
    let pressedTriggered = false;
    function stepHop(now) {
      const rawT = Math.min(1, (now - hopStart) / hopDuration);
      const easeT = -(Math.cos(Math.PI * rawT) - 1) / 2;
      const curX = startPos.x + (endPos.x - startPos.x) * easeT + off.x;
      const curZ = startPos.z + (endPos.z - startPos.z) * easeT + off.z;
      const isFinalTouchdown = (step === totalSteps - 1);
      if (isFinalTouchdown && rawT >= 0.70) { movingHopDestTileId = destTileId; }
      if (isFinalTouchdown && rawT >= 0.82 && !pressedTriggered) {
        pressedTriggered = true;
        triggerTileButtonPress(destTileId, -0.20, 240);
      } else if (!isFinalTouchdown && rawT >= 0.88 && !pressedTriggered) {
        pressedTriggered = true;
        triggerTileButtonPress(destTileId, -0.05, 120);
      }
      const tilePressOffset = activeTileDepressions[destTileId]?.currentOffset ?? 0;
      if (mesh) {
        mesh.position.set(curX, BASE_BUILDING_Y + arcHeight + (rawT > 0.8 ? tilePressOffset : 0), curZ);
        mesh.rotation.y = getTileFacingAngle(destTileId);
        const ud = mesh.userData;
        if (ud?.armGroupL && ud?.armGroupR) {
          const swing = Math.sin(rawT * Math.PI) * 0.55;
          ud.armGroupL.rotation.x = swing * (step % 2 === 0 ? 1 : -1);
          ud.armGroupR.rotation.x = -swing * (step % 2 === 0 ? 1 : -1);
          if (ud.legGroupL && ud.legGroupR) { ud.legGroupL.rotation.x = -swing * 0.6 * (step % 2 === 0 ? 1 : -1); ud.legGroupR.rotation.x = swing * 0.6 * (step % 2 === 0 ? 1 : -1); }
        }
        const baseScale = 0.88;
        const stretch = rawT < 0.85 ? 1 + Math.sin(rawT * Math.PI) * 0.09 : 0.93 + (1 - rawT) * 0.35;
        mesh.scale.set(baseScale / Math.sqrt(stretch), baseScale * stretch, baseScale / Math.sqrt(stretch));
      }
      updateSpeechBubbleScreenPosition();
      if (rawT < 1) { requestAnimationFrame(stepHop); }
      else {
        setTimeout(() => { if (movingHopDestTileId === destTileId) movingHopDestTileId = null; }, 150);
        resolveHop();
      }
    }
    requestAnimationFrame(stepHop);
  });
}

export function resetTokenAfterHop(playerIdx) {
  const mesh = playerMeshes[playerIdx];
  if (!mesh) return;
  mesh.scale.setScalar(0.88);
  mesh.rotation.x = 0;
  mesh.rotation.z = 0;
  const ud = mesh.userData;
  if (ud?.armGroupL && ud?.armGroupR) {
    ud.armGroupL.rotation.x = 0; ud.armGroupL.rotation.y = 0; ud.armGroupL.rotation.z = 0;
    ud.armGroupR.rotation.x = 0; ud.armGroupR.rotation.y = 0; ud.armGroupR.rotation.z = 0;
    if (ud.legGroupL && ud.legGroupR) {
      ud.legGroupL.rotation.x = 0; ud.legGroupL.rotation.y = 0; ud.legGroupL.rotation.z = 0;
      ud.legGroupR.rotation.x = 0; ud.legGroupR.rotation.y = 0; ud.legGroupR.rotation.z = 0;
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Flight Mode Tile-by-Tile Travel Animation
// ──────────────────────────────────────────────────────────────────────────────
export function flyPlayerStepAnimation(playerIdx, startPos, endPos, step, totalSteps, destTileId) {
  return new Promise(resolveFly => {
    const mesh = playerMeshes[playerIdx];
    const offsets = [{ x: -0.42, z: 0.42 }, { x: 0.42, z: 0.42 }, { x: -0.42, z: -0.42 }, { x: 0.42, z: -0.42 }];
    const off = offsets[playerIdx];
    const flyDuration = totalSteps > 14 ? 145 : (totalSteps > 7 ? 175 : 215);
    const flyStart = performance.now();
    let pressedTriggered = false;

    function stepFly(now) {
      const rawT = Math.min(1, (now - flyStart) / flyDuration);
      const easeT = -(Math.cos(Math.PI * rawT) - 1) / 2;
      const curX = startPos.x + (endPos.x - startPos.x) * easeT + off.x;
      const curZ = startPos.z + (endPos.z - startPos.z) * easeT + off.z;

      const isFinalTouchdown = (step === totalSteps - 1);

      let flightAltitude;
      if (isFinalTouchdown) {
        // Landing descent onto destination tile
        flightAltitude = Math.sin((1 - rawT) * (Math.PI / 2)) * 1.35;
      } else if (step === 0) {
        // Takeoff climb
        flightAltitude = Math.sin(rawT * (Math.PI / 2)) * 1.35;
      } else {
        // Cruising altitude with wave
        flightAltitude = 1.3 + Math.sin(rawT * Math.PI) * 0.28;
      }

      if (isFinalTouchdown && rawT >= 0.70) { movingHopDestTileId = destTileId; }
      if (isFinalTouchdown && rawT >= 0.82 && !pressedTriggered) {
        pressedTriggered = true;
        triggerTileButtonPress(destTileId, -0.22, 240);
      }

      const tilePressOffset = activeTileDepressions[destTileId]?.currentOffset ?? 0;

      if (mesh) {
        mesh.position.set(curX, BASE_BUILDING_Y + flightAltitude + (isFinalTouchdown && rawT > 0.8 ? tilePressOffset : 0), curZ);
        mesh.rotation.y = getTileFacingAngle(destTileId);

        // Airplane flight pose: arms outstretched like wings
        const ud = mesh.userData;
        if (ud?.armGroupL && ud?.armGroupR) {
          if (isFinalTouchdown && rawT > 0.65) {
            // Fold wings down on landing
            const landFactor = Math.max(0, (1 - rawT) / 0.35);
            ud.armGroupL.rotation.z = Math.PI * 0.42 * landFactor;
            ud.armGroupR.rotation.z = -Math.PI * 0.42 * landFactor;
            mesh.rotation.x = 0.16 * landFactor;
            mesh.rotation.z = 0;
            if (ud.legGroupL && ud.legGroupR) {
              ud.legGroupL.rotation.x = -0.32 * landFactor;
              ud.legGroupR.rotation.x = -0.32 * landFactor;
            }
          } else {
            ud.armGroupL.rotation.z = Math.PI * 0.42;
            ud.armGroupR.rotation.z = -Math.PI * 0.42;
            ud.armGroupL.rotation.x = 0;
            ud.armGroupR.rotation.x = 0;
            mesh.rotation.x = 0.16; // Pitch forward
            mesh.rotation.z = Math.sin(rawT * Math.PI * 2) * 0.08; // Gentle roll
            if (ud.legGroupL && ud.legGroupR) {
              ud.legGroupL.rotation.x = -0.32;
              ud.legGroupR.rotation.x = -0.32;
            }
          }
        }

        const baseScale = 0.88;
        mesh.scale.set(baseScale, baseScale, baseScale);
      }

      updateSpeechBubbleScreenPosition();

      if (rawT < 1) {
        requestAnimationFrame(stepFly);
      } else {
        setTimeout(() => { if (movingHopDestTileId === destTileId) movingHopDestTileId = null; }, 150);
        resolveFly();
      }
    }
    requestAnimationFrame(stepFly);
  });
}

function getIntersectedTileId(intersects) {
  for (let i = 0; i < intersects.length; i++) {
    let obj = intersects[i].object;
    while (obj && obj !== boardGroup && obj !== scene) {
      if (obj.userData?.tileId !== undefined) {
        return obj.userData.tileId;
      }
      if (obj.userData?.playerIdx !== undefined) {
        const p = gameState.players[obj.userData.playerIdx];
        if (p) return p.position;
      }
      obj = obj.parent;
    }
  }
  return undefined;
}

// ──────────────────────────────────────────────────────────────────────────────
// Hover Tooltip
// ──────────────────────────────────────────────────────────────────────────────
function handleCanvasHover(event) {
  const tooltip = document.getElementById('tile-hover-tooltip');
  if (!raycaster || !camera) return;
  mouseVec.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouseVec.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouseVec, camera);
  const hoverTargets = [
    ...Object.values(tilesMeshMap),
    ...Object.values(cornerLandmarkGroups),
    ...playerMeshes
  ];
  const intersects = raycaster.intersectObjects(hoverTargets, true);
  if (intersects.length > 0) {
    const tileId = getIntersectedTileId(intersects);
    if (tileId !== undefined) {
      const tile = BOARD_TILES[tileId];
      if (tile) {
        if (gameState.phase === 'WORLD_TOUR') {
          BOARD_TILES.forEach(t => {
            if (activeTileDepressions[t.id]) {
              activeTileDepressions[t.id].targetOffset = (t.id === tileId) ? 0.22 : 0;
            }
          });
          tooltip.innerHTML = `
            <div class="flex items-center gap-2 border-b border-indigo-400 pb-1">
              <span class="text-sm">✈️</span>
              <span class="font-extrabold text-xs tracking-wide text-white">WORLD TOUR DESTINATION</span>
            </div>
            <div class="text-xs font-bold text-amber-300 mt-1">${tile.name}</div>
            <div class="text-[10px] text-slate-300">Click to fly here immediately!</div>
          `;
          tooltip.style.left = `${event.clientX}px`;
          tooltip.style.top = `${event.clientY}px`;
          tooltip.classList.remove('hidden');
          renderer.domElement.style.cursor = 'pointer';
          return;
        }

        const st = gameState.properties[tileId];
        const groupColor = tile.group ? GROUP_META[tile.group].hex : '#38bdf8';
        const ownerText = (st?.owner !== null && st?.owner !== undefined) ? `<span style="color:${PLAYER_THEMES[st.owner].colorHex}">${gameState.players[st.owner]?.name}</span>` : 'Unowned';
        let detailsHtml = '';
        if (tile.type === 'city' || tile.type === 'resort') {
          const curRent = (st?.owner !== null && st?.owner !== undefined && !st.mortgaged) ? fmtMoney(calculateTileRent(tileId)) : fmtMoney(tile.rent[0]);
          detailsHtml = `<div class="flex justify-between gap-4 text-[11px] text-slate-300 mt-1"><span>Price: <strong class="text-white">${fmtMoney(tile.price)}</strong></span><span>Rent: <strong class="text-emerald-400">${curRent}</strong></span></div><div class="text-[11px] text-slate-300 mt-0.5">Owner: <strong class="text-white">${ownerText}</strong></div>`;
        } else {
          detailsHtml = `<div class="text-[11px] text-slate-300 mt-1">${tile.subtitle || 'Special Board Tile'}</div>`;
        }
        tooltip.innerHTML = `<div class="flex items-center gap-2 border-b border-slate-700 pb-1"><span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${groupColor}"></span><span class="font-extrabold text-xs tracking-wide text-white">${tile.name}</span></div>${detailsHtml}`;
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY}px`;
        tooltip.classList.remove('hidden');
        renderer.domElement.style.cursor = 'pointer';
        return;
      }
    }
  }
  if (gameState.phase === 'WORLD_TOUR') {
    BOARD_TILES.forEach(t => {
      if (activeTileDepressions[t.id]) activeTileDepressions[t.id].targetOffset = 0;
    });
  }
  tooltip.classList.add('hidden');
  renderer.domElement.style.cursor = 'default';
}

function handleCanvasClick(event) {
  mouseVec.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouseVec.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouseVec, camera);
  const clickTargets = [
    ...Object.values(tilesMeshMap),
    ...Object.values(cornerLandmarkGroups),
    ...playerMeshes
  ];
  const intersects = raycaster.intersectObjects(clickTargets, true);
  if (intersects.length > 0) {
    const clickedTileId = getIntersectedTileId(intersects);
    if (clickedTileId !== undefined) {
      triggerTileButtonPress(clickedTileId, -0.18, 180);
      onTileClick(clickedTileId);
      return;
    }
  }
  // Clicked anywhere on the 3D scene that is not a board tile
  if (window.closeInspectorModal) {
    window.closeInspectorModal();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Animation Loop
// ──────────────────────────────────────────────────────────────────────────────
function animateThreeLoop() {
  requestAnimationFrame(animateThreeLoop);
  const now = performance.now();
  const t = now * 0.001;

  // Camera damping
  let camChanged = false;
  if (Math.abs(targetCameraAzimuth - cameraAzimuth) > 0.0005) { cameraAzimuth += (targetCameraAzimuth - cameraAzimuth) * 0.08; camChanged = true; }
  if (Math.abs(targetCameraZoom - cameraZoom) > 0.0005) { cameraZoom += (targetCameraZoom - cameraZoom) * 0.12; camChanged = true; }
  if (cameraTarget.distanceTo(targetCameraTarget) > 0.001) { cameraTarget.lerp(targetCameraTarget, 0.12); camChanged = true; }
  if (camChanged) updateIsometricCamera();

  updateRoadCarsAnimation();

  lowPolyClouds.forEach(c => {
    c.mesh.position.x = c.baseX + Math.sin(t * c.speed + c.phase) * 1.8;
    c.mesh.position.y = c.baseY + Math.cos(t * 0.6 + c.phase) * 0.25;
  });

  festivalBalloons.forEach(b => { b.mesh.position.y = b.baseH + Math.sin(t * 1.6 + b.phase) * 0.16; });

  // Player avatar animations
  playerMeshes.forEach((mesh, idx) => {
    if (!mesh || !mesh.visible) return;
    const ud = mesh.userData; if (!ud?.headGroup) return;
    const isTurn = (idx === gameState.currentPlayerIdx);
    const ph = ud.phaseOffset || 0;
    ud.headGroup.rotation.y = Math.sin(t * 1.5 + ph) * (isTurn ? 0.25 : 0.12);
    ud.headGroup.rotation.x = Math.cos(t * 2.1 + ph) * 0.06;
    if (ud.eyesGroup) { const blinkCycle = (t + ph) % 4.2; ud.eyesGroup.scale.y = (blinkCycle > 4.02 && blinkCycle < 4.16) ? 0.1 : 1.0; }
    if (gameState.phase === 'ROLL' || gameState.phase === 'END') {
      const baseScale = 0.88;
      const breath = isTurn ? (1 + Math.sin(t * 3.4) * 0.045) : (1 + Math.sin(t * 2.0 + ph) * 0.018);
      mesh.scale.set(baseScale / Math.sqrt(breath), baseScale * breath, baseScale / Math.sqrt(breath));
    }
  });

  renderLive3DHUDPortraits(t);

  // City preview rotation
  if (activeCityPreviewCanvasId && cityPreviewRenderer && cityPreviewGroup) {
    const targetCanvas = document.getElementById(activeCityPreviewCanvasId);
    if (targetCanvas) {
      const elapsed = now - (cityPreviewGroup.userData.openStartTime || 0);
      const p2 = Math.min(1, elapsed / 460);
      const elasticScale = p2 === 1 ? 1 : 1 - Math.pow(2, -10 * p2) * Math.cos((p2 * 10 - 0.75) * ((2 * Math.PI) / 3));
      cityPreviewGroup.scale.setScalar(Math.max(0.01, elasticScale));
      cityPreviewGroup.rotation.y = now * 0.0012;
      cityPreviewGroup.position.y = Math.sin(now * 0.003) * 0.05;
      cityPreviewRenderer.render(cityPreviewScene, cityPreviewCamera);
      const ctx = targetCanvas.getContext('2d');
      if (ctx) { ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height); ctx.drawImage(cityPreviewRenderer.domElement, 0, 0, targetCanvas.width, targetCanvas.height); }
    }
  }

  // Tile depression spring
  BOARD_TILES.forEach(tile => {
    const state2 = activeTileDepressions[tile.id];
    const mesh = tilesMeshMap[tile.id];
    const bGroup = tileBuildingGroups[tile.id];
    const landmark = cornerLandmarkGroups[tile.id];
    if (!state2 || !mesh) return;
    if (Math.abs(state2.targetOffset - state2.currentOffset) > 0.001) {
      state2.currentOffset += (state2.targetOffset - state2.currentOffset) * 0.24;
      mesh.position.y = BASE_TILE_Y + state2.currentOffset;
      if (bGroup) bGroup.position.y = BASE_BUILDING_Y + state2.currentOffset;
      if (landmark) landmark.position.y = BASE_BUILDING_Y + state2.currentOffset;
      if (gameState.phase !== 'MOVING') updatePlayerTokenPositions3D();
    } else if (state2.currentOffset !== state2.targetOffset) {
      state2.currentOffset = state2.targetOffset;
      mesh.position.y = BASE_TILE_Y + state2.currentOffset;
      if (bGroup) bGroup.position.y = BASE_BUILDING_Y + state2.currentOffset;
      if (landmark) landmark.position.y = BASE_BUILDING_Y + state2.currentOffset;
    }
  });

  // ── Block Illumination in Night Mode (Pressed & Player Presence) ──
  const isNightBulb = (currentBulbMode === 'night');
  const isSunsetBulb = (currentBulbMode === 'sunset');
  const nightFactor = isNightBulb ? 1.0 : (isSunsetBulb ? 0.35 : 0.0);

  let maxIllumTileId = null;
  let maxIllumVal = 0;

  BOARD_TILES.forEach(tile => {
    const state2 = activeTileDepressions[tile.id];
    const mesh = tilesMeshMap[tile.id];
    const pool = tileGroundLightPools[tile.id];
    let illumData = activeTileIlluminations[tile.id];
    if (!illumData) {
      illumData = activeTileIlluminations[tile.id] = { currentIllum: 0 };
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

    const frame = tileBorderFrames[tile.id];
    const topMat = mesh.userData?.topMat || (Array.isArray(mesh.material) ? mesh.material[2] : null);
    const sideMat = mesh.userData?.sideMat || (Array.isArray(mesh.material) ? mesh.material[0] : null);

    // CRITICAL: Ensure card top face is never washed out to full white! Keep top face emissive 0
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

    // 2. Soft Ground Halo Light Pool (around perimeter on street/grass, subtle and never blowing out the tile)
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

  // 3. Dynamic Soft PointLight only on final resting touchdown or click (gentle, never washing out to white)
  if (tilePressPointLight) {
    if (maxIllumVal > 0.25 && maxIllumTileId !== null && gameState.phase !== 'MOVING' && nightFactor > 0.01) {
      const pos = getTileWorldPosition(maxIllumTileId);
      const pressOffset = activeTileDepressions[maxIllumTileId]?.currentOffset ?? 0;
      tilePressPointLight.position.set(pos.x, BASE_TILE_Y + 1.2 + pressOffset, pos.z);
      const propState = gameState.properties[maxIllumTileId] || null;
      const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
      const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
      const lightCol = ownerTheme ? getLightPlayerAccent(ownerTheme.colorHex, 0.40) : null;
      if (lightCol) {
        tilePressPointLight.color.setStyle(lightCol);
      } else {
        tilePressPointLight.color.setHex(0xffeedd);
      }
      tilePressPointLight.intensity = Math.min(0.40, maxIllumVal * 0.40);
      tilePressPointLight.visible = true;
    } else {
      tilePressPointLight.intensity = 0;
      tilePressPointLight.visible = false;
    }
  }

  // Highlight ring pulse
  if (tileHighlightRing?.visible) { const s = 1 + Math.sin(t * 4.5) * 0.06; tileHighlightRing.scale.set(s, s, 1); }

  // World Tour flight rings pulse
  if (flightModeActive && flightHighlightsGroup?.visible) {
    const pulseScale = 1 + Math.sin(t * 5.0) * 0.07;
    const pulseOpacity = 0.55 + Math.sin(t * 4.0) * 0.35;
    flightHighlightsGroup.children.forEach(ring => {
      ring.scale.set(pulseScale, pulseScale, 1);
      ring.material.opacity = pulseOpacity;
    });
  }

  // Monopoly set highlight rings pulse
  if (monopolyRingsGroup && monopolyRingsGroup.children.length > 0) {
    const s = 1 + Math.sin(t * 6.0) * 0.12;
    monopolyRingsGroup.children.forEach(ring => ring.scale.set(s, s, 1));
  }

  // Street lamp authentic organic glow & filament breathing across all modes
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

  // Avatar night light emission & organic breathing
  playerMeshes.forEach((mesh, idx) => {
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

  // Active player turn beacon & glowing tile frame
  if (activePlayerBeaconGroup && gameState.gameStarted) {
    const curP = gameState.players[gameState.currentPlayerIdx];
    const curMesh = playerMeshes[gameState.currentPlayerIdx];

    if (curP && !curP.bankrupt && curMesh && curMesh.visible) {
      activePlayerBeaconGroup.visible = true;

      const ud = activePlayerBeaconGroup.userData;
      activePlayerBeaconGroup.position.set(curMesh.position.x, curMesh.position.y, curMesh.position.z);

      ud.groundRingInner.rotation.z = t * 2.2;
      ud.groundRingOuter.rotation.z = -t * 1.6;
      const pulseScale = 1 + Math.sin(t * 4.5) * 0.10;
      ud.groundRingOuter.scale.set(pulseScale, pulseScale, 1);

      ud.floatingDiamond.rotation.y = t * 3.0;
      ud.floatingDiamond.rotation.x = Math.sin(t * 2.0) * 0.2;
      ud.pointerGroup.position.y = 2.45 + Math.sin(t * 4.2) * 0.16;

      if (ud.lastPlayerIdx !== gameState.currentPlayerIdx) {
        ud.lastPlayerIdx = gameState.currentPlayerIdx;
        const theme = PLAYER_THEMES[gameState.currentPlayerIdx];
        if (!activeTurnSpriteMap[gameState.currentPlayerIdx]) {
          activeTurnSpriteMap[gameState.currentPlayerIdx] = createTurnBillboardTexture(curP.name, theme?.colorHex);
        }
        ud.spriteMat.map = activeTurnSpriteMap[gameState.currentPlayerIdx];
        ud.spriteMat.needsUpdate = true;
        if (theme?.colorHex) {
          const mainCol = new THREE.Color(theme.colorHex);
          const lightCol = new THREE.Color(getLightPlayerAccent(theme.colorHex, 0.40));
          ud.groundRingInner.material.color.copy(mainCol);
          ud.groundRingOuter.material.color.copy(lightCol);
          if (ud.floatingDiamond) {
            ud.floatingDiamond.material.color.copy(mainCol);
            ud.floatingDiamond.material.emissive.copy(mainCol);
          }
          if (ud.pointerCone) {
            ud.pointerCone.material.color.copy(mainCol);
            ud.pointerCone.material.emissive.copy(mainCol);
          }
        }
      }
    } else {
      activePlayerBeaconGroup.visible = false;
    }
  }

  // Building pop-in
  for (let i = animatedBuildingPopups.length - 1; i >= 0; i--) {
    const item = animatedBuildingPopups[i];
    if (!item.mesh.parent) { animatedBuildingPopups.splice(i, 1); continue; }
    if (now < item.startTime) continue;
    const elapsed = now - item.startTime; const p3 = Math.min(1, elapsed / item.duration);
    const scale = p3 === 1 ? 1 : 1 - Math.pow(2, -10 * p3) * Math.cos((p3 * 10 - 0.75) * ((2 * Math.PI) / 3));
    item.mesh.scale.set(scale, scale, scale);
    if (p3 >= 1) animatedBuildingPopups.splice(i, 1);
  }

  // Dynamic Flag cloth wind fluttering
  for (let i = animatedFlags.length - 1; i >= 0; i--) {
    const fGroup = animatedFlags[i];
    if (!fGroup.parent) { animatedFlags.splice(i, 1); continue; }
    const ud = fGroup.userData;
    if (ud?.seg2) ud.seg2.rotation.y = 0.16 + Math.sin(t * 3.8 + ud.phase) * 0.14;
    if (ud?.seg3) ud.seg3.rotation.y = -0.25 + Math.sin(t * 4.5 + ud.phase) * 0.22;
  }

  // Cozy Village chimney smoke bobbing & breathing
  for (let i = animatedChimneySmokes.length - 1; i >= 0; i--) {
    const smk = animatedChimneySmokes[i];
    if (!smk.parent) { animatedChimneySmokes.splice(i, 1); continue; }
    const ud = smk.userData;
    smk.position.y = ud.baseY + Math.sin(t * 2.8 + ud.phase) * 0.025;
    const s = 1 + Math.sin(t * 3.4 + ud.phase) * 0.12;
    smk.scale.set(s, s, s);
  }

  // Skyscraper pinnacle aviation warning beacon pulse
  for (let i = animatedSkyscraperBeacons.length - 1; i >= 0; i--) {
    const bcn = animatedSkyscraperBeacons[i];
    if (!bcn.parent) { animatedSkyscraperBeacons.splice(i, 1); continue; }
    if (bcn.material) {
      bcn.material.emissiveIntensity = 1.0 + Math.sin(t * 5.0 + (bcn.userData?.phase || 0)) * 0.8;
    }
  }

  // Rolling cash display
  gameState.players.forEach((p, idx) => {
    if (displayedCash[idx] !== p.cash) {
      const diff = p.cash - displayedCash[idx];
      const step = Math.ceil(Math.abs(diff) * 0.22);
      if (Math.abs(diff) <= 2000) { displayedCash[idx] = p.cash; }
      else { displayedCash[idx] += Math.sign(diff) * step; }
      const cashEl = document.getElementById(`hud-cash-val-${idx}`);
      if (cashEl) cashEl.textContent = p.bankrupt ? 'OUT' : fmtMoney(displayedCash[idx]);
    }
  });

  updateSpeechBubbleScreenPosition();
  renderLobbyHeroStage(t);
  renderer.render(scene, camera);
}

// ──────────────────────────────────────────────────────────────────────────────
// Lobby Hero 3D Stage (Floating Grassy Podium with 3D Avatar, Trees & Dice)
// ──────────────────────────────────────────────────────────────────────────────
let lobbyHeroScene = null;
let lobbyHeroCamera = null;
let lobbyHeroRenderer = null;
let lobbyHeroAvatarGroup = null;
let lobbyHeroPodiumGroup = null;
const lobbyHeroCanvasId = 'lobby-avatar-3d-canvas';

export function initLobbyHeroStage() {
  const canvas = document.getElementById(lobbyHeroCanvasId);
  if (!canvas) return;

  const w = 380;
  const h = 400;

  lobbyHeroScene = new THREE.Scene();
  lobbyHeroCamera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
  lobbyHeroCamera.position.set(0, 1.45, 5.0);
  lobbyHeroCamera.lookAt(0, 0.42, 0);

  lobbyHeroRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  lobbyHeroRenderer.setSize(w, h, false);
  lobbyHeroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Studio lighting
  const amb = new THREE.AmbientLight(0xffffff, 0.95);
  const dir = new THREE.DirectionalLight(0xfffbeb, 1.25);
  dir.position.set(4, 7, 5);
  lobbyHeroScene.add(amb, dir);

  // Floating Podium (Circular Grass Island with white rim)
  lobbyHeroPodiumGroup = new THREE.Group();
  lobbyHeroPodiumGroup.position.set(0, -0.62, 0);

  // White base plinth
  const rimGeo = new THREE.CylinderGeometry(1.65, 1.72, 0.22, 32);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = 0.11;
  lobbyHeroPodiumGroup.add(rimMesh);

  // Vibrant green grass top
  const grassGeo = new THREE.CylinderGeometry(1.58, 1.58, 0.24, 32);
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.55 });
  const grassMesh = new THREE.Mesh(grassGeo, grassMat);
  grassMesh.position.y = 0.13;
  lobbyHeroPodiumGroup.add(grassMesh);

  // Mini stylized trees on the grass
  function createMiniTree(x, z, s = 1) {
    const tree = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.35 * s, 8), trunkMat);
    trunk.position.y = (0.35 * s) / 2;
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.45, flatShading: true });
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s, 0.55 * s, 7), leavesMat);
    leaves.position.y = 0.35 * s + (0.55 * s) / 2;
    tree.add(trunk, leaves);
    tree.position.set(x, 0.25, z);
    return tree;
  }
  lobbyHeroPodiumGroup.add(createMiniTree(-1.18, -0.45, 1.1));
  lobbyHeroPodiumGroup.add(createMiniTree(-1.05, 0.35, 0.85));
  lobbyHeroPodiumGroup.add(createMiniTree(1.22, -0.38, 1.05));

  // Pair of red 3D dice on the grass!
  function createMiniDice(x, z, rotY) {
    const diceMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25 });
    const die = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), diceMat);
    die.position.set(x, 0.36, z);
    die.rotation.set(0.05, rotY, 0.05);
    return die;
  }
  lobbyHeroPodiumGroup.add(createMiniDice(0.95, 0.48, 0.4));
  lobbyHeroPodiumGroup.add(createMiniDice(1.15, 0.38, -0.2));

  lobbyHeroScene.add(lobbyHeroPodiumGroup);

  // Avatar group
  lobbyHeroAvatarGroup = new THREE.Group();
  lobbyHeroAvatarGroup.position.set(0, -0.35, 0);
  lobbyHeroScene.add(lobbyHeroAvatarGroup);

  updateLobbyHeroAvatar(0, '#6c5ce7', 0x6c5ce7);
}

export function updateLobbyHeroAvatar(hatStyle = 0, colorHex = '#6c5ce7', charColor = 0x6c5ce7) {
  if (!lobbyHeroAvatarGroup) return;
  while (lobbyHeroAvatarGroup.children.length > 0) {
    lobbyHeroAvatarGroup.remove(lobbyHeroAvatarGroup.children[0]);
  }
  const mockIdx = (hatStyle || 0) % 4;
  PLAYER_THEMES[mockIdx].charColor = (typeof charColor === 'number') ? charColor : 0x6c5ce7;
  PLAYER_THEMES[mockIdx].colorHex = colorHex || '#6c5ce7';
  const avatarMesh = createDetailed3DAvatarMesh(mockIdx, false);
  avatarMesh.scale.setScalar(1.25);
  lobbyHeroAvatarGroup.add(avatarMesh);
}

function renderLobbyHeroStage(t) {
  if (!lobbyHeroRenderer || !lobbyHeroScene || !lobbyHeroCamera) return;
  const canvas = document.getElementById(lobbyHeroCanvasId);
  const landing = document.getElementById('landing-setup-screen');
  if (!canvas || !landing || landing.classList.contains('hidden') || landing.style.display === 'none') return;

  if (lobbyHeroAvatarGroup) {
    lobbyHeroAvatarGroup.rotation.y = Math.sin(t * 0.9) * 0.42;
    const ud = lobbyHeroAvatarGroup.children[0]?.userData;
    if (ud?.headGroup) {
      ud.headGroup.rotation.y = Math.sin(t * 1.8) * 0.15;
    }
  }
  if (lobbyHeroPodiumGroup) {
    lobbyHeroPodiumGroup.rotation.y = t * 0.15;
  }
  lobbyHeroRenderer.render(lobbyHeroScene, lobbyHeroCamera);
}

// ──────────────────────────────────────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────────────────────────────────────
let lastHoverCheckTime = 0;

export function initThreeScene(onTileClickCb) {
  onTileClick = onTileClickCb;

  const container = document.getElementById('three-canvas-container');
  scene = new THREE.Scene();

  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 31.5;
  camera = new THREE.OrthographicCamera((-frustumSize * aspect) / 2, (frustumSize * aspect) / 2, frustumSize / 2, -frustumSize / 2, 1, 200);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  maxAnisotropy = renderer.capabilities.getMaxAnisotropy() || 4;
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  updateIsometricCamera();

  raycaster = new THREE.Raycaster();
  mouseVec = new THREE.Vector2();

  ambientLight = new THREE.AmbientLight(0xffffff, 0.38);
  scene.add(ambientLight);
  dirLight = new THREE.DirectionalLight(0xffffff, 0.98);
  dirLight.position.set(22, 32, 18);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 2.0;
  dirLight.shadow.camera.far = 95;
  const d = 21;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0003;
  dirLight.shadow.normalBias = 0.025;
  dirLight.shadow.radius = 2.0;
  scene.add(dirLight);

  boardGroup = new THREE.Group(); scene.add(boardGroup);

  buildDioramaBaseAndPark();
  buildLowPolyParkDecor3D();
  buildLowPolyFloatingClouds3D();
  buildAllBoardTiles3D();
  buildFourCornerLandmarks3D();
  buildStreetLampsAndBulbs3D();
  buildAnimatedRoadCars3D();
  build3DDicePair();
  buildTileHighlightRing3D();
  buildActivePlayerHighlightSystem();
  ensure3DPortraitSystemInitialized();

  // Pointer events
  let isDragging = false, dragStartX = 0, pointerMoved = false;
  renderer.domElement.addEventListener('pointerdown', e => { isDragging = true; dragStartX = e.clientX; pointerMoved = false; });
  window.addEventListener('pointermove', e => {
    if (isDragging) {
      const dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 5) { pointerMoved = true; targetCameraAzimuth += dx * 0.0045; dragStartX = e.clientX; }
      document.getElementById('tile-hover-tooltip').classList.add('hidden');
    } else {
      const now = performance.now();
      if (now - lastHoverCheckTime > 30) {
        lastHoverCheckTime = now;
        handleCanvasHover(e);
      }
    }
  });
  window.addEventListener('pointerup', e => {
    if (!isDragging) return;
    isDragging = false;
    if (!pointerMoved) {
      handleCanvasClick(e);
    } else {
      // Snap to nearest 45 degree angle so board layout is always perfectly even and square
      const snap = Math.PI / 4;
      targetCameraAzimuth = Math.round(targetCameraAzimuth / snap) * snap;
    }
  });

  // Mouse-centric zoom: zooms directly toward the world point under the mouse pointer
  renderer.domElement.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomFactor = Math.pow(0.9985, e.deltaY);
    const newZoom = Math.max(0.70, Math.min(2.8, targetCameraZoom * zoomFactor));
    if (Math.abs(newZoom - targetCameraZoom) < 0.0005) return;

    // Raycast mouse position onto board plane at y = BASE_TILE_Y
    mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouseVec, camera);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BASE_TILE_Y);
    const mouseWorldPoint = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(groundPlane, mouseWorldPoint);

    if (hit) {
      if (newZoom > targetCameraZoom) {
        // Zooming IN toward the mouse pointer: shift target camera center toward mouse world point
        const shiftRatio = 1 - (targetCameraZoom / newZoom);
        const shiftVec = mouseWorldPoint.clone().sub(targetCameraTarget).multiplyScalar(shiftRatio);
        targetCameraTarget.add(shiftVec);
      } else {
        // Zooming OUT: smoothly recenter towards (0, 0, 0)
        const outFactor = Math.max(0, Math.min(1, (1.25 - newZoom) / 0.4));
        targetCameraTarget.lerp(new THREE.Vector3(0, 0, 0), outFactor * 0.4);
      }

      // Restrict pan target within board boundaries
      targetCameraTarget.x = Math.max(-9.2, Math.min(9.2, targetCameraTarget.x));
      targetCameraTarget.z = Math.max(-9.2, Math.min(9.2, targetCameraTarget.z));
    }

    targetCameraZoom = newZoom;
  }, { passive: false });

  window.addEventListener('resize', () => {
    const aspect2 = window.innerWidth / window.innerHeight;
    camera.left = (-frustumSize * aspect2) / 2; camera.right = (frustumSize * aspect2) / 2;
    camera.top = frustumSize / 2; camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animateThreeLoop();
}
