/**
 * main.js
 * Application entry point for Vite / Modern browsers.
 */

import { PLAYER_THEMES, applyBoardEdition } from './game/data.js';
import { gameState, debugState, toggleSoundEnabled, incrementMatchSeconds, matchSeconds, soundEnabled, soundVolume, setSoundVolume, matchSettings, isHumanTurnActionable } from './game/state.js';
import { updateMasterVolume, playSFX } from './game/audio.js';
import { initThreeScene, resetCameraView, rotateBoardLeft, rotateBoardRight, getSceneLighting, triggerTileButtonPress } from './three/scene.js';
import { context } from './three/core/context.js';
import { checkVictoryConditions } from './game/rules.js';
import {
  initEngine,
  startNewMatch,
  handleRollButtonClick,
  executeWorldTourFlight,
  handlePayIslandBail,
  terminateMatchAndReturnToLobby,
  cancelAllGameTimers
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
  setBoardStyle,
  cycleBoardStyle,
  setBoardEdition,
  cycleBoardEdition,
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
  renderMatchSettingButtons,
  selectSetupPlayer,
  removePlayerAt
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
import { initDebugSuite, toggleDebugPanel } from './game/debug.js';

window.gameState = gameState;
window.debugState = debugState;
window.threeContext = context;
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
  cancelAllGameTimers();
  closeAllGameModals();
  gameState.gameStarted = false;
  gameState.phase = 'SETUP';
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
  applyLightingMode(matchSettings.lightingTheme || 'day', getSceneLighting());
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
window.setBoardStyle = setBoardStyle;
window.cycleBoardStyle = cycleBoardStyle;
window.setBoardEdition = setBoardEdition;
window.cycleBoardEdition = cycleBoardEdition;
window.startGameFromLandingPage = startGameFromLandingPage;
window.addBotOrSlot = addBotOrSlot;
window.removeBotOrSlot = removeBotOrSlot;
window.cycleAvatarPrev = cycleAvatarPrev;
window.cycleAvatarNext = cycleAvatarNext;
window.setLocalPlayerColor = setLocalPlayerColor;
window.stepDecisionTime = stepDecisionTime;
window.stepMatchLength = stepMatchLength;
window.selectSetupPlayer = selectSetupPlayer;
window.removePlayerAt = removePlayerAt;

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
window.executeWorldTourFlight = executeWorldTourFlight;
window.triggerTileButtonPress = triggerTileButtonPress;
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
  renderMatchSettingButtons();
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

export function updateSoundUI() {
  const percent = soundEnabled ? Math.round(soundVolume * 100) : 0;

  // In-game HUD slider & percentage label
  const slider = document.getElementById('sound-volume-slider');
  if (slider) slider.value = percent;
  const valText = document.getElementById('sound-volume-val');
  if (valText) valText.textContent = `${percent}%`;

  // Lobby setup slider & percentage label
  const setupSlider = document.getElementById('setup-sound-slider');
  if (setupSlider) setupSlider.value = percent;
  const setupValText = document.getElementById('setup-sound-volume-val');
  if (setupValText) setupValText.textContent = `${percent}%`;

  // Icon classes based on volume level
  const isMuted = !soundEnabled || soundVolume <= 0;
  const iconClass = isMuted
    ? 'fa-solid fa-volume-xmark text-rose-500'
    : soundVolume < 0.5
      ? 'fa-solid fa-volume-low text-sky-600'
      : 'fa-solid fa-volume-high text-sky-600';

  const btnIcon = document.getElementById('btn-sound-icon');
  if (btnIcon) btnIcon.className = `${iconClass} text-xs`;

  const setupBtnIcon = document.getElementById('setup-btn-sound-icon');
  if (setupBtnIcon) setupBtnIcon.className = `${iconClass} text-sm`;
}

window.setGameVolume = (val) => {
  setSoundVolume(val);
  updateMasterVolume(soundEnabled ? soundVolume : 0);
  updateSoundUI();
};

window.toggleSound = () => {
  toggleSoundEnabled();
  updateMasterVolume(soundEnabled ? soundVolume : 0);
  updateSoundUI();
  if (soundEnabled) {
    playSFX('hop', 0.5);
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
  applyBoardEdition(matchSettings.boardEdition || 'world');
  initEngine();
  initThreeScene(onTileClick);
  initLandingSetup();
  initDebugSuite();

  // Apply initial lighting mode
  applyLightingMode(matchSettings.lightingTheme || 'day', getSceneLighting());

  // Apply initial sound volume and UI state
  updateSoundUI();
  updateMasterVolume(soundEnabled ? soundVolume : 0);

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

    // Check match time limit victory (Highest Net Worth wins)
    const timeVic = checkVictoryConditions();
    if (timeVic) {
      showVictoryModal(timeVic.winner, timeVic);
      return;
    }

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
