/**
 * game/engine/auction.js
 * Sold property auction sequence, realistic 3-option dynamic bid calculation,
 * 5-second countdown timer, and AI bidding heuristics.
 * Refactored to core game engine service adhering to Clean Code and Svelte architecture.
 */

import { GROUP_META, BOARD_TILES } from '../data.js';
import { gameState, localPlayerIdx } from '../state.js';
import { fmtMoney } from '../utils.js';
import { playSFX } from '../audio.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../network/p2p.js';
import { refreshTileTextureAndBuildings } from '../../three/scene.js';
import { renderCornerHUDs, logEvent } from '../../ui/hud.js';
import { checkAndTriggerMonopoly } from '../../ui/modals/victory.js';
import { engineCallbacks } from '../../ui/modals/common.js';
import { updateModalSlice } from '../../svelte/stores/modalStore.js';

let auctionTimerInterval = null;
let botBidTimeouts = [];

/**
 * Calculates realistic, scaled 3-option bidding increments based on city price tiers.
 * - Tier 1 (<= $200K): +$10K, +$25K, +$50K
 * - Tier 2 ($240K - $330K): +$20K, +$50K, +$100K
 * - Tier 3 ($350K - $410K): +$30K, +$75K, +$150K
 * - Tier 4 (>= $450K): +$50K, +$100K, +$200K
 * @param {number} price
 * @returns {[number, number, number]}
 */
export function calculateAuctionBidIncrements(price) {
  const p = Number(price) || 120000;
  if (p <= 200000) {
    return [10000, 25000, 50000];
  }
  if (p <= 330000) {
    return [20000, 50000, 100000];
  }
  if (p <= 410000) {
    return [30000, 75000, 150000];
  }
  return [50000, 100000, 200000];
}

/**
 * Calculates opening reserve bid (50% of base price rounded to clean 10K step).
 * @param {number} price
 * @returns {number}
 */
export function calculateAuctionReservePrice(price) {
  const p = Number(price) || 120000;
  return Math.max(10000, Math.floor((p * 0.5) / 10000) * 10000);
}

/**
 * Clears any active 5-second countdown and pending bot evaluation timers.
 */
export function clearAuctionTimers() {
  if (auctionTimerInterval) {
    clearInterval(auctionTimerInterval);
    auctionTimerInterval = null;
  }
  botBidTimeouts.forEach(t => clearTimeout(t));
  botBidTimeouts = [];
}

/**
 * Starts the sequential auction queue for all properties sold to cover rent.
 * @param {Array<Object>} soldTiles - Array of tile definitions sold
 * @param {number} sellerIdx - Player index who had to sell
 * @param {boolean} isDoubles - Whether turn had doubles roll
 */
export function startSoldPropertiesAuctionSequence(soldTiles, sellerIdx, isDoubles = false) {
  if (!soldTiles || soldTiles.length === 0) return;

  clearAuctionTimers();

  gameState.pendingAuctions = [...soldTiles];
  gameState.auctionQueueMeta = {
    sellerIdx,
    isDoubles,
    totalCount: soldTiles.length
  };

  logEvent(`📢 <strong>${soldTiles.length}</strong> property liquidation${soldTiles.length > 1 ? 's' : ''} queued for public auction!`);
  startNextAuctionFromQueue();
}

/**
 * Pops and opens the next property auction from the queue, or concludes turn if done.
 */
export function startNextAuctionFromQueue() {
  clearAuctionTimers();

  if (!gameState.pendingAuctions || gameState.pendingAuctions.length === 0) {
    // Auction queue complete! Close auction modal and conclude turn
    updateModalSlice('auction', { visible: false });
    const meta = gameState.auctionQueueMeta;
    gameState.auction = null;
    gameState.auctionQueueMeta = null;

    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastAction('ACTION_AUCTION_CONCLUDE', {
        queueFinished: true
      });
      broadcastFullGameState();
    }

    if (engineCallbacks.concludeActionPhase && meta) {
      engineCallbacks.concludeActionPhase(meta.isDoubles);
    }
    return;
  }

  const tile = gameState.pendingAuctions.shift();
  const meta = gameState.auctionQueueMeta || { sellerIdx: -1, isDoubles: false, totalCount: 1 };

  const reservePrice = calculateAuctionReservePrice(tile.price);
  const increments = calculateAuctionBidIncrements(tile.price);

  gameState.auction = {
    active: true,
    tile,
    sellerIdx: meta.sellerIdx,
    currentBid: reservePrice,
    hasBids: false,
    highBidderIdx: null,
    isDoubles: meta.isDoubles,
    increments,
    secondsLeft: 5.0,
    passedPlayerIndices: new Set()
  };

  syncAuctionModalUI();

  playSFX('hop');
  startAuctionCountdownTimer();

  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastAction('ACTION_AUCTION_START', {
      tileId: tile.id,
      sellerIdx: meta.sellerIdx,
      currentBid: reservePrice,
      increments,
      secondsLeft: 5.0,
      totalCount: meta.totalCount,
      queueRemaining: gameState.pendingAuctions.length,
      isDoubles: meta.isDoubles
    });
  }

  scheduleBotAuctionBids();
}

/**
 * Synchronizes auction state into reactive Svelte modalStore slice.
 */
export function syncAuctionModalUI() {
  const a = gameState.auction;
  if (!a || !a.tile) {
    updateModalSlice('auction', { visible: false });
    return;
  }

  const tile = a.tile;
  const seller = gameState.players ? gameState.players[a.sellerIdx] : null;
  const highBidder = (a.highBidderIdx !== null && gameState.players) ? gameState.players[a.highBidderIdx] : null;

  const myIdx = networkState.isMultiplayer ? networkState.localPlayerIdx : (typeof localPlayerIdx === 'number' ? localPlayerIdx : 0);
  const myPlayer = gameState.players ? gameState.players[myIdx] : null;
  const isSeller = myIdx === a.sellerIdx;
  const isLeading = highBidder && (myIdx === a.highBidderIdx);

  const opt1 = a.currentBid + a.increments[0];
  const opt2 = a.currentBid + a.increments[1];
  const opt3 = a.currentBid + a.increments[2];

  const canAffordOpt1 = Boolean(myPlayer && myPlayer.cash >= opt1 && !myPlayer.bankrupt && !isSeller && !isLeading);
  const canAffordOpt2 = Boolean(myPlayer && myPlayer.cash >= opt2 && !myPlayer.bankrupt && !isSeller && !isLeading);
  const canAffordOpt3 = Boolean(myPlayer && myPlayer.cash >= opt3 && !myPlayer.bankrupt && !isSeller && !isLeading);

  const meta = gameState.auctionQueueMeta;
  const queueRemaining = gameState.pendingAuctions ? gameState.pendingAuctions.length : 0;
  const queueProgressText = meta ? `Auction ${meta.totalCount - queueRemaining} of ${meta.totalCount}` : 'CITY AUCTION';

  const groupInfo = tile.group && GROUP_META[tile.group] ? GROUP_META[tile.group] : { hex: '#0284c7', name: 'ESTATE' };

  updateModalSlice('auction', {
    visible: true,
    tile,
    cityName: tile.name,
    groupColor: groupInfo.hex,
    groupName: groupInfo.name,
    baseValFormatted: fmtMoney(tile.price || 0),
    currentBid: a.currentBid,
    currentBidFormatted: fmtMoney(a.currentBid),
    hasBids: a.hasBids,
    highBidderName: a.hasBids && highBidder ? highBidder.name : 'No bids yet (Reserve)',
    highBidderColor: highBidder?.colorHex || '#94a3b8',
    highBidderBadge: highBidder ? (isLeading ? 'YOU' : highBidder.name) : 'RESERVE',
    isLeading,
    isSeller,
    sellerName: seller ? seller.name : 'Bank',
    secondsLeft: Math.max(0, a.secondsLeft),
    timerPercent: Math.max(0, Math.min(100, (a.secondsLeft / 5.0) * 100)),
    increments: a.increments,
    incrementsFormatted: [
      `+${fmtMoney(a.increments[0])}`,
      `+${fmtMoney(a.increments[1])}`,
      `+${fmtMoney(a.increments[2])}`
    ],
    bidOptions: [opt1, opt2, opt3],
    bidOptionsFormatted: [
      fmtMoney(opt1),
      fmtMoney(opt2),
      fmtMoney(opt3)
    ],
    optionsAffordable: [canAffordOpt1, canAffordOpt2, canAffordOpt3],
    canBid: !isSeller && !isLeading && (canAffordOpt1 || canAffordOpt2 || canAffordOpt3),
    queueProgress: queueProgressText
  });
}

/**
 * Runs the 5-second countdown timer.
 */
export function startAuctionCountdownTimer() {
  clearAuctionTimers();

  const TICK_MS = 100;
  auctionTimerInterval = setInterval(() => {
    if (!gameState.auction || !gameState.auction.active) {
      clearAuctionTimers();
      return;
    }

    gameState.auction.secondsLeft -= (TICK_MS / 1000);

    if (gameState.auction.secondsLeft <= 0) {
      gameState.auction.secondsLeft = 0;
      clearAuctionTimers();
      syncAuctionModalUI();
      // In multiplayer, ONLY Host concludes the auction authoritatively
      if (!networkState.isMultiplayer || networkState.isHost) {
        concludeCurrentAuction();
      }
      return;
    }

    syncAuctionModalUI();
  }, TICK_MS);
}

/**
 * Resets the 5-second countdown on a new bid increase.
 */
export function resetAuctionTimer() {
  if (gameState.auction) {
    gameState.auction.secondsLeft = 5.0;
  }
  startAuctionCountdownTimer();
  if (!networkState.isMultiplayer || networkState.isHost) {
    scheduleBotAuctionBids();
  }
}

/**
 * Places a bid on the active auction.
 * @param {number} bidAmount
 * @param {number} [playerIdx]
 */
export function placeAuctionBid(bidAmount, playerIdx = null) {
  const a = gameState.auction;
  if (!a || !a.active) return false;

  const bidderIdx = playerIdx !== null && playerIdx !== undefined
    ? playerIdx
    : (networkState.isMultiplayer ? networkState.localPlayerIdx : (typeof localPlayerIdx === 'number' ? localPlayerIdx : 0));

  const bidder = gameState.players ? gameState.players[bidderIdx] : null;
  if (!bidder || bidder.bankrupt) return false;
  if (bidderIdx === a.sellerIdx) {
    logEvent(`⚠️ <strong>${bidder.name}</strong> cannot bid on their own liquidated property.`);
    return false;
  }
  if (bidAmount <= a.currentBid) return false;
  if (bidder.cash < bidAmount) return false;

  // In multiplayer, if guest peer, forward bid to Host for authoritative validation
  if (networkState.isMultiplayer && !networkState.isHost) {
    broadcastAction('ACTION_AUCTION_BID', {
      tileId: a.tile.id,
      bidAmount,
      bidderIdx
    });
    return true;
  }

  a.currentBid = bidAmount;
  a.highBidderIdx = bidderIdx;
  a.hasBids = true;
  a.passedPlayerIndices.delete(bidderIdx);

  playSFX('cash');
  logEvent(`🔨 <strong>${bidder.name}</strong> raised bid to <strong>${fmtMoney(bidAmount)}</strong> on <strong>${a.tile.name}</strong>! Timer reset to 5s.`);

  resetAuctionTimer();
  syncAuctionModalUI();

  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastAction('ACTION_AUCTION_BID', {
      tileId: a.tile.id,
      bidAmount,
      bidderIdx,
      secondsLeft: 5.0
    });
    broadcastFullGameState();
  }

  return true;
}

/**
 * Pass on the current auction.
 * @param {number} [playerIdx]
 */
export function passAuctionBid(playerIdx = null) {
  const a = gameState.auction;
  if (!a || !a.active) return;

  const pIdx = playerIdx !== null && playerIdx !== undefined
    ? playerIdx
    : (networkState.isMultiplayer ? networkState.localPlayerIdx : (typeof localPlayerIdx === 'number' ? localPlayerIdx : 0));

  if (networkState.isMultiplayer && !networkState.isHost) {
    broadcastAction('ACTION_AUCTION_PASS', {
      tileId: a.tile.id,
      playerIdx: pIdx
    });
    a.passedPlayerIndices.add(pIdx);
    syncAuctionModalUI();
    return;
  }

  a.passedPlayerIndices.add(pIdx);
  syncAuctionModalUI();

  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastAction('ACTION_AUCTION_PASS', {
      tileId: a.tile.id,
      playerIdx: pIdx
    });
  }

  const activePlayers = (gameState.players || []).filter(p => !p.bankrupt && p.id !== a.sellerIdx);
  const allPassed = activePlayers.every(p => a.passedPlayerIndices.has(p.id !== undefined ? p.id : gameState.players.indexOf(p)));

  if (allPassed) {
    clearAuctionTimers();
    concludeCurrentAuction();
  }
}

/**
 * Evaluates whether an AI bot should bid and which of the 3 increment buttons to select.
 * @param {Object} bot
 * @param {number} botIdx
 * @returns {number|null} The chosen new bid amount, or null if passing
 */
export function evaluateBotAuctionBid(bot, botIdx) {
  const a = gameState.auction;
  if (!a || !a.active || !a.tile) return null;
  if (bot.bankrupt || botIdx === a.sellerIdx) return null;
  if (botIdx === a.highBidderIdx) return null; // Already highest bidder

  const tile = a.tile;
  const basePrice = tile.price || 120000;

  // Valuation heuristics
  let valuationMultiplier = 1.0;

  // Check monopoly synergy
  const group = tile.group;
  if (group) {
    const groupTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === group);
    const ownedInGroup = groupTiles.filter(t => gameState.properties[t.id]?.owner === botIdx).length;
    if (ownedInGroup === groupTiles.length - 1) {
      // Completes a monopoly! High strategic value!
      valuationMultiplier = 1.55;
    } else if (ownedInGroup > 0) {
      valuationMultiplier = 1.25;
    }
  }

  const maxWillingPrice = Math.round(basePrice * valuationMultiplier);
  const reserveCashFloor = 250000; // Keep cash reserve for safety
  const maxAffordable = Math.max(0, bot.cash - reserveCashFloor);
  const maxCeiling = Math.min(maxWillingPrice, maxAffordable);

  const options = [
    a.currentBid + a.increments[0],
    a.currentBid + a.increments[1],
    a.currentBid + a.increments[2]
  ];

  const validOptions = options.filter(opt => opt <= maxCeiling && opt <= bot.cash);
  if (validOptions.length === 0) return null;

  // If monopoly completion, bot picks aggressive Option 2 or 3
  if (valuationMultiplier >= 1.5 && validOptions.length >= 2) {
    return validOptions[validOptions.length - 1];
  }

  // Otherwise pick smallest or medium raise
  return validOptions[0];
}

/**
 * Schedules AI bot bids with realistic human-like decision jitter (1.2s - 3.2s).
 */
function scheduleBotAuctionBids() {
  botBidTimeouts.forEach(t => clearTimeout(t));
  botBidTimeouts = [];

  const a = gameState.auction;
  if (!a || !a.active) return;

  if (networkState.isMultiplayer && !networkState.isHost) {
    return; // Only host executes AI decisions in multiplayer
  }

  const players = gameState.players || [];
  players.forEach((p, idx) => {
    if (!p.isAI || p.bankrupt || idx === a.sellerIdx || idx === a.highBidderIdx) return;

    // Random jitter between 1.2s and 3.2s
    const jitterMs = 1200 + Math.random() * 2000;

    const timeout = setTimeout(() => {
      if (!gameState.auction || !gameState.auction.active) return;
      const chosenBid = evaluateBotAuctionBid(p, idx);
      if (chosenBid !== null && chosenBid > gameState.auction.currentBid) {
        placeAuctionBid(chosenBid, idx);
      }
    }, jitterMs);

    botBidTimeouts.push(timeout);
  });
}

/**
 * Concludes the active auction round and awards the property to highest bidder.
 */
export function concludeCurrentAuction() {
  clearAuctionTimers();

  const a = gameState.auction;
  if (!a || !a.active || !a.tile) return;

  // In multiplayer, ONLY Host concludes the auction authoritatively
  if (networkState.isMultiplayer && !networkState.isHost) return;

  a.active = false;
  const tile = a.tile;
  const propState = gameState.properties[tile.id];

  if (a.hasBids && a.highBidderIdx !== null) {
    const winner = gameState.players[a.highBidderIdx];
    if (winner && propState) {
      propState.owner = a.highBidderIdx;
      propState.level = 0;
      propState.mortgaged = false;
      winner.cash -= a.currentBid;

      playSFX('win');
      logEvent(`🏆 <strong>${winner.name}</strong> won the auction for <strong>${tile.name}</strong> at <strong>${fmtMoney(a.currentBid)}</strong>!`);

      if (engineCallbacks.spawnFloatingCash) {
        engineCallbacks.spawnFloatingCash(a.highBidderIdx, `-${fmtMoney(a.currentBid)}`, false);
      }

      refreshTileTextureAndBuildings(tile.id);
      renderCornerHUDs();
      checkAndTriggerMonopoly(a.highBidderIdx, tile.group);
    }
  } else {
    // No bids placed: remains unowned bank property
    if (propState) {
      propState.owner = null;
      propState.level = 0;
      propState.mortgaged = false;
      refreshTileTextureAndBuildings(tile.id);
    }
    logEvent(`🔨 No bids were placed for <strong>${tile.name}</strong>. It returns to the Bank.`);
  }

  syncAuctionModalUI();

  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastAction('ACTION_AUCTION_CONCLUDE', {
      tileId: tile.id,
      winnerIdx: a.highBidderIdx,
      winningBid: a.hasBids ? a.currentBid : 0,
      hasBids: a.hasBids
    });
    broadcastFullGameState();
  }

  // Display winning banner briefly (1.1s) before launching next auction in queue
  setTimeout(() => {
    startNextAuctionFromQueue();
  }, 1100);
}

/**
 * Handles incoming ACTION_AUCTION_START on non-host peers.
 * @param {Object} msg
 */
export function applyAuctionStartFromHost(msg) {
  if (!msg || msg.tileId === undefined) return;
  const tile = BOARD_TILES[msg.tileId];
  if (!tile) return;

  clearAuctionTimers();

  const reservePrice = typeof msg.currentBid === 'number' ? msg.currentBid : calculateAuctionReservePrice(tile.price);
  const increments = msg.increments || calculateAuctionBidIncrements(tile.price);

  gameState.auctionQueueMeta = {
    sellerIdx: msg.sellerIdx !== undefined ? msg.sellerIdx : -1,
    isDoubles: Boolean(msg.isDoubles),
    totalCount: msg.totalCount || 1
  };
  gameState.pendingAuctions = new Array(msg.queueRemaining || 0);

  gameState.auction = {
    active: true,
    tile,
    sellerIdx: msg.sellerIdx !== undefined ? msg.sellerIdx : null,
    currentBid: reservePrice,
    hasBids: false,
    highBidderIdx: null,
    isDoubles: Boolean(msg.isDoubles),
    increments,
    secondsLeft: typeof msg.secondsLeft === 'number' ? msg.secondsLeft : 5.0,
    passedPlayerIndices: new Set()
  };

  syncAuctionModalUI();
  playSFX('hop');
  startAuctionCountdownTimer();
}

/**
 * Handles incoming ACTION_AUCTION_BID on non-host peers.
 * @param {Object} msg
 */
export function applyAuctionBidFromHost(msg) {
  const a = gameState.auction;
  if (!a || !a.active) return;
  if (typeof msg.bidAmount !== 'number') return;

  a.currentBid = msg.bidAmount;
  a.highBidderIdx = typeof msg.bidderIdx === 'number' ? msg.bidderIdx : a.highBidderIdx;
  a.hasBids = true;
  if (typeof msg.bidderIdx === 'number') {
    a.passedPlayerIndices.delete(msg.bidderIdx);
  }

  const bidder = gameState.players ? gameState.players[a.highBidderIdx] : null;
  if (bidder) {
    logEvent(`🔨 <strong>${bidder.name}</strong> raised bid to <strong>${fmtMoney(msg.bidAmount)}</strong> on <strong>${a.tile.name}</strong>! Timer reset to 5s.`);
  }

  playSFX('cash');
  resetAuctionTimer();
  syncAuctionModalUI();
}

/**
 * Handles incoming ACTION_AUCTION_CONCLUDE on non-host peers.
 * @param {Object} msg
 */
export function applyAuctionConcludeFromHost(msg) {
  clearAuctionTimers();

  if (msg.queueFinished) {
    updateModalSlice('auction', { visible: false });
    gameState.auction = null;
    gameState.auctionQueueMeta = null;
    return;
  }

  const a = gameState.auction;
  const tileId = msg.tileId !== undefined ? msg.tileId : (a && a.tile ? a.tile.id : null);
  const tile = tileId !== null ? BOARD_TILES[tileId] : (a ? a.tile : null);
  const propState = tile ? gameState.properties[tile.id] : null;

  if (a) {
    a.active = false;
    a.hasBids = Boolean(msg.hasBids);
    a.highBidderIdx = msg.winnerIdx !== undefined ? msg.winnerIdx : null;
    a.currentBid = typeof msg.winningBid === 'number' ? msg.winningBid : a.currentBid;
  }

  if (msg.hasBids && typeof msg.winnerIdx === 'number' && msg.winnerIdx !== null) {
    const winner = gameState.players ? gameState.players[msg.winnerIdx] : null;
    if (winner && propState) {
      propState.owner = msg.winnerIdx;
      propState.level = 0;
      propState.mortgaged = false;
      winner.cash -= (msg.winningBid || 0);

      playSFX('win');
      logEvent(`🏆 <strong>${winner.name}</strong> won the auction for <strong>${tile ? tile.name : 'Property'}</strong> at <strong>${fmtMoney(msg.winningBid || 0)}</strong>!`);

      if (engineCallbacks.spawnFloatingCash) {
        engineCallbacks.spawnFloatingCash(msg.winnerIdx, `-${fmtMoney(msg.winningBid || 0)}`, false);
      }

      refreshTileTextureAndBuildings(tile.id);
      renderCornerHUDs();
      checkAndTriggerMonopoly(msg.winnerIdx, tile.group);
    }
  } else {
    if (propState) {
      propState.owner = null;
      propState.level = 0;
      propState.mortgaged = false;
      if (tile) refreshTileTextureAndBuildings(tile.id);
    }
    logEvent(`🔨 No bids were placed for <strong>${tile ? tile.name : 'Property'}</strong>. It returns to the Bank.`);
  }

  syncAuctionModalUI();
}

// Window self-registration for inline event handlers and global accessibility
if (typeof window !== 'undefined') {
  window.placeAuctionBid = placeAuctionBid;
  window.passAuctionBid = passAuctionBid;
  window.startSoldPropertiesAuctionSequence = startSoldPropertiesAuctionSequence;
}
