/**
 * main.js
 * Application entry point for Vite / Modern browsers.
 */

import { PLAYER_THEMES } from './game/data.js';
import { gameState, toggleSoundEnabled, incrementMatchSeconds, matchSeconds, soundEnabled, matchSettings, isHumanTurnActionable } from './game/state.js';
import { initThreeScene, resetCameraView, rotateBoardLeft, rotateBoardRight, getSceneLighting } from './three/scene.js';
import {
  initEngine,
  startNewMatch,
  handleRollButtonClick,
  executeWorldTourFlight,
  handlePayIslandBail,
  terminateMatchAndReturnToLobby
} from './game/engine.js';
import {
  initLandingSetup,
  setPlayerCount,
  setPlayerSetupName,
  togglePlayerRole,
  setPlayerArchetype,
  setPlayerColor,
  randomizeAllNames,
  randomizeSinglePlayerName,
  setStartingCash,
  setTurnTimerDuration,
  setAtmosphereMode,
  startGameFromLandingPage,
  selectMatchMode,
  hostP2PRoom,
  joinP2PRoom,
  leaveP2PRoom,
  addBotOrSlot,
  removeBotOrSlot,
  cycleAvatarPrev,
  cycleAvatarNext,
  setLocalPlayerColor,
  stepDecisionTime,
  stepMatchLength,
  renderPlayerCards,
  renderMatchSettingButtons
} from './ui/setup.js';
import {
  networkState,
  broadcastAction,
  copyRoomInviteLink,
  copyRoomCodeOnly,
  returnToLobbyFromDisconnect,
  updateMultiplayerUI
} from './network/p2p.js';
import {
  saveCurrentMatchToStorage,
  clearSavedMatch,
  resumeSavedMatch,
  checkAndPromptResumeMatch,
  closeResumeModal
} from './game/persistence.js';
import {
  openBuyCityModal,
  confirmBuyCity,
  passBuyCity,
  openUpgradeCityModal,
  closeUpgradeCityModal,
  confirmUpgradeFromModal,
  confirmUpgradeTwoLevelsFromModal,
  startCityAuction,
  placeAuctionBid,
  passAuctionBid,
  spinChanceWheel,
  openInspectorModal,
  closeInspectorModal,
  upgradeCityLevel,
  downgradeCityLevel,
  toggleCityMortgage,
  openPortfolioModal,
  closePortfolioModal,
  openTradeModal,
  closeTradeModal,
  populateTradePartnerProps,
  executeTradeOffer,
  openRulesModal,
  closeRulesModal,
  toggleEmotePopover,
  sendQuickEmote,
  toggleEventLogDrawer,
  closeMonopolyModal,
  showVictoryModal,
  closeVictoryAndPlayAgain,
  handlePlayAgainAction,
  handleReturnToLobbyFromVictory,
  closeAllGameModals,
  openSetupModal,
  openConfirmExitLobbyModal,
  closeConfirmExitLobbyModal,
  handleLobbyButtonClick,
  confirmExitToLobbyAction
} from './ui/modals.js';
import {
  fireConfettiBurst,
  spawnAnimatedReaction,
  cycleLightingMode,
  applyLightingMode,
  startVictoryCelebration,
  stopVictoryCelebration
} from './three/effects.js';

// Expose handlers to window for HTML onclick attributes
window.showVictoryModal = showVictoryModal;
window.closeVictoryAndPlayAgain = closeVictoryAndPlayAgain;
window.handlePlayAgainAction = handlePlayAgainAction;
window.handleReturnToLobbyFromVictory = handleReturnToLobbyFromVictory;
window.closeAllGameModals = closeAllGameModals;
window.startNewMatch = startNewMatch;
window.openSetupModal = openSetupModal;
window.openConfirmExitLobbyModal = openConfirmExitLobbyModal;
window.closeConfirmExitLobbyModal = closeConfirmExitLobbyModal;
window.handleLobbyButtonClick = handleLobbyButtonClick;
window.confirmExitToLobbyAction = confirmExitToLobbyAction;
window.terminateMatchAndReturnToLobby = terminateMatchAndReturnToLobby;
window.startVictoryCelebration = startVictoryCelebration;
window.stopVictoryCelebration = stopVictoryCelebration;
window.triggerVictoryTest = () => {
  const p = (gameState.players && gameState.players[0]) || { id: 0, name: 'Player 1', cash: 5400000, isAI: false };
  showVictoryModal(p);
};
window.openLandingSetupScreen = () => {
  const el = document.getElementById('landing-setup-screen');
  if (el) {
    el.classList.remove('hidden');
    el.style.display = 'flex';
    el.style.opacity = '1';
    el.style.transform = 'scale(1) translateY(0)';
  }
  if (networkState.isMultiplayer) {
    selectMatchMode('online', false);
    updateMultiplayerUI();
  } else {
    selectMatchMode('local', false);
  }
  renderPlayerCards();
  renderMatchSettingButtons();
};
window.setPlayerCount = setPlayerCount;
window.setPlayerSetupName = setPlayerSetupName;
window.togglePlayerRole = togglePlayerRole;
window.setPlayerArchetype = setPlayerArchetype;
window.setPlayerColor = setPlayerColor;
window.randomizeAllNames = randomizeAllNames;
window.randomizeSinglePlayerName = randomizeSinglePlayerName;
window.setStartingCash = setStartingCash;
window.setTurnTimerDuration = setTurnTimerDuration;
window.setAtmosphereMode = setAtmosphereMode;
window.startGameFromLandingPage = startGameFromLandingPage;
window.addBotOrSlot = addBotOrSlot;
window.removeBotOrSlot = removeBotOrSlot;
window.cycleAvatarPrev = cycleAvatarPrev;
window.cycleAvatarNext = cycleAvatarNext;
window.setLocalPlayerColor = setLocalPlayerColor;
window.stepDecisionTime = stepDecisionTime;
window.stepMatchLength = stepMatchLength;

// P2P Multiplayer Window Handlers
window.selectMatchMode = selectMatchMode;
window.hostP2PRoom = hostP2PRoom;
window.joinP2PRoom = joinP2PRoom;
window.leaveP2PRoom = leaveP2PRoom;
window.copyRoomInviteLink = copyRoomInviteLink;
window.copyRoomCodeOnly = copyRoomCodeOnly;

window.handleRollButtonClick = handleRollButtonClick;
window.handlePayIslandBail = handlePayIslandBail;
window.openPortfolioModal = openPortfolioModal;
window.closePortfolioModal = closePortfolioModal;
window.openTradeModal = openTradeModal;
window.closeTradeModal = closeTradeModal;
window.populateTradePartnerProps = populateTradePartnerProps;
window.executeTradeOffer = executeTradeOffer;
window.resetCameraView = resetCameraView;
window.rotateBoardLeft = rotateBoardLeft;
window.rotateBoardRight = rotateBoardRight;
window.openRulesModal = openRulesModal;
window.closeRulesModal = closeRulesModal;
window.toggleEventLogDrawer = toggleEventLogDrawer;
window.toggleEmotePopover = toggleEmotePopover;
window.sendQuickEmote = sendQuickEmote;
window.confirmBuyCity = confirmBuyCity;
window.passBuyCity = passBuyCity;
window.openUpgradeCityModal = openUpgradeCityModal;
window.closeUpgradeCityModal = closeUpgradeCityModal;
window.confirmUpgradeFromModal = confirmUpgradeFromModal;
window.confirmUpgradeTwoLevelsFromModal = confirmUpgradeTwoLevelsFromModal;
window.startCityAuction = startCityAuction;
window.placeAuctionBid = placeAuctionBid;
window.passAuctionBid = passAuctionBid;
window.spinChanceWheel = spinChanceWheel;
window.closeInspectorModal = closeInspectorModal;
window.upgradeCityLevel = upgradeCityLevel;
window.downgradeCityLevel = downgradeCityLevel;
window.toggleCityMortgage = toggleCityMortgage;
window.closeMonopolyModal = closeMonopolyModal;

// Resume & Disconnect Handlers
window.resumeLastSavedMatch = resumeSavedMatch;
window.discardSavedMatch = () => {
  clearSavedMatch();
  closeResumeModal();
};
window.returnToLobbyFromDisconnect = returnToLobbyFromDisconnect;

// Window refresh / unload warning & match persistence
window.addEventListener('beforeunload', (e) => {
  if (gameState.gameStarted && gameState.players?.some(p => !p.bankrupt)) {
    saveCurrentMatchToStorage();
    e.preventDefault();
    e.returnValue = 'A match is in progress. Are you sure you want to refresh or leave?';
    return e.returnValue;
  }
});

window.cycleLightingMode = () => {
  cycleLightingMode(getSceneLighting());
};

window.triggerReaction = (type) => {
  spawnAnimatedReaction(type);
  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_REACTION', { reactionType: type });
  }
  if (type === 'tomato') {
    const elCounter = document.getElementById('tomato-counter');
    if (elCounter) {
      elCounter.textContent = (parseInt(elCounter.textContent, 10) || 0) + 1;
    }
  }
};

window.fireConfetti = (x, y) => {
  fireConfettiBurst(x, y);
};

window.toggleSound = () => {
  toggleSoundEnabled();
  const btn = document.getElementById('btn-sound');
  if (btn) {
    btn.innerHTML = soundEnabled
      ? '<i class="fa-solid fa-volume-high text-xs"></i>'
      : '<i class="fa-solid fa-volume-xmark text-xs text-rose-400"></i>';
  }
};

// Tile click delegation from 3D scene
function onTileClick(tileId) {
  const isHumanTurn = networkState.isMultiplayer
    ? gameState.currentPlayerIdx === networkState.localPlayerIdx
    : !gameState.players[gameState.currentPlayerIdx]?.isAI;

  if (gameState.phase === 'WORLD_TOUR' && isHumanTurn) {
    executeWorldTourFlight(tileId);
  } else {
    const m = document.getElementById('modal-tile-inspector');
    if (m && !m.classList.contains('hidden') && gameState.activeInspectorTile === tileId) {
      closeInspectorModal();
      return;
    }
    openInspectorModal(tileId);
  }
}

// Bootstrap
function initApp() {
  initEngine();
  initThreeScene(onTileClick);
  initLandingSetup();

  // Apply initial lighting mode
  applyLightingMode(matchSettings.lightingTheme || 'day', getSceneLighting());

  // Check if an unfinished match exists to offer resume
  checkAndPromptResumeMatch();

  // Clock & Turn Timer Loop
  setInterval(() => {
    if (!gameState.gameStarted) return;
    incrementMatchSeconds();
    const mins = String(Math.floor(matchSeconds / 60)).padStart(2, '0');
    const secs = String(matchSeconds % 60).padStart(2, '0');
    const clockEl = document.getElementById('hud-game-clock');
    if (clockEl) clockEl.textContent = `${mins}:${secs}`;

    const currentPlayer = gameState.players && gameState.players[gameState.currentPlayerIdx];
    if (gameState.phase === 'ROLL' && currentPlayer) {
      gameState.turnTimeLeft = Math.max(0, gameState.turnTimeLeft - 1);
      const timerText = document.getElementById('turn-timer-text');
      if (timerText) timerText.textContent = gameState.turnTimeLeft;
      const turnMax = matchSettings.turnDuration || 15;
      const offset = 113 - (gameState.turnTimeLeft / turnMax) * 113;
      const ring = document.getElementById('turn-timer-ring');
      if (ring) ring.style.strokeDashoffset = offset;

      if (gameState.turnTimeLeft === 0 && isHumanTurnActionable()) {
        gameState.turnTimeLeft = turnMax;
        handleRollButtonClick();
      }
    }
  }, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
