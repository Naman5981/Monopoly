/**
 * ui/anim/celebrations.js
 * In-game victory, salary, and festival jackpot celebration animations.
 */

import { isReducedMotion } from './common.js';

/**
 * Animated tally reveal for match victory rewards breakdown.
 * @param {string} containerSelector - Selector for breakdown container
 */
export function animateVictoryTally(containerSelector = '#victory-breakdown-list > div') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;
  const items = document.querySelectorAll(containerSelector);
  if (!items.length) return;

  anime.remove(items);
  anime({
    targets: items,
    translateX: [36, 0],
    opacity: [0, 1],
    delay: anime.stagger(80),
    duration: 450,
    easing: 'easeOutBack'
  });
}

/**
 * Festival Pot Jackpot Golden Rain: 24 gold coins fountain up & rain down
 * @param {number} targetPlayerIdx - Winner HUD index
 */
export function animateFestivalPotGoldenRain(targetPlayerIdx = 0) {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  const targetCard = document.getElementById(`hud-card-${targetPlayerIdx}`);
  const targetRect = targetCard ? targetCard.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2 };

  const container = document.createElement('div');
  container.className = 'fixed inset-0 pointer-events-none z-[70] overflow-hidden';
  document.body.appendChild(container);

  const coinCount = 24;
  const coins = [];

  for (let i = 0; i < coinCount; i++) {
    const coin = document.createElement('div');
    coin.textContent = (i % 3 === 0) ? '💎' : '🪙';
    coin.className = 'absolute text-2xl select-none filter drop-shadow-md';
    coin.style.left = `${window.innerWidth / 2 + (Math.random() - 0.5) * 80}px`;
    coin.style.top = `${window.innerHeight / 2}px`;
    container.appendChild(coin);
    coins.push(coin);
  }

  anime({
    targets: coins,
    translateX: (el) => {
      const destX = targetRect.left + 50 + (Math.random() - 0.5) * 60;
      return (destX - parseFloat(el.style.left)) + (Math.random() - 0.5) * 200;
    },
    translateY: [
      { value: () => -120 - Math.random() * 180, duration: 400, easing: 'easeOutQuad' },
      { value: () => targetRect.top - (window.innerHeight / 2) + (Math.random() - 0.5) * 40, duration: 600, easing: 'easeInQuad' }
    ],
    scale: [
      { value: 1.4, duration: 300 },
      { value: 0.8, duration: 700 }
    ],
    rotate: () => (Math.random() - 0.5) * 720,
    opacity: [
      { value: 1, duration: 100 },
      { value: 0, delay: 750, duration: 250 }
    ],
    delay: anime.stagger(22),
    complete: () => {
      container.remove();
      if (targetCard) {
        anime({
          targets: targetCard,
          scale: [1, 1.12, 1],
          duration: 350,
          easing: 'easeOutBack'
        });
      }
    }
  });
}

/**
 * GO / START Salary Badge Burst & Flying Bills Stream
 * @param {number} targetPlayerIdx - Player receiving salary
 * @param {string} amountLabel - Label e.g. '+300K'
 */
export function animateGoSalaryStream(targetPlayerIdx = 0, amountLabel = '+300K') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  const targetCard = document.getElementById(`hud-card-${targetPlayerIdx}`);
  const targetRect = targetCard ? targetCard.getBoundingClientRect() : { left: window.innerWidth / 2, top: 120 };

  // 1. Center burst banner
  let banner = document.getElementById('go-salary-burst-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'go-salary-burst-banner';
    banner.className = 'fixed top-[24%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] pointer-events-none flex flex-col items-center select-none';
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <div class="salary-badge px-6 py-2.5 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 border-3 border-white text-white font-display font-black text-xl sm:text-2xl tracking-wider uppercase shadow-[0_12px_40px_rgba(16,185,129,0.6)] flex items-center gap-2 transform">
      <span>💰</span>
      <span>${amountLabel} SALARY!</span>
      <span>🚩</span>
    </div>
  `;

  banner.style.display = 'flex';
  banner.style.opacity = '1';

  const badge = banner.querySelector('.salary-badge');
  anime.remove(badge);
  anime({
    targets: badge,
    scale: [0.3, 1.15, 1],
    duration: 480,
    easing: 'spring(1, 85, 9, 0)'
  });

  // 2. Flying cash bills stream from center to target player HUD
  const container = document.createElement('div');
  container.className = 'fixed inset-0 pointer-events-none z-[72] overflow-hidden';
  document.body.appendChild(container);

  const billCount = 10;
  const bills = [];
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight * 0.24;

  for (let i = 0; i < billCount; i++) {
    const bill = document.createElement('div');
    bill.textContent = '💵';
    bill.className = 'absolute text-2xl select-none filter drop-shadow-sm';
    bill.style.left = `${startX + (Math.random() - 0.5) * 40}px`;
    bill.style.top = `${startY + (Math.random() - 0.5) * 20}px`;
    container.appendChild(bill);
    bills.push(bill);
  }

  anime({
    targets: bills,
    translateX: (el) => (targetRect.left + 50 - startX) + (Math.random() - 0.5) * 60,
    translateY: (el) => (targetRect.top + 30 - startY) + (Math.random() - 0.5) * 40,
    scale: [
      { value: 1.3, duration: 200 },
      { value: 0.7, duration: 450 }
    ],
    rotate: () => (Math.random() - 0.5) * 360,
    opacity: [
      { value: 1, duration: 100 },
      { value: 0, delay: 500, duration: 200 }
    ],
    delay: anime.stagger(30),
    complete: () => {
      container.remove();
      if (targetCard) {
        anime({
          targets: targetCard,
          scale: [1, 1.14, 1],
          duration: 350,
          easing: 'easeOutBack'
        });
      }
    }
  });

  setTimeout(() => {
    anime({
      targets: banner,
      opacity: [1, 0],
      translateY: [0, -20],
      duration: 300,
      easing: 'easeInQuad',
      complete: () => {
        banner.style.display = 'none';
      }
    });
  }, 1200);
}
