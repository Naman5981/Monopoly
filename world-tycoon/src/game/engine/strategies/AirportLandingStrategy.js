/**
 * game/engine/strategies/AirportLandingStrategy.js
 * Strategy for landing on World Tour Airport tile.
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { BOARD_TILES } from '../../data.js';
import { gameState, matchSettings, isHumanTurnActionable } from '../../state.js';
import { showSpeechBubble, setFlightModeHighlights } from '../../../three/scene.js';
import { updateRollButtonsUI } from '../../../ui/hud.js';
import { networkState } from '../../../network/p2p.js';
import { executeWorldTourFlight } from '../flight.js';

export class AirportLandingStrategy extends ITileLandingStrategy {
  constructor(tileLandingEvaluator) {
    super();
    this.tileLandingEvaluator = tileLandingEvaluator;
  }

  async execute(context) {
    const { playerIdx, player } = context;

    if (player.isAI) {
      showSpeechBubble(`✈️ ${player.name} landed on World Tour! Planning flight...`, 2500);
      await new Promise(r => setTimeout(r, Math.max(200, Math.round(900 / (matchSettings.gameSpeed || 1)))));
      const unowned = BOARD_TILES.filter(t => (t.type === 'city' || t.type === 'resort') && !gameState.properties[t.id]?.owner);
      const dest = unowned.length > 0 ? unowned[Math.floor(Math.random() * unowned.length)].id : 0;
      await executeWorldTourFlight(dest, false, playerIdx, this.tileLandingEvaluator);
      return;
    }

    if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
      showSpeechBubble(`${player.name} is choosing a flight destination...`, 3500);
      return;
    }

    gameState.phase = 'WORLD_TOUR';
    setFlightModeHighlights(true);
    document.getElementById('world-tour-banner')?.classList.remove('hidden');
    document.getElementById('world-tour-banner')?.classList.add('flex');
    showSpeechBubble('Click any tile to fly there!', 4000);
    updateRollButtonsUI(isHumanTurnActionable());
  }
}
