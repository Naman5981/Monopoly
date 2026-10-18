/**
 * game/engine/strategies/TaxLandingStrategy.js
 * Strategy for luxury tax tile landing.
 * Implements Single Responsibility (SRP).
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { gameState } from '../../state.js';
import { fmtMoney } from '../../utils.js';
import { checkAndHandleNegativeCash } from '../../rules.js';
import { refreshTileTextureAndBuildings, triggerTokenHurtAnimation } from '../../../three/scene.js';
import { renderCornerHUDs, spawnFloatingCashOnHUD, logEvent, setPlayerPortraitMood } from '../../../ui/hud.js';

export class TaxLandingStrategy extends ITileLandingStrategy {
  async execute(context) {
    const { playerIdx, player, tile, isDoubles } = context;
    const taxAmt = tile.amount || 250000;

    player.cash -= taxAmt;
    gameState.festivalPot += taxAmt;

    setPlayerPortraitMood(playerIdx, 'crying', 3000);
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(taxAmt)} Tax`, false);
    triggerTokenHurtAnimation(playerIdx);
    logEvent(`🏛️ <strong>${player.name}</strong> paid <strong>${fmtMoney(taxAmt)}</strong> Luxury Tax into the Festival Pool.`);

    checkAndHandleNegativeCash(playerIdx, {
      onRefreshTile: refreshTileTextureAndBuildings,
      onLog: logEvent
    });

    renderCornerHUDs();

    if (window.concludeActionPhase) {
      window.concludeActionPhase(isDoubles);
    }
  }
}
