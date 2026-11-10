/**
 * ui/modals/common.js
 * Shared modal lifecycle utilities, engine callback registry, and tier badge helpers.
 */

import { gameState } from '../../game/state.js';
import { clearCityPreview } from '../../three/stages/cityPreview.js';

export const engineCallbacks = {};

let activeFocusTrap = null;
let backdropMouseDownTarget = null;

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('mousedown', (e) => {
    backdropMouseDownTarget = e.target;
  }, true);
  window.addEventListener('touchstart', (e) => {
    backdropMouseDownTarget = e.target;
  }, { capture: true, passive: true });
}

/**
 * Traps Tab keyboard focus within the active modal for WCAG accessibility.
 * @param {HTMLElement} modalEl
 */
export function trapFocus(modalEl) {
  if (!modalEl) return;
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  const prevActive = document.activeElement;

  const focusableSelectors = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      const focusables = Array.from(modalEl.querySelectorAll(focusableSelectors)).filter(el => el.offsetParent !== null);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  modalEl.addEventListener('keydown', handleKeyDown);

  const isCloseButton = (btn) => {
    if (!btn) return true;
    const title = (typeof btn.getAttribute === 'function' ? btn.getAttribute('title') : '') || '';
    const aria = (typeof btn.getAttribute === 'function' ? btn.getAttribute('aria-label') : '') || '';
    const onclick = (typeof btn.getAttribute === 'function' ? btn.getAttribute('onclick') : '') || '';
    const isHeaderX = Boolean(typeof btn.closest === 'function' && btn.closest('.game-modal-header') && typeof btn.querySelector === 'function' && btn.querySelector('.fa-xmark'));
    return isHeaderX || title.toLowerCase().includes('close') || aria.toLowerCase().includes('close') || onclick.toLowerCase().includes('close');
  };

  const actionableElements = Array.from(modalEl.querySelectorAll(focusableSelectors)).filter(el => el.offsetParent !== null && !isCloseButton(el));
  const primaryAction = modalEl.querySelector('.game-btn-green, .game-btn-blue, button[autofocus]') || actionableElements[0];
  if (primaryAction && typeof primaryAction.focus === 'function' && !isCloseButton(primaryAction)) {
    setTimeout(() => {
      try { primaryAction.focus(); } catch (_) {}
    }, 50);
  }

  activeFocusTrap = {
    modalEl,
    handleKeyDown,
    prevActive
  };
}

/**
 * Releases modal focus trap and restores focus to previous triggering control.
 * @param {HTMLElement} [modalEl]
 */
export function releaseFocus(modalEl) {
  if (activeFocusTrap && (!modalEl || activeFocusTrap.modalEl === modalEl)) {
    activeFocusTrap.modalEl.removeEventListener('keydown', activeFocusTrap.handleKeyDown);
    if (activeFocusTrap.prevActive && typeof activeFocusTrap.prevActive.focus === 'function') {
      try { activeFocusTrap.prevActive.focus(); } catch (_) {}
    }
    activeFocusTrap = null;
  }
}

/**
 * Safe modal backdrop click handler that prevents accidental ghost dismissals
 * when the modal is opened on click/pointerdown and the user releases mouseup over the backdrop.
 * Requires that mousedown originated on the backdrop itself and that at least 300ms have elapsed.
 * @param {MouseEvent} event
 * @param {Function} closeFn
 */
export function handleModalBackdropClick(event, closeFn) {
  if (!event || event.target !== event.currentTarget) return;
  // If mousedown was captured, only allow dismiss if mouse press started ON this backdrop
  if (backdropMouseDownTarget !== null && backdropMouseDownTarget !== event.currentTarget) {
    return;
  }
  const openedAt = (event.currentTarget && event.currentTarget._openedAt) || 0;
  // Ignore clicks that occur within 300ms of opening (avoids ghost dismissal from the initial click release)
  if (performance.now() - openedAt < 300) {
    return;
  }
  if (typeof closeFn === 'function') {
    closeFn();
  }
}

if (typeof window !== 'undefined') {
  window.handleModalBackdropClick = handleModalBackdropClick;
}

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
  if (landingScreen && !landingScreen.classList.contains('hidden') && landingScreen.style.display !== 'none') {
    landingScreen.classList.add('hidden');
    landingScreen.classList.remove('flex');
    landingScreen.style.setProperty('display', 'none', 'important');
  }
  return false;
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
 * Modal IDs associated with turn-specific gameplay actions.
 * Only these modals are auto-dismissed when a turn advances.
 */
const TURN_ACTION_MODAL_IDS = [
  'modal-buy-city',
  'modal-buyout-city',
  'modal-sell-cities',
  'modal-upgrade-city',
  'modal-auction',
  'modal-festival-boost',
  'modal-festival-no-properties',
  'modal-chance-wheel',
  'modal-chance-result',
  'screen-dice-overlay'
];

/**
 * Informational user modals triggered from the top HUD bar.
 * Always elevated and togglable independently of turns.
 */
const USER_INFORMATIONAL_MODAL_IDS = [
  'modal-portfolio',
  'modal-trade',
  'modal-rules',
  'modal-confirm-exit-lobby',
  'modal-leaderboard'
];

/**
 * Closes other open user informational modals when a new one is opened.
 * Ensures only one user panel is open at a time without stacking backdrops.
 * @param {string} [exceptModalId]
 */
export function closeOtherInformationalModals(exceptModalId = null) {
  USER_INFORMATIONAL_MODAL_IDS.forEach(id => {
    if (id === exceptModalId) return;
    const el = document.getElementById(id);
    if (el && (!el.classList.contains('hidden') || el.style.display !== 'none')) {
      el.classList.add('hidden');
      el.classList.remove('flex');
      el.style.setProperty('display', 'none', 'important');
      el.style.removeProperty('opacity');
      el.style.removeProperty('z-index');
    }
  });
}

if (typeof window !== 'undefined') {
  window.closeOtherInformationalModals = closeOtherInformationalModals;
}

/**
 * Closes only turn-specific gameplay action dialogs (Buy, Upgrade, Chance, Auction).
 * Preserves informational user modals (Manage Cities, Trade, Rules, Leaderboard, Exit Lobby)
 * so human players inspecting their empire or reading rules are never interrupted by bot turns.
 */
export function closeTurnActionModals() {
  clearCityPreview();
  TURN_ACTION_MODAL_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (typeof anime !== 'undefined') anime.remove(el);
      if (el._autoCloseTimer) {
        clearTimeout(el._autoCloseTimer);
        el._autoCloseTimer = null;
      }
      el.classList.add('hidden');
      el.classList.remove('flex');
      el.style.setProperty('display', 'none', 'important');
      el.style.removeProperty('opacity');
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('z-index');
    }
  });
}

if (typeof window !== 'undefined') {
  window.closeTurnActionModals = closeTurnActionModals;
}

/**
 * Closes and hides all in-game modals and overlays defensively.
 * Cancels active anime.js tweens to prevent stuck backdrop-filter blurs.
 */
export function closeAllGameModals() {
  releaseFocus();
  clearCityPreview();
  const modalIds = [
    'modal-victory',
    'modal-monopoly-celebration',
    'modal-buy-city',
    'modal-buyout-city',
    'modal-sell-cities',
    'modal-upgrade-city',
    'modal-auction',
    'modal-festival-boost',
    'modal-festival-no-properties',
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
    'modal-update-alert',
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

