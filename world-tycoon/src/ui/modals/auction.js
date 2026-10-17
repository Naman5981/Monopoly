/**
 * ui/modals/auction.js
 * Live property auction bidding modal, bot bid automation, and auction resolution.
 */

import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { clearCityPreview, refreshTileTextureAndBuildings } from '../../three/scene.js';
import { fireConfettiBurst } from '../../three/effects.js';
import { renderCornerHUDs, logEvent } from '../hud.js';
import { checkAndTriggerMonopoly } from './victory.js';
import { engineCallbacks, isLobbyScreenActive } from './common.js';
import { animateAuctionGavelRipple } from '../anim.js';

export function startCityAuction() {
  if (isLobbyScreenActive()) return;
  clearCityPreview();
  const buyModal = document.getElementById('modal-buy-city');
  if (buyModal) {
    buyModal.classList.add('hidden');
    buyModal.classList.remove('flex');
  }

  const tile = gameState.pendingBuyTile;
  const activeBidders = gameState.players.map((p, idx) => (!p.bankrupt ? idx : -1)).filter(i => i !== -1);

  gameState.auction = {
    tile,
    highBid: Math.max(50000, Math.round((tile.price * 0.4) / 25000) * 25000),
    highBidder: 0,
    activeBidders,
    turnPos: 0
  };

  updateAuctionModalUI();
  const m = document.getElementById('modal-auction');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
  }
  checkAIAuctionTurn();
}

export function updateAuctionModalUI() {
  const a = gameState.auction;
  if (!a) return;
  const cityNameEl = document.getElementById('auction-city-name');
  if (cityNameEl) cityNameEl.textContent = `Bidding on ${a.tile.name}`;
  const baseValEl = document.getElementById('auction-base-val');
  if (baseValEl) baseValEl.textContent = `Value: ${fmtMoney(a.tile.price)}`;
  const highBidEl = document.getElementById('auction-high-bid');
  if (highBidEl) highBidEl.textContent = fmtMoney(a.highBid);
  const highBidderEl = document.getElementById('auction-high-bidder');
  if (highBidderEl) highBidderEl.textContent = `Leading: ${gameState.players[a.highBidder]?.name}`;
  const curBidderIdx = a.activeBidders[a.turnPos % a.activeBidders.length];
  const turnPlayerEl = document.getElementById('auction-turn-player');
  if (turnPlayerEl) turnPlayerEl.textContent = gameState.players[curBidderIdx]?.name || 'Unknown';
}

export function placeAuctionBid(increment) {
  const a = gameState.auction;
  if (!a) return;
  const curBidderIdx = a.activeBidders[a.turnPos % a.activeBidders.length];
  const bidder = gameState.players[curBidderIdx];
  if (bidder.cash < a.highBid + increment) {
    passAuctionBid();
    return;
  }
  a.highBid += increment;
  a.highBidder = curBidderIdx;
  a.turnPos = (a.turnPos + 1) % a.activeBidders.length;
  playSFX('hop');
  updateAuctionModalUI();
  animateAuctionGavelRipple();
  checkAIAuctionTurn();
}

export function passAuctionBid() {
  const a = gameState.auction;
  if (!a) return;
  const curPos = a.turnPos % a.activeBidders.length;
  a.activeBidders.splice(curPos, 1);

  if (a.activeBidders.length <= 1) {
    const winnerIdx = a.activeBidders[0] !== undefined ? a.activeBidders[0] : a.highBidder;
    const winner = gameState.players[winnerIdx];
    winner.cash -= a.highBid;
    gameState.properties[a.tile.id].owner = winnerIdx;
    playSFX('gavel');
    fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 50);
    if (engineCallbacks.spawnFloatingCash) {
      engineCallbacks.spawnFloatingCash(winnerIdx, `-${fmtMoney(a.highBid)}`, false);
    }
    logEvent(`🔨 <strong>${winner.name}</strong> won the auction for <strong>${a.tile.name}</strong> at <strong>${fmtMoney(a.highBid)}</strong>!`);

    const auctionModal = document.getElementById('modal-auction');
    if (auctionModal) {
      auctionModal.classList.add('hidden');
      auctionModal.classList.remove('flex');
    }
    refreshTileTextureAndBuildings(a.tile.id);
    renderCornerHUDs();
    if (a.tile.group) {
      checkAndTriggerMonopoly(winnerIdx, a.tile.group);
    }
    gameState.auction = null;
    if (engineCallbacks.concludeActionPhase) {
      engineCallbacks.concludeActionPhase(gameState.pendingDoubles);
    }
    return;
  }

  a.turnPos = a.turnPos % a.activeBidders.length;
  updateAuctionModalUI();
  checkAIAuctionTurn();
}

function checkAIAuctionTurn() {
  const a = gameState.auction;
  if (!a) return;
  const curBidderIdx = a.activeBidders[a.turnPos % a.activeBidders.length];
  const p = gameState.players[curBidderIdx];
  if (p && p.isAI) {
    setTimeout(() => {
      if (!gameState.auction) return;
      if (a.highBid + 25000 <= a.tile.price * 0.9 && p.cash >= a.highBid + 150000) {
        placeAuctionBid(25000);
      } else {
        passAuctionBid();
      }
    }, 550);
  }
}
