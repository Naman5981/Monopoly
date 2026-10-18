/**
 * game/engine/flight.js
 * World Tour airline flight mode, intermediate START bonuses, and 3D flight animations.
 */

import { BOARD_TILES } from '../data.js';
import { gameState, matchSettings } from '../state.js';
import { playSFX } from '../audio.js';
import {
  resetTokenAfterHop,
  updatePlayerTokenPositions3D,
  showSpeechBubble,
  getTileWorldPosition,
  setTileHighlightRing,
  setFlightModeHighlights,
  flyPlayerStepAnimation
} from '../../three/scene.js';
import { renderCornerHUDs, spawnFloatingCashOnHUD, logEvent } from '../../ui/hud.js';
import { spawnAnimatedReaction } from '../../three/effects.js';
import { networkState, broadcastAction } from '../../network/p2p.js';
import { animateBoardingPassZoom, animateGoSalaryStream } from '../../ui/anim.js';

export async function executeWorldTourFlight(destTileId, isRemote = false, explicitPlayerIdx = null, evaluateLandingFn = null) {
  if (typeof destTileId !== 'number' || destTileId < 0 || destTileId >= BOARD_TILES.length) {
    console.warn('[WorldTour] Invalid destination tile:', destTileId);
    return;
  }

  setFlightModeHighlights(false);
  document.getElementById('world-tour-banner')?.classList.add('hidden');
  document.getElementById('world-tour-banner')?.classList.remove('flex');

  const pIdx = explicitPlayerIdx !== null ? explicitPlayerIdx : gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!p) return;

  // IMPORTANT: Lock phase to MOVING so background loops and tile depression resets never override flight position
  gameState.phase = 'MOVING';

  if (networkState.isMultiplayer && !isRemote) {
    broadcastAction('ACTION_WORLD_TOUR', { playerIdx: pIdx, destTileId });
  }

  showSpeechBubble(`✈️ Flying to ${BOARD_TILES[destTileId].name}...`, 3500);
  logEvent(`✈️ <strong>${p.name}</strong> took off on flight toward <strong>${BOARD_TILES[destTileId].name}</strong>!`);
  animateBoardingPassZoom(BOARD_TILES[destTileId].name);

  const startPos = p.position;
  playSFX('flight', 1.0, getTileWorldPosition(startPos));
  setTileHighlightRing(destTileId, true);

  const totalSteps = (destTileId - startPos + 32) % 32;

  try {
    if (totalSteps > 0) {
      for (let s = 0; s < totalSteps; s++) {
        if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
        const curTileId = (startPos + s) % 32;
        const nextTileId = (startPos + s + 1) % 32;
        const curWorldPos = getTileWorldPosition(curTileId);
        const nextWorldPos = getTileWorldPosition(nextTileId);
        p.position = nextTileId;

        await flyPlayerStepAnimation(pIdx, curWorldPos, nextWorldPos, s, totalSteps, nextTileId);
        if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

        // Passing START bonus (+300K) — only on intermediate passing, not final landing on START
        if (p.position === 0 && s < totalSteps - 1) {
          p.cash += 300000;
          playSFX('cash', 1.0, getTileWorldPosition(0));
          spawnAnimatedReaction('cash');
          spawnFloatingCashOnHUD(pIdx, '+300K Passed START', true);
          animateGoSalaryStream(pIdx, '+300K');
          logEvent(`🚩 <strong>${p.name}</strong> passed START on World Tour and collected <strong>300K</strong> salary!`);
          renderCornerHUDs();
        }
      }
    }
  } catch (err) {
    console.error('[WorldTour] Flight animation error, recovering token position:', err);
  }

  p.position = destTileId;
  resetTokenAfterHop(pIdx);
  updatePlayerTokenPositions3D();
  playSFX('hop', 1.0, getTileWorldPosition(destTileId));
  showSpeechBubble(`🛬 Landed in ${BOARD_TILES[destTileId].name}!`, 2200);
  setTileHighlightRing(destTileId, false);
  renderCornerHUDs();

  gameState.upgradesThisVisit = 0;
  await new Promise(r => setTimeout(r, Math.max(120, Math.round(350 / (matchSettings.gameSpeed || 1)))));

  if (typeof evaluateLandingFn === 'function') {
    await evaluateLandingFn(pIdx, false);
  } else if (window.evaluateTileLanding) {
    await window.evaluateTileLanding(pIdx, false);
  }
}
