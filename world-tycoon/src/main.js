/**
 * main.js
 * Application entry point for Vite / Modern browsers.
 */

import { PLAYER_THEMES, applyBoardEdition } from './game/data.js';
import { gameState, debugState, toggleSoundEnabled, incrementMatchSeconds, matchSeconds, soundEnabled, soundVolume, setSoundVolume, matchSettings, isHumanTurnActionable, cycleGameSpeed } from './game/state.js';
import { updateMasterVolume, playSFX, initAudioUnlock, startAdaptiveMusic, stopAdaptiveMusic } from './game/audio.js';
import { updateGameSpeedUI } from './ui/hud.js';
import { initThreeScene, initTheatreSuite, resetCameraView, rotateBoardLeft, rotateBoardRight, getSceneLighting, triggerTileButtonPress } from './three/scene.js';
import { context } from './three/core/context.js';
import { checkVictoryConditions } from './game/rules.js';
import {
  initEngine,
  startNewMatch,
  handleRollButtonClick,
  executeWorldTourFlight,
  handlePayIslandBail,
  terminateMatchAndReturnToLobby,
  cancelAllGameTimers,
  resumeActiveTurn,
  executePlayerRoll,
  evaluateTileLanding
} from './game/engine.js';
import { BOARD_TILES } from './game/data.js';
import { container } from './core/Container.js';
import { eventBus } from './core/EventBus.js';
import { GameEvents } from './core/Events.js';
window.BOARD_TILES = BOARD_TILES;
window.evaluateTileLanding = evaluateTileLanding;
window.executePlayerRoll = executePlayerRoll;
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
  stepMatchDuration,
  stepAtmosphere,
  stepMatchLength,
  renderPlayerCards,
  renderMatchSettingButtons,
  selectSetupPlayer,
  removePlayerAt,
  openLandingSetupScreen,
  showTitleScreen,
  showLocalSetup,
  showMultiplayerSetup,
  setLobbyView,
  joinP2PRoomFromPortal
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
  openBuyoutCityModal,
  calculateBuyoutCost,
  confirmBuyoutCity,
  passBuyoutCity,
  openSellCitiesModal,
  sellPropertyForRent,
  autoSellCheapestForRent,
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
  acceptTradeCounterOffer,
  rejectTradeCounterOffer,
  showIncomingTradeOfferModal,
  acceptIncomingTrade,
  counterIncomingTrade,
  declineIncomingTrade,
  closeIncomingTradeModal,
  renderNetWorthTimelineChart,
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
  confirmExitToLobbyAction,
  openLeaderboardModal,
  closeLeaderboardModal,
  toggleLeaderboardModal,
  renderLeaderboardModal,
  openMonopolyCelebrationModal,
  setLobbyCount
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
import {
  initWardrobeSystem,
  openWardrobeModal,
  closeWardrobeModal,
  setWardrobeCategory,
  equipItem as equipWardrobeItem,
  unlockItem as unlockWardrobeItem,
  previewWardrobeItem
} from './ui/wardrobe.js';

// Register core services in IoC container for dependency inversion (DIP)
container
  .register('gameState', gameState)
  .register('debugState', debugState)
  .register('threeContext', context)
  .register('audio', { playSFX, updateMasterVolume, startAdaptiveMusic, stopAdaptiveMusic });

window.appContainer = container;
window.eventBus = eventBus;
window.GameEvents = GameEvents;
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
window.setLobbyCount = setLobbyCount;
window.openConfirmExitLobbyModal = openConfirmExitLobbyModal;
window.closeConfirmExitLobbyModal = closeConfirmExitLobbyModal;
window.handleLobbyButtonClick = handleLobbyButtonClick;
window.confirmExitToLobbyAction = confirmExitToLobbyAction;
window.terminateMatchAndReturnToLobby = terminateMatchAndReturnToLobby;
window.startVictoryCelebration = startVictoryCelebration;
window.stopVictoryCelebration = stopVictoryCelebration;
window.openMonopolyCelebrationModal = openMonopolyCelebrationModal;
window.triggerMonopolyTest = (grp = 'brown') => openMonopolyCelebrationModal(0, grp);
window.triggerVictoryTest = () => {
  const p = (gameState.players && gameState.players[0]) || { id: 0, name: 'Player 1', cash: 5400000, isAI: false };
  showVictoryModal(p);
};
window.openLandingSetupScreen = openLandingSetupScreen;
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
window.stepMatchDuration = stepMatchDuration;
window.stepAtmosphere = stepAtmosphere;
window.stepMatchLength = stepMatchLength;
window.selectSetupPlayer = selectSetupPlayer;
window.removePlayerAt = removePlayerAt;

// Title Screen & P2P Multiplayer Window Handlers
window.showTitleScreen = showTitleScreen;
window.showLocalSetup = showLocalSetup;
window.showMultiplayerSetup = showMultiplayerSetup;
window.setLobbyView = setLobbyView;
window.joinP2PRoomFromPortal = joinP2PRoomFromPortal;
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
window.acceptTradeCounterOffer = acceptTradeCounterOffer;
window.rejectTradeCounterOffer = rejectTradeCounterOffer;
window.showIncomingTradeOfferModal = showIncomingTradeOfferModal;
window.acceptIncomingTrade = acceptIncomingTrade;
window.counterIncomingTrade = counterIncomingTrade;
window.declineIncomingTrade = declineIncomingTrade;
window.closeIncomingTradeModal = closeIncomingTradeModal;
window.renderNetWorthTimelineChart = renderNetWorthTimelineChart;
window.cycleGameSpeed = cycleGameSpeed;
window.updateGameSpeedUI = updateGameSpeedUI;
window.resetCameraView = resetCameraView;
window.rotateBoardLeft = rotateBoardLeft;
window.rotateBoardRight = rotateBoardRight;
window.openRulesModal = openRulesModal;
window.closeRulesModal = closeRulesModal;
window.toggleEventLogDrawer = toggleEventLogDrawer;
window.toggleEmotePopover = toggleEmotePopover;
window.sendQuickEmote = sendQuickEmote;
window.openBuyCityModal = openBuyCityModal;
window.confirmBuyCity = confirmBuyCity;
window.passBuyCity = passBuyCity;
window.openBuyoutCityModal = openBuyoutCityModal;
window.calculateBuyoutCost = calculateBuyoutCost;
window.confirmBuyoutCity = confirmBuyoutCity;
window.passBuyoutCity = passBuyoutCity;
window.openSellCitiesModal = openSellCitiesModal;
window.sellPropertyForRent = sellPropertyForRent;
window.autoSellCheapestForRent = autoSellCheapestForRent;
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
window.openLeaderboardModal = openLeaderboardModal;
window.closeLeaderboardModal = closeLeaderboardModal;
window.toggleLeaderboardModal = toggleLeaderboardModal;
window.renderLeaderboardModal = renderLeaderboardModal;

// Wardrobe & Cosmetics System
window.openWardrobeModal = openWardrobeModal;
window.closeWardrobeModal = closeWardrobeModal;
window.setWardrobeCategory = setWardrobeCategory;
window.equipWardrobeItem = equipWardrobeItem;
window.unlockWardrobeItem = unlockWardrobeItem;
window.previewWardrobeItem = previewWardrobeItem;

// Resume & Disconnect Handlers
window.resumeLastSavedMatch = () => {
  const success = resumeSavedMatch();
  if (success) {
    resumeActiveTurn();
  }
};
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
    playSFX('click', 0.8);
    if (gameState && gameState.gameStarted && gameState.phase !== 'VICTORY') {
      startAdaptiveMusic();
    }
  } else {
    stopAdaptiveMusic();
  }
};

// Tile click delegation from 3D scene
function onTileClick(tileId) {
  if (typeof tileId !== 'number' || tileId < 0 || tileId > 31) return;

  const isHumanTurn = networkState.isMultiplayer
    ? gameState.currentPlayerIdx === networkState.localPlayerIdx
    : !gameState.players[gameState.currentPlayerIdx]?.isAI;

  if (gameState.phase === 'WORLD_TOUR') {
    if (isHumanTurn) {
      executeWorldTourFlight(tileId);
    }
    return;
  }

  const m = document.getElementById('modal-tile-inspector');
  if (m && !m.classList.contains('hidden') && gameState.activeInspectorTile === tileId) {
    closeInspectorModal();
    return;
  }
  openInspectorModal(tileId);
}

// Bootstrap
function initApp() {
  applyBoardEdition(matchSettings.boardEdition || 'world');
  initEngine();
  initThreeScene(onTileClick);
  initLandingSetup();
  initWardrobeSystem();
  initDebugSuite();
  initTheatreSuite();

  // Apply initial lighting mode
  applyLightingMode(matchSettings.lightingTheme || 'day', getSceneLighting());

  // Apply initial sound volume and UI state
  initAudioUnlock();
  updateSoundUI();
  updateMasterVolume(soundEnabled ? soundVolume : 0);
  updateGameSpeedUI();

  // Check if an unfinished match exists to offer resume
  checkAndPromptResumeMatch();

  // Clock & Turn Timer Loop
  setInterval(() => {
    if (!gameState.gameStarted || gameState.phase === 'VICTORY' || gameState.phase === 'SETUP') return;
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

    // Live refresh leaderboard if open
    const lbEl = document.getElementById('modal-leaderboard');
    if (lbEl && !lbEl.classList.contains('hidden')) {
      renderLeaderboardModal();
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

      if (gameState.turnTimeLeft === 0) {
        gameState.turnTimeLeft = turnMax;
        if (isHumanTurnActionable()) {
          handleRollButtonClick();
        } else if (currentPlayer.isAI && (!networkState.isMultiplayer || networkState.isHost)) {
          executePlayerRoll();
        } else if (networkState.isMultiplayer && networkState.isHost && !isHumanTurnActionable()) {
          // Remote peer AFK fallback on Host: Auto-roll on timeout to prevent match stall
          executePlayerRoll();
        }
      }
    }
  }, 1000);

  // Keyboard hotkeys for Leaderboard (Tab or L), Space to Roll, and Esc
  window.addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.code === 'Space' || e.key === ' ') {
      const hasActiveModal = document.querySelector('.game-modal-shell:not(.hidden), #modal-chance-result:not(.hidden), #modal-portfolio:not(.hidden), #modal-trade:not(.hidden), #modal-rules:not(.hidden), #modal-leaderboard:not(.hidden), #modal-wardrobe:not(.hidden)');
      if (!hasActiveModal && gameState.gameStarted && (gameState.phase === 'ROLL' || gameState.phase === 'END') && isHumanTurnActionable()) {
        e.preventDefault();
        handleRollButtonClick();
        return;
      }
    }
    if (e.key === 'Tab' || e.key === 'l' || e.key === 'L') {
      if (gameState.gameStarted && gameState.phase !== 'SETUP') {
        e.preventDefault();
        toggleLeaderboardModal();
      }
    } else if (e.key === 'Escape') {
      if (!document.getElementById('modal-leaderboard')?.classList.contains('hidden')) {
        closeLeaderboardModal();
      } else if (!document.getElementById('modal-wardrobe')?.classList.contains('hidden')) {
        closeWardrobeModal();
      } else if (!document.getElementById('modal-rules')?.classList.contains('hidden')) {
        closeRulesModal();
      } else if (!document.getElementById('modal-portfolio')?.classList.contains('hidden')) {
        closePortfolioModal();
      } else if (!document.getElementById('modal-trade')?.classList.contains('hidden')) {
        closeTradeModal();
      } else if (!document.getElementById('modal-tile-inspector')?.classList.contains('hidden')) {
        closeInspectorModal();
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
