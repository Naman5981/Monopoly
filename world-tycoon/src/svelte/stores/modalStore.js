/**
 * svelte/stores/modalStore.js
 * Central reactive modal store for World Tycoon.
 * Bridges modal logic to declarative Svelte 5 modal components.
 */

import { writable } from 'svelte/store';

const initialModalState = {
  trade: {
    visible: false,
    partnerIdx: null,
    partners: [],
    myProperties: [],
    partnerProperties: [],
    selectedMyProps: [],
    selectedPartnerProps: [],
    statusMessage: '',
    isWaiting: false,
    incomingTrade: {
      visible: false,
      botName: '',
      theyOfferProps: [],
      theyReqProps: [],
      rationale: ''
    }
  },
  buyout: {
    visible: false,
    tile: null,
    buyoutCost: 0,
    buyoutCostFormatted: '$0',
    basePriceFormatted: '$0',
    housesCostFormatted: '$0',
    sellerName: '',
    buyerBalanceFormatted: '$0',
    canAfford: false,
    secondsLeft: 12
  },
  inspector: {
    visible: false,
    tile: null,
    ownerName: 'Unowned',
    level: 0,
    mortgaged: false,
    festivalBoost: false,
    upgradeCost: 0,
    isOwner: false,
    canUpgrade: false
  },
  chanceWheel: {
    visible: false,
    isSpinning: false,
    isSpectator: false,
    isAI: false,
    cardText: '',
    cardAction: '',
    cardIcon: '🎲',
    resultVisible: false,
    resultTitle: 'CHANCE CARD',
    resultDesc: ''
  },
  festivalBoost: {
    visible: false,
    noPropertiesVisible: false,
    potAmountFormatted: '$0',
    ownedProperties: [],
    selectedPropId: null
  },
  buyCity: {
    visible: false,
    tile: null,
    cityName: 'ISTANBUL',
    countryName: 'GLOBAL METROPOLIS',
    colorHex: '#0284c7',
    priceFormatted: '$600K',
    rentFormatted: '$90K',
    buyerName: 'Player 1',
    buyerBadge: 'ACTIVE TURN',
    buyerColor: '#3b82f6',
    balancePreview: '',
    canAfford: true,
    maxRentHtml: ''
  },
  upgradeCity: {
    visible: false,
    tile: null,
    cityName: 'TOKYO',
    countryName: 'YOUR ESTATE',
    levelLabel: 'Level 1',
    colorHex: '#10b981',
    currentRentFormatted: '$180K',
    upgradeCostFormatted: '$200K',
    balanceFormatted: 'Balance: $1.2M',
    noticeText: '',
    canUpgrade: true,
    canUpgradeTwo: false,
    costOneFormatted: '$160K',
    costTwoFormatted: '$320K',
    tiers: []
  },
  sellCities: {
    visible: false,
    creditorSubtitle: 'Insufficient cash to pay rent',
    rentDueFormatted: '$0',
    currentCashFormatted: '$0',
    deficitFormatted: '$0',
    ownedProperties: []
  },
  auction: {
    visible: false,
    cityName: 'TOKYO',
    baseValFormatted: 'Value: 500K',
    highBidFormatted: '150K',
    highBidder: 'Leading: YOU',
    activeBidder: 'YOU'
  },
  portfolio: {
    visible: false,
    properties: []
  },
  rules: {
    visible: false
  },
  victory: {
    visible: false,
    title: 'YOU WON!',
    subtitle: 'Supreme World Real Estate Tycoon',
    accoladeIcon: '👑',
    accoladeTitle: 'GLOBAL TYCOON SUPREMACY!',
    accoladeDesc: 'All rival tycoons bankrupted. You rule the entire global real estate empire!',
    finalCashFormatted: '$0',
    empireCitiesCount: 0,
    starsEarned: '+0 ⭐',
    totalBalanceStars: '500 ⭐',
    multiplayerStatus: ''
  },
  wardrobe: {
    visible: false,
    activeCategory: 'hat',
    starsBalance: 500
  }
};

export const modalStore = writable(initialModalState);

/**
 * Updates a specific modal slice in modalStore.
 * @param {'trade' | 'buyout' | 'inspector' | 'chanceWheel' | 'festivalBoost' | 'buyCity' | 'upgradeCity' | 'sellCities' | 'auction' | 'portfolio' | 'rules' | 'victory' | 'wardrobe'} modalKey
 * @param {Record<string, any>} patch
 */
export function updateModalSlice(modalKey, patch) {
  modalStore.update(state => {
    const updatedSlice = { ...state[modalKey], ...patch };
    syncModalDom(modalKey, updatedSlice);
    return {
      ...state,
      [modalKey]: updatedSlice
    };
  });
}

/**
 * Closes all modals in modalStore.
 */
export function closeAllModalsInStore() {
  modalStore.update(state => {
    const nextState = {
      trade: { ...state.trade, visible: false, incomingTrade: { ...state.trade.incomingTrade, visible: false } },
      buyout: { ...state.buyout, visible: false },
      inspector: { ...state.inspector, visible: false },
      chanceWheel: { ...state.chanceWheel, visible: false, resultVisible: false },
      festivalBoost: { ...state.festivalBoost, visible: false, noPropertiesVisible: false },
      buyCity: { ...state.buyCity, visible: false },
      upgradeCity: { ...state.upgradeCity, visible: false },
      sellCities: { ...state.sellCities, visible: false },
      auction: { ...state.auction, visible: false },
      portfolio: { ...state.portfolio, visible: false },
      rules: { ...state.rules, visible: false },
      victory: { ...state.victory, visible: false },
      wardrobe: { ...state.wardrobe, visible: false }
    };
    for (const key of Object.keys(nextState)) {
      syncModalDom(key, nextState[key]);
    }
    return nextState;
  });
}

/**
 * Synchronizes DOM classes with reactive store state for backward compatibility with animation & test runners.
 */
function syncModalDom(modalKey, slice) {
  if (typeof document === 'undefined') return;

  const toggleElementVisibility = (id, isVisible) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (isVisible) {
      el.classList.remove('hidden');
      el.classList.add('flex');
    } else {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  };

  switch (modalKey) {
    case 'buyout': {
      toggleElementVisibility('modal-buyout-city', slice.visible);
      const passBtn = document.getElementById('btn-pass-buyout');
      if (passBtn && slice.secondsLeft !== undefined) {
        passBtn.innerHTML = `PASS (${slice.secondsLeft}s)`;
      }
      break;
    }
    case 'trade': {
      toggleElementVisibility('modal-trade', slice.visible);
      toggleElementVisibility('modal-incoming-trade', slice.incomingTrade?.visible);
      break;
    }
    case 'inspector': {
      const el = document.getElementById('modal-tile-inspector');
      if (el) {
        if (slice.visible) el.classList.remove('hidden');
        else el.classList.add('hidden');
      }
      break;
    }
    case 'chanceWheel': {
      toggleElementVisibility('modal-chance-wheel', slice.visible);
      toggleElementVisibility('modal-chance-result', slice.resultVisible);
      break;
    }
    case 'festivalBoost': {
      toggleElementVisibility('modal-festival-boost', slice.visible);
      toggleElementVisibility('modal-festival-no-properties', slice.noPropertiesVisible);
      break;
    }
    case 'buyCity': {
      toggleElementVisibility('modal-buy-city', slice.visible);
      break;
    }
    case 'upgradeCity': {
      toggleElementVisibility('modal-upgrade-city', slice.visible);
      break;
    }
    case 'sellCities': {
      toggleElementVisibility('modal-sell-cities', slice.visible);
      const subtitleEl = document.getElementById('sell-cities-creditor-subtitle');
      if (subtitleEl && slice.creditorSubtitle !== undefined) subtitleEl.textContent = slice.creditorSubtitle;
      const rentDueEl = document.getElementById('sell-cities-rent-due');
      if (rentDueEl && slice.rentDueFormatted !== undefined) rentDueEl.textContent = slice.rentDueFormatted;
      const curCashEl = document.getElementById('sell-cities-current-cash');
      if (curCashEl && slice.currentCashFormatted !== undefined) curCashEl.textContent = slice.currentCashFormatted;
      const deficitEl = document.getElementById('sell-cities-deficit');
      if (deficitEl && slice.deficitFormatted !== undefined) deficitEl.textContent = slice.deficitFormatted;
      break;
    }
    case 'auction': {
      toggleElementVisibility('modal-auction', slice.visible);
      break;
    }
    case 'portfolio': {
      toggleElementVisibility('modal-portfolio', slice.visible);
      break;
    }
    case 'rules': {
      toggleElementVisibility('modal-rules', slice.visible);
      break;
    }
    case 'victory': {
      toggleElementVisibility('modal-victory', slice.visible);
      break;
    }
    case 'wardrobe': {
      const el = document.getElementById('modal-wardrobe');
      if (el) {
        if (slice.visible) {
          el.classList.remove('hidden', 'wardrobe-panel-hidden');
          el.classList.add('flex');
        } else {
          el.classList.add('hidden', 'wardrobe-panel-hidden');
          el.classList.remove('flex');
        }
      }
      break;
    }
  }
}
