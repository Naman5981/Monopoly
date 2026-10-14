/**
 * ui/setup.js
 * Interactive Players Add & Match Configuration Landing Page (First Page).
 */

import { matchSettings, setLobbyPlayerCount, lobbyPlayerCount } from '../game/state.js';
import { PLAYER_THEMES } from '../game/data.js';
import { playSFX } from '../game/audio.js';
import { fireConfettiBurst, applyLightingMode } from '../three/effects.js';
import { startIntroCameraFlyIn, getSceneLighting, initLobbyHeroStage, updateLobbyHeroAvatar } from '../three/scene.js';
import { startNewMatch } from '../game/engine.js';
import {
  networkState,
  hostRoom,
  joinRoom,
  leaveMultiplayerRoom,
  copyRoomInviteLink,
  copyRoomCodeOnly,
  broadcastStartOnlineMatch,
  registerNetworkCallbacks
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
  ['NOVA', 'CYBER', 'AURA', 'VALKYRIE', 'PHOENIX', 'NEO']
];

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
  setLobbyPlayerCount(n);
  renderPlayerCards();
  playSFX('hop');
}

export function addBotOrSlot() {
  if (lobbyPlayerCount < 4) {
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

export function removeBotOrSlot() {
  if (lobbyPlayerCount > 2) {
    setLobbyPlayerCount(lobbyPlayerCount - 1);
    renderPlayerCards();
    playSFX('hop');
  }
}

export function cycleAvatarPrev() {
  const p0 = matchSettings.customPlayers[0];
  if (!p0) return;
  p0.hatStyle = (p0.hatStyle + 3) % 4;
  p0.hatColor = ARCHETYPES[p0.hatStyle].hatColor;
  PLAYER_THEMES[0].hatColor = p0.hatColor;
  updateLobbyHeroAvatar(p0.hatStyle, p0.colorHex, p0.charColor);
  playSFX('hop');
}

export function cycleAvatarNext() {
  const p0 = matchSettings.customPlayers[0];
  if (!p0) return;
  p0.hatStyle = (p0.hatStyle + 1) % 4;
  p0.hatColor = ARCHETYPES[p0.hatStyle].hatColor;
  PLAYER_THEMES[0].hatColor = p0.hatColor;
  updateLobbyHeroAvatar(p0.hatStyle, p0.colorHex, p0.charColor);
  playSFX('hop');
}

export function setLocalPlayerColor(hex, charColor) {
  setPlayerColor(0, hex, charColor);
  const p0 = matchSettings.customPlayers[0];
  updateLobbyHeroAvatar(p0?.hatStyle || 0, hex, charColor);
  renderPlayerCards();
  renderMatchSettingButtons();
}

export function renderPlayerCards() {
  const container = document.getElementById('setup-players-roster');
  const countBadge = document.getElementById('table-player-count-badge');
  if (countBadge) countBadge.textContent = `${lobbyPlayerCount}/4`;

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

  // Update center hero archetype pill indicator
  const archEl = document.getElementById('setup-character-archetype-name');
  if (archEl && p0) {
    const arch = ARCHETYPES[p0.hatStyle || 0] || ARCHETYPES[0];
    archEl.innerHTML = `<span class="text-xl">${arch.icon}</span><span class="font-black text-sm tracking-wide text-slate-800">${arch.name.toUpperCase()}</span>`;
  }

  if (!container) return;
  container.innerHTML = '';

  // Render active player rows with spacious game-grade design
  for (let i = 0; i < lobbyPlayerCount; i++) {
    const cp = matchSettings.customPlayers[i];
    const isHuman = !cp.isAI;
    const initial = (cp.name || `P${i + 1}`)[0].toUpperCase();

    const row = document.createElement('div');
    row.className = 'bg-white/95 border-2 border-slate-200/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 transition hover:border-sky-300 shadow-xs';

    row.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <!-- Colored avatar initial circle -->
        <div class="w-11 h-11 rounded-full border-3 border-white shadow-md flex items-center justify-center font-black text-sm text-white flex-shrink-0" style="background:${cp.colorHex}">
          ${initial}
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            ${i === 0 ? '<span class="text-sm">👑</span>' : ''}
            <input type="text" value="${cp.name}" oninput="window.setPlayerSetupName(${i}, this.value)" class="bg-transparent font-black text-sm sm:text-base text-slate-800 uppercase focus:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-400 rounded-lg px-1.5 py-0.5 w-28 sm:w-36 truncate transition">
          </div>
          <div class="text-xs font-bold text-slate-400 pl-1 mt-0.5">
            ${i === 0 ? 'Table Host' : (isHuman ? 'Human Player' : 'AI Tycoon Bot')}
          </div>
        </div>
      </div>

      <!-- Quick role toggle -->
      <div class="flex items-center gap-1.5">
        <button onclick="window.togglePlayerRole(${i})" class="text-xs font-black px-3 py-1.5 rounded-xl border-2 transition cursor-pointer ${
          isHuman ? 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100 shadow-xs' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
        }" title="Toggle Human / Bot">
          <i class="${isHuman ? 'fa-solid fa-user' : 'fa-solid fa-robot'} mr-1 text-xs"></i>
          ${isHuman ? 'Player' : 'Bot'}
        </button>
      </div>
    `;

    container.appendChild(row);
  }

  // Render open slots (up to 4)
  for (let s = lobbyPlayerCount; s < 4; s++) {
    const slot = document.createElement('div');
    slot.className = 'game-slot-dashed p-3.5 flex items-center justify-between cursor-pointer transition hover:scale-[1.01]';
    slot.onclick = () => window.addBotOrSlot();
    slot.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-full border-2 border-dashed border-sky-300 flex items-center justify-center text-sky-400 text-sm">
          <i class="fa-solid fa-user-plus"></i>
        </div>
        <span class="font-extrabold text-sm text-sky-700">Open Player Slot</span>
      </div>
      <span class="text-xs font-black text-sky-500 uppercase tracking-wider bg-white/80 px-3 py-1 rounded-full shadow-xs border border-sky-200">+ Add</span>
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

export function stepMatchLength(delta) {
  const modes = ['day', 'sunset', 'night'];
  const curIdx = modes.indexOf(matchSettings.lightingTheme || 'day');
  const nextIdx = (curIdx + delta + modes.length) % modes.length;
  setAtmosphereMode(modes[nextIdx]);
}

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

  // Decision time text
  const timerTextEl = document.getElementById('setup-decision-time-text');
  if (timerTextEl) {
    timerTextEl.textContent = `${matchSettings.turnDuration || 20} s`;
  }

  // Match length / atmosphere text
  const atmoTextEl = document.getElementById('setup-match-length-text');
  if (atmoTextEl) {
    const theme = matchSettings.lightingTheme || 'day';
    atmoTextEl.textContent = theme === 'night' ? 'Night' : (theme === 'sunset' ? 'Sunset' : 'Morning');
  }

  // Color Swatches
  const colorContainer = document.getElementById('setup-color-swatches');
  if (colorContainer) {
    const p0Hex = matchSettings.customPlayers[0]?.colorHex || '#3b82f6';
    colorContainer.innerHTML = CANDY_PALETTE.map(c => `
      <button onclick="window.setLocalPlayerColor('${c.hex}', ${c.charColor})" class="w-8 h-8 rounded-full border-2 transition transform hover:scale-115 cursor-pointer flex items-center justify-center ${
        p0Hex === c.hex ? 'border-slate-900 ring-3 ring-sky-400 scale-110 shadow-md' : 'border-white shadow-xs'
      }" style="background:${c.hex}" title="${c.name}">
        ${p0Hex === c.hex ? '<i class="fa-solid fa-check text-white text-xs"></i>' : ''}
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

  // If in P2P multiplayer as host, broadcast match start to all connected clients!
  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastStartOnlineMatch();
  }

  const landingScreen = document.getElementById('landing-setup-screen');

  // Play celebratory sound & burst confetti
  playSFX('win');
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
