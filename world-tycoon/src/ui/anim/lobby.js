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
 * Tactile spring bounce on team pill toggle (Red <-> Blue).
 * @param {HTMLElement|string} targetEl
 */
export function animateTeamPillToggle(targetEl) {
  if (typeof anime === 'undefined' || isReducedMotion() || !targetEl) return;
  anime.remove(targetEl);
  anime({
    targets: targetEl,
    scale: [0.82, 1.15, 1],
    duration: 340,
    easing: 'spring(1, 80, 10, 0)'
  });
}

/**
 * Phase 3: Alliance Clash bracket animation when entering or switching to Team Mode.
 * Staggers Red bracket from left, Blue bracket from right, and pops the VS divider.
 */
export function animateTeamClashEntrance() {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  const redBracket = document.querySelector('.team-bracket-red');
  const blueBracket = document.querySelector('.team-bracket-blue');
  const vsDivider = document.querySelector('.team-clash-divider');

  if (!redBracket && !blueBracket) return;

  anime.remove(['.team-bracket-red', '.team-bracket-blue', '.team-clash-divider']);

  const tl = anime.timeline({
    easing: 'easeOutBack'
  });

  if (redBracket) {
    tl.add({
      targets: redBracket,
      translateX: [-24, 0],
      opacity: [0, 1],
      duration: 360,
      easing: 'spring(1, 85, 12, 0)'
    });
  }

  if (vsDivider) {
    tl.add({
      targets: vsDivider,
      scale: [0.7, 1.1, 1],
      opacity: [0, 1],
      duration: 320,
      easing: 'spring(1, 80, 10, 0)'
    }, '-=200');
  }

  if (blueBracket) {
    tl.add({
      targets: blueBracket,
      translateX: [24, 0],
      opacity: [0, 1],
      duration: 360,
      easing: 'spring(1, 85, 12, 0)'
    }, '-=250');
  }
}

/**
 * Phase 3: Telemetry badge pulse / spring pop on balance state change.
 * @param {HTMLElement|string} targetEl
 */
export function animateTelemetryBadgePop(targetEl = '#roster-telemetry-badge') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;
  const el = typeof targetEl === 'string' ? document.querySelector(targetEl) : targetEl;
  if (!el) return;

  anime.remove(el);
  anime({
    targets: el,
    scale: [0.85, 1.12, 1],
    duration: 320,
    easing: 'spring(1, 85, 10, 0)'
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
    anime.remove('#title-menu-actions > div');
    anime.remove('#title-game-modes-grid > button');
    anime.remove('#lobby-hero-column');
    anime.remove('#setup-character-archetype-name');
    anime({
      targets: '#setup-character-archetype-name',
      scale: [0.9, 1],
      opacity: [0, 1],
      duration: 400,
      easing: 'spring(1, 80, 10, 0)'
    });
    anime({
      targets: ['#title-menu-actions > div:not(#title-game-modes-grid)', '#title-game-modes-grid > button', '#title-menu-actions > button'],
      scale: [0.94, 1],
      translateY: [8, 0],
      opacity: [0, 1],
      delay: anime.stagger(40),
      duration: 480,
      easing: 'spring(1, 85, 12, 0)'
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
