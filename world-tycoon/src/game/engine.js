/**
 * game/engine.js
 * Turn engine: dice tumbling, step-by-step hopping, tile landings, AI turns, World Tour.
 */

import { BOARD_TILES } from './data.js';
import { gameState, displayedCash, isHumanTurnActionable, resetGameStateForNewMatch, lobbyPlayerCount, matchSettings, debugState, localPlayerIdx } from './state.js';
import { fmtMoney } from './utils.js';
import { playSFX } from './audio.js';
import { calculateTileRent, checkAndHandleNegativeCash, checkVictoryConditions, calculatePlayerNetWorth } from './rules.js';
import {
  animate3DDiceTumble,
  hopPlayerStepAnimation,
  resetTokenAfterHop,
  updatePlayerTokenPositions3D,
  triggerTokenHurtAnimation,
  showSpeechBubble,
  refreshTileTextureAndBuildings,
  getTileWorldPosition,
  spawnAllPlayerTokens3D,
  setTileHighlightRing,
  setFlightModeHighlights,
  flyPlayerStepAnimation,
  flyPlayerDirectFlightAnimation,
  resetLocalCarAnimationClock
} from '../three/scene.js';
import {
  renderCornerHUDs,
  spawnFloatingCashOnHUD,
  updateRollButtonsUI,
  logEvent,
  showTurnLockToast,
  animateRentTransferOnHUD,
  setStatusPill,
  refreshActivePlayerTurnStatus,
  clearThinkingState
} from '../ui/hud.js';
import {
  openBuyCityModal,
  openBuyoutCityModal,
  calculateBuyoutCost,
  openSellCitiesModal,
  calculatePropertySaleValue,
  openUpgradeCityModal,
  openChanceWheelModal,
  registerEngineCallbacks,
  upgradeCityLevel,
  openMonopolyCelebrationModal,
  checkAndTriggerMonopoly,
  showVictoryModal,
  closeAllGameModals,
  showIncomingTradeOfferModal
} from '../ui/modals.js';
import { spawnAnimatedReaction, fireConfettiBurst, stopVictoryCelebration } from '../three/effects.js';
import { networkState, broadcastAction, registerNetworkCallbacks, broadcastReturnToLobby } from '../network/p2p.js';
import { saveCurrentMatchToStorage, clearSavedMatch } from './persistence.js';
import {
  animateDoublesBurstBanner,
  animateActiveTurnSwitch,
  animateBankruptcyQuake,
  animateBoardingPassZoom,
  animateFestivalPotGoldenRain,
  animateIslandDetentionBars,
  animateDiceSlingshotPullback,
  animateGoSalaryStream,
  animateIslandJailbreak
} from '../ui/anim.js';

let autoEndTurnTimer = null;
let aiRollTimer = null;

export function cancelAllGameTimers() {
  if (autoEndTurnTimer) {
    clearTimeout(autoEndTurnTimer);
    autoEndTurnTimer = null;
  }
  if (aiRollTimer) {
    clearTimeout(aiRollTimer);
    aiRollTimer = null;
  }
}

export function initEngine() {
  registerEngineCallbacks({
    updateUI: () => updateRollButtonsUI(isHumanTurnActionable()),
    spawnFloatingCash: spawnFloatingCashOnHUD,
    concludeActionPhase,
    applyChancePrize,
    startNewMatch,
    terminateMatchAndReturnToLobby
  });

  registerNetworkCallbacks({
    onStartGame: () => {
      startNewMatch();
    },
    onDiceRoll: async (playerIdx, d1, d2, total, isDoubles) => {
      gameState.currentPlayerIdx = playerIdx;
      await executePlayerRoll(d1, d2);
    },
    onBuyCity: (playerIdx, tileId) => {
      const tile = BOARD_TILES[tileId];
      const p = gameState.players[playerIdx];
      if (tile && p) {
        p.cash -= tile.price;
        gameState.properties[tileId].owner = playerIdx;
        playSFX('build');
        spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(tile.price)}`, false);
        logEvent(`🏙️ <strong>${p.name}</strong> bought <strong>${tile.name}</strong> for <strong>${fmtMoney(tile.price)}</strong>!`);
        refreshTileTextureAndBuildings(tileId);
        renderCornerHUDs();
        if (tile.group) {
          checkAndTriggerMonopoly(playerIdx, tile.group);
        }
        saveCurrentMatchToStorage();
      }
    },
    onMonopoly: (playerIdx, groupKey) => {
      openMonopolyCelebrationModal(playerIdx, groupKey);
    },
    onUpgradeCity: (playerIdx, tileId) => {
      const st = gameState.properties[tileId];
      const tile = BOARD_TILES[tileId];
      const p = gameState.players[playerIdx];
      if (st && tile && p) {
        p.cash -= tile.houseCost;
        st.level++;
        playSFX('build');
        spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(tile.houseCost)}`, false);
        logEvent(`🏗️ <strong>${p.name}</strong> upgraded <strong>${tile.name}</strong> to level ${st.level}!`);
        refreshTileTextureAndBuildings(tileId);
        renderCornerHUDs();
        saveCurrentMatchToStorage();
      }
    },
    onBuyoutCity: (playerIdx, tileId, prevOwnerIdx, buyoutCost) => {
      const st = gameState.properties[tileId];
      const buyer = gameState.players[playerIdx];
      const prevOwner = gameState.players[prevOwnerIdx];
      if (st && buyer) {
        buyer.cash -= buyoutCost;
        if (prevOwner) prevOwner.cash += buyoutCost;
        st.owner = playerIdx;
        playSFX('build');
        spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(buyoutCost)}`, false);
        if (prevOwner) spawnFloatingCashOnHUD(prevOwnerIdx, `+${fmtMoney(buyoutCost)}`, true);
        logEvent(`⚔️ <strong>${buyer.name}</strong> bought out <strong>${BOARD_TILES[tileId]?.name || 'City'}</strong> from <strong>${prevOwner ? prevOwner.name : 'Opponent'}</strong>!`);
        refreshTileTextureAndBuildings(tileId);
        renderCornerHUDs();
        saveCurrentMatchToStorage();
      }
    },
    onWorldTour: (playerIdx, destTileId) => {
      executeWorldTourFlight(destTileId, true, playerIdx);
    },
    onChancePrize: (playerIdx, prize, isDoubles) => {
      applyChancePrize(playerIdx, prize, isDoubles, true);
    },
    onEndTurn: (nextPlayerIdx) => {
      advanceTurn(true, nextPlayerIdx);
    }
  });
}

export function getGameDelay(ms) {
  const speed = matchSettings.gameSpeed || 1;
  return Math.max(30, Math.round(ms / speed));
}

export function recordNetWorthSnapshot() {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  if (!gameState.netWorthHistory) gameState.netWorthHistory = [];
  const turnNum = gameState.netWorthHistory.length + 1;
  const values = gameState.players.map((p, idx) => calculatePlayerNetWorth(p.id !== undefined ? p.id : idx));
  gameState.netWorthHistory.push({
    turn: turnNum,
    time: `${turnNum}`,
    values
  });
}

export function startNewMatch() {
  stopVictoryCelebration();
  closeAllGameModals();
  document.getElementById('modal-setup')?.classList.add('hidden');
  document.getElementById('modal-setup')?.classList.remove('flex');

  cancelAllGameTimers();
  clearSavedMatch();
  resetGameStateForNewMatch(lobbyPlayerCount);
  resetLocalCarAnimationClock();

  gameState.netWorthHistory = [];
  recordNetWorthSnapshot();

  BOARD_TILES.forEach(t => {
    refreshTileTextureAndBuildings(t.id);
  });

  spawnAllPlayerTokens3D();
  renderCornerHUDs();
  updateRollButtonsUI(isHumanTurnActionable());
  showSpeechBubble('Ready to roll!', 2500);
  const editionName = matchSettings.boardEdition === 'rajasthan' ? 'Rajasthan Edition' : 'World Cities Edition';
  logEvent(`🎲 <strong>New Match Started (${editionName})!</strong> All players begin with <strong>${fmtMoney(matchSettings.startingCash || 2000000)}</strong>.`);
  refreshActivePlayerTurnStatus();
  const statusWrap = document.getElementById('hud-bottom-status-wrap');
  if (statusWrap) statusWrap.classList.remove('hidden');
  saveCurrentMatchToStorage();

  const curP = gameState.players[gameState.currentPlayerIdx];
  if (curP && curP.isAI) {
    setStatusPill(`🤔 <strong>${curP.name}</strong> is rolling the dice...`, { isThinking: true, playerIdx: gameState.currentPlayerIdx });
    if (!networkState.isMultiplayer || networkState.isHost) {
      if (!debugState?.freezeAI) {
        aiRollTimer = setTimeout(() => {
          aiRollTimer = null;
          if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
          executePlayerRoll();
        }, getGameDelay(1500));
      }
    }
  }
}

export async function handleRollButtonClick() {
  const p = gameState.players[gameState.currentPlayerIdx];
  if (!p || p.isAI) return;

  const rollBtn = document.getElementById('btn-center-roll') || document.getElementById('btn-bottom-roll');
  if (rollBtn) animateDiceSlingshotPullback(rollBtn);

  if (networkState.isMultiplayer && gameState.currentPlayerIdx !== networkState.localPlayerIdx) {
    showTurnLockToast("Wait for your turn to roll!");
    return;
  }

  if (gameState.phase === 'END') {
    cancelAllGameTimers();
    advanceTurn();
    return;
  }
  if (gameState.phase !== 'ROLL') return;

  await executePlayerRoll();
}

export async function executePlayerRoll(forcedD1 = null, forcedD2 = null) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') return;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!p) return;
  gameState.phase = 'MOVING';
  updateRollButtonsUI(isHumanTurnActionable());

  const d1 = forcedD1 !== null ? forcedD1 : Math.floor(Math.random() * 6) + 1;
  const d2 = forcedD2 !== null ? forcedD2 : Math.floor(Math.random() * 6) + 1;
  const total = d1 + d2;
  const isDoubles = (d1 === d2);

  if (forcedD1 === null && networkState.isMultiplayer) {
    broadcastAction('ACTION_ROLL', {
      playerIdx: pIdx,
      d1,
      d2,
      total,
      isDoubles
    });
  }

  showSpeechBubble('Rolling dice...', 1600);
  await animate3DDiceTumble(d1, d2);
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

  showSpeechBubble(`Rolled ${d1} + ${d2} = ${total}${isDoubles ? ' (DOUBLES!)' : ''}`, 2200);
  logEvent(`🎲 <strong>${p.name}</strong> rolled <strong>${d1} + ${d2} = ${total}</strong>.`);

  if (isDoubles) {
    animateDoublesBurstBanner(p.name);
  }

  // Check Tropical Island Detention
  if (p.inIsland) {
    if (isDoubles) {
      p.inIsland = false;
      p.islandTurns = 0;
      animateIslandJailbreak(pIdx);
      logEvent(`🏝️ <strong>${p.name}</strong> rolled doubles and escaped the Island!`);
    } else {
      p.islandTurns++;
      if (p.islandTurns >= 3) {
        p.inIsland = false;
        p.islandTurns = 0;
        p.cash -= 150000;
        gameState.festivalPot += 150000;
        spawnFloatingCashOnHUD(pIdx, '-150K Bail', false);
        animateIslandJailbreak(pIdx);
        triggerTokenHurtAnimation(pIdx);
        logEvent(`🏝️ <strong>${p.name}</strong> paid 150K after 3 turns on the Island.`);
      } else {
        showSpeechBubble(`Stuck on Island (${p.islandTurns}/3)`, 2000);
        renderCornerHUDs();
        concludeActionPhase(false);
        return;
      }
    }
  }

  await hopPlayerSteps3D(pIdx, total);
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  await evaluateTileLanding(pIdx, isDoubles);
}

export async function hopPlayerSteps3D(playerIdx, steps) {
  const p = gameState.players[playerIdx];
  if (!p) return;

  for (let s = 0; s < steps; s++) {
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
    const startPos = getTileWorldPosition(p.position);
    p.position = (p.position + 1) % 32;
    const destTileId = p.position;
    const endPos = getTileWorldPosition(destTileId);

    playSFX('hop');
    await hopPlayerStepAnimation(playerIdx, startPos, endPos, s, steps, destTileId);
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

    // Passing START bonus (+300K) — only on intermediate passing, not final landing
    if (p.position === 0 && s < steps - 1) {
      p.cash += 300000;
      playSFX('cash');
      spawnAnimatedReaction('cash');
      spawnFloatingCashOnHUD(playerIdx, '+300K Passed START', true);
      animateGoSalaryStream(playerIdx, '+300K');
      logEvent(`🚩 <strong>${p.name}</strong> passed START and collected <strong>300K</strong> salary!`);
      renderCornerHUDs();
    }

    if (s < steps - 1) {
      // Fluid transition between intermediate hops without halting momentum
      await new Promise(r => setTimeout(r, Math.max(5, Math.round(15 / (matchSettings.gameSpeed || 1)))));
    } else {
      resetTokenAfterHop(playerIdx);
    }
  }

  await new Promise(r => setTimeout(r, Math.max(40, Math.round(220 / (matchSettings.gameSpeed || 1)))));
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  updatePlayerTokenPositions3D();
  setTimeout(() => setTileHighlightRing(0, false), 800);
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
              concludeActionPhase(isDoubles);
              return;
            } else {
              // Liquidated all cities but still not enough money for rent -> transfer all money to owner and bankrupt
              const paid = Math.max(0, p.cash);
              p.cash = 0;
              owner.cash += paid;
              p.bankrupt = true;
              playSFX('bankrupt');
              logEvent(`💥 <strong>${p.name}</strong> sold all cities, paid remaining <strong>${fmtMoney(paid)}</strong> to <strong>${owner.name}</strong>, but still cannot afford <strong>${fmtMoney(rent)}</strong> rent. <strong>BANKRUPT!</strong>`);
              renderCornerHUDs();
              animateBankruptcyQuake(playerIdx);
              concludeActionPhase(isDoubles);
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
          playSFX('bankrupt');
          showSpeechBubble(`Bankrupt! 💥`, 2500);
          logEvent(`💥 <strong>${p.name}</strong> has no cities to sell, transferred all remaining <strong>${fmtMoney(paid)}</strong> to <strong>${owner.name}</strong> for <strong>${fmtMoney(rent)}</strong> rent. <strong>BANKRUPT!</strong>`);
          renderCornerHUDs();
          animateBankruptcyQuake(playerIdx);
          concludeActionPhase(isDoubles);
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
      await executeAIChanceSpin(playerIdx, isDoubles);
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
    showSpeechBubble('Detained on Tropical Island! 🏝️', 2200);
    logEvent(`🏝️ <strong>${p.name}</strong> landed on the <strong>ISLAND</strong>!`);
    renderCornerHUDs();
    animateIslandDetentionBars(playerIdx);
    concludeActionPhase(false);
    return;
  } else if (tile.type === 'festival') {
    if (gameState.festivalPot > 0) {
      const jackpot = gameState.festivalPot;
      p.cash += jackpot;
      gameState.festivalPot = 0;
      playSFX('cash');
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
      await executeWorldTourFlight(dest, false, playerIdx);
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
    playSFX('cash');
    spawnAnimatedReaction('cash');
    spawnFloatingCashOnHUD(playerIdx, '+400K LANDED START!', true);
    showSpeechBubble('Landed on START! +400K Super Bonus! 🚩', 2800);
    logEvent(`🚩 <strong>${p.name}</strong> landed directly on <strong>START</strong> and collected <strong>400K</strong> super bonus!`);
    renderCornerHUDs();
  }

  concludeActionPhase(isDoubles);
}

export async function executeWorldTourFlight(destTileId, isRemote = false, explicitPlayerIdx = null) {
  if (typeof destTileId !== 'number' || destTileId < 0 || destTileId >= BOARD_TILES.length) {
    console.warn('[WorldTour] Invalid destination tile:', destTileId);
    return;
  }

  setFlightModeHighlights(false);
  document.getElementById('world-tour-banner')?.classList.add('hidden');
  document.getElementById('world-tour-banner')?.classList.remove('flex');

  const pIdx = explicitPlayerIdx !== null ? explicitPlayerIdx : gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!p) return;

  // IMPORTANT: Lock phase to MOVING so background loops/shadow throttling and tile depression resets never override flight position
  gameState.phase = 'MOVING';

  if (networkState.isMultiplayer && !isRemote) {
    broadcastAction('ACTION_WORLD_TOUR', { playerIdx: pIdx, destTileId });
  }

  showSpeechBubble(`✈️ Flying to ${BOARD_TILES[destTileId].name}...`, 3500);
  logEvent(`✈️ <strong>${p.name}</strong> took off on flight toward <strong>${BOARD_TILES[destTileId].name}</strong>!`);
  animateBoardingPassZoom(BOARD_TILES[destTileId].name);

  playSFX('flight');
  setTileHighlightRing(destTileId, true);

  const startPos = p.position;
  const totalSteps = (destTileId - startPos + 32) % 32;

  try {
    if (totalSteps > 0) {
      for (let s = 0; s < totalSteps; s++) {
        if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
        const curTileId = (startPos + s) % 32;
        const nextTileId = (startPos + s + 1) % 32;
        const curWorldPos = getTileWorldPosition(curTileId);
        const nextWorldPos = getTileWorldPosition(nextTileId);
        p.position = nextTileId;

        await flyPlayerStepAnimation(pIdx, curWorldPos, nextWorldPos, s, totalSteps, nextTileId);
        if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

        // Passing START bonus (+300K) — only on intermediate passing, not final landing on START
        if (p.position === 0 && s < totalSteps - 1) {
          p.cash += 300000;
          playSFX('cash');
          spawnAnimatedReaction('cash');
          spawnFloatingCashOnHUD(pIdx, '+300K Passed START', true);
          animateGoSalaryStream(pIdx, '+300K');
          logEvent(`🚩 <strong>${p.name}</strong> passed START on World Tour and collected <strong>300K</strong> salary!`);
          renderCornerHUDs();
        }
      }
    }
  } catch (err) {
    console.error('[WorldTour] Flight animation error, recovering token position:', err);
  }

  p.position = destTileId;
  resetTokenAfterHop(pIdx);
  updatePlayerTokenPositions3D();
  playSFX('hop');
  showSpeechBubble(`🛬 Landed in ${BOARD_TILES[destTileId].name}!`, 2200);
  setTileHighlightRing(destTileId, false);
  renderCornerHUDs();

  gameState.upgradesThisVisit = 0;
  await new Promise(r => setTimeout(r, Math.max(120, Math.round(350 / (matchSettings.gameSpeed || 1)))));

  await evaluateTileLanding(pIdx, false);
}

async function handleAICityDecision(playerIdx, tile, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  const p = gameState.players[playerIdx];
  if (!p) return;
  setStatusPill(`🤔 <strong>${p.name}</strong> is deciding whether to buy <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
  await new Promise(r => setTimeout(r, getGameDelay(650)));
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

  if (p.cash >= tile.price + 120000) {
    p.cash -= tile.price;
    gameState.properties[tile.id].owner = playerIdx;
    playSFX('build');
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(tile.price)}`, false);
    showSpeechBubble(`Bought ${tile.name}!`, 1800);
    logEvent(`🤖 <strong>${p.name}</strong> bought <strong>${tile.name}</strong> for <strong>${fmtMoney(tile.price)}</strong>.`);
    refreshTileTextureAndBuildings(tile.id);
    renderCornerHUDs();
    if (tile.group) {
      checkAndTriggerMonopoly(playerIdx, tile.group);
    }
  } else {
    showSpeechBubble(`Passed on ${tile.name}`, 1500);
    logEvent(`⏭️ <strong>${p.name}</strong> passed on buying <strong>${tile.name}</strong>.`);
  }
  clearThinkingState();
  concludeActionPhase(isDoubles);
}

async function handleAIOwnedCityLanding(playerIdx, tile, isDoubles) {
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
  } else {
    showSpeechBubble(`Inspecting ${tile.name}! 👑`, 1800);
  }
  clearThinkingState();
  concludeActionPhase(isDoubles);
}

async function handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles) {
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
    playSFX('build');
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(buyoutCost)}`, false);
    showSpeechBubble(`Bought out ${tile.name}! ⚔️`, 2200);
    logEvent(`⚔️ <strong>${p.name}</strong> executed a hostile buyout of <strong>${tile.name}</strong> from <strong>${prevOwner ? prevOwner.name : 'Opponent'}</strong> for <strong>${fmtMoney(buyoutCost)}</strong>!`);
    refreshTileTextureAndBuildings(tile.id);
    renderCornerHUDs();
    if (tile.group) {
      checkAndTriggerMonopoly(playerIdx, tile.group);
    }
  } else {
    showSpeechBubble(`Passed on buyout for ${tile.name}`, 1500);
  }
  clearThinkingState();
  concludeActionPhase(isDoubles);
}

async function executeAIChanceSpin(playerIdx, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  const p = gameState.players[playerIdx];
  setStatusPill(`🎡 <strong>${p.name}</strong> is spinning the Chance Wheel...`, { isThinking: true, playerIdx });
  const CHANCE_WHEEL_PRIZES = (await import('./data.js')).CHANCE_WHEEL_PRIZES;
  const prize = CHANCE_WHEEL_PRIZES[Math.floor(Math.random() * CHANCE_WHEEL_PRIZES.length)];
  showSpeechBubble(`Chance: ${prize.label}!`, 2000);
  await new Promise(r => setTimeout(r, getGameDelay(700)));
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  await applyChancePrize(playerIdx, prize, isDoubles);
}

export async function applyChancePrize(playerIdx, prize, isDoubles, isRemote = false) {
  const p = gameState.players[playerIdx];
  if (!p) return;

  if (networkState.isMultiplayer && !isRemote) {
    broadcastAction('ACTION_CHANCE_PRIZE', { playerIdx, prize, isDoubles });
  }

  logEvent(`🌈 <strong>${p.name}</strong> spun Chance: <em>${prize.desc}</em>`);

  if (prize.type === 'cash') {
    p.cash += prize.amount;
    playSFX('cash');
    playSFX('win');
    showSpeechBubble(`🎉 +${fmtMoney(prize.amount)}!`, 2200);
    spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(prize.amount)}`, true);
  } else if (prize.type === 'tax') {
    p.cash -= prize.amount;
    gameState.festivalPot += prize.amount;
    showSpeechBubble(`💸 -${fmtMoney(prize.amount)} Tax!`, 2200);
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(prize.amount)} Tax`, false);
    triggerTokenHurtAnimation(playerIdx);
    playSFX('hurt');
    checkAndHandleNegativeCash(playerIdx, {
      onRefreshTile: refreshTileTextureAndBuildings,
      onLog: logEvent
    });
  } else if (prize.type === 'island') {
    const fromPos = p.position;
    gameState.phase = 'MOVING';
    playSFX('jail');
    setTileHighlightRing(8, true);
    showSpeechBubble('🏝️ Detained on Tropical Island!', 2800);
    await flyPlayerDirectFlightAnimation(playerIdx, fromPos, 8);
    p.position = 8;
    p.inIsland = true;
    p.islandTurns = 0;
    resetTokenAfterHop(playerIdx);
    updatePlayerTokenPositions3D();
    playSFX('hop');
    setTimeout(() => setTileHighlightRing(8, false), 900);
    renderCornerHUDs();
    concludeActionPhase(false);
    return;
  } else if (prize.type === 'move') {
    const fromPos = p.position;
    const dest = prize.target;
    gameState.phase = 'MOVING';

    playSFX('flight');
    setTileHighlightRing(dest, true);

    if (dest === 0) {
      showSpeechBubble('🚀 Express Jet to START!', 2500);
      await flyPlayerDirectFlightAnimation(playerIdx, fromPos, 0);
      p.position = 0;
      resetTokenAfterHop(playerIdx);
      updatePlayerTokenPositions3D();
      playSFX('hop');
      setTimeout(() => setTileHighlightRing(0, false), 900);
      const salary = 300000;
      p.cash += salary;
      playSFX('cash');
      spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(salary)} START`, true);
      animateGoSalaryStream(playerIdx, fmtMoney(salary));
      logEvent(`💰 <strong>${p.name}</strong> landed on <strong>START</strong> and collected <strong>${fmtMoney(salary)}</strong> salary.`);
    } else {
      showSpeechBubble(`✈️ Flying to ${BOARD_TILES[dest]?.name || 'Destination'}!`, 2500);
      await flyPlayerDirectFlightAnimation(playerIdx, fromPos, dest);
      p.position = dest;
      resetTokenAfterHop(playerIdx);
      updatePlayerTokenPositions3D();
      playSFX('hop');
      setTimeout(() => setTileHighlightRing(dest, false), 900);
      showSpeechBubble(`🛬 Landed on ${BOARD_TILES[dest]?.name || 'Destination'}!`, 2200);
      // Give the player a clear visual pause to witness the avatar landing on World Tour before opening flight selection mode
      await new Promise(r => setTimeout(r, 650));
    }
    renderCornerHUDs();
    await evaluateTileLanding(playerIdx, isDoubles);
    return;
  }
  renderCornerHUDs();
  concludeActionPhase(isDoubles);
}

export function concludeActionPhase(isDoubles) {
  if (gameState.phase === 'VICTORY') return;
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];

  // Check victory conditions (Bankruptcy, Triple Monopoly, Line Monopoly, Net Worth Cap)
  const victory = checkVictoryConditions();
  if (victory) {
    clearSavedMatch();
    showVictoryModal(victory.winner, victory);
    return;
  }

  if (!gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') {
    cancelAllGameTimers();
    return;
  }
  clearThinkingState();
  saveCurrentMatchToStorage();

  if (isDoubles && !p.inIsland && !p.bankrupt && gameState.doublesCount < 2) {
    gameState.doublesCount++;
    gameState.phase = 'ROLL';
    gameState.turnTimeLeft = 15;
    updateRollButtonsUI(isHumanTurnActionable());
    if (p.isAI) {
      if (debugState?.freezeAI) {
        logEvent(`⏸️ <strong>[DEBUG]</strong> AI roll paused for <strong>${p.name}</strong> (AI Frozen).`);
        return;
      }
      if (aiRollTimer) clearTimeout(aiRollTimer);
      aiRollTimer = setTimeout(() => {
        aiRollTimer = null;
        if (!gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') return;
        executePlayerRoll();
      }, getGameDelay(1350));
    }
    return;
  }

  cancelAllGameTimers();

  if (p.isAI) {
    if (debugState?.freezeAI) {
      logEvent(`⏸️ <strong>[DEBUG]</strong> AI turn end paused for <strong>${p.name}</strong> (AI Frozen).`);
      return;
    }
    autoEndTurnTimer = setTimeout(() => {
      autoEndTurnTimer = null;
      if (!gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') return;
      advanceTurn();
    }, getGameDelay(1150));
  } else {
    gameState.phase = 'END';
    updateRollButtonsUI(isHumanTurnActionable());
    autoEndTurnTimer = setTimeout(() => {
      autoEndTurnTimer = null;
      if (!gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') return;
      if (gameState.phase === 'END') {
        advanceTurn();
      }
    }, getGameDelay(1200));
  }
}

export function advanceTurn(isRemote = false, forcedNextIdx = null) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') {
    cancelAllGameTimers();
    return;
  }
  cancelAllGameTimers();
  clearThinkingState();

  const total = gameState.players.length;
  let next = forcedNextIdx !== null ? forcedNextIdx : (gameState.currentPlayerIdx + 1) % total;
  let guard = 0;
  while (gameState.players[next].bankrupt && guard < total) {
    next = (next + 1) % total;
    guard++;
  }

  gameState.currentPlayerIdx = next;
  gameState.doublesCount = 0;
  gameState.upgradesThisVisit = 0;
  gameState.phase = 'ROLL';
  gameState.turnTimeLeft = 15;

  // Record net worth snapshot for timeline chart
  recordNetWorthSnapshot();

  renderCornerHUDs();
  animateActiveTurnSwitch(next);
  updateRollButtonsUI(isHumanTurnActionable());
  saveCurrentMatchToStorage();

  const nextP = gameState.players[next];
  showSpeechBubble(`${nextP.name}'s Turn!`, 2000);
  refreshActivePlayerTurnStatus();

  if (networkState.isMultiplayer && !isRemote) {
    broadcastAction('ACTION_END_TURN', { nextPlayerIdx: next });
  }

  if (nextP.isAI) {
    setStatusPill(`🤔 <strong>${nextP.name}</strong> is rolling the dice...`, { isThinking: true, playerIdx: next });
    if (!networkState.isMultiplayer || networkState.isHost) {
      if (debugState?.freezeAI) {
        logEvent(`⏸️ <strong>[DEBUG]</strong> AI turn start paused for <strong>${nextP.name}</strong> (AI Frozen).`);
        return;
      }

      // Check proactive bot trade offer to local player
      const humanIdx = localPlayerIdx || 0;
      const botTrade = generateProactiveBotTrade(next);
      if (botTrade && botTrade.targetIdx === humanIdx && !gameState.players[humanIdx]?.bankrupt) {
        showIncomingTradeOfferModal(botTrade);
      }

      aiRollTimer = setTimeout(() => {
        aiRollTimer = null;
        if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
        executePlayerRoll();
      }, getGameDelay(1350));
    }
  }
}

/**
 * Resumes active turn loop after an existing saved match is restored.
 * Ensures the AI roll timer starts if it's the AI's turn, and cleanses any stalled states.
 */
export function resumeActiveTurn() {
  cancelAllGameTimers();

  if (!gameState.gameStarted || !gameState.players || gameState.players.length === 0) return;

  const total = gameState.players.length;
  let cur = gameState.currentPlayerIdx;
  if (cur === undefined || cur === null || cur < 0 || cur >= total || gameState.players[cur]?.bankrupt) {
    cur = 0;
    while (cur < total && gameState.players[cur]?.bankrupt) {
      cur++;
    }
    if (cur >= total) return;
    gameState.currentPlayerIdx = cur;
  }

  // Always reset phase to 'ROLL' because previous async promises/modals died when the session reloaded
  gameState.phase = 'ROLL';
  gameState.doublesCount = 0;
  gameState.upgradesThisVisit = 0;
  gameState.turnTimeLeft = matchSettings.turnDuration || 15;

  const curP = gameState.players[cur];
  renderCornerHUDs();
  updateRollButtonsUI(isHumanTurnActionable());
  refreshActivePlayerTurnStatus();

  const statusWrap = document.getElementById('hud-bottom-status-wrap');
  if (statusWrap) statusWrap.classList.remove('hidden');

  showSpeechBubble(`${curP.name}'s Turn!`, 2200);

  if (curP.isAI) {
    setStatusPill(`🤔 <strong>${curP.name}</strong> is rolling the dice...`, { isThinking: true, playerIdx: cur });
    if (!networkState.isMultiplayer || networkState.isHost) {
      if (debugState?.freezeAI) {
        logEvent(`⏸️ <strong>[DEBUG]</strong> AI roll paused for <strong>${curP.name}</strong> (AI Frozen).`);
        return;
      }

      // Check proactive bot trade offer to local player
      const humanIdx = localPlayerIdx || 0;
      const botTrade = generateProactiveBotTrade(cur);
      if (botTrade && botTrade.targetIdx === humanIdx && !gameState.players[humanIdx]?.bankrupt) {
        showIncomingTradeOfferModal(botTrade);
      }

      aiRollTimer = setTimeout(() => {
        aiRollTimer = null;
        if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
        executePlayerRoll();
      }, getGameDelay(1400));
    }
  } else {
    logEvent(`🎲 Resumed match on <strong>${curP.name}'s</strong> turn to roll.`);
  }
}

export function handlePayIslandBail() {
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];
  if (!p.inIsland || p.cash < 150000) return;
  p.cash -= 150000;
  gameState.festivalPot += 150000;
  p.inIsland = false;
  p.islandTurns = 0;
  playSFX('cash');
  spawnFloatingCashOnHUD(pIdx, '-150K Bail', false);
  animateIslandJailbreak(pIdx);
  triggerTokenHurtAnimation(pIdx);
  showSpeechBubble('Paid 150K Island Bail!', 1800);
  renderCornerHUDs();
  updateRollButtonsUI(isHumanTurnActionable());
  saveCurrentMatchToStorage();

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_PAY_BAIL', { playerIdx: pIdx });
  }
}

/**
 * Cleanly terminate the active match and return to the lobby.
 * Ensures the match does NOT keep running in the background.
 */
export function terminateMatchAndReturnToLobby() {
  cancelAllGameTimers();

  gameState.gameStarted = false;
  gameState.phase = 'SETUP';
  gameState.activeInspectorTile = null;
  gameState.pendingBuyTile = null;
  gameState.auction = null;

  clearSavedMatch();
  stopVictoryCelebration();
  closeAllGameModals();

  try {
    setTileHighlightRing(0, false);
  } catch (_) {}

  // Hide all in-game overlays and badges
  const turnToast = document.getElementById('turn-lock-toast');
  if (turnToast) turnToast.classList.add('hidden');
  const flightBanner = document.getElementById('world-tour-banner');
  if (flightBanner) flightBanner.classList.add('hidden');
  const diceOverlay = document.getElementById('screen-dice-overlay');
  if (diceOverlay) {
    diceOverlay.classList.add('hidden');
    diceOverlay.style.display = 'none';
  }
  const speechBubble = document.getElementById('token-speech-bubble');
  if (speechBubble) speechBubble.classList.add('hidden');
  const diceSumBadge = document.getElementById('dice-sum-badge');
  if (diceSumBadge) diceSumBadge.classList.add('hidden');
  const statusWrap = document.getElementById('hud-bottom-status-wrap');
  if (statusWrap) statusWrap.classList.add('hidden');

  if (networkState.isMultiplayer) {
    if (networkState.isHost) {
      broadcastReturnToLobby();
      logEvent('👑 Host returned table to lobby.');
    } else {
      broadcastAction('ACTION_GUEST_LOBBY', {
        senderIdx: networkState.localPlayerIdx
      });
      logEvent('🚪 Exited to lobby.');
    }
  }

  if (window.openLandingSetupScreen) {
    window.openLandingSetupScreen();
  }
}
