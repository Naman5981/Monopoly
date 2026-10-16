/**
 * ui/modals/common.js
 * Shared modal lifecycle utilities, engine callback registry, and tier badge helpers.
 */

import { gameState } from '../../game/state.js';

export const engineCallbacks = {};

/**
 * Registers callbacks provided by the game engine.
 * @param {Object} cbs
 */
export function registerEngineCallbacks(cbs) {
  Object.assign(engineCallbacks, cbs);
}

/**
 * Checks if the lobby/setup screen is currently visible.
 * @returns {boolean}
 */
export function isLobbyScreenActive() {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return true;
  const landingScreen = document.getElementById('landing-setup-screen');
  return !!(landingScreen && !landingScreen.classList.contains('hidden') && landingScreen.style.display !== 'none');
}

/**
 * Generates the HTML badge representing a building upgrade level.
 * @param {number} level - 0 (Base), 1-3 (Houses/Estates), 4 (Skyscraper)
 * @returns {string}
 */
export function getTierBadgeHTML(level) {
  if (level === 0) {
    return `<div class="tier-level-badge tier-house"><svg class="ui-icon w-3 h-3 text-emerald-700 mr-1" aria-hidden="true"><use href="#icon-pin"></use></svg><span class="text-[11px] font-black text-emerald-800">Base</span></div>`;
  }
  if (level === 4) {
    return `<div class="tier-level-badge tier-skyscraper-badge"><svg class="ui-icon w-3 h-3 text-amber-700 mr-1" aria-hidden="true"><use href="#icon-city"></use></svg><span class="text-[10px] font-black text-amber-900 tracking-tight">MAX</span></div>`;
  }
  return `<div class="tier-level-badge tier-house"><svg class="ui-icon w-3 h-3 text-emerald-700 mr-1" aria-hidden="true"><use href="#icon-building"></use></svg><span class="text-[11px] font-black text-emerald-800">${level}</span></div>`;
}

/**
 * Closes and hides all in-game modals.
 */
export function closeAllGameModals() {
  const modalIds = [
    'modal-victory',
    'modal-buy-city',
    'modal-upgrade-city',
    'modal-auction',
    'modal-chance-wheel',
    'modal-tile-inspector',
    'modal-portfolio',
    'modal-trade',
    'modal-incoming-trade',
    'modal-rules',
    'modal-disconnect-notice',
    'modal-setup',
    'modal-monopoly-celebration',
    'modal-confirm-exit-lobby',
    'modal-leaderboard'
  ];
  modalIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });
}
