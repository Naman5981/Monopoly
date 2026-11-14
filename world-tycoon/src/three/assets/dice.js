/**
 * three/assets/dice.js
 * 3D dice pair construction with rounded chamfers, embedded pip dots, and dramatic roll physics animation with audio.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { playSFX } from '../../game/audio.js';
import { simulateDicePhysicsToss, triggerBoardShockwave } from '../physics/physicsEngine.js';
import { showDiceSumBadge, hideDiceSumBadge } from '../../ui/hud.js';

export const DICE_SKIN_PALETTES = {
  dice_classic: { bg: '#ffffff', stroke: '#cbd5e1', pipSpecial: '#ef4444', pipNormal: '#0f172a' },
  dice_ruby: { bg: '#b91c1c', stroke: '#f87171', pipSpecial: '#fef08a', pipNormal: '#fde047' },
  dice_midas: { bg: '#eab308', stroke: '#ca8a04', pipSpecial: '#451a03', pipNormal: '#451a03' },
  dice_neon: { bg: '#0b0f19', stroke: '#06b6d4', pipSpecial: '#38bdf8', pipNormal: '#38bdf8' },
  dice_obsidian: { bg: '#18181b', stroke: '#a855f7', pipSpecial: '#c084fc', pipNormal: '#e9d5ff' }
};

let activeDiceSkin = 'dice_classic';
const diceMaterialCache = new Map();

export function createDiceMaterialsForSkin(skinId = 'dice_classic') {
  if (diceMaterialCache.has(skinId)) {
    return diceMaterialCache.get(skinId);
  }
  const palette = DICE_SKIN_PALETTES[skinId] || DICE_SKIN_PALETTES.dice_classic;
  const materials = [];
  for (let face = 1; face <= 6; face++) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 242, 242);
    ctx.fillStyle = (face === 1 || face === 4) ? palette.pipSpecial : palette.pipNormal;

    const pips = {
      1: [[128, 128]],
      2: [[70, 70], [186, 186]],
      3: [[64, 64], [128, 128], [192, 192]],
      4: [[70, 70], [186, 70], [70, 186], [186, 186]],
      5: [[66, 66], [190, 66], [128, 128], [66, 190], [190, 190]],
      6: [[70, 58], [186, 58], [70, 128], [186, 128], [70, 198], [186, 198]]
    }[face];

    pips.forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, face === 1 ? 28 : 22, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(c);
    if (context.maxAnisotropy) tex.anisotropy = context.maxAnisotropy;
    materials.push(new THREE.MeshLambertMaterial({ map: tex }));
  }
  diceMaterialCache.set(skinId, materials);
  return materials;
}

export function applyEquippedDiceSkin(skinId = 'dice_classic') {
  activeDiceSkin = skinId;
  if (!context.diceMeshes || context.diceMeshes.length === 0) return;
  const newMaterials = createDiceMaterialsForSkin(skinId);
  context.diceMeshes.forEach(dieGroup => {
    const mesh = dieGroup.children[0];
    if (mesh) {
      mesh.material = newMaterials;
    }
  });
}

export function build3DDicePair(boardGroup) {
  const materials = createDiceMaterialsForSkin(activeDiceSkin);

  const restingCoords = [{ x: -1.45, z: -0.65 }, { x: 0.75, z: -1.75 }];
  context.diceMeshes = [];
  for (let i = 0; i < 2; i++) {
    const dieGroup = new THREE.Group();
    const dieMesh = new THREE.Mesh(new THREE.BoxGeometry(1.30, 1.30, 1.30), materials);
    dieMesh.castShadow = true;
    dieMesh.receiveShadow = true;
    dieGroup.add(dieMesh);
    dieGroup.position.set(restingCoords[i].x, 1.02, restingCoords[i].z);
    dieGroup.rotation.y = (i === 0 ? 0.28 : -0.22);
    boardGroup.add(dieGroup);
    context.diceMeshes.push(dieGroup);
  }
}

export function getTargetRotationForDieFace(faceVal) {
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

import { matchSettings } from '../../game/state.js';

/**
 * Triggers full 3D tumbling physics on the board for a dice roll.
 * @param {number} d1 - Die 1 result (1 to 6)
 * @param {number} d2 - Die 2 result (1 to 6)
 * @returns {Promise<void>} Resolves when dice animation settles
 */
export function animate3DDiceTumble(d1, d2) {
  return new Promise(resolve => {
    playSFX('diceShuffle', 0.9, { x: 0, y: 1.0, z: 0 });

    const speed = matchSettings?.gameSpeed || 1;
    const baseDuration = 1150;
    const duration = Math.max(220, Math.round(baseDuration / speed));
    const startPos = [{ x: -1.25, z: -0.45 }, { x: 0.95, z: -1.55 }];

    // Prepare 3D board dice meshes for dynamic bouncing toss
    const dieMesh1 = context.diceMeshes && context.diceMeshes[0];
    const dieMesh2 = context.diceMeshes && context.diceMeshes[1];

    if (dieMesh1) {
      dieMesh1.visible = true;
      dieMesh1.position.set(startPos[0].x, 4.5, startPos[0].z);
    }
    if (dieMesh2) {
      dieMesh2.visible = true;
      dieMesh2.position.set(startPos[1].x, 4.8, startPos[1].z);
    }

    hideDiceSumBadge();
    let bounced = false;

    // Simulate 3D rigid-body dice physics with real bounce, angular momentum, and rim ricochets
    simulateDicePhysicsToss(dieMesh1, dieMesh2, d1, d2, duration, (progress) => {
      // Small shockwave pulse when dice hit the board
      if (progress > 0.45 && !bounced) {
        bounced = true;
        playSFX('diceBounce', 1.0, { x: 0, y: 0.4, z: -1.2 });
        triggerBoardShockwave(0, -1.2, 12, 22);
      }
      if (progress >= 1) {
        const resultStr = `🎲 ${d1} + ${d2} = ${d1 + d2}${d1 === d2 ? ' (DOUBLES!)' : ''}`;
        playSFX('hop', 0.8, { x: 0, y: 0.4, z: -1.2 });
        showDiceSumBadge(resultStr, 2000);
        setTimeout(resolve, Math.max(100, Math.round(260 / speed)));
      }
    });
  });
}
