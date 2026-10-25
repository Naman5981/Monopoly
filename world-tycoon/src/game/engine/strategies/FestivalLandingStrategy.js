/**
 * game/engine/strategies/FestivalLandingStrategy.js
 * Strategy for landing on World Festival tile.
 * Collects accumulated pot and allows player to select which owned property receives a 2x festival rent boost.
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { BOARD_TILES } from '../../data.js';
import { gameState, matchSettings } from '../../state.js';
import { fmtMoney } from '../../utils.js';
import { playSFX } from '../../audio.js';
import { calculateTileRent, calculateBaseTileRent } from '../../rules.js';
import { getTileWorldPosition } from '../../../three/board/coords.js';
import {
  refreshTileTextureAndBuildings,
  showSpeechBubble,
  setTileHighlightRing
} from '../../../three/scene.js';
import {
  renderCornerHUDs,
  spawnFloatingCashOnHUD,
  logEvent,
  setPlayerPortraitMood,
  setStatusPill
} from '../../../ui/hud.js';
import { animateFestivalPotGoldenRain } from '../../../ui/anim.js';
import { openFestivalBoostModal, showFestivalNoPropertiesModal } from '../../../ui/modals/festivalBoost.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../../network/p2p.js';

export class FestivalLandingStrategy extends ITileLandingStrategy {
  async execute(context) {
    const { playerIdx, player, isDoubles } = context;

    // 1. Award Accumulated Festival Jackpot if pool has funds
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

    // 2. Identify all properties owned by this player
    const myProperties = BOARD_TILES.filter(
      t => (t.type === 'city' || t.type === 'resort') && gameState.properties[t.id]?.owner === playerIdx
    );

    // If player owns zero properties:
    if (myProperties.length === 0) {
      logEvent(`🎪 <strong>${player.name}</strong> visited the Festival, but owns no properties to boost.`);
      renderCornerHUDs();
      const myLocalIdx = networkState.isMultiplayer ? networkState.localPlayerIdx : 0;
      const isLocalHuman = !player.isAI && (!networkState.isMultiplayer || playerIdx === myLocalIdx);

      if (isLocalHuman) {
        showFestivalNoPropertiesModal(player, isDoubles);
      } else {
        showSpeechBubble('No properties to host the Festival! 🎪', 2500);
        if (window.concludeActionPhase) {
          window.concludeActionPhase(isDoubles);
        }
      }
      return;
    }

    // 3. AI Automation: Bot strategically selects property with highest earning potential
    if (player.isAI) {
      if (networkState.isMultiplayer && !networkState.isHost) {
        showSpeechBubble(`Waiting for ${player.name} to select Festival city...`, 2500);
        return;
      }
      setStatusPill(`🤔 <strong>${player.name}</strong> is selecting a city to host the Festival...`, { isThinking: true, playerIdx });
      await new Promise(r => setTimeout(r, Math.max(300, Math.round(850 / (matchSettings?.gameSpeed || 1)))));

      // Sort properties by highest base earning potential
      const pool = [...myProperties].sort((a, b) => calculateBaseTileRent(b.id) - calculateBaseTileRent(a.id));
      const target = pool[0];

      // Restore any previous city's festival boost across the board (no player constraint)
      let prevHostTile = null;
      let prevHostOwner = null;
      for (const bt of BOARD_TILES) {
        if (bt.id !== target.id && gameState.properties[bt.id]?.festivalBoost) {
          prevHostTile = bt;
          const prevOwnerIdx = gameState.properties[bt.id].owner;
          prevHostOwner = (prevOwnerIdx !== null && gameState.players) ? gameState.players[prevOwnerIdx] : null;
          gameState.properties[bt.id].festivalBoost = false;
          refreshTileTextureAndBuildings(bt.id);
        }
      }

      const wasAlreadyBoosted = Boolean(gameState.properties[target.id].festivalBoost);
      gameState.properties[target.id].festivalBoost = true;
      refreshTileTextureAndBuildings(target.id);

      const targetPos = getTileWorldPosition(target.id);
      playSFX('win', 1.0, targetPos);
      setTileHighlightRing(target.id, true);
      setTimeout(() => setTileHighlightRing(target.id, false), 2200);

      const newRent = calculateTileRent(target.id);
      if (prevHostTile) {
        const prevOwnerText = prevHostOwner ? ` (${prevHostOwner.name})` : '';
        logEvent(`🎉 <strong>${player.name}</strong> moved the World Festival to <strong>${target.name}</strong>! Rent boosted 2× to <strong>${fmtMoney(newRent)}</strong>, and <strong>${prevHostTile.name}</strong>${prevOwnerText} rent restored to normal.`);
      } else if (wasAlreadyBoosted) {
        logEvent(`🎉 <strong>${player.name}</strong> re-confirmed <strong>${target.name}</strong> as World Festival host! Rent remains boosted 2× at <strong>${fmtMoney(newRent)}</strong>.`);
      } else {
        logEvent(`🎉 <strong>${player.name}</strong> selected <strong>${target.name}</strong> to host the World Festival! Rent boosted 2× to <strong>${fmtMoney(newRent)}</strong>!`);
      }
      showSpeechBubble(`Boosted ${target.name} (2× Rent)! ✨`, 2200);
      renderCornerHUDs();

      if (networkState.isMultiplayer && networkState.isHost) {
        broadcastAction('ACTION_FESTIVAL_BOOST', { playerIdx, tileId: target.id });
        broadcastFullGameState();
      }

      if (window.concludeActionPhase) {
        window.concludeActionPhase(isDoubles);
      }
      return;
    }

    // 4. Remote Human Player in Multiplayer: Host & peers wait for guest's selection
    const myLocalIdx = networkState.isMultiplayer ? networkState.localPlayerIdx : 0;
    if (networkState.isMultiplayer && playerIdx !== myLocalIdx) {
      showSpeechBubble(`${player.name} is choosing a city to host the Festival...`, 3500);
      setStatusPill(`Waiting for <strong>${player.name}</strong> to select a Festival city...`, { isThinking: true, playerIdx });
      renderCornerHUDs();
      return;
    }

    // 5. Local Human Player: Display interactive Festival Boost selection modal
    renderCornerHUDs();
    openFestivalBoostModal(myProperties, isDoubles, playerIdx);
  }
}
