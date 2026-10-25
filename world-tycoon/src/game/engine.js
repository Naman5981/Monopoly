/**
 * game/engine.js
 * Turn engine orchestrator and facade barrel for World Tycoon: Global Edition.
 *
 * Sub-modules:
 * - game/engine/flight.js: World Tour airline flight mode and animations
 * - game/engine/chance.js: Chance wheel prize resolutions
 * - game/engine/landings.js: Board tile landings, buyout, AI decisions
 * - game/engine/turnCycle.js: Dice tumbling, hop steps, turns progression, and Island bail
 */

import { BOARD_TILES } from './data.js';
import {
  gameState,
  matchSettings,
  debugState,
  lobbyPlayerCount,
  resetGameStateForNewMatch,
  isHumanTurnActionable
} from './state.js';
import { fmtMoney } from './utils.js';
import { playSFX, startAdaptiveMusic, stopAdaptiveMusic } from './audio.js';
import { getTileWorldPosition } from '../three/board/coords.js';
import {
  resetLocalCarAnimationClock,
  refreshTileTextureAndBuildings,
  spawnAllPlayerTokens3D,
  showSpeechBubble,
  setTileHighlightRing,
  updatePlayerTokenPositions3D
} from '../three/scene.js';
import {
  renderCornerHUDs,
  updateRollButtonsUI,
  logEvent,
  refreshActivePlayerTurnStatus,
  setStatusPill,
  spawnFloatingCashOnHUD
} from '../ui/hud.js';
import { stopVictoryCelebration } from '../three/effects.js';
import { animateDoublesBurstBanner } from '../ui/anim.js';
import { saveCurrentMatchToStorage, clearSavedMatch } from './persistence.js';
import {
  networkState,
  broadcastAction,
  broadcastReturnToLobby,
  broadcastFullGameState,
  registerNetworkCallbacks
} from '../network/p2p.js';
import {
  closeAllGameModals,
  registerEngineCallbacks,
  openMonopolyCelebrationModal,
  checkAndTriggerMonopoly,
  showIncomingTradeOfferModal,
  completeTradeTransfer,
  closeIncomingTradeModal,
  showChanceAwardPopup,
  executeRemoteChanceSpin
} from '../ui/modals.js';

import { executeWorldTourFlight } from './engine/flight.js';
import { applyChancePrize } from './engine/chance.js';
import { evaluateTileLanding } from './engine/landings.js';
import { PlayerControllerFactory } from './controllers/PlayerControllerFactory.js';
import {
  cancelAllGameTimers,
  getGameDelay,
  recordNetWorthSnapshot,
  handleRollButtonClick,
  executePlayerRoll,
  hopPlayerSteps3D,
  concludeActionPhase,
  advanceTurn,
  resumeActiveTurn,
  handlePayIslandBail
} from './engine/turnCycle.js';

// Re-export sub-modules
export * from './engine/flight.js';
export * from './engine/chance.js';
export * from './engine/landings.js';
export * from './engine/turnCycle.js';

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
      refreshActivePlayerTurnStatus();
      await executePlayerRoll(d1, d2);
    },
    onDoublesRoll: (playerIdx, doublesCount, turnTimeLeft = 15) => {
      gameState.currentPlayerIdx = playerIdx;
      gameState.doublesCount = typeof doublesCount === 'number' ? doublesCount : ((gameState.doublesCount || 0) + 1);
      gameState.phase = 'ROLL';
      gameState.turnTimeLeft = typeof turnTimeLeft === 'number' ? turnTimeLeft : 15;

      const p = gameState.players ? gameState.players[playerIdx] : null;
      if (p) {
        logEvent(`🎲 <strong>${p.name}</strong> rolled doubles! Granted an extra roll.`);
        animateDoublesBurstBanner(p.name);
      }

      renderCornerHUDs();
      refreshActivePlayerTurnStatus();
      updateRollButtonsUI(isHumanTurnActionable());

      const controller = PlayerControllerFactory.create(playerIdx);
      controller.onTurnStart({ executeRollFn: executePlayerRoll });
    },
    onBuyCity: (playerIdx, tileId) => {
      const tile = BOARD_TILES[tileId];
      const p = gameState.players[playerIdx];
      if (tile && p) {
        p.cash -= tile.price;
        gameState.properties[tileId].owner = playerIdx;
        playSFX('build', 1.0, getTileWorldPosition(tileId));
        spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(tile.price)}`, false);
        logEvent(`🏙️ <strong>${p.name}</strong> bought <strong>${tile.name}</strong> for <strong>${fmtMoney(tile.price)}</strong>!`);
        refreshTileTextureAndBuildings(tileId);
        renderCornerHUDs();
        if (tile.group) {
          checkAndTriggerMonopoly(playerIdx, tile.group);
        }
        saveCurrentMatchToStorage();
        if (networkState.isMultiplayer && networkState.isHost) {
          broadcastFullGameState();
        }
      }
    },
    onMonopoly: (playerIdx, groupKey) => {
      openMonopolyCelebrationModal(playerIdx, groupKey);
    },
    onUpgradeCity: (playerIdx, tileId, count = 1) => {
      const st = gameState.properties[tileId];
      const tile = BOARD_TILES[tileId];
      const p = gameState.players[playerIdx];
      if (st && tile && p) {
        const upgradeTimes = count || 1;
        p.cash -= tile.houseCost * upgradeTimes;
        st.level += upgradeTimes;
        playSFX('build', 1.0, getTileWorldPosition(tileId));
        spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(tile.houseCost * upgradeTimes)}`, false);
        logEvent(`🏗️ <strong>${p.name}</strong> upgraded <strong>${tile.name}</strong> to level ${st.level}!`);
        refreshTileTextureAndBuildings(tileId);
        renderCornerHUDs();
        saveCurrentMatchToStorage();
        if (networkState.isMultiplayer && networkState.isHost) {
          broadcastFullGameState();
        }
      }
    },
    onTradeAction: (msg) => {
      if (msg.type === 'ACTION_TRADE_OFFER') {
        if (msg.targetIdx === networkState.localPlayerIdx && msg.proposal) {
          showIncomingTradeOfferModal(msg.proposal);
        }
      } else if (msg.type === 'ACTION_TRADE_RESPONSE') {
        const p = msg.proposal;
        if (p) {
          const proposerIdx = p.proposerIdx !== undefined ? p.proposerIdx : p.giverIdx;
          const targetIdx = p.targetIdx !== undefined ? p.targetIdx : p.receiverIdx;
          if (msg.accepted) {
            completeTradeTransfer(proposerIdx, targetIdx, p.offerCash, p.reqCash, p.offerTileIds, p.reqTileIds);
            const proposer = gameState.players[proposerIdx];
            const target = gameState.players[targetIdx];
            logEvent(`🤝 <strong>Trade Deal Struck!</strong> ${target ? target.name : 'Player'} accepted ${proposer ? proposer.name : 'Player'}'s proposal.`);
          } else {
            const target = gameState.players[targetIdx];
            logEvent(`❌ <strong>${target ? target.name : 'Player'}</strong> declined the trade offer.`);
          }
        }
        closeIncomingTradeModal();
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
        playSFX('build', 1.0, getTileWorldPosition(tileId));
        spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(buyoutCost)}`, false);
        if (prevOwner) spawnFloatingCashOnHUD(prevOwnerIdx, `+${fmtMoney(buyoutCost)}`, true);
        logEvent(`⚔️ <strong>${buyer.name}</strong> bought out <strong>${BOARD_TILES[tileId]?.name || 'City'}</strong> from <strong>${prevOwner ? prevOwner.name : 'Opponent'}</strong>!`);
        refreshTileTextureAndBuildings(tileId);
        renderCornerHUDs();
        saveCurrentMatchToStorage();
        if (networkState.isMultiplayer && networkState.isHost) {
          broadcastFullGameState();
        }
      }
    },
    onWorldTour: (playerIdx, destTileId) => {
      executeWorldTourFlight(destTileId, true, playerIdx, evaluateTileLanding);
    },
    onChanceSpin: (playerIdx, prizeIdx, fullSpins, isDoubles) => {
      executeRemoteChanceSpin(playerIdx, prizeIdx, fullSpins, isDoubles);
    },
    onChancePrize: (playerIdx, prize, isDoubles) => {
      showChanceAwardPopup(prize, async () => {
        await applyChancePrize(playerIdx, prize, isDoubles, true, false);
      }, playerIdx);
    },
    onEndTurn: (nextPlayerIdx) => {
      advanceTurn(true, nextPlayerIdx);
    },
    onPlayerConvertedToAI: (leavingIdx) => {
      if (gameState.players && gameState.players[leavingIdx]) {
        gameState.players[leavingIdx].isAI = true;
        if (gameState.currentPlayerIdx === leavingIdx) {
          if (gameState.phase === 'ROLL') {
            executePlayerRoll();
          } else if (gameState.phase === 'END') {
            advanceTurn();
          } else if (gameState.phase === 'MODAL' || gameState.phase === 'WORLD_TOUR') {
            if (window.closeAllGameModals) window.closeAllGameModals();
            if (window.concludeActionPhase) window.concludeActionPhase(false);
          }
        }
      }
    },
    onSyncState: (incomingState) => {
      if (!incomingState) return;
      if (incomingState.properties) {
        Object.keys(incomingState.properties).forEach(id => {
          const src = incomingState.properties[id];
          if (!src) return;
          const tid = Number(id);
          if (!gameState.properties[tid]) {
            gameState.properties[tid] = { ...src, festivalBoost: Boolean(src.festivalBoost || src.festival) };
          } else {
            gameState.properties[tid].owner = src.owner;
            gameState.properties[tid].level = src.level;
            gameState.properties[tid].festivalBoost = Boolean(src.festivalBoost || src.festival);
          }
          refreshTileTextureAndBuildings(tid);
        });
      }
      if (incomingState.players && Array.isArray(incomingState.players)) {
        incomingState.players.forEach((srcP, idx) => {
          const p = gameState.players[idx];
          if (p && srcP) {
            if (srcP.name) p.name = srcP.name;
            if (srcP.isAI !== undefined) p.isAI = Boolean(srcP.isAI);
            p.cash = srcP.cash;
            p.position = srcP.position;
            p.bankrupt = Boolean(srcP.bankrupt);
            p.inIsland = Boolean(srcP.inIsland);
            p.islandTurns = srcP.islandTurns || 0;
          }
        });
        updatePlayerTokenPositions3D();
      }
      if (typeof incomingState.festivalPot === 'number') {
        gameState.festivalPot = incomingState.festivalPot;
      }
      if (typeof incomingState.currentPlayerIdx === 'number' && gameState.phase !== 'SETUP') {
        gameState.currentPlayerIdx = incomingState.currentPlayerIdx;
        refreshActivePlayerTurnStatus();
      }
      if (typeof incomingState.doublesCount === 'number') {
        gameState.doublesCount = incomingState.doublesCount;
      }
      if (typeof incomingState.turnTimeLeft === 'number') {
        gameState.turnTimeLeft = incomingState.turnTimeLeft;
      }
      if (incomingState.phase && gameState.phase !== 'SETUP' && gameState.phase !== 'VICTORY') {
        gameState.phase = incomingState.phase;
      }
      renderCornerHUDs();
      updateRollButtonsUI(isHumanTurnActionable());
    }
  });
}

export function startNewMatch() {
  stopVictoryCelebration();
  closeAllGameModals();
  document.getElementById('modal-setup')?.classList.add('hidden');
  document.getElementById('modal-setup')?.classList.remove('flex');

  const landing = document.getElementById('landing-setup-screen');
  if (landing) {
    landing.classList.add('hidden');
    landing.classList.remove('flex');
    landing.style.setProperty('display', 'none', 'important');
  }

  cancelAllGameTimers();
  clearSavedMatch();
  resetGameStateForNewMatch(lobbyPlayerCount);
  resetLocalCarAnimationClock();
  startAdaptiveMusic();

  gameState.netWorthHistory = [];
  recordNetWorthSnapshot();

  BOARD_TILES.forEach(t => {
    refreshTileTextureAndBuildings(t.id);
  });

  // Reveal in-game HUD layers
  const hudBar = document.getElementById('main-game-hud-bar');
  if (hudBar) {
    hudBar.classList.remove('hidden');
    hudBar.style.removeProperty('display');
  }
  const hudLeft = document.getElementById('hud-left-players');
  if (hudLeft) {
    hudLeft.classList.remove('hidden');
    hudLeft.style.removeProperty('display');
  }
  const hudRight = document.getElementById('hud-right-players');
  if (hudRight) {
    hudRight.classList.remove('hidden');
    hudRight.style.removeProperty('display');
  }

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

  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastFullGameState();
  }

  const controller = PlayerControllerFactory.create(gameState.currentPlayerIdx);
  controller.onTurnStart({ executeRollFn: executePlayerRoll });
}

/**
 * Cleanly terminate the active match and return to the lobby.
 * Ensures the match does NOT keep running in the background.
 * @param {boolean} [isRemote=false] - True if triggered remotely by Host
 */
export function terminateMatchAndReturnToLobby(isRemote = false) {
  cancelAllGameTimers();

  gameState.gameStarted = false;
  gameState.phase = 'SETUP';
  gameState.activeInspectorTile = null;
  gameState.pendingBuyTile = null;
  gameState.auction = null;

  clearSavedMatch();
  stopVictoryCelebration();
  stopAdaptiveMusic();
  closeAllGameModals();

  try {
    setTileHighlightRing(0, false);
  } catch (_) {}

  // Hide all in-game overlays and badges
  const hudBar = document.getElementById('main-game-hud-bar');
  if (hudBar) {
    hudBar.classList.add('hidden');
    hudBar.style.setProperty('display', 'none', 'important');
  }
  const hudLeft = document.getElementById('hud-left-players');
  if (hudLeft) {
    hudLeft.classList.add('hidden');
    hudLeft.style.setProperty('display', 'none', 'important');
  }
  const hudRight = document.getElementById('hud-right-players');
  if (hudRight) {
    hudRight.classList.add('hidden');
    hudRight.style.setProperty('display', 'none', 'important');
  }
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
  if (diceSumBadge) {
    diceSumBadge.classList.add('hidden');
    diceSumBadge.style.setProperty('display', 'none', 'important');
  }
  const statusWrap = document.getElementById('hud-bottom-status-wrap');
  if (statusWrap) {
    statusWrap.classList.add('hidden');
    statusWrap.style.setProperty('display', 'none', 'important');
  }

  if (networkState.isMultiplayer) {
    if (networkState.isHost) {
      broadcastReturnToLobby();
      logEvent('👑 Host returned table to lobby.');
    } else if (!isRemote) {
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

if (typeof window !== 'undefined') {
  window.handleRollButtonClick = handleRollButtonClick;
  window.handlePayIslandBail = handlePayIslandBail;
  window.cancelAllGameTimers = cancelAllGameTimers;
  window.startNewMatch = startNewMatch;
  window.terminateMatchAndReturnToLobby = terminateMatchAndReturnToLobby;
  window.resumeActiveTurn = resumeActiveTurn;
  window.executeWorldTourFlight = (destTileId) => executeWorldTourFlight(destTileId, false, null, evaluateTileLanding);
}
