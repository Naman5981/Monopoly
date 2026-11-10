/**
 * ui/anim/jail.js
 * Island Detention bars slam and jailbreak animations.
 */

import { isReducedMotion } from './common.js';

/**
 * Island Detention Heavy Iron Bars Slam
 * @param {number} playerIdx - Player sent to island
 */
export function animateIslandDetentionBars(playerIdx = 0) {
  const card = document.getElementById(`hud-card-${playerIdx}`);
  if (!card) return;

  card.classList.add('in-island-detention');

  let bars = card.querySelector('.island-iron-bars');
  if (!bars) {
    bars = document.createElement('div');
    bars.className = 'island-iron-bars';
    for (let i = 0; i < 4; i++) {
      const rod = document.createElement('div');
      rod.className = 'island-bar-rod';
      bars.appendChild(rod);
    }
    card.appendChild(bars);
  }

  bars.style.display = 'flex';
  bars.style.opacity = '1';

  if (typeof anime === 'undefined' || isReducedMotion()) return;

  anime.remove(bars);
  anime({
    targets: bars,
    translateY: ['-100%', '0%'],
    duration: 480,
    easing: 'spring(1, 95, 8, 0)'
  });
}

/**
 * Island Detention Jailbreak Shatter
 * @param {number} playerIdx - Player escaping the island
 */
export function animateIslandJailbreak(playerIdx = 0) {
  const card = document.getElementById(`hud-card-${playerIdx}`);
  if (!card) return;

  card.classList.remove('in-island-detention');

  const bars = card.querySelector('.island-iron-bars');
  if (bars) {
    if (typeof anime === 'undefined' || isReducedMotion()) {
      bars.remove();
      return;
    }

    const children = Array.from(bars.children);
    if (children.length >= 4) {
      anime({
        targets: [children[0], children[1]],
        translateX: [-10, -90],
        rotate: [0, -40],
        opacity: [1, 0],
        duration: 480,
        easing: 'easeOutQuad'
      });
      anime({
        targets: [children[2], children[3]],
        translateX: [10, 90],
        rotate: [0, 40],
        opacity: [1, 0],
        duration: 480,
        easing: 'easeOutQuad',
        complete: () => {
          bars.remove();
        }
      });
    } else {
      anime({
        targets: bars,
        opacity: [1, 0],
        scale: [1, 1.3],
        duration: 400,
        complete: () => bars.remove()
      });
    }
  }

  // Elastic celebration bounce on HUD card
  if (typeof anime !== 'undefined' && !isReducedMotion()) {
    anime({
      targets: card,
      scale: [0.93, 1.12, 1],
      duration: 500,
      easing: 'spring(1, 80, 10, 0)'
    });
  }
}
