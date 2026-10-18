/**
 * three/core/loop.js
 * Main 60FPS animation and rendering loop coordinating subsystems:
 * camera damping, traffic, weather, character idle animations, building popups, lighting, and stage rendering.
 */

import { context } from './context.js';
import { updateCameraDamping, cameraState } from './camera.js';
import { updateRoadCarsAnimation } from '../environment/cars.js';
import { updateCloudsAndBalloons } from '../environment/clouds.js';
import { updateAvatarIdleAnimations, renderLive3DHUDPortraits, updatePlayerTokenPositions3D } from '../pawns/tokens.js';
import { renderCityPreviewStage } from '../stages/cityPreview.js';
import { updateTileDepressionsAnimation } from '../board/tilePress.js';
import { updateStreetLampGlow, updateAvatarBreathingLights, updateTileIlluminationsAndPressLight } from './lighting.js';
import { updateActivePlayerBeacon } from '../board/highlights.js';
import { updateBuildingAnimations, animatedBuildingPopups } from '../assets/buildings.js';
import { updateSpeechBubbleScreenPosition } from '../pawns/speech.js';
import { renderLobbyHeroStage } from '../stages/lobbyStage.js';
import { gameState, displayedCash } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { updatePhysicsSimulation } from '../physics/physicsEngine.js';
import { updateAudioListener, updateAdaptiveMusicTension, evaluateMatchTension } from '../../game/audio.js';

let isLoopRunning = false;
let lastFrameTime = performance.now();
let lastRenderTime = 0;
let shadowTick = 0;

/**
 * Main animation loop driven by requestAnimationFrame.
 */
export function animateThreeLoop() {
  requestAnimationFrame(animateThreeLoop);

  // 1. Power-save: Pause rendering entirely if tab is minimized or hidden in background, or WebGL context lost
  if (document.hidden || context.isContextLost) return;

  const now = performance.now();

  // 2. 60 FPS Target Frame Limiter: Prevents 120Hz/144Hz/240Hz monitors from wasting 2x-4x CPU cycles
  const minInterval = 1000 / 60 - 1.5;
  if (now - lastRenderTime < minInterval) return;
  lastRenderTime = now;

  const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) * 0.001));
  lastFrameTime = now;
  const t = now * 0.001;

  // 3. Lobby Setup Screen Bypass: When user is in lobby/setup menu, skip rendering the background 3D board!
  const landingScreen = document.getElementById('landing-setup-screen');
  const isLandingVisible = landingScreen && !landingScreen.classList.contains('hidden') && landingScreen.style.display !== 'none';
  if (isLandingVisible) {
    renderLobbyHeroStage(t);
    return;
  }

  // 4. Motion-Driven Shadow Map Updates:
  // Render shadow maps dynamically when tokens move, buildings pop up, or camera rotates.
  // When the scene is completely static/idle, throttle to ~2Hz (every 30 frames) to save GPU passes.
  if (context.renderer && context.renderer.shadowMap) {
    shadowTick++;
    const isMoving = (gameState && gameState.phase === 'MOVING');
    const hasPopups = (animatedBuildingPopups && animatedBuildingPopups.length > 0);
    const isCameraActive = cameraState && (
      Math.abs(cameraState.cameraAzimuth - cameraState.targetCameraAzimuth) > 0.002 ||
      cameraState.isIntroAnimating
    );

    if (isMoving || hasPopups || isCameraActive) {
      context.renderer.shadowMap.needsUpdate = true;
    } else if (shadowTick % 30 === 0) {
      context.renderer.shadowMap.needsUpdate = true;
    }
  }

  // 1. Camera damping & isometric orientation updates
  updateCameraDamping(dt);

  // Sync 3D spatial audio listener with current camera coordinates and azimuth
  if (context.camera && cameraState) {
    updateAudioListener(context.camera.position, cameraState.cameraTarget, context.camera.up);
  }

  // Update adaptive soundtrack tension every ~20 frames (~330ms)
  if (shadowTick % 20 === 0 && gameState && gameState.gameStarted && gameState.phase !== 'VICTORY') {
    updateAdaptiveMusicTension(evaluateMatchTension());
  }

  // 2. Roadway traffic simulation
  updateRoadCarsAnimation();

  // 3. Clouds and festival hot-air balloon drifting
  updateCloudsAndBalloons(t);

  // 4. Character head tracking, breathing, and blinking
  updateAvatarIdleAnimations(t);

  // 5. Live 3D HUD character portraits
  renderLive3DHUDPortraits(t);

  // 6. Modal 3D property inspector rotating diorama
  renderCityPreviewStage(now);

  // 7. Interactive tile depression spring animation
  updateTileDepressionsAnimation(updatePlayerTokenPositions3D);

  // 8. Environmental lighting: street lamps, filament breathing, avatar auras, and night tile glows
  updateTileIlluminationsAndPressLight(t);
  updateStreetLampGlow(t);
  updateAvatarBreathingLights(t);

  // 9. Active player turn beacon and monopoly set halos
  updateActivePlayerBeacon(t);

  // 10. Building animations (elastic popups, flag fluttering, chimney smoke, aviation beacons)
  updateBuildingAnimations(now, t);

  // 11. Smooth rolling cash display update
  if (gameState && gameState.players) {
    gameState.players.forEach((p, idx) => {
      if (displayedCash[idx] !== p.cash) {
        const diff = p.cash - displayedCash[idx];
        const step = Math.ceil(Math.abs(diff) * 0.22);
        if (Math.abs(diff) <= 2000) {
          displayedCash[idx] = p.cash;
        } else {
          displayedCash[idx] += Math.sign(diff) * step;
        }
        const cashEl = document.getElementById(`hud-cash-val-${idx}`);
        if (cashEl) {
          cashEl.textContent = p.bankrupt ? 'OUT' : fmtMoney(displayedCash[idx]);
        }
      }
    });
  }

  // 12. Floating 3D speech bubble screen projection
  updateSpeechBubbleScreenPosition();

  // 13. Dynamic 3D Physics Engine Simulation Tick
  updatePhysicsSimulation(dt);

  // 14. Primary Scene Render (Direct render: crisp, natural lighting, zero artificial bloom blowout)
  if (context.renderer && context.scene && context.camera) {
    context.renderer.render(context.scene, context.camera);
  }
}

/**
 * Starts the render loop if not already cycling.
 */
export function startRenderLoop() {
  if (!isLoopRunning) {
    isLoopRunning = true;
    animateThreeLoop();
  }
}
