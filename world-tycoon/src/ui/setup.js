/**
 * ui/setup.js
 * Interactive Players Add & Match Configuration Landing Page Facade.
 *
 * Modularized into focused sub-modules:
 * - ui/setup/lobbyNavigation.js: View navigation (Title, Local, Multiplayer Portal/Room)
 * - ui/setup/playerCustomization.js: Archetypes, Candy palette, avatars, bot counts
 * - ui/setup/playerCards.js: Active players DOM roster, name editing, role toggling
 * - ui/setup/matchSettingsUI.js: Match parameters (Cash, Timer, Duration, Atmosphere, Swatches)
 * - ui/setup/setupRoom.js: Lobby initialization, P2P room hosting/joining, game launch
 */

export * from './setup/lobbyNavigation.js';
export * from './setup/playerCustomization.js';
export * from './setup/playerCards.js';
export * from './setup/matchSettingsUI.js';
export * from './setup/setupRoom.js';

import {
  setLobbyView,
  showTitleScreen,
  showLocalSetup,
  showMultiplayerSetup,
  selectMatchMode
} from './setup/lobbyNavigation.js';

import {
  canCurrentPlayerEditSlot,
  selectSetupPlayer,
  setPlayerCount,
  addBotOrSlot,
  removePlayerAt,
  removeBotOrSlot,
  cycleAvatarPrev,
  cycleAvatarNext,
  setLocalPlayerColor,
  setPlayerColor,
  setPlayerArchetype,
  randomizeAllNames,
  randomizeSinglePlayerName
} from './setup/playerCustomization.js';

import {
  renderPlayerCards,
  setPlayerSetupName,
  togglePlayerRole
} from './setup/playerCards.js';

import {
  setStartingCash,
  stepDecisionTime,
  stepMatchDuration,
  stepAtmosphere,
  stepMatchLength,
  setTurnTimerDuration,
  setAtmosphereMode,
  setBoardStyle,
  cycleBoardStyle,
  setBoardEdition,
  cycleBoardEdition,
  renderMatchSettingButtons
} from './setup/matchSettingsUI.js';

import {
  initLandingSetup,
  joinP2PRoomFromPortal,
  hostP2PRoom,
  joinP2PRoom,
  leaveP2PRoom,
  startGameFromLandingPage,
  openLandingSetupScreen
} from './setup/setupRoom.js';

// Expose on window for inline HTML onclick and interaction handlers
if (typeof window !== 'undefined') {
  window.setLobbyView = setLobbyView;
  window.showTitleScreen = showTitleScreen;
  window.showLocalSetup = showLocalSetup;
  window.showMultiplayerSetup = showMultiplayerSetup;
  window.selectMatchMode = selectMatchMode;

  window.canCurrentPlayerEditSlot = canCurrentPlayerEditSlot;
  window.selectSetupPlayer = selectSetupPlayer;
  window.setPlayerCount = setPlayerCount;
  window.addBotOrSlot = addBotOrSlot;
  window.removePlayerAt = removePlayerAt;
  window.removeBotOrSlot = removeBotOrSlot;
  window.cycleAvatarPrev = cycleAvatarPrev;
  window.cycleAvatarNext = cycleAvatarNext;
  window.setLocalPlayerColor = setLocalPlayerColor;
  window.setPlayerColor = setPlayerColor;
  window.setPlayerArchetype = setPlayerArchetype;
  window.randomizeAllNames = randomizeAllNames;
  window.randomizeSinglePlayerName = randomizeSinglePlayerName;

  window.renderPlayerCards = renderPlayerCards;
  window.setPlayerSetupName = setPlayerSetupName;
  window.togglePlayerRole = togglePlayerRole;

  window.setStartingCash = setStartingCash;
  window.stepDecisionTime = stepDecisionTime;
  window.stepMatchDuration = stepMatchDuration;
  window.stepAtmosphere = stepAtmosphere;
  window.stepMatchLength = stepMatchLength;
  window.setTurnTimerDuration = setTurnTimerDuration;
  window.setAtmosphereMode = setAtmosphereMode;
  window.setBoardStyle = setBoardStyle;
  window.cycleBoardStyle = cycleBoardStyle;
  window.setBoardEdition = setBoardEdition;
  window.cycleBoardEdition = cycleBoardEdition;
  window.renderMatchSettingButtons = renderMatchSettingButtons;

  window.initLandingSetup = initLandingSetup;
  window.joinP2PRoomFromPortal = joinP2PRoomFromPortal;
  window.hostP2PRoom = hostP2PRoom;
  window.joinP2PRoom = joinP2PRoom;
  window.leaveP2PRoom = leaveP2PRoom;
  window.startGameFromLandingPage = startGameFromLandingPage;
  window.openLandingSetupScreen = openLandingSetupScreen;
}
