/**
 * ui/anim/lobby.js
 * Staggered animations for Title, Lobby, Wardrobe, and P2P radar.
 */

import { isReducedMotion } from './common.js';

/**
 * Orchestrates arcade staggered entrance on title / lobby setup arena.
 */
export function animateLobbyEntrance() {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  const tl = anime.timeline({
    easing: 'easeOutQuad'
  });

  // 1. Studio Header drops down
  tl.add({
    targets: '#landing-setup-screen > div:first-child',
    translateY: [-24, 0],
    opacity: [0, 1],
    duration: 380
  })
  // 2. 3D Hero Centerpiece bouncy spring entrance
  .add({
    targets: '#lobby-hero-column',
    scale: [0.86, 1],
    opacity: [0, 1],
    duration: 650,
    easing: 'spring(1, 80, 11, 0)'
  }, '-=250')
  // 3. Table roster cards slide and pop from left
  .add({
    targets: '#setup-players-roster > div',
    translateX: [-30, 0],
    opacity: [0, 1],
    delay: anime.stagger(45),
    duration: 420,
    easing: 'easeOutBack'
  }, '-=400')
  // 4. Match settings Bento items slide from right
  .add({
    targets: '#lobby-settings-column .space-y-4 > div',
    translateX: [30, 0],
    opacity: [0, 1],
    delay: anime.stagger(50),
    duration: 420,
    easing: 'easeOutBack'
  }, '-=350');
}

/**
 * Staggers wardrobe item cards when opening or switching category tabs.
 * @param {string} gridSelector - Default '#wardrobe-items-grid > div'
 */
export function animateWardrobeGridCascade(gridSelector = '#wardrobe-items-grid > div') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  const cards = document.querySelectorAll(gridSelector);
  if (!cards.length) return;

  anime.remove(cards);
  anime({
    targets: cards,
    translateY: [24, 0],
    scale: [0.94, 1],
    opacity: [0, 1],
    delay: anime.stagger(30),
    duration: 380,
    easing: 'cubicBezier(0.2, 0, 0, 1)'
  });
}

/**
 * P2P Multiplayer Join Radar Ping
 * @param {number} slotIndex - Roster slot index
 */
export function animatePlayerJoinRadarPing(slotIndex = 0) {
  if (typeof anime === 'undefined' || isReducedMotion()) return;
  const roster = document.getElementById('setup-players-roster');
  if (!roster) return;
  const slot = roster.children[slotIndex];
  if (!slot) return;

  anime.remove(slot);
  anime({
    targets: slot,
    scale: [0.92, 1.04, 1],
    backgroundColor: ['rgba(56, 189, 248, 0.35)', 'rgba(255, 255, 255, 1)'],
    duration: 600,
    easing: 'easeOutBack'
  });
}

/**
 * Smooth spring choreography when switching between Title, Local, and Multiplayer views.
 * @param {string} viewName - 'title' | 'local' | 'multiplayer-portal' | 'multiplayer-room'
 */
export function animateLobbyViewTransition(viewName = 'title') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  if (viewName === 'title') {
    anime.remove('#title-menu-actions > button');
    anime.remove('#lobby-hero-column');
    anime({
      targets: '#title-menu-actions > button',
      scale: [0.88, 1],
      opacity: [0, 1],
      delay: anime.stagger(60),
      duration: 480,
      easing: 'spring(1, 85, 10, 0)'
    });
    anime({
      targets: '#lobby-hero-column',
      scale: [0.94, 1],
      duration: 450,
      easing: 'spring(1, 80, 10, 0)'
    });
  } else if (viewName === 'local') {
    anime.remove('#lobby-roster-column');
    anime.remove('#lobby-settings-column');
    anime.remove('#lobby-hero-column');
    anime({
      targets: '#lobby-roster-column',
      translateX: [-35, 0],
      opacity: [0, 1],
      duration: 450,
      easing: 'spring(1, 85, 10, 0)'
    });
    anime({
      targets: '#lobby-settings-column',
      translateX: [35, 0],
      opacity: [0, 1],
      duration: 450,
      easing: 'spring(1, 85, 10, 0)'
    });
    anime({
      targets: '#lobby-hero-column',
      scale: [0.92, 1],
      duration: 450,
      easing: 'spring(1, 80, 10, 0)'
    });
  } else if (viewName === 'multiplayer-portal') {
    anime.remove('#lobby-multiplayer-portal > div');
    anime({
      targets: '#lobby-multiplayer-portal > div',
      scale: [0.9, 1],
      opacity: [0, 1],
      delay: anime.stagger(80),
      duration: 520,
      easing: 'spring(1, 85, 10, 0)'
    });
  } else if (viewName === 'multiplayer-room') {
    anime.remove(['#lobby-roster-column', '#lobby-hero-column', '#lobby-settings-column']);
    anime({
      targets: ['#lobby-roster-column', '#lobby-hero-column', '#lobby-settings-column'],
      scale: [0.95, 1],
      opacity: [0, 1],
      delay: anime.stagger(50),
      duration: 480,
      easing: 'spring(1, 85, 10, 0)'
    });
  }
}
