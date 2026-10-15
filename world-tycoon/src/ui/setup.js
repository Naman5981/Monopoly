/**
 * ui/setup.js
 * Interactive Players Add & Match Configuration Landing Page (First Page).
 */

import { matchSettings, setLobbyPlayerCount, lobbyPlayerCount } from '../game/state.js';
import { PLAYER_THEMES, applyBoardEdition } from '../game/data.js';
import { playSFX } from '../game/audio.js';
import { fireConfettiBurst, applyLightingMode } from '../three/effects.js';
import { startIntroCameraFlyIn, getSceneLighting, initLobbyHeroStage, updateLobbyHeroAvatar, applyBoardStyle, refreshAllTileTexturesAndMaterials } from '../three/scene.js';
import { startNewMatch } from '../game/engine.js';
import {
  networkState,
  hostRoom,
  joinRoom,
  leaveMultiplayerRoom,
  copyRoomInviteLink,
  copyRoomCodeOnly,
  broadcastStartOnlineMatch,
  broadcastLobbySettings,
  registerNetworkCallbacks,
  broadcastAction
} from '../network/p2p.js';

const ARCHETYPES = [
  { id: 0, name: 'Aviator', icon: '✈️', hatColor: 0x334155, desc: 'Sky Captain Goggles' },
  { id: 1, name: 'Banker', icon: '🎩', hatColor: 0xfde047, desc: 'Golden Monocle & Top Hat' },
  { id: 2, name: 'Explorer', icon: '🧭', hatColor: 0x1e293b, desc: 'Safari Pith Helmet' },
  { id: 3, name: 'Cyber Nova', icon: '👑', hatColor: 0xffffff, desc: 'Neon Cyber Visor' }
];

const CANDY_PALETTE = [
  { hex: '#ef4444', charColor: 0xef4444, name: 'Ruby Red' },
  { hex: '#3b82f6', charColor: 0x3b82f6, name: 'Sky Blue' },
  { hex: '#22c55e', charColor: 0x22c55e, name: 'Lawn Green' },
  { hex: '#84cc16', charColor: 0x84cc16, name: 'Lime' },
  { hex: '#8b5cf6', charColor: 0x8b5cf6, name: 'Purple' },
  { hex: '#fb923c', charColor: 0xf97316, name: 'Peach' },
  { hex: '#ec4899', charColor: 0xec4899, name: 'Pink' },
  { hex: '#06b6d4', charColor: 0x06b6d4, name: 'Turquoise' }
];

const FUN_NAMES = [
  ['NAMAN', 'ALEX', 'ELON', 'CAPTAIN', 'ACE', 'MAVERICK'],
  ['PRANJAL', 'WARREN', 'BARON', 'FINANCIER', 'MIDAS', 'STERLING'],
  ['ATLAS', 'COLUMBUS', 'MARCO', 'VOYAGER', 'DRAKE', 'SCOUT'],
  ['NOVA', 'CYBER', 'AURA', 'VALKYRIE', 'PHOENIX', 'NEO'],
  ['TITAN', 'VORTEX', 'APOLLO', 'SHADOW', 'ORION', 'BLAZE'],
  ['ZEPHYR', 'NEXUS', 'PULSE', 'COSMO', 'QUANTUM', 'ECHO']
];

export let selectedSetupPlayerIdx = 0;

export function selectSetupPlayer(idx) {
  if (idx >= 0 && idx < lobbyPlayerCount) {
    selectedSetupPlayerIdx = idx;
    const cp = matchSettings.customPlayers[selectedSetupPlayerIdx];
    if (cp) {
      updateLobbyHeroAvatar(cp.hatStyle || 0, cp.colorHex || '#3b82f6', cp.charColor || 0x3b82f6);
    }
    renderPlayerCards();
    renderMatchSettingButtons();
    playSFX('hop');
  }
}

export function initLandingSetup() {
  renderPlayerCards();
  renderMatchSettingButtons();

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
      selectMatchMode('online');
      const input = document.getElementById('input-p2p-room-code');
      if (input) input.value = roomParam.toUpperCase().trim();
    }
  }
}

export function setPlayerCount(n) {
  setLobbyPlayerCount(Math.min(6, Math.max(2, n)));
  if (selectedSetupPlayerIdx >= lobbyPlayerCount) {
    selectedSetupPlayerIdx = 0;
  }
  renderPlayerCards();
  playSFX('hop');
}

export function addBotOrSlot() {
  if (lobbyPlayerCount < 6) {
    setLobbyPlayerCount(lobbyPlayerCount + 1);
    const newIdx = lobbyPlayerCount - 1;
    if (matchSettings.customPlayers[newIdx]) {
      matchSettings.customPlayers[newIdx].isAI = true;
      const list = FUN_NAMES[newIdx % FUN_NAMES.length];
      matchSettings.customPlayers[newIdx].name = list[Math.floor(Math.random() * list.length)];
    }
    renderPlayerCards();
    playSFX('hop');
  }
}

export function removePlayerAt(idx) {
  if (lobbyPlayerCount <= 2 || idx <= 0 || idx >= lobbyPlayerCount) return;

  matchSettings.customPlayers.splice(idx, 1);

  const defaultThemes = [
    { name: 'YOU', isAI: false, charColor: 0xef4444, colorHex: '#6c5ce7', hatColor: 0x334155, hatStyle: 0 },
    { name: 'BIDIK', isAI: true, charColor: 0xf97316, colorHex: '#f39c12', hatColor: 0xfde047, hatStyle: 1 },
    { name: 'ATLAS', isAI: true, charColor: 0x10b981, colorHex: '#10b981', hatColor: 0x1e293b, hatStyle: 2 },
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

  renderPlayerCards();
  renderMatchSettingButtons();
  playSFX('hop');
}

export function removeBotOrSlot() {
  if (lobbyPlayerCount > 2) {
    removePlayerAt(lobbyPlayerCount - 1);
  }
}

export function cycleAvatarPrev() {
  const curIdx = (selectedSetupPlayerIdx < lobbyPlayerCount) ? selectedSetupPlayerIdx : 0;
  const p = matchSettings.customPlayers[curIdx];
  if (!p) return;
  p.hatStyle = (p.hatStyle + 3) % 4;
  p.hatColor = ARCHETYPES[p.hatStyle].hatColor;
  if (PLAYER_THEMES[curIdx]) PLAYER_THEMES[curIdx].hatColor = p.hatColor;
  updateLobbyHeroAvatar(p.hatStyle, p.colorHex, p.charColor);
  renderPlayerCards();
  playSFX('hop');
}

export function cycleAvatarNext() {
  const curIdx = (selectedSetupPlayerIdx < lobbyPlayerCount) ? selectedSetupPlayerIdx : 0;
  const p = matchSettings.customPlayers[curIdx];
  if (!p) return;
  p.hatStyle = (p.hatStyle + 1) % 4;
  p.hatColor = ARCHETYPES[p.hatStyle].hatColor;
  if (PLAYER_THEMES[curIdx]) PLAYER_THEMES[curIdx].hatColor = p.hatColor;
  updateLobbyHeroAvatar(p.hatStyle, p.colorHex, p.charColor);
  renderPlayerCards();
  playSFX('hop');
}

export function setLocalPlayerColor(hex, charColor) {
  const curIdx = (selectedSetupPlayerIdx < lobbyPlayerCount) ? selectedSetupPlayerIdx : 0;
  setPlayerColor(curIdx, hex, charColor);
  const p = matchSettings.customPlayers[curIdx];
  updateLobbyHeroAvatar(p?.hatStyle || 0, hex, charColor);
  renderPlayerCards();
  renderMatchSettingButtons();
}

export function renderPlayerCards() {
  const container = document.getElementById('setup-players-roster');
  const countBadge = document.getElementById('table-player-count-badge');
  if (countBadge) countBadge.textContent = `${lobbyPlayerCount}/6`;

  if (selectedSetupPlayerIdx >= lobbyPlayerCount) {
    selectedSetupPlayerIdx = 0;
  }

  // Update top bar profile badge
  const p0 = matchSettings.customPlayers[0];
  const profileNameEl = document.getElementById('setup-profile-name');
  const profileAvatarEl = document.getElementById('setup-profile-avatar');
  if (profileNameEl && p0) profileNameEl.textContent = p0.name || 'NAMAN';
  if (profileAvatarEl && p0) {
    profileAvatarEl.textContent = (p0.name || 'N')[0].toUpperCase();
    profileAvatarEl.style.borderColor = p0.colorHex || '#10b981';
    profileAvatarEl.style.color = p0.colorHex || '#10b981';
  }

  // Update center hero archetype pill indicator based on selected player
  const curPlayer = matchSettings.customPlayers[selectedSetupPlayerIdx] || p0;
  const archEl = document.getElementById('setup-character-archetype-name');
  if (archEl && curPlayer) {
    const arch = ARCHETYPES[curPlayer.hatStyle || 0] || ARCHETYPES[0];
    const roleTag = selectedSetupPlayerIdx === 0 ? 'YOU' : curPlayer.name;
    archEl.innerHTML = `<span class="text-xl">${arch.icon}</span><span class="font-black text-sm tracking-wide text-slate-800">${arch.name.toUpperCase()} (${roleTag})</span>`;
  }

  if (!container) return;
  container.innerHTML = '';

  // Render active player rows with spacious game-grade design
  for (let i = 0; i < lobbyPlayerCount; i++) {
    const cp = matchSettings.customPlayers[i];
    const isHuman = !cp.isAI;
    const isSelected = (i === selectedSetupPlayerIdx);
    const initial = (cp.name || `P${i + 1}`)[0].toUpperCase();

    const row = document.createElement('div');
    row.className = `bg-white/95 border-2 ${
      isSelected ? 'border-sky-500 ring-2 ring-sky-300 shadow-md bg-sky-50/50' : 'border-slate-200/80 hover:border-sky-300 shadow-xs'
    } rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2.5 transition cursor-pointer`;
    row.onclick = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.closest('button')) return;
      window.selectSetupPlayer(i);
    };

    row.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0 flex-1">
        <!-- Colored avatar initial circle -->
        <div class="w-10 h-10 rounded-full border-2 border-white shadow-md flex items-center justify-center font-black text-sm text-white flex-shrink-0" style="background:${cp.colorHex}">
          ${initial}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            ${i === 0 ? '<span class="text-sm">👑</span>' : ''}
            <input type="text" value="${cp.name}" oninput="window.setPlayerSetupName(${i}, this.value)" class="bg-transparent font-black text-sm sm:text-base text-slate-800 uppercase focus:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-400 rounded-lg px-1.5 py-0.5 w-24 sm:w-32 truncate transition">
            ${isSelected ? '<span class="text-xs font-black bg-sky-500 text-white px-2.5 py-0.5 rounded-full shadow-xs">PODIUM</span>' : ''}
          </div>
          <div class="text-xs font-semibold text-slate-500 pl-1 mt-0.5">
            ${i === 0 ? 'Table Host' : (isHuman ? 'Human Player' : 'AI Tycoon Bot')}
          </div>
        </div>
      </div>

      <!-- Quick role toggle and Remove bot/player button -->
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <button onclick="window.togglePlayerRole(${i})" class="text-xs font-black px-2.5 py-1.5 rounded-xl border-2 transition cursor-pointer ${
          isHuman ? 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100 shadow-xs' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
        }" title="Toggle Human / Bot">
          <i class="${isHuman ? 'fa-solid fa-user' : 'fa-solid fa-robot'} mr-1 text-xs"></i>
          ${isHuman ? 'Player' : 'Bot'}
        </button>
        ${(i > 0 && lobbyPlayerCount > 2) ? `
        <button onclick="window.removePlayerAt(${i})" class="text-xs font-black px-2.5 py-1.5 rounded-xl border-2 border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition cursor-pointer shadow-xs flex items-center gap-1" title="Remove this bot / player">
          <i class="fa-solid fa-xmark text-xs font-black"></i>
          <span>Remove</span>
        </button>
        ` : ''}
      </div>
    `;

    container.appendChild(row);
  }

  // Render open slots (up to 6)
  for (let s = lobbyPlayerCount; s < 6; s++) {
    const slot = document.createElement('div');
    slot.className = 'game-slot-dashed p-2.5 sm:p-3 flex items-center justify-between cursor-pointer transition hover:scale-[1.01]';
    slot.onclick = () => window.addBotOrSlot();
    slot.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-full border-2 border-dashed border-sky-300 flex items-center justify-center text-sky-400 text-sm">
          <i class="fa-solid fa-user-plus"></i>
        </div>
        <span class="font-extrabold text-sm text-sky-700">Open Slot ${s + 1}</span>
      </div>
      <span class="text-xs font-black text-sky-500 uppercase tracking-wider bg-white/80 px-3 py-1 rounded-full shadow-xs border border-sky-200">+ Add Bot</span>
    `;
    container.appendChild(slot);
  }
}

export function setPlayerSetupName(idx, name) {
  if (matchSettings.customPlayers[idx]) {
    matchSettings.customPlayers[idx].name = name.toUpperCase() || `PLAYER ${idx + 1}`;
    PLAYER_THEMES[idx].name = matchSettings.customPlayers[idx].name;
    if (idx === 0) {
      const pNameEl = document.getElementById('setup-profile-name');
      const pAvEl = document.getElementById('setup-profile-avatar');
      if (pNameEl) pNameEl.textContent = matchSettings.customPlayers[0].name;
      if (pAvEl) pAvEl.textContent = (matchSettings.customPlayers[0].name || 'N')[0];
    }
  }
}

export function togglePlayerRole(idx) {
  if (matchSettings.customPlayers[idx]) {
    matchSettings.customPlayers[idx].isAI = !matchSettings.customPlayers[idx].isAI;
    renderPlayerCards();
    playSFX('hop');
  }
}

export function setPlayerArchetype(playerIdx, archIdx) {
  if (matchSettings.customPlayers[playerIdx]) {
    matchSettings.customPlayers[playerIdx].hatStyle = archIdx;
    matchSettings.customPlayers[playerIdx].hatColor = ARCHETYPES[archIdx].hatColor;
    PLAYER_THEMES[playerIdx].hatColor = ARCHETYPES[archIdx].hatColor;
    if (playerIdx === 0) {
      updateLobbyHeroAvatar(archIdx, matchSettings.customPlayers[0].colorHex, matchSettings.customPlayers[0].charColor);
    }
    renderPlayerCards();
    playSFX('hop');
  }
}

export function setPlayerColor(playerIdx, hex, charColor) {
  if (matchSettings.customPlayers[playerIdx]) {
    matchSettings.customPlayers[playerIdx].colorHex = hex;
    matchSettings.customPlayers[playerIdx].charColor = charColor;
    PLAYER_THEMES[playerIdx].colorHex = hex;
    PLAYER_THEMES[playerIdx].charColor = charColor;
    if (playerIdx === 0) {
      updateLobbyHeroAvatar(matchSettings.customPlayers[0].hatStyle, hex, charColor);
    }
    renderPlayerCards();
    playSFX('hop');
  }
}

export function randomizeAllNames() {
  for (let i = 0; i < lobbyPlayerCount; i++) {
    const list = FUN_NAMES[i % FUN_NAMES.length];
    const chosen = list[Math.floor(Math.random() * list.length)];
    setPlayerSetupName(i, chosen);
  }
  renderPlayerCards();
  playSFX('dice');
}

export function randomizeSinglePlayerName(idx) {
  const list = FUN_NAMES[idx % FUN_NAMES.length];
  const chosen = list[Math.floor(Math.random() * list.length)];
  setPlayerSetupName(idx, chosen);
  renderPlayerCards();
  playSFX('hop');
}

/* ─────────────────────────────────────────────────────────────────────────────
   MATCH SETTINGS: CASH, TIMER, ATMOSPHERE, COLOR SWATCHES
───────────────────────────────────────────────────────────────────────────── */
export function setStartingCash(amt) {
  matchSettings.startingCash = amt;
  renderMatchSettingButtons();
  playSFX('hop');
}

export function stepDecisionTime(delta) {
  const cur = matchSettings.turnDuration || 20;
  matchSettings.turnDuration = Math.max(10, Math.min(60, cur + delta * 5));
  renderMatchSettingButtons();
  playSFX('hop');
}

export const MATCH_DURATION_OPTIONS = [15, 30, 45, 60, 75];

export function stepMatchDuration(delta) {
  const cur = matchSettings.matchDurationMinutes || 15;
  const idx = MATCH_DURATION_OPTIONS.indexOf(cur);
  const nextIdx = Math.max(0, Math.min(MATCH_DURATION_OPTIONS.length - 1, (idx === -1 ? 0 : idx) + delta));
  matchSettings.matchDurationMinutes = MATCH_DURATION_OPTIONS[nextIdx];
  renderMatchSettingButtons();
  playSFX('hop');
  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastLobbySettings();
  }
}

export function stepAtmosphere(delta) {
  const modes = ['day', 'sunset', 'night'];
  const curIdx = modes.indexOf(matchSettings.lightingTheme || 'day');
  const nextIdx = (curIdx + delta + modes.length) % modes.length;
  setAtmosphereMode(modes[nextIdx]);
}

export const stepMatchLength = stepAtmosphere;

export function setTurnTimerDuration(sec) {
  matchSettings.turnDuration = sec;
  renderMatchSettingButtons();
  playSFX('hop');
}

export function setAtmosphereMode(mode) {
  matchSettings.lightingTheme = mode;
  applyLightingMode(mode, getSceneLighting());
  renderMatchSettingButtons();
  playSFX('hop');
}

export function setBoardStyle(style) {
  if (['wood', 'cyberpunk', 'elegant'].includes(style)) {
    matchSettings.boardStyle = style;
    applyBoardStyle(style);
    renderMatchSettingButtons();
    playSFX('hop');
  }
}

export function cycleBoardStyle() {
  const styles = ['wood', 'cyberpunk', 'elegant'];
  const curIdx = styles.indexOf(matchSettings.boardStyle || 'wood');
  const nextStyle = styles[(curIdx + 1) % styles.length];
  setBoardStyle(nextStyle);
}

export function setBoardEdition(edition) {
  if (['world', 'rajasthan'].includes(edition)) {
    matchSettings.boardEdition = edition;
    applyBoardEdition(edition);
    refreshAllTileTexturesAndMaterials();
    renderMatchSettingButtons();
    playSFX('hop');
    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastAction('ACTION_SYNC_BOARD_EDITION', { boardEdition: edition });
    }
  }
}

export function cycleBoardEdition() {
  const editions = ['world', 'rajasthan'];
  const curIdx = editions.indexOf(matchSettings.boardEdition || 'world');
  const nextEdition = editions[(curIdx + 1) % editions.length];
  setBoardEdition(nextEdition);
}

export function renderMatchSettingButtons() {
  // Cash buttons
  [1500000, 2000000, 3000000, 5000000].forEach(amt => {
    const btn = document.getElementById(`setup-cash-${amt}`);
    if (btn) {
      const active = matchSettings.startingCash === amt;
      btn.className = `py-2.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer text-center ${
        active ? 'bg-sky-500 text-white shadow-md scale-[1.02]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
      }`;
    }
  });

  // Profile Cash display in top bar
  const profileCashEl = document.getElementById('setup-profile-cash');
  if (profileCashEl) {
    const cashM = (matchSettings.startingCash / 1_000_000).toFixed(1).replace('.0', '');
    profileCashEl.textContent = `$${cashM}M`;
  }

  // Decision time text
  const timerTextEl = document.getElementById('setup-decision-time-text');
  if (timerTextEl) {
    timerTextEl.textContent = `${matchSettings.turnDuration || 20} s`;
  }

  // Match Duration text (15 min steps up to 1.25 hr)
  const durationTextEl = document.getElementById('setup-match-duration-text');
  if (durationTextEl) {
    const mins = matchSettings.matchDurationMinutes || 15;
    if (mins >= 60) {
      const hours = (mins / 60).toFixed(2).replace(/\.?0+$/, '');
      durationTextEl.textContent = `${hours} hr (${mins}m)`;
    } else {
      durationTextEl.textContent = `${mins} min`;
    }
  }

  // Match length / atmosphere text
  const atmoTextEl = document.getElementById('setup-atmosphere-text') || document.getElementById('setup-match-length-text');
  if (atmoTextEl) {
    const theme = matchSettings.lightingTheme || 'day';
    atmoTextEl.textContent = theme === 'night' ? 'Night' : (theme === 'sunset' ? 'Sunset' : 'Morning');
  }

  // Board style buttons in setup lobby
  ['wood', 'cyberpunk', 'elegant'].forEach(style => {
    const btn = document.getElementById(`setup-board-${style}`);
    if (btn) {
      const active = (matchSettings.boardStyle || 'wood') === style;
      btn.className = `py-2 px-1 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center justify-center gap-1 ${
        active ? 'bg-sky-500 text-white shadow-md scale-[1.02]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
      }`;
    }
  });

  // Board Edition buttons in setup lobby
  ['world', 'rajasthan'].forEach(ed => {
    const btn = document.getElementById(`setup-edition-${ed}`);
    if (btn) {
      const active = (matchSettings.boardEdition || 'world') === ed;
      btn.className = `py-2.5 px-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
        active ? 'bg-sky-500 text-white shadow-md scale-[1.02]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
      }`;
    }
  });

  // Lobby Edition Info Badge
  const badgeText = document.getElementById('lobby-edition-badge-text');
  if (badgeText) {
    badgeText.textContent = (matchSettings.boardEdition === 'rajasthan') ? 'Rajasthan Edition' : 'World Tour Edition';
  }
  const tilesText = document.getElementById('lobby-edition-tiles-text');
  if (tilesText) {
    tilesText.textContent = (matchSettings.boardEdition === 'rajasthan') ? '32 Royal Cities & Heritage' : '32 Cities & Landmarks';
  }

  // HUD Board Style text
  const hudBoardText = document.getElementById('btn-board-style-text');
  if (hudBoardText) {
    const style = matchSettings.boardStyle || 'wood';
    hudBoardText.textContent = style === 'cyberpunk' ? 'Cyber' : (style === 'elegant' ? 'Elegant' : 'Wood');
  }

  // HUD Board Edition text
  const hudEditionText = document.getElementById('btn-board-edition-text');
  if (hudEditionText) {
    hudEditionText.textContent = (matchSettings.boardEdition === 'rajasthan') ? 'Rajasthan' : 'World';
  }

  // Color Swatches - reflects the player currently selected on the podium
  const colorContainer = document.getElementById('setup-color-swatches');
  if (colorContainer) {
    const curIdx = (selectedSetupPlayerIdx < lobbyPlayerCount) ? selectedSetupPlayerIdx : 0;
    const curHex = matchSettings.customPlayers[curIdx]?.colorHex || '#3b82f6';
    colorContainer.innerHTML = CANDY_PALETTE.map(c => `
      <button onclick="window.setLocalPlayerColor('${c.hex}', ${c.charColor})" class="w-8 h-8 rounded-full border-2 transition transform hover:scale-115 cursor-pointer flex items-center justify-center ${
        curHex === c.hex ? 'border-slate-900 ring-3 ring-sky-400 scale-110 shadow-md' : 'border-white shadow-xs'
      }" style="background:${c.hex}" title="${c.name}">
        ${curHex === c.hex ? '<i class="fa-solid fa-check text-white text-xs"></i>' : ''}
      </button>
    `).join('');
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   START GAME CTA & MULTIPLAYER ACTIONS
───────────────────────────────────────────────────────────────────────────── */
export function selectMatchMode(mode, triggerLeave = true) {
  const isOnline = mode === 'online';
  const btnLocal = document.getElementById('btn-mode-local');
  const btnOnline = document.getElementById('btn-mode-online');
  const p2pPanel = document.getElementById('setup-p2p-panel');

  if (btnLocal && btnOnline) {
    if (isOnline) {
      btnOnline.className = 'flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer bg-sky-500 text-white shadow-sm flex items-center justify-center gap-1.5';
      btnLocal.className = 'flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5';
      if (p2pPanel) p2pPanel.classList.remove('hidden');
    } else {
      btnLocal.className = 'flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer bg-sky-500 text-white shadow-sm flex items-center justify-center gap-1.5';
      btnOnline.className = 'flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5';
      if (p2pPanel) p2pPanel.classList.add('hidden');
      if (triggerLeave && networkState.isMultiplayer) {
        leaveMultiplayerRoom();
      }
    }
  }
  if (triggerLeave) {
    playSFX('hop');
  }
}

export async function hostP2PRoom() {
  const statusEl = document.getElementById('setup-p2p-status-text');
  const copyBtn = document.getElementById('btn-p2p-copy-link');
  const copyCodeBtn = document.getElementById('btn-p2p-copy-code');
  const leaveBtn = document.getElementById('btn-p2p-leave');
  try {
    if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-indigo-500"></i> Initializing serverless WebRTC room...';
    const code = await hostRoom();
    if (statusEl) statusEl.innerHTML = `🟢 <strong>Room ${code} Hosted!</strong> Share code with friends to join directly.`;
    if (copyBtn) { copyBtn.classList.remove('hidden'); copyBtn.classList.add('inline-flex'); }
    if (copyCodeBtn) { copyCodeBtn.classList.remove('hidden'); copyCodeBtn.classList.add('inline-flex'); }
    if (leaveBtn) { leaveBtn.classList.remove('hidden'); }
    renderPlayerCards();
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<span class="text-rose-600 font-bold">❌ Error: ${err.message || 'PeerJS initialization failed'}</span>`;
  }
}

export async function joinP2PRoom() {
  const input = document.getElementById('input-p2p-room-code');
  const statusEl = document.getElementById('setup-p2p-status-text');
  const leaveBtn = document.getElementById('btn-p2p-leave');
  const code = input ? input.value.trim() : '';
  if (!code) {
    alert('Please enter a Room Code (e.g. 8492) to connect!');
    return;
  }

  try {
    if (statusEl) statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-indigo-500"></i> Connecting to Room ${code}...`;
    const myInfo = matchSettings.customPlayers[0] || {};
    await joinRoom(code, {
      name: myInfo.name || 'Tycoon Friend',
      archetype: myInfo.hatStyle,
      charColor: myInfo.colorHex
    });
    if (statusEl) statusEl.innerHTML = `🟢 <strong>Connected to Room ${code}!</strong> Waiting for Host to start match...`;
    if (leaveBtn) leaveBtn.classList.remove('hidden');
    renderPlayerCards();
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<span class="text-rose-600 font-bold">❌ Error: ${err.message || 'Failed to connect'}</span>`;
  }
}

export function leaveP2PRoom() {
  leaveMultiplayerRoom();
  const statusEl = document.getElementById('setup-p2p-status-text');
  const copyBtn = document.getElementById('btn-p2p-copy-link');
  const copyCodeBtn = document.getElementById('btn-p2p-copy-code');
  const leaveBtn = document.getElementById('btn-p2p-leave');
  if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-circle-info text-indigo-500"></i> Ready to host or join a WebRTC room.';
  if (copyBtn) { copyBtn.classList.add('hidden'); copyBtn.classList.remove('inline-flex'); }
  if (copyCodeBtn) { copyCodeBtn.classList.add('hidden'); copyCodeBtn.classList.remove('inline-flex'); }
  if (leaveBtn) { leaveBtn.classList.add('hidden'); }
  renderPlayerCards();
}

export function startGameFromLandingPage() {
  if (networkState.isMultiplayer && !networkState.isHost) {
    alert('Only the Table Host can start the match. Waiting for host...');
    return;
  }

  // Ensure match has at least 2 players
  if (lobbyPlayerCount < 2) {
    addBotOrSlot();
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
    landingScreen.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    landingScreen.style.opacity = '0';
    landingScreen.style.transform = 'scale(0.94) translateY(-20px)';
    setTimeout(() => {
      landingScreen.classList.add('hidden');
      landingScreen.style.display = 'none';
    }, 400);
  }

  // Trigger camera fly-in swoop
  startIntroCameraFlyIn();

  // Initialize and start match with configured players & starting cash
  startNewMatch();
}
