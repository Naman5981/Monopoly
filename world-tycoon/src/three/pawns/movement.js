/**
 * three/pawns/movement.js
 * Pawn traversal physics: parabolic jumping arcs with squash & stretch, landing tile depressions,
 * and aerial cruise flight trajectories for World Tour.
 */

import { context } from '../core/context.js';
import { getTileFacingAngle, BASE_BUILDING_Y } from '../board/coords.js';
import { triggerTileButtonPress, setMovingHopDestTileId } from '../board/tilePress.js';
import { updateSpeechBubbleScreenPosition } from './speech.js';

/**
 * Animates a single tile-to-tile parabolic hopping jump.
 * @param {number} playerIdx
 * @param {{x: number, z: number}} startPos
 * @param {{x: number, z: number}} endPos
 * @param {number} step - Current step index (0 to totalSteps - 1)
 * @param {number} totalSteps - Total steps rolled
 * @param {number} destTileId - Target tile landed on
 * @returns {Promise<void>}
 */
export function hopPlayerStepAnimation(playerIdx, startPos, endPos, step, totalSteps, destTileId) {
  return new Promise(resolveHop => {
    const mesh = context.playerMeshes[playerIdx];
    const offsets = [
      { x: -0.42, z: 0.42 },
      { x: 0.42, z: 0.42 },
      { x: -0.42, z: -0.42 },
      { x: 0.42, z: -0.42 }
    ];
    const off = offsets[playerIdx] || { x: 0, z: 0 };
    const hopDuration = 340;
    const hopStart = performance.now();
    let pressedTriggered = false;

    function stepHop(now) {
      const rawT = Math.min(1, (now - hopStart) / hopDuration);
      const easeT = -(Math.cos(Math.PI * rawT) - 1) / 2;
      const curX = startPos.x + (endPos.x - startPos.x) * easeT + off.x;
      const curZ = startPos.z + (endPos.z - startPos.z) * easeT + off.z;
      const isFinalTouchdown = (step === totalSteps - 1);

      if (isFinalTouchdown && rawT >= 0.70) {
        setMovingHopDestTileId(destTileId);
      }
      if (isFinalTouchdown && rawT >= 0.82 && !pressedTriggered) {
        pressedTriggered = true;
        triggerTileButtonPress(destTileId, -0.20, 240);
      } else if (!isFinalTouchdown && rawT >= 0.88 && !pressedTriggered) {
        pressedTriggered = true;
        triggerTileButtonPress(destTileId, -0.05, 120);
      }

      const tilePressOffset = context.activeTileDepressions[destTileId]?.currentOffset ?? 0;
      const arcHeight = Math.sin(rawT * Math.PI) * 0.95;

      if (mesh) {
        mesh.position.set(curX, BASE_BUILDING_Y + arcHeight + (rawT > 0.8 ? tilePressOffset : 0), curZ);
        mesh.rotation.y = getTileFacingAngle(destTileId);

        const ud = mesh.userData;
        if (ud?.armGroupL && ud?.armGroupR) {
          const swing = Math.sin(rawT * Math.PI) * 0.55;
          ud.armGroupL.rotation.x = swing * (step % 2 === 0 ? 1 : -1);
          ud.armGroupR.rotation.x = -swing * (step % 2 === 0 ? 1 : -1);
          if (ud.legGroupL && ud.legGroupR) {
            ud.legGroupL.rotation.x = -swing * 0.6 * (step % 2 === 0 ? 1 : -1);
            ud.legGroupR.rotation.x = swing * 0.6 * (step % 2 === 0 ? 1 : -1);
          }
        }

        const baseScale = 0.88;
        const stretch = rawT < 0.85
          ? 1 + Math.sin(rawT * Math.PI) * 0.09
          : 0.93 + (1 - rawT) * 0.35;
        mesh.scale.set(baseScale / Math.sqrt(stretch), baseScale * stretch, baseScale / Math.sqrt(stretch));
      }

      updateSpeechBubbleScreenPosition();

      if (rawT < 1) {
        requestAnimationFrame(stepHop);
      } else {
        setTimeout(() => {
          setMovingHopDestTileId(null);
        }, 150);
        resolveHop();
      }
    }
    requestAnimationFrame(stepHop);
  });
}

/**
 * Resets token scale, rotations, and limb swings back to rest state following hops.
 * @param {number} playerIdx
 */
export function resetTokenAfterHop(playerIdx) {
  const mesh = context.playerMeshes[playerIdx];
  if (!mesh) return;
  mesh.scale.setScalar(0.88);
  mesh.rotation.x = 0;
  mesh.rotation.z = 0;
  const ud = mesh.userData;
  if (ud?.armGroupL && ud?.armGroupR) {
    ud.armGroupL.rotation.x = 0;
    ud.armGroupL.rotation.y = 0;
    ud.armGroupL.rotation.z = 0;
    ud.armGroupR.rotation.x = 0;
    ud.armGroupR.rotation.y = 0;
    ud.armGroupR.rotation.z = 0;
    if (ud.legGroupL && ud.legGroupR) {
      ud.legGroupL.rotation.x = 0;
      ud.legGroupL.rotation.y = 0;
      ud.legGroupL.rotation.z = 0;
      ud.legGroupR.rotation.x = 0;
      ud.legGroupR.rotation.y = 0;
      ud.legGroupR.rotation.z = 0;
    }
  }
}

/**
 * Animates high-speed aerial flight across tiles for World Tour.
 * @param {number} playerIdx
 * @param {{x: number, z: number}} startPos
 * @param {{x: number, z: number}} endPos
 * @param {number} step
 * @param {number} totalSteps
 * @param {number} destTileId
 * @returns {Promise<void>}
 */
export function flyPlayerStepAnimation(playerIdx, startPos, endPos, step, totalSteps, destTileId) {
  return new Promise(resolveFly => {
    const mesh = context.playerMeshes[playerIdx];
    const offsets = [
      { x: -0.42, z: 0.42 },
      { x: 0.42, z: 0.42 },
      { x: -0.42, z: -0.42 },
      { x: 0.42, z: -0.42 }
    ];
    const off = offsets[playerIdx] || { x: 0, z: 0 };
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
        flightAltitude = Math.sin((1 - rawT) * (Math.PI / 2)) * 1.35;
      } else if (step === 0) {
        flightAltitude = Math.sin(rawT * (Math.PI / 2)) * 1.35;
      } else {
        flightAltitude = 1.3 + Math.sin(rawT * Math.PI) * 0.28;
      }

      if (isFinalTouchdown && rawT >= 0.70) {
        setMovingHopDestTileId(destTileId);
      }
      if (isFinalTouchdown && rawT >= 0.82 && !pressedTriggered) {
        pressedTriggered = true;
        triggerTileButtonPress(destTileId, -0.22, 240);
      }

      const tilePressOffset = context.activeTileDepressions[destTileId]?.currentOffset ?? 0;

      if (mesh) {
        mesh.position.set(curX, BASE_BUILDING_Y + flightAltitude + (isFinalTouchdown && rawT > 0.8 ? tilePressOffset : 0), curZ);
        mesh.rotation.y = getTileFacingAngle(destTileId);

        const ud = mesh.userData;
        if (ud?.armGroupL && ud?.armGroupR) {
          if (isFinalTouchdown && rawT > 0.65) {
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
            mesh.rotation.x = 0.16;
            mesh.rotation.z = Math.sin(rawT * Math.PI * 2) * 0.08;
            if (ud.legGroupL && ud.legGroupR) {
              ud.legGroupL.rotation.x = -0.32;
              ud.legGroupR.rotation.x = -0.32;
            }
          }
        }
      }

      updateSpeechBubbleScreenPosition();

      if (rawT < 1) {
        requestAnimationFrame(stepFly);
      } else {
        setTimeout(() => {
          setMovingHopDestTileId(null);
        }, 150);
        resolveFly();
      }
    }
    requestAnimationFrame(stepFly);
  });
}
