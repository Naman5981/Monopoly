/**
 * game/engine/strategies/IslandLandingStrategy.js
 * Strategy for landing on the Tropical Island detention tile.
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { showSpeechBubble } from '../../../three/scene.js';
import { renderCornerHUDs, logEvent, setPlayerPortraitMood } from '../../../ui/hud.js';
import { animateIslandDetentionBars } from '../../../ui/anim.js';

export class IslandLandingStrategy extends ITileLandingStrategy {
  async execute(context) {
    const { playerIdx, player } = context;

    player.inIsland = true;
    player.islandTurns = 0;

    setPlayerPortraitMood(playerIdx, 'shocked', 3500);
    showSpeechBubble('Detained on Tropical Island! 🏝️', 2200);
    logEvent(`🏝️ <strong>${player.name}</strong> landed on the <strong>ISLAND</strong>!`);

    renderCornerHUDs();
    animateIslandDetentionBars(playerIdx);

    // Island ends the turn immediately regardless of previous doubles
    if (window.concludeActionPhase) {
      window.concludeActionPhase(false);
    }
  }
}
