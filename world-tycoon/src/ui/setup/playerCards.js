/**
 * ui/setup/playerCards.js
 * Renders the roster of player cards, names, roles (Human/AI), and podium selection.
 */

import { matchSettings, lobbyPlayerCount, setupPlayers, gameState, savePlayerName, getSavedPlayerName } from '../../game/state.js';
import { PLAYER_THEMES } from '../../game/data.js';
import { playSFX } from '../../game/audio.js';
import { renderCornerHUDs, showTurnLockToast } from '../hud.js';
import { updateLobbyHeroAvatar } from '../../three/scene.js';
import { networkState, broadcastLobbySettings, sendClientProfileUpdate, broadcastFullGameState, broadcastAction } from '../../network/p2p.js';
import {
  ARCHETYPES,
  canCurrentPlayerEditSlot,
  selectedSetupPlayerIdx,
  setSelectedSetupPlayerIdx,
  FIXED_AI_NAMES,
  generateRandomBotAppearance
} from './playerCustomization.js';
import { currentLobbyView } from './lobbyNavigation.js';
import { updateLobbyStore } from '../../svelte/stores/lobbyStore.js';
import { validateTeamModeBalance } from '../../game/rules.js';

export function renderPlayerCards() {
  const isGuest = networkState.isMultiplayer && !networkState.isHost;

  if (networkState.isMultiplayer) {
    if (!canCurrentPlayerEditSlot(selectedSetupPlayerIdx)) {
      setSelectedSetupPlayerIdx(isGuest ? networkState.localPlayerIdx : 0);
    }
  } else if (selectedSetupPlayerIdx >= lobbyPlayerCount) {
    setSelectedSetupPlayerIdx(0);
  }

  // Update top bar profile badge
  const p0 = matchSettings.customPlayers[0];
  const mySelfIdx = isGuest ? (networkState.localPlayerIdx || 0) : 0;
  const selfP = matchSettings.customPlayers[mySelfIdx] || p0;
  const currentSavedName = getSavedPlayerName();
  const activeDisplayName = selfP?.name || currentSavedName || 'TYCOON';

  const profileNameEl = document.getElementById('setup-profile-name');
  const profileAvatarEl = document.getElementById('setup-profile-avatar');
  if (profileNameEl) profileNameEl.textContent = activeDisplayName;
  if (profileAvatarEl) {
    profileAvatarEl.textContent = (activeDisplayName || 'T')[0].toUpperCase();
    profileAvatarEl.style.borderColor = selfP?.colorHex || '#10b981';
    profileAvatarEl.style.color = selfP?.colorHex || '#10b981';
  }

  // Update Home Screen Tycoon Name display if present
  const homeNameEl = document.getElementById('home-tycoon-name-display');
  if (homeNameEl) homeNameEl.textContent = activeDisplayName;

  // Update multiplayer portal identity banner if visible
  const portalNameDisplay = document.getElementById('portal-profile-name-display');
  const portalNameInput = document.getElementById('portal-player-name-input');
  const portalAvatar = document.getElementById('portal-profile-avatar');
  if (portalNameDisplay) portalNameDisplay.textContent = activeDisplayName;
  if (portalNameInput && document.activeElement !== portalNameInput && portalNameInput.value !== activeDisplayName) {
    portalNameInput.value = activeDisplayName;
  }
  if (portalAvatar) {
    portalAvatar.textContent = (activeDisplayName || 'T')[0].toUpperCase();
  }


  // Sync state into reactive Svelte lobbyStore
  const lobbyPlayersList = [];
  const isTeamMode = Boolean(matchSettings.teamMode);
  for (let i = 0; i < lobbyPlayerCount; i++) {
    const cp = matchSettings.customPlayers[i];
    const isOnline = networkState.isMultiplayer;
    const isConnectedPeer = isOnline && (Boolean(cp?.isOnlinePeer) || Boolean(setupPlayers[i]?.isOnlinePeer) || Boolean(setupPlayers[i]?.peerId));
    const isHuman = isConnectedPeer ? true : !cp?.isAI;
    const isSelf = isOnline ? (i === networkState.localPlayerIdx) : (i === 0);
    const teamId = cp?.teamId !== undefined ? cp.teamId : (i % 2);
    const teamHex = teamId === 0 ? '#ef4444' : '#3b82f6';
    const teamChar = teamId === 0 ? 0xef4444 : 0x3b82f6;
    const colorHex = isTeamMode ? teamHex : (cp?.colorHex || '#10b981');
    const charColor = isTeamMode ? teamChar : (cp?.charColor || 0x10b981);
    lobbyPlayersList.push({
      idx: i,
      name: cp?.name || `P${i + 1}`,
      isAI: !isHuman,
      isOnlinePeer: Boolean(cp?.isOnlinePeer),
      colorHex,
      charColor,
      hatStyle: cp?.hatStyle || 0,
      archetypeIcon: ARCHETYPES[cp?.hatStyle || 0]?.icon || '🎩',
      archetypeName: ARCHETYPES[cp?.hatStyle || 0]?.name || 'Banker',
      isSelected: i === selectedSetupPlayerIdx,
      isSelf,
      isHost: i === 0,
      canEditName: isSelf && isHuman,
      canEditSlot: canCurrentPlayerEditSlot(i),
      isConnectedPeer,
      teamId
    });
  }
  const curPlayerForStore = matchSettings.customPlayers[selectedSetupPlayerIdx] || p0;
  const curArchForStore = ARCHETYPES[curPlayerForStore?.hatStyle || 0] || ARCHETYPES[0];
  const teamValidation = isTeamMode
    ? validateTeamModeBalance(lobbyPlayerCount, matchSettings.customPlayers)
    : { valid: true, error: null };

  updateLobbyStore({
    playerCount: lobbyPlayerCount,
    selectedPlayerIdx: selectedSetupPlayerIdx,
    activeDisplayName,
    canEditCurrent: canCurrentPlayerEditSlot(selectedSetupPlayerIdx),
    archetypeId: curArchForStore.id,
    archetypeName: curArchForStore.name.toUpperCase(),
    archetypeIcon: curArchForStore.icon,
    selectedColorHex: isTeamMode ? (curPlayerForStore?.teamId === 0 ? '#ef4444' : '#3b82f6') : (curPlayerForStore?.colorHex || '#10b981'),
    isTeamMode,
    isTeamBalanceValid: teamValidation.valid,
    teamBalanceError: teamValidation.error,
    players: lobbyPlayersList
  });

  // Reactive Svelte PlayerSetupCards & HeroPreview handle DOM declaratively via lobbyStore
}

export function handlePlayerNameChange(idx, name) {
  setPlayerSetupName(idx, name);
}

export function setPlayerSetupName(idx, name, isSystemOrBot = false) {
  if (!isSystemOrBot && currentLobbyView !== 'title') {
    showTurnLockToast('Names can only be changed on the Home Screen!');
    return;
  }

  const isSelf = networkState.isMultiplayer
    ? (idx === networkState.localPlayerIdx)
    : (idx === 0);
  if (!isSelf && !isSystemOrBot) return;

  const target = matchSettings.customPlayers[idx];
  if (!target || (target.isAI && !isSystemOrBot)) return;

  const savedName = savePlayerName(name);
  target.name = savedName;
  if (PLAYER_THEMES[idx]) PLAYER_THEMES[idx].name = savedName;
  if (setupPlayers[idx]) setupPlayers[idx].name = savedName;
  if (gameState && gameState.players && gameState.players[idx]) {
    gameState.players[idx].name = savedName;
  }

  // Synchronize header profile badge
  const pNameEl = document.getElementById('setup-profile-name');
  const pAvEl = document.getElementById('setup-profile-avatar');
  if (pNameEl) pNameEl.textContent = savedName;
  if (pAvEl) {
    pAvEl.textContent = (savedName || 'T')[0];
    pAvEl.style.borderColor = target.colorHex || '#10b981';
    pAvEl.style.color = target.colorHex || '#10b981';
  }

  // Synchronize Home Screen Tycoon Name display if present
  const homeNameEl = document.getElementById('home-tycoon-name-display');
  if (homeNameEl) homeNameEl.textContent = savedName;

  // Synchronize multiplayer portal display & input if present
  const portalNameDisplay = document.getElementById('portal-profile-name-display');
  const portalNameInput = document.getElementById('portal-player-name-input');
  const portalAvatar = document.getElementById('portal-profile-avatar');
  if (portalNameDisplay) portalNameDisplay.textContent = savedName;
  if (portalNameInput && document.activeElement !== portalNameInput && portalNameInput.value !== savedName) {
    portalNameInput.value = savedName;
  }
  if (portalAvatar) {
    portalAvatar.textContent = (savedName || 'T')[0];
  }

  // Synchronize slot display text if present
  const slotCard = document.getElementById(`player-setup-card-${idx}`);
  if (slotCard) {
    const textSpan = slotCard.querySelector('.player-name-display');
    if (textSpan) textSpan.textContent = savedName;
  }

  if (networkState.isMultiplayer) {
    if (networkState.isHost) {
      broadcastLobbySettings();
      if (gameState && gameState.gameStarted) {
        renderCornerHUDs();
        broadcastFullGameState();
      }
    } else {
      sendClientProfileUpdate({ name: savedName });
    }
  }
}

export function togglePlayerRole(idx) {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  if (networkState.isMultiplayer && idx === 0) return;
  const sp = setupPlayers[idx];
  const cp = matchSettings.customPlayers[idx];
  if (networkState.isMultiplayer && (sp?.isOnlinePeer || cp?.isOnlinePeer || Boolean(sp?.peerId))) {
    showTurnLockToast('Online players cannot be changed to bots!');
    return;
  }
  if (matchSettings.customPlayers[idx]) {
    const turningToAI = !matchSettings.customPlayers[idx].isAI;
    matchSettings.customPlayers[idx].isAI = turningToAI;
    if (turningToAI) {
      matchSettings.customPlayers[idx].name = FIXED_AI_NAMES[Math.max(0, idx - 1) % FIXED_AI_NAMES.length];
      const usedColors = matchSettings.customPlayers
        .map((p, k) => (k !== idx ? (p.colorHex || '').toLowerCase() : null))
        .filter(Boolean);
      const botLook = generateRandomBotAppearance(usedColors);
      matchSettings.customPlayers[idx].hatStyle = botLook.hatStyle;
      matchSettings.customPlayers[idx].hatColor = botLook.hatColor;
      matchSettings.customPlayers[idx].colorHex = botLook.colorHex;
      matchSettings.customPlayers[idx].charColor = botLook.charColor;
    } else {
      matchSettings.customPlayers[idx].name = `PLAYER ${idx + 1}`;
    }
    if (PLAYER_THEMES[idx]) {
      PLAYER_THEMES[idx].name = matchSettings.customPlayers[idx].name;
      PLAYER_THEMES[idx].isAI = matchSettings.customPlayers[idx].isAI;
      if (turningToAI) {
        PLAYER_THEMES[idx].hatColor = matchSettings.customPlayers[idx].hatColor;
        PLAYER_THEMES[idx].colorHex = matchSettings.customPlayers[idx].colorHex;
        PLAYER_THEMES[idx].charColor = matchSettings.customPlayers[idx].charColor;
      }
    }
    if (setupPlayers[idx]) {
      setupPlayers[idx].name = matchSettings.customPlayers[idx].name;
      setupPlayers[idx].isAI = matchSettings.customPlayers[idx].isAI;
      if (turningToAI) {
        setupPlayers[idx].hatStyle = matchSettings.customPlayers[idx].hatStyle;
        setupPlayers[idx].hatColor = matchSettings.customPlayers[idx].hatColor;
        setupPlayers[idx].colorHex = matchSettings.customPlayers[idx].colorHex;
        setupPlayers[idx].charColor = matchSettings.customPlayers[idx].charColor;
      }
    }
    renderPlayerCards();
    playSFX('hop');
    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastLobbySettings();
    }
  }
}

export function togglePlayerTeam(idx) {
  const isGuest = networkState.isMultiplayer && !networkState.isHost;
  if (isGuest && idx !== networkState.localPlayerIdx) return;

  const cp = matchSettings.customPlayers[idx];
  if (!cp) return;

  cp.teamId = (cp.teamId === 0) ? 1 : 0;
  const teamHex = cp.teamId === 0 ? '#ef4444' : '#3b82f6';
  const teamChar = cp.teamId === 0 ? 0xef4444 : 0x3b82f6;
  cp.colorHex = teamHex;
  cp.charColor = teamChar;

  if (setupPlayers[idx]) {
    setupPlayers[idx].teamId = cp.teamId;
    setupPlayers[idx].colorHex = teamHex;
    setupPlayers[idx].charColor = teamChar;
  }
  if (PLAYER_THEMES[idx]) {
    PLAYER_THEMES[idx].colorHex = teamHex;
    PLAYER_THEMES[idx].charColor = teamChar;
  }

  if (selectedSetupPlayerIdx === idx) {
    updateLobbyHeroAvatar(cp.hatStyle || 0, teamHex, teamChar);
  }

  renderPlayerCards();
  playSFX('hop');

  if (isGuest) {
    broadcastAction('ACTION_GUEST_TEAM_SELECT', { playerIdx: idx, teamId: cp.teamId });
  } else if (networkState.isMultiplayer && networkState.isHost) {
    broadcastLobbySettings();
  }
}

if (typeof window !== 'undefined') {
  window.togglePlayerRole = togglePlayerRole;
  window.togglePlayerTeam = togglePlayerTeam;
}
