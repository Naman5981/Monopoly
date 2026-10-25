/**
 * ui/anim/modals.js
 * Physics-based spring animations for modal dialogs and tile inspector drawer.
 */

import { trapFocus, releaseFocus } from '../modals/common.js';
import { isReducedMotion } from './common.js';

/**
 * Dynamic spring punch-in for game modals (Buy City, Inspector, Chance, Victory).
 * Uses high-fidelity physics spring curve with elastic settle.
 * @param {string|HTMLElement} target - Modal shell selector or element
 */
export function animateModalPunchIn(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  el.classList.remove('modal-instant-pop');
  void el.offsetWidth;
  el.classList.add('modal-instant-pop');
}

/**
 * Instant, zero-delay modal presentation with GPU-accelerated pop settle.
 * Completely eliminates RAF queue lag and full-screen backdrop blur thrashing.
 * @param {string|HTMLElement} modalTarget - Modal backdrop / container
 * @param {string|HTMLElement} [cardTarget=null] - Inner modal card / shell
 * @param {{x: number, y: number}|null} [originCoords=null] - Optional source screen coordinate
 */
export function animateModalSpringOpen(modalTarget, cardTarget = null, originCoords = null) {
  const modalEl = typeof modalTarget === 'string' ? document.querySelector(modalTarget) : modalTarget;
  if (!modalEl) return;
  let cardEl = typeof cardTarget === 'string' ? document.querySelector(cardTarget) : cardTarget;
  if (!cardEl) {
    cardEl = modalEl.querySelector('.game-modal-shell, .modal-card, [id$="-card"], .rounded-3xl, .rounded-2xl, .bg-white');
  }

  // Cancel any pending close safety timeout
  if (modalEl._closeTimeout) {
    clearTimeout(modalEl._closeTimeout);
    modalEl._closeTimeout = null;
  }

  // Stamp opening timestamp to guard backdrop click handler against ghost dismissal on mouseup
  modalEl._openedAt = performance.now();

  // 1. Reveal modal container cleanly and IMMEDIATELY (0ms!)
  modalEl.classList.remove('hidden');
  modalEl.classList.add('flex');
  modalEl.style.removeProperty('pointer-events');
  modalEl.style.removeProperty('display');
  modalEl.style.setProperty('display', 'flex', 'important');
  modalEl.style.setProperty('z-index', '1000', 'important');
  modalEl.style.setProperty('opacity', '1', 'important');
  modalEl.style.pointerEvents = 'auto';
  trapFocus(modalEl);

  // 2. Card instant display (0ms latency, truly instant)
  if (cardEl) {
    cardEl.style.removeProperty('display');
    cardEl.style.removeProperty('pointer-events');
    cardEl.style.pointerEvents = 'auto';
    cardEl.style.opacity = '1';
    cardEl.style.transform = 'none';
    cardEl.classList.remove('modal-instant-pop');
  }
}

/**
 * Instant, zero-delay modal dismissal.
 * @param {string|HTMLElement} modalTarget - Modal backdrop / container
 * @param {string|HTMLElement|Function} [cardTarget=null] - Inner modal card or callback
 * @param {Function} [onDone=null] - Completion callback
 */
export function animateModalSpringClose(modalTarget, cardTarget = null, onDone = null) {
  if (typeof cardTarget === 'function') {
    onDone = cardTarget;
    cardTarget = null;
  }
  const modalEl = typeof modalTarget === 'string' ? document.querySelector(modalTarget) : modalTarget;
  if (!modalEl) {
    if (onDone) onDone();
    return;
  }
  let cardEl = typeof cardTarget === 'string' ? document.querySelector(cardTarget) : cardTarget;
  if (!cardEl) {
    cardEl = modalEl.querySelector('.game-modal-shell, .modal-card, [id$="-card"], .rounded-3xl, .rounded-2xl, .bg-white');
  }

  if (modalEl._closeTimeout) {
    clearTimeout(modalEl._closeTimeout);
    modalEl._closeTimeout = null;
  }

  releaseFocus(modalEl);
  modalEl.classList.add('hidden');
  modalEl.classList.remove('flex');
  modalEl.style.setProperty('display', 'none', 'important');
  modalEl.style.removeProperty('opacity');
  modalEl.style.removeProperty('pointer-events');
  modalEl.style.removeProperty('z-index');
  if (cardEl) {
    cardEl.classList.remove('modal-instant-pop');
    cardEl.style.removeProperty('transform');
    cardEl.style.removeProperty('opacity');
  }
  if (onDone) {
    onDone();
  }
}

export function animateTileInspectorSpringOpen(drawerTarget = '#modal-tile-inspector', cardTarget = '#modal-tile-inspector-card') {
  const drawerEl = typeof drawerTarget === 'string' ? document.querySelector(drawerTarget) : drawerTarget;
  const cardEl = typeof cardTarget === 'string' ? document.querySelector(cardTarget) : cardTarget;
  if (!drawerEl || !cardEl) return;

  drawerEl.style.removeProperty('display');
  drawerEl.classList.remove('hidden');
  drawerEl.classList.add('flex');

  if (typeof anime === 'undefined' || isReducedMotion()) {
    cardEl.style.transform = 'none';
    cardEl.style.opacity = '1';
    return;
  }

  anime.remove(cardEl);
  cardEl.style.willChange = 'transform, opacity';
  anime({
    targets: cardEl,
    translateY: ['115%', '0%'],
    scale: [0.92, 1],
    opacity: [0, 1],
    duration: 540,
    easing: 'spring(1, 90, 12, 0)',
    complete: () => {
      cardEl.style.willChange = 'auto';
    }
  });
}

/**
 * Bottom-right Tile Inspector slide-down dismiss.
 * @param {string|HTMLElement} drawerTarget
 * @param {string|HTMLElement} cardTarget
 * @param {Function} [onDone=null]
 */
export function animateTileInspectorSpringClose(drawerTarget = '#modal-tile-inspector', cardTarget = '#modal-tile-inspector-card', onDone = null) {
  const drawerEl = typeof drawerTarget === 'string' ? document.querySelector(drawerTarget) : drawerTarget;
  const cardEl = typeof cardTarget === 'string' ? document.querySelector(cardTarget) : cardTarget;

  if (!drawerEl || !cardEl) {
    if (onDone) onDone();
    return;
  }

  if (typeof anime === 'undefined' || isReducedMotion()) {
    drawerEl.classList.add('hidden');
    drawerEl.classList.remove('flex');
    if (onDone) onDone();
    return;
  }

  anime.remove(cardEl);
  anime({
    targets: cardEl,
    translateY: ['0%', '120%'],
    scale: [1, 0.94],
    opacity: [1, 0],
    duration: 220,
    easing: 'easeInQuad',
    complete: () => {
      drawerEl.classList.add('hidden');
      drawerEl.classList.remove('flex');
      cardEl.style.removeProperty('transform');
      cardEl.style.removeProperty('opacity');
      if (onDone) onDone();
    }
  });
}
