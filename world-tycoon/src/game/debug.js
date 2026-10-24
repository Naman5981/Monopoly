/**
 * game/debug.js
 * Developer & QA Testing Suite Facade for World Tycoon: Global Edition.
 * Deconstructed into modular sub-modules:
 * - game/debug/actions.js: Core debug operations (dice, cash, ownership, teleportation, turns)
 * - game/debug/scenarios.js: 1-click test scenarios for QA validation
 * - game/debug/ui.js: Floating DevTools UI panel, tabs, shortcuts, and DOM binding
 */

import { gameState, debugState, matchSettings } from './state.js';
import { BUILD_CONFIG } from './buildConfig.js';
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
} from './debug/actions.js';

import { debugRunScenario } from './debug/scenarios.js';

import {
  injectDebugUI,
  bindDebugKeyboardShortcuts,
  populateDropdownOptions,
  syncDebugUIState,
  toggleDebugPanel,
  setDebugTab,
  printDebugHelp,
  setForcedDiceInputs
} from './debug/ui.js';

// Re-export all sub-module functions for backward compatibility
export * from './debug/actions.js';
export * from './debug/scenarios.js';
export * from './debug/ui.js';

/**
 * Initialize Developer & QA Testing Suite
 */
export function initDebugSuite() {
  const isDebugAllowed = BUILD_CONFIG?.DEBUG_ENABLED !== false &&
    (typeof __DEBUG_ALLOWED__ === 'undefined' || __DEBUG_ALLOWED__ !== false);

  if (!isDebugAllowed) {
    // Production / CI Release Build: completely disable debug suite
    window.toggleDebugPanel = () => {};
    if (window.debug) delete window.debug;
    if (window.WorldTycoonDebug) delete window.WorldTycoonDebug;

    // Remove any debug trigger buttons from DOM
    if (typeof document !== 'undefined') {
      try {
        document.querySelectorAll('[data-debug-ui], [data-debug-btn], button[onclick*="toggleDebugPanel"]').forEach(el => el.remove());
        const debugModal = document.getElementById('debug-modal');
        if (debugModal) debugModal.remove();
      } catch (err) {
        // Silently handle in non-DOM test environments
      }
    }
    return;
  }

  injectDebugUI();
  bindDebugKeyboardShortcuts();
  populateDropdownOptions();
  syncDebugUIState();

  // Expose handy console API
  window.debug = {
    help: printDebugHelp,
    roll: (d1, d2, pIdx = null) => debugRoll(d1, d2, pIdx),
    teleport: (tileId, triggerLanding = true, pIdx = null) => debugTeleport(pIdx ?? gameState.currentPlayerIdx, tileId, triggerLanding),
    hop: (tileId, pIdx = null) => debugTeleport(pIdx ?? gameState.currentPlayerIdx, tileId, true, true),
    buy: (tileId, pIdx = null, level = 0, charge = false) => {
      debugSetPropertyOwner(tileId, pIdx ?? gameState.currentPlayerIdx, charge);
      if (level > 0) debugSetPropertyLevel(tileId, level);
    },
    level: (tileId, level) => debugSetPropertyLevel(tileId, level),
    monopoly: (groupKey, pIdx = null, level = 0) => debugGrantMonopoly(groupKey, pIdx ?? gameState.currentPlayerIdx, level),
    cash: (pIdx, amt) => debugSetCash(pIdx, amt),
    addCash: (pIdx, delta) => debugAdjustCash(pIdx, delta),
    jail: (pIdx = null) => debugToggleIsland(pIdx ?? gameState.currentPlayerIdx, true),
    freeJail: (pIdx = null) => debugToggleIsland(pIdx ?? gameState.currentPlayerIdx, false),
    forceTurn: (pIdx) => debugForceTurn(pIdx),
    nextTurn: () => debugAdvanceTurn(),
    freezeAI: (val) => debugToggleFreezeAI(val),
    stepAI: () => debugStepAI(),
    chance: (prizeIdx = null, pIdx = null) => debugTriggerChancePrize(prizeIdx, pIdx ?? gameState.currentPlayerIdx),
    festivalWin: (pIdx = null) => debugTriggerFestivalJackpot(pIdx ?? gameState.currentPlayerIdx),
    victory: (pIdx = null) => debugTriggerVictory(pIdx ?? gameState.currentPlayerIdx),
    leaderboard: () => window.toggleLeaderboardModal?.(),
    scenario: (key) => debugRunScenario(key),
    toggleUI: () => toggleDebugPanel(),
    state: () => ({ gameState, debugState, matchSettings })
  };

  window.WorldTycoonDebug = window.debug;
  window.toggleDebugPanel = toggleDebugPanel;

  console.log(
    '%c🛠️ WORLD TYCOON DEBUG SUITE READY!%c Press %c` (backtick)%c or %cF2%c or click %c[DEBUG]%c, or type %cdebug.help()%c in console.',
    'background:#f59e0b; color:#0f172a; font-weight:bold; padding:4px 8px; border-radius:4px;',
    'color:#94a3b8;',
    'background:#1e293b; color:#38bdf8; font-weight:bold; padding:2px 4px; border-radius:3px;',
    'color:#94a3b8;',
    'background:#1e293b; color:#38bdf8; font-weight:bold; padding:2px 4px; border-radius:3px;',
    'color:#94a3b8;',
    'background:#f59e0b; color:#0f172a; font-weight:bold; padding:2px 4px; border-radius:3px;',
    'color:#94a3b8;',
    'background:#1e293b; color:#4ade80; font-weight:bold; padding:2px 4px; border-radius:3px;',
    'color:#94a3b8;'
  );
}
