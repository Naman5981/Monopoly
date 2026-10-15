/**
 * three/core/loop.js
 * Main 60FPS animation and rendering loop coordinating subsystems:
 * camera damping, traffic, weather, character idle animations, building popups, lighting, and stage rendering.
 */

import { context } from './context.js';
import { updateCameraDamping } from './camera.js';
import { updateRoadCarsAnimation } from '../environment/cars.js';
import { updateCloudsAndBalloons } from '../environment/clouds.js';
import { updateAvatarIdleAnimations, renderLive3DHUDPortraits, updatePlayerTokenPositions3D } from '../pawns/tokens.js';
import { renderCityPreviewStage } from '../stages/cityPreview.js';
import { updateTileDepressionsAnimation } from '../board/tilePress.js';
import { updateStreetLampGlow, updateAvatarBreathingLights, updateTileIlluminationsAndPressLight } from './lighting.js';
import { updateActivePlayerBeacon } from '../board/highlights.js';
import { updateBuildingAnimations } from '../assets/buildings.js';
import { updateSpeechBubbleScreenPosition } from '../pawns/speech.js';
import { renderLobbyHeroStage } from '../stages/lobbyStage.js';
import { gameState, displayedCash } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';

let isLoopRunning = false;

/**
 * Main animation loop driven by requestAnimationFrame.
 */
export function animateThreeLoop() {
  requestAnimationFrame(animateThreeLoop);

  const now = performance.now();
  const t = now * 0.001;

  // 1. Camera damping & isometric orientation updates
  updateCameraDamping();

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

  // 13. Lobby 3D Hero Podium render
  renderLobbyHeroStage(t);

  // 14. Primary Scene Render
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
