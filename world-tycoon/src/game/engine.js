/**
 * game/engine.js
 * Turn engine: dice tumbling, step-by-step hopping, tile landings, AI turns, World Tour.
 */

import { BOARD_TILES } from './data.js';
import { gameState, displayedCash, isHumanTurnActionable, resetGameStateForNewMatch, lobbyPlayerCount, matchSettings, debugState } from './state.js';
import { fmtMoney } from './utils.js';
import { playSFX } from './audio.js';
import { calculateTileRent, checkAndHandleNegativeCash, checkVictoryConditions } from './rules.js';
import {
  animate3DDiceTumble,
  hopPlayerStepAnimation,
  resetTokenAfterHop,
  updatePlayerTokenPositions3D,
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
import { renderCornerHUDs, spawnFloatingCashOnHUD, updateRollButtonsUI, logEvent, showTurnLockToast, animateRentTransferOnHUD } from '../ui/hud.js';
import {
  openBuyCityModal,
  openUpgradeCityModal,
  openChanceWheelModal,
  registerEngineCallbacks,
  upgradeCityLevel,
  openMonopolyCelebrationModal,
  checkAndTriggerMonopoly,
  showVictoryModal,
  closeAllGameModals
} from '../ui/modals.js';
import { spawnAnimatedReaction, fireConfettiBurst, stopVictoryCelebration } from '../three/effects.js';
import { networkState, broadcastAction, registerNetworkCallbacks, broadcastReturnToLobby } from '../network/p2p.js';
import { saveCurrentMatchToStorage, clearSavedMatch } from './persistence.js';

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
    startNewMatch
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
    onMortgageCity: (playerIdx, tileId, mortgaged) => {
      const st = gameState.properties[tileId];
      const tile = BOARD_TILES[tileId];
      const p = gameState.players[playerIdx];
      if (st && tile && p) {
        st.mortgaged = mortgaged;
        if (mortgaged) {
          const gain = tile.price / 2;
          p.cash += gain;
          playSFX('cash');
          spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(gain)}`, true);
          logEvent(`🏦 <strong>${p.name}</strong> mortgaged <strong>${tile.name}</strong> (+${fmtMoney(gain)}).`);
        } else {
          const cost = Math.round(tile.price * 0.55);
          p.cash -= cost;
          playSFX('cash');
          spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(cost)}`, false);
          logEvent(`🏦 <strong>${p.name}</strong> unmortgaged <strong>${tile.name}</strong> (-${fmtMoney(cost)}).`);
        }
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

export function startNewMatch() {
  stopVictoryCelebration();
  closeAllGameModals();
  document.getElementById('modal-setup')?.classList.add('hidden');
  document.getElementById('modal-setup')?.classList.remove('flex');

  cancelAllGameTimers();
  clearSavedMatch();
  resetGameStateForNewMatch(lobbyPlayerCount);
  resetLocalCarAnimationClock();

  BOARD_TILES.forEach(t => {
    refreshTileTextureAndBuildings(t.id);
  });

  spawnAllPlayerTokens3D();
  renderCornerHUDs();
  updateRollButtonsUI(isHumanTurnActionable());
  showSpeechBubble('Ready to roll!', 2500);
  const editionName = matchSettings.boardEdition === 'rajasthan' ? 'Rajasthan Edition' : 'World Cities Edition';
  logEvent(`🎲 <strong>New Match Started (${editionName})!</strong> All players begin with <strong>${fmtMoney(matchSettings.startingCash || 2000000)}</strong>.`);
  saveCurrentMatchToStorage();
}

export async function handleRollButtonClick() {
  const p = gameState.players[gameState.currentPlayerIdx];
  if (!p || p.isAI) return;

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
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
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

  // Check Tropical Island Detention
  if (p.inIsland) {
    if (isDoubles) {
      p.inIsland = false;
      p.islandTurns = 0;
      logEvent(`🏝️ <strong>${p.name}</strong> rolled doubles and escaped the Island!`);
    } else {
      p.islandTurns++;
      if (p.islandTurns >= 3) {
        p.inIsland = false;
        p.islandTurns = 0;
        p.cash -= 150000;
        gameState.festivalPot += 150000;
        spawnFloatingCashOnHUD(pIdx, '-150K Bail', false);
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
      logEvent(`🚩 <strong>${p.name}</strong> passed START and collected <strong>300K</strong> salary!`);
      renderCornerHUDs();
    }

    if (s < steps - 1) {
      // Fluid transition between intermediate hops without halting momentum
      await new Promise(r => setTimeout(r, 15));
    } else {
      resetTokenAfterHop(playerIdx);
    }
  }

  await new Promise(r => setTimeout(r, 220));
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
    } else if (st.owner !== playerIdx && !st.mortgaged) {
      const rent = calculateTileRent(tile.id);
      const owner = gameState.players[st.owner];

      showSpeechBubble(`Ouch! Paying ${fmtMoney(rent)} rent to ${owner.name}!`, 3000);
      logEvent(`💸 <strong>${p.name}</strong> landed on <strong>${tile.name}</strong> and transferred <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);

      // Visual animated HUD deduction, streaming bills flight, and receipt
      await animateRentTransferOnHUD(playerIdx, st.owner, rent);

      p.cash -= rent;
      owner.cash += rent;

      checkAndHandleNegativeCash(playerIdx, {
        onRefreshTile: refreshTileTextureAndBuildings,
        onLog: logEvent
      });
      renderCornerHUDs();
    } else if (st.owner === playerIdx) {
      if (tile.type === 'city') {
        if (p.isAI) {
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
    playSFX('cash');
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(taxAmt)} Tax`, false);
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
    concludeActionPhase(false);
    return;
  } else if (tile.type === 'festival') {
    if (gameState.festivalPot > 0) {
      const jackpot = gameState.festivalPot;
      p.cash += jackpot;
      gameState.festivalPot = 0;
      playSFX('cash');
      spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(jackpot)} Festival!`, true);
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

  playSFX('flight');
  setTileHighlightRing(destTileId, true);

  const startPos = p.position;
  const crossesStart = (destTileId < startPos) || (startPos === 24 && destTileId === 0);

  if (startPos !== destTileId) {
    await flyPlayerDirectFlightAnimation(pIdx, startPos, destTileId, () => {
      if (crossesStart) {
        p.cash += 300000;
        playSFX('cash');
        spawnAnimatedReaction('cash');
        spawnFloatingCashOnHUD(pIdx, '+300K Passed START', true);
        logEvent(`🚩 <strong>${p.name}</strong> flew past START and collected <strong>300K</strong> bonus!`);
        renderCornerHUDs();
      }
    });
  }

  p.position = destTileId;
  resetTokenAfterHop(pIdx);
  updatePlayerTokenPositions3D();
  playSFX('hop');
  showSpeechBubble(`🛬 Landed in ${BOARD_TILES[destTileId].name}!`, 2200);
  setTimeout(() => setTileHighlightRing(destTileId, false), 900);
  renderCornerHUDs();

  await evaluateTileLanding(pIdx, false);
}

async function handleAICityDecision(playerIdx, tile, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  const p = gameState.players[playerIdx];
  if (!p) return;
  await new Promise(r => setTimeout(r, 600));
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
  }
  concludeActionPhase(isDoubles);
}

async function handleAIOwnedCityLanding(playerIdx, tile, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  const p = gameState.players[playerIdx];
  if (!p) return;
  const st = gameState.properties[tile.id];
  await new Promise(r => setTimeout(r, 650));
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

  if (st && !st.mortgaged && st.level < 4 && p.cash >= tile.houseCost + 200000) {
    upgradeCityLevel(tile.id, true);
    showSpeechBubble(`Upgraded ${tile.name} to Level ${st.level}! 🏗️`, 2200);
  } else {
    showSpeechBubble(`Inspecting ${tile.name}! 👑`, 1800);
  }
  concludeActionPhase(isDoubles);
}

async function executeAIChanceSpin(playerIdx, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  const CHANCE_WHEEL_PRIZES = (await import('./data.js')).CHANCE_WHEEL_PRIZES;
  const prize = CHANCE_WHEEL_PRIZES[Math.floor(Math.random() * CHANCE_WHEEL_PRIZES.length)];
  showSpeechBubble(`Chance: ${prize.label}!`, 2000);
  await new Promise(r => setTimeout(r, 700));
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
    spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(prize.amount)}`, true);
  } else if (prize.type === 'tax') {
    p.cash -= prize.amount;
    gameState.festivalPot += prize.amount;
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(prize.amount)}`, false);
    checkAndHandleNegativeCash(playerIdx, {
      onRefreshTile: refreshTileTextureAndBuildings,
      onLog: logEvent
    });
  } else if (prize.type === 'island') {
    p.position = 8;
    p.inIsland = true;
    p.islandTurns = 0;
    updatePlayerTokenPositions3D();
    renderCornerHUDs();
    concludeActionPhase(false);
    return;
  } else if (prize.type === 'move') {
    p.position = prize.target;
    updatePlayerTokenPositions3D();
    renderCornerHUDs();
    await evaluateTileLanding(playerIdx, isDoubles);
    return;
  }
  renderCornerHUDs();
  concludeActionPhase(isDoubles);
}

export function concludeActionPhase(isDoubles) {
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players[pIdx];

  // Check victory conditions (Bankruptcy, Triple Monopoly, Line Monopoly, Net Worth Cap)
  const victory = checkVictoryConditions();
  if (victory) {
    clearSavedMatch();
    showVictoryModal(victory.winner, victory);
    return;
  }

  if (!gameState.gameStarted || gameState.phase === 'SETUP') {
    cancelAllGameTimers();
    return;
  }
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
        if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
        executePlayerRoll();
      }, 1350);
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
      if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
      advanceTurn();
    }, 1150);
  } else {
    gameState.phase = 'END';
    updateRollButtonsUI(isHumanTurnActionable());
    autoEndTurnTimer = setTimeout(() => {
      autoEndTurnTimer = null;
      if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
      if (gameState.phase === 'END') {
        advanceTurn();
      }
    }, 1200);
  }
}

export function advanceTurn(isRemote = false, forcedNextIdx = null) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') {
    cancelAllGameTimers();
    return;
  }
  cancelAllGameTimers();

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

  renderCornerHUDs();
  updateRollButtonsUI(isHumanTurnActionable());
  saveCurrentMatchToStorage();

  const nextP = gameState.players[next];
  showSpeechBubble(`${nextP.name}'s Turn!`, 2000);

  if (networkState.isMultiplayer && !isRemote) {
    broadcastAction('ACTION_END_TURN', { nextPlayerIdx: next });
  }

  if (nextP.isAI) {
    if (!networkState.isMultiplayer || networkState.isHost) {
      if (debugState?.freezeAI) {
        logEvent(`⏸️ <strong>[DEBUG]</strong> AI turn start paused for <strong>${nextP.name}</strong> (AI Frozen).`);
        return;
      }
      aiRollTimer = setTimeout(() => {
        aiRollTimer = null;
        if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
        executePlayerRoll();
      }, 1350);
    }
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
  showSpeechBubble('Paid 150K Island Bail!', 1800);
  renderCornerHUDs();
  updateRollButtonsUI(isHumanTurnActionable());
  saveCurrentMatchToStorage();
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
