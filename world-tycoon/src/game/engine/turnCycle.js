/**
 * game/engine/turnCycle.js
 * Turn cycle progression: dice rolling, step hopping, island bail, turn advancement, and victory triggers.
 */

import { gameState, isHumanTurnActionable, matchSettings, debugState } from '../state.js';
import { playSFX } from '../audio.js';
import { calculatePlayerNetWorth, checkVictoryConditions } from '../rules.js';
import {
  animate3DDiceTumble,
  hopPlayerStepAnimation,
  resetTokenAfterHop,
  updatePlayerTokenPositions3D,
  triggerTokenHurtAnimation,
  showSpeechBubble,
  getTileWorldPosition,
  setTileHighlightRing
} from '../../three/scene.js';
import {
  renderCornerHUDs,
  spawnFloatingCashOnHUD,
  updateRollButtonsUI,
  logEvent,
  showTurnLockToast,
  setStatusPill,
  refreshActivePlayerTurnStatus,
  clearThinkingState,
  setPlayerPortraitMood,
  hideDiceSumBadge
} from '../../ui/hud.js';
import { showVictoryModal, closeTurnActionModals, openSellCitiesModal, settleDebtDeficitWithoutProperties } from '../../ui/modals.js';
import { spawnAnimatedReaction } from '../../three/effects.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../network/p2p.js';
import { saveCurrentMatchToStorage, clearSavedMatch } from '../persistence.js';
import { PlayerControllerFactory } from '../controllers/PlayerControllerFactory.js';
import { AIPlayerController } from '../controllers/AIPlayerController.js';
import { BOARD_TILES } from '../data.js';
import { fmtMoney } from '../utils.js';
import {
  animateDoublesBurstBanner,
  animateActiveTurnSwitch,
  animateDiceSlingshotPullback,
  animateGoSalaryStream,
  animateIslandJailbreak
} from '../../ui/anim.js';
import { evaluateTileLanding } from './landings.js';
import { modalStore } from '../../svelte/stores/modalStore.js';
import { bannerStore } from '../../svelte/stores/bannerStore.js';
import { get } from 'svelte/store';

let autoEndTurnTimer = null;
let observerEndTurnWatchdog = null;

function isCelebrationOrThreatActive() {
  try {
    const modals = get(modalStore);
    if (modals?.monopolyCelebration?.visible) return true;
    const banner = get(bannerStore);
    if (banner?.active && banner?.type === 'monopolyThreat') return true;
  } catch (_) {}
  return false;
}

export function clearObserverEndTurnWatchdog() {
  if (observerEndTurnWatchdog) {
    clearTimeout(observerEndTurnWatchdog);
    observerEndTurnWatchdog = null;
  }
}

export function cancelAllGameTimers() {
  if (autoEndTurnTimer) {
    clearTimeout(autoEndTurnTimer);
    autoEndTurnTimer = null;
  }
  clearObserverEndTurnWatchdog();
  AIPlayerController.cancelTimer();
  if (typeof window !== 'undefined') {
    window.resumeBotTurnAfterTrade = null;
  }
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

export async function handleRollButtonClick() {
  if (networkState && networkState.isReconnecting) return;
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
  if (networkState && networkState.isReconnecting) return;
  if (!gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') return;
  hideDiceSumBadge();
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
      setPlayerPortraitMood(pIdx, 'smug', 3000);
      animateIslandJailbreak(pIdx);
      playSFX('jailbreak', 1.0, getTileWorldPosition(8));
      logEvent(`🏝️ <strong>${p.name}</strong> rolled doubles and escaped the Island!`);
      showSpeechBubble('Rolled doubles & escaped! 🏝️', 2000);
      renderCornerHUDs();
      refreshActivePlayerTurnStatus();
      updateRollButtonsUI(isHumanTurnActionable());
    } else {
      p.islandTurns++;
      playSFX('jailRattle', 1.0, getTileWorldPosition(8));
      if (p.islandTurns >= 3) {
        // Player has served 3 chances on Island; now forced to pay 150K bail!
        const bailAmt = 150000;
        if (p.cash >= bailAmt) {
          p.inIsland = false;
          p.islandTurns = 0;
          p.cash -= bailAmt;
          gameState.festivalPot += bailAmt;
          setPlayerPortraitMood(pIdx, 'smug', 3000);
          spawnFloatingCashOnHUD(pIdx, '-150K Bail', false);
          animateIslandJailbreak(pIdx);
          logEvent(`🏝️ <strong>${p.name}</strong> served 3 turns and paid <strong>${fmtMoney(bailAmt)}</strong> Island fine.`);
          renderCornerHUDs();
          refreshActivePlayerTurnStatus();
          updateRollButtonsUI(isHumanTurnActionable());
        } else {
          // Insufficient money: must sell properties and auction or face bankruptcy!
          const owned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === pIdx);
          p.inIsland = false;
          p.islandTurns = 0;
          animateIslandJailbreak(pIdx);
          renderCornerHUDs();
          refreshActivePlayerTurnStatus();
          updateRollButtonsUI(false);

          if (owned.length > 0) {
            logEvent(`💸 <strong>${p.name}</strong> owes <strong>${fmtMoney(bailAmt)}</strong> Island fine and must sell properties.`);
            if (networkState.isMultiplayer) {
              broadcastAction('ACTION_RENT_DEBT', {
                debtorIdx: pIdx,
                creditorIdx: null,
                rentOwed: bailAmt,
                tileId: 8,
                isDoubles: Boolean(isDoubles)
              });
            }
            openSellCitiesModal(BOARD_TILES[8], bailAmt, null, isDoubles, pIdx);
            if (gameState.pendingRentDebt) {
              gameState.pendingRentDebt.isTax = true;
            }
            return;
          } else {
            // No properties and cash < 150K: Total bankruptcy to Bank
            logEvent(`💀 <strong>${p.name}</strong> cannot pay <strong>${fmtMoney(bailAmt)}</strong> Island fine and has gone BANKRUPT!`);
            gameState.pendingRentDebt = {
              debtorIdx: pIdx,
              creditorIdx: null,
              rentOwed: bailAmt,
              tile: BOARD_TILES[8],
              isDoubles: false,
              isTax: true,
              soldTiles: []
            };
            settleDebtDeficitWithoutProperties();
            return;
          }
        }
      } else {
        setPlayerPortraitMood(pIdx, 'shocked', 3000);
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
  hideDiceSumBadge();
  const p = gameState.players[playerIdx];
  if (!p) return;

  for (let s = 0; s < steps; s++) {
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
    const startPos = getTileWorldPosition(p.position);
    p.position = (p.position + 1) % 32;
    const destTileId = p.position;
    const endPos = getTileWorldPosition(destTileId);

    playSFX('hop', 1.0, endPos);
    await hopPlayerStepAnimation(playerIdx, startPos, endPos, s, steps, destTileId);
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

    // Passing START bonus (+250K) — only on intermediate passing, not final landing
    if (p.position === 0 && s < steps - 1) {
      p.cash += 250000;
      setPlayerPortraitMood(playerIdx, 'smug', 3000);
      playSFX('cash', 1.0, endPos);
      spawnAnimatedReaction('cash');
      spawnFloatingCashOnHUD(playerIdx, '+250K Passed START', true);
      animateGoSalaryStream(playerIdx, '+250K');
      logEvent(`🚩 <strong>${p.name}</strong> passed START and collected <strong>250K</strong> salary!`);
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

export function concludeActionPhase(isDoubles) {
  if (gameState.phase === 'VICTORY' || gameState.phase === 'AUCTION' || gameState.auction) return;
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
    playSFX('doubles');
    gameState.doublesCount++;
    gameState.phase = 'ROLL';
    gameState.turnTimeLeft = 15;

    if (networkState.isMultiplayer) {
      broadcastAction('ACTION_DOUBLES_ROLL', {
        playerIdx: pIdx,
        doublesCount: gameState.doublesCount,
        turnTimeLeft: 15
      });
      if (networkState.isHost) {
        broadcastFullGameState();
      }
    }

    renderCornerHUDs();
    refreshActivePlayerTurnStatus();
    updateRollButtonsUI(isHumanTurnActionable());
    animateDoublesBurstBanner(p.name);

    const controller = PlayerControllerFactory.create(pIdx);
    controller.onTurnStart({ executeRollFn: executePlayerRoll });
    return;
  }

  cancelAllGameTimers();

  const celebrationDelay = isCelebrationOrThreatActive() ? 3500 : 0;

  if (p.isAI) {
    if (networkState.isMultiplayer && !networkState.isHost) return;
    if (debugState?.freezeAI) {
      logEvent(`⏸️ <strong>[DEBUG]</strong> AI turn end paused for <strong>${p.name}</strong> (AI Frozen).`);
      return;
    }
    const delay = celebrationDelay || 350;
    autoEndTurnTimer = setTimeout(() => {
      autoEndTurnTimer = null;
      if (!gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') return;
      advanceTurn();
    }, getGameDelay(delay));
  } else {
    // In multiplayer, observers must NOT auto-advance someone else's turn immediately!
    if (networkState.isMultiplayer && pIdx !== networkState.localPlayerIdx) {
      gameState.phase = 'END';
      updateRollButtonsUI(false);
      refreshActivePlayerTurnStatus();

      // Observer watchdog fallback: ONLY Host enforces watchdog for remote active peers!
      // Spectator guests must wait for Host's FULL_STATE_SYNC or ACTION_END_TURN.
      clearObserverEndTurnWatchdog();
      if (networkState.isHost) {
        const capturedTurn = gameState.turnNumber || 0;
        observerEndTurnWatchdog = setTimeout(() => {
          observerEndTurnWatchdog = null;
          if (!gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') return;
          if (gameState.phase === 'END' && gameState.currentPlayerIdx === pIdx && (gameState.turnNumber || 0) === capturedTurn) {
            advanceTurn(true);
          }
        }, celebrationDelay ? 5500 : 3500);
      }
      return;
    }
    clearObserverEndTurnWatchdog();
    gameState.phase = 'END';
    updateRollButtonsUI(isHumanTurnActionable());
    refreshActivePlayerTurnStatus();
    const delay = celebrationDelay || 500;
    autoEndTurnTimer = setTimeout(() => {
      autoEndTurnTimer = null;
      if (!gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') return;
      if (gameState.phase === 'END') {
        advanceTurn();
      }
    }, getGameDelay(delay));
  }
}

export function advanceTurn(isRemote = false, forcedNextIdx = null, targetTurnNumber = null) {
  if (gameState.phase === 'AUCTION' || gameState.auction) return;
  hideDiceSumBadge();
  closeTurnActionModals();
  if (!gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') {
    cancelAllGameTimers();
    return;
  }

  // Idempotency check: If an advance request is for an already-completed turn, reject
  if (targetTurnNumber !== null && typeof targetTurnNumber === 'number') {
    if (targetTurnNumber <= (gameState.turnNumber || 0)) {
      return;
    }
  }

  // If forcedNextIdx is already the current player and phase is already ROLL, do not duplicate turn start
  if (isRemote && forcedNextIdx !== null && forcedNextIdx === gameState.currentPlayerIdx && gameState.phase === 'ROLL') {
    return;
  }

  const victory = checkVictoryConditions();
  if (victory) {
    clearSavedMatch();
    showVictoryModal(victory.winner, victory);
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

  // Advance turnNumber monotonically
  if (targetTurnNumber !== null && typeof targetTurnNumber === 'number') {
    gameState.turnNumber = targetTurnNumber;
  } else {
    gameState.turnNumber = (gameState.turnNumber || 0) + 1;
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
  refreshActivePlayerTurnStatus();
  updateRollButtonsUI(isHumanTurnActionable());
  saveCurrentMatchToStorage();

  if (networkState.isMultiplayer) {
    if (!isRemote) {
      broadcastAction('ACTION_END_TURN', { nextPlayerIdx: next, turnNumber: gameState.turnNumber });
    }
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }

  const controller = PlayerControllerFactory.create(next);
  controller.onTurnStart({ executeRollFn: executePlayerRoll });
}

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

  renderCornerHUDs();
  const statusWrap = document.getElementById('hud-bottom-status-wrap');
  if (statusWrap) statusWrap.classList.remove('hidden');

  const controller = PlayerControllerFactory.create(cur);
  controller.onTurnStart({ executeRollFn: executePlayerRoll });

  if (!controller.isAI()) {
    logEvent(`🎲 Resumed match on <strong>${gameState.players[cur]?.name}'s</strong> turn to roll.`);
  }
}

export function handlePayIslandBail() {
  const pIdx = gameState.currentPlayerIdx;
  const p = gameState.players ? gameState.players[pIdx] : null;
  if (!p || !p.inIsland || p.cash < 150000) return;
  p.cash -= 150000;
  gameState.festivalPot += 150000;
  p.inIsland = false;
  p.islandTurns = 0;
  playSFX('payRent', 1.0, getTileWorldPosition(8));
  playSFX('jailbreak', 0.8, getTileWorldPosition(8));
  spawnFloatingCashOnHUD(pIdx, '-150K Bail', false);
  animateIslandJailbreak(pIdx);
  triggerTokenHurtAnimation(pIdx);
  showSpeechBubble('Paid 150K Island Bail!', 1800);
  logEvent(`🏝️ <strong>${p.name}</strong> paid 150K Island Bail and is free to move.`);
  renderCornerHUDs();
  refreshActivePlayerTurnStatus();
  updateRollButtonsUI(isHumanTurnActionable());
  saveCurrentMatchToStorage();

  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_PAY_BAIL', { playerIdx: pIdx });
  }
}

if (typeof window !== 'undefined') {
  window.handlePayIslandBail = handlePayIslandBail;
  window.concludeActionPhase = concludeActionPhase;
  window.evaluateTileLanding = evaluateTileLanding;
  window.advanceTurn = advanceTurn;
}
