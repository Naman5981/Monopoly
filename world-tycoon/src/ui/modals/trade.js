/**
 * ui/modals/trade.js
 * Diplomatic trade modal, P2P and AI trade proposals, counter-offers, and incoming trade offers.
 */

import { BOARD_TILES } from '../../game/data.js';
import { gameState, localPlayerIdx, isHumanTurnActionable } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { saveCurrentMatchToStorage, clearSavedMatch } from '../../game/persistence.js';
import { checkVictoryConditions } from '../../game/rules.js';
import { evaluateTradeDeal, recordDeclinedTrade } from '../../game/trading.js';
import { refreshTileTextureAndBuildings } from '../../three/scene.js';
import { logEvent, renderCornerHUDs, refreshActivePlayerTurnStatus, updateRollButtonsUI } from '../hud.js';
import { checkAndTriggerMonopoly, showVictoryModal } from './victory.js';
import { isLobbyScreenActive, closeOtherInformationalModals } from './common.js';
import { animateBotTradeHandshake, animateModalSpringOpen, animateModalSpringClose } from '../anim.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../network/p2p.js';
import { updateModalSlice } from '../../svelte/stores/modalStore.js';

/* ─────────────────────────────────────────────────────────────────────────────
   DIPLOMATIC TRADE MODAL
───────────────────────────────────────────────────────────────────────────── */
let pendingTradeCounter = null;
let activeIncomingTradeProposal = null;

export function openTradeModal() {
  if (isLobbyScreenActive()) return;
  const m = document.getElementById('modal-trade');
  if (m && m.classList.contains('flex') && !m.classList.contains('hidden')) {
    closeTradeModal();
    return;
  }
  closeOtherInformationalModals('modal-trade');
  const myIdx = (networkState && networkState.isMultiplayer) ? networkState.localPlayerIdx : (localPlayerIdx || 0);
  const sel = document.getElementById('trade-partner-select');
  if (sel) {
    sel.innerHTML = '';
    gameState.players.forEach((p, idx) => {
      if (idx !== myIdx && !p.bankrupt) {
        const o = document.createElement('option');
        o.value = idx;
        o.textContent = p.name;
        sel.appendChild(o);
      }
    });
  }

  const myProps = BOARD_TILES.filter(t => gameState.properties[t.id] && gameState.properties[t.id].owner === myIdx);
  updateModalSlice('trade', {
    visible: true,
    statusMessage: '',
    isWaiting: false,
    myWallet: fmtMoney(gameState.players[myIdx]?.cash || 0),
    myProperties: myProps.map(t => ({
      id: t.id,
      name: t.name,
      color: t.colorHex || '#3b82f6',
      rentFormatted: fmtMoney(t.baseRent || 0)
    }))
  });
  const offerPropsEl = document.getElementById('trade-offer-props');
  if (offerPropsEl) {
    offerPropsEl.innerHTML = myProps.map(t => `
      <label class="flex items-center justify-between text-xs font-black bg-white px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-800 cursor-pointer hover:border-slate-300">
        <span class="flex items-center gap-1.5"><input type="checkbox" value="${t.id}" class="trade-my-prop mr-1 w-3.5 h-3.5">${t.name}</span>
        <span class="font-black text-emerald-700">${fmtMoney(t.price)}</span>
      </label>
    `).join('') || '<div class="text-xs font-bold text-slate-500 py-2 text-center">No cities owned</div>';
  }

  populateTradePartnerProps();
  const statusMsg = document.getElementById('trade-status-msg');
  if (statusMsg) {
    statusMsg.classList.add('hidden');
    statusMsg.textContent = '';
  }
  const sendBtn = document.getElementById('btn-send-trade-offer');
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  animateModalSpringOpen('#modal-trade', '#modal-trade .game-modal-shell');
  playSFX('hop');
}

export function populateTradePartnerProps() {
  const selectEl = document.getElementById('trade-partner-select');
  const reqPropsEl = document.getElementById('trade-req-props');
  if (!selectEl) return;
  const pIdx = parseInt(selectEl.value, 10);
  const myIdx = (networkState && networkState.isMultiplayer) ? networkState.localPlayerIdx : (localPlayerIdx || 0);
  const me = gameState.players ? gameState.players[myIdx] : null;
  const partner = gameState.players ? gameState.players[pIdx] : null;

  const myWalletEl = document.getElementById('trade-my-wallet');
  const partnerWalletEl = document.getElementById('trade-partner-wallet');

  if (myWalletEl && me) myWalletEl.textContent = `Wallet: ${fmtMoney(me.cash)}`;
  if (partnerWalletEl && partner) partnerWalletEl.textContent = `Wallet: ${fmtMoney(partner.cash)}`;

  if (isNaN(pIdx)) {
    if (reqPropsEl) reqPropsEl.innerHTML = '<div class="text-xs font-bold text-slate-500 py-2 text-center">No partner selected</div>';
    return;
  }
  const props = BOARD_TILES.filter(t => gameState.properties[t.id] && gameState.properties[t.id].owner === pIdx);

  updateModalSlice('trade', {
    partnerIdx: pIdx,
    partnerWallet: fmtMoney(partner?.cash || 0),
    partnerProperties: props.map(t => ({
      id: t.id,
      name: t.name,
      color: t.colorHex || '#3b82f6',
      rentFormatted: fmtMoney(t.price || 0)
    }))
  });

  if (reqPropsEl) {
    reqPropsEl.innerHTML = props.map(t => `
      <label class="flex items-center justify-between text-xs font-black bg-white px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-800 cursor-pointer hover:border-slate-300">
        <span class="flex items-center gap-1.5"><input type="checkbox" value="${t.id}" class="trade-their-prop mr-1 w-3.5 h-3.5">${t.name}</span>
        <span class="font-black text-emerald-700">${fmtMoney(t.price)}</span>
      </label>
    `).join('') || '<div class="text-xs font-bold text-slate-500 py-2 text-center">No cities owned</div>';
  }
}

export function completeTradeTransfer(giverIdx, receiverIdx, offerCash = 0, reqCash = 0, offerTileIds = [], reqTileIds = []) {
  const giver = gameState.players[giverIdx];
  const receiver = gameState.players[receiverIdx];
  if (!giver || !receiver || giver.bankrupt || receiver.bankrupt) return false;

  const validOfferTiles = (offerTileIds || []).filter(id => gameState.properties[id]?.owner === giverIdx);
  const validReqTiles = (reqTileIds || []).filter(id => gameState.properties[id]?.owner === receiverIdx);

  const hadOffer = offerTileIds && offerTileIds.length > 0;
  const hadReq = reqTileIds && reqTileIds.length > 0;

  if ((hadOffer && validOfferTiles.length === 0) || (hadReq && validReqTiles.length === 0)) {
    logEvent(`⚠️ <strong>Trade Voided:</strong> Cities are no longer held by original owners.`);
    return false;
  }

  if (offerCash || reqCash) {
    giver.cash = giver.cash - offerCash + reqCash;
    receiver.cash = receiver.cash - reqCash + offerCash;
  }

  validOfferTiles.forEach(id => {
    if (gameState.properties[id] && gameState.properties[id].owner === giverIdx) {
      gameState.properties[id].owner = receiverIdx;
      refreshTileTextureAndBuildings(id);
    }
  });

  validReqTiles.forEach(id => {
    if (gameState.properties[id] && gameState.properties[id].owner === receiverIdx) {
      gameState.properties[id].owner = giverIdx;
      refreshTileTextureAndBuildings(id);
    }
  });

  const affectedGroups = new Set();
  [...validOfferTiles, ...validReqTiles].forEach(id => {
    if (BOARD_TILES[id]?.group) affectedGroups.add(BOARD_TILES[id].group);
  });
  affectedGroups.forEach(grp => {
    checkAndTriggerMonopoly(giverIdx, grp);
    checkAndTriggerMonopoly(receiverIdx, grp);
  });

  playSFX('cash');
  renderCornerHUDs();
  saveCurrentMatchToStorage();

  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastFullGameState();
  }

  const vic = checkVictoryConditions();
  if (vic) {
    clearSavedMatch();
    showVictoryModal(vic.winner, vic);
  }
  return true;
}

export function executeTradeOffer() {
  const partnerSelect = document.getElementById('trade-partner-select');
  if (!partnerSelect) return;
  const partnerIdx = parseInt(partnerSelect.value, 10);
  if (isNaN(partnerIdx)) return;
  const myIdx = (networkState && networkState.isMultiplayer) ? networkState.localPlayerIdx : (localPlayerIdx || 0);
  const me = gameState.players[myIdx];
  const partner = gameState.players[partnerIdx];
  if (!me || !partner) return;

  const offerCashInput = document.getElementById('trade-offer-cash');
  const reqCashInput = document.getElementById('trade-req-cash');
  const offerCash = (parseInt(offerCashInput?.value || '0', 10) || 0) * 1000;
  const reqCash = (parseInt(reqCashInput?.value || '0', 10) || 0) * 1000;

  const myIds = Array.from(document.querySelectorAll('.trade-my-prop:checked')).map(e => parseInt(e.value, 10));
  const theirIds = Array.from(document.querySelectorAll('.trade-their-prop:checked')).map(e => parseInt(e.value, 10));

  const msg = document.getElementById('trade-status-msg');
  const banner = document.getElementById('trade-counter-banner');
  if (banner) banner.classList.add('hidden');
  if (msg) msg.classList.remove('hidden');

  if (offerCash < 0 || reqCash < 0) {
    if (msg) {
      msg.className = 'text-center text-xs font-extrabold py-1 text-rose-600';
      msg.textContent = 'Cash amounts cannot be negative.';
    }
    return;
  }

  if (offerCash > me.cash) {
    if (msg) {
      msg.className = 'text-center text-xs font-extrabold py-1 text-rose-600';
      msg.textContent = `You only have ${fmtMoney(me.cash)} available to offer!`;
    }
    return;
  }

  if (reqCash > partner.cash) {
    if (msg) {
      msg.className = 'text-center text-xs font-extrabold py-1 text-rose-600';
      msg.textContent = `${partner.name} only has ${fmtMoney(partner.cash)} cash and cannot afford your ${fmtMoney(reqCash)} request!`;
    }
    return;
  }

  if (myIds.length === 0 && theirIds.length === 0) {
    if (msg) {
      msg.className = 'text-center text-xs font-extrabold py-1 text-rose-600';
      msg.textContent = 'Please select at least one city to trade!';
    }
    return;
  }

  // If partner is a human peer in multiplayer, send the offer over network
  if (networkState.isMultiplayer && !partner.isAI) {
    const proposal = {
      proposerIdx: myIdx,
      targetIdx: partnerIdx,
      offerCash,
      reqCash,
      offerTileIds: myIds,
      reqTileIds: theirIds
    };
    broadcastAction('ACTION_TRADE_OFFER', {
      targetIdx: partnerIdx,
      proposal
    });
    if (msg) {
      msg.className = 'text-center text-xs font-bold py-1 text-sky-600';
      msg.innerHTML = `<i class="fa-solid fa-paper-plane mr-1 text-sky-500"></i> Trade proposal sent to <strong>${partner.name}</strong>! Waiting for their decision...`;
    }
    const sendBtn = document.getElementById('btn-send-trade-offer');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    return;
  }

  // Evaluate through objective trading engine
  const evalResult = evaluateTradeDeal(partnerIdx, myIdx, offerCash, reqCash, myIds, theirIds);

  if (evalResult.status === 'accept') {
    completeTradeTransfer(myIdx, partnerIdx, offerCash, reqCash, myIds, theirIds);
    logEvent(`🤝 <strong>Trade Completed!</strong> ${me.name} and ${partner.name} concluded their deal.`);
    if (networkState.isMultiplayer) {
      broadcastAction('ACTION_TRADE_RESPONSE', {
        accepted: true,
        proposal: { proposerIdx: myIdx, targetIdx: partnerIdx, offerCash, reqCash, offerTileIds: myIds, reqTileIds: theirIds }
      });
      if (networkState.isHost) broadcastFullGameState();
    }
    closeTradeModal();
  } else {
    if (msg) {
      msg.className = 'text-center text-xs font-extrabold py-1 text-rose-600';
      msg.textContent = evalResult.reason || `${partner.name} declined the trade.`;
    }
  }
}

export function handleTradeDeclined(partnerName = 'Partner') {
  const msg = document.getElementById('trade-status-msg');
  if (msg) {
    msg.className = 'text-center text-xs font-extrabold py-1 text-rose-600';
    msg.innerHTML = `<i class="fa-solid fa-xmark mr-1"></i> <strong>${partnerName}</strong> declined the trade offer.`;
    msg.classList.remove('hidden');
  }
  const sendBtn = document.getElementById('btn-send-trade-offer');
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

export function acceptTradeCounterOffer() {
  if (!pendingTradeCounter) return;
  const { giverIdx, receiverIdx, offerCash, reqCash, offerTileIds, reqTileIds } = pendingTradeCounter;
  const giver = gameState.players[giverIdx];
  const receiver = gameState.players[receiverIdx];
  if (giver.cash < offerCash) {
    const msg = document.getElementById('trade-status-msg');
    if (msg) {
      msg.className = 'text-center text-xs font-extrabold py-1 text-rose-600';
      msg.textContent = `Insufficient cash! You need ${fmtMoney(offerCash)}.`;
      msg.classList.remove('hidden');
    }
    return;
  }
  completeTradeTransfer(giverIdx, receiverIdx, offerCash, reqCash, offerTileIds, reqTileIds);
  logEvent(`🤝 <strong>Counter-Offer Accepted!</strong> ${giver.name} agreed to ${receiver.name}'s terms.`);
  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_TRADE_RESPONSE', {
      accepted: true,
      proposal: pendingTradeCounter
    });
    if (networkState.isHost) broadcastFullGameState();
  }
  pendingTradeCounter = null;
  const banner = document.getElementById('trade-counter-banner');
  if (banner) banner.classList.add('hidden');
  closeTradeModal();
}

export function rejectTradeCounterOffer() {
  pendingTradeCounter = null;
  const banner = document.getElementById('trade-counter-banner');
  if (banner) banner.classList.add('hidden');
  const msg = document.getElementById('trade-status-msg');
  if (msg) {
    msg.className = 'text-center text-xs font-bold py-1 text-slate-600';
    msg.textContent = 'Counter-offer declined.';
    msg.classList.remove('hidden');
  }
}

let incomingTradeAutoTimer = null;

function clearIncomingTradeTimer() {
  if (incomingTradeAutoTimer) {
    clearTimeout(incomingTradeAutoTimer);
    incomingTradeAutoTimer = null;
  }
}

function safelyResumeBotTurn() {
  if (typeof window !== 'undefined' && typeof window.resumeBotTurnAfterTrade === 'function') {
    const resume = window.resumeBotTurnAfterTrade;
    window.resumeBotTurnAfterTrade = null;
    resume();
  }
}

export function closeTradeModal() {
  updateModalSlice('trade', { visible: false });
  animateModalSpringClose('#modal-trade');
  const banner = document.getElementById('trade-counter-banner');
  if (banner) banner.classList.add('hidden');
  const statusMsg = document.getElementById('trade-status-msg');
  if (statusMsg) {
    statusMsg.classList.add('hidden');
    statusMsg.textContent = '';
  }
  const sendBtn = document.getElementById('btn-send-trade-offer');
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
  pendingTradeCounter = null;
  safelyResumeBotTurn();
  renderCornerHUDs();
  refreshActivePlayerTurnStatus();
  updateRollButtonsUI(isHumanTurnActionable());
}

export function showIncomingTradeOfferModal(proposal) {
  if (isLobbyScreenActive()) return;
  clearIncomingTradeTimer();
  activeIncomingTradeProposal = proposal;
  const bot = gameState.players[proposal.proposerIdx];
  const target = gameState.players[proposal.targetIdx];
  if (!bot || !target) return;

  const botNameEl = document.getElementById('incoming-trade-bot-name');
  if (botNameEl) botNameEl.textContent = bot.name;

  const offerPropsEl = document.getElementById('incoming-they-offer-props');
  if (offerPropsEl) {
    if (proposal.offerTileIds?.length > 0) {
      offerPropsEl.innerHTML = proposal.offerTileIds.map(id => {
        const t = BOARD_TILES[id];
        return `<div class="flex items-center justify-between text-xs py-1 border-b border-slate-100">
          <span>🏙️ ${t.name}</span>
          <span class="text-emerald-700 font-extrabold">${fmtMoney(t.price)}</span>
        </div>`;
      }).join('');
    } else {
      offerPropsEl.innerHTML = '<span class="text-xs text-slate-400 italic">No properties</span>';
    }
  }

  const reqPropsEl = document.getElementById('incoming-they-req-props');
  if (reqPropsEl) {
    if (proposal.reqTileIds?.length > 0) {
      reqPropsEl.innerHTML = proposal.reqTileIds.map(id => {
        const t = BOARD_TILES[id];
        return `<div class="flex items-center justify-between text-xs py-1 border-b border-slate-100">
          <span>🏙️ ${t.name}</span>
          <span class="text-amber-700 font-extrabold">${fmtMoney(t.price)}</span>
        </div>`;
      }).join('');
    } else {
      reqPropsEl.innerHTML = '<span class="text-xs text-slate-400 italic">No properties</span>';
    }
  }

  const rationaleEl = document.getElementById('incoming-trade-rationale');
  if (rationaleEl) {
    const reqNames = (proposal.reqTileIds || []).map(id => BOARD_TILES[id]?.name || 'City').join(', ');
    const offerNames = (proposal.offerTileIds || []).map(id => BOARD_TILES[id]?.name || 'City').join(', ');
    if (offerNames && reqNames) {
      rationaleEl.innerHTML = `<strong>${bot.name}</strong> proposes exchanging <strong>${offerNames}</strong> for <strong>${reqNames}</strong> in an equitable mutual agreement.`;
    } else {
      rationaleEl.innerHTML = `<strong>${bot.name}</strong> proposes an exchange to acquire <strong>${reqNames}</strong>.`;
    }
  }

  const modal = document.getElementById('modal-incoming-trade');
  if (modal) {
    animateModalSpringOpen(modal, '#modal-incoming-trade .game-modal-shell');
    playSFX('hop');
    animateBotTradeHandshake('#modal-incoming-trade .game-modal-shell');
  }

  // Auto-decline fallback after 16 seconds if user is away from keyboard
  incomingTradeAutoTimer = setTimeout(() => {
    declineIncomingTrade();
  }, 16000);
}

export function closeIncomingTradeModal(isDeclined = false) {
  clearIncomingTradeTimer();
  if (isDeclined && activeIncomingTradeProposal && activeIncomingTradeProposal.reqTileIds) {
    recordDeclinedTrade(activeIncomingTradeProposal.reqTileIds);
  }
  animateModalSpringClose('#modal-incoming-trade', '#modal-incoming-trade .game-modal-shell');
  activeIncomingTradeProposal = null;
  safelyResumeBotTurn();
}

export function acceptIncomingTrade() {
  clearIncomingTradeTimer();
  if (!activeIncomingTradeProposal) return;
  const p = activeIncomingTradeProposal;
  completeTradeTransfer(p.proposerIdx, p.targetIdx, p.offerCash || 0, p.reqCash || 0, p.offerTileIds, p.reqTileIds);
  const proposer = gameState.players[p.proposerIdx];
  const target = gameState.players[p.targetIdx];
  logEvent(`🤝 <strong>Trade Deal Struck!</strong> ${target ? target.name : 'Player'} accepted ${proposer ? proposer.name : 'Player'}'s proposal.`);
  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_TRADE_RESPONSE', {
      accepted: true,
      proposal: p
    });
    if (networkState.isHost) {
      broadcastFullGameState();
    }
  }
  activeIncomingTradeProposal = null;
  closeTradeModal();
  animateModalSpringClose('#modal-incoming-trade', '#modal-incoming-trade .game-modal-shell');
  safelyResumeBotTurn();
}

export function counterIncomingTrade() {
  clearIncomingTradeTimer();
  if (!activeIncomingTradeProposal) return;
  const p = activeIncomingTradeProposal;
  activeIncomingTradeProposal = null;
  animateModalSpringClose('#modal-incoming-trade', '#modal-incoming-trade .game-modal-shell');
  openTradeModal();
  const sel = document.getElementById('trade-partner-select');
  if (sel) {
    sel.value = p.proposerIdx;
    populateTradePartnerProps();
  }
}

export function getActiveIncomingTradeProposal() {
  return activeIncomingTradeProposal;
}

export function declineIncomingTrade() {
  clearIncomingTradeTimer();
  if (!activeIncomingTradeProposal) return;
  const p = activeIncomingTradeProposal;
  if (p.reqTileIds) {
    recordDeclinedTrade(p.reqTileIds);
  }
  const proposer = gameState.players[p.proposerIdx];
  logEvent(`❌ Trade offer from <strong>${proposer?.name || 'Player'}</strong> declined.`);
  if (networkState.isMultiplayer) {
    broadcastAction('ACTION_TRADE_RESPONSE', {
      accepted: false,
      proposal: p
    });
  }
  activeIncomingTradeProposal = null;
  animateModalSpringClose('#modal-incoming-trade', '#modal-incoming-trade .game-modal-shell');
  safelyResumeBotTurn();
}

if (typeof window !== 'undefined') {
  window.openTradeModal = openTradeModal;
  window.closeTradeModal = closeTradeModal;
  window.executeTradeOffer = executeTradeOffer;
  window.acceptIncomingTrade = acceptIncomingTrade;
  window.declineIncomingTrade = declineIncomingTrade;
  window.counterIncomingTrade = counterIncomingTrade;
  window.closeIncomingTradeModal = closeIncomingTradeModal;
  window.getActiveIncomingTradeProposal = getActiveIncomingTradeProposal;
}
