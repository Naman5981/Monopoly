/**
 * three/pawns/tokens.js
 * Spawns and manages player pawn meshes on the board and live animated 3D HUD portraits.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { gameState } from '../../game/state.js';
import { getTileWorldPosition, getTileFacingAngle, BASE_BUILDING_Y } from '../board/coords.js';
import { createDetailed3DAvatarMesh } from '../assets/avatars.js';
import { updateAvatarLightingForCurrentMode } from '../core/lighting.js';

let portraitRenderer = null;
let portraitCamera = null;
let portraitScenes = [];
let lastPortraitRenderTime = 0;

export function ensure3DPortraitSystemInitialized() {
  if (portraitRenderer) return;
  portraitRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  portraitRenderer.setSize(136, 136);
  portraitRenderer.setPixelRatio(1);

  portraitCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
  portraitCamera.position.set(0, 0.88, 2.55);
  portraitCamera.lookAt(0, 0.82, 0);

  portraitScenes = [];
  for (let i = 0; i < 4; i++) {
    const pScene = new THREE.Scene();
    pScene.add(new THREE.AmbientLight(0xffffff, 0.85));

    const kl = new THREE.DirectionalLight(0xfffbeb, 0.9);
    kl.position.set(2.5, 4, 3.5);
    pScene.add(kl);

    const rl = new THREE.DirectionalLight(0x93c5fd, 0.55);
    rl.position.set(-3, 2, -2);
    pScene.add(rl);

    const avatar3D = createDetailed3DAvatarMesh(i, true);
    avatar3D.position.set(0, -0.05, 0);
    avatar3D.rotation.y = (i % 2 === 0) ? 0.24 : -0.24;
    pScene.add(avatar3D);

    portraitScenes.push({ scene: pScene, avatar: avatar3D });
  }
}

/**
 * Spawns 3D avatar meshes for all active players and positions them on their starting tiles.
 * @param {THREE.Group} boardGroup
 */
export function spawnAllPlayerTokens3D(boardGroup = context.boardGroup) {
  if (!boardGroup) return;
  context.playerMeshes.forEach(m => boardGroup.remove(m));
  context.playerMeshes = [];

  gameState.players.forEach((_, idx) => {
    const mesh = createDetailed3DAvatarMesh(idx, false);
    mesh.scale.setScalar(0.88);
    boardGroup.add(mesh);
    context.playerMeshes.push(mesh);
  });

  updatePlayerTokenPositions3D();
  updateAvatarLightingForCurrentMode();
}

/**
 * Repositions all player tokens with offset spacing when multiple players occupy the same tile.
 */
export function updatePlayerTokenPositions3D() {
  const offsets = [
    { x: -0.45, z: 0.45 },
    { x: 0.45, z: 0.45 },
    { x: -0.45, z: -0.45 },
    { x: 0.45, z: -0.45 }
  ];

  gameState.players.forEach((p, idx) => {
    const mesh = context.playerMeshes[idx];
    if (!mesh) return;
    if (p.bankrupt) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const pos = getTileWorldPosition(p.position);
    const tilePress = context.activeTileDepressions[p.position]?.currentOffset ?? 0;
    mesh.position.set(pos.x + offsets[idx].x, BASE_BUILDING_Y + tilePress, pos.z + offsets[idx].z);
    mesh.rotation.y = getTileFacingAngle(p.position);
  });
}

/**
 * Updates idling breathing, head turning, and eye blinking per frame.
 * @param {number} t - Time in seconds
 */
export function updateAvatarIdleAnimations(t) {
  context.playerMeshes.forEach((mesh, idx) => {
    if (!mesh || !mesh.visible) return;
    const ud = mesh.userData;
    if (!ud?.headGroup) return;

    const isTurn = (idx === gameState.currentPlayerIdx);
    const ph = ud.phaseOffset || 0;

    ud.headGroup.rotation.y = Math.sin(t * 1.5 + ph) * (isTurn ? 0.25 : 0.12);
    ud.headGroup.rotation.x = Math.cos(t * 2.1 + ph) * 0.06;

    if (ud.eyesGroup) {
      const blinkCycle = (t + ph) % 4.2;
      ud.eyesGroup.scale.y = (blinkCycle > 4.02 && blinkCycle < 4.16) ? 0.1 : 1.0;
    }

    if (gameState.phase === 'ROLL' || gameState.phase === 'END') {
      const baseScale = 0.88;
      const breath = isTurn ? (1 + Math.sin(t * 3.4) * 0.045) : (1 + Math.sin(t * 2.0 + ph) * 0.018);
      mesh.scale.set(baseScale / Math.sqrt(breath), baseScale * breath, baseScale / Math.sqrt(breath));
    }
  });
}

/**
 * Renders 3D portrait avatars to the HUD canvases.
 * @param {number} t - Time in seconds
 */
export function renderLive3DHUDPortraits(t) {
  if (!portraitRenderer || portraitScenes.length === 0) return;
  const now = performance.now();
  if (now - lastPortraitRenderTime < 95) return;
  lastPortraitRenderTime = now;

  gameState.players.forEach((_, idx) => {
    const targetCanvas = document.getElementById(`hud-avatar-canvas-${idx}`);
    const entry = portraitScenes[idx];
    if (!targetCanvas || !entry) return;

    const isTurn = (idx === gameState.currentPlayerIdx);
    if (targetCanvas._drawnOnce && !isTurn) return;

    const avatar = entry.avatar;
    const ud = avatar.userData;
    const baseYaw = (idx % 2 === 0) ? 0.24 : -0.24;

    avatar.rotation.y = baseYaw + Math.sin(t * 1.6 + idx) * (isTurn ? 0.22 : 0.09);
    avatar.position.y = -0.05 + Math.sin(t * (isTurn ? 3.6 : 1.8) + idx) * (isTurn ? 0.035 : 0.015);

    if (ud?.headGroup) {
      ud.headGroup.rotation.z = Math.sin(t * 2.1 + idx) * (isTurn ? 0.08 : 0.03);
      ud.headGroup.rotation.x = Math.cos(t * 1.9 + idx) * 0.05;
    }

    if (ud?.eyesGroup) {
      const b = (t + idx * 1.3) % 3.8;
      ud.eyesGroup.scale.y = (b > 3.64 && b < 3.76) ? 0.1 : 1.0;
    }

    portraitRenderer.render(entry.scene, portraitCamera);
    const ctx2d = targetCanvas.getContext('2d');
    if (ctx2d) {
      ctx2d.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      ctx2d.drawImage(portraitRenderer.domElement, 0, 0, targetCanvas.width, targetCanvas.height);
      targetCanvas._drawnOnce = true;
    }
  });
}
