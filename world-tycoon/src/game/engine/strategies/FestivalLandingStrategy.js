/**
 * game/engine/strategies/FestivalLandingStrategy.js
 * Strategy for landing on World Festival tile.
 * Collects accumulated pot and triggers 2x festival boost on an owned property.
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { BOARD_TILES } from '../../data.js';
import { gameState } from '../../state.js';
import { fmtMoney } from '../../utils.js';
import { playSFX } from '../../audio.js';
import { getTileWorldPosition } from '../../../three/board/coords.js';
import { refreshTileTextureAndBuildings } from '../../../three/scene.js';
import { renderCornerHUDs, spawnFloatingCashOnHUD, logEvent, setPlayerPortraitMood } from '../../../ui/hud.js';
import { animateFestivalPotGoldenRain } from '../../../ui/anim.js';

export class FestivalLandingStrategy extends ITileLandingStrategy {
  async execute(context) {
    const { playerIdx, player, isDoubles } = context;

    if (gameState.festivalPot > 0) {
      const jackpot = gameState.festivalPot;
      player.cash += jackpot;
      gameState.festivalPot = 0;

      playSFX('cash', 1.0, getTileWorldPosition(16));
      setPlayerPortraitMood(playerIdx, 'cheering', 4000);
      spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(jackpot)} Festival!`, true);
      animateFestivalPotGoldenRain(playerIdx);
      logEvent(`🎉 <strong>${player.name}</strong> won the <strong>${fmtMoney(jackpot)}</strong> Festival Jackpot!`);
    }

    const myCities = BOARD_TILES.filter(t => t.type === 'city' && gameState.properties[t.id]?.owner === playerIdx);
    if (myCities.length > 0) {
      const target = myCities[Math.floor(Math.random() * myCities.length)];
      gameState.properties[target.id].festivalBoost = true;
      refreshTileTextureAndBuildings(target.id);
      logEvent(`✨ <strong>${player.name}</strong> boosted <strong>${target.name}</strong> rent by 2×!`);
    }

    renderCornerHUDs();

    if (window.concludeActionPhase) {
      window.concludeActionPhase(isDoubles);
    }
  }
}
