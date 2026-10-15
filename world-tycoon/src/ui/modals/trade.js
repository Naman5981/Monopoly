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
import { evaluateTradeDeal } from '../../game/trading.js';
import { refreshTileTextureAndBuildings } from '../../three/scene.js';
import { logEvent, renderCornerHUDs, showTurnLockToast } from '../hud.js';
import { checkAndTriggerMonopoly, showVictoryModal } from './victory.js';
import { isLobbyScreenActive } from './common.js';

/* ─────────────────────────────────────────────────────────────────────────────
   DIPLOMATIC TRADE MODAL
───────────────────────────────────────────────────────────────────────────── */
let pendingTradeCounter = null;
let activeIncomingTradeProposal = null;

export function openTradeModal() {
  if (isLobbyScreenActive()) return;
  if (!isHumanTurnActionable()) {
    showTurnLockToast("Wait for your turn to propose a trade!");
    return;
  }
  const myIdx = localPlayerIdx || 0;
  const sel = document.getElementById('trade-partner-select');
  sel.innerHTML = '';
  gameState.players.forEach((p, idx) => {
    if (idx !== myIdx && !p.bankrupt) {
      const o = document.createElement('option');
      o.value = idx;
      o.textContent = p.name;
      sel.appendChild(o);
    }
  });

  const myProps = BOARD_TILES.filter(t => gameState.properties[t.id] && gameState.properties[t.id].owner === myIdx);
  document.getElementById('trade-offer-props').innerHTML = myProps.map(t => `
    <label class="flex items-center justify-between text-xs font-black bg-white px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-800 cursor-pointer hover:border-slate-300">
      <span class="flex items-center gap-1.5"><input type="checkbox" value="${t.id}" class="trade-my-prop mr-1 w-3.5 h-3.5">${t.name}</span>
      <span class="font-black text-emerald-700">${fmtMoney(t.price)}</span>
    </label>
  `).join('') || '<div class="text-xs font-bold text-slate-500 py-2 text-center">No cities owned</div>';

  populateTradePartnerProps();
  document.getElementById('trade-status-msg').classList.add('hidden');
  const m = document.getElementById('modal-trade');
  m.classList.remove('hidden');
  m.classList.add('flex');
}

export function populateTradePartnerProps() {
  const pIdx = parseInt(document.getElementById('trade-partner-select').value, 10);
  if (isNaN(pIdx)) return;
  const props = BOARD_TILES.filter(t => gameState.properties[t.id] && gameState.properties[t.id].owner === pIdx);
  document.getElementById('trade-req-props').innerHTML = props.map(t => `
    <label class="flex items-center justify-between text-xs font-black bg-white px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-800 cursor-pointer hover:border-slate-300">
      <span class="flex items-center gap-1.5"><input type="checkbox" value="${t.id}" class="trade-their-prop mr-1 w-3.5 h-3.5">${t.name}</span>
      <span class="font-black text-emerald-700">${fmtMoney(t.price)}</span>
    </label>
  `).join('') || '<div class="text-xs font-bold text-slate-500 py-2 text-center">No cities owned</div>';
}

export function completeTradeTransfer(giverIdx, receiverIdx, offerCash, reqCash, offerTileIds, reqTileIds) {
  const giver = gameState.players[giverIdx];
  const receiver = gameState.players[receiverIdx];
  if (!giver || !receiver) return;

  giver.cash = giver.cash - offerCash + reqCash;
  receiver.cash = receiver.cash - reqCash + offerCash;

  offerTileIds.forEach(id => {
    if (gameState.properties[id]) {
      gameState.properties[id].owner = receiverIdx;
      refreshTileTextureAndBuildings(id);
    }
  });

  reqTileIds.forEach(id => {
    if (gameState.properties[id]) {
      gameState.properties[id].owner = giverIdx;
      refreshTileTextureAndBuildings(id);
    }
  });

  const affectedGroups = new Set();
  [...offerTileIds, ...reqTileIds].forEach(id => {
    if (BOARD_TILES[id]?.group) affectedGroups.add(BOARD_TILES[id].group);
  });
  affectedGroups.forEach(grp => {
    checkAndTriggerMonopoly(giverIdx, grp);
    checkAndTriggerMonopoly(receiverIdx, grp);
  });

  playSFX('cash');
  renderCornerHUDs();
  saveCurrentMatchToStorage();

  const vic = checkVictoryConditions();
  if (vic) {
    clearSavedMatch();
    showVictoryModal(vic.winner, vic);
  }
}

export function executeTradeOffer() {
  const partnerIdx = parseInt(document.getElementById('trade-partner-select').value, 10);
  if (isNaN(partnerIdx)) return;
  const myIdx = localPlayerIdx || 0;
  const me = gameState.players[myIdx];
  const partner = gameState.players[partnerIdx];

  const offerCash = (parseInt(document.getElementById('trade-offer-cash').value || '0', 10)) * 1000;
  const reqCash = (parseInt(document.getElementById('trade-req-cash').value || '0', 10)) * 1000;
  const myIds = Array.from(document.querySelectorAll('.trade-my-prop:checked')).map(e => parseInt(e.value, 10));
  const theirIds = Array.from(document.querySelectorAll('.trade-their-prop:checked')).map(e => parseInt(e.value, 10));

  const msg = document.getElementById('trade-status-msg');
  const banner = document.getElementById('trade-counter-banner');
  if (banner) banner.classList.add('hidden');
  msg.classList.remove('hidden');

  if (offerCash > me.cash || reqCash > partner.cash) {
    msg.className = 'text-center text-xs font-extrabold py-1 text-rose-600';
    msg.textContent = 'Not enough cash for this trade!';
    return;
  }

  // Evaluate through objective trading engine
  const evalResult = evaluateTradeDeal(partnerIdx, myIdx, offerCash, reqCash, myIds, theirIds);

  if (evalResult.status === 'accept') {
    completeTradeTransfer(myIdx, partnerIdx, offerCash, reqCash, myIds, theirIds);
    logEvent(`🤝 <strong>Trade Completed!</strong> ${me.name} and ${partner.name} concluded their deal.`);
    closeTradeModal();
  } else if (evalResult.status === 'counter' && evalResult.counterOffer) {
    pendingTradeCounter = evalResult.counterOffer;
    const title = document.getElementById('counter-offer-title');
    const desc = document.getElementById('counter-offer-desc');
    if (banner && title && desc) {
      title.textContent = `Counter-Offer from ${partner.name}`;
      desc.innerHTML = `<strong>${partner.name}</strong> is willing to deal if you raise cash offer to <strong>${fmtMoney(evalResult.counterOffer.offerCash)}</strong> (+${fmtMoney(evalResult.counterOffer.deficit)}).`;
      banner.classList.remove('hidden');
    }
    msg.className = 'text-center text-xs font-bold py-1 text-amber-700';
    msg.textContent = evalResult.reason;
  } else {
    msg.className = 'text-center text-xs font-extrabold py-1 text-rose-600';
    msg.textContent = evalResult.reason || `${partner.name} declined the trade.`;
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

export function closeTradeModal() {
  const m = document.getElementById('modal-trade');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
  const banner = document.getElementById('trade-counter-banner');
  if (banner) banner.classList.add('hidden');
  pendingTradeCounter = null;
}

export function showIncomingTradeOfferModal(proposal) {
  if (isLobbyScreenActive()) return;
  activeIncomingTradeProposal = proposal;
  const bot = gameState.players[proposal.proposerIdx];
  const target = gameState.players[proposal.targetIdx];
  if (!bot || !target) return;

  const botNameEl = document.getElementById('incoming-trade-bot-name');
  if (botNameEl) botNameEl.textContent = bot.name;

  const offerCashEl = document.getElementById('incoming-they-offer-cash');
  if (offerCashEl) {
    offerCashEl.textContent = proposal.offerCash > 0 ? `+${fmtMoney(proposal.offerCash)} Cash` : 'No cash offered';
  }

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

  const reqCashEl = document.getElementById('incoming-they-req-cash');
  if (reqCashEl) {
    reqCashEl.textContent = proposal.reqCash > 0 ? `${fmtMoney(proposal.reqCash)} Cash` : 'No cash';
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
    const reqNames = (proposal.reqTileIds || []).map(id => BOARD_TILES[id].name).join(', ');
    rationaleEl.innerHTML = `<strong>${bot.name}</strong> is looking to acquire <strong>${reqNames}</strong> and offers an equitable compensation package.`;
  }

  const modal = document.getElementById('modal-incoming-trade');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    playSFX('hop');
  }
}

export function closeIncomingTradeModal() {
  const modal = document.getElementById('modal-incoming-trade');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  activeIncomingTradeProposal = null;
}

export function acceptIncomingTrade() {
  if (!activeIncomingTradeProposal) return;
  const p = activeIncomingTradeProposal;
  completeTradeTransfer(p.proposerIdx, p.targetIdx, p.offerCash, p.reqCash, p.offerTileIds, p.reqTileIds);
  const bot = gameState.players[p.proposerIdx];
  const target = gameState.players[p.targetIdx];
  logEvent(`🤝 <strong>Trade Deal Struck!</strong> ${target.name} accepted ${bot.name}'s proposal.`);
  closeIncomingTradeModal();
}

export function counterIncomingTrade() {
  if (!activeIncomingTradeProposal) return;
  const p = activeIncomingTradeProposal;
  closeIncomingTradeModal();
  openTradeModal();
  const sel = document.getElementById('trade-partner-select');
  if (sel) {
    sel.value = p.proposerIdx;
    populateTradePartnerProps();
  }
}

export function declineIncomingTrade() {
  if (!activeIncomingTradeProposal) return;
  const bot = gameState.players[activeIncomingTradeProposal.proposerIdx];
  logEvent(`❌ Proactive trade offer from <strong>${bot?.name || 'Bot'}</strong> declined.`);
  closeIncomingTradeModal();
}
