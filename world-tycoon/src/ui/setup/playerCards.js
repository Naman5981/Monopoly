/**
 * ui/setup/playerCards.js
 * Renders the roster of player cards, names, roles (Human/AI), and podium selection.
 */

import { matchSettings, lobbyPlayerCount, setupPlayers, gameState, savePlayerName, getSavedPlayerName } from '../../game/state.js';
import { PLAYER_THEMES } from '../../game/data.js';
import { playSFX } from '../../game/audio.js';
import { updateAllPointsBadges } from '../wardrobe.js';
import { renderCornerHUDs, showTurnLockToast } from '../hud.js';
import { networkState, broadcastLobbySettings, sendClientProfileUpdate, broadcastFullGameState } from '../../network/p2p.js';
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

export function buildPlayerCardActionControls(i, isGuest, isOnline, isConnectedPeer, isHuman, isSelf) {
  if (!isGuest) {
    if (isOnline && i === 0) {
      return `
        <div class="action-controls-slot flex items-center gap-1.5 flex-shrink-0">
          <span class="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">HOST (YOU)</span>
        </div>
      `;
    }
    if (isOnline && isConnectedPeer) {
      return `
        <div class="action-controls-slot flex items-center gap-1.5 flex-shrink-0">
          <span class="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs flex items-center gap-1.5" title="Connected online player">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ONLINE</span>
          </span>
        </div>
      `;
    }
    return `
      <div class="action-controls-slot flex items-center gap-1.5 flex-shrink-0">
        <button onclick="window.togglePlayerRole(${i})" class="text-xs font-black px-2.5 py-1 rounded-xl border-2 transition cursor-pointer ${
          isHuman ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 shadow-2xs' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
        }" title="Toggle Player / Bot">
          <i class="${isHuman ? 'fa-solid fa-user' : 'fa-solid fa-robot'} mr-1 text-xs"></i>
          ${isHuman ? 'Player' : 'Bot'}
        </button>
        ${(i > 0 && lobbyPlayerCount > 2) ? `
        <button onclick="window.removePlayerAt(${i})" class="text-xs font-black px-2 py-1 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer shadow-2xs" title="Remove player slot">
          <i class="fa-solid fa-xmark text-xs font-black"></i>
        </button>
        ` : ''}
      </div>
    `;
  } else {
    if (i === networkState.localPlayerIdx) {
      return `
        <div class="action-controls-slot flex items-center gap-1.5 flex-shrink-0">
          <span class="text-xs font-black px-2.5 py-1 rounded-xl bg-sky-100 text-sky-800 border border-sky-300 shadow-2xs">YOU</span>
        </div>
      `;
    }
    if (i === 0) {
      return `
        <div class="action-controls-slot flex items-center gap-1.5 flex-shrink-0">
          <span class="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">HOST</span>
        </div>
      `;
    }
    if (isConnectedPeer) {
      return `
        <div class="action-controls-slot flex items-center gap-1.5 flex-shrink-0">
          <span class="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs flex items-center gap-1.5" title="Connected online player">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ONLINE</span>
          </span>
        </div>
      `;
    }
    return `
      <div class="action-controls-slot flex items-center gap-1.5 flex-shrink-0">
        <span class="text-xs font-bold px-2 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">${isHuman ? 'PLAYER' : 'BOT'}</span>
      </div>
    `;
  }
}

export function renderPlayerCards() {
  const container = document.getElementById('setup-players-roster');
  const countBadge = document.getElementById('table-player-count-badge');
  if (countBadge) countBadge.textContent = `${lobbyPlayerCount}/6`;

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

  updateAllPointsBadges();

  // Sync state into reactive Svelte lobbyStore
  const lobbyPlayersList = [];
  for (let i = 0; i < lobbyPlayerCount; i++) {
    const cp = matchSettings.customPlayers[i];
    const isOnline = networkState.isMultiplayer;
    const isConnectedPeer = isOnline && (Boolean(cp?.isOnlinePeer) || Boolean(setupPlayers[i]?.isOnlinePeer) || Boolean(setupPlayers[i]?.peerId));
    const isHuman = isConnectedPeer ? true : !cp?.isAI;
    const isSelf = isOnline ? (i === networkState.localPlayerIdx) : (i === 0);
    lobbyPlayersList.push({
      idx: i,
      name: cp?.name || `P${i + 1}`,
      isAI: !isHuman,
      isOnlinePeer: Boolean(cp?.isOnlinePeer),
      colorHex: cp?.colorHex || '#10b981',
      hatStyle: cp?.hatStyle || 0,
      isSelected: i === selectedSetupPlayerIdx,
      isSelf,
      isHost: i === 0,
      canEditName: isSelf && isHuman,
      canEditSlot: canCurrentPlayerEditSlot(i),
      isConnectedPeer
    });
  }
  updateLobbyStore({
    playerCount: lobbyPlayerCount,
    selectedPlayerIdx: selectedSetupPlayerIdx,
    activeDisplayName,
    canEditCurrent: canCurrentPlayerEditSlot(selectedSetupPlayerIdx),
    players: lobbyPlayersList
  });

  // Update center hero archetype pill indicator based on selected player
  const curPlayer = matchSettings.customPlayers[selectedSetupPlayerIdx] || p0;
  const archEl = document.getElementById('setup-character-archetype-name');
  const prevBtn = document.querySelector('button[onclick*="cycleAvatarPrev"]');
  const nextBtn = document.querySelector('button[onclick*="cycleAvatarNext"]');
  const wardrobeBtn = document.getElementById('btn-open-wardrobe');
  const canEditCurrent = canCurrentPlayerEditSlot(selectedSetupPlayerIdx);

  if (prevBtn) {
    prevBtn.disabled = !canEditCurrent;
    prevBtn.classList.toggle('opacity-30', !canEditCurrent);
    prevBtn.classList.toggle('cursor-not-allowed', !canEditCurrent);
    prevBtn.classList.toggle('pointer-events-none', !canEditCurrent);
  }
  if (nextBtn) {
    nextBtn.disabled = !canEditCurrent;
    nextBtn.classList.toggle('opacity-30', !canEditCurrent);
    nextBtn.classList.toggle('cursor-not-allowed', !canEditCurrent);
    nextBtn.classList.toggle('pointer-events-none', !canEditCurrent);
  }
  if (wardrobeBtn) {
    wardrobeBtn.disabled = !canEditCurrent;
    if (!canEditCurrent) {
      wardrobeBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
      wardrobeBtn.title = `Wardrobe locked - viewing ${curPlayer?.name || 'player'}`;
    } else {
      wardrobeBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
      wardrobeBtn.title = "Customize Outfits, Hats, Dice & Pedestals";
    }
  }

  if (archEl && curPlayer) {
    const arch = ARCHETYPES[curPlayer.hatStyle || 0] || ARCHETYPES[0];
    let roleTag = '';
    if (networkState.isMultiplayer) {
      const tagText = (isGuest && selectedSetupPlayerIdx === networkState.localPlayerIdx)
        ? 'YOU'
        : (selectedSetupPlayerIdx === 0 ? 'HOST' : (curPlayer.name || `P${selectedSetupPlayerIdx + 1}`));
      roleTag = ` (${tagText})`;
    } else {
      // Local Play / Title Screen
      if (currentLobbyView === 'title') {
        roleTag = '';
      } else {
        const pLabel = curPlayer.isAI ? 'BOT' : `P${selectedSetupPlayerIdx + 1}`;
        roleTag = lobbyPlayerCount > 1 ? ` (${pLabel})` : '';
      }
    }
    archEl.innerHTML = `<span class="text-xl">${arch.icon}</span><span class="font-black text-sm tracking-wide text-slate-800">${arch.name.toUpperCase()}${roleTag}</span>`;
    if (!canEditCurrent) {
      archEl.classList.remove('cursor-pointer');
      archEl.classList.add('cursor-default');
      archEl.onclick = null;
    } else {
      archEl.classList.add('cursor-pointer');
      archEl.classList.remove('cursor-default');
      archEl.onclick = () => {
        if (window.cycleAvatarNext) window.cycleAvatarNext();
      };
    }
  }

  // Reactive Svelte PlayerSetupCards mounted at #setup-players-roster handles DOM declaratively
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
