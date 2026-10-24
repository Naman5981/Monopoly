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

  if (!container) return;

  // Track active input focus and caret position before updating DOM
  const activeEl = document.activeElement;
  let focusedSlot = null;
  let selStart = null;
  let selEnd = null;
  if (activeEl && activeEl.dataset && activeEl.dataset.slotIdx !== undefined) {
    focusedSlot = parseInt(activeEl.dataset.slotIdx, 10);
    selStart = activeEl.selectionStart;
    selEnd = activeEl.selectionEnd;
  }

  // Keyed DOM reconciliation: update existing card rows in-place or rebuild when count changes
  const existingCards = container.querySelectorAll('.player-setup-card');
  const canReconcileInPlace = (existingCards.length === lobbyPlayerCount);

  if (canReconcileInPlace) {
    for (let i = 0; i < lobbyPlayerCount; i++) {
      const cp = matchSettings.customPlayers[i];
      const isHuman = !cp.isAI;
      const isSelected = (i === selectedSetupPlayerIdx);
      const initial = (cp.name || `P${i + 1}`)[0].toUpperCase();
      const isSelf = networkState.isMultiplayer
        ? (i === networkState.localPlayerIdx)
        : (i === 0);
      const canEditName = isSelf && !cp.isAI;
      const row = existingCards[i];

      row.classList.toggle('card-selected', isSelected);

      // Update avatar medallion
      const avatarEl = row.querySelector('.avatar-medallion');
      if (avatarEl) {
        avatarEl.textContent = initial;
        avatarEl.style.background = cp.colorHex;
        avatarEl.style.boxShadow = `0 3px 0 rgba(0,0,0,0.15), 0 0 0 2px ${cp.colorHex}55${isSelected ? ', 0 0 16px rgba(245,158,11,0.6)' : ''}`;
      }

      // Update name text
      const inputEl = row.querySelector(`#player-name-input-${i}`);
      if (inputEl) {
        const span = document.createElement('span');
        span.className = 'player-name-display font-black text-sm sm:text-base text-slate-800 uppercase px-1.5 py-0.5 select-none truncate';
        span.textContent = cp.name;
        span.title = cp.isAI ? 'AI Tycoon Bot' : 'Player';
        inputEl.replaceWith(span);
      } else {
        const textSpan = row.querySelector('.player-name-display');
        if (textSpan && textSpan.textContent !== cp.name) {
          textSpan.textContent = cp.name;
        }
      }

      // Update podium tag
      const podiumWrap = row.querySelector('.podium-tag-slot');
      if (podiumWrap) {
        podiumWrap.innerHTML = isSelected
          ? '<span class="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-xs border border-amber-300 flex items-center gap-1"><span>👑</span> PODIUM</span>'
          : '';
      }
    }
    return;
  }

  container.innerHTML = '';

  // Render active player rows with spacious game-grade design
  for (let i = 0; i < lobbyPlayerCount; i++) {
    const cp = matchSettings.customPlayers[i];
    const isHuman = !cp.isAI;
    const isSelected = (i === selectedSetupPlayerIdx);
    const initial = (cp.name || `P${i + 1}`)[0].toUpperCase();
    const isSelf = networkState.isMultiplayer
      ? (i === networkState.localPlayerIdx)
      : (i === 0);
    // Player can ONLY change self name, and NEVER on AI
    const canEditName = isSelf && !cp.isAI;

    const row = document.createElement('div');
    row.id = `player-setup-card-${i}`;
    row.className = `player-setup-card ${isSelected ? 'card-selected' : ''} p-2.5 sm:p-3 flex items-center justify-between gap-2.5 cursor-pointer`;
    row.onclick = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.closest('button')) return;
      if (window.selectSetupPlayer) window.selectSetupPlayer(i);
    };

    const isOnline = networkState.isMultiplayer;
    const hostCrown = (isOnline && i === 0) ? '<span class="text-sm" title="Table Host">👑</span>' : '';
    const youTag = isSelf ? '<span class="text-[10px] font-black uppercase tracking-wider bg-sky-500 text-white px-2 py-0.5 rounded-full shadow-2xs border border-sky-300">YOU</span>' : '';
    const podiumTag = isSelected ? '<span class="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-xs border border-amber-300 flex items-center gap-1"><span>👑</span> PODIUM</span>' : '';

    // Names in lobby are strictly read-only for fair play
    const nameInputHtml = `<span class="player-name-display font-black text-sm sm:text-base text-slate-800 uppercase px-1.5 py-0.5 select-none truncate" title="${cp.isAI ? 'AI Tycoon Bot' : 'Player'}">${cp.name}</span>`;

    let actionControlsHtml = '';
    if (!isGuest) {
      if (isOnline && i === 0) {
        actionControlsHtml = `
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span class="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">HOST (YOU)</span>
          </div>
        `;
      } else {
        actionControlsHtml = `
          <div class="flex items-center gap-1.5 flex-shrink-0">
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
      }
    } else {
      actionControlsHtml = `
        <div class="flex items-center gap-1.5 flex-shrink-0">
          ${(i === networkState.localPlayerIdx) ? `
            <span class="text-xs font-black px-2.5 py-1 rounded-xl bg-sky-100 text-sky-800 border border-sky-300 shadow-2xs">YOU</span>
          ` : (i === 0) ? `
            <span class="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">HOST</span>
          ` : `
            <span class="text-xs font-bold px-2 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">${isHuman ? 'PLAYER' : 'BOT'}</span>
          `}
        </div>
      `;
    }

    row.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0 flex-1">
        <!-- Colored avatar medallion with arcade rim -->
        <div class="avatar-medallion w-10 h-10 rounded-full border-2 border-white shadow-md flex items-center justify-center font-black text-sm text-white flex-shrink-0" style="background:${cp.colorHex}; box-shadow: 0 3px 0 rgba(0,0,0,0.15), 0 0 0 2px ${cp.colorHex}55${isSelected ? ', 0 0 16px rgba(245,158,11,0.6)' : ''};">
          ${initial}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            ${hostCrown}
            ${nameInputHtml}
            ${youTag}
            <span class="podium-tag-slot">${podiumTag}</span>
          </div>
        </div>
      </div>
      ${actionControlsHtml}
    `;

    container.appendChild(row);
  }

  // Single compact add player slot if under 6 players and not guest
  if (!isGuest && lobbyPlayerCount < 6) {
    const slot = document.createElement('div');
    slot.className = 'game-slot-dashed p-2.5 flex items-center justify-center gap-2 cursor-pointer font-bold text-xs text-sky-700 bg-sky-50/50 hover:bg-sky-50 border-2 border-dashed border-sky-200 rounded-xl transition hover:scale-[1.005]';
    slot.onclick = () => {
      if (window.addBotOrSlot) window.addBotOrSlot();
    };
    slot.innerHTML = `
      <i class="fa-solid fa-plus text-xs"></i>
      <span>Add Player Slot (${lobbyPlayerCount}/6)</span>
    `;
    container.appendChild(slot);
  }

  // Restore active input focus and caret position if applicable
  if (focusedSlot !== null) {
    const restoredInput = document.getElementById(`player-name-input-${focusedSlot}`);
    if (restoredInput) {
      restoredInput.focus();
      try {
        if (typeof selStart === 'number' && typeof selEnd === 'number') {
          restoredInput.setSelectionRange(selStart, selEnd);
        }
      } catch (_) {}
    }
  }
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
