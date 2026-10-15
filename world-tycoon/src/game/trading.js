/**
 * game/trading.js
 * Smart Objective AI Trading Evaluation & Proactive Counter-Offers.
 * Evaluates real-estate monopolies, blocks opponent victory conditions, and negotiates fair trades.
 */

import { BOARD_TILES, GROUP_META } from './data.js';
import { gameState, matchSettings, localPlayerIdx } from './state.js';
import { fmtMoney } from './utils.js';
import { ownsFullColorGroup, countCompletedColorGroups } from './rules.js';
import { playSFX } from './audio.js';
import { logEvent, renderCornerHUDs } from '../ui/hud.js';
import { saveCurrentMatchToStorage } from './persistence.js';
import { networkState, broadcastAction } from '../network/p2p.js';

let lastBotTradeTurn = {};

/**
 * Evaluates a proposed trade from giver to receiver.
 * @returns {{ status: 'accept'|'counter'|'decline', reason: string, counterOffer?: object }}
 */
export function evaluateTradeDeal(receiverIdx, giverIdx, offerCash, reqCash, offerTileIds, reqTileIds) {
  const receiver = gameState.players[receiverIdx];
  const giver = gameState.players[giverIdx];
  if (!receiver || !giver) return { status: 'decline', reason: 'Invalid players' };

  if (offerCash > giver.cash || reqCash > receiver.cash) {
    return { status: 'decline', reason: 'Insufficient cash funds for this transaction.' };
  }

  // 1. Check if giving reqTileIds hands the Giver an instant Triple Monopoly win
  const targetWins = matchSettings.monopolySetsToWin || 3;
  const simulatedGiverProps = { ...gameState.properties };
  reqTileIds.forEach(id => {
    simulatedGiverProps[id] = { ...simulatedGiverProps[id], owner: giverIdx };
  });

  let simulatedGiverSets = 0;
  const groups = new Set();
  BOARD_TILES.forEach(t => { if (t.type === 'city' && t.group) groups.add(t.group); });
  for (const grp of groups) {
    const tilesInGrp = BOARD_TILES.filter(t => t.type === 'city' && t.group === grp);
    const ownsAll = tilesInGrp.every(t => simulatedGiverProps[t.id]?.owner === giverIdx);
    if (ownsAll) simulatedGiverSets++;
  }

  if (simulatedGiverSets >= targetWins) {
    return {
      status: 'decline',
      reason: `Trade declined! Giving you these properties would instantly grant you ${targetWins} Monopolies and win the match!`
    };
  }

  // 2. Calculate Strategic Value of Offered Properties to Receiver
  let offeredPropsVal = 0;
  for (const id of offerTileIds) {
    const tile = BOARD_TILES[id];
    let mult = 1.0;

    // Check if this tile completes a monopoly for receiver
    if (tile.group) {
      const grpTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === tile.group);
      const receiverOwnedInGrp = grpTiles.filter(t => gameState.properties[t.id]?.owner === receiverIdx).length;
      if (receiverOwnedInGrp === grpTiles.length - 1) {
        // Completes a monopoly for receiver!
        mult = 2.4;
      } else if (receiverOwnedInGrp > 0) {
        mult = 1.4;
      }
    }
    offeredPropsVal += tile.price * mult;
  }

  // 3. Calculate Strategic Value of Requested Properties from Receiver
  let requestedPropsVal = 0;
  for (const id of reqTileIds) {
    const tile = BOARD_TILES[id];
    let mult = 1.15;

    if (tile.group) {
      if (ownsFullColorGroup(receiverIdx, tile.group)) {
        // Breaking an existing monopoly!
        mult = 3.0;
      } else {
        const grpTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === tile.group);
        const receiverOwnedInGrp = grpTiles.filter(t => gameState.properties[t.id]?.owner === receiverIdx).length;
        if (receiverOwnedInGrp === grpTiles.length - 1) {
          // Bot is 1 city away from monopoly!
          mult = 2.0;
        }
      }
    }
    requestedPropsVal += tile.price * mult;
  }

  // 4. Cash valuation & liquidity weight
  let cashWeight = 1.0;
  if (receiver.cash < 250000) {
    cashWeight = 1.25; // Receiver needs cash
  }

  const totalOfferedValue = (offerCash * cashWeight) + offeredPropsVal;
  const totalRequestedValue = reqCash + requestedPropsVal;

  if (totalOfferedValue >= totalRequestedValue) {
    return {
      status: 'accept',
      reason: 'Trade accepted! The economic value satisfies both tycoons.'
    };
  }

  // 5. Evaluate if close enough for a Counter-Offer (within 35% margin)
  const deficit = totalRequestedValue - totalOfferedValue;
  if (deficit <= totalRequestedValue * 0.38) {
    const additionalCashNeeded = Math.ceil(deficit / 50000) * 50000;
    const proposedOfferCash = offerCash + additionalCashNeeded;

    if (giver.cash >= proposedOfferCash) {
      return {
        status: 'counter',
        reason: `Offer is close, but under-valued by ${fmtMoney(deficit)}.`,
        counterOffer: {
          giverIdx,
          receiverIdx,
          offerCash: proposedOfferCash,
          reqCash,
          offerTileIds,
          reqTileIds,
          deficit: additionalCashNeeded
        }
      };
    }
  }

  return {
    status: 'decline',
    reason: `${receiver.name} declined the trade. The strategic value of requested assets exceeds the offer by ${fmtMoney(deficit)}.`
  };
}

/**
 * Scans the board to see if an AI bot can proactively offer a win-win trade to a player.
 * @returns {object|null} Proposed trade or null
 */
export function generateProactiveBotTrade(botIdx) {
  const bot = gameState.players[botIdx];
  if (!bot || !bot.isAI || bot.bankrupt) return null;

  // Enforce cooldown per bot (at most once every 3 turns)
  const currentTurn = gameState.netWorthHistory?.length || 0;
  if (lastBotTradeTurn[botIdx] && (currentTurn - lastBotTradeTurn[botIdx] < 3)) {
    return null;
  }

  // Find a color group where bot owns 1 of 2 or 2 of 3
  const candidateGroups = [];
  const groups = new Set();
  BOARD_TILES.forEach(t => { if (t.type === 'city' && t.group) groups.add(t.group); });

  for (const grp of groups) {
    if (ownsFullColorGroup(botIdx, grp)) continue;
    const tilesInGrp = BOARD_TILES.filter(t => t.type === 'city' && t.group === grp);
    const ownedByBot = tilesInGrp.filter(t => gameState.properties[t.id]?.owner === botIdx);
    const missing = tilesInGrp.filter(t => gameState.properties[t.id]?.owner !== botIdx && gameState.properties[t.id]?.owner !== null);

    if (ownedByBot.length >= 1 && missing.length === 1) {
      const targetTile = missing[0];
      const ownerIdx = gameState.properties[targetTile.id]?.owner;
      if (ownerIdx !== null && ownerIdx !== botIdx && !gameState.players[ownerIdx].bankrupt) {
        candidateGroups.push({
          targetTile,
          ownerIdx,
          group: grp
        });
      }
    }
  }

  if (candidateGroups.length === 0) return null;

  // Pick top candidate
  const candidate = candidateGroups[0];
  const partnerIdx = candidate.ownerIdx;
  const targetTile = candidate.targetTile;

  // Find a spare property of the bot that is NOT part of a group where the bot has progress
  const botSpareProps = BOARD_TILES.filter(t => {
    if (!t.group || t.group === candidate.group) return false;
    const st = gameState.properties[t.id];
    if (st?.owner !== botIdx || st.mortgaged || st.level > 0) return false;
    const inSameGrp = BOARD_TILES.filter(other => other.group === t.group && gameState.properties[other.id]?.owner === botIdx);
    return inSameGrp.length <= 1; // Solo spare property
  });

  const spareTile = botSpareProps[0];
  let cashOffer = 0;
  const targetPrice = targetTile.price;

  if (spareTile) {
    const diff = targetPrice - spareTile.price;
    cashOffer = Math.max(100000, diff + 150000);
  } else {
    cashOffer = Math.round(targetPrice * 1.35 / 50000) * 50000;
  }

  // Ensure bot can afford cash offer while maintaining $150K safety cushion
  if (bot.cash < cashOffer + 150000) {
    return null;
  }

  lastBotTradeTurn[botIdx] = currentTurn;

  return {
    proposerIdx: botIdx,
    targetIdx: partnerIdx,
    offerCash: cashOffer,
    reqCash: 0,
    offerTileIds: spareTile ? [spareTile.id] : [],
    reqTileIds: [targetTile.id]
  };
}
