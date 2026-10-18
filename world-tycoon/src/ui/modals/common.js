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
 * Closes and hides all in-game modals and overlays defensively.
 * Cancels active anime.js tweens to prevent stuck backdrop-filter blurs.
 */
export function closeAllGameModals() {
  const modalIds = [
    'modal-victory',
    'modal-monopoly-celebration',
    'modal-buy-city',
    'modal-buyout-city',
    'modal-sell-cities',
    'modal-upgrade-city',
    'modal-auction',
    'modal-chance-wheel',
    'modal-chance-result',
    'modal-tile-inspector',
    'modal-portfolio',
    'modal-trade',
    'modal-incoming-trade',
    'modal-rules',
    'modal-setup',
    'modal-resume-match',
    'modal-disconnect-notice',
    'modal-confirm-exit-lobby',
    'modal-leaderboard',
    'modal-wardrobe',
    'screen-dice-overlay',
    'landing-setup-screen'
  ];

  modalIds.forEach(id => {
    // For landing-setup-screen, only forcefully dismiss if match is running
    if (id === 'landing-setup-screen') {
      const landing = document.getElementById(id);
      if (landing && gameState.gameStarted && gameState.phase !== 'SETUP') {
        if (typeof anime !== 'undefined') anime.remove(landing);
        landing.classList.add('hidden');
        landing.classList.remove('flex');
        landing.style.setProperty('display', 'none', 'important');
        landing.style.removeProperty('opacity');
        landing.style.removeProperty('pointer-events');
      }
      return;
    }

    const el = document.getElementById(id);
    if (el) {
      if (typeof anime !== 'undefined') {
        anime.remove(el);
      }
      if (el._autoCloseTimer) {
        clearTimeout(el._autoCloseTimer);
        el._autoCloseTimer = null;
      }

      // Reset nested card elements so they don't remain scale(0) or opacity(0)
      const cards = el.querySelectorAll('.game-modal-shell, .modal-card, [id$="-card"], #victory-card, #modal-monopoly-card, #wardrobe-panel-card');
      cards.forEach(card => {
        if (typeof anime !== 'undefined') anime.remove(card);
        card.style.removeProperty('transform');
        card.style.removeProperty('opacity');
        card.classList.remove('monopoly-card-leaving', 'monopoly-card-entering');
      });

      el.classList.add('hidden');
      el.classList.remove('flex', 'wardrobe-panel-visible');
      if (id === 'modal-wardrobe') el.classList.add('wardrobe-panel-hidden');
      el.style.setProperty('display', 'none', 'important');
      el.style.removeProperty('opacity');
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('z-index');
    }
  });

  const victoryCard = document.getElementById('victory-card');
  if (victoryCard) {
    if (typeof anime !== 'undefined') anime.remove(victoryCard);
    victoryCard.style.removeProperty('opacity');
    victoryCard.style.removeProperty('pointer-events');
    victoryCard.style.removeProperty('transform');
  }
}

