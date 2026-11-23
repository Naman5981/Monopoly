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

  const avatar = card.querySelector('.avatar-frame') || card.querySelector('.avatar-circle');
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  if (avatar) {
    anime.remove(avatar);
    anime({
      targets: avatar,
      scale: [1.18, 1],
      duration: 480,
      easing: 'spring(1, 95, 8, 0)'
    });
  }
}

/**
 * Island Detention Jailbreak Shatter
 * @param {number} playerIdx - Player escaping the island
 */
export function animateIslandJailbreak(playerIdx = 0) {
  const card = document.getElementById(`hud-card-${playerIdx}`);
  if (!card) return;

  card.classList.remove('in-island-detention');

  const allBars = card.querySelectorAll('.island-iron-bars');
  allBars.forEach(b => b.remove());

  const avatar = card.querySelector('.avatar-frame') || card.querySelector('.avatar-circle');
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  if (avatar) {
    anime.remove(avatar);
    anime({
      targets: avatar,
      scale: [0.92, 1],
      duration: 350,
      easing: 'easeOutElastic(1, .6)'
    });
  }

  // Elastic celebration bounce on HUD card
  anime({
    targets: card,
    scale: [0.95, 1.05, 1],
    duration: 500,
    easing: 'spring(1, 80, 10, 0)'
  });
}
