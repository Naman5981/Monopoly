/**
 * game/engine/tileClick.js
 * Board tile click delegation from 3D scene / raycaster.
 * Routes tile interaction based on active phase (World Tour flight, Festival boost, or Deed Inspector).
 */

import { gameState } from '../state.js';
import { networkState } from '../../network/p2pState.js';
import { executeWorldTourFlight } from './flight.js';
import { showSpeechBubble } from '../../three/scene.js';
import { playSFX } from '../audio.js';
import { openInspectorModal, closeInspectorModal } from '../../ui/modals/inspector.js';

export function handleTileClick(tileId) {
  if (typeof tileId !== 'number' || tileId < 0 || tileId > 31) return;

  const isHumanTurn = networkState.isMultiplayer
    ? gameState.currentPlayerIdx === networkState.localPlayerIdx
    : !gameState.players[gameState.currentPlayerIdx]?.isAI;

  const flightBanner = typeof document !== 'undefined' ? document.getElementById('world-tour-banner') : null;
  const isFlightBannerActive = Boolean(flightBanner && !flightBanner.classList.contains('hidden'));

  // World Tour destination selection phase or visible flight banner failsafe
  if (gameState.phase === 'WORLD_TOUR' || isFlightBannerActive) {
    if (isHumanTurn) {
      gameState.phase = 'WORLD_TOUR';
      if (typeof window !== 'undefined' && typeof window.executeWorldTourFlight === 'function') {
        window.executeWorldTourFlight(tileId);
      } else {
        executeWorldTourFlight(tileId);
      }
    }
    return;
  }

  // Festival boost selection phase
  if (gameState.phase === 'FESTIVAL_SELECT') {
    if (isHumanTurn) {
      const activeIdx = networkState.isMultiplayer ? networkState.localPlayerIdx : gameState.currentPlayerIdx;
      const prop = gameState.properties[tileId];
      if (prop && prop.owner === activeIdx) {
        if (typeof window !== 'undefined' && typeof window.chooseFestivalBoostCity === 'function') {
          window.chooseFestivalBoostCity(tileId);
        }
        return;
      } else {
        showSpeechBubble('Click one of your highlighted properties! 🎪', 2500);
        playSFX('deny');
        return;
      }
    }
    return;
  }

  // Standard tile inspection modal
  const m = typeof document !== 'undefined' ? document.getElementById('modal-tile-inspector') : null;
  if (m && !m.classList.contains('hidden') && gameState.activeInspectorTile === tileId) {
    closeInspectorModal();
    return;
  }
  openInspectorModal(tileId);
}

if (typeof window !== 'undefined') {
  window.handleTileClick = handleTileClick;
  window.onTileClick = handleTileClick;
}
