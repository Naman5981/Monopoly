/**
 * game/trading.js
 * Smart, Balanced AI Trading Evaluation & Proactive Counter-Offers.
 * Evaluates real-estate monopolies, handles win-win set swaps, respects rejection memory,
 * and maintains context-aware diplomatic flexibility.
 */

import { BOARD_TILES, GROUP_META } from './data.js';
import { gameState, matchSettings, localPlayerIdx } from './state.js';
import { fmtMoney } from './utils.js';
import { ownsFullColorGroup, countCompletedColorGroups, calculatePlayerNetWorth } from './rules.js';

export const lastBotTradeTurn = {};
export let lastGlobalBotTradeTurn = -999;
export const declinedTradeTargetTurns = {};

export function resetTradeMemory() {
  for (const k in lastBotTradeTurn) delete lastBotTradeTurn[k];
  for (const k in declinedTradeTargetTurns) delete declinedTradeTargetTurns[k];
  lastGlobalBotTradeTurn = -999;
}

/**
 * Record that the player declined a trade involving specific requested tiles.
 * Imposes a 20-turn cooldown so bots do not repeatedly pester the player for the same property.
 */
export function recordDeclinedTrade(tileIds = []) {
  const currentTurn = gameState.netWorthHistory?.length || 0;
  tileIds.forEach(id => {
    if (id !== undefined && id !== null) {
      declinedTradeTargetTurns[id] = currentTurn;
    }
  });
}

function isTileDeclinedRecently(tileId, currentTurn) {
  const lastDeclined = declinedTradeTargetTurns[tileId];
  return lastDeclined !== undefined && (currentTurn - lastDeclined < 20);
}

/**
 * Simulates property ownership to test if acquiring candidate tiles grants a new monopoly.
 */
function doesAcquisitionCompleteMonopoly(playerIdx, candidateTileIds) {
  const simProps = { ...gameState.properties };
  candidateTileIds.forEach(id => {
    simProps[id] = { ...simProps[id], owner: playerIdx };
  });

  const checkedGroups = new Set();
  candidateTileIds.forEach(id => {
    const t = BOARD_TILES[id];
    if (t?.group) checkedGroups.add(t.group);
  });

  for (const grp of checkedGroups) {
    const tilesInGrp = BOARD_TILES.filter(t => t.type === 'city' && t.group === grp);
    const ownsNow = tilesInGrp.every(t => gameState.properties[t.id]?.owner === playerIdx);
    const wouldOwnAll = tilesInGrp.every(t => simProps[t.id]?.owner === playerIdx);
    if (!ownsNow && wouldOwnAll) return true;
  }
  return false;
}

/**
 * Checks if a proposed trade hands the Giver an instant victory by monopoly set count.
 */
function wouldTradeTriggerGiverWin(giverIdx, reqTileIds) {
  const targetWins = matchSettings.monopolySetsToWin || 3;
  const simProps = { ...gameState.properties };
  reqTileIds.forEach(id => {
    simProps[id] = { ...simProps[id], owner: giverIdx };
  });

  let simulatedGiverSets = 0;
  const groups = new Set();
  BOARD_TILES.forEach(t => { if (t.type === 'city' && t.group) groups.add(t.group); });
  for (const grp of groups) {
    const tilesInGrp = BOARD_TILES.filter(t => t.type === 'city' && t.group === grp);
    if (tilesInGrp.every(t => simProps[t.id]?.owner === giverIdx)) simulatedGiverSets++;
  }

  return simulatedGiverSets >= targetWins;
}

/**
 * Evaluates the strategic value of properties being offered to or requested from a player.
 */
function calculatePropsStrategicValue(tileIds, targetPlayerIdx, isReceiving) {
  let totalVal = 0;
  for (const id of tileIds) {
    const tile = BOARD_TILES[id];
    if (!tile) continue;
    let multiplier = 1.0;

    if (tile.group) {
      const grpTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === tile.group);
      const owned = grpTiles.filter(t => gameState.properties[t.id]?.owner === targetPlayerIdx).length;

      if (isReceiving) {
        if (owned === grpTiles.length - 1) multiplier = 2.4;
        else if (owned > 0) multiplier = 1.4;
      } else {
        if (ownsFullColorGroup(targetPlayerIdx, tile.group)) multiplier = 3.2; // Breaking monopoly
        else if (owned === grpTiles.length - 1) multiplier = 2.1;
        else multiplier = 1.15;
      }
    }
    totalVal += tile.price * multiplier;
  }
  return totalVal;
}

/**
 * Evaluates a proposed trade from giver to receiver.
 * Dynamically handles mutual monopoly swaps, context-aware tolerance, and counter-offers.
 */
export function evaluateTradeDeal(receiverIdx, giverIdx, offerCash, reqCash, offerTileIds, reqTileIds) {
  const receiver = gameState.players[receiverIdx];
  const giver = gameState.players[giverIdx];
  if (!receiver || !giver) return { status: 'decline', reason: 'Invalid players' };

  if (offerCash > giver.cash || reqCash > receiver.cash) {
    return { status: 'decline', reason: 'Insufficient cash funds for this transaction.' };
  }

  // 1. Victory Block Check
  if (wouldTradeTriggerGiverWin(giverIdx, reqTileIds)) {
    const targetWins = matchSettings.monopolySetsToWin || 3;
    return {
      status: 'decline',
      reason: `Trade declined! Giving you these properties would instantly grant you ${targetWins} Monopolies and win the match!`
    };
  }

  // 2. Mutual Monopoly Win-Win Detection
  const giverGetsMonopoly = doesAcquisitionCompleteMonopoly(giverIdx, reqTileIds);
  const receiverGetsMonopoly = doesAcquisitionCompleteMonopoly(receiverIdx, offerTileIds);

  if (giverGetsMonopoly && receiverGetsMonopoly) {
    const receiverBreaksMonopoly = reqTileIds.some(id => BOARD_TILES[id]?.group && ownsFullColorGroup(receiverIdx, BOARD_TILES[id].group));
    if (!receiverBreaksMonopoly) {
      return {
        status: 'accept',
        reason: 'A set for a set! Both our empires expand—trade deal accepted!'
      };
    }
  }

  // 3. Strategic Asset & Liquidity Valuation
  const offeredPropsVal = calculatePropsStrategicValue(offerTileIds, receiverIdx, true);
  const requestedPropsVal = calculatePropsStrategicValue(reqTileIds, receiverIdx, false);

  let cashWeight = receiver.cash < 300000 ? 1.25 : 1.0;
  const totalOfferedValue = (offerCash * cashWeight) + offeredPropsVal;
  const totalRequestedValue = reqCash + requestedPropsVal;

  // Trailing Tycoon goodwill tolerance (12% margin)
  const receiverNetWorth = calculatePlayerNetWorth(receiverIdx);
  const giverNetWorth = calculatePlayerNetWorth(giverIdx);
  const toleranceMargin = receiverNetWorth < giverNetWorth ? 0.12 : 0.04;

  if (totalOfferedValue >= totalRequestedValue * (1.0 - toleranceMargin)) {
    return {
      status: 'accept',
      reason: 'Trade accepted! The strategic value satisfies both tycoons.'
    };
  }

  // 4. Counter-Offer Evaluation (within 35% margin)
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
 * Searches for a win-win mutual monopoly trade between a bot and the target human.
 */
function findMutualMonopolyTrade(botIdx, humanIdx) {
  const groups = new Set();
  BOARD_TILES.forEach(t => { if (t.type === 'city' && t.group) groups.add(t.group); });

  for (const botGrp of groups) {
    if (ownsFullColorGroup(botIdx, botGrp)) continue;
    const tilesInBotGrp = BOARD_TILES.filter(t => t.type === 'city' && t.group === botGrp);
    const botOwned = tilesInBotGrp.filter(t => gameState.properties[t.id]?.owner === botIdx);
    const missingForBot = tilesInBotGrp.filter(t => gameState.properties[t.id]?.owner === humanIdx);

    if (botOwned.length >= 1 && missingForBot.length === 1) {
      const targetForBot = missingForBot[0];

      // Scan for a group where human is 1 city away and bot holds that missing city
      for (const humanGrp of groups) {
        if (humanGrp === botGrp || ownsFullColorGroup(humanIdx, humanGrp)) continue;
        const tilesInHumanGrp = BOARD_TILES.filter(t => t.type === 'city' && t.group === humanGrp);
        const humanOwned = tilesInHumanGrp.filter(t => gameState.properties[t.id]?.owner === humanIdx);
        const missingForHuman = tilesInHumanGrp.filter(t => gameState.properties[t.id]?.owner === botIdx);

        if (humanOwned.length >= 1 && missingForHuman.length === 1) {
          const offerTile = missingForHuman[0];
          return {
            proposerIdx: botIdx,
            targetIdx: humanIdx,
            offerCash: Math.max(0, targetForBot.price - offerTile.price),
            reqCash: 0,
            offerTileIds: [offerTile.id],
            reqTileIds: [targetForBot.id]
          };
        }
      }
    }
  }
  return null;
}

/**
 * Scans for a high-premium, cash-supported buyout offer if the bot is affluent.
 */
function findCashBuyoutTrade(botIdx, humanIdx, currentTurn) {
  const bot = gameState.players[botIdx];
  const groups = new Set();
  BOARD_TILES.forEach(t => { if (t.type === 'city' && t.group) groups.add(t.group); });

  for (const grp of groups) {
    if (ownsFullColorGroup(botIdx, grp)) continue;
    const tilesInGrp = BOARD_TILES.filter(t => t.type === 'city' && t.group === grp);
    const ownedByBot = tilesInGrp.filter(t => gameState.properties[t.id]?.owner === botIdx);
    const missing = tilesInGrp.filter(t => gameState.properties[t.id]?.owner === humanIdx);

    if (ownedByBot.length >= 1 && missing.length === 1) {
      const targetTile = missing[0];

      // Never ask for a recently declined tile or one in a completed human monopoly
      if (isTileDeclinedRecently(targetTile.id, currentTurn)) continue;
      if (ownsFullColorGroup(humanIdx, grp)) continue;

      // Find an isolated spare property of the bot (not part of any color group progress)
      const botSpare = BOARD_TILES.find(t => {
        if (!t.group || t.group === grp) return false;
        const st = gameState.properties[t.id];
        if (st?.owner !== botIdx || (st.level || 0) > 0) return false;
        const inGrp = BOARD_TILES.filter(o => o.group === t.group && gameState.properties[o.id]?.owner === botIdx);
        return inGrp.length === 1;
      });

      const cashOffer = botSpare
        ? Math.max(150000, targetTile.price - botSpare.price + 200000)
        : Math.round((targetTile.price * 2.4) / 50000) * 50000;

      // Bot must retain a generous $800,000 cash cushion after proposing
      if (bot.cash >= cashOffer + 800000) {
        return {
          proposerIdx: botIdx,
          targetIdx: humanIdx,
          offerCash: cashOffer,
          reqCash: 0,
          offerTileIds: botSpare ? [botSpare.id] : [],
          reqTileIds: [targetTile.id]
        };
      }
    }
  }
  return null;
}

/**
 * Scans the board to see if an AI bot can proactively offer a win-win trade to a player.
 * Enforces global match cooldowns and per-bot intervals to eliminate trade spam.
 * @returns {object|null} Proposed trade or null
 */
export function generateProactiveBotTrade(botIdx) {
  const bot = gameState.players[botIdx];
  if (!bot || !bot.isAI || bot.bankrupt) return null;

  const currentTurn = gameState.netWorthHistory?.length || 0;

  // Enforce global match cooldown: At least 10 turns between ANY bot trade offer to human
  if (currentTurn - lastGlobalBotTradeTurn < 10) return null;

  // Enforce per-bot cooldown: At least 16 turns for the same bot
  if (lastBotTradeTurn[botIdx] && (currentTurn - lastBotTradeTurn[botIdx] < 16)) return null;

  const humanIdx = localPlayerIdx || 0;
  const human = gameState.players[humanIdx];
  if (!human || human.bankrupt || human.isAI) return null;

  // 1. Prioritize Mutual Monopoly Trades (a set for a set)
  const mutualTrade = findMutualMonopolyTrade(botIdx, humanIdx);
  if (mutualTrade) {
    if (bot.cash >= mutualTrade.offerCash + 400000) {
      lastBotTradeTurn[botIdx] = currentTurn;
      lastGlobalBotTradeTurn = currentTurn;
      return mutualTrade;
    }
  }

  // 2. High-Equity Cash Buyout (only if affluent and generous)
  const buyoutTrade = findCashBuyoutTrade(botIdx, humanIdx, currentTurn);
  if (buyoutTrade) {
    lastBotTradeTurn[botIdx] = currentTurn;
    lastGlobalBotTradeTurn = currentTurn;
    return buyoutTrade;
  }

  return null;
}
