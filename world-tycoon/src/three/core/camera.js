/**
 * three/core/camera.js
 * Isometric orthographic camera management: orbit rotation, panning, smooth damping, and cursor-centric zoom.
 */

import * as THREE from 'three';
import { context } from './context.js';
import { BASE_TILE_Y } from '../board/coords.js';

export const cameraState = {
  cameraZoom: 1.0,
  targetCameraZoom: 1.0,
  cameraAzimuth: Math.PI / 4,
  targetCameraAzimuth: Math.PI / 4,
  cameraTarget: new THREE.Vector3(0, 0, 0),
  targetCameraTarget: new THREE.Vector3(0, 0, 0)
};

/**
 * Recomputes the isometric camera position and look-at target based on current azimuth, zoom, and center.
 * Smoothly blends elevation and distance between Diamond (corner at bottom) and Edge-On (edge at bottom)
 * orientations so the board appears accurately square and proportioned when viewed edge-on.
 */
export function updateIsometricCamera() {
  if (!context.camera) return;

  // edgeFactor is 1.0 when an edge is at the bottom (azimuth = 0, PI/2, PI, 3*PI/2)
  // and 0.0 when a corner is at the bottom (diamond view, azimuth = PI/4, 3*PI/4, ...)
  const edgeFactor = Math.pow(Math.cos(2 * cameraState.cameraAzimuth), 2);
  const dist = 34.0 - 16.0 * edgeFactor;
  const elev = 30.0 + 14.0 * edgeFactor;

  context.camera.position.set(
    cameraState.cameraTarget.x + Math.cos(cameraState.cameraAzimuth) * dist,
    cameraState.cameraTarget.y + elev,
    cameraState.cameraTarget.z + Math.sin(cameraState.cameraAzimuth) * dist
  );
  context.camera.lookAt(cameraState.cameraTarget.x, cameraState.cameraTarget.y, cameraState.cameraTarget.z);
  context.camera.zoom = cameraState.cameraZoom;
  context.camera.updateProjectionMatrix();
}

/**
 * Damps camera azimuth, zoom, and target vector smoothly toward their target values.
 * Should be called once per render frame.
 */
export function updateCameraDamping(dt = 0.016) {
  let camChanged = false;
  const safeDt = Math.min(0.05, Math.max(0.001, dt));
  const azDamp = 1 - Math.exp(-6.5 * safeDt);
  const zoomDamp = 1 - Math.exp(-9.0 * safeDt);
  const targetDamp = 1 - Math.exp(-9.0 * safeDt);

  if (Math.abs(cameraState.targetCameraAzimuth - cameraState.cameraAzimuth) > 0.0005) {
    cameraState.cameraAzimuth += (cameraState.targetCameraAzimuth - cameraState.cameraAzimuth) * azDamp;
    camChanged = true;
  }

  if (Math.abs(cameraState.targetCameraZoom - cameraState.cameraZoom) > 0.0005) {
    cameraState.cameraZoom += (cameraState.targetCameraZoom - cameraState.cameraZoom) * zoomDamp;
    camChanged = true;
  }

  if (cameraState.cameraTarget.distanceTo(cameraState.targetCameraTarget) > 0.001) {
    cameraState.cameraTarget.lerp(cameraState.targetCameraTarget, targetDamp);
    camChanged = true;
  }

  if (camChanged) {
    updateIsometricCamera();
  }
}

/**
 * Resets camera orientation to default isometric angle and center.
 */
export function resetCameraView() {
  cameraState.targetCameraAzimuth = Math.PI / 4;
  cameraState.targetCameraZoom = 1.0;
  cameraState.targetCameraTarget.set(0, 0, 0);
}

/**
 * Rotates the board view 45 degrees counter-clockwise (smoothly switching between edge-on and diamond).
 */
export function rotateBoardLeft() {
  cameraState.targetCameraAzimuth -= Math.PI / 4;
  const snap = Math.PI / 4;
  cameraState.targetCameraAzimuth = Math.round(cameraState.targetCameraAzimuth / snap) * snap;
}

/**
 * Rotates the board view 45 degrees clockwise (smoothly switching between edge-on and diamond).
 */
export function rotateBoardRight() {
  cameraState.targetCameraAzimuth += Math.PI / 4;
  const snap = Math.PI / 4;
  cameraState.targetCameraAzimuth = Math.round(cameraState.targetCameraAzimuth / snap) * snap;
}

/**
 * Triggers a cinematic camera fly-in at match start or lobby transition.
 */
export function startIntroCameraFlyIn() {
  cameraState.cameraAzimuth = Math.PI * 0.9;
  cameraState.targetCameraAzimuth = Math.PI / 4;
  cameraState.cameraZoom = 0.65;
  cameraState.targetCameraZoom = 1.0;
  cameraState.targetCameraTarget.set(0, 0, 0);
}

/**
 * Handles mouse-wheel zooming directed toward the cursor's world plane intersection.
 * @param {WheelEvent} e
 */
export function handleMouseWheelZoom(e) {
  e.preventDefault();
  const zoomFactor = Math.pow(0.9985, e.deltaY);
  const newZoom = Math.max(0.70, Math.min(2.8, cameraState.targetCameraZoom * zoomFactor));
  if (Math.abs(newZoom - cameraState.targetCameraZoom) < 0.0005) return;

  if (context.mouseVec && context.raycaster && context.camera) {
    context.mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    context.mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
    context.raycaster.setFromCamera(context.mouseVec, context.camera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BASE_TILE_Y);
    const mouseWorldPoint = new THREE.Vector3();
    const hit = context.raycaster.ray.intersectPlane(groundPlane, mouseWorldPoint);

    if (hit) {
      if (newZoom > cameraState.targetCameraZoom) {
        const shiftRatio = 1 - (cameraState.targetCameraZoom / newZoom);
        const shiftVec = mouseWorldPoint.clone().sub(cameraState.targetCameraTarget).multiplyScalar(shiftRatio);
        cameraState.targetCameraTarget.add(shiftVec);
      } else {
        const outFactor = Math.max(0, Math.min(1, (1.25 - newZoom) / 0.4));
        cameraState.targetCameraTarget.lerp(new THREE.Vector3(0, 0, 0), outFactor * 0.4);
      }

      cameraState.targetCameraTarget.x = Math.max(-9.2, Math.min(9.2, cameraState.targetCameraTarget.x));
      cameraState.targetCameraTarget.z = Math.max(-9.2, Math.min(9.2, cameraState.targetCameraTarget.z));
    }
  }

  cameraState.targetCameraZoom = newZoom;
}

/**
 * Handles window resize for the orthographic camera.
 */
export function handleCameraWindowResize() {
  if (!context.camera || !context.renderer) return;
  const aspect = window.innerWidth / window.innerHeight;
  const f = context.frustumSize;
  context.camera.left = (-f * aspect) / 2;
  context.camera.right = (f * aspect) / 2;
  context.camera.top = f / 2;
  context.camera.bottom = -f / 2;
  context.camera.updateProjectionMatrix();
  context.renderer.setSize(window.innerWidth, window.innerHeight);
}
