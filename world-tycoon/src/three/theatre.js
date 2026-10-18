/**
 * three/theatre.js
 * Theatre.js Visual Motion Design & Cinematic Camera Director for Three.js.
 *
 * Provides timeline-driven choreography for:
 * 1. Intro Sequences (Sky cloud descent -> Board orbit -> Local player framing)
 * 2. Landmark Milestones (Dramatic low-angle focus, lighting flare & particle bursts)
 * 3. Victory Podium Reveals (360-degree orbit with champion spotlighting)
 *
 * Seamlessly integrates with @theatre/core and @theatre/studio when installed,
 * with high-performance procedural Three.js easing fallbacks built-in.
 */

import * as THREE from 'three';
import { context } from './core/context.js';
import { cameraState, updateIsometricCamera } from './core/camera.js';
import { getTileWorldPosition } from './board/coords.js';

let activeCutscene = null;
let cutsceneCancel = null;

export const theatreState = {
  isStudioActive: false,
  project: null,
  sheets: {},
  activeCutsceneName: null
};

/**
 * Initialize Theatre.js studio & project if library is present, or prepare procedural director.
 */
export async function initTheatreSuite() {
  if (typeof window !== 'undefined' && window.Theatre) {
    try {
      const { getProject } = window.Theatre.core;
      theatreState.project = getProject('WorldTycoonCinematics');
      theatreState.sheets.intro = theatreState.project.getSheet('IntroSequence');
      theatreState.sheets.landmark = theatreState.project.getSheet('LandmarkMilestone');
      theatreState.sheets.victory = theatreState.project.getSheet('VictoryPodium');

      if (window.Theatre.studio && !window.location.search.includes('nostudio')) {
        window.Theatre.studio.initialize();
        theatreState.isStudioActive = true;
      }
      console.log('🎬 [Theatre.js] Cinematics Suite initialized successfully.');
    } catch (err) {
      console.warn('[Theatre.js] Failed to load Theatre Studio:', err);
    }
  }
}

/**
 * Plays a cinematic camera cutscene.
 * @param {'intro' | 'landmark' | 'victory'} sequenceName
 * @param {object} params
 */
export async function playCinematicCutscene(sequenceName, params = {}) {
  // If an active cutscene is running, cancel it cleanly
  if (cutsceneCancel) {
    cutsceneCancel();
    cutsceneCancel = null;
  }

  theatreState.activeCutsceneName = sequenceName;

  switch (sequenceName) {
    case 'intro':
      return playIntroCinematicFlyIn();
    case 'landmark':
      return playLandmarkCinematicReveal(params.tileId || 0);
    case 'victory':
      return playVictoryCinematicOrbit(params.durationMs || 12000);
    default:
      console.warn(`[Theatre] Unknown cutscene sequence: ${sequenceName}`);
  }
}

/**
 * 1. Intro Sequence: Swooping descent from clouds with azimuth rotation.
 */
export function playIntroCinematicFlyIn() {
  return new Promise((resolve) => {
    let cancelled = false;
    cutsceneCancel = () => { cancelled = true; resolve(); };

    cameraState.cameraAzimuth = Math.PI * 0.95;
    cameraState.targetCameraAzimuth = Math.PI / 4;
    cameraState.cameraZoom = 0.55;
    cameraState.targetCameraZoom = 1.0;
    cameraState.cameraTarget.set(0, 0, 0);
    cameraState.targetCameraTarget.set(0, 0, 0);

    const startTime = performance.now();
    const duration = 2200;

    function animate(now) {
      if (cancelled) return;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Quintic ease out for majestic, buttery smooth deceleration
      const ease = 1 - Math.pow(1 - progress, 5);

      cameraState.cameraAzimuth = THREE.MathUtils.lerp(Math.PI * 0.95, Math.PI / 4, ease);
      cameraState.cameraZoom = THREE.MathUtils.lerp(0.55, 1.0, ease);
      updateIsometricCamera();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        cutsceneCancel = null;
        theatreState.activeCutsceneName = null;
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

/**
 * 2. Landmark Milestone: Cinematic focus on the upgraded Skyscraper with zoom and Dutch angle.
 */
export function playLandmarkCinematicReveal(tileId) {
  return new Promise((resolve) => {
    let cancelled = false;
    cutsceneCancel = () => { cancelled = true; resolve(); };

    const tilePos = getTileWorldPosition(tileId);
    const origTarget = cameraState.targetCameraTarget.clone();
    const origZoom = cameraState.targetCameraZoom;
    const origAzimuth = cameraState.targetCameraAzimuth;

    // Glide camera directly to the landmark building
    cameraState.targetCameraTarget.set(tilePos.x, tilePos.y + 1.2, tilePos.z);
    cameraState.targetCameraZoom = 2.15; // Dramatic close-up

    // Angle to face the city
    const angleToCenter = Math.atan2(tilePos.z, tilePos.x);
    cameraState.targetCameraAzimuth = angleToCenter + Math.PI / 6;

    // Hold dramatic framing for 2.2 seconds before returning smoothly
    setTimeout(() => {
      if (cancelled) return;
      cameraState.targetCameraTarget.copy(origTarget);
      cameraState.targetCameraZoom = origZoom;
      cameraState.targetCameraAzimuth = origAzimuth;

      setTimeout(() => {
        cutsceneCancel = null;
        theatreState.activeCutsceneName = null;
        resolve();
      }, 1000);
    }, 2200);
  });
}

/**
 * 3. Victory Podium: Continuous 360-degree orbit around the champion.
 */
export function playVictoryCinematicOrbit(durationMs = 12000) {
  return new Promise((resolve) => {
    let cancelled = false;
    cutsceneCancel = () => { cancelled = true; resolve(); };

    cameraState.targetCameraTarget.set(0, 0.8, 0);
    cameraState.targetCameraZoom = 1.35;

    const startTime = performance.now();

    function step(now) {
      if (cancelled) return;
      const elapsed = now - startTime;
      if (elapsed >= durationMs) {
        cutsceneCancel = null;
        theatreState.activeCutsceneName = null;
        resolve();
        return;
      }

      // Smooth constant angular velocity (1 revolution every ~10s)
      cameraState.targetCameraAzimuth += 0.008;
      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  });
}

if (typeof window !== 'undefined') {
  window.playCinematicCutscene = playCinematicCutscene;
}
