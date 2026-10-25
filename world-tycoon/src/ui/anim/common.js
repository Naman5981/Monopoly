/**
 * ui/anim/common.js
 * Common utility animations: reduced motion check, numeric counters, ripples, and gauges.
 */

export function isReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Interpolates numeric counters (Cash, Stars, Rent) with an odometer rolling effect.
 * @param {HTMLElement} element - Target DOM node
 * @param {number} startVal - Initial number
 * @param {number} endVal - Final target number
 * @param {string} prefix - Currency prefix e.g. '$' or '⭐'
 * @param {string} suffix - e.g. ' ⭐'
 * @param {number} duration - Animation duration in ms
 */
export function animateNumberCounter(element, startVal, endVal, prefix = '', suffix = '', duration = 650) {
  if (!element) return;
  const targetNum = Number(endVal) || 0;
  const initialNum = Number(startVal) || 0;

  if (typeof anime === 'undefined' || isReducedMotion() || Math.abs(targetNum - initialNum) < 2) {
    element.textContent = `${prefix}${targetNum.toLocaleString()}${suffix}`;
    return;
  }

  const obj = { val: initialNum };
  anime.remove(obj);
  anime({
    targets: obj,
    val: targetNum,
    round: 1,
    duration,
    easing: 'easeOutExpo',
    update: () => {
      element.textContent = `${prefix}${Math.round(obj.val).toLocaleString()}${suffix}`;
    }
  });
}

/**
 * Green & gold shockwave ripple expanding outward from target element on cash absorption.
 * @param {HTMLElement} element - Target element
 */
export function spawnCashSpringRipple(element) {
  if (!element || isReducedMotion()) return;
  const rect = element.getBoundingClientRect();
  const ripple = document.createElement('div');
  ripple.className = 'fixed pointer-events-none rounded-2xl border-2 border-emerald-400 bg-emerald-400/20 z-50 shadow-[0_0_24px_rgba(52,211,153,0.5)]';
  ripple.style.left = `${rect.left}px`;
  ripple.style.top = `${rect.top}px`;
  ripple.style.width = `${rect.width}px`;
  ripple.style.height = `${rect.height}px`;
  document.body.appendChild(ripple);

  if (typeof anime !== 'undefined') {
    anime({
      targets: ripple,
      scale: [1, 1.4],
      opacity: [0.9, 0],
      duration: 520,
      easing: 'easeOutQuad',
      complete: () => ripple.remove()
    });
  } else {
    setTimeout(() => ripple.remove(), 400);
  }
}

/**
 * Toast Accordion Push Animation
 * @param {HTMLElement} toast - New toast notification element
 */
export function animateToastAccordionPush(toast) {
  if (!toast || typeof anime === 'undefined' || isReducedMotion()) return;

  anime({
    targets: toast,
    translateY: [-20, 0],
    opacity: [0, 1],
    scale: [0.94, 1],
    duration: 350,
    easing: 'spring(1, 85, 10, 0)'
  });
}

/**
 * Leaderboard Net Worth Progress Gauges Draw
 */
export function animateLeaderboardGauges() {
  if (typeof anime === 'undefined' || isReducedMotion()) return;
  const bars = document.querySelectorAll('#leaderboard-players-list .net-worth-bar-fill, #leaderboard-list .net-worth-bar-fill');
  if (!bars.length) return;

  anime.remove(bars);
  anime({
    targets: bars,
    scaleX: [0, 1],
    opacity: [0, 1],
    delay: anime.stagger(60),
    duration: 650,
    easing: 'easeOutExpo'
  });
}
