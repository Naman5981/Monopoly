/**
 * game/engine/landings.js
 * Board tile landing evaluation: unowned purchases, rent payments, hostile buyouts, upgrades, tax, and events.
 */

import { BOARD_TILES } from '../data.js';
import { gameState, matchSettings, isHumanTurnActionable } from '../state.js';
import { fmtMoney } from '../utils.js';
import { playSFX } from '../audio.js';
import { getTileWorldPosition } from '../../three/board/coords.js';
import { calculateTileRent, checkAndHandleNegativeCash } from '../rules.js';
import {
  refreshTileTextureAndBuildings,
  triggerTokenHurtAnimation,
  showSpeechBubble,
  setFlightModeHighlights,
  spawnShatterDebris,
  spawnGoldCoinShower,
  triggerBoardShockwave
} from '../../three/scene.js';
import {
  renderCornerHUDs,
  spawnFloatingCashOnHUD,
  logEvent,
  animateRentTransferOnHUD,
  setStatusPill,
  clearThinkingState,
  updateRollButtonsUI,
  setPlayerPortraitMood
} from '../../ui/hud.js';
import {
  openBuyCityModal,
  openBuyoutCityModal,
  calculateBuyoutCost,
  openSellCitiesModal,
  calculatePropertySaleValue,
  openUpgradeCityModal,
  openChanceWheelModal,
  upgradeCityLevel,
  checkAndTriggerMonopoly
} from '../../ui/modals.js';
import { spawnAnimatedReaction } from '../../three/effects.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../network/p2p.js';
import {
  animateBankruptcyQuake,
  animateIslandDetentionBars,
  animateFestivalPotGoldenRain
} from '../../ui/anim.js';
import { executeWorldTourFlight } from './flight.js';
import { executeAIChanceSpin } from './chance.js';

function getGameDelay(ms) {
  const speed = matchSettings.gameSpeed || 1;
  return Math.max(30, Math.round(ms / speed));
}

export async function evaluateTileLanding(playerIdx, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  gameState.upgradesThisVisit = 0;
  const p = gameState.players[playerIdx];
  if (!p) return;
  const tile = BOARD_TILES[p.position];
  if (!tile) return;
  const st = gameState.properties[tile.id];

  if (tile.type === 'city' || tile.type === 'resort') {
    if (!st || st.owner === null) {
      if (p.isAI) {
        await handleAICityDecision(playerIdx, tile, isDoubles);
        return;
      } else {
        if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
          showSpeechBubble(`${p.name} is deciding on ${tile.name}...`, 3000);
          return;
        }
        openBuyCityModal(tile, isDoubles);
        return;
      }
    } else if (st.owner !== playerIdx) {
      const rent = calculateTileRent(tile.id);
      const owner = gameState.players[st.owner];

      // Check if player has enough cash to pay rent
      if (p.cash < rent) {
        const owned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === playerIdx);

        if (owned.length > 0) {
          // Debtor owns cities: MUST liquidate cities to pay rent
          if (p.isAI) {
            setStatusPill(`💸 <strong>${p.name}</strong> is selling cities to pay rent to <strong>${owner.name}</strong>...`, { isThinking: true, playerIdx });
            logEvent(`💸 <strong>${p.name}</strong> is selling properties to pay <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);
            await new Promise(r => setTimeout(r, getGameDelay(700)));

            // AI liquidates cheapest cities until cash >= rent
            while (p.cash < rent) {
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
              p.cash += sVal;
              refreshTileTextureAndBuildings(cheapest.id);
              logEvent(`⚡ <strong>${p.name}</strong> sold <strong>${cheapest.name}</strong> for <strong>${fmtMoney(sVal)}</strong> to pay rent.`);
            }
            renderCornerHUDs();
            clearThinkingState();

            // After AI liquidation, pay rent or handle strike
            if (p.cash >= rent) {
              await animateRentTransferOnHUD(playerIdx, st.owner, rent);
              p.cash -= rent;
              owner.cash += rent;
              logEvent(`💸 <strong>${p.name}</strong> settled <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);
              renderCornerHUDs();
              if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
              return;
            } else {
              // Liquidated all cities but still not enough money for rent -> transfer all money to owner and bankrupt
              const paid = Math.max(0, p.cash);
              p.cash = 0;
              owner.cash += paid;
              p.bankrupt = true;
              playSFX('bankrupt', 1.0, getTileWorldPosition(tile.id));
              logEvent(`💥 <strong>${p.name}</strong> sold all cities, paid remaining <strong>${fmtMoney(paid)}</strong> to <strong>${owner.name}</strong>, but still cannot afford <strong>${fmtMoney(rent)}</strong> rent. <strong>BANKRUPT!</strong>`);
              renderCornerHUDs();
              animateBankruptcyQuake(playerIdx);
              spawnShatterDebris(0, 0, 0xef4444, 36);
              triggerBoardShockwave(0, 0, 26, 32);
              if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
              return;
            }
          } else {
            // Human player:
            if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
              // Peer is selling cities
              showSpeechBubble(`${p.name} is selling cities to pay rent...`, 3000);
              logEvent(`💸 <strong>${p.name}</strong> is selling cities to pay rent to <strong>${owner.name}</strong>.`);
              return;
            }
            // Local human debtor: Only this player sees modal
            logEvent(`💸 <strong>${p.name}</strong> owes <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong> and must liquidate properties.`);
            openSellCitiesModal(tile, rent, st.owner, isDoubles);
            return;
          }
        } else {
          // Debtor owns 0 cities and cash < rent -> give all money to owner, then bankrupt immediately!
          const paid = Math.max(0, p.cash);
          p.cash = 0;
          owner.cash += paid;
          p.bankrupt = true;
          playSFX('bankrupt', 1.0, getTileWorldPosition(tile.id));
          showSpeechBubble(`Bankrupt! 💥`, 2500);
          logEvent(`💥 <strong>${p.name}</strong> has no cities to sell, transferred all remaining <strong>${fmtMoney(paid)}</strong> to <strong>${owner.name}</strong> for <strong>${fmtMoney(rent)}</strong> rent. <strong>BANKRUPT!</strong>`);
          renderCornerHUDs();
          animateBankruptcyQuake(playerIdx);
          spawnShatterDebris(0, 0, 0xef4444, 36);
          triggerBoardShockwave(0, 0, 26, 32);
          if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
          return;
        }
      }

      // Solvency confirmed: Player has cash >= rent
      showSpeechBubble(`Ouch! Paying ${fmtMoney(rent)} rent to ${owner.name}!`, 3000);
      logEvent(`💸 <strong>${p.name}</strong> landed on <strong>${tile.name}</strong> and transferred <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);

      // Visual animated HUD deduction, streaming bills flight, and receipt
      await animateRentTransferOnHUD(playerIdx, st.owner, rent);

      p.cash -= rent;
      owner.cash += rent;

      renderCornerHUDs();

      // Check Hostile Buyout Eligibility
      const buyoutCost = calculateBuyoutCost(tile, st);
      if (buyoutCost > 0 && p.cash >= buyoutCost) {
        if (p.isAI) {
          await handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles);
          return;
        } else {
          if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
            showSpeechBubble(`${p.name} is considering a buyout of ${tile.name}...`, 3000);
            return;
          }
          openBuyoutCityModal(tile, isDoubles);
          return;
        }
      }
    } else if (st.owner === playerIdx) {
      if (tile.type === 'city') {
        if (st.level >= 4) {
          const rent = calculateTileRent(tile.id);
          showSpeechBubble(`Inspecting your maxed Skyscraper in ${tile.name}! 👑🏆`, 2200);
          logEvent(`👑 <strong>${p.name}</strong> visited their maxed <strong>Skyscraper</strong> in <strong>${tile.name}</strong> (Generating <strong>${fmtMoney(rent)}</strong> rent).`);
        } else if (p.isAI) {
          await handleAIOwnedCityLanding(playerIdx, tile, isDoubles);
          return;
        } else {
          if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
            showSpeechBubble(`${p.name} is checking their estate in ${tile.name}...`, 3000);
            return;
          }
          openUpgradeCityModal(tile, isDoubles);
          return;
        }
      } else {
        showSpeechBubble(`Relaxing at your luxury resort in ${tile.name}! 🌴`, 2200);
        logEvent(`🌴 <strong>${p.name}</strong> visited their own resort in <strong>${tile.name}</strong>.`);
      }
    }
  } else if (tile.type === 'chance') {
    if (p.isAI) {
      await executeAIChanceSpin(playerIdx, isDoubles, getGameDelay);
      return;
    } else {
      if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
        showSpeechBubble(`${p.name} is spinning Chance...`, 3000);
        return;
      }
      openChanceWheelModal(isDoubles);
      return;
    }
  } else if (tile.type === 'tax') {
    const taxAmt = tile.amount || 250000;
    p.cash -= taxAmt;
    gameState.festivalPot += taxAmt;
    setPlayerPortraitMood(playerIdx, 'crying', 3000);
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(taxAmt)} Tax`, false);
    triggerTokenHurtAnimation(playerIdx);
    showSpeechBubble(`Paid ${fmtMoney(taxAmt)} Tax!`, 2000);
    logEvent(`🏛️ <strong>${p.name}</strong> paid <strong>${fmtMoney(taxAmt)}</strong> Luxury Tax into the Festival Pool.`);
    checkAndHandleNegativeCash(playerIdx, {
      onRefreshTile: refreshTileTextureAndBuildings,
      onLog: logEvent
    });
    renderCornerHUDs();
  } else if (tile.type === 'island') {
    p.inIsland = true;
    p.islandTurns = 0;
    setPlayerPortraitMood(playerIdx, 'shocked', 3500);
    showSpeechBubble('Detained on Tropical Island! 🏝️', 2200);
    logEvent(`🏝️ <strong>${p.name}</strong> landed on the <strong>ISLAND</strong>!`);
    renderCornerHUDs();
    animateIslandDetentionBars(playerIdx);
    if (window.concludeActionPhase) window.concludeActionPhase(false);
    return;
  } else if (tile.type === 'festival') {
    if (gameState.festivalPot > 0) {
      const jackpot = gameState.festivalPot;
      p.cash += jackpot;
      gameState.festivalPot = 0;
      playSFX('cash', 1.0, getTileWorldPosition(16));
      setPlayerPortraitMood(playerIdx, 'cheering', 4000);
      spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(jackpot)} Festival!`, true);
      animateFestivalPotGoldenRain(playerIdx);
      logEvent(`🎉 <strong>${p.name}</strong> won the <strong>${fmtMoney(jackpot)}</strong> Festival Jackpot!`);
    }
    const myCities = BOARD_TILES.filter(t => t.type === 'city' && gameState.properties[t.id]?.owner === playerIdx);
    if (myCities.length > 0) {
      const target = myCities[Math.floor(Math.random() * myCities.length)];
      gameState.properties[target.id].festivalBoost = true;
      refreshTileTextureAndBuildings(target.id);
      logEvent(`✨ <strong>${p.name}</strong> boosted <strong>${target.name}</strong> rent by 2×!`);
    }
    renderCornerHUDs();
  } else if (tile.type === 'worldtour') {
    if (p.isAI) {
      showSpeechBubble(`✈️ ${p.name} landed on World Tour! Planning flight...`, 2500);
      await new Promise(r => setTimeout(r, Math.max(200, Math.round(900 / (matchSettings.gameSpeed || 1)))));
      const unowned = BOARD_TILES.filter(t => (t.type === 'city' || t.type === 'resort') && !gameState.properties[t.id]?.owner);
      const dest = unowned.length > 0 ? unowned[Math.floor(Math.random() * unowned.length)].id : 0;
      await executeWorldTourFlight(dest, false, playerIdx, evaluateTileLanding);
      return;
    } else {
      if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
        showSpeechBubble(`${p.name} is choosing a flight destination...`, 3500);
        return;
      }
      gameState.phase = 'WORLD_TOUR';
      setFlightModeHighlights(true);
      document.getElementById('world-tour-banner')?.classList.remove('hidden');
      document.getElementById('world-tour-banner')?.classList.add('flex');
      showSpeechBubble('Click any tile to fly there!', 4000);
      updateRollButtonsUI(isHumanTurnActionable());
      return;
    }
  } else if (tile.type === 'start') {
    p.cash += 400000;
    setPlayerPortraitMood(playerIdx, 'smug', 3500);
    playSFX('cash', 1.0, getTileWorldPosition(0));
    spawnAnimatedReaction('cash');
    spawnFloatingCashOnHUD(playerIdx, '+400K LANDED START!', true);
    showSpeechBubble('Landed on START! +400K Super Bonus! 🚩', 2800);
    logEvent(`🚩 <strong>${p.name}</strong> landed directly on <strong>START</strong> and collected <strong>400K</strong> super bonus!`);
    renderCornerHUDs();
  }

  if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
}

export async function handleAICityDecision(playerIdx, tile, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  const p = gameState.players[playerIdx];
  if (!p) return;
  setStatusPill(`🤔 <strong>${p.name}</strong> is deciding whether to buy <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
  await new Promise(r => setTimeout(r, getGameDelay(650)));
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

  if (p.cash >= tile.price + 120000) {
    p.cash -= tile.price;
    gameState.properties[tile.id].owner = playerIdx;
    playSFX('build', 1.0, getTileWorldPosition(tile.id));
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(tile.price)}`, false);
    showSpeechBubble(`Bought ${tile.name}!`, 1800);
    logEvent(`🤖 <strong>${p.name}</strong> bought <strong>${tile.name}</strong> for <strong>${fmtMoney(tile.price)}</strong>.`);
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
    logEvent(`⏭️ <strong>${p.name}</strong> passed on buying <strong>${tile.name}</strong>.`);
  }
  clearThinkingState();
  if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
}

export async function handleAIOwnedCityLanding(playerIdx, tile, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  const p = gameState.players[playerIdx];
  if (!p) return;
  const st = gameState.properties[tile.id];
  setStatusPill(`🤔 <strong>${p.name}</strong> is considering estate upgrades in <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
  await new Promise(r => setTimeout(r, getGameDelay(700)));
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

  if (st && st.level < 4 && p.cash >= tile.houseCost + 200000) {
    upgradeCityLevel(tile.id, true);
    showSpeechBubble(`Upgraded ${tile.name} to Level ${st.level}! 🏗️`, 2200);
    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastAction('ACTION_UPGRADE_CITY', { playerIdx, tileId: tile.id });
      broadcastFullGameState();
    }
  } else {
    showSpeechBubble(`Inspecting ${tile.name}! 👑`, 1800);
  }
  clearThinkingState();
  if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
}

export async function handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  const p = gameState.players[playerIdx];
  if (!p) return;
  const prevOwnerIdx = st.owner;
  const prevOwner = gameState.players[prevOwnerIdx];

  setStatusPill(`🤔 <strong>${p.name}</strong> is considering buying out <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
  await new Promise(r => setTimeout(r, getGameDelay(750)));
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

  if (p.cash >= buyoutCost + 200000) {
    p.cash -= buyoutCost;
    if (prevOwner) {
      prevOwner.cash += buyoutCost;
      spawnFloatingCashOnHUD(prevOwnerIdx, `+${fmtMoney(buyoutCost)}`, true);
    }
    st.owner = playerIdx;
    playSFX('build', 1.0, getTileWorldPosition(tile.id));
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(buyoutCost)}`, false);
    showSpeechBubble(`Bought out ${tile.name}! ⚔️`, 2200);
    logEvent(`⚔️ <strong>${p.name}</strong> executed a hostile buyout of <strong>${tile.name}</strong> from <strong>${prevOwner ? prevOwner.name : 'Opponent'}</strong> for <strong>${fmtMoney(buyoutCost)}</strong>!`);
    refreshTileTextureAndBuildings(tile.id);
    renderCornerHUDs();
    if (tile.group) {
      checkAndTriggerMonopoly(playerIdx, tile.group);
    }
    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastAction('ACTION_BUYOUT_CITY', { playerIdx, tileId: tile.id, prevOwnerIdx, buyoutCost });
      broadcastFullGameState();
    }
  } else {
    showSpeechBubble(`Passed on buyout for ${tile.name}`, 1500);
  }
  clearThinkingState();
  if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
}
