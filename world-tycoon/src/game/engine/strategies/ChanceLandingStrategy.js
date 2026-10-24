/**
 * game/engine/strategies/ChanceLandingStrategy.js
 * Strategy for landing on Chance Fortune Wheel tile.
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { matchSettings } from '../../state.js';
import { showSpeechBubble } from '../../../three/scene.js';
import { openChanceWheelModal } from '../../../ui/modals.js';
import { networkState } from '../../../network/p2p.js';
import { executeAIChanceSpin } from '../chance.js';

function getGameDelay(ms) {
  const speed = matchSettings.gameSpeed || 1;
  return Math.max(30, Math.round(ms / speed));
}

export class ChanceLandingStrategy extends ITileLandingStrategy {
  async execute(context) {
    const { playerIdx, player, isDoubles } = context;

    if (player.isAI) {
      if (networkState.isMultiplayer && !networkState.isHost) {
        showSpeechBubble(`${player.name} is spinning Chance...`, 3000);
        return;
      }
      await executeAIChanceSpin(playerIdx, isDoubles, getGameDelay);
      return;
    }

    if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
      showSpeechBubble(`${player.name} is spinning Chance...`, 3000);
      return;
    }

    openChanceWheelModal(isDoubles);
  }
}
