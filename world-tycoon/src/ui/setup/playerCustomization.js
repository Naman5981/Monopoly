/**
 * ui/setup/playerCustomization.js
 * Player archetypes, colors, avatar cycling, slot addition/removal, and customization permissions.
 */

import { matchSettings, lobbyPlayerCount, setLobbyPlayerCount, setupPlayers, getSavedPlayerName } from '../../game/state.js';
import { PLAYER_THEMES } from '../../game/data.js';
import { playSFX } from '../../game/audio.js';
import { updateLobbyHeroAvatar } from '../../three/scene.js';
import { networkState, broadcastLobbySettings, sendClientProfileUpdate } from '../../network/p2p.js';
import { animatePlayerJoinRadarPing } from '../anim.js';
import { currentLobbyView } from './lobbyNavigation.js';
import { showTurnLockToast } from '../hud.js';

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

/**
 * Generates a completely randomized appearance (archetype & candy color) for an AI bot.
 * @param {string[]} [excludeColors=[]] - List of hex color strings to avoid duplicates
 */
export function generateRandomBotAppearance(excludeColors = []) {
  const arch = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  const lowerExcludes = excludeColors.map(c => (c || '').toLowerCase());
  const available = CANDY_PALETTE.filter(c => !lowerExcludes.includes(c.hex.toLowerCase()));
  const chosenColor = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : CANDY_PALETTE[Math.floor(Math.random() * CANDY_PALETTE.length)];

  return {
    hatStyle: arch.id,
    hatColor: arch.hatColor,
    colorHex: chosenColor.hex,
    charColor: chosenColor.charColor
  };
}

export function canCurrentPlayerEditSlot(slotIdx) {
  // In any lobby (Local Play, Multiplayer Portal, Multiplayer Room), nobody can change archetypes or wardrobe!
  if (currentLobbyView !== 'title') {
    return false;
  }
  // On the Home/Title Screen, only the local human player (slot 0) can customize their own appearance
  return slotIdx === 0;
}

/**
 * Determines if the current player is allowed to change the color of the specified slot.
 * Real players can change their OWN color in the lobby and on the home screen.
 * AI bots' colors CANNOT be changed by players.
 * In multiplayer, players cannot change other players' colors.
 * @param {number} slotIdx - Player slot index
 * @returns {boolean}
 */
export function canCurrentPlayerChangeColor(slotIdx) {
  if (slotIdx < 0 || slotIdx >= lobbyPlayerCount) return false;
  const target = matchSettings.customPlayers[slotIdx];
  if (!target || target.isAI) return false;

  if (networkState.isMultiplayer) {
    if (networkState.isHost) {
      return slotIdx === 0;
    }
    return slotIdx === networkState.localPlayerIdx;
  }

  // Local Play / Title Screen: human players can customize their color
  return slotIdx === 0 || !target.isAI;
}

export function selectSetupPlayer(idx) {
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
      
      // Assign unique, randomized bot appearance
      const usedColors = matchSettings.customPlayers
        .slice(0, newIdx)
        .map(p => (p.colorHex || '').toLowerCase());
      const botLook = generateRandomBotAppearance(usedColors);

      matchSettings.customPlayers[newIdx].hatStyle = botLook.hatStyle;
      matchSettings.customPlayers[newIdx].hatColor = botLook.hatColor;
      matchSettings.customPlayers[newIdx].colorHex = botLook.colorHex;
      matchSettings.customPlayers[newIdx].charColor = botLook.charColor;

      if (PLAYER_THEMES[newIdx]) {
        PLAYER_THEMES[newIdx].name = matchSettings.customPlayers[newIdx].name;
        PLAYER_THEMES[newIdx].hatColor = botLook.hatColor;
        PLAYER_THEMES[newIdx].colorHex = botLook.colorHex;
        PLAYER_THEMES[newIdx].charColor = botLook.charColor;
      }
      if (setupPlayers[newIdx]) {
        setupPlayers[newIdx].name = matchSettings.customPlayers[newIdx].name;
        setupPlayers[newIdx].hatStyle = botLook.hatStyle;
        setupPlayers[newIdx].hatColor = botLook.hatColor;
        setupPlayers[newIdx].colorHex = botLook.colorHex;
        setupPlayers[newIdx].charColor = botLook.charColor;
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

  const sp = setupPlayers[idx];
  const cp = matchSettings.customPlayers[idx];
  if (networkState.isMultiplayer && (sp?.isOnlinePeer || cp?.isOnlinePeer || Boolean(sp?.peerId))) {
    showTurnLockToast('Connected online players cannot be removed!');
    return;
  }

  matchSettings.customPlayers.splice(idx, 1);
  if (setupPlayers !== matchSettings.customPlayers && setupPlayers.length > idx) {
    setupPlayers.splice(idx, 1);
  }

  const defaultThemes = [
    { name: getSavedPlayerName(), isAI: false, charColor: 0x3b82f6, colorHex: '#3b82f6', hatColor: 0x334155, hatStyle: 0 },
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
  if (currentLobbyView !== 'title') {
    playSFX('flinch');
    showTurnLockToast('Appearance cannot be changed in the lobby!');
    return;
  }
  const curIdx = 0;
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
  if (currentLobbyView !== 'title') {
    playSFX('flinch');
    showTurnLockToast('Appearance cannot be changed in the lobby!');
    return;
  }
  const curIdx = 0;
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
  const targetIdx = isGuest
    ? (networkState.localPlayerIdx || 0)
    : (selectedSetupPlayerIdx < lobbyPlayerCount && !matchSettings.customPlayers[selectedSetupPlayerIdx]?.isAI ? selectedSetupPlayerIdx : 0);

  if (!canCurrentPlayerChangeColor(targetIdx)) {
    playSFX('flinch');
    showTurnLockToast('You can only change your own player color!');
    return false;
  }
  const success = setPlayerColor(targetIdx, hex, charColor);
  if (success) {
    const p = matchSettings.customPlayers[targetIdx];
    if (p && selectedSetupPlayerIdx === targetIdx) {
      updateLobbyHeroAvatar(p.hatStyle || 0, hex, charColor);
    }
  }
  return success;
}

export function setPlayerColor(playerIdx, hex, charColor) {
  if (!canCurrentPlayerChangeColor(playerIdx)) return false;
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
      PLAYER_THEMES[playerIdx].color = charColor;
    }
    if (setupPlayers[playerIdx]) {
      setupPlayers[playerIdx].colorHex = hex;
      setupPlayers[playerIdx].charColor = charColor;
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
  if (currentLobbyView !== 'title') return;
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
  const usedColors = [(matchSettings.customPlayers[0]?.colorHex || '#3b82f6').toLowerCase()];
  for (let i = 0; i < lobbyPlayerCount; i++) {
    const target = setupPlayers[i] || matchSettings.customPlayers[i];
    // ONLY randomize AI bots! Human players cannot have their names/appearance randomized in the lobby.
    if (!target || !target.isAI) {
      if (target?.colorHex) usedColors.push(target.colorHex.toLowerCase());
      continue;
    }

    const list = FUN_NAMES[i % FUN_NAMES.length];
    const chosen = list[Math.floor(Math.random() * list.length)];
    target.name = chosen;

    const botLook = generateRandomBotAppearance(usedColors);
    usedColors.push(botLook.colorHex.toLowerCase());

    target.hatStyle = botLook.hatStyle;
    target.hatColor = botLook.hatColor;
    target.colorHex = botLook.colorHex;
    target.charColor = botLook.charColor;

    if (PLAYER_THEMES[i]) {
      PLAYER_THEMES[i].name = chosen;
      PLAYER_THEMES[i].hatColor = botLook.hatColor;
      PLAYER_THEMES[i].colorHex = botLook.colorHex;
      PLAYER_THEMES[i].charColor = botLook.charColor;
    }
    if (matchSettings.customPlayers[i]) {
      matchSettings.customPlayers[i].name = chosen;
      matchSettings.customPlayers[i].hatStyle = botLook.hatStyle;
      matchSettings.customPlayers[i].hatColor = botLook.hatColor;
      matchSettings.customPlayers[i].colorHex = botLook.colorHex;
      matchSettings.customPlayers[i].charColor = botLook.charColor;
    }
    if (setupPlayers[i]) {
      setupPlayers[i].name = chosen;
      setupPlayers[i].hatStyle = botLook.hatStyle;
      setupPlayers[i].hatColor = botLook.hatColor;
      setupPlayers[i].colorHex = botLook.colorHex;
      setupPlayers[i].charColor = botLook.charColor;
    }
  }
  if (window.renderPlayerCards) window.renderPlayerCards();
  playSFX('dice');
  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastLobbySettings();
  }
}

export function randomizeSinglePlayerName(idx) {
  const target = setupPlayers[idx] || matchSettings.customPlayers[idx];
  // ONLY randomize AI bots!
  if (!target || !target.isAI) return;

  const list = FUN_NAMES[idx % FUN_NAMES.length];
  const chosen = list[Math.floor(Math.random() * list.length)];
  target.name = chosen;
  if (PLAYER_THEMES[idx]) PLAYER_THEMES[idx].name = chosen;
  if (matchSettings.customPlayers[idx]) matchSettings.customPlayers[idx].name = chosen;
  if (setupPlayers[idx]) setupPlayers[idx].name = chosen;
  if (window.renderPlayerCards) window.renderPlayerCards();
  playSFX('hop');
}
