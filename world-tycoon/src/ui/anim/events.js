/**
 * ui/anim/events.js
 * In-game celebration and event animations: doubles, turn switch, bankruptcy, monopoly ribbon, festival pot, etc.
 */

import { isReducedMotion, spawnCashSpringRipple } from './common.js';

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
 * Comic-book pop banner when rolling doubles.
 * @param {string} playerName - Player who rolled doubles
 */
export function animateDoublesBurstBanner(playerName = '') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  let banner = document.getElementById('doubles-comic-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'doubles-comic-banner';
    banner.className = 'fixed top-[26%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none flex flex-col items-center select-none';
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <div class="doubles-comic-badge relative px-8 py-3.5 rounded-3xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 border-4 border-white shadow-[0_14px_40px_rgba(245,158,11,0.6)] flex flex-col items-center transform">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl filter drop-shadow">🎲</span>
        <span class="font-display font-black text-3xl sm:text-4xl text-slate-950 tracking-wider drop-shadow-sm uppercase">DOUBLES!</span>
        <span class="text-3xl filter drop-shadow">🎲</span>
      </div>
      <div class="mt-1 px-3.5 py-0.5 rounded-full bg-slate-950 text-amber-300 font-black text-xs uppercase tracking-widest shadow-inner">
        ROLL AGAIN BONUS!
      </div>
    </div>
  `;

  banner.style.display = 'flex';
  banner.style.opacity = '1';

  anime.remove(banner);
  const badge = banner.querySelector('.doubles-comic-badge');
  anime({
    targets: badge,
    scale: [0.2, 1.2, 1],
    rotate: [-12, 3, 0],
    duration: 620,
    easing: 'spring(1, 80, 10, 0)'
  });

  setTimeout(() => {
    anime({
      targets: banner,
      opacity: [1, 0],
      translateY: [0, -28],
      duration: 350,
      easing: 'easeInQuad',
      complete: () => {
        banner.style.display = 'none';
      }
    });
  }, 1400);
}

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

/** Legacy alias pointing to animateChanceDeckDraw */
export function animateFortuneCardUnfold(cardSelector = '#modal-chance-result .game-modal-shell') {
  animateChanceDeckDraw(cardSelector, null);
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
 * World Tour Flight Boarding Pass Zoom & Perforation Stamp
 */
export function animateBoardingPassZoom(destinationName = 'AIRPORT') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  let pass = document.getElementById('world-tour-boarding-pass');
  if (!pass) {
    pass = document.createElement('div');
    pass.id = 'world-tour-boarding-pass';
    pass.className = 'fixed top-[22%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[65] pointer-events-none flex flex-col items-center select-none';
    document.body.appendChild(pass);
  }

  pass.innerHTML = `
    <div class="boarding-pass-card relative bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 text-white rounded-3xl p-5 shadow-[0_16px_48px_rgba(2,132,199,0.55)] border-2 border-white/60 flex items-center gap-5 min-w-[320px] max-w-sm">
      <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner border border-white/30">
        ✈️
      </div>
      <div>
        <div class="text-[10px] font-black tracking-widest text-sky-200 uppercase">WORLD TYCOON AIRWAYS</div>
        <div class="font-display font-black text-xl text-white tracking-wide">VIP FIRST CLASS</div>
        <div class="text-xs font-bold text-sky-100 flex items-center gap-1.5 mt-0.5">
          <span>DESTINATION:</span>
          <span class="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[11px] uppercase">${destinationName}</span>
        </div>
      </div>
    </div>
  `;

  pass.style.display = 'flex';
  pass.style.opacity = '1';

  const card = pass.querySelector('.boarding-pass-card');
  anime.remove(card);
  anime({
    targets: card,
    translateY: [60, 0],
    scale: [0.4, 1.05, 1],
    rotate: [-8, 0],
    duration: 650,
    easing: 'spring(1, 80, 10, 0)'
  });

  setTimeout(() => {
    anime({
      targets: pass,
      opacity: [1, 0],
      scale: [1, 1.1],
      translateY: [0, -40],
      duration: 350,
      easing: 'easeInQuad',
      complete: () => {
        pass.style.display = 'none';
      }
    });
  }, 1600);
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
    translateX: (el, i) => {
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
 * Monopoly Ribbon SVG Unfurl Across Screen
 * @param {string} groupName - e.g. 'United States'
 * @param {string} colorHex - Group color hex
 */
export function animateMonopolyRibbonUnfurl(groupName = 'COLOR GROUP', colorHex = '#eab308') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  let ribbon = document.getElementById('monopoly-anime-ribbon');
  if (!ribbon) {
    ribbon = document.createElement('div');
    ribbon.id = 'monopoly-anime-ribbon';
    ribbon.className = 'fixed top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[65] pointer-events-none flex flex-col items-center select-none';
    document.body.appendChild(ribbon);
  }

  ribbon.innerHTML = `
    <div class="monopoly-ribbon-shell px-10 py-4 rounded-3xl text-white font-display font-black text-2xl sm:text-3xl tracking-widest uppercase shadow-[0_16px_48px_rgba(0,0,0,0.5)] border-4 border-white flex items-center gap-3 transform" style="background: ${colorHex};">
      <span>👑</span>
      <span>${groupName} MONOPOLY!</span>
      <span>👑</span>
    </div>
  `;

  ribbon.style.display = 'flex';
  ribbon.style.opacity = '1';

  const shell = ribbon.querySelector('.monopoly-ribbon-shell');
  anime.remove(shell);
  anime({
    targets: shell,
    scaleX: [0.1, 1],
    scaleY: [0.2, 1],
    rotate: [-8, 0],
    duration: 600,
    easing: 'spring(1, 80, 10, 0)'
  });

  setTimeout(() => {
    anime({
      targets: ribbon,
      opacity: [1, 0],
      scale: [1, 1.1],
      duration: 350,
      easing: 'easeInQuad',
      complete: () => {
        ribbon.style.display = 'none';
      }
    });
  }, 1800);
}

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
 * Bot Trade Proposal Handshake Pop
 * @param {string|HTMLElement} target - Trade modal card
 */
export function animateBotTradeHandshake(target = '#modal-incoming-trade .game-modal-shell, #modal-trade-offer .game-modal-shell') {
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
 * Hostile Buyout Stamp Slam & Card Earthquake
 * @param {string} cityName - Name of bought out property
 */
export function animateBuyoutHostileStamp(cityName = 'PROPERTY') {
  if (typeof anime === 'undefined' || isReducedMotion()) return;

  let stamp = document.getElementById('buyout-hostile-stamp');
  if (!stamp) {
    stamp = document.createElement('div');
    stamp.id = 'buyout-hostile-stamp';
    stamp.className = 'fixed top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[75] pointer-events-none flex flex-col items-center select-none';
    document.body.appendChild(stamp);
  }

  stamp.innerHTML = `
    <div class="buyout-stamp-badge relative px-8 py-3.5 rounded-3xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 border-4 border-white shadow-[0_16px_50px_rgba(225,29,72,0.7)] flex flex-col items-center transform -rotate-6">
      <div class="flex items-center gap-2">
        <span class="text-3xl">⚔️</span>
        <span class="font-display font-black text-2xl sm:text-3xl text-white tracking-widest uppercase drop-shadow">HOSTILE TAKEOVER!</span>
        <span class="text-3xl">⚔️</span>
      </div>
      <div class="mt-0.5 px-3 py-0.5 rounded-full bg-white/20 text-rose-100 font-extrabold text-[11px] uppercase tracking-wider">
        ${cityName} ACQUIRED
      </div>
    </div>
  `;

  stamp.style.display = 'flex';
  stamp.style.opacity = '1';

  const badge = stamp.querySelector('.buyout-stamp-badge');
  anime.remove(badge);
  anime({
    targets: badge,
    scale: [2.5, 0.95, 1],
    rotate: [-18, -6],
    duration: 520,
    easing: 'spring(1, 95, 8, 0)'
  });

  const card = document.getElementById('modal-buyout-city-card');
  if (card) {
    anime({
      targets: card,
      translateX: [-10, 10, -6, 6, 0],
      duration: 400,
      easing: 'easeInOutQuad'
    });
  }

  setTimeout(() => {
    anime({
      targets: stamp,
      opacity: [1, 0],
      scale: [1, 1.15],
      duration: 320,
      easing: 'easeInQuad',
      complete: () => {
        stamp.style.display = 'none';
      }
    });
  }, 1400);
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
    translateX: (el, i) => (targetRect.left + 50 - startX) + (Math.random() - 0.5) * 60,
    translateY: (el, i) => (targetRect.top + 30 - startY) + (Math.random() - 0.5) * 40,
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
