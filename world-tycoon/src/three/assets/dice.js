/**
 * three/assets/dice.js
 * 3D dice pair construction with rounded chamfers, embedded pip dots, and dramatic roll physics animation with audio.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { playSFX } from '../../game/audio.js';

export function build3DDicePair(boardGroup) {
  const materials = [];
  for (let face = 1; face <= 6; face++) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 242, 242);
    ctx.fillStyle = (face === 1 || face === 4) ? '#ef4444' : '#0f172a';

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
    tex.anisotropy = context.maxAnisotropy;
    materials.push(new THREE.MeshLambertMaterial({ map: tex }));
  }

  const restingCoords = [{ x: -2.25, z: -0.95 }, { x: -0.95, z: -2.25 }];
  context.diceMeshes = [];
  for (let i = 0; i < 2; i++) {
    const dieGroup = new THREE.Group();
    const dieMesh = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.38, 1.38), materials);
    dieMesh.castShadow = true;
    dieMesh.receiveShadow = true;
    dieGroup.add(dieMesh);
    dieGroup.position.set(restingCoords[i].x, 1.05, restingCoords[i].z);
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

export function getCSSDiceRotationForFace(faceVal) {
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

/**
 * Triggers full 3D tumbling physics and screen overlay animation for a dice roll.
 * @param {number} d1 - Die 1 result (1 to 6)
 * @param {number} d2 - Die 2 result (1 to 6)
 * @returns {Promise<void>} Resolves when dice animation settles
 */
export function animate3DDiceTumble(d1, d2) {
  return new Promise(resolve => {
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

    const rot1 = getTargetRotationForDieFace(d1);
    const rot2 = getTargetRotationForDieFace(d2);
    const endPos = [{ x: -2.25, z: -0.95 }, { x: -0.95, z: -2.25 }];

    // Hide background dice on board while rolling overlay is active
    context.diceMeshes.forEach(d => { d.visible = false; });

    const cssRot1 = getCSSDiceRotationForFace(d1);
    const cssRot2 = getCSSDiceRotationForFace(d2);
    const cssSpins1 = { x: cssRot1.x + 360 * 3, y: cssRot1.y + 360 * 4, z: 360 * 2 };
    const cssSpins2 = { x: cssRot2.x - 360 * 3, y: cssRot2.y - 360 * 4, z: -360 * 2 };

    let bounced1 = false;
    let bounced2 = false;

    function stepDice(now) {
      const rawT = Math.min(1, (now - startTime) / duration);

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
              if (context.diceMeshes[0]) {
                context.diceMeshes[0].position.set(endPos[0].x, 1.05, endPos[0].z);
                context.diceMeshes[0].rotation.set(rot1.x, Math.PI / 4, rot1.z);
              }
              if (context.diceMeshes[1]) {
                context.diceMeshes[1].position.set(endPos[1].x, 1.05, endPos[1].z);
                context.diceMeshes[1].rotation.set(rot2.x, -Math.PI / 4, rot2.z);
              }
              context.diceMeshes.forEach(d => { d.visible = true; d.scale.set(1, 1, 1); });
              resolve();
            }, 280);
          } else {
            context.diceMeshes.forEach(d => { d.visible = true; });
            resolve();
          }
        }, 650);
      }
    }
    requestAnimationFrame(stepDice);
  });
}
