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
import { disposeHierarchy } from '../core/dispose.js';
import { spawnAnimatedReaction } from '../effects.js';
import { playSFX } from '../../game/audio.js';

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
  for (let i = 0; i < 6; i++) {
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

export function rebuild3DPortraits() {
  if (!portraitRenderer) {
    ensure3DPortraitSystemInitialized();
    return;
  }
  portraitScenes.forEach(entry => {
    if (entry.scene) disposeHierarchy(entry.scene);
  });
  portraitScenes = [];
  for (let i = 0; i < 6; i++) {
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
  rebuild3DPortraits();
  context.playerMeshes.forEach(m => {
    boardGroup.remove(m);
    disposeHierarchy(m);
  });
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
    { x: -0.48, z: 0.45 },
    { x: 0.48, z: 0.45 },
    { x: -0.48, z: -0.45 },
    { x: 0.48, z: -0.45 },
    { x: -0.52, z: 0.0 },
    { x: 0.52, z: 0.0 }
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
    const off = offsets[idx % offsets.length];
    mesh.position.set(pos.x + off.x, BASE_BUILDING_Y + tilePress, pos.z + off.z);
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
    if (ud.isHurt) return;

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
  if (now - lastPortraitRenderTime < 70) return;
  lastPortraitRenderTime = now;

  gameState.players.forEach((_, idx) => {
    const targetCanvas = document.getElementById(`hud-avatar-canvas-${idx}`);
    const entry = portraitScenes[idx];
    if (!targetCanvas || !entry) return;

    const isTurn = (idx === gameState.currentPlayerIdx);
    const isHurt = Boolean(entry.hurtUntil && entry.hurtUntil > now);

    // If drawn once and not active turn and not currently hurt, skip render for efficiency
    if (targetCanvas._drawnOnce && !isTurn && !isHurt) return;

    const avatar = entry.avatar;
    const ud = avatar.userData;
    const baseYaw = (idx % 2 === 0) ? 0.24 : -0.24;

    if (isHurt) {
      const hurtT = Math.max(0, (entry.hurtUntil - now) / 680);
      // High-frequency comic recoil shudder
      avatar.position.x = Math.sin(hurtT * Math.PI * 18) * 0.08 * hurtT;
      avatar.position.y = -0.05 - 0.05 * Math.sin(hurtT * Math.PI);
      avatar.rotation.y = baseYaw;
      avatar.rotation.z = Math.sin(hurtT * Math.PI * 14) * 0.18 * hurtT;
      if (ud?.headGroup) {
        ud.headGroup.rotation.x = -0.32 * Math.sin(hurtT * Math.PI);
        ud.headGroup.rotation.z = Math.sin(hurtT * Math.PI * 20) * 0.22 * hurtT;
      }
      if (ud?.eyesGroup) {
        ud.eyesGroup.scale.y = 0.15; // squint in pain
      }
    } else {
      avatar.position.x = 0;
      avatar.rotation.z = 0;
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

/**
 * Triggers an expressive comic flinch / hurt recoil animation when player suffers a cash deduction.
 * Shudders body, recoils head back, throws arms outwards, flashes damage red,
 * spawns screen-space sweat drops, and jitters 3D HUD portrait.
 * @param {number} playerIdx
 */
export function triggerTokenHurtAnimation(playerIdx) {
  if (playerIdx === null || playerIdx === undefined || playerIdx < 0) return;

  // 1. Play impact hurt sound
  playSFX('hurt');

  // 2. Trigger HUD 3D portrait shudder
  if (portraitScenes[playerIdx]) {
    portraitScenes[playerIdx].hurtUntil = performance.now() + 680;
  }

  // 3. 3D Board pawn flinch animation
  const mesh = context.playerMeshes[playerIdx];
  if (!mesh) return;
  const ud = mesh.userData;
  if (!ud) return;

  // Set hurt flag so idle breathing does not override
  ud.isHurt = true;

  // Screen-space cartoon sweat/impact reaction
  try {
    if (context.camera) {
      const headPos = new THREE.Vector3();
      if (ud.headGroup) {
        ud.headGroup.getWorldPosition(headPos);
      } else {
        mesh.getWorldPosition(headPos);
        headPos.y += 1.2;
      }
      headPos.project(context.camera);
      const screenX = (headPos.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-(headPos.y * 0.5) + 0.5) * window.innerHeight;
      if (screenX >= 0 && screenX <= window.innerWidth && screenY >= 0 && screenY <= window.innerHeight) {
        spawnAnimatedReaction('sweat', screenX, screenY - 20);
      }
    }
  } catch (_) {}

  // Cache initial rest poses
  const origRotX = mesh.rotation.x;
  const origRotZ = mesh.rotation.z;
  const origHeadRotX = ud.headGroup ? ud.headGroup.rotation.x : 0;
  const origHeadRotY = ud.headGroup ? ud.headGroup.rotation.y : 0;
  const origArmLX = ud.armGroupL ? ud.armGroupL.rotation.x : 0;
  const origArmLZ = ud.armGroupL ? ud.armGroupL.rotation.z : 0;
  const origArmRX = ud.armGroupR ? ud.armGroupR.rotation.x : 0;
  const origArmRZ = ud.armGroupR ? ud.armGroupR.rotation.z : 0;

  const duration = 680;
  const startTime = performance.now();

  function stepHurt(now) {
    const rawT = Math.min(1, (now - startTime) / duration);
    const decay = 1 - rawT;

    // Recoil tilt back and rapid vibration
    const recoilBack = -0.32 * Math.sin(rawT * Math.PI);
    const shudderZ = Math.sin(rawT * Math.PI * 18) * 0.16 * decay;
    mesh.rotation.x = origRotX + recoilBack;
    mesh.rotation.z = origRotZ + shudderZ;

    // Squash on impact then elastic spring back
    const squash = 1 - Math.sin(rawT * Math.PI) * 0.22;
    const baseScale = 0.88;
    mesh.scale.set(baseScale / Math.sqrt(squash), baseScale * squash, baseScale / Math.sqrt(squash));

    // Head recoil and dizzy shake
    if (ud.headGroup) {
      ud.headGroup.rotation.x = origHeadRotX - 0.36 * Math.sin(rawT * Math.PI);
      ud.headGroup.rotation.y = origHeadRotY + Math.sin(rawT * Math.PI * 14) * 0.30 * decay;
    }

    // Arms flail outward and up in comic shock
    if (ud.armGroupL && ud.armGroupR) {
      const flail = Math.sin(rawT * Math.PI);
      ud.armGroupL.rotation.z = origArmLZ + flail * 0.82;
      ud.armGroupR.rotation.z = origArmRZ - flail * 0.82;
      ud.armGroupL.rotation.x = origArmLX - flail * 0.55;
      ud.armGroupR.rotation.x = origArmRX - flail * 0.55;
    }

    // Suit flash red damage feedback
    if (ud.suitMat) {
      ud.suitMat.emissive.setHex(0xf43f5e);
      ud.suitMat.emissiveIntensity = Math.sin(rawT * Math.PI) * 0.85;
    }

    if (rawT < 1) {
      requestAnimationFrame(stepHurt);
    } else {
      // Reset to pristine rest pose
      mesh.rotation.x = origRotX;
      mesh.rotation.z = origRotZ;
      mesh.scale.setScalar(0.88);
      if (ud.headGroup) {
        ud.headGroup.rotation.x = origHeadRotX;
        ud.headGroup.rotation.y = origHeadRotY;
      }
      if (ud.armGroupL) {
        ud.armGroupL.rotation.x = origArmLX;
        ud.armGroupL.rotation.z = origArmLZ;
      }
      if (ud.armGroupR) {
        ud.armGroupR.rotation.x = origArmRX;
        ud.armGroupR.rotation.z = origArmRZ;
      }
      if (ud.suitMat) {
        updateAvatarLightingForCurrentMode();
      }
      ud.isHurt = false;
    }
  }

  requestAnimationFrame(stepHurt);
}
