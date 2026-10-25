/**
 * ui/setup/setupRoom.js
 * Room creation, P2P joining/leaving, start match CTA, and full setup lobby lifecycle.
 */

import { gameState, matchSettings, lobbyPlayerCount, setupPlayers, getSavedPlayerName } from '../../game/state.js';
import { PLAYER_THEMES } from '../../game/data.js';
import { playSFX } from '../../game/audio.js';
import { fireConfettiBurst, applyLightingMode } from '../../three/effects.js';
import { startIntroCameraFlyIn, playIntroCinematicFlyIn, getSceneLighting, initLobbyHeroStage, updateLobbyHeroAvatar } from '../../three/scene.js';
import { startNewMatch } from '../../game/engine.js';
import {
  networkState,
  hostRoom,
  joinRoom,
  leaveMultiplayerRoom,
  broadcastStartOnlineMatch,
  registerNetworkCallbacks,
  updateMultiplayerUI
} from '../../network/p2p.js';
import { closeAllGameModals } from '../modals/common.js';
import { updateAllPointsBadges } from '../wardrobe.js';
import { animateLobbyEntrance } from '../anim.js';

import { setLobbyView, showTitleScreen, showMultiplayerSetup } from './lobbyNavigation.js';
import { renderPlayerCards } from './playerCards.js';
import { renderMatchSettingButtons } from './matchSettingsUI.js';
import { addBotOrSlot, selectedSetupPlayerIdx, FIXED_AI_NAMES, ARCHETYPES, generateRandomBotAppearance } from './playerCustomization.js';

export function initLandingSetup() {
  setLobbyView('title', false);

  try {
    const savedName = getSavedPlayerName();
    if (matchSettings.customPlayers[0]) {
      matchSettings.customPlayers[0].name = savedName;
    }
    if (setupPlayers[0]) {
      setupPlayers[0].name = savedName;
    }
    if (PLAYER_THEMES[0]) {
      PLAYER_THEMES[0].name = savedName;
    }

    // Ensure the 5 AI bots have fixed names and dynamic randomized appearances
    const usedColors = [(matchSettings.customPlayers[0]?.colorHex || '#3b82f6').toLowerCase()];
    matchSettings.customPlayers.forEach((cp, idx) => {
      if (idx > 0 && cp.isAI) {
        cp.name = FIXED_AI_NAMES[(idx - 1) % FIXED_AI_NAMES.length];
        const botLook = generateRandomBotAppearance(usedColors);
        usedColors.push(botLook.colorHex.toLowerCase());

        cp.hatStyle = botLook.hatStyle;
        cp.hatColor = botLook.hatColor;
        cp.colorHex = botLook.colorHex;
        cp.charColor = botLook.charColor;

        if (PLAYER_THEMES[idx]) {
          PLAYER_THEMES[idx].name = cp.name;
          PLAYER_THEMES[idx].hatColor = botLook.hatColor;
          PLAYER_THEMES[idx].colorHex = botLook.colorHex;
          PLAYER_THEMES[idx].charColor = botLook.charColor;
        }
        if (setupPlayers[idx]) {
          setupPlayers[idx].name = cp.name;
          setupPlayers[idx].hatStyle = botLook.hatStyle;
          setupPlayers[idx].hatColor = botLook.hatColor;
          setupPlayers[idx].colorHex = botLook.colorHex;
          setupPlayers[idx].charColor = botLook.charColor;
        }
      }
    });

    renderPlayerCards();
    renderMatchSettingButtons();
  } catch (err) {
    console.error('Error during initLandingSetup:', err);
  }

  // Anime.js arcade staggered lobby entrance orchestration
  setTimeout(() => {
    animateLobbyEntrance();
  }, 50);

  // Initialize 3D podium stage in center of lobby
  setTimeout(() => {
    initLobbyHeroStage();
    const p0 = matchSettings.customPlayers[0];
    if (p0) {
      updateLobbyHeroAvatar(p0.hatStyle || 0, p0.colorHex || '#3b82f6', p0.charColor || 0x3b82f6);
    }
  }, 100);

  registerNetworkCallbacks({
    onLobbyUpdate: () => {
      renderPlayerCards();
      renderMatchSettingButtons();
    }
  });

  // Check URL query parameters for auto room join (?room=8492)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      showMultiplayerSetup();
      const code = roomParam.toUpperCase().trim();
      const portalInput = document.getElementById('input-p2p-room-code-portal');
      if (portalInput) portalInput.value = code;
      const input = document.getElementById('input-p2p-room-code');
      if (input) input.value = code;
    }
  }
}

export async function joinP2PRoomFromPortal() {
  const portalInput = document.getElementById('input-p2p-room-code-portal');
  const legacyInput = document.getElementById('input-p2p-room-code');
  const statusPortalEl = document.getElementById('portal-p2p-status-text');

  let raw = (portalInput?.value || legacyInput?.value || '').trim();
  const urlMatch = raw.match(/[?&]room=([a-z0-9]+)/i);
  let code = urlMatch ? urlMatch[1].toUpperCase() : raw.toUpperCase();
  code = code.replace(/[^A-Z0-9]/g, '');

  if (!code) {
    if (statusPortalEl) statusPortalEl.innerHTML = '<span class="text-rose-500 font-bold">⚠️ Enter a 4-letter room code</span>';
    portalInput?.focus();
    return;
  }

  if (legacyInput) legacyInput.value = code;
  if (portalInput) portalInput.value = code;
  if (statusPortalEl) statusPortalEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-emerald-600 mr-1"></i> Joining Room ${code}...`;

  await joinP2PRoom();
}

export async function hostP2PRoom() {
  const statusEl = document.getElementById('setup-p2p-status-text');
  try {
    if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-sky-500 mr-1"></i> Creating room...';
    await hostRoom();
    setLobbyView('multiplayer-room');
    updateMultiplayerUI();
    renderPlayerCards();
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<span class="text-rose-600 font-bold">❌ Error: ${err.message || 'Room creation failed'}</span>`;
  }
}

export async function joinP2PRoom() {
  const portalInput = document.getElementById('input-p2p-room-code-portal');
  const input = document.getElementById('input-p2p-room-code');
  const statusEl = document.getElementById('setup-p2p-status-text');
  const portalStatusEl = document.getElementById('portal-p2p-status-text');

  let raw = (portalInput?.value || input?.value || '').trim();
  const urlMatch = raw.match(/[?&]room=([a-z0-9]+)/i);
  let code = urlMatch ? urlMatch[1].toUpperCase() : raw.toUpperCase();
  code = code.replace(/[^A-Z0-9]/g, '');

  if (!code) {
    const errorHtml = '<span class="text-rose-500 font-bold">⚠️ Enter a 4-letter room code</span>';
    if (statusEl) statusEl.innerHTML = errorHtml;
    if (portalStatusEl) portalStatusEl.innerHTML = errorHtml;
    return;
  }

  try {
    const loadingHtml = `<i class="fa-solid fa-spinner fa-spin text-emerald-500 mr-1"></i> Joining Room ${code}...`;
    if (statusEl) statusEl.innerHTML = loadingHtml;
    if (portalStatusEl) portalStatusEl.innerHTML = loadingHtml;

    const savedName = getSavedPlayerName();
    const myInfo = matchSettings.customPlayers[0] || {};
    const effectiveName = (myInfo.name && myInfo.name !== 'YOU') ? myInfo.name : savedName;
    const selectedHatStyle = myInfo.hatStyle !== undefined ? myInfo.hatStyle : 0;
    await joinRoom(code, {
      name: effectiveName,
      archetype: selectedHatStyle,
      hatStyle: selectedHatStyle,
      hatColor: myInfo.hatColor || ARCHETYPES[selectedHatStyle]?.hatColor || 0x334155,
      charColor: myInfo.charColor || 0x3b82f6,
      colorHex: myInfo.colorHex || '#3b82f6',
      pedestal: myInfo.pedestal
    });

    const successHtml = `🟢 <strong>Joined Room ${code}!</strong> Waiting for Host to start match...`;
    if (portalStatusEl) portalStatusEl.innerHTML = successHtml;

    setLobbyView('multiplayer-room');
    updateMultiplayerUI();
    renderPlayerCards();
  } catch (err) {
    const errHtml = `<span class="text-rose-600 font-bold">❌ Error: ${err.message || 'Failed to connect'}</span>`;
    if (statusEl) statusEl.innerHTML = errHtml;
    if (portalStatusEl) portalStatusEl.innerHTML = errHtml;
  }
}

export function leaveP2PRoom() {
  leaveMultiplayerRoom();
  const portalStatusEl = document.getElementById('portal-p2p-status-text');
  if (portalStatusEl) portalStatusEl.innerHTML = '<span class="text-slate-400">Enter a 4-letter code or paste an invite link</span>';
  setLobbyView('multiplayer-portal');
  updateMultiplayerUI();
  renderPlayerCards();
}

export function startGameFromLandingPage() {
  if (networkState.isMultiplayer && !networkState.isHost) {
    playSFX('flinch');
    const playBtn = document.getElementById('landing-play-btn');
    if (playBtn) {
      playBtn.classList.add('animate-shake');
      setTimeout(() => playBtn.classList.remove('animate-shake'), 600);
    }
    return;
  }

  // Ensure match has at least 2 players
  if (lobbyPlayerCount < 2) {
    addBotOrSlot();
  }

  // Defensive check: ensure host and all connected peers are marked as human (isAI: false)
  if (networkState.isMultiplayer) {
    for (let i = 0; i < lobbyPlayerCount; i++) {
      const sp = setupPlayers[i];
      const cp = matchSettings.customPlayers[i];
      if (i === 0 || sp?.isOnlinePeer || cp?.isOnlinePeer || sp?.peerId) {
        if (cp) {
          cp.isAI = false;
          cp.isOnlinePeer = (i > 0);
        }
        if (sp) {
          sp.isAI = false;
          sp.isOnlinePeer = (i > 0);
        }
        if (PLAYER_THEMES[i]) {
          PLAYER_THEMES[i].isAI = false;
        }
      }
    }
  }

  // If in P2P multiplayer as host, broadcast match start to all connected clients!
  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastStartOnlineMatch();
  }

  const landingScreen = document.getElementById('landing-setup-screen');

  // Play celebratory sound (start audio reduced by 20%) & burst confetti
  playSFX('gameStart');
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 120);

  // Smooth exit animation
  if (landingScreen) {
    landingScreen.style.pointerEvents = 'none';
    landingScreen.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    landingScreen.style.opacity = '0';
    landingScreen.style.transform = 'scale(0.94) translateY(-20px)';
    setTimeout(() => {
      landingScreen.classList.add('hidden');
      landingScreen.classList.remove('flex');
      landingScreen.style.setProperty('display', 'none', 'important');
      landingScreen.style.pointerEvents = '';
    }, 400);
  }

  // Trigger Theatre.js cinematic camera fly-in swoop
  playIntroCinematicFlyIn();

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

  // Initialize and start match with configured players & starting cash
  startNewMatch();
}

/**
 * Re-opens the interactive landing lobby, resets match state,
 * and ensures all victory/in-game modals and overlays are completely cleared.
 */
export function openLandingSetupScreen() {
  if (typeof window.cancelAllGameTimers === 'function') {
    window.cancelAllGameTimers();
  }
  gameState.gameStarted = false;
  gameState.phase = 'SETUP';
  closeAllGameModals();

  const landingScreen = document.getElementById('landing-setup-screen');
  if (landingScreen) {
    landingScreen.classList.remove('hidden');
    landingScreen.classList.add('flex');
    landingScreen.style.removeProperty('display');
    landingScreen.style.setProperty('display', 'flex', 'important');
    landingScreen.style.opacity = '1';
    landingScreen.style.transform = 'none';
    landingScreen.style.pointerEvents = 'auto';
  }

  // Ensure victory modal and its inline styles are completely wiped
  const victoryModal = document.getElementById('modal-victory');
  if (victoryModal) {
    victoryModal.classList.add('hidden');
    victoryModal.classList.remove('flex');
    victoryModal.style.removeProperty('display');
    victoryModal.style.removeProperty('z-index');
    victoryModal.style.display = 'none';
  }
  const victoryCard = document.getElementById('victory-card');
  if (victoryCard) {
    victoryCard.style.removeProperty('opacity');
    victoryCard.style.removeProperty('pointer-events');
  }

  // Hide in-game HUD layers / badges
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
    showMultiplayerSetup();
    updateMultiplayerUI();
  } else {
    showTitleScreen();
  }

  renderPlayerCards();
  renderMatchSettingButtons();
  updateAllPointsBadges();

  const p0 = matchSettings.customPlayers[selectedSetupPlayerIdx || 0] || matchSettings.customPlayers[0];
  if (p0) {
    updateLobbyHeroAvatar(p0.hatStyle || 0, p0.colorHex || '#3b82f6', p0.charColor || 0x3b82f6);
  }

  applyLightingMode(matchSettings.lightingTheme || 'day', getSceneLighting());

  if (typeof window.resetCameraView === 'function') {
    window.resetCameraView();
  }
}
