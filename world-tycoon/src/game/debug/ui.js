/**
 * game/debug/ui.js
 * Debug Suite Floating UI panel, tab navigation, DOM injection, and window event listeners.
 */

import { BOARD_TILES, GROUP_META, CHANCE_WHEEL_PRIZES } from '../data.js';
import { gameState, debugState } from '../state.js';
import { fmtMoney } from '../utils.js';
import { calculateTileRent } from '../rules.js';
import { openBuyCityModal, startCityAuction, openTradeModal } from '../../ui/modals.js';
import { getDebugPanelHTML } from './debugPanelTemplate.js';
import {
  ensureGameStarted,
  debugRoll,
  debugTeleport,
  debugSetPropertyOwner,
  debugSetPropertyLevel,
  debugToggleFestivalBoost,
  debugGrantMonopoly,
  debugClearGroup,
  debugAdjustCash,
  debugSetCash,
  debugToggleIsland,
  debugForceTurn,
  debugAdvanceTurn,
  debugToggleFreezeAI,
  debugStepAI,
  debugTriggerChancePrize,
  debugAdjustFestivalPot,
  debugTriggerFestivalJackpot,
  debugTriggerVictory
} from './actions.js';

let activeTab = 'dice';
let panelVisible = false;

/* ─────────────────────────────────────────────────────────────────────────────
   A. INITIALIZATION & SHORTCUTS
───────────────────────────────────────────────────────────────────────────── */

export function printDebugHelp() {
  console.log(`
%c================ WORLD TYCOON DEBUG COMMANDS ================%c
  debug.roll(d1, d2, [playerIdx])      - Roll specific dice (e.g. debug.roll(6, 6))
  debug.teleport(tileId, [trigger])     - Teleport active player to tile 0..31
  debug.hop(tileId, [playerIdx])        - Hop step-by-step to tile
  debug.buy(tileId, [playerIdx], [lvl]) - Buy property & set building level (0..4)
  debug.level(tileId, level)            - Set city level (0=vacant, 1=1house, 2=2houses, 3=hotel, 4=landmark)
  debug.monopoly('brown', [pIdx], [lvl])- Grant full color group monopoly
  debug.cash(playerIdx, amount)         - Set exact cash (e.g. debug.cash(0, 5000000))
  debug.addCash(playerIdx, delta)       - Add/subtract cash (+500000, -200000)
  debug.jail([playerIdx])               - Put player in Island detention
  debug.freeJail([playerIdx])           - Release player from Island
  debug.forceTurn(playerIdx)            - Give active turn to player
  debug.nextTurn()                      - Skip to next turn
  debug.freezeAI(true|false)            - Pause AI autoplay to inspect state
  debug.stepAI()                        - Step AI turn once
  debug.chance([prizeIdx])              - Trigger chance card or open wheel
  debug.festivalWin([playerIdx])        - Win festival jackpot + boost city
  debug.victory([playerIdx])            - Trigger victory celebration
  debug.scenario('rent-squeeze')        - Load preset scenario ('rent-squeeze' | 'island-bail' | 'monopoly-ready' | 'world-tour' | 'festival-jackpot' | 'pass-start')
  debug.toggleUI()                      - Toggle floating debug panel UI
  debug.state()                         - Inspect raw reactive game state
%c=============================================================%c
`, 'color:#f59e0b; font-weight:bold;', '', 'color:#f59e0b; font-weight:bold;', '');
}

export function bindDebugKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignore keystrokes when typing inside text inputs/textareas
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (e.key === '`' || e.key === '~' || e.key === 'F2') {
      e.preventDefault();
      toggleDebugPanel();
    }
  });
}

export function toggleDebugPanel(forceOpen = null) {
  const panel = document.getElementById('debug-suite-panel');
  if (!panel) return;

  if (forceOpen !== null) {
    panelVisible = forceOpen;
  } else {
    panelVisible = !panelVisible;
  }

  if (panelVisible) {
    panel.classList.remove('hidden');
    panel.classList.add('flex');
    panel.style.removeProperty('display');
    panel.style.setProperty('display', 'flex', 'important');
    panel.style.setProperty('z-index', '1400', 'important');
    panel.style.setProperty('opacity', '1', 'important');
    panel.style.pointerEvents = 'auto';
    syncDebugUIState();
  } else {
    panel.classList.add('hidden');
    panel.classList.remove('flex');
    panel.style.setProperty('display', 'none', 'important');
  }
}

export function setForcedDiceInputs(d1, d2) {
  const sel1 = document.getElementById('debug-d1');
  const sel2 = document.getElementById('debug-d2');
  if (sel1) sel1.value = d1;
  if (sel2) sel2.value = d2;
}

/* ─────────────────────────────────────────────────────────────────────────────
   B. DOM UI INJECTION & SYNCING
───────────────────────────────────────────────────────────────────────────── */

export function injectDebugUI() {
  if (document.getElementById('debug-suite-panel')) return;

  // 1. Main Debug Suite Panel Drawer
  const panel = document.createElement('div');
  panel.id = 'debug-suite-panel';
  panel.className = 'fixed top-12 right-3 z-[1000] w-[440px] max-w-[96vw] max-h-[88vh] bg-slate-950/95 backdrop-blur-xl border-2 border-slate-700/80 rounded-3xl shadow-2xl text-slate-100 hidden flex-col overflow-hidden select-none font-sans text-xs';

  panel.innerHTML = getDebugPanelHTML();

  document.body.appendChild(panel);

  // Set default tab
  setDebugTab('dice');
}

/* ─────────────────────────────────────────────────────────────────────────────
   C. TAB SWITCHING & DROPDOWN POPULATION
───────────────────────────────────────────────────────────────────────────── */

export function setDebugTab(tabName) {
  activeTab = tabName;
  const tabs = ['dice', 'props', 'players', 'events', 'scenarios'];

  tabs.forEach(t => {
    const btn = document.getElementById(`debug-tab-btn-${t}`);
    const content = document.getElementById(`debug-tab-content-${t}`);
    if (t === tabName) {
      if (btn) {
        btn.className = 'flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 bg-indigo-600 text-white shadow font-bold';
      }
      if (content) content.classList.remove('hidden');
    } else {
      if (btn) {
        btn.className = 'flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 hover:text-white font-bold text-slate-400';
      }
      if (content) content.classList.add('hidden');
    }
  });

  syncDebugUIState();
}

export function populateDropdownOptions() {
  // 1. All 32 Tiles Dropdown
  const tileSelect = document.getElementById('debug-teleport-tile');
  if (tileSelect) {
    tileSelect.innerHTML = '';
    BOARD_TILES.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      const grp = t.group ? `[${t.group.toUpperCase()}] ` : '';
      const typ = t.type ? `(${t.type.toUpperCase()})` : '';
      opt.textContent = `[${t.id}] ${grp}${t.name} ${typ}`;
      tileSelect.appendChild(opt);
    });
  }

  // 2. Purchasable Properties (Cities & Resorts) Dropdown
  const propSelect = document.getElementById('debug-prop-select');
  if (propSelect) {
    propSelect.innerHTML = '';
    BOARD_TILES.filter(t => t.type === 'city' || t.type === 'resort').forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      const grp = t.group ? `[${t.group.toUpperCase()}] ` : '[RESORT] ';
      opt.textContent = `${grp}${t.name} (${fmtMoney(t.price)})`;
      propSelect.appendChild(opt);
    });
  }

  // 3. Color Groups Dropdown
  const groupSelect = document.getElementById('debug-monopoly-group');
  if (groupSelect) {
    groupSelect.innerHTML = '';
    Object.keys(GROUP_META).forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = `${GROUP_META[k].name} (${k.toUpperCase()})`;
      groupSelect.appendChild(opt);
    });
  }

  // 4. Chance Prizes Dropdown
  const chanceSelect = document.getElementById('debug-chance-prize-select');
  if (chanceSelect) {
    chanceSelect.innerHTML = '';
    CHANCE_WHEEL_PRIZES.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${p.label} - ${p.desc}`;
      chanceSelect.appendChild(opt);
    });
  }

  populatePlayerDropdowns();
}

export function populatePlayerDropdowns() {
  const pCount = (gameState.players && gameState.players.length > 0) ? gameState.players.length : 4;
  const dropdownIds = ['debug-teleport-player', 'debug-prop-owner-select', 'debug-monopoly-player', 'debug-player-select'];

  dropdownIds.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const curVal = sel.value;
    sel.innerHTML = '';

    if (id === 'debug-prop-owner-select') {
      const bankOpt = document.createElement('option');
      bankOpt.value = '-1';
      bankOpt.textContent = 'None / Bank';
      sel.appendChild(bankOpt);
    }

    for (let i = 0; i < pCount; i++) {
      const p = gameState.players[i] || { name: `Player ${i + 1}`, isAI: (i > 0) };
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `P${i}: ${p.name} ${p.isAI ? '(AI)' : '(YOU)'}`;
      sel.appendChild(opt);
    }

    if (curVal !== '' && curVal !== null) {
      sel.value = curVal;
    }
  });
}

export function syncDebugUIState() {
  populatePlayerDropdowns();

  // Header Subtitle
  const sub = document.getElementById('debug-header-subtitle');
  if (sub && gameState.players) {
    const currP = gameState.players[gameState.currentPlayerIdx] || { name: 'Player 0', isAI: false };
    const freezeTag = debugState.freezeAI ? '<span class="text-rose-400 font-black">AI FROZEN</span>' : 'AI Active';
    sub.innerHTML = `<span>Turn: <strong>P${gameState.currentPlayerIdx} (${currP.name})</strong></span> • <span>Phase: <strong>${gameState.phase}</strong></span> • <span>${freezeTag}</span>`;
  }

  // Quick freeze button label
  const freezeLabel = document.getElementById('quick-freeze-label');
  if (freezeLabel) {
    freezeLabel.textContent = debugState.freezeAI ? 'Resume AI' : 'Freeze AI';
  }
  const freezeChk = document.getElementById('debug-chk-freeze-ai');
  if (freezeChk) {
    freezeChk.checked = debugState.freezeAI;
  }
  const aiBadge = document.getElementById('debug-ai-badge');
  if (aiBadge) {
    if (debugState.freezeAI) aiBadge.classList.remove('hidden');
    else aiBadge.classList.add('hidden');
  }

  // Sync Selected Property Info
  syncSelectedPropertyInfo();

  // Sync Selected Player Info
  syncSelectedPlayerInfo();

  // Sync Festival Pot
  const potVal = document.getElementById('debug-festival-pot-val');
  if (potVal) {
    potVal.textContent = fmtMoney(gameState.festivalPot || 0);
  }
}

export function syncSelectedPropertyInfo() {
  const propSelect = document.getElementById('debug-prop-select');
  if (!propSelect) return;
  const tileId = parseInt(propSelect.value, 10);
  const tile = BOARD_TILES[tileId];
  if (!tile) return;
  const st = gameState.properties[tileId] || { owner: null, level: 0, festivalBoost: false };

  const ownerEl = document.getElementById('debug-prop-val-owner');
  const levelEl = document.getElementById('debug-prop-val-level');
  const rentEl = document.getElementById('debug-prop-val-rent');
  const statusEl = document.getElementById('debug-prop-val-status');

  if (ownerEl) {
    if (st.owner !== null && gameState.players[st.owner]) {
      ownerEl.textContent = `P${st.owner} (${gameState.players[st.owner].name})`;
      ownerEl.className = 'font-black text-amber-400';
    } else {
      ownerEl.textContent = 'Bank (Unowned)';
      ownerEl.className = 'font-black text-slate-400';
    }
  }

  const tierNames = ['Vacant (0)', '1 House (1)', '2 Houses (2)', 'Hotel (3)', 'Landmark (4)'];
  if (levelEl) levelEl.textContent = tierNames[st.level || 0];
  if (rentEl) rentEl.textContent = fmtMoney(calculateTileRent(tileId));

  if (statusEl) {
    statusEl.textContent = st.festivalBoost ? '2× BOOSTED' : 'Normal';
    statusEl.className = st.festivalBoost ? 'font-black text-amber-400' : 'font-black text-emerald-400';
  }
}

export function syncSelectedPlayerInfo() {
  const playerSelect = document.getElementById('debug-player-select');
  if (!playerSelect) return;
  const pIdx = parseInt(playerSelect.value, 10) || 0;
  const p = gameState.players[pIdx];
  if (!p) return;

  const cashEl = document.getElementById('debug-player-val-cash');
  const posEl = document.getElementById('debug-player-val-pos');
  const islandEl = document.getElementById('debug-player-val-island');
  const typeEl = document.getElementById('debug-player-val-type');

  if (cashEl) cashEl.textContent = fmtMoney(p.cash);
  if (posEl) posEl.textContent = `${p.position} (${BOARD_TILES[p.position]?.name || 'Tile'})`;
  if (islandEl) islandEl.textContent = p.inIsland ? `YES (${p.islandTurns}/3 turns)` : 'No';
  if (typeEl) typeEl.textContent = p.bankrupt ? 'BANKRUPT' : (p.isAI ? 'AI Player' : 'Human Player');
}

/* ─────────────────────────────────────────────────────────────────────────────
   D. WINDOW EVENT HANDLERS FOR HTML BUTTONS
───────────────────────────────────────────────────────────────────────────── */

window.setDebugTab = setDebugTab;
window.toggleDebugPanel = toggleDebugPanel;
window.syncDebugUIState = syncDebugUIState;
window.syncSelectedPropertyInfo = syncSelectedPropertyInfo;
window.syncSelectedPlayerInfo = syncSelectedPlayerInfo;

window.setForcedDice = function(d1, d2) {
  setForcedDiceInputs(d1, d2);
  debugRoll(d1, d2);
};

window.triggerDebugRollAction = function() {
  const d1 = parseInt(document.getElementById('debug-d1')?.value, 10) || 3;
  const d2 = parseInt(document.getElementById('debug-d2')?.value, 10) || 4;
  debugRoll(d1, d2);
};

window.triggerDebugTeleportAction = function(hopAnimate = false) {
  const pIdx = parseInt(document.getElementById('debug-teleport-player')?.value, 10) || 0;
  const tileId = parseInt(document.getElementById('debug-teleport-tile')?.value, 10) || 0;
  const evalLanding = document.getElementById('debug-teleport-eval')?.checked ?? true;
  debugTeleport(pIdx, tileId, evalLanding, hopAnimate);
};

window.triggerDebugSetOwner = function(chargePrice) {
  const tileId = parseInt(document.getElementById('debug-prop-select')?.value, 10);
  const pIdx = parseInt(document.getElementById('debug-prop-owner-select')?.value, 10);
  debugSetPropertyOwner(tileId, pIdx < 0 ? null : pIdx, chargePrice);
};

window.triggerDebugSetLevel = function(level) {
  const tileId = parseInt(document.getElementById('debug-prop-select')?.value, 10);
  debugSetPropertyLevel(tileId, level);
};

window.triggerDebugToggleBoost = function() {
  const tileId = parseInt(document.getElementById('debug-prop-select')?.value, 10);
  debugToggleFestivalBoost(tileId);
};

window.triggerDebugOpenBuyModal = function() {
  const tileId = parseInt(document.getElementById('debug-prop-select')?.value, 10);
  const tile = BOARD_TILES[tileId];
  if (tile) openBuyCityModal(tile, false);
};

window.triggerDebugGrantMonopoly = function(level = 0) {
  const group = document.getElementById('debug-monopoly-group')?.value || 'brown';
  const pIdx = parseInt(document.getElementById('debug-monopoly-player')?.value, 10) || 0;
  debugGrantMonopoly(group, pIdx, level);
};

window.triggerDebugClearGroup = function() {
  const group = document.getElementById('debug-monopoly-group')?.value || 'brown';
  debugClearGroup(group);
};

window.triggerDebugCashDelta = function(delta) {
  const pIdx = parseInt(document.getElementById('debug-player-select')?.value, 10) || 0;
  debugAdjustCash(pIdx, delta);
};

window.triggerDebugSetCustomCash = function() {
  const pIdx = parseInt(document.getElementById('debug-player-select')?.value, 10) || 0;
  const val = parseInt(document.getElementById('debug-custom-cash-input')?.value, 10);
  if (!isNaN(val)) debugSetCash(pIdx, val);
};

window.triggerDebugToggleIsland = function(force) {
  const pIdx = parseInt(document.getElementById('debug-player-select')?.value, 10) || 0;
  debugToggleIsland(pIdx, force);
};

window.triggerDebugForceTurn = function() {
  const pIdx = parseInt(document.getElementById('debug-player-select')?.value, 10) || 0;
  debugForceTurn(pIdx);
};

window.debugAdvanceTurn = debugAdvanceTurn;
window.debugToggleFreezeAI = debugToggleFreezeAI;
window.debugStepAI = debugStepAI;

window.triggerDebugApplyChancePrize = function() {
  const prizeIdx = parseInt(document.getElementById('debug-chance-prize-select')?.value, 10) || 0;
  debugTriggerChancePrize(prizeIdx);
};

window.triggerDebugAdjustPot = function(delta) {
  debugAdjustFestivalPot(delta);
};

window.triggerDebugTaxLanding = function() {
  debugTeleport(gameState.currentPlayerIdx, 29, true, false);
};

window.triggerDebugWorldTour = function() {
  debugTeleport(gameState.currentPlayerIdx, 24, true, false);
};

window.triggerDebugAuctionModal = function() {
  const tileId = parseInt(document.getElementById('debug-prop-select')?.value, 10) || 1;
  startCityAuction(tileId);
};
