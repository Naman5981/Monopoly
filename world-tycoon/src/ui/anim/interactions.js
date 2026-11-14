/**
 * ui/anim/interactions.js
 * In-game interactive micro-animations: HUD card springs, turn switches, deck draws, bankruptcies, upgrades, slingshots.
 */

import { isReducedMotion, spawnCashSpringRipple } from './common.js';

/**
 * Active turn switch animation with elastic spring punch on HUD player card.
 * @param {number} playerIdx - Newly activated player index
 */
export function animateActiveTurnSwitch(playerIdx) {
  if (typeof anime === 'undefined' || isReducedMotion()) return;
  const card = document.getElementById(`hud-card-${playerIdx}`);
  if (!card) return;

  anime.remove(card);
  anime({
    targets: card,
    scale: [0.93, 1.07, 1],
    duration: 550,
    easing: 'spring(1, 80, 10, 0)'
  });

  const avatar = card.querySelector('.avatar-circle');
  if (avatar) {
    anime({
      targets: avatar,
      scale: [1, 1.18, 1],
      duration: 480,
      easing: 'easeOutBack'
    });
  }
}

/**
 * Physics-based 3D spring card draw from Chance / Community Chest deck.
 * Supports origin coordinates from board/deck tile with elastic spring physics.
 * @param {string|HTMLElement} cardSelector - Target card element
 * @param {{x: number, y: number}|null} [originCoords=null] - Optional source screen coordinate for FLIP expansion
 */
export function animateChanceDeckDraw(cardSelector = '#modal-chance-result .game-modal-shell', originCoords = null) {
  if (typeof anime === 'undefined' || isReducedMotion()) return;
  const card = typeof cardSelector === 'string' ? document.querySelector(cardSelector) : cardSelector;
  if (!card) return;

  let startX = 0;
  let startY = 240;
  if (originCoords && typeof originCoords.x === 'number' && typeof originCoords.y === 'number') {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    startX = Math.max(-220, Math.min(220, (originCoords.x - cx) * 0.5));
    startY = Math.max(-180, Math.min(260, (originCoords.y - cy) * 0.5));
  }

  anime.remove(card);
  card.style.willChange = 'transform, opacity';
  anime({
    targets: card,
    translateX: [startX, 0],
    translateY: [startY, 0],
    rotateY: [180, 0],
    rotateZ: [-24, 0],
    scale: [0.25, 1],
    opacity: [0, 1],
    duration: 680,
    easing: 'spring(1, 80, 10, 0)',
    complete: () => {
      card.style.willChange = 'auto';
    }
  });

  const icon = document.getElementById('chance-result-icon');
  if (icon) {
    anime.remove(icon);
    anime({
      targets: icon,
      scale: [0, 1.28, 1],
      rotate: [-24, 0],
      delay: 180,
      duration: 520,
      easing: 'spring(1, 85, 10, 0)'
    });
  }

  const badges = card.querySelectorAll('#chance-result-tag, #chance-result-action, .chance-badge');
  if (badges.length) {
    anime.remove(badges);
    anime({
      targets: badges,
      translateY: [24, 0],
      scale: [0.75, 1],
      opacity: [0, 1],
      delay: anime.stagger(60, { start: 220 }),
      duration: 480,
      easing: 'spring(1, 90, 12, 0)'
    });
  }
}

/**
 * Elastic spring absorption effect on player HUD card when receiving rent or cash.
 * @param {number} playerIdx - Recipient player index
 */
export function animateHUDCardSpringAbsorb(playerIdx) {
  if (typeof anime === 'undefined' || isReducedMotion()) return;
  const card = document.getElementById(`hud-card-${playerIdx}`);
  if (!card) return;

  anime.remove(card);
  anime({
    targets: card,
    scale: [1, 1.15, 0.95, 1.04, 1],
    duration: 600,
    easing: 'spring(1, 85, 10, 0)'
  });

  spawnCashSpringRipple(card);
}

/**
 * Bankruptcy liquidation earthquake & elimination seal stamp on debtor HUD card.
 * @param {number} playerIdx - Bankrupt player index
 */
export function animateBankruptcyQuake(playerIdx) {
  if (typeof anime === 'undefined' || isReducedMotion()) return;
  const card = document.getElementById(`hud-card-${playerIdx}`);
  if (!card) return;

  anime.remove(card);

  // 1. Violent camera-like HUD card earthquake
  anime({
    targets: card,
    translateX: [-14, 14, -10, 10, -5, 5, 0],
    duration: 650,
    easing: 'easeInOutQuad'
  });

  // 2. Drop ELIMINATED stamp seal
  let seal = card.querySelector('.bankruptcy-eliminated-stamp');
  if (!seal) {
    seal = document.createElement('div');
    seal.className = 'bankruptcy-eliminated-stamp absolute inset-0 flex items-center justify-center pointer-events-none z-30';
    seal.innerHTML = `
      <div class="px-4 py-1.5 rounded-xl border-4 border-rose-600 bg-rose-600/90 text-white font-display font-black text-sm tracking-widest uppercase shadow-2xl transform -rotate-12">
        ELIMINATED
      </div>
    `;
    card.style.position = 'relative';
    card.appendChild(seal);
  }

  anime({
    targets: seal.firstElementChild,
    scale: [2.8, 1],
    opacity: [0, 1],
    rotate: [-24, -12],
    duration: 500,
    easing: 'spring(1, 95, 8, 0)'
  });
}

/**
 * Building Upgrade Anvil Bounce (Squash & Stretch drop)
 * @param {string|HTMLElement} target - Target preview canvas or card
 */
export function animateBuildingUpgradeBounce(target = '#upgrade-city-3d-canvas') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;

  anime.remove(el);
  anime({
    targets: el,
    translateY: [-35, 0],
    scaleY: [1.2, 0.86, 1.05, 1],
    scaleX: [0.85, 1.14, 0.98, 1],
    duration: 550,
    easing: 'spring(1, 85, 9, 0)'
  });
}

/**
 * Bot Trade Proposal Handshake Pop
 * @param {string|HTMLElement} target - Trade modal card
 */
export function animateBotTradeHandshake(target = '#modal-incoming-trade-card, #modal-incoming-trade .game-modal-shell, #modal-trade-offer .game-modal-shell') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;

  anime.remove(el);
  anime({
    targets: el,
    scale: [0.75, 1.08, 1],
    rotate: [-5, 0],
    duration: 550,
    easing: 'spring(1, 80, 10, 0)'
  });
}

/**
 * Dice Slingshot Pullback & Snap
 * @param {HTMLElement} btn - Roll dice button element
 */
export function animateDiceSlingshotPullback(btn) {
  if (!btn || typeof anime === 'undefined' || isReducedMotion()) return;

  anime.remove(btn);
  anime({
    targets: btn,
    scale: [1, 0.91, 1],
    duration: 320,
    easing: 'spring(1, 90, 8, 0)'
  });
}

/**
 * Auction Gavel Strike & Bid Ripple Wave
 */
export function animateAuctionGavelRipple() {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  const gavel = document.querySelector('#modal-auction .fa-gavel');
  if (gavel) {
    anime.remove(gavel);
    anime({
      targets: gavel,
      rotate: [-35, 12, 0],
      duration: 320,
      easing: 'spring(1, 95, 8, 0)'
    });
  }

  const bidEl = document.getElementById('auction-high-bid');
  if (bidEl) {
    anime.remove(bidEl);
    anime({
      targets: bidEl,
      scale: [0.85, 1.22, 1],
      duration: 380,
      easing: 'spring(1, 85, 10, 0)'
    });
  }
}
