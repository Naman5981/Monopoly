/**
 * game/engine/strategies/AirportLandingStrategy.js
 * Strategy for landing on World Tour Airport tile.
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { BOARD_TILES } from '../../data.js';
import { gameState, matchSettings, isHumanTurnActionable } from '../../state.js';
import { showSpeechBubble, setFlightModeHighlights } from '../../../three/scene.js';
import { updateRollButtonsUI, setStatusPill } from '../../../ui/hud.js';
import { networkState, broadcastFullGameState } from '../../../network/p2p.js';
import { executeWorldTourFlight } from '../flight.js';

export function chooseStrategicFlightDestination(playerIdx, playerCash) {
  const unowned = BOARD_TILES.filter(t => (t.type === 'city' || t.type === 'resort') && gameState.properties[t.id]?.owner === null);
  const affordable = unowned.filter(t => playerCash >= (t.price || 0) + 120000);

  if (affordable.length > 0) {
    let bestTile = affordable[0];
    let bestScore = -1;
    for (const tile of affordable) {
      let score = tile.price || 0;
      if (tile.group) {
        const grp = BOARD_TILES.filter(t => (t.type === 'city' || t.type === 'resort') && t.group === tile.group);
        const ownedByBot = grp.filter(t => gameState.properties[t.id]?.owner === playerIdx).length;
        if (grp.length > 1 && ownedByBot === grp.length - 1) score += 2000000;
        else if (ownedByBot > 0) score += 400000;
        const opponentNear = (gameState.players || []).some((opp, oppIdx) => {
          if (!opp || opp.bankrupt || oppIdx === playerIdx) return false;
          return grp.length > 1 && grp.filter(t => gameState.properties[t.id]?.owner === oppIdx).length === grp.length - 1;
        });
        if (opponentNear) score += 1200000;
      }
      if (score > bestScore) {
        bestScore = score;
        bestTile = tile;
      }
    }
    return bestTile.id;
  }

  const upgradeableOwned = BOARD_TILES.find(t =>
    (t.type === 'city' || t.type === 'resort') &&
    gameState.properties[t.id]?.owner === playerIdx &&
    (gameState.properties[t.id]?.level || 0) < 4
  );
  return upgradeableOwned ? upgradeableOwned.id : 0;
}

export class AirportLandingStrategy extends ITileLandingStrategy {
  constructor(tileLandingEvaluator) {
    super();
    this.tileLandingEvaluator = tileLandingEvaluator;
  }

  async execute(context) {
    const { playerIdx, player } = context;

    if (player.isAI) {
      if (networkState.isMultiplayer && !networkState.isHost) {
        showSpeechBubble(`✈️ ${player.name} landed on World Tour! Planning flight...`, 2500);
        return;
      }
      showSpeechBubble(`✈️ ${player.name} landed on World Tour! Planning flight...`, 2500);
      await new Promise(r => setTimeout(r, Math.max(200, Math.round(900 / (matchSettings.gameSpeed || 1)))));
      const dest = chooseStrategicFlightDestination(playerIdx, player.cash);
      await executeWorldTourFlight(dest, false, playerIdx, this.tileLandingEvaluator);
      return;
    }

    // Dismiss any open deed inspector so it never interferes with destination selection
    if (typeof window !== 'undefined' && typeof window.closeInspectorModal === 'function') {
      window.closeInspectorModal();
    }

    // Synchronize WORLD_TOUR phase globally across Host, active player, and remote spectators
    gameState.phase = 'WORLD_TOUR';

    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastFullGameState();
    }

    const isLocalHumanTurn = !networkState.isMultiplayer || (playerIdx === networkState.localPlayerIdx);

    if (isLocalHumanTurn) {
      setFlightModeHighlights(true);
      document.getElementById('world-tour-banner')?.classList.remove('hidden');
      document.getElementById('world-tour-banner')?.classList.add('flex');
      showSpeechBubble('Click any tile to fly there!', 4000);
      setStatusPill(`✈️ <strong>${player.name}</strong>: Click any tile on the board to fly immediately!`, { isThinking: false, playerIdx });
      updateRollButtonsUI(isHumanTurnActionable());
    } else {
      setFlightModeHighlights(false);
      document.getElementById('world-tour-banner')?.classList.add('hidden');
      document.getElementById('world-tour-banner')?.classList.remove('flex');
      showSpeechBubble(`${player.name} is choosing a flight destination...`, 3500);
      setStatusPill(`✈️ Waiting for <strong>${player.name}</strong> to choose flight destination...`, { isThinking: true, playerIdx });
      updateRollButtonsUI(false);
    }
  }
}
