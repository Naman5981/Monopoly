/**
 * game/engine/strategies/StartLandingStrategy.js
 * Strategy for landing directly onto the START tile.
 * Awards +400K Super Bonus.
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { playSFX } from '../../audio.js';
import { getTileWorldPosition } from '../../../three/board/coords.js';
import { showSpeechBubble } from '../../../three/scene.js';
import { spawnAnimatedReaction } from '../../../three/effects.js';
import { renderCornerHUDs, spawnFloatingCashOnHUD, logEvent, setPlayerPortraitMood } from '../../../ui/hud.js';

export class StartLandingStrategy extends ITileLandingStrategy {
  async execute(context) {
    const { playerIdx, player, isDoubles } = context;

    player.cash += 400000;
    setPlayerPortraitMood(playerIdx, 'smug', 3500);
    playSFX('cash', 1.0, getTileWorldPosition(0));
    spawnAnimatedReaction('cash');
    spawnFloatingCashOnHUD(playerIdx, '+400K LANDED START!', true);
    showSpeechBubble('Landed on START! +400K Super Bonus! 🚩', 2800);
    logEvent(`🚩 <strong>${player.name}</strong> landed directly on <strong>START</strong> and collected <strong>400K</strong> super bonus!`);

    renderCornerHUDs();

    if (window.concludeActionPhase) {
      window.concludeActionPhase(isDoubles);
    }
  }
}
