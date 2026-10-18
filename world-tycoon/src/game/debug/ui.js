/**
 * game/debug/ui.js
 * Debug Suite Floating UI panel, tab navigation, DOM injection, and window event listeners.
 */

import { BOARD_TILES, GROUP_META, CHANCE_WHEEL_PRIZES } from '../data.js';
import { gameState, debugState, matchSettings } from '../state.js';
import { fmtMoney } from '../utils.js';
import { calculateTileRent } from '../rules.js';
import { openBuyCityModal, startCityAuction, openTradeModal } from '../../ui/modals.js';
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
import { debugRunScenario } from './scenarios.js';

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
    syncDebugUIState();
  } else {
    panel.classList.add('hidden');
    panel.classList.remove('flex');
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
  panel.className = 'fixed top-12 right-3 z-50 w-[440px] max-w-[96vw] max-h-[88vh] bg-slate-950/95 backdrop-blur-xl border-2 border-slate-700/80 rounded-3xl shadow-2xl text-slate-100 hidden flex-col overflow-hidden select-none font-sans text-xs';

  panel.innerHTML = `
    <!-- HEADER -->
    <div class="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
          <i class="fa-solid fa-wrench"></i>
        </div>
        <div>
          <h2 class="font-black text-sm tracking-wide text-white flex items-center gap-1.5">
            DEBUG SUITE <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">DEV</span>
          </h2>
          <div id="debug-header-subtitle" class="text-[11px] text-slate-400 flex items-center gap-2">
            <span>Turn: P0 (YOU)</span> • <span>Phase: ROLL</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button onclick="window.debug.freezeAI()" id="btn-quick-freeze-ai" class="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] border border-slate-700 flex items-center gap-1" title="Toggle AI Autoplay Pause">
          <i class="fa-solid fa-pause"></i> <span id="quick-freeze-label">Freeze AI</span>
        </button>
        <button onclick="window.toggleDebugPanel(false)" class="w-7 h-7 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>
    </div>

    <!-- TAB NAVIGATION BAR -->
    <div class="flex border-b border-slate-800 bg-slate-900/60 p-1 gap-1 flex-shrink-0 text-slate-400 font-bold">
      <button onclick="window.setDebugTab('dice')" id="debug-tab-btn-dice" class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 bg-indigo-600 text-white shadow">
        <i class="fa-solid fa-dice"></i> <span>Dice</span>
      </button>
      <button onclick="window.setDebugTab('props')" id="debug-tab-btn-props" class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 hover:text-white">
        <i class="fa-solid fa-city"></i> <span>Cities</span>
      </button>
      <button onclick="window.setDebugTab('players')" id="debug-tab-btn-players" class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 hover:text-white">
        <i class="fa-solid fa-users"></i> <span>Players</span>
      </button>
      <button onclick="window.setDebugTab('events')" id="debug-tab-btn-events" class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 hover:text-white">
        <i class="fa-solid fa-wand-magic-sparkles"></i> <span>Events</span>
      </button>
      <button onclick="window.setDebugTab('scenarios')" id="debug-tab-btn-scenarios" class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 hover:text-white">
        <i class="fa-solid fa-bolt"></i> <span>Presets</span>
      </button>
    </div>

    <!-- TAB CONTENTS CONTAINER -->
    <div class="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-slate-200">

      <!-- 1. TAB: DICE & MOVEMENT -->
      <div id="debug-tab-content-dice" class="space-y-3">
        <!-- Force Dice Roll -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-dice-d6"></i> Force Exact Dice Roll
            </span>
            <span class="text-[10px] text-slate-400">Applies to Active Player</span>
          </div>

          <div class="flex items-center gap-2">
            <div class="flex-1">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Die 1 (1..6)</label>
              <select id="debug-d1" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-black text-sm">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3" selected>3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
              </select>
            </div>
            <div class="text-slate-500 font-black text-lg pt-4">+</div>
            <div class="flex-1">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Die 2 (1..6)</label>
              <select id="debug-d2" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-black text-sm">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4" selected>4</option>
                <option value="5">5</option>
                <option value="6">6</option>
              </select>
            </div>
            <div class="pt-4 flex-1">
              <button onclick="window.triggerDebugRollAction()" class="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-dice"></i> ROLL
              </button>
            </div>
          </div>

          <!-- Quick Presets -->
          <div class="space-y-1 pt-1">
            <span class="text-[10px] font-bold text-slate-400">Quick Doubles:</span>
            <div class="grid grid-cols-6 gap-1">
              <button onclick="window.setForcedDice(1, 1)" class="py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 font-bold text-[11px] border border-slate-700">1+1</button>
              <button onclick="window.setForcedDice(2, 2)" class="py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 font-bold text-[11px] border border-slate-700">2+2</button>
              <button onclick="window.setForcedDice(3, 3)" class="py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 font-bold text-[11px] border border-slate-700">3+3</button>
              <button onclick="window.setForcedDice(4, 4)" class="py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 font-bold text-[11px] border border-slate-700">4+4</button>
              <button onclick="window.setForcedDice(5, 5)" class="py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 font-bold text-[11px] border border-slate-700">5+5</button>
              <button onclick="window.setForcedDice(6, 6)" class="py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 font-bold text-[11px] border border-slate-700">6+6</button>
            </div>
          </div>
        </div>

        <!-- Teleport / Position Jump -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <span class="font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-location-crosshairs"></i> Teleport to Board Tile
          </span>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Target Player</label>
              <select id="debug-teleport-player" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold"></select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Destination Tile</label>
              <select id="debug-teleport-tile" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-bold"></select>
            </div>
          </div>

          <div class="flex items-center gap-4 text-slate-300 font-medium">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" id="debug-teleport-eval" checked class="rounded text-indigo-600 focus:ring-0">
              <span class="text-[11px]">Trigger Landing Rules (Rent, Buy, Event, Tax, Jail)</span>
            </label>
          </div>

          <div class="flex gap-2 pt-1">
            <button onclick="window.triggerDebugTeleportAction(false)" class="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs shadow transition active:scale-95 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-bolt"></i> Instant Teleport
            </button>
            <button onclick="window.triggerDebugTeleportAction(true)" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs border border-slate-700 transition active:scale-95 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-person-walking"></i> Step Hop
            </button>
          </div>
        </div>
      </div>

      <!-- 2. TAB: CITIES & MONOPOLIES -->
      <div id="debug-tab-content-props" class="space-y-3 hidden">
        <!-- Property Inspector & Editor -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-city"></i> City / Resort Inspector
            </span>
            <select id="debug-prop-select" onchange="window.syncSelectedPropertyInfo()" class="bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-white font-bold text-xs"></select>
          </div>

          <!-- Live Card State Pill -->
          <div id="debug-prop-info-badge" class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] grid grid-cols-2 gap-2 text-slate-300">
            <div>Owner: <span id="debug-prop-val-owner" class="font-black text-white">None</span></div>
            <div>Level: <span id="debug-prop-val-level" class="font-black text-white">Vacant (0)</span></div>
            <div>Current Rent: <span id="debug-prop-val-rent" class="font-black text-emerald-400">$0</span></div>
            <div>Status: <span id="debug-prop-val-status" class="font-black text-white">Normal</span></div>
          </div>

          <!-- Assign Ownership -->
          <div class="space-y-1">
            <label class="block text-[10px] font-bold text-slate-400">Assign Ownership</label>
            <div class="flex gap-2">
              <select id="debug-prop-owner-select" class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold"></select>
              <button onclick="window.triggerDebugSetOwner(false)" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black">
                Assign Free
              </button>
              <button onclick="window.triggerDebugSetOwner(true)" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700" title="Deduct price from player cash">
                Pay Price
              </button>
            </div>
          </div>

          <!-- Set Building Tier -->
          <div class="space-y-1">
            <label class="block text-[10px] font-bold text-slate-400">Set Building Tier (3D Model & Textures)</label>
            <div class="grid grid-cols-5 gap-1 text-[11px]">
              <button onclick="window.triggerDebugSetLevel(0)" class="py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white font-bold border border-slate-700">L0 (Empty)</button>
              <button onclick="window.triggerDebugSetLevel(1)" class="py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white font-bold border border-slate-700">L1 (House)</button>
              <button onclick="window.triggerDebugSetLevel(2)" class="py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white font-bold border border-slate-700">L2 (2 Houses)</button>
              <button onclick="window.triggerDebugSetLevel(3)" class="py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white font-bold border border-slate-700">L3 (Hotel)</button>
              <button onclick="window.triggerDebugSetLevel(4)" class="py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white font-bold border border-slate-700">L4 (Landmark)</button>
            </div>
          </div>

          <!-- Property Action Toggles -->
          <div class="grid grid-cols-2 gap-1.5 pt-1">
            <button onclick="window.triggerDebugToggleBoost()" class="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1">
              <i class="fa-solid fa-sparkles text-amber-400"></i> 2× Boost
            </button>
            <button onclick="window.triggerDebugOpenBuyModal()" class="py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-1">
              <i class="fa-solid fa-cart-shopping"></i> Buy Modal
            </button>
          </div>
        </div>

        <!-- Color Group Monopoly Generator -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span class="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-crown"></i> Complete Color Group Monopoly
          </span>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Color Group</label>
              <select id="debug-monopoly-group" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-bold"></select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Grant To</label>
              <select id="debug-monopoly-player" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-bold"></select>
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <button onclick="window.triggerDebugGrantMonopoly(0)" class="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center justify-center gap-1">
              <i class="fa-solid fa-crown"></i> Grant Monopoly
            </button>
            <button onclick="window.triggerDebugGrantMonopoly(3)" class="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow flex items-center justify-center gap-1">
              <i class="fa-solid fa-hotel"></i> With Hotels (L3)
            </button>
            <button onclick="window.triggerDebugClearGroup()" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/80 text-rose-300 font-bold border border-slate-700" title="Reset group to Bank">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 3. TAB: PLAYERS & TURNS -->
      <div id="debug-tab-content-players" class="space-y-3 hidden">
        <!-- Player Selector & Economy Card -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-user"></i> Select Player
            </span>
            <select id="debug-player-select" onchange="window.syncSelectedPlayerInfo()" class="bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-white font-bold text-xs"></select>
          </div>

          <div id="debug-player-info-card" class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] grid grid-cols-2 gap-2 text-slate-300">
            <div>Cash: <span id="debug-player-val-cash" class="font-black text-emerald-400">$0</span></div>
            <div>Tile: <span id="debug-player-val-pos" class="font-black text-white">0 (START)</span></div>
            <div>Island: <span id="debug-player-val-island" class="font-black text-white">No</span></div>
            <div>Type: <span id="debug-player-val-type" class="font-black text-white">Human</span></div>
          </div>

          <!-- Cash Buttons -->
          <div class="space-y-1">
            <label class="block text-[10px] font-bold text-slate-400">Cash Adjustments</label>
            <div class="grid grid-cols-5 gap-1 text-[11px]">
              <button onclick="window.triggerDebugCashDelta(100000)" class="py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-800 text-emerald-300 font-bold border border-emerald-800">+100K</button>
              <button onclick="window.triggerDebugCashDelta(500000)" class="py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-800 text-emerald-300 font-bold border border-emerald-800">+500K</button>
              <button onclick="window.triggerDebugCashDelta(2000000)" class="py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-800 text-emerald-300 font-bold border border-emerald-800">+2.0M</button>
              <button onclick="window.triggerDebugCashDelta(-100000)" class="py-1.5 rounded-lg bg-rose-950 hover:bg-rose-800 text-rose-300 font-bold border border-rose-800">-100K</button>
              <button onclick="window.triggerDebugCashDelta(-500000)" class="py-1.5 rounded-lg bg-rose-950 hover:bg-rose-800 text-rose-300 font-bold border border-rose-800">-500K</button>
            </div>
            <div class="flex gap-2 pt-1">
              <input type="number" id="debug-custom-cash-input" placeholder="Custom amount (e.g. 50000)" class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-white text-xs">
              <button onclick="window.triggerDebugSetCustomCash()" class="px-3 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold">
                Set Exact
              </button>
            </div>
          </div>

          <!-- Status & Detention Controls -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button onclick="window.triggerDebugToggleIsland(true)" class="py-2 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-300 font-bold border border-amber-800 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-umbrella-beach"></i> Send to Island
            </button>
            <button onclick="window.triggerDebugToggleIsland(false)" class="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-lock-open"></i> Release Island
            </button>
          </div>
        </div>

        <!-- Turn Management & AI Controls -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <span class="font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-forward"></i> Turn & AI Control
          </span>

          <div class="grid grid-cols-2 gap-2">
            <button onclick="window.triggerDebugForceTurn()" class="py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-user-check"></i> Give Active Turn
            </button>
            <button onclick="window.debugAdvanceTurn()" class="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-forward-step"></i> Next Turn
            </button>
          </div>

          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span class="font-bold text-white block">Freeze AI Autoplay</span>
              <span class="text-[10px] text-slate-400">Prevents AI turns from rushing while debugging</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="debug-chk-freeze-ai" onchange="window.debugToggleFreezeAI(this.checked)" class="sr-only peer">
              <div class="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-[transform,border-color] after:duration-150 peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <button onclick="window.debugStepAI()" class="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-play text-amber-400"></i> Step Single AI Action
          </button>
        </div>
      </div>

      <!-- 4. TAB: EVENTS & MODALS -->
      <div id="debug-tab-content-events" class="space-y-3 hidden">
        <!-- Chance Wheel & Prizes -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span class="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-dharmachakra"></i> Chance Wheel Events
          </span>
          <label class="block text-[10px] font-bold text-slate-400">Specific Prize Outcome</label>
          <select id="debug-chance-prize-select" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-bold"></select>
          <div class="flex gap-2 pt-1">
            <button onclick="window.triggerDebugApplyChancePrize()" class="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-bolt"></i> Apply Prize Now
            </button>
            <button onclick="window.debug.chance()" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-arrows-spin"></i> Open Wheel Modal
            </button>
          </div>
        </div>

        <!-- Festival & Tax Controls -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span class="font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-landmark"></i> Festival Pot & Tax
          </span>
          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
            <span>Current Festival Pot:</span>
            <span id="debug-festival-pot-val" class="font-black text-emerald-400 text-sm">$0</span>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <button onclick="window.triggerDebugAdjustPot(250000)" class="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700">+250K Pot</button>
            <button onclick="window.triggerDebugAdjustPot(1000000)" class="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700">+1.0M Pot</button>
            <button onclick="window.triggerDebugAdjustPot(-99999999)" class="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold border border-slate-700">Reset Pot</button>
          </div>
          <div class="flex gap-2 pt-1">
            <button onclick="window.debug.festivalWin()" class="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-gift"></i> Claim Jackpot Win
            </button>
            <button onclick="window.triggerDebugTaxLanding()" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-receipt"></i> Pay Luxury Tax
            </button>
          </div>
        </div>

        <!-- Interactive Game Modals Direct Triggers -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span class="font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-window-restore"></i> Direct Modal Triggers
          </span>
          <div class="grid grid-cols-2 gap-2">
            <button onclick="window.triggerDebugWorldTour()" class="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-plane-departure text-sky-400"></i> World Tour Flight
            </button>
            <button onclick="window.openTradeModal()" class="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-handshake text-emerald-400"></i> Trade Modal
            </button>
            <button onclick="window.triggerDebugAuctionModal()" class="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-gavel text-amber-400"></i> City Auction
            </button>
            <button onclick="window.debug.victory()" class="py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs shadow flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-trophy"></i> Victory Screen
            </button>
            <button onclick="window.toggleLeaderboardModal()" class="py-2 col-span-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold border border-slate-700 flex items-center justify-center gap-1.5 shadow-xs">
              <i class="fa-solid fa-ranking-star text-amber-400"></i> Open Tycoon Leaderboard (Live Net Worth)
            </button>
          </div>
        </div>
      </div>

      <!-- 5. TAB: QUICK PRESET SCENARIOS -->
      <div id="debug-tab-content-scenarios" class="space-y-2.5 hidden">
        <div class="text-[11px] text-slate-400">
          One-click test environments to reproduce complex Monopoly rules and edge cases instantly:
        </div>

        <!-- Preset 1 -->
        <button onclick="window.debug.scenario('rent-squeeze')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-rose-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-skull"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">Rent Squeeze & Insolvency</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Player 0 has $60K cash and lands on Tokyo (Level 4 Landmark, $1.9M rent owned by Player 1). Tests auto-liquidation & bankruptcy.</div>
          </div>
        </button>

        <!-- Preset 2 -->
        <button onclick="window.debug.scenario('island-bail')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-amber-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-umbrella-beach"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">Island Detention & Bail</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Places player on Island with $300K. Tests bail button ($150K), rolling doubles to escape, and 3-turn max detention.</div>
          </div>
        </button>

        <!-- Preset 3 -->
        <button onclick="window.debug.scenario('monopoly-ready')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-indigo-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-crown"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">1 Roll to Full Monopoly</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Player 0 owns Cairo and sits on Tile 2. Roll 1 to land on Mumbai and complete Brown Monopoly, triggering celebration.</div>
          </div>
        </button>

        <!-- Preset 4 -->
        <button onclick="window.debug.scenario('world-tour')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-sky-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-plane"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">World Tour Flight Mode</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Places player on World Tour (Tile 24) and enables board destination selection flight mode.</div>
          </div>
        </button>

        <!-- Preset 5 -->
        <button onclick="window.debug.scenario('festival-jackpot')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-emerald-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-coins"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">Festival Pot Winner</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Loads $2.5M in Festival Pot and lands on Festival (Tile 16) to claim jackpot and double a city's rent.</div>
          </div>
        </button>

        <!-- Preset 6 -->
        <button onclick="window.debug.scenario('pass-start')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-purple-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-flag-checkered"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">Pass START Salary Collection</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Places player on Monaco and rolls 5 to pass START (collecting $300K salary) before landing.</div>
          </div>
        </button>

        <!-- Preset 7: Triple Monopoly Win -->
        <button onclick="window.debug.scenario('triple-monopoly-win')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-amber-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-crown"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">🏆 Victory: Triple Monopoly (3 Sets)</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Grants Player 0 three complete color sets (Brown, Light Blue, Pink) to trigger instant Triple Monopoly Victory!</div>
          </div>
        </button>

        <!-- Preset 8: Line Monopoly Win -->
        <button onclick="window.debug.scenario('line-monopoly-win')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-sky-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-globe"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">🌐 Victory: Line Monopoly (Entire Side)</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Assigns all cities along an entire edge of the board (Side 2) to Player 0 to trigger Line Monopoly Victory!</div>
          </div>
        </button>

        <!-- Preset 9: Richest Tycoon Time Cap Win -->
        <button onclick="window.debug.scenario('time-cap-win')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-emerald-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-clock"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">⏱️ Victory: Time Limit / Highest Net Worth</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Tests match duration timeout where the wealthiest tycoon by Net Worth is crowned champion!</div>
          </div>
        </button>
      </div>

    </div>

    <!-- FOOTER STATUS BAR -->
    <div class="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 flex-shrink-0">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Debug Engine Active</span>
      </div>
      <div>
        Press <span class="text-amber-400 font-bold font-mono">&#96;</span> or <span class="text-amber-400 font-bold font-mono">F2</span> to toggle
      </div>
    </div>
  `;

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
