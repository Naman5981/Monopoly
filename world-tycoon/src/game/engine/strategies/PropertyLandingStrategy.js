/**
 * game/engine/strategies/PropertyLandingStrategy.js
 * Strategy for landing on property tiles (Cities and Resorts).
 * Handles unowned acquisitions, rent transfers, debt liquidations, hostile buyouts, and upgrades.
 * Implements Single Responsibility (SRP) and Open/Closed Principle (OCP).
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { BOARD_TILES } from '../../data.js';
import { gameState, matchSettings } from '../../state.js';
import { fmtMoney } from '../../utils.js';
import { playSFX } from '../../audio.js';
import { getTileWorldPosition } from '../../../three/board/coords.js';
import { calculateTileRent } from '../../rules.js';
import {
  refreshTileTextureAndBuildings,
  showSpeechBubble,
  spawnShatterDebris,
  triggerBoardShockwave
} from '../../../three/scene.js';
import {
  renderCornerHUDs,
  spawnFloatingCashOnHUD,
  logEvent,
  animateRentTransferOnHUD,
  setStatusPill,
  clearThinkingState
} from '../../../ui/hud.js';
import {
  openBuyCityModal,
  openBuyoutCityModal,
  calculateBuyoutCost,
  openSellCitiesModal,
  calculatePropertySaleValue,
  openUpgradeCityModal,
  upgradeCityLevel,
  checkAndTriggerMonopoly
} from '../../../ui/modals.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../../network/p2p.js';
import { animateBankruptcyQuake } from '../../../ui/anim.js';

function getGameDelay(ms) {
  const speed = matchSettings.gameSpeed || 1;
  return Math.max(30, Math.round(ms / speed));
}

export class PropertyLandingStrategy extends ITileLandingStrategy {
  async execute(context) {
    const { playerIdx, player, tile, isDoubles } = context;
    const st = gameState.properties[tile.id];

    if (!st || st.owner === null) {
      await this.handleUnownedProperty(playerIdx, player, tile, isDoubles);
    } else if (st.owner !== playerIdx) {
      await this.handleOpponentProperty(playerIdx, player, tile, st, isDoubles);
    } else {
      await this.handleSelfOwnedProperty(playerIdx, player, tile, st, isDoubles);
    }
  }

  async handleUnownedProperty(playerIdx, player, tile, isDoubles) {
    if (player.isAI) {
      await this.handleAICityDecision(playerIdx, tile, isDoubles);
      return;
    }

    if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
      showSpeechBubble(`${player.name} is deciding on ${tile.name}...`, 3000);
      return;
    }

    openBuyCityModal(tile, isDoubles);
  }

  async handleOpponentProperty(playerIdx, player, tile, st, isDoubles) {
    const rent = calculateTileRent(tile.id);
    const owner = gameState.players[st.owner];

    // Insolvency check: Does player need to liquidate properties to pay rent?
    if (player.cash < rent) {
      const owned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === playerIdx);

      if (owned.length > 0) {
        if (player.isAI) {
          await this.handleAIDebtorLiquidation(playerIdx, player, owner, rent, isDoubles);
          return;
        } else {
          if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
            showSpeechBubble(`${player.name} is selling cities to pay rent...`, 3000);
            logEvent(`💸 <strong>${player.name}</strong> is selling cities to pay rent to <strong>${owner.name}</strong>.`);
            return;
          }
          logEvent(`💸 <strong>${player.name}</strong> owes <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong> and must liquidate properties.`);
          openSellCitiesModal(tile, rent, st.owner, isDoubles);
          return;
        }
      } else {
        // Bankruptcy: Debtor owns 0 properties and cash < rent
        this.executeBankruptcy(playerIdx, player, owner, rent, tile, isDoubles);
        return;
      }
    }

    // Solvency confirmed: Transfer rent
    showSpeechBubble(`Ouch! Paying ${fmtMoney(rent)} rent to ${owner.name}!`, 3000);
    logEvent(`💸 <strong>${player.name}</strong> landed on <strong>${tile.name}</strong> and transferred <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);
    await animateRentTransferOnHUD(playerIdx, st.owner, rent);

    player.cash -= rent;
    owner.cash += rent;
    renderCornerHUDs();

    // Hostile Buyout check
    const buyoutCost = calculateBuyoutCost(tile, st);
    if (buyoutCost > 0 && player.cash >= buyoutCost) {
      if (player.isAI) {
        await this.handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles);
        return;
      } else {
        if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
          showSpeechBubble(`${player.name} is considering a buyout of ${tile.name}...`, 3000);
          return;
        }
        openBuyoutCityModal(tile, isDoubles);
        return;
      }
    }

    if (window.concludeActionPhase) {
      window.concludeActionPhase(isDoubles);
    }
  }

  async handleSelfOwnedProperty(playerIdx, player, tile, st, isDoubles) {
    if (tile.type === 'city') {
      if (st.level >= 4) {
        const rent = calculateTileRent(tile.id);
        showSpeechBubble(`Inspecting your maxed Skyscraper in ${tile.name}! 👑🏆`, 2200);
        logEvent(`👑 <strong>${player.name}</strong> visited their maxed <strong>Skyscraper</strong> in <strong>${tile.name}</strong> (Generating <strong>${fmtMoney(rent)}</strong> rent).`);
        if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
      } else if (player.isAI) {
        await this.handleAIOwnedCityLanding(playerIdx, tile, isDoubles);
      } else {
        if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
          showSpeechBubble(`${player.name} is checking their estate in ${tile.name}...`, 3000);
          return;
        }
        openUpgradeCityModal(tile, isDoubles);
      }
    } else {
      showSpeechBubble(`Relaxing at your luxury resort in ${tile.name}! 🌴`, 2200);
      logEvent(`🌴 <strong>${player.name}</strong> visited their own resort in <strong>${tile.name}</strong>.`);
      if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
    }
  }

  async handleAIDebtorLiquidation(playerIdx, player, owner, rent, isDoubles) {
    setStatusPill(`💸 <strong>${player.name}</strong> is selling cities to pay rent to <strong>${owner.name}</strong>...`, { isThinking: true, playerIdx });
    logEvent(`💸 <strong>${player.name}</strong> is selling properties to pay <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);
    await new Promise(r => setTimeout(r, getGameDelay(700)));

    while (player.cash < rent) {
      const currentOwned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === playerIdx);
      if (currentOwned.length === 0) break;
      currentOwned.sort((a, b) => {
        const vA = calculatePropertySaleValue(a, gameState.properties[a.id]);
        const vB = calculatePropertySaleValue(b, gameState.properties[b.id]);
        return vA - vB;
      });
      const cheapest = currentOwned[0];
      const cSt = gameState.properties[cheapest.id];
      const sVal = calculatePropertySaleValue(cheapest, cSt);
      cSt.owner = null;
      cSt.level = 0;
      player.cash += sVal;
      refreshTileTextureAndBuildings(cheapest.id);
      logEvent(`⚡ <strong>${player.name}</strong> sold <strong>${cheapest.name}</strong> for <strong>${fmtMoney(sVal)}</strong> to pay rent.`);
    }

    renderCornerHUDs();
    clearThinkingState();

    if (player.cash >= rent) {
      await animateRentTransferOnHUD(playerIdx, owner.id !== undefined ? owner.id : gameState.properties[cheapest?.id]?.owner, rent);
      player.cash -= rent;
      owner.cash += rent;
      logEvent(`💸 <strong>${player.name}</strong> settled <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);
      renderCornerHUDs();
      if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
    } else {
      this.executeBankruptcy(playerIdx, player, owner, rent, null, isDoubles);
    }
  }

  executeBankruptcy(playerIdx, player, owner, rent, tile, isDoubles) {
    const paid = Math.max(0, player.cash);
    player.cash = 0;
    owner.cash += paid;
    player.bankrupt = true;

    playSFX('bankrupt', 1.0, tile ? getTileWorldPosition(tile.id) : null);
    showSpeechBubble(`Bankrupt! 💥`, 2500);
    logEvent(`💥 <strong>${player.name}</strong> has no cities to sell, transferred all remaining <strong>${fmtMoney(paid)}</strong> to <strong>${owner.name}</strong> for <strong>${fmtMoney(rent)}</strong> rent. <strong>BANKRUPT!</strong>`);

    renderCornerHUDs();
    animateBankruptcyQuake(playerIdx);
    spawnShatterDebris(0, 0, 0xef4444, 36);
    triggerBoardShockwave(0, 0, 26, 32);

    if (window.concludeActionPhase) {
      window.concludeActionPhase(isDoubles);
    }
  }

  async handleAICityDecision(playerIdx, tile, isDoubles) {
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
    const player = gameState.players[playerIdx];
    if (!player) return;

    setStatusPill(`🤔 <strong>${player.name}</strong> is deciding whether to buy <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
    await new Promise(r => setTimeout(r, getGameDelay(650)));
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

    if (player.cash >= tile.price + 120000) {
      player.cash -= tile.price;
      gameState.properties[tile.id].owner = playerIdx;
      playSFX('build', 1.0, getTileWorldPosition(tile.id));
      spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(tile.price)}`, false);
      showSpeechBubble(`Bought ${tile.name}!`, 1800);
      logEvent(`🤖 <strong>${player.name}</strong> bought <strong>${tile.name}</strong> for <strong>${fmtMoney(tile.price)}</strong>.`);
      refreshTileTextureAndBuildings(tile.id);
      renderCornerHUDs();
      if (tile.group) {
        checkAndTriggerMonopoly(playerIdx, tile.group);
      }
      if (networkState.isMultiplayer && networkState.isHost) {
        broadcastAction('ACTION_BUY_CITY', { playerIdx, tileId: tile.id });
        broadcastFullGameState();
      }
    } else {
      showSpeechBubble(`Passed on ${tile.name}`, 1500);
      logEvent(`⏭️ <strong>${player.name}</strong> passed on buying <strong>${tile.name}</strong>.`);
    }

    clearThinkingState();
    if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
  }

  async handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles) {
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
    const player = gameState.players[playerIdx];
    if (!player) return;

    setStatusPill(`🤔 <strong>${player.name}</strong> is weighing hostile buyout of <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
    await new Promise(r => setTimeout(r, getGameDelay(700)));
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

    const previousOwnerIdx = st.owner;
    const prevOwner = gameState.players[previousOwnerIdx];

    if (player.cash >= buyoutCost + 300000) {
      player.cash -= buyoutCost;
      prevOwner.cash += buyoutCost;
      st.owner = playerIdx;
      playSFX('build', 1.0, getTileWorldPosition(tile.id));
      spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(buyoutCost)} Buyout`, false);
      spawnFloatingCashOnHUD(previousOwnerIdx, `+${fmtMoney(buyoutCost)} Sold`, true);
      showSpeechBubble(`Hostile Buyout on ${tile.name}! 💰`, 2000);
      logEvent(`⚔️ <strong>${player.name}</strong> executed a hostile buyout on <strong>${tile.name}</strong> from <strong>${prevOwner.name}</strong> for <strong>${fmtMoney(buyoutCost)}</strong>.`);
      refreshTileTextureAndBuildings(tile.id);
      renderCornerHUDs();
      if (tile.group) {
        checkAndTriggerMonopoly(playerIdx, tile.group);
      }
      if (networkState.isMultiplayer && networkState.isHost) {
        broadcastAction('ACTION_BUYOUT_CITY', { playerIdx, tileId: tile.id, buyoutCost, previousOwnerIdx });
        broadcastFullGameState();
      }
    } else {
      showSpeechBubble(`Skipped buyout on ${tile.name}`, 1500);
      logEvent(`⏭️ <strong>${player.name}</strong> decided against buyout on <strong>${tile.name}</strong>.`);
    }

    clearThinkingState();
    if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
  }

  async handleAIOwnedCityLanding(playerIdx, tile, isDoubles) {
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
    const player = gameState.players[playerIdx];
    if (!player) return;
    const st = gameState.properties[tile.id];

    setStatusPill(`🤔 <strong>${player.name}</strong> is considering estate upgrades in <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
    await new Promise(r => setTimeout(r, getGameDelay(700)));
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

    if (st && st.level < 4 && player.cash >= tile.houseCost + 200000) {
      upgradeCityLevel(playerIdx, tile.id, 1);
      showSpeechBubble(`Upgraded ${tile.name}! 🏗️`, 1800);
      logEvent(`🏗️ <strong>${player.name}</strong> upgraded estate in <strong>${tile.name}</strong>.`);
      if (networkState.isMultiplayer && networkState.isHost) {
        broadcastAction('ACTION_UPGRADE_CITY', { playerIdx, tileId: tile.id, levelsToAdd: 1 });
        broadcastFullGameState();
      }
    } else {
      showSpeechBubble(`Relaxing in ${tile.name}`, 1500);
      logEvent(`✨ <strong>${player.name}</strong> passed on upgrading <strong>${tile.name}</strong>.`);
    }

    clearThinkingState();
    if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
  }
}
