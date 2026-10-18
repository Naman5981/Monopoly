/**
 * ui/setup/playerCustomization.js
 * Player archetypes, colors, avatar cycling, slot addition/removal, and customization permissions.
 */

import { matchSettings, lobbyPlayerCount, setLobbyPlayerCount, setupPlayers } from '../../game/state.js';
import { PLAYER_THEMES } from '../../game/data.js';
import { playSFX } from '../../game/audio.js';
import { updateLobbyHeroAvatar } from '../../three/scene.js';
import { networkState, broadcastLobbySettings, sendClientProfileUpdate } from '../../network/p2p.js';
import { animatePlayerJoinRadarPing } from '../anim.js';

export const ARCHETYPES = [
  { id: 0, name: 'Aviator', icon: '✈️', hatColor: 0x334155, desc: 'Sky Captain Goggles' },
  { id: 1, name: 'Banker', icon: '🎩', hatColor: 0xfde047, desc: 'Golden Monocle & Top Hat' },
  { id: 2, name: 'Explorer', icon: '🧭', hatColor: 0x1e293b, desc: 'Safari Pith Helmet' },
  { id: 3, name: 'Cyber Nova', icon: '⚡', hatColor: 0xffffff, desc: 'Neon Cyber Visor' },
  { id: 4, name: 'Imperator', icon: '👑', hatColor: 0xfacc15, desc: 'Imperial 24K Crown' },
  { id: 5, name: 'High Roller', icon: '💎', hatColor: 0x1e293b, desc: 'Diamond Fedora' },
  { id: 6, name: 'Admiral', icon: '⚓', hatColor: 0x0f172a, desc: 'Royal Navy Bicorn' }
];

export const CANDY_PALETTE = [
  { hex: '#ef4444', charColor: 0xef4444, name: 'Ruby Red' },
  { hex: '#3b82f6', charColor: 0x3b82f6, name: 'Sky Blue' },
  { hex: '#22c55e', charColor: 0x22c55e, name: 'Lawn Green' },
  { hex: '#84cc16', charColor: 0x84cc16, name: 'Lime' },
  { hex: '#8b5cf6', charColor: 0x8b5cf6, name: 'Purple' },
  { hex: '#fb923c', charColor: 0xf97316, name: 'Peach' },
  { hex: '#ec4899', charColor: 0xec4899, name: 'Pink' },
  { hex: '#06b6d4', charColor: 0x06b6d4, name: 'Turquoise' }
];

export const FIXED_AI_NAMES = ['BARON', 'ATLAS', 'NOVA', 'PHOENIX', 'CYBER'];

export const FUN_NAMES = [
  ['ACE', 'TITAN', 'BLAZE', 'VIPER', 'SHADOW'],
  ['BARON', 'DUKE', 'MONARCH', 'REX', 'CZAR'],
  ['NOVA', 'LUNA', 'STELLA', 'AURORA', 'COSMO'],
  ['ATLAS', 'ORION', 'ZEUS', 'APOLLO', 'THOR'],
  ['PHOENIX', 'FALCON', 'HAWK', 'RAVEN', 'EAGLE'],
  ['CYBER', 'PIXEL', 'GLITCH', 'NEO', 'BYTE']
];

export let selectedSetupPlayerIdx = 0;

export function setSelectedSetupPlayerIdx(val) {
  selectedSetupPlayerIdx = val;
}

export function canCurrentPlayerEditSlot(slotIdx) {
  if (slotIdx < 0 || slotIdx >= lobbyPlayerCount) return false;
  if (!networkState.isMultiplayer) {
    // In local Pass & Play on same device, any active slot can be customized
    return true;
  }
  
  if (networkState.isHost) {
    // Host can edit own slot 0
    if (slotIdx === 0) return true;
    // Host can edit AI bots, but CANNOT edit connected online human client players
    const cp = matchSettings.customPlayers[slotIdx];
    return Boolean(cp && cp.isAI && !cp.isOnlinePeer);
  }
  
  // Guest can ONLY edit their own assigned slot
  return slotIdx === networkState.localPlayerIdx;
}

export function selectSetupPlayer(idx) {
  if (networkState.isMultiplayer && !canCurrentPlayerEditSlot(idx)) {
    return;
  }
  if (idx >= 0 && idx < lobbyPlayerCount) {
    selectedSetupPlayerIdx = idx;
    const cp = matchSettings.customPlayers[selectedSetupPlayerIdx];
    if (cp) {
      updateLobbyHeroAvatar(cp.hatStyle || 0, cp.colorHex || '#3b82f6', cp.charColor || 0x3b82f6);
    }
    if (window.renderPlayerCards) window.renderPlayerCards();
    if (window.renderMatchSettingButtons) window.renderMatchSettingButtons();
    playSFX('hop');
  }
}

export function setPlayerCount(n) {
  setLobbyPlayerCount(Math.min(6, Math.max(2, n)));
  if (selectedSetupPlayerIdx >= lobbyPlayerCount) {
    selectedSetupPlayerIdx = 0;
  }
  // Ensure no active players share duplicate colors
  const used = new Set();
  for (let i = 0; i < lobbyPlayerCount; i++) {
    const p = matchSettings.customPlayers[i];
    if (!p) continue;
    const norm = (p.colorHex || '').toLowerCase();
    if (!norm || used.has(norm)) {
      const free = CANDY_PALETTE.find(c => !used.has(c.hex.toLowerCase()));
      if (free) {
        p.colorHex = free.hex;
        p.charColor = free.charColor;
        if (PLAYER_THEMES[i]) {
          PLAYER_THEMES[i].colorHex = free.hex;
          PLAYER_THEMES[i].charColor = free.charColor;
        }
        used.add(free.hex.toLowerCase());
      }
    } else {
      used.add(norm);
    }
  }
  if (window.renderPlayerCards) window.renderPlayerCards();
  if (window.renderMatchSettingButtons) window.renderMatchSettingButtons();
  playSFX('hop');
}

export function addBotOrSlot() {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  if (lobbyPlayerCount < 6) {
    setLobbyPlayerCount(lobbyPlayerCount + 1);
    const newIdx = lobbyPlayerCount - 1;
    if (matchSettings.customPlayers[newIdx]) {
      matchSettings.customPlayers[newIdx].isAI = true;
      matchSettings.customPlayers[newIdx].name = FIXED_AI_NAMES[(newIdx - 1) % FIXED_AI_NAMES.length];
      if (PLAYER_THEMES[newIdx]) {
        PLAYER_THEMES[newIdx].name = matchSettings.customPlayers[newIdx].name;
      }
      if (setupPlayers[newIdx]) {
        setupPlayers[newIdx].name = matchSettings.customPlayers[newIdx].name;
      }
      // Ensure the new player has a unique color not already taken by existing active players
      const usedColors = new Set(
        matchSettings.customPlayers
          .slice(0, newIdx)
          .map(p => (p.colorHex || '').toLowerCase())
      );
      const free = CANDY_PALETTE.find(c => !usedColors.has(c.hex.toLowerCase()));
      if (free) {
        matchSettings.customPlayers[newIdx].colorHex = free.hex;
        matchSettings.customPlayers[newIdx].charColor = free.charColor;
        if (PLAYER_THEMES[newIdx]) {
          PLAYER_THEMES[newIdx].colorHex = free.hex;
          PLAYER_THEMES[newIdx].charColor = free.charColor;
        }
      }
    }
    if (window.renderPlayerCards) window.renderPlayerCards();
    if (window.renderMatchSettingButtons) window.renderMatchSettingButtons();
    animatePlayerJoinRadarPing(newIdx);
    playSFX('hop');
    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastLobbySettings();
    }
  }
}

export function removePlayerAt(idx) {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  if (lobbyPlayerCount <= 2 || idx <= 0 || idx >= lobbyPlayerCount) return;

  matchSettings.customPlayers.splice(idx, 1);

  const defaultThemes = [
    { name: 'YOU', isAI: false, charColor: 0x3b82f6, colorHex: '#3b82f6', hatColor: 0x334155, hatStyle: 0 },
    { name: 'BARON', isAI: true, charColor: 0xf97316, colorHex: '#fb923c', hatColor: 0xfde047, hatStyle: 1 },
    { name: 'ATLAS', isAI: true, charColor: 0x22c55e, colorHex: '#22c55e', hatColor: 0x1e293b, hatStyle: 2 },
    { name: 'NOVA', isAI: true, charColor: 0xec4899, colorHex: '#ec4899', hatColor: 0xffffff, hatStyle: 3 },
    { name: 'PHOENIX', isAI: true, charColor: 0xef4444, colorHex: '#ef4444', hatColor: 0xf97316, hatStyle: 0 },
    { name: 'CYBER', isAI: true, charColor: 0x06b6d4, colorHex: '#06b6d4', hatColor: 0x38bdf8, hatStyle: 3 }
  ];
  const fallback = defaultThemes[matchSettings.customPlayers.length % defaultThemes.length];
  matchSettings.customPlayers.push({ ...fallback });

  matchSettings.customPlayers.forEach((cp, k) => {
    if (PLAYER_THEMES[k]) {
      PLAYER_THEMES[k].name = cp.name;
      PLAYER_THEMES[k].colorHex = cp.colorHex;
      PLAYER_THEMES[k].charColor = cp.charColor;
      PLAYER_THEMES[k].hatColor = cp.hatColor;
      PLAYER_THEMES[k].isAI = cp.isAI;
    }
  });

  setLobbyPlayerCount(Math.max(2, lobbyPlayerCount - 1));

  if (selectedSetupPlayerIdx >= lobbyPlayerCount) {
    selectedSetupPlayerIdx = Math.max(0, lobbyPlayerCount - 1);
  }
  const curP = matchSettings.customPlayers[selectedSetupPlayerIdx];
  if (curP) {
    updateLobbyHeroAvatar(curP.hatStyle || 0, curP.colorHex || '#3b82f6', curP.charColor || 0x3b82f6);
  }

  if (window.renderPlayerCards) window.renderPlayerCards();
  if (window.renderMatchSettingButtons) window.renderMatchSettingButtons();
  playSFX('hop');
  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastLobbySettings();
  }
}

export function removeBotOrSlot() {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  if (lobbyPlayerCount > 2) {
    removePlayerAt(lobbyPlayerCount - 1);
  }
}

export function cycleAvatarPrev() {
  const isGuest = networkState.isMultiplayer && !networkState.isHost;
  const curIdx = isGuest ? networkState.localPlayerIdx : ((selectedSetupPlayerIdx < lobbyPlayerCount) ? selectedSetupPlayerIdx : 0);
  if (!canCurrentPlayerEditSlot(curIdx)) {
    playSFX('flinch');
    return;
  }
  const p = matchSettings.customPlayers[curIdx];
  if (!p) return;
  p.hatStyle = (p.hatStyle + ARCHETYPES.length - 1) % ARCHETYPES.length;
  p.hatColor = ARCHETYPES[p.hatStyle]?.hatColor || 0xfde047;
  if (PLAYER_THEMES[curIdx]) PLAYER_THEMES[curIdx].hatColor = p.hatColor;
  updateLobbyHeroAvatar(p.hatStyle, p.colorHex, p.charColor);
  if (window.renderPlayerCards) window.renderPlayerCards();
  playSFX('hop');
  if (networkState.isMultiplayer) {
    if (networkState.isHost) {
      broadcastLobbySettings();
    } else {
      sendClientProfileUpdate({ hatStyle: p.hatStyle, hatColor: p.hatColor });
    }
  }
}

export function cycleAvatarNext() {
  const isGuest = networkState.isMultiplayer && !networkState.isHost;
  const curIdx = isGuest ? networkState.localPlayerIdx : ((selectedSetupPlayerIdx < lobbyPlayerCount) ? selectedSetupPlayerIdx : 0);
  if (!canCurrentPlayerEditSlot(curIdx)) {
    playSFX('flinch');
    return;
  }
  const p = matchSettings.customPlayers[curIdx];
  if (!p) return;
  p.hatStyle = (p.hatStyle + 1) % ARCHETYPES.length;
  p.hatColor = ARCHETYPES[p.hatStyle]?.hatColor || 0xfde047;
  if (PLAYER_THEMES[curIdx]) PLAYER_THEMES[curIdx].hatColor = p.hatColor;
  updateLobbyHeroAvatar(p.hatStyle, p.colorHex, p.charColor);
  if (window.renderPlayerCards) window.renderPlayerCards();
  playSFX('hop');
  if (networkState.isMultiplayer) {
    if (networkState.isHost) {
      broadcastLobbySettings();
    } else {
      sendClientProfileUpdate({ hatStyle: p.hatStyle, hatColor: p.hatColor });
    }
  }
}

export function setLocalPlayerColor(hex, charColor) {
  const isGuest = networkState.isMultiplayer && !networkState.isHost;
  const curIdx = isGuest ? networkState.localPlayerIdx : ((selectedSetupPlayerIdx < lobbyPlayerCount) ? selectedSetupPlayerIdx : 0);
  if (!canCurrentPlayerEditSlot(curIdx)) {
    playSFX('flinch');
    return;
  }
  const success = setPlayerColor(curIdx, hex, charColor);
  if (success) {
    const p = matchSettings.customPlayers[curIdx];
    if (p) {
      updateLobbyHeroAvatar(p.hatStyle || 0, hex, charColor);
    }
  }
}

export function setPlayerColor(playerIdx, hex, charColor) {
  if (!canCurrentPlayerEditSlot(playerIdx)) return false;
  const normHex = (hex || '').toLowerCase();
  const isTaken = matchSettings.customPlayers.some((p, idx) => 
    idx !== playerIdx && idx < lobbyPlayerCount && (p.colorHex || '').toLowerCase() === normHex
  );
  if (isTaken) {
    playSFX('flinch');
    return false;
  }

  if (matchSettings.customPlayers[playerIdx]) {
    matchSettings.customPlayers[playerIdx].colorHex = hex;
    matchSettings.customPlayers[playerIdx].charColor = charColor;
    if (PLAYER_THEMES[playerIdx]) {
      PLAYER_THEMES[playerIdx].colorHex = hex;
      PLAYER_THEMES[playerIdx].charColor = charColor;
    }
    if (playerIdx === selectedSetupPlayerIdx) {
      updateLobbyHeroAvatar(matchSettings.customPlayers[playerIdx].hatStyle || 0, hex, charColor);
    }
    if (window.renderPlayerCards) window.renderPlayerCards();
    if (window.renderMatchSettingButtons) window.renderMatchSettingButtons();
    playSFX('click');

    if (networkState.isMultiplayer) {
      if (networkState.isHost) {
        broadcastLobbySettings();
      } else {
        sendClientProfileUpdate({ colorHex: hex, charColor });
      }
    }
    return true;
  }
  return false;
}

export function setPlayerArchetype(playerIdx, archIdx) {
  if (!canCurrentPlayerEditSlot(playerIdx)) return;
  if (matchSettings.customPlayers[playerIdx]) {
    matchSettings.customPlayers[playerIdx].hatStyle = archIdx;
    matchSettings.customPlayers[playerIdx].hatColor = ARCHETYPES[archIdx].hatColor;
    if (PLAYER_THEMES[playerIdx]) PLAYER_THEMES[playerIdx].hatColor = ARCHETYPES[archIdx].hatColor;
    if (playerIdx === selectedSetupPlayerIdx) {
      updateLobbyHeroAvatar(archIdx, matchSettings.customPlayers[playerIdx].colorHex, matchSettings.customPlayers[playerIdx].charColor);
    }
    if (window.renderPlayerCards) window.renderPlayerCards();
    playSFX('hop');
    if (networkState.isMultiplayer) {
      if (networkState.isHost) {
        broadcastLobbySettings();
      } else {
        sendClientProfileUpdate({ hatStyle: archIdx, hatColor: ARCHETYPES[archIdx].hatColor });
      }
    }
  }
}

export function randomizeAllNames() {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  for (let i = 0; i < lobbyPlayerCount; i++) {
    // In multiplayer, host does not randomize connected client names
    if (networkState.isMultiplayer && networkState.isHost && i !== 0) {
      const target = setupPlayers[i] || matchSettings.customPlayers[i];
      if (target && (target.isOnlinePeer || !target.isAI)) continue;
    }
    const list = FUN_NAMES[i % FUN_NAMES.length];
    const chosen = list[Math.floor(Math.random() * list.length)];
    if (window.setPlayerSetupName) window.setPlayerSetupName(i, chosen);
  }
  if (window.renderPlayerCards) window.renderPlayerCards();
  playSFX('dice');
  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastLobbySettings();
  }
}

export function randomizeSinglePlayerName(idx) {
  if (networkState.isMultiplayer) {
    if (!networkState.isHost && idx !== networkState.localPlayerIdx) return;
    if (networkState.isHost && idx !== 0) {
      const target = setupPlayers[idx] || matchSettings.customPlayers[idx];
      if (target && (target.isOnlinePeer || !target.isAI)) return;
    }
  }
  const list = FUN_NAMES[idx % FUN_NAMES.length];
  const chosen = list[Math.floor(Math.random() * list.length)];
  if (window.setPlayerSetupName) window.setPlayerSetupName(idx, chosen);
  if (window.renderPlayerCards) window.renderPlayerCards();
  playSFX('hop');
}
